# Works Library · 个人作品库

站酷风格的个人作品集网站：瀑布流首页、黑白极简详情页、可视化编辑器后台。

## 技术栈

- **前端**：Vite + React 19 + TypeScript + Tailwind CSS v4
- **后端**：Hono（单一 Worker 入口 `server/worker.ts`）
- **数据库**：Cloudflare D1（SQLite）
- **媒体存储**：Cloudflare R2
- **托管**：Cloudflare Workers（静态资源走 Workers Assets，`/api/*` 与 `/media/*` 走 Worker）

## 常用命令

```bash
npm run dev          # 本地开发（vite + wrangler 本地绑定，localhost:5173）
npm run build        # 构建前端产物到 dist/
npm run deploy       # 手动部署到 Cloudflare
npm run preview      # 生产同构预览（wrangler dev，localhost:8787）
npm run seed:media   # 把 media/ 目录批量写入存储（本地）
npm run migrate:d1   # 从本地 SQLite 生成 D1 导入 SQL
npm run set-password # 设置后台密码（本地/远端）
```

## 目录结构

```
src/          前端（pages 前台 / admin 后台 / components 公共组件）
server/       Worker 代码（worker.ts 入口 + routes/）
scripts/      迁移与运维脚本
schema.sql    D1 建表语句（--remote / --local 都用它）
media/        本地媒体文件（gitignore，线上存 R2）
data/         本地 SQLite 与密钥（gitignore）
```

## 说明

- 后台入口 `/admin`，密码登录（PBKDF2 哈希存储，登录限速）
- 数据库与图片不在仓库中：数据在 D1、图片在 R2，本地文件仅作开发副本
