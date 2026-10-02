"""상위 페이지 '04 채용·기업 탐색' (plan.md 9.5): 소개 → 하위 탭 → 활성 하위 페이지만 렌더."""
import streamlit as st

from components.page_intro import page_intro
from core import routing
from views.recruit import companies, postings

RENDER = {"postings": postings.render, "companies": companies.render}

sub = routing.active_sub()
page_intro(f"recruit.{sub}")
# 사이드바 하위 메뉴와 같은 키(SUB_KEY). st.tabs는 두 탭을 모두 실행하고 활성 탭을 알 수 없어 쓰지 않음(plan 9.5.2)
with st.container(key="subtabs"):
    sub = st.segmented_control("하위 페이지", list(routing.RECRUIT_SUBS), key=routing.SUB_KEY,
                               format_func=routing.RECRUIT_SUBS.get, required=True,
                               persist_state="session", label_visibility="collapsed")
routing.write_sub_to_url()
RENDER[sub]()
