"""ECharts 차트 (streamlit-echarts) — design/DESIGN.md §8·§9·§11.3 (Green Deck).

- 색·치수·움직임은 core/theme.py 에서만 가져온다(color()/CHART/MOTION).
- 호버: 가리킨 표시만 밝은 녹색 + 글로우(다른 표시는 그대로 — 흐림 효과는 제거, 2026-09-30 요청). 툴팁에 값·비율·순위.
- 선택(클릭·칩)된 상태에서만 선택 외 표시를 옅게 한다(호버와 무관).
- 클릭은 on_click(name) 콜백으로 전달한다(필터 칩과 같은 상태를 바꾸는 용도, plan 8.4).
- 방산 표시(요청 F2, DESIGN §12.1): 방산 = 빨강 그라데이션 + 45° 빗금(색각 보조), 후보 = 옅은 빨강 + 빗금,
  일반 = 녹색 그라데이션. 강조 ON이면 일반은 흐린 회색. 누적·양쪽 비교 막대는 범례 필수.
"""
import functools
import json
import math
from collections.abc import Callable

import streamlit as st
from streamlit_echarts import JsCode, Map, st_echarts

from core import export_mode, theme
from core.config import ROOT

G = theme.CHART
ROW_H, BAR_W = G["row_h"], G["bar_w"]

CLICK_JS = "function(p){return {name: p.name, series: p.seriesName, t: Date.now()};}"

# 대한민국 시·도 지도 (요청 E3): KOSTAT 2013 시·도 경계 단순화 GeoJSON(data/reference). 이름은 자료의 짧은 표기로 바꾼다
GEO_FILE = ROOT / "data" / "reference" / "skorea_provinces_geo_simple.json"
GEO_SOURCE = "지도 경계: KOSTAT 2013 시·도(southkorea-maps 단순화)"
REGION_SHORT = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주",
                "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기", "강원도": "강원",
                "충청북도": "충북", "충청남도": "충남", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
                "경상남도": "경남", "제주특별자치도": "제주"}
REGIONS = list(REGION_SHORT.values())
# 라벨 위치(경도, 위도). 도 = 경계 안, 광역시·세종 = 경계 밖으로 빼고 지시선으로 연결(첨부 예시처럼 겹침 방지)
LABEL_AT = {"경기": (127.45, 37.2), "강원": (128.3, 37.65), "충북": (127.8, 36.8), "충남": (126.8, 36.35),
            "전북": (127.15, 35.72), "전남": (126.95, 34.85), "경북": (128.75, 36.5), "경남": (128.25, 35.3),
            "제주": (126.55, 33.38),
            "서울": (126.25, 37.95), "인천": (125.55, 37.4), "세종": (126.55, 36.8), "대전": (127.8, 36.12),
            "광주": (126.2, 35.35), "대구": (128.3, 35.72), "울산": (129.8, 35.72), "부산": (129.55, 34.95)}
CITY_AT = {"서울": (126.98, 37.56), "인천": (126.65, 37.46), "세종": (127.29, 36.56), "대전": (127.39, 36.35),
           "광주": (126.85, 35.16), "대구": (128.6, 35.87), "울산": (129.31, 35.54), "부산": (129.07, 35.18)}
MAP_NAME = "korea"


def c(name: str) -> str:
    return theme.color(name, theme.mode())


def echarts_theme() -> dict:
    axis_label = {"color": c("chart-axis"), "fontSize": theme.px("caption"), "fontFamily": theme.FONT_SANS}
    axis = {"axisLine": {"show": False}, "axisTick": {"show": False}, "axisLabel": axis_label,
            "splitLine": {"lineStyle": {"color": c("chart-grid")}}}
    return {
        "color": [c("chart-primary")], "backgroundColor": "transparent",
        "textStyle": {"fontFamily": theme.FONT_SANS, "color": c("chart-axis"), "fontSize": theme.px("caption")},
        "categoryAxis": {**axis, "splitLine": {"show": False}}, "valueAxis": axis,
        "tooltip": {"backgroundColor": c("tip-bg"), "borderColor": c("tip-bg"), "borderWidth": 0,
                    "padding": G["tip_pad"],
                    "textStyle": {"color": c("tip-fg"), "fontSize": G["tip_font"], "fontFamily": theme.FONT_SANS},
                    "extraCssText": f"border-radius:{G['tip_radius']}px;box-shadow:{theme.BASE['--shadow-tip']};"},
    }


def _motion() -> dict:
    if export_mode.on():            # 정적 공유본 캡처: 최종 모습으로 바로 그린다
        return {"animation": False}
    m = theme.MOTION
    return {"animationDuration": m["chart_enter_ms"], "animationEasing": m["easing"],
            "animationDurationUpdate": m["chart_update_ms"], "animationEasingUpdate": m["easing"]}


