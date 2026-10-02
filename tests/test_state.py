"""사용자 상태 규칙 (plan.md 7.1, 요청 D4·E5)."""
import pytest
import streamlit as st

from core import state


@pytest.fixture(autouse=True)
def fresh():
    for k in list(st.session_state.keys()):
        del st.session_state[k]
    state.init()


def test_goal_change_keeps_scraps():
    state.select_goal("DJ-001", "직무1")
    state.scrap("course", "C1", "과정1")
    state.scrap("posting", "P1", "공고1")
    state.select_goal("DJ-002", "직무2")
    assert st.session_state["plan"]["goal_job_id"] == "DJ-002"
    assert state.is_scrapped("course", "C1") and state.is_scrapped("posting", "P1")
    state.select_goal(None)
    assert st.session_state["plan"]["goal_job_id"] is None


def test_scrap_limit_three_per_kind_blocks_fourth():
    for i in range(1, 4):
        assert state.scrap("course", f"C{i}", f"과정{i}")
    assert not state.scrap("course", "C4", "과정4")                 # 막고 안내(교체하지 않음)
    assert [v["entity_id"] for v in state.scrapped("course")] == ["C1", "C2", "C3"]
    assert state.scrap("posting", "P1", "공고1")                     # 다른 종류는 따로 셈
    state.unscrap("course", "C2")
    assert state.scrap("course", "C4", "과정4")
    assert [v["entity_id"] for v in state.scrapped("course")] == ["C1", "C3", "C4"]


def test_scrap_is_not_duplicated_and_toggle_removes():
    state.scrap("company", "CMP0001", "A")
    state.scrap("company", "CMP0001", "A")
    assert len(st.session_state["scrap"]) == 1
    state.toggle_scrap("company", "CMP0001", "A")
    assert not state.is_scrapped("company", "CMP0001")
