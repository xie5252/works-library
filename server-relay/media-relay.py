#!/usr/bin/env python3
"""媒体上传中转服务（部署于上海轻量服务器）

职责：
  1. 接收后台上传（POST /ingest?token=..&type=..，multipart 单文件）
  2. 落盘 /srv/media-relay/media/<dir>/<name>（nginx try_files 本地优先出图，上传者即时预览）
  3. jpg/png 自动生成 WebP 展示版（长边 2000px，质量 85，仅在其更小时保留）
  4. 后台线程每 60s 用 rclone 把落定文件推到 R2 works-media（同名 key），推完删除本地
命名与 Worker 端 /api/upload 完全一致：<dir>/<base36时间戳>-<4字节随机>.<ext>
"""
import hmac
import os
import subprocess
import sys
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse

INCOMING = Path('/srv/media-relay/media')
TOKEN_FILE = Path('/srv/media-relay/token')
PORT = 8077
MIN_AGE = 20          # 文件落盘多少秒后才允许同步（确保写完）
SYNC_INTERVAL = 60    # 同步循环间隔（秒）
RCLONE_REMOTE = 'r2:works-media'

RULES = {  # type: (目录, 允许扩展名, 单文件上限MB) —— 与 Worker 端 upload.ts 对齐
    'logo':  ('logo',   {'png', 'jpg', 'jpeg', 'webp', 'svg'}, 5),
    'cover': ('covers', {'png', 'jpg', 'jpeg', 'webp'}, 20),
    'image': ('images', {'png', 'jpg', 'jpeg', 'webp'}, 20),
    'video': ('videos', {'mp4', 'webm'}, 95),
    'pdf':   ('pdfs',   {'pdf'}, 50),
}
WEBP_EXTS = {'jpg', 'jpeg', 'png'}  # 需要生成 WebP 展示版的扩展名

_B36 = '0123456789abcdefghijklmnopqrstuvwxyz'


def b36(n: int) -> str:
    s = ''
    while n:
        s = _B36[n % 36] + s
        n //= 36
    return s or '0'


def gen_key(dir_name: str, ext: str) -> str:
    rand = ''.join(str(b) for b in os.urandom(4))
    return f'{dir_name}/{b36(int(time.time() * 1000))}-{rand}.{ext}'


def make_webp(path: Path) -> None:
    """生成 WebP 展示版；失败或体积未变小时静默放弃（前端 onError 自动回退原图）"""
    if path.suffix.lstrip('.').lower() not in WEBP_EXTS:
        return
    out = path.with_suffix('.webp')
    try:
        r = subprocess.run(
            ['convert', str(path), '-resize', '2000x2000>', '-quality', '85', str(out)],
            capture_output=True, timeout=120,
        )
        ok = r.returncode == 0 and out.exists() and 0 < out.stat().st_size < path.stat().st_size
        if not ok:
            out.unlink(missing_ok=True)
    except Exception as e:  # noqa: BLE001
        print(f'[webp] {path.name}: {e}', flush=True)
        out.unlink(missing_ok=True)


def sync_loop() -> None:
    """后台同步：rclone move 到 R2（成功即删除本地），失败下轮重试"""
    while True:
        try:
            now = time.time()
            ready = [p for p in INCOMING.rglob('*') if p.is_file() and now - p.stat().st_mtime > MIN_AGE]
            if ready:
                print(f'[sync] {len(ready)} 个文件待推送', flush=True)
                r = subprocess.run(
                    ['rclone', 'move', str(INCOMING), RCLONE_REMOTE, '--min-age', str(MIN_AGE)],
                    capture_output=True, text=True, timeout=3600,
                )
                if r.returncode != 0:
                    print('[sync] rclone 失败:', r.stderr[-500:], flush=True)
                else:
                    print('[sync] 推送完成', flush=True)
        except Exception as e:  # noqa: BLE001
            print('[sync] error:', e, flush=True)
        time.sleep(SYNC_INTERVAL)


class Handler(BaseHTTPRequestHandler):
    protocol_version = 'HTTP/1.1'

    def log_message(self, fmt, *args):  # noqa: A003
        print(f'[http] {self.address_string()} {fmt % args}', flush=True)

    def _json(self, code: int, obj: dict) -> None:
        body = (str(obj).replace("'", '"')).encode()
        self.send_response(code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Content-Length', str(len(body)))
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):  # noqa: N802
        self.send_response(204)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', '*')
        self.send_header('Content-Length', '0')
        self.end_headers()

    def do_GET(self):  # noqa: N802
        if urlparse(self.path).path == '/healthz':
            self._json(200, {'ok': True})
        else:
            self._json(404, {'error': 'not found'})

    def do_POST(self):  # noqa: N802
        u = urlparse(self.path)
        if u.path != '/ingest':
            return self._json(404, {'error': 'not found'})

        q = parse_qs(u.query)
        token = (q.get('token') or [''])[0]
        if not TOKEN or not hmac.compare_digest(token, TOKEN):
            return self._json(401, {'error': '令牌无效'})

        rtype = (q.get('type') or ['image'])[0]
        if rtype not in RULES:
            return self._json(400, {'error': '上传类型不支持'})
        dir_name, exts, max_mb = RULES[rtype]

        length = int(self.headers.get('Content-Length') or 0)
        if length <= 0 or length > (max_mb + 1) * 1024 * 1024:
            return self._json(413, {'error': f'文件过大，最大 {max_mb}MB'})
        body = self.rfile.read(length)

        ctype = self.headers.get('Content-Type', '')
        if 'multipart/form-data' not in ctype or 'boundary=' not in ctype:
            return self._json(400, {'error': '需要 multipart/form-data'})
        boundary = ctype.split('boundary=', 1)[1].split(';', 1)[0].strip().strip('"').encode()

        file_bytes, filename = None, ''
        for part in body.split(b'--' + boundary)[1:]:
            part = part[2:] if part.startswith(b'\r\n') else part
            head, sep, data = part.partition(b'\r\n\r\n')
            if not sep:
                continue
            if data.endswith(b'\r\n'):
                data = data[:-2]
            if b'filename="' in head:
                filename = head.split(b'filename="', 1)[1].split(b'"', 1)[0].decode('utf-8', 'replace')
                file_bytes = data
                break
        if not file_bytes:
            return self._json(400, {'error': '没有收到文件'})

        ext = (filename.rsplit('.', 1)[-1] if '.' in filename else '').lower()
        if ext not in exts:
            return self._json(400, {'error': f'不支持的格式，仅支持：{"/".join(sorted(exts))}'})

        key = gen_key(dir_name, ext)
        dest = INCOMING / key
        dest.parent.mkdir(parents=True, exist_ok=True)
        dest.write_bytes(file_bytes)
        threading.Thread(target=make_webp, args=(dest,), daemon=True).start()

        print(f'[ingest] {key} ({len(file_bytes)} bytes)', flush=True)
        self._json(200, {'url': f'/media/{key}'})


def main() -> None:
    INCOMING.mkdir(parents=True, exist_ok=True)
    token = TOKEN_FILE.read_text().strip() if TOKEN_FILE.exists() else ''
    if not token:
        print('!! 缺少 /srv/media-relay/token，服务拒绝上传', flush=True)
    threading.Thread(target=sync_loop, daemon=True).start()
    print(f'media-relay listening on 127.0.0.1:{PORT}', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), Handler).serve_forever()


if __name__ == '__main__':
    main()
