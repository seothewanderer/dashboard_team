"""홈 요약 카드 + 3D 드론 Hero (요청 P1·P2, 2026-10-02). 팀원 Home(home-only.html)을 Streamlit components.v2로 옮김.

- 요약 카드 4개(숫자 올라가기) → 드론 무대(공역 배경 · 3D 드론 · 5개 패널 · 움직임 멈추기).
- 드론을 누르면 물러나며 패널이 펼쳐지고, 패널에 마우스를 올리면 드론이 그쪽을 바라본다.
- 패널을 누르면 그 방향으로 날아간 뒤 그 화면으로 이동(go 트리거). 홈에 다시 오면 같은 방향에서 돌아온다(entry).
- 3D는 static/vendor/three(Three.js 0.169.0)를 쓰고, 불러오지 못하면 SVG 드론으로 같은 동작.
- 색·크기는 core/theme.py 토큰(--hm-*). 움직임 멈춤·동작 줄이기 설정을 따른다.
JS·CSS는 길어서 같은 이름의 .js·.css 파일에 둔다.
"""
from pathlib import Path

import streamlit as st

from core import export_mode, theme

_DIR = Path(__file__).parent
_comp = st.components.v2.component("home_hero", css=(_DIR / "home_hero.css").read_text(encoding="utf-8"),
                                   js=(_DIR / "home_hero.js").read_text(encoding="utf-8"))


def home_hero(entries: list[dict], kpis: list[dict], *, entry: dict | None, key: str = "home_hero"):
    """entries: {key, label, desc, icon(static/img 이름)} 5개(패널 순서). kpis: {label, value, unit, sub, key(이동할 곳), icon(kpi_ 이름)}.
    entry: {visit, kind: "first"|"return", panel: 패널 번호 또는 None} — visit이 바뀔 때 한 번 비행.
    반환값의 go = 누른 패널의 key, kpi = 누른 요약 카드의 key(트리거), open·motion = 현재 상태."""
    ui = st.session_state["ui"]
    motion = ui["motion"] and not export_mode.on()
    entries = [e | {"icon": theme.img_uri(e["icon"])} for e in entries]   # 패널 아이콘 → data URI(요청 Q2)
    kpis = [k | {"icon": {s: theme.img_uri(f"kpi_{k['icon']}_{s}") for s in ("rest", "hover")}} for k in kpis]   # 요청 R2
    return _comp(data={"entries": entries, "kpis": kpis, "open": ui["home_menu_open"], "motion": motion, "entry": entry,
                       "vendor": "/app/static/vendor/three/", "countup_ms": theme.MOTION["countup_ms"]},
                 key=key, default={"open": ui["home_menu_open"], "motion": ui["motion"]},
                 on_open_change=lambda: None, on_motion_change=lambda: None, on_go_change=lambda: None,
                 on_kpi_change=lambda: None)
