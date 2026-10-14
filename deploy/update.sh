#!/usr/bin/env bash
# 服务器端更新脚本（手动三连的自动化版）
# 用法：bash deploy/update.sh
set -e
cd /srv/works-library
echo "[1/4] git pull"
git pull origin main
echo "[2/4] 安装依赖"
npm ci
echo "[3/4] 构建（前端 + Node 打包）"
npm run build
npm run build:node
echo "[4/4] 重启服务"
sudo systemctl restart works-library
echo "✅ 更新完成"
