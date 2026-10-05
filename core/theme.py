"""디자인 토큰의 단일 원천 — design/DESIGN.md (Green Deck, 2026-09-30).

모드 공통 값은 BASE, 라이트/다크별 값은 MODE. 모두 CSS 변수로 주입하며
views/components/static CSS는 var(--…)만 쓴다(값 리터럴 금지). 차트·표(iframe)는 color()로 실제 값을 받는다.
"""
import base64
import functools
from pathlib import Path

import streamlit as st

from core import logo
from core.config import ROOT

FONT_SANS = ('"Pretendard",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",'
             'Arial,Helvetica,sans-serif')

# DESIGN §5 타이포: (size, line-height, weight, tracking)
TYPE = {
    "page-title": ("32px", "40px", 700, "-0.02em"),
    "section-title": ("24px", "32px", 700, "-0.01em"), "card-title": ("16px", "22px", 700, "0"),
    "chart-title": ("20px", "26px", 700, "-0.01em"),   # 차트 카드 제목(요청 F8: 카드 제목보다 크게)
    "body": ("14px", "22px", 400, "0"), "body-small": ("12px", "18px", 400, "0"),
    "label": ("11px", "16px", 700, "0.1em"), "caption": ("12px", "18px", 400, "0"),
    "nav": ("17px", "24px", 700, "0"), "data": ("28px", "34px", 700, "-0.02em"),
    "brand": ("22px", "28px", 800, "-0.02em"),   # 사이드바 서비스명(메뉴보다 크게, 요청 D1)
    "button": ("14px", "20px", 700, "0.05em"),
    "kpi": ("34px", "40px", 800, "-0.02em"),     # 01 KPI 카드 숫자(요청 I1, Proposed)
}

