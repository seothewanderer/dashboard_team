"""01 산업 이해 (plan.md 9.2, research 5장): I01 KPI 1행 → I02 분야(전체 폭, 방산 겹침) → 국가 R&D 그래프(상시)
→ 활용 분야 셀 → 연구 과제 탐색(펼치기).
공고 지역·경력 보조 열은 04 채용 현황과 중복이라 제거(요청 F1)."""
from html import escape

import pandas as pd
import streamlit as st

from analytics import companies as C
from analytics import industry as I
from analytics.common import paginate
from components import charts
from components.badges import badge, draft_badge
from components.chart_card import chart_card
from components.note import note
from components.effects import stat_tiles
from components.filters import card_bar, card_fold, pager
from components.page_intro import page_intro
from core import routing, theme
from core.data_loader import load_table
from core.datasets import company_frame, job_titles

TOP_N = 8
PREVIEW_N = 2          # 접힌 상태에서 흐리게 미리 보여 줄 분야 수(요청 I3)
AREA_KEY = "ind_area"          # 분야 선택: 막대 클릭과 칩이 같은 키를 쓴다(plan 8.4)

page_intro("industry")

# ---- I01 산업 규모 ----
size = load_table("industry_size")
latest = I.size_latest(size)
stat_tiles([
    {"label": f"{int(latest.reference_year)}년 드론 업체", "value": int(latest.company_total), "unit": "개", "icon": "company",
     "sub": f"제작 {int(latest.company_manufacturing):,} · 활용 {int(latest.company_utilization):,}"},
    {"label": f"{int(latest.reference_year)}년 매출", "value": float(latest.revenue_total_100m_krw), "unit": "억원", "icon": "revenue",
     "decimals": 2, "sub": "세부표 합계 기준"},
    {"label": f"{int(latest.reference_year)}년 종사자", "value": int(latest.employees_total), "unit": "명", "icon": "employee",
     "sub": f"제작 {int(latest.employees_manufacturing):,} · 활용 {int(latest.employees_utilization):,}"},
], key="i01_tiles", cols=3)

# 펼칠 때만 그래프를 그려, 펼치는 순간 선이 왼쪽에서 오른쪽으로 그려지게 한다(요청 I2)
with st.expander("연도별 추이와 제작·활용 구성 보기", key="i01_trend_open", on_change="rerun"):
    if st.session_state.get("i01_trend_open"):
        trend = I.size_trend(size)
        cols = st.columns(3)
        for col, (field, label, unit) in zip(cols, [("company_total", "업체", "개"), ("revenue_total_100m_krw", "매출", "억원"),
                                                    ("employees_total", "종사자", "명")]):
            with col:
                st.caption(f"{label}({unit})")
                opt, h = charts.sparkline(trend["reference_year"].tolist(), trend[field].round(2).tolist(), unit=unit,
                                          draw=True)
                charts.render(opt, f"i01_trend_{field}", h)
        note("조사 표본이 해마다 달라 연도 차이를 성장률로 해석하지 않습니다.")

# ---- I02 분야 (전체 폭, 요청 F1) — 방산 관련 기업 수 겹침(요청 H2) ----
comp = company_frame()
filters = C.CompanyFilters()
counts = C.area_counts(comp, filters)
defense = C.area_defense_counts(comp, filters)
selected = st.session_state.get(AREA_KEY)


def _toggle_area(name: str) -> None:
    st.session_state[AREA_KEY] = None if st.session_state.get(AREA_KEY) == name else name
    _reveal()


def _reveal() -> None:
    """접힌 상태에서 안 보이는 분야(흐린 맨 아래 줄부터)를 칩·막대로 고르면 '분야 더보기'를 자동으로 펼친다(요청 T2)."""
    if st.session_state.get(AREA_KEY) in set(counts.business_category.iloc[TOP_N + PREVIEW_N - 1:]):
        st.session_state["ind_area_all"] = True


show_all = st.session_state.get("ind_area_all", False)
# 접힌 상태: 다음 분야 2개를 미리 보여 주고 아래로 갈수록 흐리게 덮어 '더 있음'을 알린다(요청 I3)
view = counts if show_all else counts.head(TOP_N + PREVIEW_N)
if selected and selected not in set(view["business_category"]):
    view = pd.concat([view, counts[counts.business_category.eq(selected)]])
