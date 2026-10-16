// ---------- 内容块（与后端 content JSON 对齐，预留扩展块类型） ----------
export type BlockType = 'text' | 'image' | 'video' | 'pdf'

// 文字块简单排版
export interface TextFmt {
  h?: 1 | 2 | 3
  bold?: boolean
  italic?: boolean
  underline?: boolean
  align?: 'left' | 'center' | 'right'
  quote?: boolean
  list?: 'ul' | 'ol'
}

export interface TextBlock {
  type: 'text'
  text: string
  fmt?: TextFmt
}

export interface ImageBlock {
  type: 'image'
  url: string
  caption?: string
}

export interface VideoBlock {
  type: 'video'
  url: string
  caption?: string
}

export interface PdfBlock {
  type: 'pdf'
  url: string
  title?: string
}

export type ContentBlock = TextBlock | ImageBlock | VideoBlock | PdfBlock

export type WorkStatus = 'draft' | 'published'

// 详情页背景主题：典雅白 / 高端黑
export type WorkBgTheme = 'light' | 'dark'

export interface Work {
  id: number
  title: string
  slug: string
  category: string
  categories: string[]
  tags: string[]
  cover: string | null
  cover_source?: string | null
  content: ContentBlock[]
  status: WorkStatus
  featured_order: number | null
  bg_theme: WorkBgTheme
  created_at: string
  updated_at: string
  views: number
  deleted_at?: string | null
}

export interface SiteSettings {
  logo: string | null
  site_name: string
  site_name_en: string
  footer_text: string
  footer_credit: string
  beian_no: string
  media_cdn: string
  about_enabled: string // '1' 显示「关于我」入口，'0' 隐藏
}

export interface Category {
  id: number
  name: string
  sort: number
}

// 接口异常时的兜底分类（正常以后台「分类管理」为准）
export const FALLBACK_CATEGORIES = ['设计', '摄影', '视频', 'AI应用', '数字化', '其他']

// ---------- 关于我（简历页，后台可编辑，存 settings.about JSON） ----------
export interface AboutStat {
  num: string
  label: string
}
export interface AboutTimeline {
  period: string
  company: string
  role: string
  desc: string
}
export interface AboutProject {
  name: string
  year: string
  role: string
  result: string
}
export interface AboutAbility {
  dim: string
  points: string
}
export interface AboutSkill {
  name: string
  level: number
}
export interface AboutData {
  name: string
  name_en: string
  title: string
  tagline: string
  contact_email: string
  contact_phone: string
  contact_wechat: string
  stats: AboutStat[]
  timeline: AboutTimeline[]
  achievements: string[]
  projects: AboutProject[]
  abilities: AboutAbility[]
  skills: AboutSkill[]
  differentiators: string[]
}