BASE = {
    "--font-sans": FONT_SANS,
    # 간격 (DESIGN §6.2)
    "--space-xxs": "4px", "--space-xs": "8px", "--space-sm": "12px", "--space-md": "16px", "--space-lg": "24px",
    "--space-xl": "32px", "--space-xxl": "48px", "--space-3xl": "64px", "--space-section": "40px",
    "--gutter": "24px", "--page-margin": "32px", "--container-max": "1600px",
    # 반경 (DESIGN §6.3)
    "--radius-xs": "2px", "--radius-sm": "4px", "--radius-md": "8px", "--radius-lg": "12px", "--radius-full": "9999px",
    # 레이아웃 (DESIGN §6.4)
    "--sidebar-w": "240px", "--roadmap-w": "260px", "--roadmap-w-compact": "240px", "--topbar-h": "56px",
    # 탐색 경로를 화면 오른쪽 끝에 붙일 때 본문 최대 폭 = 예전 1600px 틀 안의 본문 폭(요청 AA4, Proposed)
    "--main-max": "calc(var(--container-max) - 2 * var(--page-margin) - var(--gutter) - var(--roadmap-w))",
    "--mycond-scale": "0.85",
    "--card-size-w": "150px",
    "--note-icon-size": "14px",   # 파란 안내 느낌표 크기(요청 AE1, Proposed)
    "--toc-no": "24px",           # 소개 카드 목차 번호 원(요청 AB5, Proposed)
    "--logo-topbar": "28px", "--logo-sidebar": "26px", "--logo-home": "88px", "--logo-footer": "64px",   # 로고 크기: 상단 줄·사이드바·홈 제목+설명·푸터(요청 AH, Proposed)
    "--roadmap-no-w": "20px", "--rm-drone": "16px", "--rm-path-w": "2px",   # 로드맵 번호 칸·드론 아이콘·지나온 선 굵기(요청 AB3, Proposed)     # 카드 펼치기 'N개씩 보기' 목록 폭(요청 AB7, Proposed)     # 탐색 경로 '내 조건' 설명·항목 글꼴 배율(요청 AA5, Proposed)
    "--nav-item-h": "44px",       # 사이드바 메뉴 항목 높이(홈~04 동일, 요청 2026-09-30)
    "--nav-no-w": "36px",         # 번호·홈 아이콘 칸 폭(이름 시작 위치를 맞춤, 요청 D2)
    "--nav-icon": "22px",         # 홈 아이콘 크기(번호 글자 높이에 맞춤, 요청 D3)
    "--nav-sub-ratio": "0.7",
    "--preview-fade-h": "110px",  # 01 분야 미리보기 흐림 높이(약 2.5줄, 요청 I3)
    "--preview-blur": "3px",
    "--kpi-icon": "64px", "--kpi-glyph": "40px",   # 01 KPI 카드 아이콘 원·그림 크기(요청 I1, Proposed)
    "--holo-scan-opacity": "1",   # 02 3D 직무 네트워크 가로줄(홀로그램, 요청 M2, Proposed)
    "--note-btn-w": "200px",   # 04 비교 안내 상자 단추 폭(같은 폭, 요청 N9, Proposed)
    "--card-icon": "18px", "--picked-scale": "1.02", "--picked-glow": "18px",   # 카드 버튼 아이콘·선택 카드(요청 L, Proposed)
    "--faded-opacity": "0.45",   # 목표 직무와 관련 없는 카드(강조 ON, 요청 F5)     # 04 하위 메뉴 글꼴 = 상위 메뉴의 70% (요청 F7)
    "--control-h": "40px", "--button-h": "32px", "--button-pad-x": "32px",
    # 선·표시
    "--border-w": "1px", "--indicator-w": "3px", "--focus-w": "1px", "--card-border-w": "2px", "--badge-pad-y": "2px",
    "--measure": "640px",
    # 움직임 (DESIGN §10)
    "--ease-standard": "cubic-bezier(0.2,0,0,1)", "--duration-fast": "150ms", "--duration-base": "200ms",
    "--duration-slide": "300ms", "--hover-scale": "1.04", "--hover-lift": "-2px",
    # 방산 대조색 (DESIGN §12.1 빨강, 요청 F2 — 테마와 무관). 배지 글자는 진한 빨강 위 흰색(8.99:1)
    "--defense-strong": "#E22134", "--defense-deep": "#8E1B26", "--defense-candidate": "rgba(226,33,52,0.4)",
    "--on-defense": "#FFFFFF", "--defense-grad-start": "#8E1B26", "--defense-grad-end": "#E22134",
    # 홈 3D 드론 Hero·요약 카드·이용 안내 (팀원 Home 반영, 요청 P1~P3, Proposed (not in source)) — 값은 팀원 home-only.html 그대로
    "--hm-h": "540px", "--hm-drone-w": "360px", "--hm-ring": "300px", "--hm-gap": "32px", "--hm-panel-w": "216px", "--hm-panel-pad-y": "12px", "--hm-panel-icon": "20px",   # 패널: 글자·여백 키움(요청 Q2)
    "--hm-toggle": "32px", "--hm-toggle-icon": "14px", "--hm-label-px": "10px",
    "--hm-kpi-pad-y": "22px", "--hm-kpi-pad-x": "clamp(16px,2.8cqi,28px)", "--hm-kpi-gap": "8px", "--hm-unit-gap": "4px", "--hm-kpi-icon": "34px", "--hm-kpi-go": "8px",   # 요약 카드 아이콘·화살표(요청 R)
    "--hm-font-title": f"800 44px/52px {FONT_SANS}", "--hm-title-ls": "-0.025em", "--hm-title-gap": "10px",
    "--hm-font-kpi-label": f"600 13px/18px {FONT_SANS}", "--hm-font-kpi-value": f"700 clamp(26px,3.4cqi,34px)/40px {FONT_SANS}",
    "--hm-font-kpi-unit": f"600 clamp(14px,1.7cqi,17px)/22px {FONT_SANS}",
    "--hm-font-panel": f"700 16px/22px {FONT_SANS}", "--hm-font-panel-desc": f"400 13px/20px {FONT_SANS}",
    "--hm-guide-mt": "48px",   # 104 → 48(요청 Y2)
    "--hm-guide-pad": "36px 40px", "--hm-guide-col-gap": "32px", "--hm-guide-no": "32px",
    "--hm-font-guide-no": f"700 14px/1 {FONT_SANS}", "--hm-font-guide-title": f"700 16px/24px {FONT_SANS}",
    "--hm-guide-title-gap": "20px 0 8px", "--hm-faq-mt": "48px",   # 136 → 48(요청 Y2)
    # 3D를 쓸 수 없을 때의 SVG 드론 색(모드 공통)
    "--hm-sv-shadow": "#000000", "--hm-sv-arm-under": "#16181B", "--hm-sv-arm-top": "#4A4F56", "--hm-sv-mount": "#1C1E22",
    "--hm-sv-band": "#0D0E10", "--hm-sv-bell": "#1A1C1F", "--hm-sv-shaft": "#C3C8CE", "--hm-sv-ghost": "#3A3E44",
    "--hm-sv-spinner": "#2A2D31", "--hm-sv-spinner-line": "#8A9098", "--hm-sv-hull-line": "rgba(255,255,255,0.12)",
    "--hm-sv-panel": "rgba(0,0,0,0.35)", "--hm-sv-vent": "rgba(0,0,0,0.45)", "--hm-sv-spec": "#FFFFFF",
    "--hm-sv-edge": "rgba(255,255,255,0.22)", "--hm-sv-sensor": "#050608", "--hm-sv-sensor-line": "#3B4047",
    "--hm-sv-gimbal": "#1E2024", "--hm-sv-lens": "#0B0C0E", "--hm-sv-lens-line": "#6D737B",
    # 그림자 (DESIGN §7 tooltip, §6.1 light level 3)
    "--shadow-tip": "0 4px 12px rgba(0,0,0,0.4)",
}
# 글꼴 크기 배율 (요청 E1): 본문 전체 1.2배. 사이드바·카드는 원래 크기(TYPE 그대로), 카드 제목만 1.2배.
FONT_SCALE = 1.2
SIDEBAR_ONLY = ("nav", "brand")          # 사이드바 전용 역할은 배율 없음
UNSCALED_SCOPES = ('section[data-testid="stSidebar"]', '[class*="st-key-card-"]')   # 원래 크기로 되돌리는 범위
SCALED_IN_CARDS = ("card-title",)


