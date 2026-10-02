"""브라우저 저장 복원 규칙 (plan.md 7.2, DESIGN §11.1)."""
import json

import pytest
import streamlit as st

from core import persistence, state


@pytest.fixture(autouse=True)
def fresh():
    for k in list(st.session_state.keys()):
        del st.session_state[k]
    state.init()


def test_roundtrip_restores_selection_and_ui():
    state.select_goal("DJ-001", "직무1")
    st.session_state["ui"]["motion"] = False
    st.session_state["ui"]["highlight_defense"] = True
    raw = persistence.snapshot()
    for k in list(st.session_state.keys()):
        del st.session_state[k]
    state.init()
    persistence.restore(raw)
    assert st.session_state["plan"]["goal_job_id"] == "DJ-001"
    assert st.session_state["ui"]["motion"] is False
    assert st.session_state["ui"]["highlight_defense"] is False          # 방산 강조는 저장하지 않음(요청 M11)
    assert "scrap" in json.loads(raw) and "page" not in json.loads(raw)   # 페이지 필터·팝업은 저장하지 않음


def test_old_saved_defense_highlight_is_ignored():
    """예전에 저장된 방산 강조 값이 있어도 꺼진 상태로 시작(요청 M11)."""
    persistence.restore(json.dumps({"ui": {"highlight_defense": True, "motion": True}}))
    assert st.session_state["ui"]["highlight_defense"] is False


def test_restore_runs_once_and_ignores_bad_data():
    persistence.restore("{not json")
    assert persistence.is_restored() and st.session_state["plan"]["goal_job_id"] is None
    persistence.restore(json.dumps({"plan": {"goal_job_id": "X"}}))
    assert st.session_state["plan"]["goal_job_id"] is None                # 이미 복원됨 → 다시 덮지 않음


def test_wrong_types_are_ignored():
    persistence.restore(json.dumps({"plan": "oops", "scrap": {"company:C1": {"entity_type": "company",
                                                                         "entity_id": "C1", "saved_at": "x"}}}))
    assert isinstance(st.session_state["plan"], dict)
    assert state.scrapped("company")[0]["entity_id"] == "C1"


def test_storage_unavailable_flag():
    persistence.restore(persistence.UNAVAILABLE)
    assert st.session_state["_storage_unavailable"] is True
