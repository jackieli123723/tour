#!/usr/bin/env node
/**
 * web-video-recorder — CDP 驱动的 Web 操作录制器（MP4）
 *
 * 通过 Chrome DevTools Protocol 连接本地 Chrome headless：
 *   1. 导航到目标 URL
 *   2. 按脚本模拟点击 / 输入 / 滚动 / 等待
 *   3. 录制期间按固定帧率截图
 *   4. 用 ffmpeg 编码为 MP4（H.264 + yuv420p，兼容播放器）
 *
 * 无需额外 npm 依赖：Node 内置（http / fs / 全局 WebSocket）+ 系统 ffmpeg + Chrome。
 *
 * 用法：
 *   node record-video.mjs --url http://localhost:3000 --out demo.mp4 \
 *     --steps '[{"wait":1500},{"click":"main > aside button:nth-child(3)","wait":1800}]' \
 *     --fps 15 --duration 8 --width 1440 --height 900
 *
 * 参数：
 *   --url        目标页面 URL                                (必填)
 *   --out        输出 MP4 路径                                (默认 ./recording.mp4)
 *   --steps      操作步骤 JSON 数组                            (可选)
 *                    每步: { "click": "<css>", "dblclick": "<css>", "type": "<css>",
 *                            "text": "...", "scroll": "<css>", "wait": <ms>, "eval": "<js>" }
 *   --fps        视频帧率                                     (默认 15)
 *   --duration   无步骤时的总录制时长(秒)                       (默认 8)
 *   --width      视口宽                                       (默认 1440)
 *   --height     视口高                                       (默认 900)
 *   --port       CDP 调试端口                                 (默认 9410)
 *   --keep-frames  保留原始 PNG 帧                            (默认 false)
 *   --crf        质量(0-51，越小画质越高)                       (默认 20)
 */

import http from 'http'
import fs from 'fs'
import path from 'path'
import os from 'os'
import { spawnSync, spawn } from 'child_process'

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
const OUT = args.out || './recording.mp4'
const STEPS = args.steps ? JSON.parse(args.steps) : []
const FPS = parseInt(args.fps || '15', 10)
const DURATION = parseFloat(args.duration || '8', 10)
const WIDTH = parseInt(args.width || '1440', 10)
const HEIGHT = parseInt(args.height || '900', 10)
const PORT = parseInt(args.port || '9410', 10)
const KEEP_FRAMES = args['keep-frames'] === 'true'
const CRF = parseInt(args.crf || '20', 10)
// --screen 自动用本机屏幕逻辑分辨率(检测); --dpr 设备像素比(默认2,Retina高清)
const DPR = args.dpr ? parseFloat(args.dpr) : 2
let useScreen = args.screen === 'true'

// --screen: 检测本机屏幕逻辑分辨率，设为录制视口
let SCREEN_W = WIDTH, SCREEN_H = HEIGHT
if (useScreen) {
  try {
    const out = spawnSync('swift', ['-e',
      'import AppKit; if let s=NSScreen.main{print(Int(s.frame.width),Int(s.frame.height));print(s.backingScaleFactor)}'],
      { encoding: 'utf8' })
    const [w, h] = out.stdout.trim().split('\n')[0].split(' ').map(Number)
    if (w && h) { SCREEN_W = w; SCREEN_H = h; console.log(`[video-recorder] 检测屏幕逻辑分辨率: ${w}x${h} (dpr=${DPR})`) }
  } catch (e) { console.warn('[video-recorder] 屏幕检测失败，用 --width/--height', e.message) }
}

if (!URL) {
  console.error('用法: node record-video.mjs --url <url> [--out <mp4>] [--steps <json>] [--fps 15] [--duration 8]')
  process.exit(1)
}

const TMP = fs.mkdtempSync(path.join(os.tmpdir(), 'web-vid-'))
const FRAME_DIR = path.join(TMP, 'frames')
fs.mkdirSync(FRAME_DIR, { recursive: true })
console.log(`[video-recorder] 临时目录: ${TMP}`)

const CHROME =
  '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const profileDir = path.join(TMP, 'profile')
const VW = useScreen ? SCREEN_W : WIDTH
const VH = useScreen ? SCREEN_H : HEIGHT
// H.264 要求宽高为偶数
const EW = VW % 2 ? VW + 1 : VW
const EH = VH % 2 ? VH + 1 : VH
const chromeArgs = [
  '--headless=new',
  '--disable-gpu',
  '--force-device-scale-factor=1',
  '--hide-scrollbars',
  `--window-size=${VW},${VH}`,
  `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${profileDir}`,
  '--no-first-run',
  '--no-default-browser-check',
  'about:blank',
]
console.log('[video-recorder] 启动 Chrome headless ...')
const chrome = spawn(CHROME, chromeArgs, { stdio: 'ignore', detached: false })

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)) }

async function get(p) {
  return new Promise((resolve) => {
    http.get(`http://localhost:${PORT}${p}`, (res) => {
      let d = ''
      res.on('data', (c) => (d += c))
      res.on('end', () => resolve(d))
    }).on('error', () => resolve('{}'))
  })
}

