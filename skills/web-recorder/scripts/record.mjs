#!/usr/bin/env node
/**
 * web-recorder — CDP 驱动的 Web 操作录制器
 *
 * 通过 Chrome DevTools Protocol（CDP）连接本地 Chrome headless：
 *   1. 导航到目标 URL
 *   2. 按脚本模拟点击 / 输入 / 等待
 *   3. 录制期间按固定帧率截图
 *   4. 用 ffmpeg 合成为 GIF
 *
 * 无需额外 npm 依赖：仅用 Node 内置（http / fs / 全局 WebSocket）+ 系统的 ffmpeg。
 *
 * 用法：
 *   node record.mjs --url http://localhost:3000 --out demo.gif \
 *     --steps '[{"click":"header button","wait":800},{"wait":1200}]' \
 *     --fps 8 --duration 6 --width 1440 --height 900
 *
 * 参数：
 *   --url        目标页面 URL                                (必填)
 *   --out        输出 GIF 路径                                (默认 ./recording.gif)
 *   --steps      操作步骤 JSON 数组                            (可选)
 *                    每步: { "click": "<css选>", "dblclick": "<css>", "type": "<css>", "text": "...", "wait": <ms>, "eval": "<js>" }
 *   --fps        GIF 帧率                                     (默认 8)
 *   --duration   无步骤时的总录制时长(秒)                       (默认 6)
 *   --width      视口宽                                       (默认 1440)
 *   --height     视口高                                       (默认 900)
 *   --port       CDP 调试端口                                 (默认 9400)
 *   --keep-frames 保留原始 PNG 帧                             (默认 false)
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { execFileSync, spawnSync, spawn } from 'child_process'

// ---------- 解析参数 ----------
function parseArgs(argv) {
  const args = {}
  for (let i = 2; i < argv.length; i += 2) {
    args[argv[i].replace(/^--/, '')] = argv[i + 1]
  }
  return args
}
const args = parseArgs(process.argv)
const URL = args.url
const OUT = args.out || './recording.gif'
const STEPS = args.steps ? JSON.parse(args.steps) : []
const FPS = parseInt(args.fps || '8', 10)
const DURATION = parseFloat(args.duration || '6', 10)
const WIDTH = parseInt(args.width || '1440', 10)
const HEIGHT = parseInt(args.height || '900', 10)
const PORT = parseInt(args.port || '9400', 10)
const KEEP_FRAMES = args['keep-frames'] === 'true'

if (!URL) {
  console.error('用法: node record.mjs --url <url> [--out <gif>] [--steps <json>] [--fps 8] [--duration 6]')
  process.exit(1)
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'web-rec-'))
const FRAME_DIR = path.join(TMP, 'frames')
fs.mkdirSync(FRAME_DIR, { recursive: true })
console.log(`[recorder] 临时目录: ${TMP}`)

// ---------- 启动 Chrome headless ----------
const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profileDir = path.join(TMP, 'profile')
const chromeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--hide-scrollbars',
  `--window-size=${WIDTH},${HEIGHT}`,
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
]
console.log('[recorder] 启动 Chrome headless ...')
const chrome = spawn(CHROME, chromeArgs, { stdio: 'ignore', detached: false })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function get(path) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}${path}`, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve(d))
    }).on('error', () => resolve('{}'))
  })
}

async function main() {
  // 等待 CDP 端口就绪
  let wsUrl = null
  for (let i = 0; i < 30; i++) {
    try {
      const list = JSON.parse(await get('/json/list'))
      if (Array.isArray(list) && list.length) {
        wsUrl = list.find((x) => x.type === 'page').webSocketDebuggerUrl
        break
      }
    } catch {}
    await sleep(300)
  }
  if (!wsUrl) throw new Error('Chrome CDP 未就绪')

  // ---------- CDP 客户端 ----------
  const ws = new WebSocket(wsUrl)
  let id = 0
  const pending = new Map()
  const send = (method, params = {}) =>
    new Promise((resolve, reject) => {
      const i = ++id
      pending.set(i, { resolve, reject })
      ws.send(JSON.stringify({ id: i, method, params }))
    })
  ws.addEventListener('message', (ev) => {
    const o = JSON.parse(ev.data)
    if (o.id && pending.has(o.id)) {
      pending.get(o.id).resolve(o)
      pending.delete(o.id)
    }
  })
  await new Promise((r) => ws.addEventListener('open', r))

  await send('Page.enable')
  await send('Runtime.enable')

  // ---------- 帧抓取循环 ----------
  let frameIdx = 0
  const interval = Math.round(1000 / FPS)
  const capture = async () => {
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(
        path.join(FRAME_DIR, `frame_${String(frameIdx).padStart(4, '0')}.png`),
        Buffer.from(shot.result.data, 'base64'),
      )
      frameIdx++
    } catch (e) {
      console.error('[recorder] 截帧失败', e.message)
    }
  }
  const timer = setInterval(capture, interval)
  capture() // 立即抓第一帧

  // ---------- 执行操作步骤 ----------
  console.log(`[recorder] 导航到 ${URL}`)
  await send('Page.navigate', { url: URL })
  await sleep(1500)

  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i]
    console.log(`[recorder] step ${i + 1}/${STEPS.length}:`, JSON.stringify(s))
    if (s.click || s.dblclick) {
      const sel = s.click || s.dblclick
      const ev = s.dblclick ? 'doubleClick' : 'click'
      await send('Runtime.evaluate', {
        expression: `(function(){const el=document.querySelector(${JSON.stringify(sel)});if(!el)return 'notfound';const r=el.getBoundingClientRect();return JSON.stringify({x:r.left+r.width/2,y:r.top+r.height/2,text:el.textContent.trim().slice(0,20)})})()`,
      }).then(async (r) => {
        const info = JSON.parse(r.result?.result?.value || '{}')
        if (info.x == null) return
        const x = info.x, y = info.y
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', x, y, clickCount: ev === 'doubleClick' ? 2 : 1 })
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', x, y, clickCount: ev === 'doubleClick' ? 2 : 1 })
      })
    } else if (s.type && s.text != null) {
      // 聚焦元素并输入
      await send('Runtime.evaluate', { expression: `(function(){const el=document.querySelector(${JSON.stringify(s.type)});if(el)el.focus();return !!el})()` })
      for (const ch of s.text) await send('Input.dispatchKeyEvent', { type: 'char', text: ch })
    } else if (s.eval) {
      await send('Runtime.evaluate', { expression: s.eval })
    }
    if (s.wait) await sleep(s.wait)
  }

  // 若无步骤，按 duration 等待抓帧
  const totalMs = STEPS.length ? STEPS.reduce((a, s) => a + (s.wait || 0), 0) + 1500 : DURATION * 1000
  const remain = Math.max(800, totalMs - 1500 - STEPS.reduce((a, s) => a + (s.wait || 0), 0))
  if (!STEPS.length) await sleep(DURATION * 1000)
  else await sleep(remain)

  clearInterval(timer)
  await capture()
  ws.close()

  console.log(`[recorder] 共抓取 ${frameIdx} 帧，合成 GIF ...`)

  // ---------- ffmpeg 合成 GIF ----------
  // 用 palette 生成保证画质
  const palette = path.join(TMP, 'palette.png')
  const framesGlob = path.join(FRAME_DIR, 'frame_%04d.png')
  try {
    spawnSync('ffmpeg', ['-y', '-i', framesGlob, '-vf', `palettegen`, palette], { stdio: 'ignore' })
    const r = spawnSync(
      'ffmpeg',
      [
        '-y', '-framerate', String(FPS), '-i', framesGlob,
        '-i', palette,
        '-lavfi', `paletteuse=dither=bayer:bayer_scale=5:diff_mode=rectangle`,
        '-s', `${WIDTH}x${HEIGHT}`,
        OUT,
      ],
      { stdio: 'inherit' },
    )
    if (r.status !== 0) throw new Error('ffmpeg 退出码 ' + r.status)
  } catch (e) {
    // 回退方案：ImageMagick convert
    console.log('[recorder] ffmpeg 失败，尝试 ImageMagick ...', e.message)
    spawnSync('convert', ['-delay', String(Math.round(100 / FPS)), path.join(FRAME_DIR, 'frame_*.png'), '-loop', '0', OUT], { stdio: 'inherit' })
  }

  const abs = path.resolve(OUT)
  const size = fs.existsSync(abs) ? fs.statSync(abs).size : 0
  console.log(`[recorder] 完成 → ${abs} (${(size / 1024).toFixed(0)} KB, ${frameIdx} 帧, ${FPS}fps)`)

  if (!KEEP_FRAMES) fs.rmSync(TMP, { recursive: true, force: true })
  chrome.kill('SIGKILL')
  process.exit(0)
}

main().catch((e) => {
  console.error('[recorder] 错误:', e)
  try { chrome.kill('SIGKILL') } catch {}
  process.exit(1)
})