"""막대 그래프(왼쪽) + 시·도 지도(오른쪽) 연동 부품 (요청 N5 — 03 '지도 + 키워드 막대'와 같은 형태, 좌우만 반대).

지도의 지역에 마우스를 올리면 다시 실행 없이 왼쪽 막대가 그 지역 값으로 바로 바뀐다. 클릭만 파이썬으로 알린다:
지도 = 지역 이름(region), 막대 = 막대 이름(bar). 막대 옵션은 지역마다 파이썬(components/charts.py)이 미리 만들어 넘긴다.
ECharts 옵션 안의 JsCode 함수는 {"__fn__": "..."}로 보내 JS에서 함수로 되살린다.
ECharts는 static/vendor/echarts.min.js(03 부품과 같은 파일)를 한 번 읽어 쓴다.
"""
from collections.abc import Callable

import streamlit as st
from streamlit_echarts import JsCode

from components import charts
from core import export_mode, theme

_CSS = """
.lcm{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--gutter);font-family:var(--font-sans)}
.lcm-title{font:var(--font-card-title);color:var(--text);margin:0 0 var(--space-xxs)}
.lcm-sub{font:var(--font-caption);color:var(--text-2);margin:0 0 var(--space-xs)}
.lcm-map,.lcm-bar{width:100%}
@media (max-width:767px){.lcm{grid-template-columns:1fr}}
"""

_JS = """
let lib = null;
function loadECharts() {
  if (window.echarts) return Promise.resolve(window.echarts);
  if (!lib) lib = fetch('/app/static/vendor/echarts.min.js').then((r) => r.text()).then((src) => {
    const s = document.createElement('script'); s.textContent = src; document.head.appendChild(s); return window.echarts;
  });
  return lib;
}
function revive(o) {   // {"__fn__": "function(...){...}"} → 함수
  if (Array.isArray(o)) return o.map(revive);
  if (o && typeof o === 'object') {
    if (typeof o.__fn__ === 'string') return new Function('return (' + o.__fn__ + ')')();
    const out = {}; Object.keys(o).forEach((k) => { out[k] = revive(o[k]); }); return out;
  }
  return o;
}
export default function(component) {
  const { data, parentElement, setTriggerValue } = component;
  let root = parentElement.querySelector('.lcm');
  if (!root) {
    root = document.createElement('div'); root.className = 'lcm';
    root.innerHTML = '<div><p class="lcm-title"></p><p class="lcm-sub"></p><div class="lcm-bar"></div></div><div class="lcm-map"></div>';
    parentElement.appendChild(root);
  }
  const mapEl = root.querySelector('.lcm-map'), barEl = root.querySelector('.lcm-bar');
  mapEl.style.height = data.height + 'px';
  barEl.style.height = data.bar_height + 'px';
  loadECharts().then((echarts) => {
    if (!echarts.getMap(data.map_name)) echarts.registerMap(data.map_name, data.geo);
    const map = echarts.getInstanceByDom(mapEl) || echarts.init(mapEl, data.theme);
    const bar = echarts.getInstanceByDom(barEl) || echarts.init(barEl, data.theme);
    map.setOption(revive({ ...data.motion, ...data.map_opt }), true);
    const show = (key) => {
      const v = data.views[key] || data.views[data.home];
      root.querySelector('.lcm-title').textContent = v.title;
      root.querySelector('.lcm-sub').textContent = v.sub;
      bar.setOption(revive({ ...data.motion, ...v.option }), true);
    };
    show(data.home);
    map.off('mouseover'); map.off('globalout'); map.off('click'); bar.off('click');
    map.on('mouseover', (p) => { if (data.views[p.name]) show(p.name); });
    map.on('globalout', () => show(data.home));
    map.on('click', (p) => { if (data.regions.includes(p.name)) setTriggerValue('region', p.name); });
    bar.on('click', (p) => { if (p.name) setTriggerValue('bar', p.name); });
    if (!root._ro) { root._ro = new ResizeObserver(() => { map.resize(); bar.resize(); }); root._ro.observe(root); }
  });
}
"""

_comp = st.components.v2.component("linked_chart_map", css=_CSS, js=_JS)


def _jsonable(o):
    if isinstance(o, JsCode):
        return {"__fn__": str(o).replace("--x_x--0_0--", "")}
    if isinstance(o, dict):
        return {k: _jsonable(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [_jsonable(v) for v in o]
    return o


def linked_chart_map(map_values: dict[str, int], views: dict[str, dict], home: str, *, selected_regions: list[str],
                     unit: str, key: str, on_region: Callable[[str], None], on_bar: Callable[[str], None]) -> None:
    """views = {지역 또는 home 키: {title, sub, option}}(option = ECharts 막대 옵션), home = 마우스가 없을 때 보일 키."""
    comp_key = f"{key}-{theme.mode()}"          # 테마가 바뀌면 새로 그림(charts.render 와 같은 규칙)
    map_opt, h = charts.korea_map(map_values, selected=selected_regions, unit=unit)

    def _fire(name: str, fn: Callable[[str], None]):
        value = (st.session_state.get(comp_key) or {}).get(name)
        if value:
            fn(value)

    _comp(data={
        "geo": charts._korea_geo(), "map_name": charts.MAP_NAME, "map_opt": _jsonable(map_opt),
        "theme": charts.echarts_theme(), "regions": charts.REGIONS, "views": _jsonable(views), "home": home,
        # 크기는 03 부품과 같게: 지도 높이 = 카드 높이, 막대 = 지도 높이 - 제목 두 줄(요청 N10 화면 사이 통일)
        "height": h, "bar_height": h - 2 * (theme.px("caption") + 18 + theme.CHART["pad"]),
        "motion": {"animation": False} if export_mode.on() or not st.session_state["ui"]["motion"] else {},
    }, key=comp_key, on_region_change=lambda: _fire("region", on_region), on_bar_change=lambda: _fire("bar", on_bar))
