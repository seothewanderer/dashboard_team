"""공통 카드 (research 3.4, plan.md 8.2). 앞면: 필수 정보 + 스크랩 + 대표 행동 1개. 상세는 dialogs.

방산 관련 카드(기업·공고 = 방산 근거 기업, 직무 = 방산기업 근무처)는 항상 빨강 테두리·띠 + 배지(요청 F2·F6).
방산 강조(ui.highlight_defense)를 켜면 일반 카드를 흐리게 한다. 건수는 바꾸지 않고, 순서는 관련 카드를 앞으로
(filters.highlight_first, 요청 AD1 — 예전 DESIGN §9.2 '순서 불변'을 사용자 요청으로 바꿈).
목표 직무 관련 강조(ui.highlight_goal, 요청 F5)를 켜면 row.goal_reason이 있는 카드는 녹색 띠 + 이유 배지,
없는 카드는 옅게. goal_reason 열이 없으면(판단하지 않는 화면) 표시하지 않는다.
"""
from html import escape

import pandas as pd
import streamlit as st

from analytics.common import split_tags
from analytics.defense import TIER
from analytics.jobs import workplaces_summary
from components import dialogs
from components.badges import badge, defense_badge, defense_job_badge
from components.icon_button import icon_button
from core import state

MAX_TAGS = 3


def _tags(items: list[str], n: int = MAX_TAGS) -> str:
    shown = "".join(badge(t, "neutral") for t in items[:n])
    return shown + (badge(f"+{len(items) - n}", "neutral") if len(items) > n else "")


def _frame_key(kind: str, eid: str, defense: bool | None = None, row: pd.Series | None = None,
               picked: bool = False, drone: bool = False) -> str:
    """카드 컨테이너 키 = 표시 상태(base.css가 읽음). defense None = 방산 판단 대상 아님.
    picked = 스크랩·선택한 카드(떠오름 + 초록 그림자, 요청 L4), drone = 드론 관련 교육(초록 띠, 요청 L5)."""
    ui = st.session_state["ui"]
    tone = "-defense" if defense else ("-muted" if defense is not None and ui["highlight_defense"] else "")
    tone += "-drone" if drone else ""
    if ui.get("highlight_goal") and row is not None and "goal_reason" in row.index:
        tone += "-goal" if isinstance(row["goal_reason"], str) else "-faded"
    tone += "-picked" if picked else ""
    return f"card-{kind}{tone}-{eid}"


def _goal_badge(row: pd.Series) -> str:
    reason = row.get("goal_reason") if st.session_state["ui"].get("highlight_goal") else None
    return badge(f"목표 직무 관련 · {reason}", "goal") if isinstance(reason, str) else ""


def _scrap_button(kind: str, eid: str, title: str) -> None:
    """교육·공고·기업 카드의 대표 행동 = 스크랩(책갈피, 요청 L3)."""
    on = state.is_scrapped(kind, eid)
    icon_button("bookmark", on, "스크랩됨" if on else "스크랩", f"{kind}:{eid}:scrap",
                on_click=state.toggle_scrap, args=(kind, eid, title))


def _body(title: str, eyebrow: str, lines: list[str], tags_html: str = "", meta: str = "") -> None:
    st.html(f'<div class="card"><p class="card__eyebrow">{escape(eyebrow)}</p>'
            f'<p class="card__title">{escape(title)}</p>'
            + "".join(f'<p class="card__line">{escape(l)}</p>' for l in lines if l)
            + (f'<div class="card__tags">{tags_html}</div>' if tags_html else "")
            + (f'<p class="card__meta">{meta}</p>' if meta else "") + "</div>")


def job_card(row: pd.Series) -> None:
    goal = st.session_state["plan"]["goal_job_id"] == row.job_id
    with st.container(key=_frame_key("job", row.job_id, bool(row.defense_workplace), picked=goal)):
        _body(row.job_title_ko, f"{row.major_category} · {row.middle_category}",
              [row.core_duties, f"근무처 {workplaces_summary(row)}"],
              defense_job_badge(row.defense_workplace) + _tags(row.skills), escape(row.evidence_type))
        with st.container(horizontal=True, key=f"job-actions-{row.job_id}"):
            st.button("상세 보기", key=f"job:{row.job_id}:open", type="tertiary", icon=":material/open_in_full:",
                      on_click=dialogs.open_dialog, args=("job", row.job_id))
            icon_button("star", goal, "선택됨" if goal else "해당 직무 선택", f"job:{row.job_id}:goal",   # 요청 L2
                        on_click=state.select_goal, args=(None if goal else row.job_id, row.job_title_ko))


