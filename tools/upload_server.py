#!/usr/bin/env python3
"""Servidor HTTP simples para upload de arquivos para ./docs/.

Sem frameworks: usa apenas a biblioteca padrao do Python.
Uso: python3 tools/upload_server.py [porta]  (padrao: 8080)
"""
import cgi
import html
import os
import sys
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8080
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DOCS_DIR = os.path.join(ROOT, "docs")

PAGE = """<!DOCTYPE html>
<html lang="pt-br">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Upload para ./docs/</title>
<style>
  body {{ font-family: system-ui, sans-serif; max-width: 640px; margin: 40px auto; padding: 0 16px; }}
  h1 {{ font-size: 1.3rem; }}
  form {{ border: 1px dashed #888; padding: 24px; border-radius: 8px; }}
  input[type=file] {{ display: block; margin: 12px 0; }}
  button {{ padding: 8px 18px; font-size: 1rem; cursor: pointer; }}
  .msg {{ padding: 12px; border-radius: 6px; margin-bottom: 16px; }}
  .ok {{ background: #e6f4ea; color: #1e6b34; }}
  ul {{ padding-left: 18px; }}
</style>
</head>
<body>
<h1>Upload de arquivos para ./docs/</h1>
{msg}
<form method="post" enctype="multipart/form-data" action="/upload">
  <input type="file" name="files" multiple required>
  <button type="submit">Enviar</button>
</form>
<h2>Arquivos em ./docs/</h2>
<ul>{listing}</ul>
</body>
</html>
"""


def render(msg=""):
    try:
        files = sorted(os.listdir(DOCS_DIR))
    except FileNotFoundError:
        files = []
    if files:
        listing = "".join(f"<li>{html.escape(f)}</li>" for f in files)
    else:
        listing = "<li><em>(vazio)</em></li>"
    return PAGE.format(msg=msg, listing=listing).encode("utf-8")


class Handler(BaseHTTPRequestHandler):
    def _send_html(self, body, status=200):
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        self._send_html(render())

    def do_POST(self):
        if self.path != "/upload":
            self._send_html(render(), status=404)
            return
        form = cgi.FieldStorage(
            fp=self.rfile,
            headers=self.headers,
            environ={"REQUEST_METHOD": "POST",
                     "CONTENT_TYPE": self.headers.get("Content-Type", "")},
        )
        os.makedirs(DOCS_DIR, exist_ok=True)
        items = form["files"] if "files" in form else []
        if not isinstance(items, list):
            items = [items]
        saved = []
        for item in items:
            if not getattr(item, "filename", None):
                continue
            name = os.path.basename(item.filename)
            with open(os.path.join(DOCS_DIR, name), "wb") as out:
                out.write(item.file.read())
            saved.append(name)
        if saved:
            names = ", ".join(html.escape(n) for n in saved)
            msg = f'<div class="msg ok">Enviado(s): {names}</div>'
        else:
            msg = '<div class="msg">Nenhum arquivo recebido.</div>'
        self._send_html(render(msg))

    def log_message(self, fmt, *args):
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))


def main():
    os.makedirs(DOCS_DIR, exist_ok=True)
    server = ThreadingHTTPServer(("0.0.0.0", PORT), Handler)
    print(f"Servidor de upload em http://localhost:{PORT}  ->  {DOCS_DIR}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        server.shutdown()


if __name__ == "__main__":
    main()
