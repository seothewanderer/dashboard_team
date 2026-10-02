"""02 직무 탐색 (plan.md 9.3, research 6장): J01 직무 네트워크(대분류 → 중분류 → 카드 10개, 요청 F3) + J05 직무 키워드·보유 기술로 직무 찾기.
J02·J03은 카드의 '상세 보기' 팝업."""
import time
from html import escape

import streamlit as st

from analytics import jobs as J
from analytics.common import paginate
from components import cards, dialogs
from components.chart_card import chart_card
from components.job_graph3d import job_graph3d
from components.filters import HL_KEY, handoff_banner, only_toggle, pager, toggle_value
from components.page_intro import page_intro
from components.search_box import search_box
from components.scroll import scroll_to
from content.activity_tags import ACTIVITIES
from core import routing
from core.data_loader import load_table
from core.datasets import job_frame

PAGE = "jobs_page_no"
MAJOR, MIDDLE = "jobs_major", "jobs_middle"
CARDS_GO = "jobs_cards_go"                                # '관련 직무 카드 보러가기' 누른 시각(스크롤 1회용)
CARDS_OPEN = "jobs_cards_open"                            # 직무 카드 펼치기 열림 상태

page_intro("jobs")
jf = job_frame()

# ---- 다른 화면에서 넘어온 후보 ----
handoff = routing.consume_handoff("jobs")
if handoff:
    st.session_state["jobs_handoff"] = handoff
    st.session_state[PAGE] = 0
carried = st.session_state.get("jobs_handoff")
if carried:
    ids = carried.get("job_ids") or []
    handoff_banner(f"01 산업 이해의 '{escape(carried['area'])}' 분야에서 온 직무 후보 {len(ids)}개 · 검토 전 후보",
                   "jobs_clear_handoff", lambda: st.session_state.update({"jobs_handoff": None, PAGE: 0}))

# ---- 필터 줄 ----
f1, f2 = st.columns([1, 2])
with f1:   # 직무·기술 검색 = 검색 상자(요청 O2·O4): 입력하면 관련 직무명·기술이 목록으로, 펼치면 전체. 고르면 아래 직무 카드가 열림
    text = search_box("직무·기술 검색", jf["job_title_ko"].tolist() + [s for sk in jf["skills"] for s in sk],
                      key="jobs_text", placeholder="예: 자율비행, GIS, CAD · 입력하거나 펼쳐서 찾기",
                      on_change=lambda: st.session_state.update({PAGE: 0, CARDS_OPEN: bool(st.session_state.get("jobs_text"))}))
acts = f2.pills("하는 일", ACTIVITIES, selection_mode="multi", key="jobs_acts")
# 근거 유형 필터는 삭제(요청 O3). 방산 강조는 그래프 오른쪽 빨강 단추(요청 M5), '방산 강조 중' 안내 줄은 뺌(요청 M12)
base = J.filter_jobs(jf, activities=acts, text=text,
                     job_ids=carried.get("job_ids") if carried else None)

# ---- J01 직무 네트워크 (요청 F3): 대분류·중분류 클릭 = 기존 필터, 직무 클릭 = 상세 팝업 ----
major = st.session_state.get(MAJOR)
middle = st.session_state.get(MIDDLE) if major else None


def _net_click(name: str) -> None:
    # 노드 사이 선(링크)을 누르면 이름이 '출발 > 도착'으로 와서 이전엔 중분류를 못 찾아 오류가 났다(요청 M1) → 무시
    if not name or " > " in name:
        return
    kind, _, value = name.partition(":")
    if kind == "M":
        toggle_value(MAJOR, value, reset=PAGE)
        st.session_state[MIDDLE] = None
    elif kind == "D":
        parents = jf.loc[jf.middle_category.eq(value), "major_category"]
        if parents.empty:
            return
        parent = parents.iloc[0]
        same = st.session_state.get(MIDDLE) == value
        st.session_state.update({MAJOR: parent, MIDDLE: None if same else value, PAGE: 0})
    elif kind == "J":
        dialogs.open_dialog("job", value)
    elif kind == "R":                                     # 가운데(전체) = 선택 해제
        st.session_state.update({MAJOR: None, MIDDLE: None, PAGE: 0})


