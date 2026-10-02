"""인터랙티브 표 (streamlit-aggrid) — DESIGN §11.4. 행 호버·정렬·필터·검색.

표는 iframe 안에서 그려져 CSS 변수를 못 읽으므로 theme.color()의 실제 값을 AG Grid 테마 파라미터로 넘긴다.
"""
import pandas as pd
from st_aggrid import AgGrid, GridOptionsBuilder, StAggridTheme

from core import theme

ROW_H, HEADER_H, MAX_ROWS = 36, 36, 10


def _grid_theme() -> StAggridTheme:
    c = lambda n: theme.color(n)  # noqa: E731
    return StAggridTheme(base="quartz").withParams(
        backgroundColor=c("surface"), foregroundColor=c("text"), headerBackgroundColor=c("surface-2"),
        headerTextColor=c("text-2"), rowHoverColor=c("accent-soft"), selectedRowBackgroundColor=c("accent-soft"),
        borderColor=c("border"), accentColor=c("primary"), oddRowBackgroundColor=c("surface"),
        fontFamily=theme.FONT_SANS, fontSize=theme.px("body-small"), headerFontSize=theme.px("caption"),
        headerFontWeight=700, wrapperBorderRadius=theme.CHART["cell_radius"] * 2, rowHeight=ROW_H,
        headerHeight=HEADER_H, spacing=6, browserColorScheme=theme.mode())


def table(df: pd.DataFrame, key: str, *, max_rows: int = MAX_ROWS) -> None:
    """정렬·필터 가능한 표. 행이 많으면 max_rows 높이로 내부 스크롤."""
    gb = GridOptionsBuilder.from_dataframe(df)
    gb.configure_default_column(sortable=True, filter=True, resizable=True, wrapText=True, autoHeight=True,
                                minWidth=90, flex=1)
    gb.configure_grid_options(animateRows=True, suppressCellFocus=True, enableCellTextSelection=True)
    height = HEADER_H + ROW_H * min(len(df), max_rows) + 16
    AgGrid(df, gridOptions=gb.build(), theme=_grid_theme(), height=max(height, HEADER_H + ROW_H + 16),
           key=f"{key}-{theme.mode()}", show_toolbar=len(df) > max_rows, show_search=True,
           show_download_button=False, update_on=[],
           # Streamlit 1.64에서 iframe 안 그리드 폭이 0으로 계산되는 문제 보정(실측 2026-09-30)
           custom_css={"#gridContainer": {"width": "100% !important"}})
