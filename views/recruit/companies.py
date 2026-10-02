"""하위 페이지 '기업 탐색' (plan.md 9.6, research 3.2·3.2.1·8.2): C01 분야 막대(01과 같은 계산) | C04 채용 공고 노출(5:5) →
결과 수 → 카드 10개씩 이전/다음 넘기기(요청 W2). 집계 순서: 전체 필터 → 정렬 → 10개.
C04는 '방산 강조'가 꺼지면 기업 전체(방산 = 빨강), 켜지면 방산 관련 기업만(요청 S3). 방산 근거 집단 그래프·칩은 삭제(요청 S2)."""
from html import escape

import pandas as pd
import streamlit as st

from analytics import companies as C
from analytics.common import paginate, split_tags
from analytics.defense import TIER
from components import cards, charts
from components.chart_card import chart_card
from components.search_box import search_box
from components.filters import (as_list, defense_status_line, defense_toggle, goal_status_line, goal_toggle,
                                handoff_banner, only_toggle, pager, toggle_value)
from core import routing
from core.data_loader import load_table
from core.datasets import company_frame

TOP_N = 8
AREA, POSTED, KEYWORD, SORT, MULTI = "co_area", "co_posted", "co_kw", "co_sort", "co_multi"
PREVIEW_N = 2          # 접힌 상태에서 흐리게 미리 보여 줄 분야 수(01과 같음, 요청 S1)
EXPOSE_N = 10          # 일반 공고 노출 그래프: 연결 공고 많은 순 상위 기업 수(요청 S3)
BASIS = "co_basis"     # C01 기준(요청 U1)
BASIS_UNIT = {"companies": "개", "posted": "개", "postings": "건"}
BASIS_META = {"companies": "C01", "posted": "C01P", "postings": "C01N"}
COOC_N = 8             # 함께 하는 분야 막대 수(요청 U2)


def _reveal(hidden: list[str]) -> None:
    """접힌 상태에서 안 보이는 분야를 칩·막대로 고르면 '분야 더보기'를 자동으로 펼친다(요청 T2)."""
    if set(as_list(st.session_state.get(AREA))) & set(hidden):
        st.session_state["co_area_all"] = True


def _convert_area() -> None:
    """단일 ↔ 여러 분야 전환 시 칩 값 형식(값 ↔ 목록)을 맞춘다."""
    cur = as_list(st.session_state.get(AREA))
    st.session_state[AREA] = cur if st.session_state[MULTI] else (cur[0] if cur else None)


