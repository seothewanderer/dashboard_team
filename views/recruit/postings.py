"""하위 페이지 '채용 현황' (plan.md 9.5.3, research 8.1): 내 조건 칩 → H01 직무·지역 → H02 경력·학력·고용형태 → H04 카드 → H06 선택한 직무와 비교.
막대·타일 클릭과 칩이 같은 필터 키를 쓰고, 분포는 자기 필터만 제외해 계산한다(research 3.2.1)."""
import time
from html import escape

import streamlit as st

from analytics import jobs as J
from analytics import postings as P
from analytics.common import paginate
from analytics.defense import TIER
from components import cards, charts, tables
from components.chart_card import chart_card
from components.effects import stat_tiles
from components.linked_chart_map import linked_chart_map
from components.scroll import scroll_to
from components.filters import (as_list, goal_status_line, goal_toggle,
                                handoff_banner, only_toggle, pager,
                                toggle_value)
from core import routing, state
from core.data_loader import load_table
from core.datasets import company_frame, job_frame, posting_frame
from content.module_meta import POSTINGS_AS_OF

PAGE = "post_page"
KEYS = {"job_major_category": "post_job", "province_name": "post_region", "career_type": "post_career",
        "education_normalized": "post_edu"}
COLLECTED = POSTINGS_AS_OF                                 # 공고 기준일(원본에 날짜 열 없음, 사용자 확인 2026-10-02, 홈·FAQ와 같은 값)
RATIO = "post_ratio"                                       # 직무 막대 '비율(%)로 보기'(요청 N6)
DEF_ONLY_ALL = "post_only_defense_all"                     # 방산 관련 기업만 보기(아래 전체, 요청 N7)
CARDS_OPEN, CARDS_GO = "post_cards_open", "post_cards_go"  # 공고 카드 펼치기 열림 · '스크랩하러 가기' 누른 시각


def _goal_job():
    goal = st.session_state["plan"]["goal_job_id"]
    jf_all = job_frame()
    return jf_all[jf_all.job_id.eq(goal)].iloc[0] if goal else None


