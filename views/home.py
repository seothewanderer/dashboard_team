"""홈 (plan.md 9.1, research 4.3, 요청 P1~P4): M01 제목 → 요약 카드 4개 + 3D 드론 진입 → M04 이용 안내(로드맵) → 자주 묻는 질문."""
from html import escape

import streamlit as st

from analytics.overview import overview
from components.home_hero import home_hero
from content.module_meta import POSTINGS_AS_OF
from content.page_intros import HOME_SUBTITLE, HOME_TITLE
from content.usage_guide import FAQ, STEPS, STEPS_NOTE
from core import routing
from core.data_loader import load_table

# M02 (research 4.3): 진입 키, 표시, 한 줄 설명 — 패널 순서 = 드론 둘레 오각형 자리(위·오른쪽·왼쪽·왼쪽 아래·오른쪽 아래)
# 아이콘(요청 Q2): 사이드바 아이콘 첫 프레임 + 기업 탐색은 01 KPI 건물 — 정적 그림('P1~P5' 글자 대신)
ENTRIES = [
    {"key": "industry", "label": "산업 이해", "desc": "활용 분야와 산업 규모 살펴보기", "icon": "nav_industry_rest"},
    {"key": "jobs", "label": "직무 탐색", "desc": "하는 일과 필요한 기술 알아보기", "icon": "nav_jobs_rest"},
    {"key": "learning", "label": "준비 역량", "desc": "배울 기술과 교육 찾아보기", "icon": "nav_learning_rest"},
    {"key": "recruit.postings", "label": "채용 공고", "desc": "직무·지역별 공고 조건 확인하기", "icon": "nav_recruit_rest"},
    {"key": "recruit.companies", "label": "기업 탐색", "desc": "관심 분야의 기업과 사업 알아보기", "icon": "kpi_company_rest"},
]
RETURN_FROM = "_home_return"   # 홈을 떠날 때 누른 패널 번호(돌아올 때 그 방향에서 비행, 요청 P1)


def _go(entry_key: str) -> None:
    page, _, sub = entry_key.partition(".")
    routing.go(page, sub=sub or None)


def _entry() -> dict:
    """이번 방문의 드론 비행: 첫 방문 = 진입(2시 방향), 다른 화면에서 돌아오면 = 마지막에 누른 패널 방향에서 복귀
    (사이드바 등으로 나갔다 오면 2시 방향). 같은 방문 안의 다시 실행에서는 같은 값을 써서 한 번만 날게 한다."""
    s = st.session_state
    if s.get("_nav_prev") != "home" or "_home_entry" not in s:
        visit = s.get("_home_visit", 0) + 1
        s["_home_visit"] = visit
        s["_home_entry"] = {"visit": visit, "kind": "first" if visit == 1 else "return", "panel": s.pop(RETURN_FROM, None)}
    return s["_home_entry"]


# 제목 + 설명 높이에 맞춘 큰 로고를 왼쪽에(요청 AH)
st.html(f'<header class="home-hero"><span class="logo logo--home" aria-hidden="true"></span><div>'
        f'<h1 class="home-hero__title">{escape(HOME_TITLE)}</h1>'
        f'<p class="home-hero__subtitle">{escape(HOME_SUBTITLE)}</p></div></header>')

# ---- M03 요약 카드 + M01·M02 드론 (첫 번째 사진 구성, 요청 P2) ----
ov = overview({n: load_table(n) for n in ["industry_size", "jobs", "job_skills", "courses", "offerings", "postings",
                                          "org"]})
# 요약 카드(요청 R): 누르면 그 페이지로, 아이콘 = static/img/kpi_<icon>(마우스를 올린 동안 반복)
kpis = [
    {"label": "직무 탐색", "value": ov["jobs"]["jobs"], "unit": "개 직무", "key": "jobs", "icon": "job",
     "sub": f"직무 사전 · 직무–기술 관계 {ov['jobs']['relations']:,}개 · 현재 채용 직업 수 아님"},
    {"label": "학습 기회", "value": ov["learning"]["courses"], "unit": "개 과정", "key": "learning", "icon": "learning",
     "sub": f"고용24 훈련과정 · 회차 {ov['learning']['offerings']:,}개 · 모집 상태 미확인"},
    {"label": "수집 공고", "value": ov["recruit"]["postings"], "unit": "건 공고", "key": "recruit.postings", "icon": "posting",
     "sub": f"{POSTINGS_AS_OF} 기준 채용 중이던 공고"},
    {"label": "관련 기업", "value": ov["recruit"]["orgs"], "unit": "개 기업", "key": "recruit.companies", "icon": "company",
     "sub": f"기업·기관 · DART 보강 {ov['recruit']['dart']}개"},
]
hero = home_hero(ENTRIES, kpis, entry=_entry())
st.session_state["ui"]["home_menu_open"] = bool(hero.open)
st.session_state["ui"]["motion"] = bool(hero.motion)
if hero.go:
    st.session_state[RETURN_FROM] = next(i for i, e in enumerate(ENTRIES) if e["key"] == hero.go)
    st.session_state["ui"]["home_menu_open"] = False   # 돌아올 때는 접힌 드론으로 착륙
    _go(hero.go)
if hero.kpi:                                           # 요약 카드: 비행 없이 바로 이동(돌아올 때는 2시 방향)
    _go(hero.kpi)

# ---- M04 이용 안내: 로드맵 4단계 = 화면 01~04 = 나의 탐색 경로 01~04 (요청 P3) ----
st.html('<section class="hm-guide"><h2 class="section-title" id="guide">이렇게 이용해 보세요</h2><ol class="hm-guide__steps">'
        + "".join(f'<li class="hm-guide__step"><span class="hm-guide__no">{escape(no)}</span><p class="hm-guide__title">{escape(title)}</p>'
                  f'<p class="hm-guide__body">{escape(body)}</p></li>' for no, title, body in STEPS)
        + f'</ol><p class="hm-guide__note">{escape(STEPS_NOTE)}</p></section>')

# ---- 자주 묻는 질문 (요청 P4) ----
st.html('<h2 class="section-title hm-faq-title">자주 묻는 질문</h2>')
for q, a in FAQ:
    with st.expander(q):
        st.write(a)
