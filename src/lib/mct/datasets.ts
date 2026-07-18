/**
 * 文化和旅游部数据服务 - 数据源配置
 * 数据源：https://sjfw.mct.gov.cn/site/dataservice/home
 *
 * 已发现的数据集 type ID 与名称：
 *  - 10  国家5A级旅游景区
 *  - 11  五星级旅游饭店
 *  - 135 国家级滑雪旅游度假地
 *  - 138 国家级旅游休闲街区
 *  - 143 国家工业旅游示范基地
 *  - 54  国家级旅游度假区
 *  - 145 全国甲级、乙级旅游民宿
 *  - 148 文化产业赋能乡村振兴试点名单
 */

export interface DatasetMeta {
  typeId: number
  name: string
  shortName: string
  description: string
  /** 该数据集的详情页 URL */
  sourceUrl: string
  /** 主色调（用于卡片标签） */
  color: string
  /** 图标 emoji */
  icon: string
}

export const DATASETS: DatasetMeta[] = [
  {
    typeId: 10,
    name: '国家5A级旅游景区',
    shortName: '5A景区',
    description: '全国质量等级最高的旅游景区名录，由文化和旅游部评定发布。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=10',
    color: '#E63946',
    icon: '🏞️',
  },
  {
    typeId: 11,
    name: '五星级旅游饭店',
    shortName: '五星饭店',
    description: '全国五星级旅游饭店名录，反映高端住宿服务布局。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=11',
    color: '#F4A261',
    icon: '🏨',
  },
  {
    typeId: 135,
    name: '国家级滑雪旅游度假地',
    shortName: '滑雪度假地',
    description: '国家级滑雪旅游度假地名单，服务冰雪旅游产业发展。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=135',
    color: '#48CAE4',
    icon: '⛷️',
  },
  {
    typeId: 138,
    name: '国家级旅游休闲街区',
    shortName: '休闲街区',
    description: '国家级旅游休闲街区名单，体现城市文旅消费新空间。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=138',
    color: '#9D4EDD',
    icon: '🏘️',
  },
  {
    typeId: 143,
    name: '国家工业旅游示范基地',
    shortName: '工业旅游',
    description: '国家工业旅游示范基地名单，展示工业遗产活化利用典范。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=143',
    color: '#577590',
    icon: '🏭',
  },
  {
    typeId: 54,
    name: '国家级旅游度假区',
    shortName: '度假区',
    description: '国家级旅游度假区名录，高端休闲度假产品体系的核心载体。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=54',
    color: '#06A77D',
    icon: '🏝️',
  },
  {
    typeId: 145,
    name: '全国甲级、乙级旅游民宿',
    shortName: '旅游民宿',
    description: '全国甲级、乙级旅游民宿名单，乡村文旅住宿精品代表。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=145',
    color: '#D4A373',
    icon: '🏡',
  },
  {
    typeId: 148,
    name: '文化产业赋能乡村振兴试点',
    shortName: '乡村振兴',
    description: '文化产业赋能乡村振兴试点名单，文旅融合服务国家战略。',
    sourceUrl: 'https://sjfw.mct.gov.cn/site/dataservice/rural?type=148',
    color: '#7CB518',
    icon: '🌾',
  },
]

export const DATASET_MAP: Record<number, DatasetMeta> = DATASETS.reduce(
  (acc, d) => {
    acc[d.typeId] = d
    return acc
  },
  {} as Record<number, DatasetMeta>,
)

/** 省级行政区代码 → ECharts 地图省份名 映射 */
export const PROVINCE_CODE_TO_NAME: Record<number, string> = {
  110000: '北京',
  120000: '天津',
  130000: '河北',
  140000: '山西',
  150000: '内蒙古',
  210000: '辽宁',
  220000: '吉林',
  230000: '黑龙江',
  310000: '上海',
  320000: '江苏',
  330000: '浙江',
  340000: '安徽',
  350000: '福建',
  360000: '江西',
  370000: '山东',
  410000: '河南',
  420000: '湖北',
  430000: '湖南',
  440000: '广东',
  450000: '广西',
  460000: '海南',
  500000: '重庆',
  510000: '四川',
  520000: '贵州',
  530000: '云南',
  540000: '西藏',
  610000: '陕西',
  620000: '甘肃',
  630000: '青海',
  640000: '宁夏',
  650000: '新疆',
  990288: '兵团',
  710000: '台湾',
  810000: '香港',
  820000: '澳门',
}

/** 七大地理区域 → 省份代码 分组（用于区域筛选） */
export const REGION_GROUPS: { name: string; codes: number[] }[] = [
  { name: '华北', codes: [110000, 120000, 130000, 140000, 150000] },
  { name: '东北', codes: [210000, 220000, 230000] },
  { name: '华东', codes: [310000, 320000, 330000, 340000, 350000, 360000, 370000, 710000] },
  { name: '华中', codes: [410000, 420000, 430000] },
  { name: '华南', codes: [440000, 450000, 460000, 810000, 820000] },
  { name: '西南', codes: [500000, 510000, 520000, 530000, 540000] },
  { name: '西北', codes: [610000, 620000, 630000, 640000, 650000, 990288] },
]
