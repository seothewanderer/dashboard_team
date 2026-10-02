"""분석 화면 상단 소개: 작은 표시 → 질문형 제목 → 짧은 설명 (research 3.9, V21)."""
from html import escape

import streamlit as st

from content.page_intros import EYEBROW_SUFFIX, PAGE_INTROS


def page_intro(key: str) -> None:
    eyebrow, title, body = PAGE_INTROS[key]
    st.html(f'<section class="page-intro">'
            f'<p class="page-intro__eyebrow">{escape(eyebrow)} · {EYEBROW_SUFFIX}</p>'
            f'<h1 class="page-intro__title">{escape(title)}</h1>'
            f'<p class="page-intro__body">{escape(body)}</p></section>')