def _glow(color: str) -> dict:
    """호버 강조: 밝은 색 + 같은 색 글로우 (DESIGN §8)."""
    return {"color": color, "shadowBlur": G["glow"], "shadowColor": color}


def _decal() -> dict:
    """방산 빗금: 45°, 캔버스색 선 (DESIGN §9.1)."""
    return {"symbol": "rect", "symbolSize": 1, "color": c("bg"), "dashArrayX": [1, 0], "dashArrayY": [1, 5],
            "rotation": math.pi / 4}


def defense_style(tier: str | None, highlight: bool) -> dict:
    """tier: 'direct' | 'candidate' | None(일반). 방산 막대는 근거 단계와 관계없이 모든 그래프에서 같은 모양
    (진한 빨강 → 빨강 + 빗금, 요청 T3 — 겹친 막대·얇은 막대와 통일)."""
    if tier:
        return {"color": dgrad(), "decal": _decal()}
    return {"color": c("chart-muted") if highlight else grad()}


def defense_emphasis() -> dict:
    """방산 막대 hover: 빨강 그대로 + 빨간 글로우(초록으로 바뀌지 않게, 요청 T3)."""
    return {"itemStyle": {"color": dgrad(), "decal": _decal(), "shadowBlur": G["glow"], "shadowColor": c("defense-strong")},
            "label": {"color": c("defense-strong")}}


def dgrad(horizontal: bool = True) -> dict:
    """방산 막대 그라데이션: 진한 빨강 → 빨강 (DESIGN §12.1)."""
    stops = [{"offset": 0, "color": c("defense-grad-start")}, {"offset": 1, "color": c("defense-grad-end")}]
    return {"type": "linear", "x": 0, "y": 0, "x2": 1 if horizontal else 0, "y2": 0 if horizontal else 1,
            "colorStops": stops}


SERIES_KIND = {  # 누적·비교 막대의 계열 모양: 방산 = 빨강+빗금, 일반 = 녹색, 미연결·그 외 = 회색
    "defense": lambda h: {"color": dgrad(h), "decal": _decal()},
    "general": lambda h: {"color": grad(h)},
    "other": lambda h: {"color": c("chart-muted")},
}


def _legend() -> dict:
    return {"top": 0, "left": 0, "icon": "roundRect", "itemWidth": 12, "itemHeight": 12,
            "textStyle": {"color": c("text-3"), "fontSize": theme.px("caption")}}


def grad(horizontal: bool = True) -> dict:
    """진한 녹색 막대의 그라데이션 (요청 E6, DESIGN §8): 가로 = 왼쪽 진함 → 오른쪽 밝음, 세로 = 위 진함 → 아래 밝음."""
    stops = [{"offset": 0, "color": c("chart-grad-start")}, {"offset": 1, "color": c("chart-grad-end")}]
    return {"type": "linear", "x": 0, "y": 0, "x2": 1 if horizontal else 0, "y2": 0 if horizontal else 1,
            "colorStops": stops}


def _tooltip_js(unit: str, note: str = "") -> JsCode:
    """값 · 표시 합계 대비 비율 · 순위 (data 항목의 share·rank 필드 사용)."""
    extra = f"+'<br/><span style=\"opacity:.7\">{note}</span>'" if note else ""
    return JsCode(
        "function(p){var d=p.data||{};return '<b>'+p.name+'</b><br/>'+"
        f"'<span style=\"font-size:16px;font-weight:700\">'+(d.value!=null?d.value:p.value).toLocaleString()+'</span> {unit}'"
        "+(d.share!=null?'<br/>표시 합계의 '+d.share+'% · '+d.rank+'위':'')"
        f"{extra};}}")


def render(options: dict, key: str, height: int, on_click: Callable[[str], None] | None = None) -> None:
    comp_key = f"{key}-{theme.mode()}"          # 테마가 바뀌면 새 테마로 다시 그림

    def _clicked():
        event = (st.session_state.get(comp_key) or {}).get("chart_event")
        if event and on_click:
            on_click(event["name"])

    is_map = any(s.get("type") == "map" for s in options.get("series", []))
    st_echarts({**_motion(), **options}, theme=echarts_theme(), height=f"{height}px", key=comp_key,
               events={"click": CLICK_JS} if on_click else None, on_change=_clicked if on_click else None,
               map=Map(MAP_NAME, _korea_geo()) if is_map else None)


