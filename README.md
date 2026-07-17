# tour
 全国文化和旅游数据可视化大屏
<img width="3600" height="1876" alt="image" src="https://github.com/user-attachments/assets/6c9796c1-7a6c-4d3b-b21c-0aeae534a9d9" />

<img width="3600" height="1876" alt="image" src="https://github.com/user-attachments/assets/1948f327-9ef1-40f7-9d62-8751d5d7c2e8" />


# 全国文化和旅游数据可视化大屏

基于 **文化和旅游部数据服务栏目**（sjfw.mct.gov.cn）公开名录数据的交互式可视化大屏。

实时抓取 8 类共 2,328 条文旅名录数据，以中国分省填色地图为核心进行可视化呈现，支持按类型切换、省份详情钻取、TOP 排行、趋势对比、区域筛选、CSV 导出、数据完整性校验等功能。

## ✨ 核心特性

- **8 类文旅数据集**（按 type 切换）：5A景区 / 五星饭店 / 滑雪度假地 / 休闲街区 / 工业旅游 / 国家级度假区 / 旅游民宿 / 乡村振兴试点
- **ECharts 中国分省填色热力图**：每类数据集有独立主题色，切换时地图色阶自动联动
- **省份点击钻取**：点击地图或排行榜弹出该省全部条目详情
- **TOP15 排行榜 + TOP10 趋势对比**
- **7 大区域筛选**：华北/东北/华东/华中/华南/西南/西北
- **CSV 导出**：一键导出当前数据集全部条目
- **数据完整性校验**：actual === officialTotal === statsSum 三重校验，0 数据遗漏
- **数据时间显示**：抓取时间 + 数据源更新时间 + 完整性状态可视化
- **响应式设计**：桌面大屏单页 + 移动端适配

## 🛠 技术栈

- **Framework**: Next.js 16 (App Router) + TypeScript 5
- **Styling**: Tailwind CSS 4 + shadcn/ui
- **可视化**: ECharts 6（地图）+ Recharts（趋势图）
- **动效**: Framer Motion
- **数据库**: Prisma ORM + SQLite
- **状态管理**: React Hooks

## 📦 本地运行

### 环境要求

- Node.js 18.18+ 或 20+ 或 22+
- npm / pnpm / yarn / bun 任一包管理器（推荐 pnpm 或 bun）

### 步骤

```bash
# 1. 解压
unzip mct-data-dashboard.zip
cd mct-data-dashboard

# 2. 安装依赖（任选其一）
pnpm install
# 或
npm install
# 或
yarn install
# 或
bun install

# 3. 配置环境变量
cp .env.example .env
# .env 默认内容：
# DATABASE_URL="file:./db/custom.db"

# 4. 初始化数据库
pnpm db:push
# 或 npm run db:push

# 5. 启动开发服务器
pnpm dev
# 或 npm run dev

# 6. 浏览器访问
# http://localhost:3000
```

首次访问时，系统会自动从文旅部数据服务栏目抓取 8 类数据（约 5-10 秒），抓完后缓存到本地 SQLite 数据库，后续访问秒级响应。缓存有效期 6 小时，可通过工具栏的"刷新"按钮强制重新抓取。

## 📁 项目结构

```
mct-data-dashboard/
├── prisma/
│   └── schema.prisma                  # Prisma 数据库 schema（MctDatasetCache 表）
├── public/
│   └── geo/
│       └── china.json                 # 中国分省 GeoJSON（datav 阿里云源）
├── src/
│   ├── app/
│   │   ├── layout.tsx                 # 全局布局
│   │   ├── page.tsx                   # 主大屏页面
│   │   ├── globals.css                # 全局样式
│   │   └── api/mct/
│   │       ├── datasets/route.ts      # GET - 数据集列表+总览统计
│   │       ├── dataset/route.ts       # GET - 单数据集详情
│   │       ├── refresh/route.ts       # POST - 强制刷新全部缓存
│   │       └── export/route.ts        # GET - CSV 导出
│   ├── components/
│   │   ├── ui/                        # shadcn/ui 基础组件
│   │   └── mct/
│   │       ├── ChinaMap.tsx           # ECharts 中国分省填色地图
│   │       ├── TopRanking.tsx         # 右侧 TOP15 排行榜
│   │       ├── ProvinceDetailCard.tsx # 省份详情侧滑面板
│   │       ├── TrendChart.tsx         # 底部 TOP10 对比图
│   │       ├── SummaryCards.tsx       # 4 张汇总卡片+时间条
│   │       └── Toolbar.tsx            # 类型切换+筛选+导出+刷新工具栏
│   └── lib/
│       ├── db.ts                      # Prisma Client
│       ├── utils.ts                   # 通用工具
│       └── mct/
│           ├── datasets.ts            # 数据集元信息+省份代码映射
│           └── fetcher.ts             # 抓取器（分页+缓存+完整性校验）
├── .env.example                       # 环境变量示例
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.mjs
├── next.config.ts
├── eslint.config.mjs
├── components.json                    # shadcn/ui 配置
└── README.md
```

