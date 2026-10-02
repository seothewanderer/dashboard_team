"""검색 상자 (요청 O2, 2026-10-02): 네이버 검색창처럼 입력하면 관련 항목이 목록으로 뜨고, 펼치면 전체 목록을 볼 수 있다.
목록에 없는 말도 그대로 검색어로 쓸 수 있다(accept_new_options). 값 = 고른(또는 입력한) 글자, 없으면 ""."""
import streamlit as st


def search_box(label: str, options: list[str], *, key: str, placeholder: str, on_change=None, width="stretch") -> str:
    st.selectbox(label, sorted(set(o for o in options if isinstance(o, str) and o.strip()), key=str.casefold),
                 index=None, key=key, placeholder=placeholder, accept_new_options=True, on_change=on_change, width=width)
    return st.session_state.get(key) or ""