def _scaled(value: str, role: str) -> str:
    if role in SIDEBAR_ONLY:
        return value
    return f"{round(float(value.removesuffix('px')) * FONT_SCALE)}px"


def _type_vars(scaled: bool) -> dict[str, str]:
    out = {}
    for role, (size, lh, weight, ls) in TYPE.items():
        if scaled:
            size, lh = _scaled(size, role), _scaled(lh, role)
        out[f"--font-{role}"] = f"{weight} {size}/{lh} {FONT_SANS}"
        out[f"--type-{role}-size"], out[f"--type-{role}-lh"] = size, lh
        out[f"--type-{role}-weight"], out[f"--type-{role}-ls"] = str(weight), ls
    return out


BASE |= _type_vars(scaled=True) | {"--native-text": f"calc(0.875rem * {FONT_SCALE})"}   # Streamlit 기본 위젯 글자(0.875rem)
UNSCALED = {k: v for k, v in _type_vars(scaled=False).items()
            if not any(k.startswith((f"--font-{r}", f"--type-{r}-")) for r in SCALED_IN_CARDS)} | {"--native-text": "0.875rem"}

# DESIGN §4.1 다크(기본) · §4.2 라이트(스크린샷 추출) · §4.3 차트
MODE = {
    "dark": {
        "--bg": "#121212", "--sidebar-bg": "#181818", "--surface": "#181818", "--surface-2": "#282828",
        "--surface-3": "#333333", "--border": "#282828", "--text": "#FFFFFF", "--text-2": "#A7A7A7",
        "--text-3": "#B3B3B3", "--control": "#535353", "--outline": "#727272", "--primary": "#1DB954",
        "--primary-hover": "#1ED760", "--on-primary": "#000000", "--accent-soft": "rgba(29,185,84,0.16)",
        "--select-bg": "#FFFFFF", "--select-fg": "#000000", "--warning": "#F59B23", "--error": "#E22134",
        "--shadow-dialog": "none",
        "--chart-primary": "#1DB954", "--chart-highlight": "#53E076", "--chart-dim": "#2C5636",
        "--chart-track": "#282828", "--chart-grid": "rgba(255,255,255,0.06)", "--chart-axis": "#A7A7A7",
        "--chart-muted": "#535353", "--tip-bg": "#282828", "--tip-fg": "#FFFFFF",
        "--grad-start": "#15A448", "--grad-end": "#1ED760", "--grad-hover-start": "#1DB954", "--grad-hover-end": "#3BE477",
        "--chart-grad-start": "#15A448", "--chart-grad-end": "#1ED760",
        "--defense-soft": "rgba(226,33,52,0.16)", "--picked-shadow": "rgba(29,185,84,0.35)", "--holo-core": "rgba(29,185,84,0.10)", "--note-bg": "rgba(61,157,243,0.20)", "--note-fg": "#C7EBFF", "--note-hover": "rgba(61,157,243,0.25)", "--net-core": "#5CF294", "--net-major": "#2ECC6B", "--net-middle": "#22A556", "--net-job": "#53E076", "--holo-scan": "rgba(29,185,84,0.06)",   # 선택 카드 그림자(요청 L4)
        # 홈 3D Hero 무대·공역 배경(야간, 요청 P1, Proposed) — 공역 색은 canvas용 'r,g,b'
        "--hm-stage-bg": "radial-gradient(130% 85% at 50% 100%,rgba(24,42,58,.5),transparent 62%),linear-gradient(180deg,#13161B 0%,#171A1F 48%,#16191D 100%)",
        "--hm-dim": "#000000", "--hm-dim-open": "0.045", "--hm-motor-cw": "#FF4A3D", "--hm-motor-ccw": "#2FE07C", "--hm-env": "0.6",
        "--hm-air-mode": "night", "--hm-air-mesh": "128,146,166", "--hm-air-grid": "128,146,166", "--hm-air-low-a": "84,190,188",
        "--hm-air-low-b": "96,184,132", "--hm-air-high-a": "212,104,84", "--hm-air-high-b": "200,74,72", "--hm-air-limit": "206,110,88",
        "--hm-air-scan": "150,190,204", "--hm-air-txt-lo": "112,198,164", "--hm-air-txt-hi": "224,122,108", "--hm-air-plate": "0,0,0",
        "--hm-air-plate-a": "0", "--hm-air-fill": "0.018", "--hm-air-wash": "0.022", "--hm-air-k": "1.16", "--hm-air-grid-k": "1",
        "--hm-air-lw": "500", "--hm-air-blend": "lighter", "--hm-air-ridge": "92,116,140", "--hm-air-ridge-fill": "0.035",
        "--hm-air-ridge-line": "1", "--hm-air-haze": "16,22,30", "--hm-air-haze-a": "0.35", "--hm-air-star": "200,214,232",
        "--hm-air-star-a": "1", "--hm-air-ground": "168,200,186", "--hm-air-ground-b": "132,186,152", "--hm-air-ground-a": "0",
        "--hm-air-ground-pts": "1", "--hm-air-water": "70,150,180", "--hm-air-water-a": "0.05", "--hm-air-glint": "140,214,228",
        "--hm-air-reflect": "0.07", "--hm-air-shimmer": "0.14", "--hm-air-fog": "1.15", "--hm-air-ceil": "0.028",
    },
    "light": {
        "--bg": "#F9F6F5", "--sidebar-bg": "#F3F0EF", "--surface": "#FFFFFF", "--surface-2": "#F3F4F5",
        "--surface-3": "#FFFFFF", "--border": "#E5E2E1", "--text": "#121212", "--text-2": "#6B6B6B",
        "--text-3": "#3A3A3A", "--control": "#D1D1D1", "--outline": "#C0C0BE", "--primary": "#0A873A",
        "--primary-hover": "#0B7A35", "--on-primary": "#FFFFFF", "--accent-soft": "#E0EDE2",
        "--select-bg": "#121212", "--select-fg": "#FFFFFF", "--warning": "#F59B23", "--error": "#E22134",
        "--shadow-dialog": "0 4px 12px rgba(0,0,0,0.12)",
        "--chart-primary": "#0A873A", "--chart-highlight": "#0A873A", "--chart-dim": "#C2DAC9",
        "--chart-track": "#F3F0EF", "--chart-grid": "#EFEBEA", "--chart-axis": "#6B6B6B",
        "--chart-muted": "#D1D1D1", "--tip-bg": "#282828", "--tip-fg": "#FFFFFF",
        "--grad-start": "#04762F", "--grad-end": "#0A873A", "--grad-hover-start": "#036A2A", "--grad-hover-end": "#0B7A35",
        "--chart-grad-start": "#04762F", "--chart-grad-end": "#1AB050",
        "--defense-soft": "#FFE5E5", "--picked-shadow": "rgba(10,135,58,0.30)", "--holo-core": "rgba(10,135,58,0.07)", "--note-bg": "rgba(28,131,225,0.10)", "--note-fg": "#004280", "--note-hover": "rgba(28,131,225,0.12)", "--net-core": "#0B9A43", "--net-major": "#2BAE5C", "--net-middle": "#63C486", "--net-job": "#0A873A", "--holo-scan": "rgba(10,135,58,0.04)",   # 선택 카드 그림자(요청 L4)
        # 홈 3D Hero 무대·공역 배경(주간: 다크 반전이 아닌 별도 설계, 요청 P1, Proposed)
        "--hm-stage-bg": "radial-gradient(46% 58% at 50% 55%,rgba(222,230,234,.5),rgba(222,230,234,0) 70%),linear-gradient(180deg,#EDF2F5 0%,#F5F8F9 42%,#F7F9FA 100%)",
        "--hm-dim": "#000000", "--hm-dim-open": "0.025", "--hm-motor-cw": "#FFF8EE", "--hm-motor-ccw": "#FFF8EE", "--hm-env": "0.82",
        "--hm-air-mode": "day", "--hm-air-mesh": "114,141,150", "--hm-air-grid": "150,164,171", "--hm-air-low-a": "44,146,140",
        "--hm-air-low-b": "46,140,108", "--hm-air-high-a": "212,104,92", "--hm-air-high-b": "190,80,76", "--hm-air-limit": "176,72,66",
        "--hm-air-scan": "104,150,160", "--hm-air-txt-lo": "36,112,92", "--hm-air-txt-hi": "172,68,64", "--hm-air-plate": "248,250,251",
        "--hm-air-plate-a": "0.55", "--hm-air-fill": "0.07", "--hm-air-wash": "0.07", "--hm-air-k": "1.42", "--hm-air-grid-k": "0",
        "--hm-air-lw": "500", "--hm-air-blend": "source-over", "--hm-air-ridge": "116,140,162", "--hm-air-ridge-fill": "0.22",
        "--hm-air-ridge-line": "1.9", "--hm-air-haze": "247,249,251", "--hm-air-haze-a": "0.7", "--hm-air-star": "200,214,232",
        "--hm-air-star-a": "0", "--hm-air-ground": "176,206,190", "--hm-air-ground-b": "128,184,150", "--hm-air-ground-a": "0.26",
        "--hm-air-ground-pts": "0.45", "--hm-air-water": "98,148,184", "--hm-air-water-a": "0.2", "--hm-air-glint": "76,128,162",
        "--hm-air-reflect": "0.26", "--hm-air-shimmer": "0.08", "--hm-air-fog": "1.4", "--hm-air-ceil": "0.035",
    },
}