with chart_card("I02", subtitle="분야를 누르면 그 분야의 일과 기업으로 이어집니다 · 빨강 = 그중 방산 관련 기업·기관",
                table=counts.assign(defense=counts.business_category.map(defense).fillna(0).astype(int)).rename(
                    columns={"business_category": "분야", "n": "기업·기관 수", "defense": "그중 방산 관련"}), n=len(comp)):
    opt, h = charts.overlay_hbar(view["business_category"].tolist(), view["n"].tolist(),
                                 [int(defense.get(a, 0)) for a in view["business_category"]],
                                 total_name="전체 기업·기관", part_name="방산 관련 기업·기관", unit="개",
                                 selected=[selected] if selected else [], note="분야 간 중복 포함")
    with st.container(key="i02-full" if show_all or len(counts) <= TOP_N else "i02-fade"):
        charts.render(opt, "i02_bar", h, on_click=_toggle_area)
    # 분야 더보기: 흐려진 부분 바로 아래 가운데 단추(요청 H3·I3)
    with st.container(key="i02-more", horizontal=True, horizontal_alignment="center"):
        st.button("접기" if show_all else f"분야 더보기 (전체 {len(counts)}개)", key="ind_area_more", type="secondary",
                  icon=":material/expand_less:" if show_all else ":material/expand_more:",
                  on_click=lambda: st.session_state.update({"ind_area_all": not show_all}))
    st.pills("분야 선택", counts["business_category"].tolist(), key=AREA_KEY, label_visibility="collapsed", on_change=_reveal)

if selected:
    rel = load_table("business_area_defense")
    rel_row = rel[rel.business_category.eq(selected)]
    bridge = load_table("bridge_application_job_bridge")
    jobs_here = bridge[bridge.application_id.eq(selected) & bridge.review_status.ne("rejected")]
    n_org = int(counts.loc[counts.business_category.eq(selected), "n"].sum())
    with st.container(key="i02-detail"):
        st.html(f'<p class="detail__title">{escape(selected)}</p>')
        if len(jobs_here):
            titles = job_titles()
            duties = load_table("jobs").set_index("job_id")["core_duties"]
            items = "".join(f'<li><b>{escape(titles[j])}</b> — {escape(str(duties.get(j, "")))}</li>'
                            for j in jobs_here["job_id"].head(3))
            # '이 분야' 대신 선택한 분야 이름(요청 H4, 사용자 결정)
            st.html(f'<p class="detail__label">{escape(selected)}에서 하는 일 예시 {draft_badge(jobs_here.review_status.iloc[0])}</p>'
                    f'<ul class="detail__list">{items}</ul>')
        else:
            note(f"{selected}에 연결된 직무 후보가 아직 없습니다. 직무 전체에서 찾아보세요.")
        if len(rel_row):
            r = rel_row.iloc[0]
            st.caption(f"국방 활용 관계({r.defense_use_case_relation}): {r.relation_rationale} · {r.usage_note}")
        b1, b2, b3 = st.columns(3)
        if b1.button("관련 직무 보기", key="i02_to_jobs", icon=":material/arrow_forward:", width="stretch"):
            routing.go("jobs", handoff={"from": "I02", "area": selected,
                                        "job_ids": jobs_here["job_id"].tolist()})
        if b2.button(f"기업·기관 {n_org}개 보기", key="i02_to_companies", icon=":material/arrow_forward:",
                     width="stretch"):
            routing.go("recruit", sub="companies", handoff={"area": [selected]})
        if b3.button("채용 현황에서 자세히", key="i_to_postings", icon=":material/arrow_forward:", width="stretch"):
            routing.go("recruit", sub="postings")
else:
    note("분야를 고르면 대표 업무와 관련 직무·기업으로 이어집니다. 인기 분야를 미리 고르지 않습니다.")

# ---- 드론 분야 연구 기술 (국가 R&D) — 그래프는 바로 보이게, 과제 목록은 '연구 과제 탐색' 펼치기 (요청 H1·H4·H6·H7) ----
TECH, APP, EXPLORE, EX_PAGE = "i03_tech", "i03_app", "i03_explore", "i03_page"


def _pick_tech(name: str | None) -> None:
    """기술 선택: 같은 기술을 다시 누르면 해제. 고르면 활용 분야 선택을 비우고 과제 탐색을 펼친다."""
    st.session_state[TECH] = None if st.session_state.get(TECH) == name else name
    st.session_state.update({APP: None, EX_PAGE: 0})
    if st.session_state[TECH]:
        st.session_state[EXPLORE] = True


def _tech_chip() -> None:
    """칩으로 고른 경우(값은 이미 TECH에 들어 있음): 활용 분야를 비우고, 골랐으면 과제 탐색을 펼친다."""
    st.session_state.update({APP: None, EX_PAGE: 0})
    if st.session_state.get(TECH):
        st.session_state[EXPLORE] = True


def _pick_app(name: str) -> None:
    st.session_state[APP] = None if st.session_state.get(APP) == name else name
    st.session_state.update({EX_PAGE: 0, EXPLORE: True})


