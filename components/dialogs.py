"""상세 팝업 (plan.md 8.3, research 3.4·8.2). st.dialog는 한 번에 하나라 팝업 하나(detail)가
state.dialog의 kind/id에 따라 내용을 바꾼다: job · posting · company. (기업 더보기 팝업은 카드 넘기기로 바뀌어 삭제, 요청 W2)
app.py가 매 실행 끝에 render_open()을 호출해 열린 팝업을 유지하고, 닫으면 상태를 비운다.
"""
from html import escape

import pandas as pd
import streamlit as st

from analytics import postings as P
from analytics.common import split_tags
from components import tables
from components.badges import badge, defense_badge, draft_badge
from components.icon_button import icon_button
from core import routing, state
from core.data_loader import load_table
from core.datasets import company_frame, job_frame, posting_frame


def open_dialog(kind: str, eid: str | None, return_to: str | None = None) -> None:
    st.session_state["dialog"] = {"kind": kind, "id": eid, "return_to": return_to}


def _close() -> None:
    st.session_state["dialog"] = {"kind": None, "id": None, "return_to": None}


def _switch(kind: str, eid: str | None, return_to: str | None = None) -> None:
    open_dialog(kind, eid, return_to)
    st.rerun(scope="fragment")


def _go(page_key: str, sub: str | None = None, handoff: dict | None = None) -> None:
    _close()
    routing.go(page_key, sub=sub, handoff=handoff)


def _head(title: str, eyebrow: str = "", badges: str = "") -> None:
    st.html(f'<div class="dlg-head"><p class="dlg-head__eyebrow">{escape(eyebrow)}</p>'
            f'<p class="dlg-head__title">{escape(title)}</p><div class="dlg-head__badges">{badges}</div></div>')


def _section(label: str, body_html: str) -> None:
    st.html(f'<div class="dlg-sec"><p class="dlg-sec__label">{escape(label)}</p>{body_html}</div>')


def _p(text) -> str:
    return f'<p class="dlg-sec__text">{escape(str(text))}</p>' if isinstance(text, str) and text.strip() else ""


def _scrap(kind: str, eid: str, title: str) -> None:
    on = state.is_scrapped(kind, eid)
    if icon_button("bookmark", on, "스크랩됨" if on else "스크랩", f"dlg:{kind}:{eid}:scrap"):   # 카드와 같은 책갈피(요청 L3)
        state.toggle_scrap(kind, eid, title)
        st.rerun(scope="fragment")


# ---------------- 직무 (J02·J03) ----------------
def _job(job_id: str) -> None:
    row = job_frame().set_index("job_id").loc[job_id]
    _head(row.job_title_ko, f"{row.major_category} · {row.middle_category}", badge(row.evidence_type, "neutral"))
    _section("핵심 업무", _p(row.core_duties))
    st.html('<p class="dlg-sec__label">필요 기술 · 누르면 준비 역량에서 관련 교육을 찾습니다</p>')
    with st.container(horizontal=True, key=f"dlg-job-skills-{job_id}"):
        for s in row.skills:
            if st.button(s, key=f"dlg:job:{job_id}:skill:{s}", type="secondary"):
                _go("learning", handoff={"job_id": job_id, "skill": s})
    _section("우대 자격(원문)", _p(row.preferred_qualifications))
    _section("근무처 유형", _p(" · ".join(row.workplaces)))
    examples = load_table("job_employer_examples").query("job_id == @job_id")["employer_example"].tolist()
    if examples:
        _section("기업 예시 · 현재 채용 사실이 아닙니다", _p(" · ".join(examples)))
    cases = load_table("job_posting_examples").query("job_id == @job_id")
    for c in cases.itertuples():
        _section("실제 공고 사례", _p(f"{c.actual_employer} · {c.actual_posting_title} · 급여 {c.salary_original_text}"))
        st.link_button("공고 원문", c.actual_posting_url, type="tertiary", icon=":material/open_in_new:")
    src = row.primary_source_name if isinstance(row.primary_source_name, str) else ""
    st.caption(f"출처 {src} · 정리일 {row.collected_date}")
    with st.container(horizontal=True):
        goal = st.session_state["plan"]["goal_job_id"] == job_id
        if icon_button("star", goal, "선택됨" if goal else "해당 직무 선택", f"dlg:job:{job_id}:goal"):   # 요청 L2
            state.select_goal(None if goal else job_id, row.job_title_ko)
            st.rerun(scope="fragment")