# 차트 치수 (DESIGN §8, §11.3)
CHART = {"row_h": 42, "bar_w": 22, "row_h_thin": 30,   # row_h_thin: 얇은 가로 막대 줄 높이(요청 Y3, Proposed)
         "dim": 0.35, "glow": 12, "pad": 8, "pad_sm": 4, "value_gutter": 64,
         "label_w": 160, "heat_row_h": 28, "heat_extra": 48, "treemap_h": 320,
         "cell_radius": 4, "tree_alpha": (0.22, 0.62), "tile_radius": 6, "map_h": 460, "map_aspect": 0.85,
         # 직무 네트워크 (요청 F3): 노드 크기, 선택 시 확대/축소 배율, 흐림, 확대 비율, 높이
         "net_root": 46, "net_major": 30, "net_middle": 18, "net_job": 7, "net_focus_scale": 1.4, "net_dim_scale": 0.55,
         "net_dim_opacity": 0.18, "net_edge_on": 0.55, "net_zoom_major": 1.7, "net_zoom_middle": 2.6, "net_edge_ring": 0.96, "net_aspect": 1.35, "net_fan_deg": 170, "net_h": 420, "net_h_max": 720, "bar_max_w": 32, "bar_radius": 4, "spark_h": 72, "stroke": 2,
         "marker": 6, "tip_pad": [8, 12], "tip_radius": 4, "tip_font": 12,
         "overlap_shift": 0.3}   # 겹친 막대: 빨강(그중 방산)을 초록 아래로 막대 굵기의 30%만큼 내려 겹침이 보이게(요청 AB6, Proposed)

