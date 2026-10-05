"""인터랙티브 표 (streamlit-aggrid) — DESIGN §11.4. 행 호버·정렬·필터·검색.

표는 iframe 안에서 그려져 CSS 변수를 못 읽으므로 theme.color()의 실제 값을 AG Grid 테마 파라미터로 넘긴다.
"""
import math

import pandas as pd
from st_aggrid import AgGrid, GridOptionsBuilder, StAggridTheme

from core import theme

ROW_H, HEADER_H, MAX_ROWS = 36, 36, 10
# 표 높이 어림(요청 AP 수정): 줄바꿈되는 긴 글의 줄 수 = 글자 수 × 글자 폭 ÷ 열 폭. 넉넉하게 잡는다(모자라면 표 안 스크롤)
EST_W, CHAR_W, LINE_H, CELL_PAD = 1080, 14, 21, 24   # 표 폭(팝업·본문 기준), 글자 폭, 줄 높이, 칸 위아래 여백


def _est_height(df: pd.DataFrame, max_rows: int, min_col_w: int) -> int:
    """긴 글이 줄바꿈된 행 높이를 어림해 표 전체 높이(머리 + max_rows 줄까지)를 정한다."""
    col_w = max(min_col_w, EST_W / max(len(df.columns), 1)) - 2 * 12          # 칸 안쪽 여백 제외
    lines = lambda v: max(1, math.ceil(len(str(v)) * CHAR_W / col_w))      # noqa: E731
    head = max(HEADER_H, max(lines(c) for c in df.columns) * LINE_H + 14)
    rows = [max(ROW_H, max(lines(v) for v in r) * LINE_H + CELL_PAD) for r in df.head(max_rows).itertuples(index=False)]
    return head + sum(rows) + 16


def _grid_theme() -> StAggridTheme:
    c = lambda n: theme.color(n)  # noqa: E731
    return StAggridTheme(base="quartz").withParams(
        backgroundColor=c("surface"), foregroundColor=c("text"), headerBackgroundColor=c("surface-2"),
        headerTextColor=c("text-2"), rowHoverColor=c("accent-soft"), selectedRowBackgroundColor=c("accent-soft"),
        borderColor=c("border"), accentColor=c("primary"), oddRowBackgroundColor=c("surface"),
        fontFamily=theme.FONT_SANS, fontSize=theme.px("body-small"), headerFontSize=theme.px("caption"),
        headerFontWeight=700, wrapperBorderRadius=theme.CHART["cell_radius"] * 2, rowHeight=ROW_H,
        headerHeight=HEADER_H, spacing=6, browserColorScheme=theme.mode())


def table(df: pd.DataFrame, key: str, *, max_rows: int = MAX_ROWS, min_col_w: int = 90) -> None:
    """정렬·필터 가능한 표. 높이는 줄바꿈된 긴 글까지 어림해 맞추고(요청 AP), max_rows 넘는 행은 표 안 스크롤.
    min_col_w: 열 최소 폭. 열들의 최소 폭 합이 표 폭보다 크면 표 아래에 가로 스크롤바가 생긴다(요청 AO)."""
    gb = GridOptionsBuilder.from_dataframe(df)
    gb.configure_default_column(sortable=True, filter=True, resizable=True, wrapText=True, autoHeight=True,
                                minWidth=min_col_w, flex=1, wrapHeaderText=True, autoHeaderHeight=True)   # 긴 열 이름(공고 제목)도 다 보이게(요청 AO)
    gb.configure_grid_options(animateRows=True, suppressCellFocus=True, enableCellTextSelection=True)
    # AG Grid 자동 높이(height=None)는 팝업 안에서 iframe 높이가 0으로 남아 표가 사라지는 일이 있어(요청 AQ) 높이를 직접 어림
    height = _est_height(df, max_rows, min_col_w) + (16 if min_col_w > 90 else 0)   # 가로 스크롤바 자리
    AgGrid(df, gridOptions=gb.build(), theme=_grid_theme(), height=height,
           key=f"{key}-{theme.mode()}", show_toolbar=len(df) > max_rows, show_search=True,
           show_download_button=False, update_on=[],
           # Streamlit 1.64에서 iframe 안 그리드 폭이 0으로 계산되는 문제 보정(실측 2026-09-30)
           custom_css={"#gridContainer": {"width": "100% !important"}})
