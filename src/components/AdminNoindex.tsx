// 后台页面专用：禁止搜索引擎收录（React 19 会把 meta 提升到 <head>，离开页面自动移除）
export default function AdminNoindex() {
  return <meta name="robots" content="noindex, nofollow" />
}
