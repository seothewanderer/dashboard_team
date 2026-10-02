"""진입점 (plan.md 5.1): 페이지 설정 → 테마 → 상태 → 공통 셸 → 현재 화면 실행."""
import streamlit as st

from components import dialogs, shell
from components.browser import bridge
from core import data_loader, export_mode, persistence, routing, state, theme

st.set_page_config(page_title="드론 진로 탐색", layout="wide", initial_sidebar_state="auto")
theme.inject_css()
state.init()
routing.sync_sub()  # 사이드바와 04 탭이 같은 실행에서 같은 하위 페이지를 보도록 가장 먼저

pages = routing.pages()
current = st.navigation(list(pages.values()), position="hidden")

# 사이드바 자리: 위 메뉴 / 아래 안내 + 테마 토글(토글·브라우저 저장 컴포넌트는 실행 끝에서 그린다)
nav_slot, bottom_slot = st.sidebar.container(), st.sidebar.container(key="sidebar-bottom")
ctx_slot = bottom_slot.container()

key = routing.current_key(current)
sub = routing.active_sub() if key == "recruit" else None
if key != "recruit":
    routing.clear_sub_from_url()   # 04 전용 ?sub= 가 다른 페이지 주소에 남지 않게
shell.render_nav(pages, key, nav_slot)
shell.render_context_card(f"recruit.{sub}" if sub else key, ctx_slot)
shell.render_topbar(f"{current.title} · {routing.RECRUIT_SUBS[sub]}" if sub else current.title)

status = data_loader.build_status()
if status:
    st.warning(status)

with shell.frame():
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