## 📊 数据源

| Type ID | 数据集 | 数据量 |
|---------|--------|--------|
| 10 | 国家5A级旅游景区 | 359 |
| 11 | 五星级旅游饭店 | 842 |
| 135 | 国家级滑雪旅游度假地 | 26 |
| 138 | 国家级旅游休闲街区 | 204 |
| 143 | 国家工业旅游示范基地 | 142 |
| 54 | 国家级旅游度假区 | 85 |
| 145 | 全国甲级、乙级旅游民宿 | 557 |
| 148 | 文化产业赋能乡村振兴试点 | 113 |
| **合计** | | **2,328** |

**数据源 API**（文化和旅游部数据服务栏目内部接口）：
- `GET /api/spot/stats/{type}` — 各省份数量统计
- `GET /api/spot/list/{type}?page=N` — 翻页拉取全部条目（每页固定 20 条）
- `GET /api/marker/province/list` — 35 个省级行政区划代码

## 🔧 数据完整性保障

抓取器实现了多重完整性保障机制：

1. **三重校验**：`actual === officialTotal === statsSum`，任一不匹配即标记异常
2. **单页重试**：每页失败自动重试 3 次，指数退避（500ms → 1s → 2s）
3. **整轮重试**：完整性未通过时整轮重抓 2 次
4. **去重保护**：用 `Map<id, SpotItem>` 去重，防止分页边界重复
5. **降级策略**：所有重试失败时降级到旧缓存，保证可用性
6. **可视化提示**：UI 上每个数据集显示完整性状态（绿色对勾/橙色三角）

## 🚀 部署生产

```bash
# 构建生产版本
pnpm build

# 启动生产服务器
pnpm start

# 默认监听 3000 端口，可修改 package.json 中的 start 脚本
```

也可部署到 Vercel / Netlify / Cloudflare Pages 等平台，注意：
- 需要持久化存储 SQLite 数据库（或改用 PostgreSQL/MySQL）
- 在 `prisma/schema.prisma` 修改 datasource provider
- 设置环境变量 `DATABASE_URL`

## 📝 自定义

### 新增数据集

编辑 `src/lib/mct/datasets.ts`，在 `DATASETS` 数组中追加：

```typescript
{
  typeId: <新的type id>,
  name: '<数据集名称>',
  shortName: '<简称>',
  description: '<描述>',
  sourceUrl: '<源URL>',
  color: '<主题色 hex>',
  icon: '<emoji 图标>',
}
```

### 修改缓存时长

编辑 `src/lib/mct/fetcher.ts`：

```typescript
const CACHE_TTL_MS = 1000 * 60 * 60 * 6 // 默认 6 小时，按需修改
```

### 修改地图样式

编辑 `src/components/mct/ChinaMap.tsx` 中的 `option` 配置。

## 📄 License

数据版权归 **中华人民共和国文化和旅游部** 所有，本项目仅供学习研究使用。

## ⚠️ 免责声明

- 本项目通过公开 API 抓取数据，未做任何破解或绕过访问控制
- 抓取频率已限制（并发 3、单页重试 3 次），请勿用于高频爬取
- 数据可视化结果仅供研究演示，请以官方发布为准
- 商业使用需获得数据源方授权
