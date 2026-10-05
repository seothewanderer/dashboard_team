"""ChartCard (DESIGN §6.17, plan.md 8.1): 제목·부제 → 본문 → 표본·기준일·출처 한 줄 → '그래프 해설'.

'그래프 해설'(요청 AE2, 예전 '근거 자세히'): 내용 · 주요 수치(현재 조건 기준 계산) · 읽는 법·주의 ·
기준(표본·분모·단위·기준일·출처·적용 조건·결측 제외 항목)을 개조식으로. 숫자 표(키보드·스크린리더 대안)는 그 안에 그대로.
"""
from contextlib import contextmanager
from html import escape

import pandas as pd
import streamlit as st

from analytics.insights import insights
from components import tables
from content.chart_explain import EXPLAIN
from content.module_meta import MODULE_META
from core import export_mode
from core.data_loader import load_table


def _basis_line(meta: dict, ex: dict, n: int | None) -> str:
    """그래프 아래 늘 보이는 한 줄(요청 AE2): 표본 · 기준일 · 출처."""
    parts = ([f"표본 {n:,}"] if n is not None else []) + [f"기준 {ex['as_of']}", f"출처 {ex['src']}"]
    return " · ".join(parts)


def _ul(items: list[str]) -> str:
    return "<ul class=\"cx__list\">" + "".join(f"<li>{escape(i)}</li>" for i in items) + "</ul>"


def _explain(meta_id: str, meta: dict, ex: dict, table: pd.DataFrame | None, n: int | None) -> None:
    found = insights(table, ex.get("insight"), n)
    excluded = _excluded_columns(meta.get("raw", []))
    basis = [f"표본 {n:,} · 분모 {meta['denominator']}" if n is not None else f"분모 {meta['denominator']}",
             f"단위 {meta['unit']}", f"기준일 {ex['as_of']}", f"출처 {meta['source']}", f"적용 조건 {meta['filter_scope']}"]
    if excluded:
        basis.append("비어 있는 값이 많아 제외한 항목: " + ", ".join(excluded))
    st.html('<div class="cx">'
            '<p class="cx__label">내용</p>' + _ul([ex["what"]])
            + ('<p class="cx__label">주요 수치 · 현재 조건 기준</p>' + _ul(found) if found else "")
            + '<p class="cx__label">읽는 법 · 주의</p>' + _ul(ex["read"])
            + '<p class="cx__label">기준</p>' + _ul(basis) + "</div>")


@contextmanager
def chart_card(meta_id: str, *, key: str | None = None, title: str | None = None, subtitle: str = "",
               table: pd.DataFrame | None = None, n: int | None = None, badge: str = ""):
    meta, ex = MODULE_META[meta_id], EXPLAIN[meta_id]
    with st.container(key=f"chart-card-{key or meta_id}"):
        st.html(f'<div class="chart-card__head"><p class="chart-card__title">{escape(title or meta["title"])}{badge}</p>'
                + (f'<p class="chart-card__subtitle">{escape(subtitle)}</p>' if subtitle else "") + "</div>")
        yield
        st.html(f'<p class="chart-card__footer">{escape(_basis_line(meta, ex, n))}</p>')
        with st.expander("그래프 해설"):
            _explain(meta_id, meta, ex, table, n)
            if table is not None and export_mode.on():
                st.table(table.set_index(table.columns[0]))      # 정적 공유본: HTML 표로 남긴다
            # 표(AgGrid iframe)는 무거워 요청할 때만 불러온다(접힌 영역도 매번 로드되는 문제)
            elif table is not None and st.toggle("표로 보기", key=f"cc-show-{key or meta_id}"):
                tables.table(table, key=f"cc-{key or meta_id}")


def _excluded_columns(raw_files: list[str]) -> list[str]:
    if not raw_files:
        return []
    audit = load_table("quality_audit")
    rows = audit[audit["source"].isin(raw_files) & audit["status"].str.startswith("exclude")]
    return [f"{c}({r:.0%})" for c, r in zip(rows["column"], rows["missing_rate"])]