with chart_card("J01", title="드론 직무 네트워크",
                subtitle="누른 채 끌어서 돌려 보세요(마우스를 올리면 멈춤) · 대분류·중분류를 누르면 그 가지만 강조 · 가운데 = 전체 · 빨강 = 방산기업 근무처 직무",
                n=len(base), table=base.groupby(["major_category", "middle_category"]).size().rename("직무 수").reset_index()
                .rename(columns={"major_category": "대분류", "middle_category": "중분류"})):
    # 3D 홀로그램 네트워크(요청 M2): 마우스로 좌우 탐색, 가만히 두면 천천히 회전
    # 그래프 왼쪽(정사각형에 가깝게), 대분류·중분류 칩은 오른쪽 세로 정렬(요청 M2 후속)
    g_col, p_col = st.columns([4, 1], gap="small")       # 오른쪽 열은 칩 폭만큼만, 남는 폭은 그래프로(요청 M7)
    with g_col:
        job_graph3d(base, major=major, middle=middle, highlight_defense=st.session_state["ui"]["highlight_defense"],
                    key="j01_net3d", on_click=_net_click)
    # 오른쪽 열(요청 M5·M6): 위 = 방산·전체 단추, 구분선 '대분류' 아래 한 줄에 하나씩, 구분선 '중분류' 아래 중분류(또는 안내),
    # 맨 아래 = '관련 직무 카드 보러가기'. 모두 오른쪽 정렬
    with p_col, st.container(key="j01-pills"):
        hl = st.session_state["ui"]["highlight_defense"]
        showing_all = not major and not hl                # 방산 보기와 전체 보기는 둘 중 하나만 켜짐(요청 M7)

        def _set_defense(on: bool):                   # 다른 화면의 '방산 강조' 토글과 같은 상태(ui + 위젯 키)
            st.session_state["ui"]["highlight_defense"] = on
            st.session_state[HL_KEY] = on

        def _toggle_defense():                        # 켜면 대분류·중분류 선택을 풀어 '전체 보기'도 꺼진 상태(방산 가지만 밝게)
            _set_defense(not hl)
            if not hl:
                st.session_state.update({MAJOR: None, MIDDLE: None, PAGE: 0})

        def _show_all():                              # 전체 보기 = 선택 해제 + 방산 보기도 끔
            _set_defense(False)
            st.session_state.update({MAJOR: None, MIDDLE: None, PAGE: 0})

        # 선택 전 = 테두리만, 선택(켜짐) = 채움(요청 M6). 전체 보기는 대분류를 고르지 않은 상태가 '선택'
        with st.container(horizontal=True, horizontal_alignment="right", key="j01-actions"):
            with st.container(key=f"j01-btn-defense{'-on' if hl else ''}", width="content"):
                st.button("방산 관련 직무", key="j01_defense", on_click=_toggle_defense,
                          help="방산기업 근무처 직무와 그 가지만 밝게, 나머지는 흐리게 합니다. 한 번 더 누르면 끕니다.")
            with st.container(key=f"j01-btn-all{'-on' if showing_all else ''}", width="content"):
                st.button("전체 보기", key="j01_all", on_click=_show_all)
        majors = sorted(jf["major_category"].unique())
        middles = sorted(jf.loc[jf.major_category.eq(major), "middle_category"].unique()) if major else []
        if hl:   # 방산 보기 중: 방산기업 근무처 직무가 없는 대분류·중분류 칩은 흐리게(그래프의 흐린 가지와 같게, 요청 M8·M9)
            on = base[base.defense_workplace.astype(bool)]
            dim = [f'.st-key-j01-list-major [data-testid="stButtonGroup"] button:nth-of-type({i + 1})'
                   for i, m in enumerate(majors) if m not in set(on.major_category)]
            dim += [f'.st-key-j01-list-middle [data-testid="stButtonGroup"] button:nth-of-type({i + 1})'
                    for i, m in enumerate(middles) if m not in set(on.middle_category)]
            if dim:
                st.html("<style>" + ", ".join(dim) + " { opacity: var(--faded-opacity); }</style>")
        st.html('<div class="j01-sep"><span>대분류</span></div>')
        with st.container(key="j01-list-major"):
            st.pills("대분류", majors, key=MAJOR, label_visibility="collapsed",
                     on_change=lambda: st.session_state.update({PAGE: 0, MIDDLE: None}))
        st.html('<div class="j01-sep"><span>중분류</span></div>')
        if major:
            with st.container(key="j01-list-middle"):
                st.pills("중분류", middles, key=MIDDLE,
                         label_visibility="collapsed", on_change=lambda: st.session_state.update({PAGE: 0}))
        else:
            st.html('<p class="j01-hint">대분류를 먼저 선택하세요</p>')
        # 바로가기: 열 맨 아래 고정(중분류가 늘거나 줄어도 그대로). 이 단추만 카드로 이동. 위 구분선은 없앰(요청 M10)
        with st.container(key="j01-btn-cards", horizontal_alignment="right"):
            st.button("관련 직무 카드 보러가기", key="j01_to_cards", icon=":material/arrow_downward:",
                      on_click=lambda: st.session_state.update({CARDS_GO: time.time_ns(), CARDS_OPEN: True}))