def hbar(categories: list[str], values: list[float], *, selected: list[str] | None = None,
         tiers: list[str | None] | None = None, highlight: bool = False, unit: str = "",
         tooltip_note: str = "") -> tuple[dict, int]:
    """가로 막대 + 14px 트랙 (DESIGN §11.3). 반환: (옵션, 높이)."""
    selected = selected or []
    total = sum(values) or 1
    order = {v: i + 1 for i, v in enumerate(sorted(set(values), reverse=True))}
    data = []
    for i, (cat, v) in enumerate(zip(categories, values)):
        tier = tiers[i] if tiers else None
        style = {"borderRadius": BAR_W // 2, **defense_style(tier, highlight)}
        if selected and tier is None and not highlight:
            style["color"] = c("chart-highlight") if cat in selected else c("chart-dim")
        data.append({"value": v, "name": cat, "share": round(v / total * 100, 1), "rank": order[v],
                     "itemStyle": style, **({"emphasis": defense_emphasis()} if tier else {})})
    options = {
        "grid": {"left": G["pad"], "right": G["value_gutter"], "top": G["pad_sm"], "bottom": G["pad_sm"],
                 "containLabel": True},
        "xAxis": {"type": "value", "show": False, "max": max(values) if values else 1},
        "yAxis": {"type": "category", "inverse": True,
                  "axisLabel": {"color": c("text-3"), "fontSize": theme.px("body-small"), "width": G["label_w"],
                                "overflow": "truncate"},
                  # 선택된 분류는 축 글자도 굵게 (색만으로 선택을 표시하지 않음)
                  "data": [{"value": cat, "textStyle": {"fontWeight": 700, "color": c("text")} if cat in selected else {}}
                           for cat in categories]},
        "tooltip": {"trigger": "item", "formatter": _tooltip_js(unit, tooltip_note)},
        "series": [{"type": "bar", "data": data, "barWidth": BAR_W, "showBackground": True, "cursor": "pointer",
                    "backgroundStyle": {"color": c("chart-track"), "borderRadius": BAR_W // 2},
                    "label": {"show": True, "position": "right", "color": c("text"), "fontWeight": 700,
                              "fontSize": theme.px("body")},
                    "emphasis": {"itemStyle": _glow(c("chart-highlight")),
                                 "label": {"color": c("chart-highlight")}},
                    "universalTransition": True}],
    }
    return options, ROW_H * max(len(categories), 1) + 2 * G["pad"]


def stacked_hbar(categories: list[str], series: list[tuple[str, list[float], str]], *, unit: str = "",
                 selected: list[str] | None = None) -> tuple[dict, int]:
    """누적 가로 막대(요청 F2): series = (이름, 값 목록, 'defense'|'general'|'other'). 끝에 합계, 범례 표시."""
    selected = selected or []
    totals = [sum(s[1][i] for s in series) for i in range(len(categories))]
    out = []
    for si, (name, values, kind) in enumerate(series):
        last = si == len(series) - 1
        out.append({"type": "bar", "name": name, "stack": "all", "barWidth": BAR_W, "cursor": "pointer",
                    "itemStyle": {**SERIES_KIND[kind](True), "borderColor": c("surface"), "borderWidth": 1},
                    "data": [{"value": v, "name": cat, "total": totals[i],
                              **({"itemStyle": {"opacity": G["dim"]}} if selected and cat not in selected else {})}
                             for i, (cat, v) in enumerate(zip(categories, values))],
                    "label": {"show": last, "position": "right", "color": c("text"), "fontWeight": 700,
                              "fontSize": theme.px("body"), "formatter": JsCode("function(p){return p.data.total;}")},
                    "emphasis": {"focus": "none", "itemStyle": {"shadowBlur": G["glow"], "shadowColor": c(
                        "defense-strong" if kind == "defense" else "chart-highlight")}}})
    options = {
        "legend": _legend(),
        "grid": {"left": G["pad"], "right": G["value_gutter"], "top": 3 * G["pad"] + G["pad_sm"], "bottom": G["pad_sm"],
                 "containLabel": True},
        "xAxis": {"type": "value", "show": False},
        "yAxis": {"type": "category", "inverse": True,
                  "axisLabel": {"color": c("text-3"), "fontSize": theme.px("body-small"), "width": G["label_w"],
                                "overflow": "truncate"},
                  "data": [{"value": cat, "textStyle": {"fontWeight": 700, "color": c("text")} if cat in selected else {}}
                           for cat in categories]},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}, "formatter": JsCode(
            "function(ps){var s='<b>'+ps[0].name+'</b>';ps.forEach(function(p){s+='<br/>'+p.marker+p.seriesName+' '"
            f"+p.value.toLocaleString()+' {unit}';}});return s+'<br/>합계 '+ps[0].data.total.toLocaleString()+' {unit}';}}")},
        "series": out,
    }
    return options, ROW_H * max(len(categories), 1) + 2 * G["pad"] + 3 * G["pad"]