def render() -> None:
    comp = company_frame()
    handoff = routing.consume_handoff("recruit.companies")
    if handoff:
        if handoff.get("area"):
            areas = handoff["area"]
            st.session_state[MULTI] = len(areas) > 1
            st.session_state[AREA] = areas if len(areas) > 1 else areas[0]
        st.session_state["co_ids"] = handoff.get("company_ids")
    ids = st.session_state.get("co_ids")
    if ids:
        name = comp.set_index("company_id").loc[ids[0], "company_name_normalized"]
        handoff_banner(f"'{escape(name)}' 기업에서 이동해 왔습니다", "co_clear_ids",
                       lambda: st.session_state.update({"co_ids": None}))

    multi = st.session_state.get(MULTI, False)
    f = C.CompanyFilters(area=as_list(st.session_state.get(AREA)),
                         has_posting=bool(st.session_state.get(POSTED)), keyword=st.session_state.get(KEYWORD) or "")
    base = comp[comp.company_id.isin(ids)] if ids else comp

    with st.container(horizontal=True, vertical_alignment="bottom", key="co-filterbar"):
        # 키워드 = 검색 상자(요청 O2): 기업명·사업 분야·드론 세부 분야가 목록으로 뜨고, 목록에 없는 말도 검색
        search_box("키워드", comp["company_name_normalized"].tolist() + [a for ar in comp["areas"] for a in ar]
                   + [s for v in comp["drone_subfields"] for s in split_tags(v)],
                   key=KEYWORD, placeholder="예: 방제, 매핑, 안티드론 · 입력하거나 펼쳐서 찾기", width=320)
        st.toggle("수집 공고 연결됨", key=POSTED, help="검토 전 연결 후보를 포함합니다.")
        st.toggle("여러 분야 선택", key=MULTI, help="같은 분류 안에서는 '하나 이상'으로 합칩니다.",
                  on_change=_convert_area)
        defense_toggle()
        goal_on = goal_toggle()
    defense_status_line()

    basis = st.session_state.get(BASIS) or "companies"
    counts = C.area_basis_counts(base, f, basis)       # 기준(요청 U1): 막대 순서·더보기·그중 방산이 기준을 따른다
    result = C.filter_companies(base, f)            # 결과: 전체 필터 → 정렬 → 10개
    left, right = st.columns(2, gap="medium")       # C01 : C04 = 5:5 (요청 S2)
    with left:
        show_all = st.session_state.get("co_area_all", False)
        hidden = counts.business_category.iloc[TOP_N + PREVIEW_N - 1:].tolist()   # 흐린 맨 아래 줄부터 = 접힌 상태에서 안 보이는 분야
        # 접힌 상태: 다음 분야 2개를 미리 보여 주고 아래로 갈수록 흐리게(01 산업 이해와 같음, 요청 S1)
        view = counts if show_all else counts.head(TOP_N + PREVIEW_N)
        missing = [a for a in f.area if a not in set(view.business_category)]
        view = pd.concat([view, counts[counts.business_category.isin(missing)]])
        unit = BASIS_UNIT[basis]
        with chart_card(BASIS_META[basis], title="분야별 기업·기관", n=len(base),
                        subtitle=f"기준: {C.BASES[basis]} · 다른 조건 적용 · 빨강 = 그중 방산 관련 기업",
                        table=counts.rename(columns={"business_category": "분야", "n": C.BASES[basis],
                                                     "defense": "그중 방산 관련"})):
            with st.container(key="c01-basis", width="content"):   # 세 단추 한 덩어리, 고른 것만 반전(요청 V2)
                st.segmented_control("기준", list(C.BASES), key=BASIS, format_func=C.BASES.get, default="companies",
                                     required=True, label_visibility="collapsed")
            opt, h = charts.overlay_hbar(view.business_category.tolist(), view.n.tolist(), view.defense.tolist(),
                                         total_name=C.BASES[basis], part_name="그중 방산 관련", unit=unit,
                                         selected=f.area, note="분야 간 중복 포함")
            with st.container(key="c01-full" if show_all or len(counts) <= TOP_N else "c01-fade"):
                charts.render(opt, f"c01_area_{basis}", h,
                              on_click=lambda n: (toggle_value(AREA, n, multi=multi), _reveal(hidden)))
            with st.container(key="c01-more", horizontal=True, horizontal_alignment="center"):
                st.button("접기" if show_all else f"분야 더보기 (전체 {len(counts)}개)", key="co_area_more",
                          type="secondary", icon=":material/expand_less:" if show_all else ":material/expand_more:",
                          on_click=lambda: st.session_state.update({"co_area_all": not show_all}))
            st.pills("분야", counts.business_category.tolist(), key=AREA, label_visibility="collapsed",
                     selection_mode="multi" if multi else "single", on_change=lambda: _reveal(hidden))
            if f.area:
                _cooccurrence(base, f, basis)
    with right:
        _exposure(result)

    # 기업 카드는 펼치기 안(요청 L5): 기본 닫힘, 조건을 고르면 펼친 채로. 안에 '방산 관련만' 필터 토글
    DEF_ONLY = "companies_only_defense"
    if st.session_state.get(DEF_ONLY):
        result = result[result.defense_group.map(lambda g: bool(TIER.get(g)))]
    narrowed = len(result) < len(base) or bool(st.session_state.get(DEF_ONLY))
    with st.expander(f"기업 카드 보기 · {len(result):,}개", expanded=narrowed):
        only_toggle(DEF_ONLY, "방산 관련만 보기", "defense", "방산 관련 기업·기관 카드만 봅니다. 위 그래프는 그대로입니다.")
        mode = st.segmented_control("정렬", ["auto", "name"], key=SORT, default="auto", required=True,
                                    format_func={"auto": "자동(방산 관련 우선)", "name": "이름순"}.get)
        ranked = C.sort_companies(result, f, mode or "auto")
        if goal_on:                                       # 목표 직무 관련 강조(요청 F5)
            goal = st.session_state["plan"]["goal_job_id"]
            ranked = ranked.assign(goal_reason=C.goal_reasons(ranked, {"job_id": goal},
                                                              load_table("bridge_application_job_bridge")))
            goal_status_line(int(ranked.goal_reason.notna().sum()), len(ranked))
        no = pager("co_page", len(ranked), label="개 기업·기관")   # 이전/다음 10개 + 현재/전체(요청 W2)
        rows, total = paginate(ranked, no)
        note = " · 선택 결과 안에서 원문 직접확인 → 교차출처 → 인접 후보 → 미확인 순, 우수성·채용 순위 아님" \
            if C.is_sorted_by_defense(f, mode or "auto") else " · 이름순"
        st.html(f'<p class="result-count">조건에 맞는 기업·기관 <b>{total}</b>개{escape(note)}</p>')
        cards.grid(rows, cards.company_card)
        if total == 0:
            st.info("조건에 맞는 기업이 없습니다. 필터를 해제해 보세요.")

