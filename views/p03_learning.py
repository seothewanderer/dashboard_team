"""03 준비 역량 (plan.md 9.4, research 7장): S02 기술별 학습 이유·리소스 → S04 키워드 교육 검색(7.1·7.2).
S03 공고 언급 기술은 보조. S01 사전 기술 체크·S06 결과물은 삭제(요청 D4, 2026-09-30)."""
from html import escape

import pandas as pd

import streamlit as st

from analytics import jobs as J
from analytics import learning as L
from analytics.common import paginate
from components import cards, charts
from components.badges import badge
from components.chart_card import chart_card
from components.filters import goal_status_line, goal_toggle, only_toggle, pager
from components.linked_map import region_keyword_map
from components.page_intro import page_intro
from core import export_mode, routing
from core.data_loader import load_table
from core.datasets import job_frame, job_titles, representative_offerings, today

SKILL, KW = "learn_skill", "learn_keyword"            # KW = 다른 곳에서 넘어온 기술
KWS, SEARCH, CHIPS = "learn_kws", "learn_kw_search", "learn_kw_chips"   # 고른 수집 키워드(공유)·검색창·칩(요청 J2)
REGION, EXPLORE, PAGE = "learn_region", "learn_explore", "learn_page"   # 지도 지역 필터·과정 펼치기·쪽(요청 J3)
ALL = "전국"
RKWS, RSEARCH, RCHIPS = "learn_rkws", "learn_rkw_search", "learn_rkw_chips"   # 채용 키워드(요청 K2)
MODE, MODE_PREV, NO_COURSE = "learn_mode", "learn_mode_prev", "learn_no_course"
EDU, REC = "교육 키워드", "채용 키워드"

page_intro("learning")
titles = job_titles()

# ---- 출발점: 목표 직무 또는 다른 화면에서 넘어온 직무·기술(탐색만, 계획 저장 안 함) ----
handoff = routing.consume_handoff("learning")
if handoff:
    st.session_state["learn_job"] = handoff.get("job_id") or st.session_state.get("learn_job")
    if handoff.get("skill"):
        st.session_state[SKILL] = handoff["skill"]
        st.session_state[KW] = handoff["skill"]
    if handoff.get("keyword"):
        st.session_state[KW] = handoff["keyword"]
if export_mode.on() and st.query_params.get("kw"):   # 정적 공유본의 '예시' 화면용 키워드(plan 9.8)
    st.session_state.setdefault(KWS, [st.query_params["kw"]])
goal = st.session_state["plan"]["goal_job_id"]
job_id = st.session_state.get("learn_job") or goal
jf = job_frame().set_index("job_id")

if job_id:
    label = "목표 직무" if job_id == goal else "살펴보는 직무(목표 아님)"
    st.html(f'<p class="context-line">{label} · <b>{escape(titles[job_id])}</b></p>')
else:
    st.info("목표 직무를 고르면 그 직무에 필요한 기술별 학습 자료를 볼 수 있어요. 키워드로 교육만 찾아볼 수도 있습니다.")
    if st.button("직무부터 둘러보기", icon=":material/arrow_forward:"):
        routing.go("jobs")

# ---- S02 기술별 학습 이유와 리소스 ----
resources = load_table("skill_resources")
if job_id:
    skills = jf.loc[job_id, "skills"]
    st.html('<h2 class="section-title">기술을 왜 배우고 어디서 배우나</h2>')
    pick = st.pills("기술 선택", skills, key=SKILL, label_visibility="collapsed",
                    on_change=lambda: st.session_state.update({KW: st.session_state[SKILL], PAGE: 0}))
    if pick:
        rs = L.resources_for(resources, job_id, pick)
        if len(rs):
            first = rs.iloc[0]
            st.html(f'<div class="why"><p class="why__label">배우는 이유</p><p class="why__text">{escape(first.why_learn)}</p>'
                    f'<p class="why__label">먼저 알면 좋은 것</p><p class="why__text">{escape(first.prerequisite)}</p></div>')
            for rel, g in rs.groupby("relevance", sort=False):
                st.html(f'<p class="detail__label">{escape(rel)} {badge(str(len(g)) + "개", "neutral")}</p>')
                for r in g.itertuples():
                    with st.container(horizontal=True, vertical_alignment="center", key=f"res-{r.resource_key[:60]}"):
                        st.html(f'<p class="evidence-row__title">{escape(r.course_name)} · '
                                f'<span class="muted">{escape(r.provider)} · {escape(r.learning_type)}</span></p>',
                                width="stretch")
                        if isinstance(r.url, str) and r.url:
                            st.link_button("원문", r.url, type="tertiary", icon=":material/open_in_new:")
            st.caption("연결표의 관계(직접 학습·일부 포함·선수 학습)는 교육 내용을 재검증했다는 뜻이 아닙니다. "
                       f"확인일 {rs.verified_date.iloc[0]}.")
        else:
            st.caption("이 기술과 연결된 학습 리소스가 연결표에 없습니다. 아래 교육 키워드로 찾아보세요.")

