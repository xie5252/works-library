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

// ---------- 关于我（简历页 v2：1:1 移植 xie-ke-1 简历项目，存 settings.about JSON） ----------
export interface AboutPersonalItem {
  label: string
  value: string
}
export interface AboutStrength {
  highlight: string
  title: string
  body: string
}
export interface AboutJob {
  year: string
  company: string
  role: string
  city: string
  bullets: string[]
}
export interface AboutResult {
  value: string
  label: string
  note: string
}
export interface AboutSkillGroup {
  title: string
  items: string[]
}
export interface AboutSkill {
  name: string
  level: number
}
export interface AboutData {
  name: string
  title: string
  lead: string
  pdf_url: string // 简历 PDF 下载地址，留空隐藏按钮
  contact_email: string
  contact_wechat: string
  personal: AboutPersonalItem[]
  strengths: AboutStrength[]
  jobs: AboutJob[]
  results: AboutResult[]
  skill_groups: AboutSkillGroup[]
  skills: AboutSkill[]
  field: { title: string; body: string; tags: string[] }
  end: { title: string; sub: string }
}

// 默认内容 = xie-ke-1 简历页 1:1 搬运（后台可改，保存后覆盖）
export const DEFAULT_ABOUT: AboutData = {
  name: '谢轲',
  title: '品牌数字化负责人 / 数字化产品 / 产品开发',
  lead: '品牌视觉与内容出身，9 年跨领域实战，覆盖产品开发、电商、供应链、业务系统与 AI；从设计做到供应链落地，再用数字化和 AI 把整条链路重做一遍。长期在实体企业一线，把真实问题转化为产品、流程与可使用的数字化工具。',
  pdf_url: '/xie-ke-resume.pdf',
  contact_email: '983047904@qq.com',
  contact_wechat: 'MuYo0402',
  personal: [
    { label: '姓名', value: '谢轲' },
    { label: '出生年份', value: '1996 年' },
    { label: '学历', value: '齐鲁工业大学｜视觉传达设计' },
    { label: '在校经历', value: '班长' },
    { label: '目前所在地', value: '济南' },
    { label: '目标城市', value: '杭州' },
    { label: '工作年限', value: '9 年（设计 6 年 + 数字化产品 3 年）' },
    { label: '联系方式', value: '983047904@qq.com' },
    { label: '微信', value: 'MuYo0402' },
  ],
  strengths: [
    { highlight: '实体业务', title: '懂实体业务，不只懂设计', body: '从电子厂、仓储一线，到设计、产品、供应链、销售与数字化，能从真实业务现场判断问题，而不是只从软件功能出发。' },
    { highlight: '设计 → 产品 → 开发', title: '设计 → 产品 → 开发闭环', body: '具备视觉设计底盘，同时能梳理需求、设计流程与交互，并借助 AI 完成 Web、业务系统与个人应用的开发落地。' },
    { highlight: '供应链落地', title: '能把产品做到供应链落地', body: '参与原料、包材、工艺、成本、供应商与生产周期管理，理解一个产品从想法到生产、入库、销售的完整链路。' },
    { highlight: '数字化实战', title: '数字化不是概念，而是实际使用', body: '从报价工具切入，逐步建设销售系统与综合管理系统，并根据各部门真实反馈持续迭代、部署和维护。' },
    { highlight: 'AI 工作流', title: 'AI 已进入实际工作流', body: '完成本地大模型、Dify 工作台等实践，正在推进企业知识库、RAG、Agent 与业务自动化，让 AI 成为业务基础能力。' },
    { highlight: '结果意识', title: '结果意识强，习惯用数据复盘', body: '关注效率、成本、转化、产品结构与流程闭环，把项目成果尽量转化为可被招聘者快速理解的业务指标。' },
  ],
  jobs: [
    {
      year: '2023.10–至今',
      company: '中益茶业（西双版纳）',
      role: '产品设计负责人 → 品牌数字化负责人',
      city: '济南',
      bullets: [
        '入职初期负责旗下子品牌产品设计与内容生产，后因业务表现进入总公司，逐步承担产品创新、品牌内容与数字化升级工作。',
        '主导散茶向礼品茶转型，从产品组合、包装形态、包材工艺、内容表达与销售协同多个环节推进，礼品茶业务占比由约 10–20% 提升至 80%+。',
        '负责原料、包材、工艺、成本核算及供应商沟通，管理 10+ 包装与配套供应商；纸类耗材约 -15%、生产周期约 -15%、采购综合成本约 -10%。',
        '年均上新 1000+ 款，产品摄影与视频内容持续由本人完成；在售包装约 95% 由本人独立设计，2025 年 47 天完成 38 款包装设计。',
        '从报价单工具开始，自研报价单系统、销售管理系统、综合管理系统，并负责产品、需求、开发、部署、权限、反馈与持续迭代。',
        '完成品牌官网从设计到开发、腾讯云部署、Nginx、HTTPS 与备案；推进企业 AI 知识库、本地大模型、Dify、RAG 与 Agent。',
      ],
    },
    {
      year: '2022.10–2023.09',
      company: '知岐健康产业（山东）集团',
      role: '品牌设计主管',
      city: '济南',
      bullets: [
        '负责企业官网后台运维、公众号内容策划与发布，保障品牌线上内容持续更新。',
        '搭建品牌 VI 体系，输出画册、产品包装、电商推广物料与日常视觉内容。',
        '承接活动现场拍摄、视频剪辑，并协同团队完成活动策划与执行落地。',
      ],
    },
    {
      year: '2019.10–2022.09',
      company: '济南汉磁生物科技',
      role: '美工 / 电商设计师',
      city: '济南',
      bullets: [
        '负责京东、天猫店铺视觉建设，覆盖首页、详情页、活动专题等核心电商页面。',
        '深度参与 618、双 11 等大促全周期，结合平台节奏完成视觉与推广物料交付。',
        '输出产品包装、宣传手册、线下广告牌、企业官网等品牌物料，并参与企业活动视觉统筹。',
        '连续两年独立统筹公司年会，覆盖舞台视觉、流程规划、人员分工、灯光与大屏等执行环节；参与全国经销商大会策划。',
      ],
    },
    {
      year: '2019 上半年',
      company: '福牌阿胶',
      role: '产品 / 包装设计',
      city: '济南平阴',
      bullets: [
        '负责产品包装开发、产品落地、官网视觉、商业拍摄与企业会议宣传。',
        '设计产出的产品包装获得经销商积极反馈，进一步强化了产品、包装与市场之间的联系。',
      ],
    },
    {
      year: '2018.11–2019.03',
      company: '青岛创智空间有限公司',
      role: '设计师（进修）',
      city: '青岛',
      bullets: [
        '在乙方设计公司参与客户品牌宣传物料交付，系统补强商业设计能力。',
        '跟随正邦出身设计总监学习商业摄影、视频剪辑、电商设计，完成商品精修、人像调色、商业海报等商业交付。',
      ],
    },
    {
      year: '2017.11–2018.11',
      company: '北斗正明科技发展有限公司',
      role: '电商视觉设计',
      city: '北京',
      bullets: [
        '负责京东、天猫、拼多多店铺整体视觉搭建，输出首页、详情页、活动 Banner。',
        '完成产品短视频拍摄与剪辑，并输出宣传单、包装、户外广告等线下物料。',
        '服务厨具、水杯、日用百货等消费品类目，建立电商视觉与商业交付基础。',
      ],
    },
  ],
  results: [
    { value: '1000+', label: '年均上新产品', note: '产品开发、包装、摄影与视频内容持续协同。' },
    { value: '95%', label: '在售包装独立设计', note: '覆盖纸盒、木盒、瓷罐、简装、纸箱与包装袋等。' },
    { value: '2 天 → 10 分钟', label: '对账耗时', note: '统一产品、订单、库存与业务数据链路。' },
    { value: '10% → ≈0', label: '订单漏单率', note: '通过订单、库存与任务状态关联减少遗漏。' },
    { value: '10–20% → 80%+', label: '礼品茶业务占比', note: '参与产品组合、包装与内容表达的业务转型。' },
    { value: '3 套', label: '自研企业业务系统', note: '报价单、销售管理、综合管理，从工具逐步形成平台。' },
  ],
  skill_groups: [
    { title: '设计与内容', items: ['Photoshop（精通）', 'Illustrator（精通）', 'Premiere Pro', 'After Effects', 'Cinema 4D', '商业摄影', '视频拍摄与剪辑'] },
    { title: '产品与业务', items: ['产品开发', '包装设计', '包材与工艺', '成本核算', '供应商协同', '电商运营逻辑', '业务流程梳理'] },
    { title: 'AI 与产品开发', items: ['GPT / Claude Code', 'Codex / Trae', 'DeepSeek', 'Ollama', 'Dify', 'RAG / Agent', 'Qwen2.5-VL', 'AI 辅助开发'] },
    { title: '开发与部署', items: ['Python / Flask', 'Next.js / React', 'Node.js', 'SQLite / 数据库', '腾讯云', 'Nginx', 'HTTPS / ICP 备案', 'Cocos 3.8.8'] },
  ],
  skills: [
    { name: 'PS', level: 95 },
    { name: 'AI', level: 92 },
    { name: '商业摄影', level: 88 },
    { name: '视频剪辑', level: 85 },
    { name: 'GPT / Claude Code', level: 90 },
    { name: 'Dify / RAG / Agent', level: 85 },
    { name: 'Ollama', level: 82 },
    { name: 'Qwen2.5 VL', level: 78 },
    { name: 'Python / Flask', level: 75 },
    { name: 'Next.js / React', level: 75 },
    { name: '腾讯云部署运维', level: 70 },
  ],
  field: {
    title: '我不是从办公室开始理解实体业务的。',
    body: '大学及早期工作阶段，曾在真实的一线岗位服务：电子厂、仓储与高端餐饮。后来进入设计、产品、供应链与数字化，这些经历让我更容易理解生产、仓库、交付和一线协作中的真实问题。',
    tags: ['烟台 LG 屏幕组装厂', '上海昌硕', '京东仓储｜河北固安', '青岛名家餐饮｜高端服务业'],
  },
  end: {
    title: '把问题做成真正能用的东西。',
    sub: '希望把设计、产品、数字化与 AI，继续放进真实业务里。',
  },
}
