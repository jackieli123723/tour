---
name: web-recorder
description: 通过 Chrome DevTools Protocol (CDP) 连接本地 Chrome headless，模拟点击/输入操作 Web 页面，并按帧率截图录制为 GIF。用于生成产品操作演示、回归对比、UI 录像。无额外 npm 依赖（Node 内置 + 系统 ffmpeg/Chrome）。
---

# web-recorder

一个自包含的 Web 操作录制器：用 CDP 驱动 Chrome headless 模拟用户操作，并把过程录成 GIF。

## 适用场景
- 生成产品功能演示 GIF（点击切换、刷新、导出、主题切换等流程）
- 交互回归前后对比录像
- 给文档/PR 附带可视化操作录屏

## 依赖（本机已具备，无需安装）
- **Node.js** ≥ 22（用全局 `WebSocket`，无需 `ws` 包）
- **Google Chrome**（`/Applications/Google Chrome.app/Contents/MacOS/Google Chrome`）
- **ffmpeg**（合成 GIF；若缺失自动回退到 ImageMagick `convert`）

## 文件
```
skills/web-recorder/
├── SKILL.md              # 本说明
└── scripts/
    └── record.mjs        # 录制脚本（CDP + ffmpeg）
```

## 快速开始

前置：开发服务器在跑（如 `http://localhost:3000`）。

### 1. 最简录制（只录静态页面 N 秒）
```bash
node skills/web-recorder/scripts/record.mjs \
  --url http://localhost:3000 \
  --out docs/demo.gif \
  --duration 5 \
  --fps 8
```

### 2. 模拟点击序列录制
```bash
node skills/web-recorder/scripts/record.mjs \
  --url "http://localhost:3000" \
  --out docs/demo.gif \
  --fps 10 \
  --steps '[{"wait":1500},{"click":"main > aside:nth-child(1) button:nth-child(3)","wait":1200},{"click":"main > aside:nth-child(3) button","wait":1200},{"wait":1500}]'
```

会依次：等页面加载 → 点击左列第 3 个数据集 → 点击右列首个省份(展开详情卡) → 停留收尾，全程抓帧合成 GIF。

### 3. 录制主题切换（先浅色主题，再点切换按钮）
```bash
node skills/web-recorder/scripts/record.mjs \
  --url "http://localhost:3000/?theme=light" \
  --out docs/theme-toggle.gif \
  --fps 8 \
  --steps '[{"wait":1800},{"click":"header button[aria-label*=\"暗色\"], header button[aria-label*=\"深色\"]","wait":1800}]'
```

## 参数

| 参数 | 默认 | 说明 |
|---|---|---|
| `--url` | (必填) | 目标页面 URL |
| `--out` | `./recording.gif` | 输出 GIF 路径 |
| `--steps` | `[]` | 操作步骤 JSON 数组（见下） |
| `--fps` | `8` | GIF 帧率（建议 8–12） |
| `--duration` | `6` | 无 `--steps` 时的总录制时长（秒） |
| `--width` | `1440` | 视口宽 |
| `--height` | `900` | 视口高 |
| `--port` | `9400` | CDP 调试端口 |
| `--keep-frames` | `false` | 设 `true` 保留原始 PNG 帧 |

## steps 每步语法
```jsonc
{
  "click": "<css选择器>",      // 单击该元素（居中坐标）
  "dblclick": "<css选择器>",   // 双击
  "type": "<css选择器>",       // 聚焦该输入框
  "text": "内容",              // 配合 type，逐字符输入
  "eval": "<js代码>",          // 在页面执行任意 JS（如调全局方法）
  "wait": 800                  // 该步后等待毫秒（让动画/请求完成）
}
```

- `click` 用 CDP `Input.dispatchMouseEvent` 在元素几何中心模拟真实鼠标按下/抬起。
- `eval` 可用于触发非点击交互（如 `document.querySelector('header').scrollIntoView()`）。
- 每步之间会持续抓帧，`wait` 越长该段在 GIF 里帧数越多。

## 工作原理
1. 启动一个独立 Chrome headless 实例，开 CDP 端口。
2. 通过 `http://localhost:<port>/json/list` 拿到页面 WebSocket 调试端点。
3. 用 Node 全局 `WebSocket` 连上，发送 CDP 指令：`Page.navigate`、`Runtime.evaluate`（定位元素取坐标）、`Input.dispatchMouseEvent`、`Page.captureScreenshot`。
4. 定时器按 `fps` 周期截 PNG 帧到临时目录。
5. 跑完步骤后用 `ffmpeg` 的 `palettegen` + `paletteuse` 两遍法合成高质量 GIF。
6. 清理临时目录（除非 `--keep-frames true`）。

## 注意事项
- 录制期间不要占用同一 CDP 端口；若脚本异常退出，手动 `pkill -f remote-debugging-port=9400`。
- GIF 体积大致 ∝ `width × height × fps × duration`；长录制建议降 `fps` 或缩宽高。
- 页面若有防 headless 检测可能行为不同；本仓库为本地开发页，无此问题。
- 录制结束会自动 kill Chrome 实例。

## 与本项目的常用录制脚本

把下面存为 `scripts/record-demo.sh` 即可一键录大屏演示：
```bash
#!/usr/bin/env bash
node skills/web-recorder/scripts/record.mjs \
  --url http://localhost:3000 \
  --out docs/dashboard-demo.gif \
  --fps 9 --width 1440 --height 900 \
  --steps '[{"wait":1600},{"click":"main > aside:nth-child(1) button:nth-child(4)","wait":1400},{"click":"main > aside:nth-child(3) .sci-section-title","wait":600},{"click":"main > aside:nth-child(3) button","wait":1600},{"wait":1200}]'
```