# ---- S04 지도·키워드 막대 → 교육/채용 키워드로 찾기 → 공고 기술 그래프 펼치기 → 교육 과정 펼치기 (요청 J, K) ----
courses = load_table("courses")
offerings = load_table("offerings")
kw_counts = L.keyword_counts(courses)                 # 고용24 수집 검색 키워드(요청 F4, J2-1 수집 원본으로 보완)
kw_n = dict(zip(kw_counts.keyword, kw_counts.n))
keywords = kw_counts.keyword.tolist()
posting_kw = load_table("posting_kw_freq")
rec_counts = L.recruit_keyword_counts(posting_kw, courses)   # 공고 기술 중 관련 교육이 있는 것(요청 K2)
rec_n = dict(zip(rec_counts.keyword, rec_counts.n))
rec_post = dict(zip(rec_counts.keyword, rec_counts.posting_count))
rec_keywords = rec_counts.keyword.tolist()
MODES = {EDU: (KWS, SEARCH, CHIPS, keywords), REC: (RKWS, RSEARCH, RCHIPS, rec_keywords)}


def _set_keywords(mode: str, words: list[str]) -> None:
    """한 방식 안에서 검색창·칩(·막대)이 같은 선택을 공유(요청 J2). 고르면 과정 목록을 자동으로 펼친다(요청 J3)."""
    state, search, chips, options = MODES[mode]
    words = [k for k in options if k in words]
    st.session_state.update({state: words, search: words, chips: words, MODE: mode, PAGE: 0})
    if words:
        st.session_state[EXPLORE] = True


def _toggle(mode: str, name: str) -> None:
    now = st.session_state.get(MODES[mode][0]) or []
    _set_keywords(mode, [k for k in now if k != name] if name in now else [*now, name])


def _toggle_region(name: str) -> None:
    st.session_state.update({REGION: None if st.session_state.get(REGION) == name else name, PAGE: 0})
    if st.session_state[REGION]:
        st.session_state[EXPLORE] = True


def _pick_mode() -> None:
    if st.session_state.get(MODE) is None:            # 같은 탭을 다시 눌러도 선택이 풀리지 않게
        st.session_state[MODE] = st.session_state.get(MODE_PREV, EDU)
    st.session_state.update({MODE_PREV: st.session_state[MODE], PAGE: 0})


st.session_state.setdefault(MODE, EDU)
mode = st.session_state[MODE] or EDU
words = st.session_state.get(MODES[mode][0]) or []    # 지금 방식의 선택만 적용(다른 방식 선택은 보관)
extra = st.session_state.get(KW)
region = st.session_state.get(REGION)

# 조건에 맞는 과정: 교육 키워드 = 수집 검색어만 / 채용 키워드 = 과정명·수집 검색어·NCS명. 넘어온 기술은 합집합
cand = L.search_courses(words, courses, resources, job_id=job_id, search_only=mode == EDU)
if extra:
    more = L.search_courses([extra], courses, resources, job_id=job_id)
    cand = pd.concat([cand, more[~more.course_id.isin(cand.course_id)]], ignore_index=True)
if not (words or extra):
    cand = pd.DataFrame({"course_id": courses.course_id, "reasons": [[]] * len(courses),
                         "relevance": [[]] * len(courses), "group": L.GROUP_ALL})
label = "교육 키워드" if mode == EDU else "채용 키워드"
scope = " · ".join([*([f"{label} " + ", ".join(words)] if words else []),
                    *([f"기술 {extra}"] if extra else [])]) or "전체 교육"