def _thin_base(categories: list[str], selected: list[str], tip: str) -> dict:
    """03 '지도 + 키워드 막대'와 같은 얇은 막대 바탕(요청 N10: 화면 사이 통일): 축 글자·간격·여백이 같다."""
    font = theme.px("caption")
    return {"grid": {"left": G["pad"], "right": G["value_gutter"], "top": G["pad_sm"], "bottom": G["pad_sm"],
                     "containLabel": True},
            "yAxis": {"type": "category", "inverse": True, "axisLine": {"show": False}, "axisTick": {"show": False},
                      "axisLabel": {"color": c("chart-axis"), "fontSize": font},
                      "data": [{"value": k, "textStyle": {"fontWeight": 700, "color": c("text")} if k in selected else {}}
                               for k in categories]},
            "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}, "confine": True, "formatter": JsCode(tip)}}


def thin_split_hbar(categories: list[str], part: tuple[str, list[float]], rest: tuple[str, list[float]], *,
                    unit: str = "", selected: list[str] | None = None) -> dict:
    """얇은 2구분 막대(요청 N10·N11, 04 직무): 합계(초록) 막대 위에 그중 방산(빨강 빗금)을 0부터 겹쳐 그림 —
    이어 붙이지 않아 빨강 끝도 둥글다(01 겹친 막대와 같은 방식). 트랙·굵기·끝 숫자 = 03과 같음."""
    selected = selected or []
    bw, font = G["bar_w"] * 2 // 3, theme.px("caption")
    (pname, pv), (rname, rv) = part, rest
    totals = [a + b for a, b in zip(pv, rv)]
    dim = lambda k: {"opacity": G["dim"]} if selected and k not in selected else {}  # noqa: E731
    data = lambda vals: [{"value": v, "name": k, "part": pv[i], "rest": rv[i], "total": totals[i],  # noqa: E731
                          "itemStyle": dim(k)} for i, (k, v) in enumerate(zip(categories, vals))]
    opt = _thin_base(categories, selected,
                     "function(ps){var d=ps[0].data;return '<b>'+ps[0].name+'</b>'"
                     f"+'<br/>{pname} '+d.part.toLocaleString()+' {unit}<br/>{rname} '+d.rest.toLocaleString()+' {unit}'"
                     f"+'<br/>합계 '+d.total.toLocaleString()+' {unit}';}}")
    opt["xAxis"] = {"type": "value", "show": False, "max": max(totals, default=1) or 1}
    base = {"type": "bar", "barWidth": bw, "barGap": "-100%", "cursor": "pointer"}
    opt["series"] = [
        {**base, "name": rname, "z": 2, "showBackground": True, "backgroundStyle": {"color": c("chart-track"), "borderRadius": bw / 2},
         "itemStyle": {"color": grad(), "borderRadius": bw / 2},
         "label": {"show": True, "position": "right", "color": c("text"), "fontWeight": 700, "fontSize": font,
                   "formatter": JsCode("function(p){return p.data.total.toLocaleString();}")},
         "data": data(totals)},
        {**base, "name": pname, "z": 3, "itemStyle": {"color": dgrad(), "decal": _decal(), "borderRadius": bw / 2},
         "data": data(pv)},
    ]
    return opt


def thin_diverging_hbar(categories: list[str], left: tuple[str, list[float]], right: tuple[str, list[float]], *,
                        unit: str = "%", selected: list[str] | None = None) -> dict:
    """얇은 양쪽 비교 막대(요청 N10, 04 '비율(%)로 보기'): 왼쪽 = 그 외(초록), 오른쪽 = 방산(빨강 빗금). 03 막대와 같은 굵기·간격.
    누적(stack) 대신 같은 줄에 겹쳐 그림: 누적이면 0% 막대가 반대쪽 끝에 붙어 '0%'가 왼쪽으로 쏠림(요청 N13)."""
    selected = selected or []
    bw, font = G["bar_w"] * 2 // 3, theme.px("caption")
    (lname, lv), (rname, rv) = left, right
    vmax = max([*lv, *rv, 1])
    lab = {"show": True, "color": c("text"), "fontWeight": 700, "fontSize": font,
           "formatter": JsCode(f"function(p){{return Math.abs(p.value)+'{unit}';}}")}
    dim = lambda k: {"opacity": G["dim"]} if selected and k not in selected else {}  # noqa: E731
    opt = _thin_base(categories, selected,
                     "function(ps){var s='<b>'+ps[0].name+'</b>';ps.forEach(function(p){s+='<br/>'+p.marker+p.seriesName"
                     f"+' '+Math.abs(p.value)+'{unit}';}});return s+'<br/><span style=\"opacity:.7\">그룹 크기가 달라 비중으로 비교</span>';}}")
    opt["xAxis"] = {"type": "value", "show": False, "min": -vmax * 1.25, "max": vmax * 1.25}
    opt["series"] = [
        {"type": "bar", "name": lname, "barGap": "-100%", "barWidth": bw, "cursor": "pointer",
         "itemStyle": {"color": grad(), "borderRadius": [bw / 2, 0, 0, bw / 2]}, "label": {**lab, "position": "left"},
         "data": [{"value": -v, "name": k, "itemStyle": dim(k)} for k, v in zip(categories, lv)]},
        {"type": "bar", "name": rname, "barGap": "-100%", "barWidth": bw, "cursor": "pointer",
         "itemStyle": {"color": dgrad(), "decal": _decal(), "borderRadius": [0, bw / 2, bw / 2, 0]},
         "label": {**lab, "position": "right"},
         "data": [{"value": v, "name": k, "itemStyle": dim(k)} for k, v in zip(categories, rv)]},
    ]
    return opt


def diverging_hbar(categories: list[str], left: tuple[str, list[float], str], right: tuple[str, list[float], str], *,
                   unit: str = "%", note: str = "") -> tuple[dict, int]:
    """양쪽 비교 막대(요청 F2): 가운데 0 기준 왼쪽 = left, 오른쪽 = right. 값은 각 그룹 안의 비중 등 같은 단위."""
    lname, lvals, lkind = left
    rname, rvals, rkind = right
    vmax = max([*lvals, *rvals, 1])
    options = {
        "legend": _legend(),
        "grid": {"left": G["pad"], "right": G["pad"] * 3, "top": 3 * G["pad"] + G["pad_sm"], "bottom": G["pad"],
                 "containLabel": True},
        "xAxis": {"type": "value", "min": -vmax, "max": vmax,
                  "axisLabel": {"formatter": JsCode(f"function(v){{return Math.abs(v)+'{unit}';}}")}},
        "yAxis": {"type": "category", "inverse": True, "axisLabel": {"color": c("text-3"), "fontSize": theme.px("body-small")},
                  "data": categories},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}, "formatter": JsCode(
            "function(ps){var s='<b>'+ps[0].name+'</b>';ps.forEach(function(p){s+='<br/>'+p.marker+p.seriesName+' '"
            f"+Math.abs(p.value)+'{unit}';}});return s{('+' + repr('<br/><span style="opacity:.7">' + note + '</span>')) if note else ''};}}")},
        "series": [
            {"type": "bar", "name": lname, "stack": "d", "barWidth": BAR_W, "data": [-v for v in lvals],
             "itemStyle": {**SERIES_KIND[lkind](True), "borderRadius": [BAR_W // 2, 0, 0, BAR_W // 2]}},
            {"type": "bar", "name": rname, "stack": "d", "barWidth": BAR_W, "data": list(rvals),
             "itemStyle": {**SERIES_KIND[rkind](True), "borderRadius": [0, BAR_W // 2, BAR_W // 2, 0]}},
        ],
    }
    return options, ROW_H * max(len(categories), 1) + 5 * G["pad"]


def stacked_vbar(categories: list, series: list[tuple[str, list[float], str]], *, unit: str = "",
                 height: int = 320) -> tuple[dict, int]:
    """누적 세로 막대(연도별 등, 요청 F2)."""
    options = {
        "legend": _legend(),
        "grid": {"left": G["pad"], "right": G["pad"], "top": 4 * G["pad"], "bottom": G["pad_sm"], "containLabel": True},
        "xAxis": {"type": "category", "data": [str(x) for x in categories]},
        "yAxis": {"type": "value", "splitNumber": 4},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}, "formatter": JsCode(
            "function(ps){var s='<b>'+ps[0].name+'</b>',t=0;ps.forEach(function(p){t+=p.value;s+='<br/>'+p.marker+p.seriesName+' '"
            f"+p.value.toLocaleString()+' {unit}';}});return s+'<br/>합계 '+t.toLocaleString()+' {unit}';}}")},
        "series": [{"type": "bar", "name": name, "stack": "all", "barMaxWidth": G["bar_max_w"], "data": list(vals),
                    "itemStyle": {**SERIES_KIND[kind](False), "borderColor": c("surface"), "borderWidth": 1}}
                   for name, vals, kind in series],
    }
    return options, height


def overlay_hbar(categories: list[str], totals: list[float], parts: list[float], *, total_name: str, part_name: str,
                 unit: str = "", selected: list[str] | None = None, note: str = "") -> tuple[dict, int]:
    """겹친 가로 막대(요청 H1·H2): 전체(녹색) 위에 그중 방산 부분(빨강·빗금)을 0부터 겹쳐 그린다.
    끝 숫자 = 전체, 툴팁 = 전체·방산·방산 비율. 선택된 항목 외에는 옅게(선택은 축 글자 굵게도 표시)."""
    selected = selected or []
    dim = lambda cat: {"opacity": G["dim"]} if selected and cat not in selected else {}  # noqa: E731
    base = {"barWidth": BAR_W, "cursor": "pointer", "barGap": "-100%"}
    options = {
        "legend": _legend(),
        "grid": {"left": G["pad"], "right": G["value_gutter"], "top": 3 * G["pad"] + G["pad_sm"], "bottom": G["pad_sm"],
                 "containLabel": True},
        "xAxis": {"type": "value", "show": False, "max": max(totals) if totals else 1},
        "yAxis": {"type": "category", "inverse": True,
                  "axisLabel": {"color": c("text-3"), "fontSize": theme.px("body-small"), "width": G["label_w"],
                                "overflow": "truncate"},
                  "data": [{"value": cat, "textStyle": {"fontWeight": 700, "color": c("text")} if cat in selected else {}}
                           for cat in categories]},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "shadow"}, "formatter": JsCode(
            "function(ps){var t=ps[0].data.total,d=ps[0].data.part;return '<b>'+ps[0].name+'</b><br/>"
            f"{total_name} '+t.toLocaleString()+' {unit}<br/>{part_name} '+d.toLocaleString()+' {unit} · '"
            "+(t?Math.round(d/t*1000)/10:0)+'%'" + (f"+'<br/><span style=\"opacity:.7\">{note}</span>'" if note else "") + ";}")},
        "series": [
            {**base, "type": "bar", "name": total_name, "showBackground": True, "z": 2,
             "backgroundStyle": {"color": c("chart-track"), "borderRadius": BAR_W // 2},
             "itemStyle": {"color": grad(), "borderRadius": BAR_W // 2},
             "label": {"show": True, "position": "right", "color": c("text"), "fontWeight": 700, "fontSize": theme.px("body")},
             "emphasis": {"itemStyle": _glow(c("chart-highlight"))},
             "data": [{"value": t, "name": cat, "total": t, "part": p, "itemStyle": dim(cat)}
                      for cat, t, p in zip(categories, totals, parts)]},
            {**base, "type": "bar", "name": part_name, "z": 3,
             "itemStyle": {"color": dgrad(), "decal": _decal(), "borderRadius": BAR_W // 2},
             "label": {"show": True, "position": "insideRight", "color": c("on-defense"), "fontWeight": 700,
                       "fontSize": theme.px("label"),
                       # 빨강 부분이 충분히 길 때만 숫자(가장 긴 막대의 12% 이상) — 짧으면 툴팁에서 확인
                       "formatter": JsCode(f"function(p){{return p.value>={0.12 * max(totals or [1]):.2f}?p.value:'';}}")},
             "emphasis": {"itemStyle": {"shadowBlur": G["glow"], "shadowColor": c("defense-strong")}},
             "data": [{"value": p, "name": cat, "total": t, "part": p, "itemStyle": dim(cat)}
                      for cat, t, p in zip(categories, totals, parts)]},
        ],
    }
    return options, ROW_H * max(len(categories), 1) + 2 * G["pad"] + 3 * G["pad"]


def vbar(categories: list[str], values: list[float], *, unit: str = "", height: int = 240) -> tuple[dict, int]:
    total = sum(values) or 1
    order = {v: i + 1 for i, v in enumerate(sorted(set(values), reverse=True))}
    data = [{"value": v, "name": k, "share": round(v / total * 100, 1), "rank": order[v]}
            for k, v in zip(categories, values)]
    options = {
        "grid": {"left": G["pad"], "right": G["pad"], "top": 2 * G["pad"], "bottom": G["pad_sm"], "containLabel": True},
        "xAxis": {"type": "category", "data": categories},
        "yAxis": {"type": "value", "splitNumber": 4},
        "tooltip": {"trigger": "item", "formatter": _tooltip_js(unit)},
        "series": [{"type": "bar", "data": data, "barMaxWidth": G["bar_max_w"],
                    "itemStyle": {"color": grad(horizontal=False), "borderRadius": [G["bar_radius"], G["bar_radius"], 0, 0]},
                    "emphasis": {"itemStyle": _glow(c("chart-highlight"))}}],
    }
    return options, height


def sparkline(categories: list, values: list[float], *, unit: str = "", height: int = G["spark_h"],
              draw: bool = False) -> tuple[dict, int]:
    """소형 추세. 축 숨김, 끝점 강조, 호버 십자선.
    draw: 선을 왼쪽→오른쪽으로 그리는 등장 효과(요청 I2) — 일정한 속도로 길게."""
    col = c("chart-primary")
    options = {
        **({"animationDuration": theme.MOTION["line_draw_ms"], "animationEasing": "linear"} if draw else {}),
        "grid": {"left": G["pad_sm"], "right": G["pad_sm"], "top": G["pad"], "bottom": 2 * G["pad"] + 2},
        "xAxis": {"type": "category", "data": [str(x) for x in categories], "boundaryGap": False,
                  "axisLabel": {"fontSize": theme.px("label")}},
        "yAxis": {"type": "value", "show": False, "scale": True},
        "tooltip": {"trigger": "axis", "axisPointer": {"type": "line", "lineStyle": {"color": c("chart-axis"), "type": "dashed"}},
                    "formatter": f"{{b}}<br/><b>{{c}}</b> {unit}"},
        "series": [{"type": "line", "data": values, "symbol": "circle", "symbolSize": G["marker"],
                    "lineStyle": {"width": G["stroke"], "color": col}, "itemStyle": {"color": col},
                    "emphasis": {"scale": 2, "itemStyle": _glow(c("chart-highlight"))},
                    "areaStyle": {"color": {"type": "linear", "x": 0, "y": 0, "x2": 0, "y2": 1,
                                            "colorStops": [{"offset": 0, "color": col}, {"offset": 1, "color": "transparent"}]},
                                  "opacity": 0.22}}],
    }
    return options, height


def _seq_map(vmax: float, dimension: int | None = None) -> dict:
    vm = {"show": False, "min": 0, "max": vmax or 1, "inRange": {"color": [c("chart-track"), c("chart-primary")]}}
    if dimension is not None:
        vm["dimension"] = dimension
    return vm


def heatmap(x: list[str], y: list[str], matrix: list[list[int]], *, unit: str = "",
            selected_y: str | None = None, selected_x: str | None = None, click_x: bool = False,
            rotate_x: int = 0) -> tuple[dict, int]:
    """순차(한 색상) 히트맵. 셀 값 라벨, 호버 시 테두리·글로우.
    click_x: 셀 클릭 시 열(x) 이름을 넘긴다(요청 H6: 활용 분야 셀 → 과제 목록). selected_x 열은 테두리로 표시."""
    sel = {"borderColor": c("text"), "borderWidth": G["stroke"] + 1}
    data = [{"value": [j, i, v], "name": x[j] if click_x else y[i], **({"itemStyle": sel} if x[j] == selected_x else {})}
            for i, row in enumerate(matrix) for j, v in enumerate(row)]
    vmax = max((v for row in matrix for v in row), default=1)
    options = {
        "grid": {"left": G["pad"], "right": G["pad"], "top": G["pad"], "bottom": G["pad"], "containLabel": True},
        "xAxis": {"type": "category", "data": x, "position": "top", "axisLabel": {"interval": 0, "rotate": rotate_x}},
        "yAxis": {"type": "category", "inverse": True,
                  "data": [{"value": v, "textStyle": {"fontWeight": 700, "color": c("text")}} if v == selected_y else v
                           for v in y]},
        "visualMap": _seq_map(vmax),
        "tooltip": {"trigger": "item", "formatter": JsCode(
            "function(p){var xs=" + json.dumps(list(x), ensure_ascii=False) + ",ys=" + json.dumps(list(y), ensure_ascii=False)
            + ";return '<b>'+ys[p.value[1]]+'</b> · '+xs[p.value[0]]+"
            f"'<br/><span style=\"font-size:16px;font-weight:700\">'+p.value[2]+'</span> {unit}';}}")},
        "series": [{"type": "heatmap", "data": data, "cursor": "pointer" if click_x else "default",
                    "label": {"show": True, "fontSize": theme.px("caption"),
                                                              "color": c("text")},
                    "itemStyle": {"borderColor": c("bg"), "borderWidth": G["stroke"], "borderRadius": G["cell_radius"]},
                    "emphasis": {"itemStyle": {"borderColor": c("text"), "borderWidth": G["stroke"],
                                               "shadowBlur": G["glow"], "shadowColor": c("chart-highlight")}}}],
    }
    return options, G["heat_row_h"] * len(y) + G["heat_extra"]


@functools.cache
def _korea_geo() -> dict:
    geo = json.loads(GEO_FILE.read_text(encoding="utf-8"))
    for f in geo["features"]:
        f["properties"] = {"name": REGION_SHORT[f["properties"]["name"]]}
    return geo


def korea_map(values: dict[str, int], *, selected: list[str] | None = None, unit: str = "",
              height: int = G["map_h"]) -> tuple[dict, int]:
    """시·도 지도 (research H01·S04, 요청 E3 — 이전 타일과 같은 기능): 값 = 한 색상 농도, 0건 지역도 '0'으로 남김,
    클릭 = 선택(on_click), 선택 시 선택 지역 테두리·나머지 옅게, 호버 테두리·글로우, 툴팁에 값·비율.
    광역시·세종 라벨은 경계 밖에 두고 점선 지시선으로 잇는다."""
    selected = selected or []
    total = sum(values.values()) or 1
    vmax = max(values.values(), default=1)
    n_of = {r: int(values.get(r, 0)) for r in REGIONS}
    share = {r: round(n / total * 100, 1) for r, n in n_of.items()}
    regions = []
    if selected:
        regions = [{"name": r, "itemStyle": ({"borderColor": c("text"), "borderWidth": G["stroke"]} if r in selected
                                             else {"opacity": G["dim"]})} for r in REGIONS]
    label = {"show": True, "formatter": "{b}\n{@[2]}", "color": c("text"), "fontSize": theme.px("caption"),
             "fontWeight": 700, "lineHeight": theme.px("caption") + 2, "textBorderColor": c("surface"),
             "textBorderWidth": 2}
    tip = ("function(p){var d=p.data||{};var n=d.n!=null?d.n:(d.value||0);"
           "return '<b>'+p.name+'</b><br/><span style=\"font-size:16px;font-weight:700\">'"
           f"+n.toLocaleString()+'</span> {unit}<br/>표시 합계의 '+(d.share||0)+'%';}}")
    options = {
        "geo": {"map": MAP_NAME, "roam": False, "aspectScale": G["map_aspect"], "layoutCenter": ["50%", "50%"],
                "layoutSize": "100%", "selectedMode": False, "label": {"show": False}, "regions": regions,
                "itemStyle": {"areaColor": c("chart-track"), "borderColor": c("bg"), "borderWidth": 1},
                "emphasis": {"label": {"show": False},
                             "itemStyle": {"areaColor": c("chart-highlight"), "borderColor": c("text"),
                                           "borderWidth": G["stroke"], "shadowBlur": G["glow"],
                                           "shadowColor": c("chart-highlight")}}},
        "visualMap": {**_seq_map(vmax), "seriesIndex": 0},
        "tooltip": {"trigger": "item", "formatter": JsCode(tip)},
        "series": [
            {"type": "map", "geoIndex": 0, "cursor": "pointer",
             "data": [{"name": r, "value": n_of[r], "share": share[r]} for r in REGIONS]},
            {"type": "lines", "coordinateSystem": "geo", "silent": True, "symbol": "none", "z": 3,
             "lineStyle": {"color": c("chart-axis"), "width": 1, "type": "dashed", "opacity": 0.8},
             "data": [{"coords": [list(CITY_AT[r]), list(LABEL_AT[r])]} for r in CITY_AT]},
            {"type": "scatter", "coordinateSystem": "geo", "symbolSize": 4, "cursor": "pointer", "z": 4,
             "itemStyle": {"color": c("chart-axis")}, "label": label,
             "data": [{"name": r, "value": [*LABEL_AT[r], n_of[r]], "n": n_of[r], "share": share[r],
                       **({} if r in CITY_AT else {"symbolSize": 0})} for r in REGIONS]},
        ],
    }
    return options, height


def _alpha(hex_color: str, a: float) -> str:
    h = hex_color.lstrip("#")
    return f"rgba({int(h[0:2], 16)},{int(h[2:4], 16)},{int(h[4:6], 16)},{a:.2f})"


def treemap(nodes: list[dict], *, selected: str | None = None) -> tuple[dict, int]:
    """직무 사전 구성 (J01). 면적 = 사전 직무 수. 한 색상의 농도(투명도)로만 구분 — 넓은 면을 진한 녹색으로
    채우지 않는다(DESIGN §1). 농도는 파이썬에서 직접 계산(ECharts colorAlpha가 적용되지 않는 문제)."""
    base = c("chart-primary")
    vmax = max((ch["value"] for n in nodes for ch in n.get("children", [])), default=1)
    lo, hi = G["tree_alpha"]
    for n in nodes:
        for ch in n.get("children", []):
            ch["itemStyle"] = {"color": _alpha(base, lo + (hi - lo) * ch["value"] / vmax)}
        if selected and n["name"] != selected:
            n["itemStyle"] = {"opacity": G["dim"]}
    options = {
        "tooltip": {"formatter": "<b>{b}</b><br/><span style=\"font-size:16px;font-weight:700\">{c}</span>개 직무(사전)"},
        "series": [{"type": "treemap", "data": nodes, "roam": False, "nodeClick": False, "breadcrumb": {"show": False},
                    "width": "100%", "height": "100%", "top": 0, "left": 0, "right": 0, "bottom": 0,
                    "visibleMin": 1, "label": {"show": True, "formatter": "{b}\n{c}", "color": c("text"),
                                               "fontSize": theme.px("body"), "fontWeight": 700, "lineHeight": 18},
                    "upperLabel": {"show": False},
                    "itemStyle": {"borderColor": c("bg"), "borderWidth": G["stroke"], "gapWidth": G["stroke"],
                                  "borderRadius": G["tile_radius"]},
                    "emphasis": {"itemStyle": {"borderColor": c("chart-highlight"), "borderWidth": G["stroke"]}},
                    "levels": [{"itemStyle": {"borderWidth": 0, "gapWidth": 4}}, {"itemStyle": {"gapWidth": 1}}]}],
    }
    return options, G["treemap_h"]
