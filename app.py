"""진입점 (plan.md 5.1): 페이지 설정 → 테마 → 상태 → 공통 셸 → 현재 화면 실행."""
import time

import streamlit as st

from components import dialogs, page_loader, shell
from components.browser import bridge, fit_zoom
from core import data_loader, export_mode, persistence, routing, state, theme

st.set_page_config(page_title="드론 진로 탐색", layout="wide", initial_sidebar_state="auto")
theme.inject_css()
if not export_mode.on():   # 모니터 크기 맞춤(요청 AE3): 맨 앞에서 그려 첫 화면부터 비율 확대
    with st.sidebar:
        fit_zoom(theme.ZOOM["base"], theme.ZOOM["max"])
state.init()
if not export_mode.on():   # 페이지 이동 로딩 화면(요청 AW): 본문이 비는 사이 로고 + "○○로 이동 중"
    page_loader.render(st.session_state["ui"]["motion"])
routing.sync_sub()  # 사이드바와 04 탭이 같은 실행에서 같은 하위 페이지를 보도록 가장 먼저

pages = routing.pages()
current = st.navigation(list(pages.values()), position="hidden")

# 사이드바 자리: 위 메뉴 / 아래 안내 + 테마 토글(토글·브라우저 저장 컴포넌트는 실행 끝에서 그린다)
nav_slot, bottom_slot = st.sidebar.container(), st.sidebar.container(key="sidebar-bottom")
ctx_slot = bottom_slot.container()

key = routing.current_key(current)
if st.session_state.get("page_key") != key:   # 페이지에 새로 들어옴 → 02 네트워크 첫 등장 효과를 다시 재생
    st.session_state.update(page_key=key, page_entry=time.time_ns())
sub = routing.active_sub() if key == "recruit" else None
if key != "recruit":
    routing.clear_sub_from_url()   # 04 전용 ?sub= 가 다른 페이지 주소에 남지 않게
shell.render_nav(pages, key, nav_slot)
shell.render_context_card(f"recruit.{sub}" if sub else key, ctx_slot)
status = data_loader.build_status()
if status:
    st.warning(status)

# 홈은 제목 줄 없이 탐색 경로 단추만(요청 Y1·AA4). 다른 화면은 제목 줄 + 단추. 상단 줄은 frame 안에서 그림
with shell.frame(None if key == "home" else f"{current.title} · {routing.RECRUIT_SUBS[sub]}" if sub else current.title,
                 f"recruit.{sub}" if sub else key):
    current.run()
dialogs.render_open()  # 열린 상세 팝업 유지(한 번에 하나)

if export_mode.on():   # 정적 공유본 캡처: 개인 선택 복원·테마 토글 없이 기본 상태
    st.stop()
with bottom_slot:  # 실행 끝에서 그려 이번 실행의 최신 선택까지 저장한다
    result = bridge(theme.mode(), ["/"] + [f"/{p.url_path}" for p in pages.values()],
                    persistence.snapshot() if persistence.is_restored() else None, persistence.is_restored())
if not persistence.is_restored() and result.stored is not None:
    persistence.restore(result.stored)   # 세션당 한 번: 복원 후 한 번만 다시 그림
    st.rerun()
