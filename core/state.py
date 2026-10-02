"""session_state 스키마와 변경 함수 (plan.md 7.1, research 9.1·9.7).

화면은 dict를 직접 고치지 않고 아래 함수만 쓴다. 규칙:
- 나의 탐색 경로 = 목표 직무 1개 + 교육·공고·기업 스크랩 종류별 최대 3개(요청 E5).
  3개가 찬 종류는 새로 스크랩하지 않고 안내만 한다(사용자 결정). 직무는 목표 1개(이후 직무 기준 필터링용).
- 목표 직무를 바꿔도 스크랩은 그대로 둔다(요청 D4 충돌 ⑤).
- '학습 계획에 선택'·'비교 공고로 선택'(plan.learning·compare_posting_id)은 삭제(요청 E2, 충돌 2).
04 하위 페이지 선택은 위젯 키 "sub"가 담당하므로 page["recruit"]를 두지 않는다.
브라우저 저장(persistence)·되돌리기·다음 행동은 P5.
"""
import copy
from datetime import datetime

import streamlit as st

DEFAULTS = {
    "profile": {"purpose": None, "interest_areas": [], "education": None, "career_type": None,
                "career_years": None, "regions": [], "allow_remote": True},
    "plan": {"goal_job_id": None},
    "scrap": {},
    "undo": None,
    "page": {"industry": {}, "jobs": {}, "learning": {}, "postings": {"page_no": 0},
             "companies": {"area": [], "keywords": [], "page_no": 0, "sort": "auto"}},
    "handoff": None,
    "context": {"module_id": None, "pinned": False},
    "ui": {"highlight_defense": False, "highlight_goal": False, "roadmap_open": True, "home_menu_open": False, "motion": True,
           "nav_open": {"recruit": False}},
    "dialog": {"kind": None, "id": None, "return_to": None},
}
SCRAP_KINDS = {"course": "학습 내용", "posting": "채용 공고", "company": "관심 기업"}   # 탐색 경로 칸
SCRAP_LIMIT = 3


def init() -> None:
    for key, value in DEFAULTS.items():
        if key not in st.session_state:
            st.session_state[key] = copy.deepcopy(value)


def _s():
    return st.session_state


# ---- 스크랩 ----
def scrap_key(entity_type: str, entity_id: str) -> str:
    return f"{entity_type}:{entity_id}"


def is_scrapped(entity_type: str, entity_id: str) -> bool:
    return scrap_key(entity_type, entity_id) in _s()["scrap"]


def scrapped(entity_type: str) -> list[dict]:
    """탐색 경로 칸에 보일 스크랩(오래된 것부터)."""
    items = [v for v in _s()["scrap"].values() if v["entity_type"] == entity_type]
    return sorted(items, key=lambda v: v["saved_at"])


def scrap(entity_type: str, entity_id: str, title: str, source_ref: str = "") -> bool:
    """스크랩. 같은 종류가 이미 SCRAP_LIMIT개면 저장하지 않고 False."""
    box = _s()["scrap"]
    key = scrap_key(entity_type, entity_id)
    if key in box:
        return True
    if entity_type in SCRAP_KINDS and len(scrapped(entity_type)) >= SCRAP_LIMIT:
        return False
    box[key] = {"entity_type": entity_type, "entity_id": entity_id,
                "saved_at": datetime.now().isoformat(timespec="microseconds"),
                "saved_title": title, "source_ref": source_ref}
    return True


def unscrap(entity_type: str, entity_id: str) -> None:
    _s()["scrap"].pop(scrap_key(entity_type, entity_id), None)


def toggle_scrap(entity_type: str, entity_id: str, title: str, source_ref: str = "") -> None:
    if is_scrapped(entity_type, entity_id):
        unscrap(entity_type, entity_id)
    elif not scrap(entity_type, entity_id, title, source_ref):
        st.toast(f"{SCRAP_KINDS[entity_type]} 스크랩은 {SCRAP_LIMIT}개까지입니다. "
                 "오른쪽 '나의 탐색 경로'에서 하나를 해제한 뒤 스크랩하세요.", icon=":material/info:")


# ---- 목표 직무 ----
def select_goal(job_id: str | None, title: str = "") -> None:
    _s()["plan"]["goal_job_id"] = job_id