def _exposure(result: pd.DataFrame) -> None:
    """C04 채용 공고 노출(요청 S3): 방산 강조 꺼짐 = 공고가 연결된 기업·기관 상위 EXPOSE_N(방산은 늘 빨강),
    켜짐 = 방산 관련 기업만(0건 기업은 아래 한 줄)."""
    cols = {"company_name_normalized": "기업·기관", "defense_group": "근거 집단", "posting_count": "연결 공고 수"}
    if st.session_state["ui"]["highlight_defense"]:
        dfn = result[result.defense_group.map(lambda g: bool(TIER.get(g)))]
        exposed = dfn[dfn.posting_count.gt(0)].sort_values(["posting_count", "company_name_normalized"], ascending=[False, True])
        silent = dfn[dfn.posting_count.eq(0)].company_name_normalized.sort_values().tolist()
        with chart_card("C04", key="c04-exposure", n=len(dfn), table=dfn[list(cols)].rename(columns=cols),
                        subtitle=f"방산 관련 기업 {len(dfn)}곳 중 수집 공고가 연결된 곳 {len(exposed)}곳 · '방산 강조'를 끄면 전체 기업"):
            if len(exposed):
                opt, h = charts.hbar(exposed.company_name_normalized.tolist(), exposed.posting_count.tolist(), unit="건",
                                     tiers=[TIER.get(g) for g in exposed.defense_group])
                charts.render(opt, "c04_bar", h)
            else:
                st.caption("조건에 맞는 방산 관련 기업 중 수집 공고가 연결된 곳이 없습니다.")
            if silent:
                st.caption(f"수집 공고 0건 {len(silent)}곳: " + ", ".join(silent[:8]) + (" 외" if len(silent) > 8 else "")
                           + " · 수집 시점에 공고가 확인되지 않았다는 뜻이며 채용이 없다는 뜻은 아닙니다.")
        return
    exposed = result[result.posting_count.gt(0)].sort_values(["posting_count", "company_name_normalized"],
                                                            ascending=[False, True])
    top = exposed.head(EXPOSE_N)
    n_def = int(exposed.defense_group.map(lambda g: bool(TIER.get(g))).sum())
    with chart_card("C04A", key="c04-exposure", n=len(exposed), table=exposed[list(cols)].rename(columns=cols),
                    subtitle=f"수집 공고가 연결된 기업·기관 {len(exposed)}곳 중 많은 순 {len(top)}곳 · 빨강 = 방산 관련"
                             f"({n_def}곳) · '방산 강조'를 켜면 방산 관련 기업만"):
        if len(top):
            opt, h = charts.hbar(top.company_name_normalized.tolist(), top.posting_count.tolist(), unit="건",
                                 tiers=[TIER.get(g) for g in top.defense_group])
            charts.render(opt, "c04_bar_all", h)
        else:
            st.caption("조건에 맞는 기업·기관 중 수집 공고가 연결된 곳이 없습니다.")


def _pick_area(name: str) -> None:
    """함께 하는 분야 막대를 누르면 그 분야로 바꿔 본다(여러 분야 선택이면 추가)."""
    toggle_value(AREA, name, multi=st.session_state.get(MULTI, False))
    st.session_state["co_area_all"] = True                  # 고른 분야가 접힌 아래쪽이어도 보이게


def _cooccurrence(base: pd.DataFrame, f: C.CompanyFilters, basis: str) -> None:
    """함께 하는 분야(요청 U2): 고른 분야 기업들이 함께 하는 다른 분야 — 기업의 사업 범위를 보여 준다."""
    posted = basis != "companies"                           # 채용 기준이면 공고가 연결된 기업만 센다(위 그래프와 맞춤)
    co = C.area_cooccurrence(base, C.CompanyFilters(area=f.area, has_posting=f.has_posting or posted, keyword=f.keyword),
                             f.area).head(COOC_N)
    who = "채용 기업·기관" if posted else "기업·기관"
    picked = " · ".join(f.area)
    st.html(f'<p class="chart-card__subhead">\'{escape(picked)}\' 기업들이 함께 하는 분야</p>')
    if co.empty:
        st.caption("고른 분야 기업들이 함께 하는 다른 분야가 없습니다.")
        return
    opt, h = charts.overlay_hbar(co.business_category.tolist(), co.n.tolist(), co.defense.tolist(),
                                 total_name="이 분야도 하는 곳", part_name="그중 방산 관련", unit="개",
                                 note="막대를 누르면 그 분야로 바꿔 봅니다")
    charts.render(opt, "c01_cooc", h, on_click=_pick_area)
    st.caption(f"고른 분야 {who} 중 각 분야도 하는 곳의 수(고유, 상위 {COOC_N}개). 분야 외 조건 적용.")
