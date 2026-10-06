"""03 지역 지도 + 키워드별 교육 막대 (요청 J1, 2026-10-01). Streamlit 내장 components.v2.

지도와 막대를 한 부품에 두어 지도 지역에 마우스를 올리면 다시 실행 없이 막대가 그 지역 값으로 바로 바뀐다.
클릭만 파이썬으로 알린다: 지도 = 지역 필터, 막대 = 키워드 필터.
ECharts는 static/vendor/echarts.min.js(5.6.0, v2 공유본과 같은 파일)를 한 번 읽어 쓴다.
정적 파일 서버는 .js를 text/plain으로 주므로 script 태그 src 대신 글을 받아 붙인다.
"""
from collections.abc import Callable

import streamlit as st

from components import charts
from core import export_mode, theme

_CSS = """
.lm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gutter);font-family:var(--font-sans)}
.lm-title{font:var(--font-card-title);color:var(--text);margin:0 0 var(--space-xxs)}
.lm-sub{font:var(--font-caption);color:var(--text-2);margin:0 0 var(--space-xs)}
.lm-map,.lm-bar{width:100%}
@media (max-width:767px){.lm{grid-template-columns:1fr}}
"""

_JS = """
let lib = null;
function loadECharts() {
  if (window.echarts) return Promise.resolve(window.echarts);
  if (!lib) lib = fetch('app/static/vendor/echarts.min.js').then((r) => r.text()).then((src) => {
    const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); return window.echarts;
  });
  return lib;
}
export default function(component) {
  const { data, parentElement, setTriggerValue } = component;
  let root = parentElement.querySelector('.lm');
  if (!root) {
    root = document.createElement('div'); root.className = 'lm';
    root.innerHTML = '<div class="lm-map"></div><div><p class="lm-title"></p><p class="lm-sub"></p><div class="lm-bar"></div></div>';
    parentElement.appendChild(root);
  }
  const mapEl = root.querySelector('.lm-map'), barEl = root.querySelector('.lm-bar');
  mapEl.style.height = data.height + 'px';
  barEl.style.height = data.bar_height + 'px';
  const C = data.colors, sel = new Set(data.selected), home = data.region || data.all_label;
  const fmt = (n) => Number(n || 0).toLocaleString('ko-KR');
  loadECharts().then((echarts) => {
    if (!echarts.getMap(data.map_name)) echarts.registerMap(data.map_name, data.geo);
    const map = echarts.getInstanceByDom(mapEl) || echarts.init(mapEl, data.theme);
    const bar = echarts.getInstanceByDom(barEl) || echarts.init(barEl, data.theme);
    const opt = data.map_opt;
    opt.animation = data.motion;
    opt.tooltip = {trigger: 'item', confine: true, formatter: (p) => {
      const d = p.data || {}, n = d.n != null ? d.n : (d.value || 0);
      return '<b>' + p.name + '</b><br/><span style="font-size:16px;font-weight:700">' + fmt(n) + '</span> ' + data.unit
        + '<br/>지역 합계의 ' + (d.share || 0) + '%<br/>누르면 이 지역 과정만 봅니다';
    }};
    map.setOption(opt, true);
    const show = (region) => {
      const vals = data.bars[region] || {};
      const top = Math.max(1, ...data.keywords.map((k) => vals[k] || 0));
      root.querySelector('.lm-title').textContent = region + ' · 키워드별 교육 과정';
      root.querySelector('.lm-sub').textContent = '과정 ' + fmt(data.totals[region]) + '개 · 막대를 누르면 그 키워드로 찾습니다';
      bar.setOption({
        animation: data.motion, animationDurationUpdate: data.motion ? 300 : 0,
        grid: {left: data.pad, right: data.gutter, top: data.pad_sm, bottom: data.pad_sm, containLabel: true},
        xAxis: {type: 'value', show: false, max: top},
        yAxis: {type: 'category', inverse: true, data: data.keywords, axisLine: {show: false}, axisTick: {show: false},
                axisLabel: {color: C.axis, fontSize: data.font, formatter: (k) => sel.has(k) ? '{on|' + k + '}' : k,
                            rich: {on: {color: C.text, fontWeight: 700, fontSize: data.font}}}},
        tooltip: {trigger: 'item', confine: true, formatter: (p) => '<b>' + p.name + '</b><br/>' + region + ' 과정 ' + fmt(p.value) + '개'},
        series: [{type: 'bar', barWidth: data.bar_w, cursor: 'pointer', showBackground: true,
                  backgroundStyle: {color: C.track, borderRadius: data.bar_w / 2},
                  label: {show: true, position: 'right', color: C.text, fontWeight: 700, fontSize: data.font,
                          formatter: (p) => fmt(p.value)},
                  data: data.keywords.map((k) => ({name: k, value: vals[k] || 0, itemStyle: {
                    borderRadius: data.bar_w / 2, color: sel.size && !sel.has(k) ? C.dim : data.grad}}))}],
      }, true);
    };
    show(home);
    map.off('mouseover'); map.off('globalout'); map.off('click'); bar.off('click');
    map.on('mouseover', (p) => { if (data.bars[p.name] !== undefined || data.regions.includes(p.name)) show(p.name); });
    map.on('globalout', () => show(home));
    map.on('click', (p) => { if (data.regions.includes(p.name)) setTriggerValue('region', p.name); });
    bar.on('click', (p) => setTriggerValue('keyword', p.name));
    if (!root._ro) {
      root._ro = new ResizeObserver(() => { map.resize(); bar.resize(); });
      root._ro.observe(root);
    }
  });
}
"""