// 默认内容 = 简历总结提炼版（后台可随时改，保存后覆盖）
export const DEFAULT_ABOUT: AboutData = {
  name: '谢轲',
  name_en: 'XIE KE',
  title: '品牌数字化负责人 / 产品经理',
  tagline:
    '30 岁，9 年跨领域。从电子厂流水线、京东仓储一路走到品牌中台，跑通「实体一线 → 视觉设计 → 产品开发 → 业务系统 → AI 落地」全链路。近三年在茶企从子品牌一人全包做起，主导散茶转礼品茶，因通用系统接不住非标业务而自研系统，帮企业告别纸质办公，获公司唯一专项奖金。近期完成 DeepSeek R1 + 千问多模态本地部署，搭 Dify 企业 AI 工作台。',
  contact_email: '983047904@qq.com',
  contact_phone: '173-5348-5216',
  contact_wechat: 'MuYo0402',
  stats: [
    { num: '1000+', label: '年均上新产品（款），拍摄剪辑全本人完成' },
    { num: '95%', label: '在售包装由本人独立设计，年售罄率 95%+' },
    { num: '10 分钟', label: '对账耗时（原 2 天）' },
    { num: '≈0', label: '漏单率（原 10%）' },
    { num: '80%+', label: '礼品茶占比（原 10–20%）' },
  ],
  timeline: [
    {
      period: '2023.10 – 至今',
      company: '中益茶业（西双版纳）',
      role: '产品设计负责人 → 品牌数字化负责人',
      desc: '子品牌一人全包（年均上新 1000+ 款）；主导散茶转礼品茶；自研综合管理 + 销售系统；落地企业 AI 知识库；获公司唯一专项奖金。',
    },
    {
      period: '2022.10 – 2023.09',
      company: '知岐健康产业（山东）集团',
      role: '品牌设计主管',
      desc: '企业官网后台运维、公众号内容策划与发布；搭建品牌 VI 体系，输出画册、产品包装、电商推广物料；承接活动实拍与视频剪辑。',
    },
    {
      period: '2019.10 – 2022.09',
      company: '济南汉磁生物科技',
      role: '美工 / 电商设计师',
      desc: '京东、天猫店铺视觉建设，深度参与 618、双 11 大促全周期；产出包装、宣传手册、线下广告牌、企业官网全套品牌物料；连续两年独立统筹公司年会。',
    },
    {
      period: '2017.11 – 2018.11',
      company: '北斗正明科技（北京）',
      role: '电商视觉设计',
      desc: '京东、天猫、拼多多店铺整体视觉搭建；产出首页、详情页、活动 Banner 与产品短视频；服务厨具、水杯、日用百货类目。',
    },
  ],
  achievements: [
    '一人全包起盘：子品牌产品设计与内容生产全部独立负责，2025 年 47 天交付 38 款包装。',
    '包装话语权：在售包装 95% 本人独立设计，覆盖纸质礼盒 / 木盒 / 瓷罐 / 简装全品类，年售罄率 95%+。',
    '业务结构翻转：散茶 → 礼品茶，占比 10–20% → 80%+；任职期间公司营收数百万 → 数千万。',
    '团队与角色：团队 1 人扩至 3–4 人（AI 图像 / 视频生成、产品开发）；贯通「包装设计 → 产品开发 → 包材工艺 → 成本核算 → 供应链 → 周期管理 → 出入库」全链路。',
    '系统自研：先引入 CRM / ERP，因非标流程接不住，自研综合管理系统（12 模块）+ 销售系统。',
    'AI 落地：DeepSeek R1 + Qwen2.5 VL 本地部署，Dify 工作台，推进 RAG 与业务 Agent。',
  ],
  projects: [
    { name: '中益综合管理系统', year: '2026 – 至今', role: '产品 / 全栈 / 运维', result: '12 模块，对账 2 天→10 分钟，漏单 10%→0，全公司使用，获唯一专项奖金' },
    { name: '销售管理系统', year: '2026 – 至今', role: '产品 / 全栈', result: '高德 API 代理地图 + 5km 区域保护自动校验，货品追踪 + 业绩统计' },
    { name: '报价单系统', year: '2026 – 至今', role: '产品 / 全栈', result: '报价 1 天 → 数分钟，首套自研工具，验证数字化价值' },
    { name: '礼品茶产品线转型', year: '2024 – 至今', role: '产品负责人', result: '8 类包装形态 × 5 类茶品，礼品茶 80%+，好评 90%+，纸耗 -15%' },
    { name: '品牌官网', year: '2026 – 至今', role: '设计 / 开发 / 部署 / 运维', result: 'Next.js 15 自建站点，摆脱第三方建站工单依赖' },
    { name: '企业 AI 知识库', year: '2026 – 至今', role: '架构 / 部署 / Agent', result: 'Ollama + Dify，数据不出内网，RAG / Agent 推进中' },
    { name: '本地记账 APP', year: '2026', role: '独立开发', result: '数据不上传，稳定自用数月' },
    { name: '本地密码库 APP', year: '2026', role: '独立开发', result: '本地加密，指纹 / 人脸，管理数十平台账号' },
    { name: '微信小游戏（农场）', year: '2026 – 至今', role: 'UI + AI 辅助开发', result: 'Cocos 3.8.8，主界面已完成，目标上架' },
  ],
  abilities: [
    { dim: '产品开发与供应链', points: '原料选型、包材工艺、成本测算、供应商落地（纸耗 -15%、周期 -15%、成本 -10%）' },
    { dim: '品牌视觉与内容中台', points: 'VI、包装、电商视觉、商业摄影（点击率 +30%、播放 5 万+）' },
    { dim: 'AI 系统与流程重构', points: '业务调研、自研系统、官网、云部署、本地大模型、RAG、Agent、Dify' },
    { dim: '电商与数字化运营', points: '天猫京东逻辑、618 / 双 11 全周期、转化分析、年会与经销商大会统筹' },
  ],
  skills: [
    { name: 'Photoshop', level: 95 },
    { name: 'Illustrator', level: 92 },
    { name: '商业摄影', level: 88 },
    { name: '视频剪辑', level: 85 },
    { name: 'GPT / Claude Code', level: 90 },
    { name: 'Dify / RAG / Agent', level: 85 },
    { name: 'Ollama 本地部署', level: 82 },
    { name: 'Python / Flask', level: 75 },
    { name: 'Next.js / React', level: 75 },
  ],
  differentiators: [
    '一线出身：电子厂流水线 + 京东仓库 + 高端餐厅服务员，懂实体工厂与仓储的真实痛点。',
    '不是买系统，是自己造：先上 CRM/ERP，发现非标接不住，才自研 12 模块平台。',
    '设计 → 开发闭环：借 AI 独立完成两个 APP，Cocos 小游戏开发中。',
    'AI 真落地：本地显卡推理、数据不出内网、Dify 编排，往 RAG 与业务 Agent 走。',
  ],
}