# 1) 시각화: 들어오자마자 보이게 맨 위(요청 K1)
rc = L.region_course_counts(offerings, cand.course_id)
rk = L.region_keyword_counts(courses, offerings)
bars = {r: dict(zip(g.keyword, g.n)) for r, g in rk.groupby("province_std")} | {ALL: kw_n}
totals = L.region_course_counts(offerings, courses.course_id)
totals = dict(zip(totals.province_std, totals.n)) | {ALL: len(courses)}
with chart_card("S04", key="s04_region", title=f"어느 지역에서 열리나 · {scope}", n=len(cand),
                table=rc.rename(columns={"province_std": "지역", "n": "과정 수"})):
    region_keyword_map({r: n for r, n in zip(rc.province_std, rc.n) if r != L.REMOTE}, bars, totals, keywords,
                       selected=st.session_state.get(KWS) or [] if mode == EDU else [], region=region, all_label=ALL,
                       key="s04_linked", on_region=_toggle_region, on_keyword=lambda k: _toggle(EDU, k))
    off_map = rc[~rc.province_std.isin(charts.REGIONS) & rc.n.gt(0)]
    st.caption((" · ".join(f"{r.province_std} {r.n}개 과정" for r in off_map.itertuples()) + " (지도 밖 별도 표기) · "
                if len(off_map) else "") +
               "지도에 마우스를 올리면 오른쪽 막대가 그 지역 값으로 바뀌고, 누르면 그 지역 과정만 봅니다. "
               "막대를 누르면 교육 키워드로 찾습니다.")

# 2) 교육 키워드로 찾기 / 채용 키워드로 찾기 (요청 K2). 지역 조건은 두 방식 공통
st.html('<h2 class="section-title">키워드로 교육 찾기</h2>')
with st.container(key="subtabs"):
    st.segmented_control("찾는 방식", [EDU, REC], key=MODE, label_visibility="collapsed", on_change=_pick_mode,
                         format_func=lambda m: f"{m}로 찾기")
state, search, chips, options = MODES[mode]
for k in (search, chips):                             # 위젯 상태를 공유 선택에서 시작
    st.session_state.setdefault(k, list(st.session_state.get(state) or []))
if mode == EDU:
    fmt_search, fmt_chip = (lambda k: f"{k} ({kw_n[k]})"), (lambda k: f"{k} :small[:gray[({kw_n[k]})]]")
    hint = "교육 키워드 검색 (예: 드론조종, CAD) · 여러 개 선택"
else:
    fmt_search = lambda k: f"{k} (교육 {rec_n[k]} · 공고 {rec_post[k]})"   # noqa: E731
    fmt_chip = lambda k: f"{k} :small[:gray[({rec_n[k]})]]"              # noqa: E731
    hint = "채용 키워드 검색 (예: 비행제어, 임베디드) · 여러 개 선택"
st.multiselect(f"{label} 검색", options, key=search, label_visibility="collapsed", placeholder=hint,
               format_func=fmt_search, on_change=lambda: _set_keywords(mode, st.session_state[search]))
with st.container(key="learn-kw"):                   # 칩 여러 줄로 감싸기(base.css)
    st.pills(label, options, key=chips, selection_mode="multi", label_visibility="collapsed",
             format_func=fmt_chip,                    # 개수는 괄호·흐리게·작게(요청 J2)
             on_change=lambda: _set_keywords(mode, st.session_state[chips]))
if extra or region:
    with st.container(horizontal=True, key="learn-filters"):
        if extra:                                     # 기술 선택·직무 팝업에서 넘어온 기술(사용자 결정)
            st.button(f"선택한 기술: {extra}", key="learn_clear_extra", type="secondary", icon=":material/close:",
                      help="선택한 기술을 지웁니다", on_click=lambda: st.session_state.update({KW: None, PAGE: 0}))
        if region:
            st.button(f"지역: {region}", key="learn_clear_region", type="secondary", icon=":material/close:",
                      help="지역 조건을 지웁니다", on_click=lambda: st.session_state.update({REGION: None, PAGE: 0}))
if mode == EDU:
    st.caption("교육 키워드 = 고용24에서 과정을 모을 때 쓴 검색어(괄호 = 그 검색어로 모인 과정 수). 여러 개를 고르면 하나라도 "
               f"해당하는 과정을 보여 줍니다. 수집 때 결과가 없던 검색어({', '.join(L.EMPTY_KEYWORDS)})는 단추에 없습니다.")
else:
    st.caption(f"채용 키워드 = 수집 공고에서 언급된 기술 중 관련 교육이 있는 {len(rec_keywords)}개(공고 언급 많은 순, 괄호 = 과정명·"
               "검색어·NCS명에 그 단어가 있는 과정 수). 단어 일치일 뿐 교육 내용은 확인이 필요합니다. 공고 언급 수는 아래 그래프에서 "
               "볼 수 있습니다.")