_comp = st.components.v2.component("region_keyword_map", css=_CSS, js=_JS)


def region_keyword_map(region_values: dict[str, int], bars: dict[str, dict[str, int]], totals: dict[str, int],
                       keywords: list[str], *, selected: list[str], region: str | None, all_label: str, key: str,
                       on_region: Callable[[str], None], on_keyword: Callable[[str], None]) -> None:
    """region_values = 지도 값(시도 → 과정 수), bars = {지역 또는 all_label: {키워드: 과정 수}},
    totals = 지역별 전체 과정 수, keywords = 막대 순서(전국 많은 순), selected = 고른 키워드, region = 고른 지역."""
    comp_key = f"{key}-{theme.mode()}"          # 테마가 바뀌면 새로 그림(charts.render 와 같은 규칙)
    opt, h = charts.korea_map(region_values, selected=[region] if region else None, unit="개 과정")
    opt.pop("tooltip")                          # 툴팁 함수는 JS 쪽에서 붙인다(JsCode는 JSON으로 못 보냄)
    font = theme.px("caption")

    def _fire(name: str, fn: Callable[[str], None]):
        value = (st.session_state.get(comp_key) or {}).get(name)
        if value:
            fn(value)

    _comp(data={
        "geo": charts._korea_geo(), "map_name": charts.MAP_NAME, "map_opt": opt, "theme": charts.echarts_theme(),
        "regions": charts.REGIONS, "bars": bars, "totals": totals, "keywords": keywords, "selected": selected,
        "region": region, "all_label": all_label, "unit": "개 과정",
        "height": h, "bar_height": h - 2 * (font + 18 + theme.CHART["pad"]),
        "motion": st.session_state["ui"]["motion"] and not export_mode.on(),
        "colors": {"axis": charts.c("chart-axis"), "text": charts.c("text"), "track": charts.c("chart-track"),
                   "dim": charts.c("chart-dim")},
        "grad": charts.grad(), "bar_w": theme.CHART["bar_w"] * 2 // 3, "font": font,
        "pad": theme.CHART["pad"], "pad_sm": theme.CHART["pad_sm"], "gutter": theme.CHART["value_gutter"],
    }, key=comp_key, on_region_change=lambda: _fire("region", on_region),
        on_keyword_change=lambda: _fire("keyword", on_keyword))