async function main() {
  // 等待 CDP 就绪
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

  // 设备像素比：Retina(dpr=2) 抓高清物理像素，录出与屏幕一致的清晰效果
  await send('Emulation.setDeviceMetricsOverride', {
    width: VW,
    height: VH,
    deviceScaleFactor: DPR,
    mobile: false,
  })
  console.log(`[video-recorder] 视口 ${VW}x${VH} dpr=${DPR} → 截图物理 ${VW * DPR}x${VH * DPR}`)

  // ---------- 帧抓取 ----------
  let frameIdx = 0
  const interval = Math.round(1000 / FPS)
  const capture = async () => {
    try {
      const shot = await send('Page.captureScreenshot', { format: 'png' })
      fs.writeFileSync(
        path.join(FRAME_DIR, `frame_${String(frameIdx).padStart(5, '0')}.png`),
        Buffer.from(shot.result.data, 'base64'),
      )
      frameIdx++
    } catch (e) {
      console.error('[video-recorder] 截帧失败', e.message)
    }
  }
  const timer = setInterval(capture, interval)
  capture()

  console.log(`[video-recorder] 导航到 ${URL}`)
  await send('Page.navigate', { url: URL })
  await sleep(1500)

  for (let i = 0; i < STEPS.length; i++) {
    const s = STEPS[i]
    console.log(`[video-recorder] step ${i + 1}/${STEPS.length}:`, JSON.stringify(s))
    if (s.scroll) {
      // 滚动到某元素 / 或按像素 eval
      await send('Runtime.evaluate', {
        expression: s.scroll.startsWith('#') || s.scroll.startsWith('.')
          ? `(function(){const el=document.querySelector(${JSON.stringify(s.scroll)});if(el)el.scrollIntoView({behavior:'smooth',block:'center'})})()`
          : `window.scrollBy({top:${parseInt(s.scroll, 10)}, behavior:'smooth'})`,
      })
    } else if (s.click || s.dblclick) {
      const sel = s.click || s.dblclick
      const ev = s.dblclick ? 'doubleClick' : 'click'
      const r = await send('Runtime.evaluate', {
        expression: `(function(){const el=document.querySelector(${JSON.stringify(sel)});if(!el)return 'notfound';const r=el.getBoundingClientRect();el.scrollIntoView({block:'center'});const r2=el.getBoundingClientRect();return JSON.stringify({x:r2.left+r2.width/2,y:r2.top+r2.height/2})})()`,
      })
      const info = JSON.parse(r.result?.result?.value || '{}')
      if (info.x != null) {
        const x = info.x, y = info.y
        await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x, y })
        await send('Input.dispatchMouseEvent', { type: 'mousePressed', button: 'left', x, y, clickCount: ev === 'doubleClick' ? 2 : 1 })
        await send('Input.dispatchMouseEvent', { type: 'mouseReleased', button: 'left', x, y, clickCount: ev === 'doubleClick' ? 2 : 1 })
      }
    } else if (s.type && s.text != null) {
      await send('Runtime.evaluate', { expression: `(function(){const el=document.querySelector(${JSON.stringify(s.type)});if(el)el.focus();return !!el})()` })
      for (const ch of s.text) await send('Input.dispatchKeyEvent', { type: 'char', text: ch })
    } else if (s.eval) {
      await send('Runtime.evaluate', { expression: s.eval })
    }
    if (s.wait) await sleep(s.wait)
  }

  if (!STEPS.length) {
    await sleep(DURATION * 1000)
  } else {
    // 末尾多留一点收尾画面
    await sleep(Math.max(600, Math.round(1000 / FPS) * 4))
  }

  clearInterval(timer)
  await capture()
  ws.close()

  console.log(`[video-recorder] 共抓取 ${frameIdx} 帧，编码 MP4 ...`)

  // ---------- ffmpeg 编码 MP4 ----------
  const framesGlob = path.join(FRAME_DIR, 'frame_%05d.png')
  const r = spawnSync(
    'ffmpeg',
    [
      '-y',
      '-framerate', String(FPS),
      '-i', framesGlob,
      '-c:v', 'libx264',
      '-profile:v', 'baseline',    // 兼容性最强：QuickTime/Safari/Chrome/移动端/PPT
      '-level', '3.1',
      '-pix_fmt', 'yuv420p',       // 兼容旧播放器
      '-crf', String(CRF),
      '-preset', 'medium',
      '-movflags', '+faststart',   // 网络渐进式播放
      '-vf', `scale=${EW}:${EH}:force_original_aspect_ratio=decrease,pad=${EW}:${EH}:(ow-iw)/2:(oh-ih)/2,setsar=1`,  // 缩回逻辑尺寸并保证偶数(对应屏幕)
      '-r', String(FPS),
      OUT,
    ],
    { stdio: 'inherit' },
  )
  if (r.status !== 0) {
    console.error('[video-recorder] ffmpeg 失败，退出码', r.status)
    chrome.kill('SIGKILL')
    process.exit(1)
  }

  const abs = path.resolve(OUT)
  const size = fs.existsSync(abs) ? fs.statSync(abs).size : 0
  console.log(`[video-recorder] 完成 → ${abs} (${(size / 1024).toFixed(0)} KB, ${frameIdx} 帧, ${FPS}fps, crf=${CRF})`)

  if (!KEEP_FRAMES) fs.rmSync(TMP, { recursive: true, force: true })
  chrome.kill('SIGKILL')
  process.exit(0)
}

main().catch((e) => {
  console.error('[video-recorder] 错误:', e)
  try { chrome.kill('SIGKILL') } catch {}
  process.exit(1)
})