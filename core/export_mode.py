"""정적 HTML 공유본 캡처용 모드 (plan.md 9.8). URL에 ?export=1 이 있으면 켜진다.

- 개인 선택(브라우저 저장)을 복원하지 않고 기본 상태로 그린다.
- '근거 자세히'의 숫자 표를 정적 HTML 표(st.table)로 그린다(AgGrid iframe은 캡처되지 않음).
- 테마 토글처럼 서버·새로고침이 필요한 조작은 숨긴다.
"""
import streamlit as st

PARAM = "export"


def on() -> bool:
    return st.query_params.get(PARAM) == "1"
