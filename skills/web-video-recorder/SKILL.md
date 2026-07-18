---
name: web-video-recorder
description: 通过 Chrome DevTools Protocol (CDP) 连接本地 Chrome headless，模拟点击/输入/滚动操作 Web 页面，并按帧率截图编码为 MP4 视频（H.264）。用于生成产品操作演示视频、回归对比录像。无额外 npm 依赖（Node 内置 + 系统 ffmpeg + Chrome）。
---

# web-video-recorder

一个自包含的 Web 操作录像器：用 CDP 驱动 Chrome headless 模拟用户操作，编码为 MP4。

与姊妹 skill `web-recorder`（输出 GIF）配套使用 —— 本 skill 输出体积更小、画质更高、可配音/可流播的 MP4，适合较长或放文档/网页的视频演示。

## 适用场景
- 产品功能操作演示视频（点击切换、刷新、导出、主题切换、滚动等流程）
- 交互回归前后对比录像
- 给 README / PR / 官网附带操作视频

## 依赖（本机已具备，无需安装）
- **Node.js** ≥ 22（用全局 `WebSocket`，无需 `ws` 包）
- **Google Chrome**（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）
- **ffmpeg**（编码 MP4 / libx264）

## 文件
```
skills/web-video-recorder/
├── SKILL.md
└── scripts/
    └── record-video.mjs   # CDP + ffmpeg 编码 MP4
```

## 快速开始

前置：开发服务器在跑（如 `http://localhost:3000`）。

### 1. 最简录制（静态页面 N 秒）
```bash
node skills/web-video-recorder/scripts/record-video.mjs \
  --url http://localhost:3000 \
  --out docs/demo.mp4 \
  --duration 6 --fps 15
```

### 2. 模拟点击序列录像
```bash
node skills/web-video-recorder/scripts/record-video.mjs \
  --url http://localhost:3000 \
  --out docs/dashboard-click.mp4 \
  --fps 15 --width 1440 --height 900 \
  --steps '[{"wait":1800},{"click":"main > aside:nth-child(1) button:nth-child(4)","wait":2000},{"click":"main > aside:nth-child(3) button","wait":2000},{"wait":1200}]'
```

### 3. 录制主题切换（先浅后切深）
```bash
node skills/web-video-recorder/scripts/record-video.mjs \
  --url "http://localhost:3000/?theme=light" \
  --out docs/theme-toggle.mp4 \
  --fps 12 \
  --steps '[{"wait":2000},{"click":"header button[aria-label*=\"深色\"], header button[aria-label*=\"暗色\"]","wait":2500}]'
```

### 4. 录制页面滚动
```bash
node skills/web-video-recorder/scripts/record-video.mjs \
  --url http://localhost:3000 \
  --out docs/scroll.mp4 --fps 12 --duration 8 \
  --steps '[{"wait":1500},{"scroll":"800","wait":1500},{"scroll":"800","wait":1500},{"scroll":"main > aside:nth-child(3)","wait":1500}]'
```

## 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--url` | (必填) | 目标页面 URL |
| `--out` | `./recording.mp4` | 输出 MP4 路径 |
| `--steps` | `[]` | 操作步骤 JSON 数组（见下） |
| `--fps` | `15` | 视频帧率（建议 12–24，越高文件越大） |
| `--duration` | `8` | 无 `--steps` 时的总录制时长（秒） |
| `--width` | `1440` | 视口宽 |
| `--height` | `900` | 视口高 |
| `--port` | `9410` | CDP 调试端口 |
| `--crf` | `20` | 画质 0–51，越小画质越高（18–23 为常用区间） |
| `--keep-frames` | `false` | 设 `true` 保留原始 PNG 帧 |

## steps 每步语法
```jsonc
{
  "click": "<css选择器>",       // 单击（自动滚动进视口后再点）
  "dblclick": "<css选择器>",    // 双击
  "type": "<css选择器>",        // 聚焦输入框
  "text": "内容",               // 配合 type 逐字符输入
  "scroll": "<css或像素>",      // CSS 选择器则 scrollIntoView；纯数字则 scrollBy 像素
  "eval": "<js代码>",           // 在页面执行任意 JS
  "wait": 800                   // 该步后等待毫秒
}
```

- `click` 自动把元素 `scrollIntoView({block:'center'})` 后再取坐标点击，长页面也能命中。
- `scroll` 既支持 `"#someId`/`".class"`（滚到该元素），也支持 `"600"`（向下滚 600px）。

## 工作原理
1. 启动独立 Chrome headless 实例，开 CDP 端口。
2. `http://localhost:<port>/json/list` 取页面 WebSocket 调试端点。
3. Node 全局 `WebSocket` 发 CDP 指令：`Page.navigate`、`Runtime.evaluate`（定位+滚动+取坐标）、`Input.dispatchMouseEvent`、`Input.dispatchKeyEvent`、`Page.captureScreenshot`。
4. 定时器按 `fps` 抓 PNG 帧到临时目录。
5. ffmpeg 用 `libx264 -pix_fmt yuv420p -crf <n> -preset medium` 编码，`+faststart` moov 前置便于网络渐进播放。
6. 清理临时目录（除非 `--keep-frames true`）。

## 输出特性
- 编码：H.264 / yuv420p —— 兼容 QuickTime、Safari、Chrome、移动端、PPT 嵌入。
- `+faststart`：moov atom 前置，HTML5 `<video>` 可边下边播。
- 同等内容 MP4 体积通常远小于 GIF（约 1/5 ~ 1/10）。

## 注意事项
- 录制脚本会启独立 Chrome 实例；异常退出时 `pkill -f remote-debugging-port=9410`。
- 端口默认 9410，与 GIF 录制器（9400）错开，可并行录制。
- 帧率越高文件越大；纯操作演示 12–15fps 已足够流畅。
- 录制结束自动 kill Chrome 实例。

## 与本项目的常用脚本

一键录大屏操作演示：
```bash
node skills/web-video-recorder/scripts/record-video.mjs \
  --url http://localhost:3000 \
  --out docs/dashboard-demo.mp4 \
  --fps 15 --width 1440 --height 900 \
  --steps '[{"wait":1800},{"click":"main > aside:nth-child(1) button:nth-child(5)","wait":2000},{"click":"main > aside:nth-child(3) button","wait":2200},{"wait":1200}]'
```