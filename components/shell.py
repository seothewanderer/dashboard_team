"""공통 셸 (plan.md 5장, 9.5.1, 9.7): 사이드바 메뉴·좌측 하단 안내·상단바·오른쪽 '나의 탐색 경로'."""
from contextlib import contextmanager
from html import escape

import streamlit as st

from content.module_meta import PAGE_DEFAULT
from core import routing, state


def _split_title(title: str) -> tuple[str, str]:
    """'01 산업 이해' → ('01', '산업 이해'). 번호가 없으면 ('', 제목)."""
    no, _, name = title.partition(" ")
    return (no, name) if no.isdigit() else ("", title)


# 오른쪽 '나의 탐색 경로' (요청 D6·E4·E5): 번호, 제목, 선택 전 안내, 스크랩 종류(None = 목표 직무), 살펴보기 대상(페이지, 하위)
ROADMAP_TITLE = "나의 탐색 경로"
ROADMAP_STEPS = [
    ("01", "목표 직무", "선택 전 · 직무 살펴보기", None, "jobs", None),
    ("02", "학습 내용", "교육 스크랩 전", "course", "learning", None),
    ("03", "채용 공고 스크랩", "공고 스크랩 전", "posting", "recruit", "postings"),
    ("04", "관심 기업 스크랩", "기업 스크랩 전", "company", "recruit", "companies"),
]


def render_nav(pages: dict[str, st.Page], current: str, slot=None) -> None:
    """기본 메뉴를 숨기고 직접 그린다: 단일 항목 4개 + '04 채용·기업 탐색' 펼침 메뉴.
    상위 항목을 누르면 하위 메뉴를 펼치고 기본 하위 페이지(채용 현황)로 이동한다(요청 B4)."""
    with slot or st.sidebar:
        st.html('<p class="sidebar-brand"><span class="sidebar-brand__dot"></span>드론 진로 탐색</p>')
        with st.container(key="nav"):
            for key in ("home", "industry", "jobs", "learning"):
                with st.container(key=f"nav-item{'-active' if key == current else ''}-{key}"):
                    st.page_link(pages[key], label=_split_title(pages[key].title)[1], width="stretch")

            in_recruit = current == "recruit"
            nav_open = st.session_state["ui"]["nav_open"]
            if in_recruit and st.session_state.get("_nav_last") != "recruit":
                nav_open["recruit"] = True          # 다른 화면에서 04로 들어오면 펼침
            st.session_state["_nav_prev"] = st.session_state.get("_nav_last")   # 직전 화면(홈 복귀 비행 방향, 요청 P1)
            st.session_state["_nav_last"] = current
            is_open = nav_open["recruit"]
            # 이름 = 채용 현황으로 이동(+펼침), 오른쪽 ^ = 하위 메뉴 펼치기·접기만(이동 없음, 요청 T4)
            with st.container(key=f"nav-parent{'-active' if in_recruit else ''}", gap=None):
                if st.button(_split_title(pages["recruit"].title)[1], key="nav_recruit_toggle", type="tertiary", width="stretch",
                             help="채용 현황으로 이동하고 하위 메뉴를 펼칩니다"):
                    nav_open["recruit"] = True
                    routing.go("recruit", sub=routing.DEFAULT_SUB)
                with st.container(key="nav-fold", width="content"):
                    st.button("", key="nav_recruit_fold", type="tertiary", help="하위 메뉴 펼치기/접기",
                              icon=":material/expand_less:" if is_open else ":material/expand_more:",
                              on_click=lambda: nav_open.update(recruit=not is_open))
            if is_open:
                with st.container(key="nav-subtree"):
                    for sub, label in routing.RECRUIT_SUBS.items():
                        active = in_recruit and routing.active_sub() == sub
                        with st.container(key=f"nav-sub{'-active' if active else ''}-{sub}"):
                            if st.button(label, key=f"nav_sub_{sub}", type="tertiary", width="stretch",
                                         icon=":material/chevron_right:" if active else None,
                                         icon_position="right"):
                                routing.go("recruit", sub=sub)


def render_context_card(context_key: str, slot=None) -> None:
    """좌측 하단 문맥 안내 (plan 5.4). 페이지 기본 안내."""
    meta = PAGE_DEFAULT[context_key]
    lines = "".join(f'<p class="context-card__line">{escape(line)}</p>' for line in meta["context_lines"])
    with slot or st.sidebar:
        st.html(f'<aside class="context-card"><p class="context-card__title">{escape(meta["title"])}</p>'
                f'{lines}</aside>')


def _toggle_roadmap() -> None:
    st.session_state["ui"]["roadmap_open"] = not st.session_state["ui"]["roadmap_open"]


