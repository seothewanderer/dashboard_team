"""파란 안내(요청 AE1): 사용법·상태·빈 결과·해석 주의처럼 사용자에게 설명하는 문장을 한 모양으로.
긴 안내 = 연한 파랑 상자 + 느낌표, 짧은 한 줄 = 파란 글자 + 작은 느낌표(사용자 결정). 색은 --note-bg·--note-fg(테마별)."""
from html import escape

import streamlit as st


def note_html(text: str, *, box: bool = False, raw: bool = False, small: bool = False) -> str:
    """raw=True면 text를 이미 안전한 HTML로 본다(굵게 등). small = 상자 글꼴을 캡션 크기로(요청 AH)."""
    return f'<p class="note{" note--box" if box else ""}{" note--sm" if small else ""}">{text if raw else escape(text)}</p>'


def note(text: str, *, box: bool = False, raw: bool = False, small: bool = False, width="stretch") -> None:
    st.html(note_html(text, box=box, raw=raw, small=small), width=width)