# ---------------- 공고 (H04·H06) ----------------
def _posting(posting_id: str) -> None:
    row = posting_frame().set_index("posting_id").loc[posting_id]
    _head(row.title, f"{row.employer_name} · {row.province_name} {row.district_name or ''}",
          badge("수집 공고 · 현재 모집 상태 미확인", "neutral") + defense_badge(row.defense_group))
    _section("담당 업무(원문)", _p(row.responsibilities) or _p("원문에 업무 설명이 없습니다."))
    _section("경력(원문)", _p(row.career_requirement_raw) or _p(row.career_type))
    _section("학력(원문)", _p(row.education_raw) or _p(row.education_normalized))
    _section("급여(원문)", _p(row.salary_raw) or _p("원문에 급여 표기가 없습니다."))
    _section("고용형태", _p(", ".join(row.employment_types)))
    if isinstance(row.verification_note, str):
        st.caption(f"검증 메모: {row.verification_note}")
    st.html('<p class="dlg-sec__label">내 조건과 비교 · 점수가 아닌 항목별 확인</p>')
    tables.table(P.compare_to_profile(row, st.session_state["profile"]), key=f"dlg-cmp-{posting_id}")
    with st.container(horizontal=True):
        st.link_button("공고 원문", row.primary_source_url, type="tertiary", icon=":material/open_in_new:")
        _scrap("posting", posting_id, row.title)
        if pd.notna(row.company_id):
            if st.button("연결 기업 보기", key=f"dlg:posting:{posting_id}:company", type="tertiary"):
                _switch("company", row.company_id, return_to=f"posting:{posting_id}")
            st.html(draft_badge(row.link_status))


# ---------------- 기업 (C02·C03) ----------------
def _company(company_id: str) -> None:
    row = company_frame().set_index("company_id").loc[company_id]
    extra = badge("드론 활동 근거 미확인", "neutral") if row.drone_evidence_missing else ""
    _head(row.company_name_normalized, row.defense_group, defense_badge(row.defense_group) + extra)
    has_other = bool(row.has_profile)
    if row.has_dart:
        _section("기업 소개(DART 사업보고서 발췌)", _p(row.dart_intro_excerpt))
        st.caption(f"{row.dart_report_name} · 회사 전체 소개이며 드론 전담 사업이 아닐 수 있습니다.")
    elif has_other:
        st.caption("수집된 DART 자료 없음")
    if has_other:
        _section("사업 분야", "".join(badge(a, "neutral") for a in row.areas) or _p("분야 미수록"))
        _section("드론 세부 분야", _p(row.drone_subfields))
        _section("제품·서비스(원문)", _p(split_tags(row.products_services)[0] if isinstance(row.products_services, str) else ""))
        if isinstance(row.track_record, str):
            _section("사업·연구·납품 실적(원문)", _p(row.track_record))
        st.caption(f"드론정보포털 기준일 {row.reference_date} · 출처 확인일 {row.source_checked_date} · 주소·근무지 정보는 "
                   "결측이 많아 표시하지 않습니다.")
    if not (row.has_dart or has_other):
        st.info("현재 보유 자료에서 제공할 수 있는 상세 정보가 없습니다.")
    ledger = load_table("defense_evidence").query("company_id == @company_id")
    if len(ledger):
        st.html('<p class="dlg-sec__label">국방·연구·납품 근거 · 서로 다른 근거를 합산하지 않습니다</p>')
        tables.table(ledger[["evidence_type", "evidence_strength", "evidence_detail", "as_of_date", "caveat"]].rename(
            columns={"evidence_type": "근거 종류", "evidence_strength": "강도", "evidence_detail": "내용",
                     "as_of_date": "시점", "caveat": "해석 제한"}), key=f"dlg-ledger-{company_id}")
    with st.container(horizontal=True):
        if isinstance(row.homepage, str) and row.homepage.startswith("http"):
            st.link_button("홈페이지", row.homepage, type="tertiary", icon=":material/open_in_new:")
        _scrap("company", company_id, row.company_name_normalized)
        if row.has_posting and st.button(f"수집 공고 {row.posting_count}건 보기", key=f"dlg:company:{company_id}:postings",
                                         type="primary"):
            _go("recruit", sub="postings", handoff={"company_id": company_id})
        if st.button("기업 탐색에서 보기", key=f"dlg:company:{company_id}:explore", type="tertiary"):
            _go("recruit", sub="companies", handoff={"company_ids": [company_id]})


RENDER = {"job": _job, "posting": _posting, "company": _company}


@st.dialog("상세 보기", width="large", on_dismiss=_close)
def _detail() -> None:
    d = st.session_state["dialog"]
    back = d.get("return_to")
    if back:
        if st.button("이전 상세로", key="dlg:back", type="tertiary", icon=":material/chevron_left:"):
            kind, _, eid = back.partition(":")
            _switch(kind, eid or None)
    RENDER[d["kind"]](d["id"])


def render_open() -> None:
    if st.session_state["dialog"]["kind"]:
        _detail()