# 모니터 크기 맞춤(요청 AE3): 기준 폭보다 넓은 화면은 앱 전체를 비율대로 키워 어느 모니터든 같은 배치(2020 이하 = 그대로, 학원 1920 포함)
ZOOM = {"base": 2020, "max": 1.5}   # 2560 화면 = 1.27배(브라우저 80%~100% 사이, 요청 AF3)

MOTION = {"chart_enter_ms": 500, "chart_update_ms": 300, "easing": "cubicOut", "countup_ms": 900,
          "line_draw_ms": 1400,   # 선 그래프 왼쪽→오른쪽 그리기(요청 I2)
          "net_grow_ms": 3500}    # 02 3D 네트워크 첫 등장: 핵에서 가지가 자라남(Proposed)

BASE_CSS = ROOT / "static" / "css" / "base.css"


def mode() -> str:
    return "light" if st.context.theme.type == "light" else "dark"   # 다크 우선 (DESIGN §1)


def tokens(m: str | None = None) -> dict[str, str]:
    return BASE | MODE[m or mode()]


def color(name: str, m: str | None = None) -> str:
    """이름으로 실제 값 조회(차트·iframe용). 예: color("chart-primary")."""
    return tokens(m)[f"--{name}"]


def px(role: str) -> int:
    """본문(배율 적용) 글자 크기 px — 차트·표 등 본문 요소용."""
    return int(_scaled(TYPE[role][0], role).removesuffix("px"))