def render_topbar(screen_label: str) -> None:
    """서비스명 · 현재 화면 · 탐색 경로 열기/접기 (research 3.1 상단 약 56px). 스크랩 수는 삭제(요청 D7)."""
    roadmap_open = st.session_state["ui"]["roadmap_open"]
    with st.container(key="topbar", horizontal=True, vertical_alignment="center"):
        st.html(f'<div class="topbar__brand"><span class="topbar__wordmark">드론 진로 탐색</span>'
                f'<span class="topbar__screen">{escape(screen_label)}</span></div>', width="stretch")
        st.button("탐색 경로 접기" if roadmap_open else ROADMAP_TITLE, key="topbar_roadmap", type="tertiary",
                  icon=":material/right_panel_close:" if roadmap_open else ":material/right_panel_open:",
                  on_click=_toggle_roadmap)


def _step_items(kind: str | None) -> list[tuple[str, str]]:
    """단계에 담긴 항목 (id, 표시 이름). 목표 직무는 최대 1개, 스크랩은 종류별 최대 3개."""
    if kind:
        return [(v["entity_id"], v["saved_title"]) for v in state.scrapped(kind)]
    goal = st.session_state["plan"]["goal_job_id"]
    if not goal:
        return []
    from core.datasets import job_titles
    return [(goal, job_titles().get(goal, goal))]


def _release(kind: str | None, entity_id: str) -> None:
    if kind:
        state.unscrap(kind, entity_id)
    else:
        state.select_goal(None)


def _render_roadmap_panel() -> None:
    with st.container(key="roadmap-panel"):
        st.html(f'<p class="roadmap__title">{ROADMAP_TITLE}</p>')
        pages = routing.pages()
        for no, title, empty_text, kind, page_key, sub in ROADMAP_STEPS:
            items = _step_items(kind)
            count = f'<span class="roadmap-step__count">{len(items)}/{state.SCRAP_LIMIT}</span>' if kind else ""
            with st.container(key=f"roadmap-step-{no}{'-set' if items else ''}"):
                st.html(f'<div class="roadmap-step"><span class="roadmap-step__no">{no}</span>'
                        f'<div><p class="roadmap-step__title">{escape(title)}{count}</p>'
                        + ("" if items else f'<p class="roadmap-step__state">{escape(empty_text)}</p>')
                        + "</div></div>")
                for i, (eid, name) in enumerate(items):
                    with st.container(horizontal=True, vertical_alignment="center", key=f"roadmap-item-{no}-{i}"):
                        st.html(f'<p class="roadmap-step__state roadmap-step__state--set">{escape(name)}</p>',
                                width="stretch")
                        st.button("해제", key=f"roadmap-release-{no}-{eid}", type="tertiary", icon=":material/close:",
                                  help="목표 직무 선택을 해제합니다" if kind is None else "스크랩을 해제합니다",
                                  on_click=_release, args=(kind, eid))
                with st.container(horizontal=True, key=f"roadmap-actions-{no}"):
                    st.page_link(pages[page_key], label="살펴보기", icon=":material/arrow_forward:",
                                 query_params={routing.SUB_KEY: sub} if sub else None)
        _render_my_conditions()


MY_EDU, MY_CAREER = ["고졸", "초대졸", "대졸", "석사"], ["신입", "경력"]


def _render_my_conditions() -> None:
    """'내 조건'(학력·경력·희망 지역, 요청 N14): 04 화면의 거르기가 공고 조건 필터로 바뀌면서 이리로 옮김.
    저장되며(persistence), 공고 상세 '내 조건과 비교' 표와 03 교육 정렬(희망 지역 우선)에 쓰인다. 거르기는 하지 않는다."""
    from core.datasets import posting_frame
    profile = st.session_state["profile"]
    with st.container(key="roadmap-mycond"):
        st.html('<div class="roadmap-step"><span class="roadmap-step__no"></span><div>'
                '<p class="roadmap-step__title">내 조건</p>'
                '<p class="roadmap-step__state">공고 상세의 “내 조건과 비교”와 교육 정렬에 쓰여요</p></div></div>')
        st.pills("내 학력", MY_EDU, key="my_edu", default=profile["education"],
                 on_change=lambda: profile.update(education=st.session_state["my_edu"]))
        st.pills("내 경력", MY_CAREER, key="my_career", default=profile["career_type"],
                 on_change=lambda: profile.update(career_type=st.session_state["my_career"]))
        st.multiselect("희망 지역", sorted(posting_frame().province_name.unique()), key="my_regions",
                       default=[r for r in profile["regions"]], placeholder="전체 지역",
                       on_change=lambda: profile.update(regions=list(st.session_state["my_regions"])))


@contextmanager
def frame():
    """중앙 본문 + 오른쪽 탐색 경로(열려 있을 때). 페이지는 중앙 열 안에서 실행된다."""
    if not st.session_state["ui"]["roadmap_open"]:
        yield
        return
    center, right = st.columns([3, 1], gap=None)
    with right:
        _render_roadmap_panel()
    with center:
        yield