# 3) 채용 키워드 그래프 펼치기 (S03): '채용 키워드로 찾기' 탭에서만 보임(요청 L 03-1). 막대 클릭 = 채용 키워드로 찾기
if mode == REC:
    with st.expander("수집 공고에서 언급된 기술 보기 (전체 공고 기준)"):
        cat = st.segmented_control("분류", sorted(posting_kw.keyword_category_name.unique()), key="s03_cat",
                                   default="비행제어/드론플랫폼")
        sub = posting_kw[posting_kw.keyword_category_name.eq(cat)].sort_values("posting_count", ascending=False).head(12)
        with chart_card("S03", key="s03", table=sub[["keyword_normalized", "posting_count", "posting_share_pct"]].rename(
                columns={"keyword_normalized": "키워드", "posting_count": "공고 수", "posting_share_pct": "비율(%)"})):
            opt, h = charts.hbar(sub.keyword_normalized.tolist(), sub.posting_count.tolist(), unit="건 공고",
                                 selected=st.session_state.get(RKWS) or [] if mode == REC else [])
            charts.render(opt, "s03_bar", h,
                          on_click=lambda name: _toggle(REC, name) if name in rec_n else st.session_state.update(
                              {NO_COURSE: name}))
        if st.session_state.get(NO_COURSE) in set(sub.keyword_normalized):
            st.info(f"'{st.session_state[NO_COURSE]}'과(와) 이름이 일치하는 교육 과정이 없습니다.")
        st.caption("막대를 누르면 '채용 키워드로 찾기'에 들어가고 과정 목록이 펼쳐집니다.")

# 4) 교육 과정 펼치기 (요청 J3)
day = today()
ranked = L.rank_courses(cand, courses, representative_offerings(day), st.session_state["profile"])
if region:
    ranked = ranked[ranked.course_id.isin(L.courses_in_region(offerings, region))].reset_index(drop=True)
DRONE_ONLY = "learn_only_drone"                       # 드론 관련 교육 = 1차 드론 수집 과정(요청 L5, 사용자 결정)
if st.session_state.get(DRONE_ONLY):
    ranked = ranked[ranked.source_group.eq("drone")].reset_index(drop=True)
where = " · ".join([scope, *([region] if region else []), *(["드론 관련만"] if st.session_state.get(DRONE_ONLY) else [])])
with st.expander(f"교육 과정 보기 · {where} {len(ranked):,}개", key=EXPLORE, on_change="rerun"):
    with st.container(horizontal=True, key="learn-card-toggles"):
        only_toggle(DRONE_ONLY, "드론 관련만 보기", "drone",
                    "드론 검색어(드론·무인항공·무인비행·초경량비행장치·항공촬영·드론조종)로 모인 과정만 봅니다. 초록 띠 카드입니다.",
                    on_change=lambda: st.session_state.update({EXPLORE: True, PAGE: 0}))   # 제목이 바뀌어도 펼친 채로
        goal_on = goal_toggle()
    if ranked.empty:
        st.info("조건에 맞는 과정이 없습니다. 키워드나 지역 조건을 바꿔 보세요.")
    else:
        if goal_on:                                   # 목표 직무 관련 강조(요청 F5)
            all_jobs = job_frame()
            ranked = ranked.assign(goal_reason=L.goal_reasons(ranked, all_jobs[all_jobs.job_id.eq(goal)].iloc[0],
                                                              resources,
                                                              J.synonym_groups(load_table("bridge_skill_dictionary"))))
            goal_status_line(int(ranked.goal_reason.notna().sum()), len(ranked))
        groups = [g for g in L.GROUP_ORDER if (ranked.group == g).any()]
        tab = groups[0]
        if len(groups) > 1:
            tab = st.segmented_control("후보 그룹", groups, key="learn_group", default=groups[0],
                                       format_func=lambda g: f"{g} {int((ranked.group == g).sum())}",
                                       on_change=lambda: st.session_state.update({PAGE: 0})) or groups[0]
        in_group = ranked[ranked.group.eq(tab)]
        if tab == L.GROUP_SEARCH:
            st.caption("검색어·과정명이 일치하는 후보 · 교육 내용 확인 필요")
        no = pager(PAGE, len(in_group), label="개 과정")
        rows, _ = paginate(in_group, no)
        cards.grid(rows, cards.course_card)

# 공식 참고자료 (과정 순위와 섞지 않음)
if job_id and st.session_state.get(SKILL):
    ext = L.resources_for(resources, job_id, st.session_state[SKILL])
    ext = ext[~ext.is_work24]
    if len(ext):
        with st.expander(f"공식 참고자료 {len(ext)}개"):
            for r in ext.itertuples():
                st.markdown(f"[{r.course_name}]({r.url}) · {r.provider}")