st.html('<h2 class="section-title" id="sec-rnd">드론 분야에서 연구하는 기술 · 국가 R&D 과제</h2>')
wide = st.toggle("탐색 범위 과제까지 포함", key="i03_wide",
                 help="기본은 관련성이 높은 과제만. 켜면 탐색 범위 과제를 더합니다(관련성 낮은 과제는 항상 제외).")
topics = I.ntis_scope(load_table("ntis_topics"), wide)
projects = load_table("ntis_projects")
tc =I.tech_counts_with_defense(topics, projects)
by_year = I.defense_by_year(projects, wide)
tech = st.session_state.get(TECH)
if tech and tech not in set(tc.topic_name):      # 범위를 바꿔 없어진 기술
    tech = None

y_left, y_right = st.columns(2, gap="medium")
with y_right, chart_card("I03", n=topics["project_id"].nunique(),
                         subtitle="막대 = 기술별 전체 과제 · 빨강 = 그중 방산 태그 과제 · 누르면 활용 분야와 과제",
                         table=tc.rename(columns={"topic_name": "기술", "total": "과제 수", "defense": "그중 방산 태그"})):
    opt, tech_h = charts.overlay_hbar(tc.topic_name.tolist(), tc.total.tolist(), tc.defense.tolist(),
                                      total_name="전체 과제", part_name="방산 태그 과제", unit="개 과제",
                                      selected=[tech] if tech else [], note="한 과제가 여러 기술에 중복 집계")
    charts.render(opt, "i03_bar", tech_h, on_click=_pick_tech)
    st.pills("기술 선택", tc.topic_name.tolist(), key=TECH, label_visibility="collapsed", on_change=_tech_chip)
with y_left, chart_card("I04", key="i04-year", title="연도별 국가 R&D 과제 · 방산 태그",
                        subtitle="대표 시작 연도 · 빨강 = 방산 태그 과제", n=int(by_year.total.sum()),
                        table=by_year.rename(columns={"representative_start_year": "시작 연도", "defense": "방산 태그",
                                                      "other": "그 외", "total": "합계"})):
    opt, h = charts.stacked_vbar(by_year.representative_start_year.tolist(),
                                 [("방산 태그 과제", by_year.defense.tolist(), "defense"),
                                  ("그 외 과제", by_year.other.tolist(), "other")], unit="개 과제",
                                 height=tech_h)          # 옆 기술 그래프와 높이 맞춤
    charts.render(opt, "i04_year", h)

app = st.session_state.get(APP) if tech else None
if tech:
    m = I.tech_application_matrix(topics)
    row = m.loc[[tech]]
    note(f"'{tech}' 과제의 활용 분야 · 셀 = 두 태그를 함께 가진 과제 수 · 칸을 누르면 아래 '연구 과제 탐색'에 그 과제가 나옵니다")
    opt, h = charts.heatmap(row.columns.tolist(), [tech], row.values.tolist(), unit="개 과제",
                            selected_x=app, click_x=True, x_font=theme.px("label"))   # 활용 분야 이름은 가로 한 줄, 글자 한 단계 작게(요청 AL)
    charts.render(opt, "i03_heat", h, on_click=_pick_app)

# 연구 과제 탐색: 펼치면 전체 과제, 기술·활용 분야를 고르면 자동으로 펼쳐지고 조건이 걸림. 10개씩
found = I.projects_for(projects, topics, tech, app)
scope = f"{tech} × {app}" if app else (tech or "전체 과제")
# 제목·키를 고정해 다시 만들어지지 않게(요청 AB8: 기술·활용 분야를 누를 때 닫히거나 화면이 튀지 않게, 02와 같은 방식). 조건·건수는 안쪽에
with card_fold("연구 과제 탐색", EXPLORE):
    with card_bar("i03_page_size", 10, EX_PAGE) as size:
        st.html(f'<p class="context-line">조건 · <b>{escape(scope)}</b> · 최근 기준연도 → 정부 투자액 순</p>', width="stretch")
        if tech:
            st.button("조건 해제(전체 과제)", key="i03_clear", type="tertiary", icon=":material/close:",
                      on_click=lambda: st.session_state.update({TECH: None, APP: None, EX_PAGE: 0}))
    no = pager(EX_PAGE, len(found), size, label="개 과제")
    rows, _ = paginate(found, no, size)
    for r in rows.itertuples():
        mark = badge("방산 태그", "defense") if r.defense_flag == 1 else ""
        st.html(f'<div class="evidence-row"><p class="evidence-row__title">{escape(r.project_title)} {mark}</p>'
                f'<p class="evidence-row__meta">{escape(str(r.lead_institution))} · {r.representative_start_year}~'
                f'{r.latest_reference_year} · {escape(str(r.ministry or ""))}</p></div>')
