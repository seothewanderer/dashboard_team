"""정적 HTML 공유본 만들기 (plan.md 9.8).

1) 수신: .venv\\Scripts\\python.exe scripts\\export_html.py serve <캡처폴더>
   - 브라우저에서 앱 각 화면을 ...?export=1 로 열고 scripts/export_capture.js 의 exportCapture()를 실행하면
     화면별 캡처(JSON)가 <캡처폴더>에 저장된다.
2) 조립: .venv\\Scripts\\python.exe scripts\\export_html.py build <캡처폴더> <버전명>
   - html/<버전명>.html 한 파일(오프라인, 폰트 포함)로 묶는다. 예: v1_초안본_2026-09-30
"""
import base64
import json
import re
import sys
from datetime import date
from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "html"
FONTS = {400: "Pretendard-Regular.otf", 700: "Pretendard-Bold.otf", 800: "Pretendard-ExtraBold.otf"}
PORT = 8765

# 공유본 화면 순서와 이름
PAGES = [("home", "홈"), ("industry", "01 산업 이해"), ("jobs", "02 직무 탐색"), ("learning", "03 준비 역량"),
         ("learning.example", "03 준비 역량 · 예시(검색어 CAD)"), ("recruit.postings", "04 채용 현황"),
         ("recruit.companies", "04 기업 탐색")]

NOTICE = ("정적 공유본입니다. 사이드바 메뉴와 화면 안의 이동 버튼으로 화면을 오갈 수 있고, '근거 자세히'를 펼치면 "
          "차트의 숫자 표를 볼 수 있습니다. 필터·차트 클릭·상세 팝업·스크랩·테마 전환처럼 서버가 필요한 기능은 동작하지 "
          "않으며, 차트는 기본 상태의 이미지입니다(마우스 툴팁 없음). 개인 선택이 없는 기본 상태로 캡처했습니다.")

EXPORT_CSS = """
.export-page{display:none}.export-page.active{display:block}
.export-banner{position:sticky;top:0;z-index:1000000;display:flex;gap:var(--space-md);align-items:center;flex-wrap:nowrap;
  padding:var(--space-sm) var(--space-lg);background:var(--primary);color:var(--on-primary);font:var(--font-body);font-weight:600}
.export-banner b{font-weight:800;white-space:nowrap}
.export-banner span{font:var(--font-caption);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.export-banner label{white-space:nowrap}
.export-banner select{font:var(--font-body);border-radius:var(--radius-full);border:none;padding:var(--space-xxs) var(--space-sm)}
[data-export-go]{cursor:pointer}
/* ECharts는 캔버스 여러 장(도형·글자 층)을 겹쳐 그린다 → 이미지도 같은 자리에 겹친다 */
img.export-canvas{position:absolute;left:0;top:0}
.stApp{min-height:auto!important}
"""

EXPORT_JS = """
(function(){
  var pages=[].slice.call(document.querySelectorAll('.export-page'));
  var pick=document.getElementById('export-pick');
  function show(key){
    var hit=pages.some(function(p){return p.dataset.page===key;}); if(!hit) key='home';
    pages.forEach(function(p){p.classList.toggle('active', p.dataset.page===key);});
    pick.value=key; history.replaceState(null,'','#'+key); window.scrollTo(0,0);
  }
  document.addEventListener('click',function(e){
    var core=e.target.closest('.hero .core');
    if(core){var h=core.closest('.hero');h.classList.toggle('open');return;}
    var t=e.target.closest('[data-export-go]');
    if(t){e.preventDefault();e.stopPropagation();show(t.getAttribute('data-export-go'));}
  },true);
  pick.addEventListener('change',function(){show(pick.value);});
  show((location.hash||'#home').slice(1));
})();
"""


class Receiver(BaseHTTPRequestHandler):
    folder: Path

    def do_POST(self):  # noqa: N802
        body = self.rfile.read(int(self.headers["Content-Length"]))
        data = json.loads(body)
        (self.folder / f"{data['name']}.json").write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
        self.send_response(200)
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(b"ok")

    def do_GET(self):  # noqa: N802 — 캡처 함수(export_capture.js)를 브라우저에 내려준다
        body = (ROOT / "scripts" / "export_capture.js").read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", "text/javascript; charset=utf-8")
        self.send_header("Access-Control-Allow-Origin", "*")
        self.end_headers()
        self.wfile.write(body)

    def log_message(self, *args):
        pass


def serve(folder: Path) -> None:
    folder.mkdir(parents=True, exist_ok=True)
    Receiver.folder = folder
    print(f"캡처 수신 대기: http://localhost:{PORT} → {folder}", flush=True)
    HTTPServer(("localhost", PORT), Receiver).serve_forever()


ICON = re.compile(r'<span[^>]*data-testid="stIconMaterial"[^>]*>[^<]*</span>')


def strip_icons(html: str) -> str:
    """Material 아이콘은 서버 글꼴이 있어야 보이므로(오프라인에서는 'expand_more' 같은 글자로 보임) 뺀다.
    버튼·링크에는 글자 라벨이 있어 의미는 유지된다."""
    return ICON.sub("", html)


def font_faces() -> str:
    faces = []
    for weight, file in FONTS.items():
        data = base64.b64encode((ROOT / "design" / file).read_bytes()).decode("ascii")
        faces.append(f'@font-face{{font-family:"Pretendard";src:url(data:font/otf;base64,{data}) format("opentype");'
                     f"font-weight:{weight};font-style:normal;font-display:swap}}")
    return "\n".join(faces)


def build(folder: Path, version: str) -> Path:
    captures = {p.stem: json.loads(p.read_text(encoding="utf-8")) for p in folder.glob("*.json")}
    missing = [k for k, _ in PAGES if k not in captures]
    if missing:
        sys.exit(f"캡처가 없는 화면: {missing}")
    css, seen = [], set()
    for key, _ in PAGES:  # 화면별 스타일 규칙을 순서를 지켜 합친다(중복 제거)
        for rule in captures[key]["css"]:
            if rule not in seen and "app/static/fonts" not in rule and "/media/" not in rule:  # 서버 글꼴 파일 제외
                seen.add(rule)
                css.append(rule)
    options = "".join(f'<option value="{k}">{escape(label)}</option>' for k, label in PAGES)
    sections = "\n".join(f'<section class="export-page" data-page="{k}">{strip_icons(captures[k]["html"])}</section>'
                         for k, _ in PAGES)
    title = f"드론 진로 탐색 — {version.replace('_', ' ')}"
    html = f"""<!doctype html>
<html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>{escape(title)}</title>
<style>{font_faces()}</style>
<style>{chr(10).join(css)}</style>
<style>{EXPORT_CSS}</style>
</head><body>
<div class="export-banner"><b>{escape(title)}</b><span title="{escape(NOTICE)}">{escape(NOTICE)}</span>
<label>화면 <select id="export-pick">{options}</select></label></div>
{sections}
<script>{EXPORT_JS}</script>
</body></html>"""
    OUT.mkdir(exist_ok=True)
    path = OUT / f"{version}.html"
    path.write_text(html, encoding="utf-8")
    return path


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    if cmd == "serve":
        serve(Path(sys.argv[2]))
    elif cmd == "build":
        out = build(Path(sys.argv[2]), sys.argv[3] if len(sys.argv) > 3 else f"v1_초안본_{date.today()}")
        print(f"저장: {out} ({out.stat().st_size / 1_048_576:.1f}MB)")
    else:
        sys.exit(__doc__)
