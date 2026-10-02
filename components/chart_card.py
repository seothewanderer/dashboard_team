"""ChartCard (DESIGN §6.17, plan.md 8.1): 제목·부제 → 본문 → 출처/단위/분모 한 줄 → '근거 자세히'.

'근거 자세히'에는 한계, 결측 규칙으로 제외한 컬럼(quality_audit 자동), 숫자 표(키보드·스크린리더 대안)를 둔다.
"""
from contextlib import contextmanager
from html import escape

import pandas as pd
import streamlit as st

from components import tables
from content.module_meta import MODULE_META, caption
from core import export_mode
from core.data_loader import load_table


@contextmanager
def chart_card(meta_id: str, *, key: str | None = None, title: str | None = None, subtitle: str = "",
               table: pd.DataFrame | None = None, n: int | None = None, badge: str = ""):
    meta = MODULE_META[meta_id]
    with st.container(key=f"chart-card-{key or meta_id}"):
        st.html(f'<div class="chart-card__head"><p class="chart-card__title">{escape(title or meta["title"])}{badge}</p>'
                + (f'<p class="chart-card__subtitle">{escape(subtitle)}</p>' if subtitle else "") + "</div>")
        yield
        st.html(f'<p class="chart-card__footer">{escape(caption(meta_id, n))}</p>')
        with st.expander("근거 자세히"):
            st.caption(meta["limitation"])
            excluded = _excluded_columns(meta.get("raw", []))
            if excluded:
                st.caption("결측이 많아 제외한 항목: " + ", ".join(excluded))
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