@functools.cache
def _image_vars() -> dict[str, str]:
    """사이드바 홈·01~04 아이콘(make_home_icon.py·make_nav_icons.py)·카드 버튼 별·책갈피(make_card_icons.py, 요청 L)를 CSS 변수(data URI)로."""
    img = ROOT / "static" / "img"
    home = {f"--home-icon-{n}": f"url(data:image/webp;base64,{base64.b64encode((img / f'home_{n}.webp').read_bytes()).decode()})"
            for n in ("rest", "hover")}
    nav = {f"--nav-icon-{k}-{s}": img_uri(f"nav_{k}_{s}") for k in ("industry", "jobs", "learning", "recruit")
           for s in ("rest", "hover")}   # 사이드바 01~04 아이콘(make_nav_icons.py, 요청 P7)
    drone = {"--rm-drone-img": f"url(data:image/png;base64,{base64.b64encode((img / 'rm_drone.png').read_bytes()).decode()})",   # 로드맵 드론(요청 AB3, 그림은 사용자 제공 AC1)
             "--note-icon": f"url(data:image/png;base64,{base64.b64encode((img / 'note_icon.png').read_bytes()).decode()})"}   # 파란 안내 느낌표(요청 AE1, 사용자 제공)
    return home | nav | drone | {f"--card-{i}-{s}": img_uri(f"card_{i}_{s}") for i in ("star", "bookmark")
                                 for s in ("rest", "hover", "on", "off")}


@functools.cache
def img_uri(name: str) -> str:
    """static/img/<name>.webp 를 CSS url(data URI)로 — 쓰는 화면에서만 넘긴다(01 KPI 아이콘, 요청 I1)."""
    return f"url(data:image/webp;base64,{base64.b64encode((ROOT / 'static' / 'img' / f'{name}.webp').read_bytes()).decode()})"


def inject_css() -> None:
    """토큰(:root 변수)과 static/css/base.css 를 매 실행 첫머리에 주입."""
    t = tokens()
    logo_var = {"--logo-img": logo.uri(t["--text"], t["--primary"])}   # 서비스 로고(요청 AH): 테마 글자색 + 초록
    root = ";".join(f"{k}:{v}" for k, v in (t | _image_vars() | logo_var).items())
    unscaled = ";".join(f"{k}:{v}" for k, v in UNSCALED.items())
    st.html(f"<style>:root{{{root}}}\n{','.join(UNSCALED_SCOPES)}{{{unscaled}}}\n"
            f"{Path(BASE_CSS).read_text(encoding='utf-8')}</style>")