def render() -> None:
    pf = posting_frame()
    handoff = routing.consume_handoff("recruit.postings")
    if handoff and handoff.get("company_id"):
        st.session_state["post_company"] = handoff["company_id"]
        st.session_state[PAGE] = 0
    company = st.session_state.get("post_company")
    if company:
        name = company_frame().set_index("company_id").loc[company, "company_name_normalized"]
        handoff_banner(f"기업 탐색에서 온 '{escape(name)}'의 연결 공고만 보는 중", "post_clear_company",
                       lambda: st.session_state.update({"post_company": None, PAGE: 0}))

    sample = P.filter_postings(pf, {}, [company] if company else None)   # 수집 표본 전체(내 조건·필터 전)
    k = P.kpis(sample)
    dfn = sample[sample.defense_group.map(lambda g: bool(TIER.get(g)))]
    n_def_emp = dfn.employer_name.nunique()
    # 01 산업 이해와 같은 아이콘 카드(요청 N1): 종이·건물·방패(빨강). 수집일은 원본에 없어 사용자가 알려 준 날짜
    stat_tiles([
        {"label": "수집 공고", "value": k["postings"], "unit": "건", "icon": "posting",
         "sub": f"{COLLECTED} 수집 기준 · 현재 모집 상태 미확인"},
        {"label": "공고의 기업 수", "value": k["employer_names"], "unit": "개", "icon": "company",
         "sub": "드론 관련 직무 공고를 낸 기업(기업명 기준)"},
        {"label": "방산 관련 기업 비율", "value": round(n_def_emp / max(k["employer_names"], 1) * 100, 1), "unit": "%",
         "decimals": 1, "icon": "shield", "tone": "defense",
         "sub": f"공고를 낸 기업 {k['employer_names']}곳 중 {n_def_emp}곳 · 공고로는 {len(dfn)}건"},
    ], key="h01_tiles", cols=3)

    # ---- 내 조건 (학력·경력·희망 지역, 요청 E 충돌 4): 검색 영역에서 필터처럼 고르는 칩. 저장값은 03 교육 정렬에도 쓰인다 ----
    with st.container(key="post-mycond"):
        # 위 단추 = 아래 그래프(경력·학력 막대, 지도)와 같은 필터 상태(요청 N12, 사용자 결정 '그래프 필터로 통일'):
        # 위에서 고르든 그래프에서 누르든 같은 키라 서로 켜지고 꺼진다. 값은 공고에 적힌 조건(여러 개 선택)
        st.html('<p class="filter-label">공고 조건으로 거르기 · 아래 그래프를 눌러도 같이 바뀝니다</p>')
        c1, c2, c3, c4 = st.columns([2.6, 2.2, 1.6, 1.6], vertical_alignment="center")
        with c1, st.container(horizontal=True, vertical_alignment="center", key="mc-edu"):
            st.html('<p class="mc-label">학력</p>', width="content")
            st.pills("학력", [v for v in P.EDUCATION_ORDER if v in set(pf.education_normalized)], selection_mode="multi",
                     key=KEYS["education_normalized"], label_visibility="collapsed",
                     on_change=lambda: st.session_state.update({PAGE: 0}))
        with c2, st.container(horizontal=True, vertical_alignment="center", key="mc-career"):
            st.html('<p class="mc-label">경력</p>', width="content")
            st.pills("경력", [v for v in P.CAREER_ORDER if v in set(pf.career_type)], selection_mode="multi",
                     key=KEYS["career_type"], label_visibility="collapsed",
                     on_change=lambda: st.session_state.update({PAGE: 0}))
        with c3, st.container(horizontal=True, vertical_alignment="center", key="mc-region"):
            st.html('<p class="mc-label">지역</p>', width="content")
            # 드롭다운(요청 N11) = 지도와 같은 지역 필터(지도를 누르거나 끄면 여기도 바뀜)
            st.multiselect("지역", sorted(pf.province_name.unique()), key=KEYS["province_name"],
                           label_visibility="collapsed", placeholder="전체 지역 · 눌러서 선택",
                           on_change=lambda: st.session_state.update({PAGE: 0}))
        with c4, st.container(horizontal_alignment="right"):   # 거르기 영역 안 오른쪽(요청 N2)
            # 방산 관련 기업만 보기(요청 N7): 아래 그래프·카드 전체를 방산 관련 기업 공고로만. 이 화면 전용 상태
            # (02·기업 탐색의 '방산 강조'(흐리게만)와는 별개)
            only_toggle(DEF_ONLY_ALL, "방산 관련 기업만 보기", "defense", "켜면 아래 그래프와 공고 카드가 모두 방산 관련 기업의 공고만 보여 줍니다.",
                        on_change=lambda: st.session_state.update({PAGE: 0}))
    mine = pf                                             # '내 조건' 거르기는 공고 조건 필터로 통일(요청 N12)
    def_only = bool(st.session_state.get(DEF_ONLY_ALL))
    if def_only:
        mine = mine[mine.defense_group.map(lambda g: bool(TIER.get(g)))]

    filters = {dim: as_list(st.session_state.get(key)) for dim, key in KEYS.items()}
    scoped = P.filter_postings(mine, {}, [company] if company else None)
    result = P.filter_postings(mine, filters, [company] if company else None)

    with st.container(horizontal=True, vertical_alignment="center", key="post-filterbar"):
        st.html(f'<p class="result-count">조건에 맞는 공고 <b>{len(result)}</b>건</p>', width="stretch")
        if any(filters.values()):
            st.button("필터 모두 해제", key="post_clear", type="tertiary", icon=":material/close:",
                      on_click=lambda: [st.session_state.update({v: [] for v in KEYS.values()}),
                                        st.session_state.update({PAGE: 0})])

    def bar(dim: str, meta: str, title: str, order=None, key_suffix=""):
        c = P.dim_counts(scoped, dim, filters, order)
        with chart_card(meta, key=f"h-{dim}", title=title, n=len(scoped),
                        table=c.rename(columns={dim: "구분", "n": "공고 수"})):
            opt, h = charts.hbar(c[dim].tolist(), c.n.tolist(), selected=filters[dim], unit="건")
            charts.render(opt, f"h_{dim}{key_suffix}", h,   # 막대 클릭 = 위 '공고 조건으로 거르기' 단추와 같은 키(켜기·끄기 공유)
                          on_click=lambda name: toggle_value(KEYS[dim], name, multi=True, reset=PAGE))

    # ---- 직무 막대(왼쪽) + 지역 지도(오른쪽) 연동 (요청 N5: 03 '지도 + 키워드 막대'와 같은 형태, 좌우 반대) ----
    # 지도에 마우스 = 그 지역의 직무별 공고로 막대가 바로 바뀜, 지도 클릭 = 지역 필터, 막대 클릭 = 직무 필터.
    # 막대는 방산 관련 기업 / 그 외 두 가지(요청 N3). '비율(%)로 보기'(요청 N6)를 켜면 그룹 안 비중(옛 H07)
    job_f, reg_f = filters["job_major_category"], filters["province_name"]
    base = P.filter_postings(mine, {k: v for k, v in filters.items() if k not in ("job_major_category", "province_name")},
                             [company] if company else None)
    ratio = bool(st.session_state.get(RATIO)) and not def_only    # 방산만 보는 중에는 '방산 vs 그 외' 비교가 없음
    order = P.job_by_defense(base, {}).job_major_category.tolist()   # 지역을 바꿔도 막대 순서 고정

    def _view(df, place: str) -> dict:
        # 막대 모양·굵기·간격은 03 '지도 + 키워드 막대'와 같게(요청 N10)
        if ratio:
            share, n_d, n_o = P.job_share_by_defense(df)
            share = share.set_index("job_major_category").reindex(order, fill_value=0)
            opt = charts.thin_diverging_hbar(order, ("그 외 공고", share.other.tolist()),
                                             (P.DEF_KIND + " 공고", share.defense.tolist()), selected=job_f)
            sub = f"그룹 안 비중(%) · 방산 관련 기업 공고 {n_d}건 / 그 외 {n_o}건 · 빨강 = 방산"
        else:
            jd = P.job_by_defense(df, {}).set_index("job_major_category").reindex(order, fill_value=0)
            opt = charts.thin_split_hbar(order, (P.DEF_KIND, jd[P.DEF_KIND].tolist()),
                                         ("그 외 공고", (jd[P.GEN_KIND] + jd[P.UNLINKED_KIND]).tolist()),
                                         unit="건", selected=job_f)
            sub = f"공고 {df.posting_id.nunique()}건 · 빨강 = 방산 관련 기업 · 막대를 누르면 그 직무로 거릅니다"
        return {"title": f"{place} · 직무별 공고", "sub": sub, "option": opt}

    home_df = base[base.province_name.isin(reg_f)] if reg_f else base
    home = "선택 지역" if reg_f else "전국"
    views = {home: _view(home_df, ", ".join(reg_f) if reg_f else "전국")}
    views |= {r: _view(base[base.province_name.eq(r)], r) for r in charts.REGIONS}
    rc = P.dim_counts(scoped, "province_name", filters)
    jd_all = P.job_by_defense(home_df, {}).assign(other=lambda d: d[P.GEN_KIND] + d[P.UNLINKED_KIND])
    scope = ", ".join([*job_f, *reg_f]) or ("방산 관련 기업" if def_only else "전체 공고")
    with chart_card("H07" if ratio else "H01", key="h-job-region", title=f"어느 직무·지역의 공고인가 · {scope}",
                    n=len(home_df),
                    table=jd_all[["job_major_category", P.DEF_KIND, "other", "total"]].rename(columns={
                        "job_major_category": "직무 분류", "other": "그 외 공고", "total": "합계"})):
        with st.container(key="h-ratio-toggle", width="content"):
            st.toggle("비율(%)로 보기", key=RATIO, disabled=def_only,
                      help="방산 관련 기업 공고와 그 외 공고를 각 그룹 안 비중(%)으로 비교합니다(그룹 크기가 달라서)."
                      if not def_only else "방산 관련 기업만 보는 중에는 비교할 '그 외' 공고가 없습니다.")
        linked_chart_map(dict(zip(rc.province_name, rc.n)), views, home, selected_regions=reg_f, unit="건",
                         key="h_job_region",
                         on_region=lambda name: toggle_value(KEYS["province_name"], name, multi=True, reset=PAGE),
                         on_bar=lambda name: toggle_value(KEYS["job_major_category"], name, multi=True, reset=PAGE))
        # 03과 같게 칩 대신 안내 한 줄(고른 조건은 위 '필터 모두 해제'로 지움)
        st.caption("지도에 마우스를 올리면 왼쪽 막대가 그 지역 값으로 바뀌고, 누르면 그 지역 공고만 봅니다. "
                   "막대를 누르면 그 직무로 거릅니다(다시 누르면 해제).")

    a, b = st.columns(2, gap="medium")
    with a:
        bar("career_type", "H02", "경력 조건", P.CAREER_ORDER)
    with b:
        bar("education_normalized", "H02", "학력 조건", P.EDUCATION_ORDER)

    # (H07 비율 그래프는 위 '어느 직무의 공고인가'의 '비율' 보기로 합침, 요청 N3)

    with st.expander("직무 × 경력 / 고용형태 보기"):
        m = P.job_career_matrix(result)
        if len(m):
            opt, h = charts.heatmap(m.columns.tolist(), m.index.tolist(), m.values.tolist(), unit="건")
            charts.render(opt, "h02_heat", h)
        et = P.employment_tag_counts(result)
        opt, h = charts.hbar(et.employment_types.tolist(), et.n.tolist(), unit="건",
                             tooltip_note="한 공고가 여러 형태에 중복 집계")
        st.caption("고용형태 · 한 공고가 여러 형태에 중복 집계됩니다")
        charts.render(opt, "h02_emp", h)

    # ---- H04 공고 카드 ----
    # 공고 카드는 펼치기 안(요청 L5). 안에 '목표 직무 관련 강조'(카드 강조, 요청 N15)
    ordered = result.sort_values(["job_major_category", "title"])
    # 제목·키를 고정해 다시 만들어지지 않게(화면 튐 방지, 02와 같은 방식). 건수는 안쪽 쪽 표시에
    scroll_to(".st-key-post-cards", st.session_state.get(CARDS_GO), key="post_cards_scroll")
    with st.container(key="post-cards"), st.expander("공고 카드 보기 · 원문에서 조건을 확인하세요", key=CARDS_OPEN,
                                                     on_change="rerun"):
        goal_on = goal_toggle()                       # 카드 강조 기능이라 카드 펼치기 안으로 옮김(요청 N15)
        if goal_on:                                   # 목표 직무 관련 강조(요청 F5): 전체 결과에서 이유 계산
            ordered = ordered.assign(goal_reason=P.goal_reasons(
                ordered, _goal_job(), load_table("bridge_job_posting_category_bridge"),
                J.synonym_groups(load_table("bridge_skill_dictionary"))))
            goal_status_line(int(ordered.goal_reason.notna().sum()), len(ordered))
        no = pager(PAGE, len(ordered), label="건")
        rows, _ = paginate(ordered, no)
        cards.grid(rows, cards.posting_card)
        if not len(ordered):
            st.info("선택한 자료·조건에서 관측 0건입니다. 시장에 채용이 없다는 뜻은 아닙니다.")

    # ---- H06 나의 탐색 경로 01 직무와 스크랩한 공고 비교 (요청 E 충돌 3) ----
    st.html('<h2 class="section-title">선택한 직무와 스크랩한 공고 비교</h2>')
    goal = st.session_state["plan"]["goal_job_id"]
    ids = [v["entity_id"] for v in state.scrapped("posting") if v["entity_id"] in set(pf.posting_id)]
    if not goal or not ids:   # 아직 없으면 무엇이 없는지 알리고 바로 고르러 가기(요청 N4)
        # 파란 안내 상자 안에 같은 폭의 테두리 단추(요청 N9)
        if not goal:
            with st.container(horizontal=True, vertical_alignment="center", key="h06-note-goal"):
                st.html('<p class="h06-note__text">아직 선택한 목표 직무가 없습니다. 02 직무 탐색에서 '
                        "'해당 직무 선택'을 누르면 여기서 비교합니다.</p>", width="stretch")
                if st.button("직무 선택하러 가기", key="h06_go_jobs", icon=":material/arrow_forward:"):
                    routing.go("jobs")
        if not ids:
            with st.container(horizontal=True, vertical_alignment="center", key="h06-note-scrap"):
                st.html('<p class="h06-note__text">아직 스크랩한 공고가 없습니다. 위 공고 카드에서 '
                        "'스크랩'을 누르면(최대 3개) 목표 직무와 나란히 비교합니다.</p>", width="stretch")
                st.button("공고 스크랩하러 가기", key="h06_go_cards", icon=":material/arrow_upward:",
                          on_click=lambda: st.session_state.update({CARDS_GO: time.time_ns(), CARDS_OPEN: True}))
    else:
        jf = job_frame()
        job = jf[jf.job_id.eq(goal)].iloc[0]
        st.html(f'<p class="context-line">목표 직무 · <b>{escape(job.job_title_ko)}</b> · 기술 {len(job.skills)}개 · '
                f'스크랩한 공고 {len(ids)}개</p>')
        table = P.compare_to_job(job,
                                 pf.set_index("posting_id").loc[ids].reset_index(),
                                 load_table("bridge_job_posting_category_bridge"),
                                 J.synonym_groups(load_table("bridge_skill_dictionary")),
                                 load_table("posting_kw_freq")["keyword_normalized"].tolist())
        tables.table(table, key=f"h06-{goal}-{'-'.join(ids)}")
        st.caption("점수·적합도가 아닙니다. 공고별 요구 기술 자료가 없어 공고 제목·담당 업무 원문에 나온 용어만 확인합니다"
                   "(정확 표기 → 검토된 동의어). 분류 관계는 검토 전 관계표 초안입니다.")