def posting_card(row: pd.Series) -> None:
    with st.container(key=_frame_key("posting", row.posting_id, bool(TIER.get(row.defense_group)), row,
                                     picked=state.is_scrapped("posting", row.posting_id))):
        _body(row.title, f"{row.employer_name} · {row.province_name} {row.district_name or ''}".strip(),
              [f"{row.job_major_category} · 경력 {row.career_type} · 학력 {row.education_normalized}",
               str(row.responsibilities)[:80] if isinstance(row.responsibilities, str) else ""],
              defense_badge(row.defense_group) + _goal_badge(row), "수집 공고 · 현재 모집 상태 미확인")
        with st.container(horizontal=True, key=f"posting-actions-{row.posting_id}"):
            st.button("상세 보기", key=f"posting:{row.posting_id}:open", type="tertiary", icon=":material/open_in_full:",
                      on_click=dialogs.open_dialog, args=("posting", row.posting_id))
            _scrap_button("posting", row.posting_id, row.title)


def company_card(row: pd.Series) -> None:
    group_badge = defense_badge(row.defense_group)
    extra = badge("드론 활동 근거 미확인", "neutral") if row.drone_evidence_missing else ""
    with st.container(key=_frame_key("company", row.company_id, bool(TIER.get(row.defense_group)), row,
                                     picked=state.is_scrapped("company", row.company_id))):
        subfields = split_tags(row.get("drone_subfields"))
        _body(row.company_name_normalized, f"사업 분야 {len(row.areas)}개" if row.areas else "분야 미수록",
              [" · ".join(subfields[:2]) if subfields else "사업 정보 미수록"],
              group_badge + _goal_badge(row) + _tags(row.areas) + extra,
              ("수집 공고 연결 " + str(row.posting_count) + "건") if row.has_posting else "수집 공고 미연결")
        with st.container(horizontal=True, key=f"company-actions-{row.company_id}"):
            st.button("상세 보기", key=f"company:{row.company_id}:open", type="tertiary", icon=":material/open_in_full:",
                      on_click=dialogs.open_dialog, args=("company", row.company_id))
            _scrap_button("company", row.company_id, row.company_name_normalized)


def course_card(row: pd.Series) -> None:
    title = row.course_name
    drone = row.get("source_group") == "drone"                # 1차 드론 수집 과정(요청 L5)
    with st.container(key=_frame_key("course", row.course_id, None, row, picked=state.is_scrapped("course", row.course_id),
                                     drone=drone)):   # 교육은 방산 표시 제외(결정 2)
        where = "원격" if row.remote_mode == "원격" else (row.province_std or "지역 미수록")
        when = (f"{row.date_status} · {row.start_date:%Y-%m-%d}~{row.end_date:%Y-%m-%d}"
                if pd.notna(row.start_date) else "일정 미수록")
        reasons = (badge("드론 교육", "drone") if drone else "") + _goal_badge(row) + _tags(list(row.relevance) + list(row.reasons), 4)
        _body(title, f"{row.institution_name} · {where} · {row.total_training_hours:g}시간",
              [f"대표 회차 {when}"], reasons, "날짜 기준 상태 · 모집 여부는 원문에서 확인")
        with st.container(horizontal=True, key=f"course-actions-{row.course_id}"):
            if isinstance(row.course_url, str) and row.course_url:
                st.link_button("원문 보기", row.course_url, type="tertiary", icon=":material/open_in_new:")
            else:
                st.caption("원문 링크 미수집")
            _scrap_button("course", row.course_id, title)


def grid(rows: pd.DataFrame, render, cols: int = 2, **kwargs) -> None:
    columns = st.columns(cols, gap="small")
    for i, (_, row) in enumerate(rows.iterrows()):
        with columns[i % cols]:
            render(row, **kwargs)