result = J.filter_jobs(base, major=[major] if major else None,
                       middle=[st.session_state[MIDDLE]] if major and st.session_state.get(MIDDLE) else None)
result = result.sort_values(["major_category", "middle_category", "job_title_ko"])
# 직무 카드는 펼치기 안(요청 L5): 기본 닫힘, 조건으로 좁히면 펼친 채로. 안에 '방산 관련만' 필터 토글
DEF_ONLY = "jobs_only_defense"
if st.session_state.get(DEF_ONLY):
    result = result[result.defense_workplace.astype(bool)]
scroll_to(".st-key-jobs-cards", st.session_state.get(CARDS_GO), key="jobs_cards_scroll")
# 펼치기는 제목·키를 고정해 다시 만들어지지 않게 함(요청 M12): 이전에는 제목의 건수·열림 조건이 바뀔 때마다 새로 만들어져
# 잠깐 접히며 페이지 높이가 줄어 화면이 위로 튀었다. 여닫기는 사용자와 '보러가기' 단추만 바꾼다. 건수는 안쪽 쪽 표시에.
with st.container(key="jobs-cards"), st.expander("직무 카드 보기", key=CARDS_OPEN, on_change="rerun"):
    only_toggle(DEF_ONLY, "방산 관련만 보기", "defense", "방산기업이 근무처에 있는 직무 카드만 봅니다. 위 네트워크 그래프는 그대로입니다.")
    no = pager(PAGE, len(result), label="개 직무")
    rows, _ = paginate(result, no)
    cards.grid(rows, cards.job_card)
    if not len(result):
        st.info("조건에 맞는 직무가 없습니다. 검색어나 필터를 해제해 보세요.")

# ---- J05 직무 키워드·보유 기술로 직무 찾기 (요청 2026-09-30: 선택은 이 화면에서만, 저장 안 함) ----
st.html('<h2 class="section-title">직무 키워드 또는 보유 기술로 직무 찾기</h2>')
J05_KW = "j05_keyword"
counts = load_table("job_skills")["skill_keyword"].value_counts()
frequent = counts[counts.ge(3)].index.tolist()          # 직무 3개 이상에 적힌 키워드
with st.container(key="j05-keywords"):                  # 키워드가 많아 여러 줄로 감싼다(base.css)
    st.pills("자주 나오는 키워드", frequent, key="j05_pick",
             on_change=lambda: st.session_state.update({J05_KW: st.session_state["j05_pick"], "j05_page": 0}))
st.selectbox("전체 키워드에서 찾기", sorted(counts.index, key=str.casefold), index=None, key="j05_search",
             placeholder=f"키워드 {len(counts)}개 중 검색", on_change=lambda: st.session_state.update(
                 {J05_KW: st.session_state["j05_search"], "j05_pick": None, "j05_page": 0}))
kw = st.session_state.get(J05_KW)
if kw:
    ov = J.skill_overlap(jf, [kw], J.synonym_groups(load_table("bridge_skill_dictionary")))
    st.html(f'<p class="context-line">키워드 · <b>{escape(kw)}</b> · 사전에 이 키워드가 적힌 직무 {len(ov)}개</p>')
    found = jf[jf.job_id.isin(ov.job_id)].sort_values(["major_category", "middle_category", "job_title_ko"])
    rows, _ = paginate(found, pager("j05_page", len(found), label="개 직무"))
    cards.grid(rows, cards.job_card, scope="-j05")
    st.caption("정확히 같은 표기와 검토된 동의어만 연결합니다. 합격 가능성이나 적합도 점수가 아닙니다.")
else:
    st.caption("키워드를 고르면 직무 사전에서 그 키워드가 적힌 직무 카드를 보여 줍니다.")
