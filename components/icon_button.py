"""카드·상세 팝업의 별·책갈피 그림 단추 (요청 L2·L3, 2026-10-01)."""
import streamlit as st


def icon_button(icon: str, on: bool, label: str, key: str, **kwargs) -> bool:
    """별·책갈피 그림 단추(요청 L2·L3): 초록 그라데이션, 빈 모양 → 마우스를 올리면 채워짐. 선택됨은 채운 모양.
    그림은 base.css 가 컨테이너 키(cbtn-<그림>[-on]-...)를 보고 붙인다."""
    with st.container(key=f"cbtn-{icon}{'-on' if on else ''}-{key.replace(':', '-')}", width="content"):
        return st.button(label, key=key, type="primary", **kwargs)
