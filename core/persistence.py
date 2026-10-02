"""브라우저 저장 ↔ session_state (plan.md 7.2).

저장 대상: profile, plan, scrap, ui(방산 강조·움직임·탐색 경로 열림·홈 메뉴). 페이지 필터·팝업은 세션 한정.
스키마 버전은 components/browser.STORE_KEY("-v1")로 관리한다.
"""
import json

import streamlit as st

SAVED = ("profile", "plan", "scrap")
# nav_open(04 하위 메뉴 펼침)은 저장하지 않는다: 04에 들어올 때 펼치는 규칙(요청 F7)을 복원값이 덮어쓰지 않게
# 방산 강조는 저장하지 않음: 앱을 열 때마다 꺼진 상태(02 = 전체 보기)로 시작(요청 M11, 사용자 결정)
SAVED_UI = ("motion", "roadmap_open", "home_menu_open")
RESTORED = "_restored"
UNAVAILABLE = "__unavailable__"


def snapshot() -> str:
    s = st.session_state
    data = {k: s[k] for k in SAVED} | {"ui": {k: s["ui"][k] for k in SAVED_UI}}
    return json.dumps(data, ensure_ascii=False, sort_keys=True)


def restore(raw: str | None) -> None:
    """컴포넌트가 보낸 저장값으로 한 번만 복원. 형식이 맞지 않으면 무시(기본값 유지)."""
    if raw is None or st.session_state.get(RESTORED):
        return
    st.session_state[RESTORED] = True
    st.session_state["_storage_unavailable"] = raw == UNAVAILABLE
    if not raw or raw == UNAVAILABLE:
        return
    try:
        data = json.loads(raw)
    except json.JSONDecodeError:
        return
    for key in SAVED:
        if isinstance(data.get(key), type(st.session_state[key])):
            st.session_state[key] = data[key]
    for key in SAVED_UI:
        if key in data.get("ui", {}):
            st.session_state["ui"][key] = data["ui"][key]


def is_restored() -> bool:
    return bool(st.session_state.get(RESTORED))
