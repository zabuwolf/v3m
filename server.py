#!/usr/bin/env python3
"""V3M HR Office – máy chủ web + API (chỉ dùng thư viện chuẩn Python).

Chạy:   python3 server.py            (mặc định cổng 8787, mở cho cả mạng LAN)
        python3 server.py 9000       (đổi cổng)

API:
  GET  /api/data        -> toàn bộ cơ sở dữ liệu (JSON)
  PUT  /api/data        -> ghi đè toàn bộ cơ sở dữ liệu
  POST /api/reset       -> sinh lại dữ liệu mẫu
  GET  /api/health      -> {"ok": true}
"""
import importlib
import json
import os
import shutil
import socket
import sys
import threading
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer

HERE = os.path.dirname(os.path.abspath(__file__))
WEB = os.path.join(HERE, "web")
DATA_DIR = os.path.join(HERE, "data")
DB_PATH = os.path.join(DATA_DIR, "db.json")
SEED_PATH = os.path.join(DATA_DIR, "seed.json")
LOCK = threading.Lock()


def ensure_db():
    os.makedirs(DATA_DIR, exist_ok=True)
    if not os.path.exists(SEED_PATH):
        sys.path.insert(0, HERE)
        import seed  # noqa: WPS433
        seed.write_all()
    if not os.path.exists(DB_PATH):
        shutil.copyfile(SEED_PATH, DB_PATH)


def load_db():
    with LOCK, open(DB_PATH, encoding="utf-8") as f:
        return json.load(f)


def save_db(obj):
    tmp = DB_PATH + ".tmp"
    with LOCK:
        with open(tmp, "w", encoding="utf-8") as f:
            json.dump(obj, f, ensure_ascii=False, indent=1)
        os.replace(tmp, DB_PATH)


class Handler(SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=WEB, **kw)

    def log_message(self, fmt, *args):  # gọn log
        if self.path.startswith("/api/") or self.path == "/":
            sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _json(self, code, payload):
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.end_headers()
        self.wfile.write(body)

    def end_headers(self):
        if not self.path.startswith("/api/"):
            self.send_header("Cache-Control", "no-cache")
        super().end_headers()

    def do_GET(self):
        if self.path == "/api/data":
            return self._json(200, load_db())
        if self.path == "/api/health":
            return self._json(200, {"ok": True})
        if self.path.startswith("/api/"):
            return self._json(404, {"error": "not found"})
        return super().do_GET()

    def do_PUT(self):
        if self.path != "/api/data":
            return self._json(404, {"error": "not found"})
        length = int(self.headers.get("Content-Length") or 0)
        try:
            obj = json.loads(self.rfile.read(length).decode("utf-8"))
        except Exception as exc:  # noqa: BLE001
            return self._json(400, {"error": f"json không hợp lệ: {exc}"})
        if not isinstance(obj, dict) or "employees" not in obj:
            return self._json(400, {"error": "thiếu trường employees"})
        save_db(obj)
        return self._json(200, {"ok": True})

    def do_POST(self):
        if self.path == "/api/reset":
            sys.path.insert(0, HERE)
            import seed  # noqa: WPS433
            importlib.reload(seed)  # nạp lại nếu seed.py vừa được sửa
            db = seed.write_all()
            save_db(db)
            return self._json(200, {"ok": True, "employees": len(db["employees"])})
        return self._json(404, {"error": "not found"})


def lan_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except OSError:
        return "127.0.0.1"


def main():
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8787
    ensure_db()
    srv = ThreadingHTTPServer(("0.0.0.0", port), Handler)
    print(f"V3M HR Office đang chạy:\n  http://localhost:{port}\n  http://{lan_ip()}:{port}  (điện thoại cùng Wi-Fi)")
    print("Nhấn Ctrl+C để dừng.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
