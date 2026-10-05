/* charts.js — components/charts.py 옵션을 그대로 옮김 (ECharts 5.6, DESIGN §8·§11.3·§12).
 * 다시 그려도 같은 id의 차트는 인스턴스를 재사용해 전환 애니메이션이 이어진다. */
"use strict";

const CH = {};
const G = D.theme.chart;
const ROW_H = G.row_h, BAR_W = G.bar_w;
// 겹친 막대(요청 AB6·AB6-1, charts.OVERLAP_GAP·overlap_w): 빨강을 초록보다 굵기 30% 아래로, 두 막대 합친 높이 = 예전 막대 하나
const OVERLAP_GAP = `-${Math.round((1 - G.overlap_shift) * 100)}%`, overlapW = (w) => Math.round(w / (1 + G.overlap_shift));
const tok = () => ({ ...D.theme.base, ...D.theme.modes[S.theme] });
const c = (name) => tok()[`--${name}`];
const px = (role) => { const [size] = D.theme.type[role]; const n = parseFloat(size);
  return ["nav", "brand"].includes(role) ? n : Math.round(n * D.theme.font_scale); };
const FONT = '"Pretendard",-apple-system,BlinkMacSystemFont,"Apple SD Gothic Neo","Malgun Gothic",Arial,sans-serif';
echarts.registerMap("korea", D.geo);

CH.cache = {};          // id → {el, inst}
CH.pending = [];        // 이번 그리기에서 붙일 차트
CH.after = [];          // 차트를 붙인 뒤 실행할 일(03 지도 ↔ 막대 마우스 연동)

CH.theme = () => {
  const axisLabel = { color: c("chart-axis"), fontSize: px("caption"), fontFamily: FONT };
  const axis = { axisLine: { show: false }, axisTick: { show: false }, axisLabel, splitLine: { lineStyle: { color: c("chart-grid") } } };
  return { color: [c("chart-primary")], backgroundColor: "transparent",
    textStyle: { fontFamily: FONT, color: c("chart-axis"), fontSize: px("caption") },
    categoryAxis: { ...axis, splitLine: { show: false } }, valueAxis: axis,
    tooltip: { backgroundColor: c("tip-bg"), borderColor: c("tip-bg"), borderWidth: 0, padding: G.tip_pad,
      textStyle: { color: c("tip-fg"), fontSize: G.tip_font, fontFamily: FONT },
      extraCssText: `border-radius:${G.tip_radius}px;box-shadow:${D.theme.base["--shadow-tip"]};` } };
};
CH.motion = () => ({
  animationDuration: D.theme.motion.chart_enter_ms, animationEasing: D.theme.motion.easing,
  animationDurationUpdate: D.theme.motion.chart_update_ms, animationEasingUpdate: D.theme.motion.easing });

/** 자리 표시 HTML. 실제 차트는 그린 뒤 CH.mountAll()이 붙인다 */
CH.place = (id, option, height, onClick, merge) => {
  CH.pending.push({ id, option, height, onClick, merge });
  return `<div class="chart" data-chart="${id}" style="height:${height}px"></div>`;
};
CH.mountAll = () => {
  const keep = new Set();
  CH.pending.forEach(({ id, option, height, onClick, merge }) => {
    const ph = document.querySelector(`[data-chart="${id}"]`);
    if (!ph) return;
    keep.add(id);
    let entry = CH.cache[id];
    if (entry && entry.mode === S.theme) {
      ph.replaceWith(entry.el); entry.el.style.height = height + "px"; entry.inst.resize();
    } else {
      if (entry) entry.inst.dispose();
      const el = document.createElement("div"); el.className = "chart"; el.style.height = height + "px"; el.dataset.chart = id;
      ph.replaceWith(el);
      echarts.registerTheme(`dd-${S.theme}`, CH.theme());
      entry = CH.cache[id] = { el, inst: echarts.init(el, `dd-${S.theme}`, { renderer: "canvas" }), mode: S.theme };
    }
    entry.inst.off("click");
    if (onClick) entry.inst.on("click", (p) => { if (p.name) { onClick(p.name); save(); render(); } });
    entry.inst.setOption({ ...CH.motion(), ...option }, merge ? { replaceMerge: ["series"] } : { notMerge: true });
  });
  Object.keys(CH.cache).forEach((id) => { if (!keep.has(id)) { CH.cache[id].inst.dispose(); delete CH.cache[id]; } });
  CH.pending = [];
  CH.after.forEach((fn) => fn()); CH.after = [];
};
window.addEventListener("resize", () => Object.values(CH.cache).forEach((e) => e.inst.resize()));

/* ---------------- 공통 모양 ---------------- */
const glow = (color) => ({ color, shadowBlur: G.glow, shadowColor: color });
const decal = () => ({ symbol: "rect", symbolSize: 1, color: c("bg"), dashArrayX: [1, 0], dashArrayY: [1, 5], rotation: Math.PI / 4 });
const lin = (a, b, horizontal) => ({ type: "linear", x: 0, y: 0, x2: horizontal ? 1 : 0, y2: horizontal ? 0 : 1,
  colorStops: [{ offset: 0, color: c(a) }, { offset: 1, color: c(b) }] });
CH.grad = (h = true) => lin("chart-grad-start", "chart-grad-end", h);
CH.dgrad = (h = true) => lin("defense-grad-start", "defense-grad-end", h);
// 방산 막대는 근거 단계와 관계없이 모두 같은 모양(요청 T3), 마우스를 올려도 빨강 유지 + 빨간 글로우
CH.defenseStyle = (tier, highlight) => (tier ? { color: CH.dgrad(), decal: decal() } : { color: highlight ? c("chart-muted") : CH.grad() });
CH.defenseEmphasis = () => ({ itemStyle: { color: CH.dgrad(), decal: decal(), shadowBlur: G.glow, shadowColor: c("defense-strong") },
  label: { color: c("defense-strong") } });
const KIND = { defense: (h) => ({ color: CH.dgrad(h), decal: decal() }), general: (h) => ({ color: CH.grad(h) }),
  other: () => ({ color: c("chart-muted") }) };
const legend = () => ({ top: 0, left: 0, icon: "roundRect", itemWidth: 12, itemHeight: 12,
  textStyle: { color: c("text-3"), fontSize: px("caption") } });
const tipItem = (unit, note) => (p) => { const d = p.data || {};
  return `<b>${esc(p.name)}</b><br/><span style="font-size:16px;font-weight:700">${fmt(d.value != null ? d.value : p.value)}</span> ${unit}`
    + (d.share != null ? `<br/>표시 합계의 ${d.share}% · ${d.rank}위` : "") + (note ? `<br/><span style="opacity:.7">${note}</span>` : ""); };
const rankOf = (values) => { const u = uniq(values).sort((a, b) => b - a); return (v) => u.indexOf(v) + 1; };

/* ---------------- 가로 막대 ---------------- */
CH.hbar = (cats, values, o = {}) => {
  const sel = o.selected || [], total = values.reduce((a, b) => a + b, 0) || 1, rank = rankOf(values);
  const bw = o.thin ? Math.floor(BAR_W * 2 / 3) : BAR_W, rowH = o.thin ? G.row_h_thin : ROW_H;   // thin = 얇은 막대(요청 Y3)
  const data = cats.map((cat, i) => {
    const tier = o.tiers ? o.tiers[i] : null;
    const style = { borderRadius: bw / 2, ...CH.defenseStyle(tier, o.highlight) };
    if (sel.length && !tier && !o.highlight) style.color = sel.includes(cat) ? c("chart-highlight") : c("chart-dim");
    return { value: values[i], name: cat, share: Math.round(values[i] / total * 1000) / 10, rank: rank(values[i]), itemStyle: style,
      ...(tier ? { emphasis: CH.defenseEmphasis() } : {}) };
  });
  return [{ grid: { left: G.pad, right: G.value_gutter, top: G.pad_sm, bottom: G.pad_sm, containLabel: true },
    xAxis: { type: "value", show: false, max: values.length ? Math.max(...values) : 1 },
    yAxis: { type: "category", inverse: true, axisLabel: { color: c("text-3"), fontSize: px("body-small"), width: G.label_w, overflow: "truncate" },
      data: cats.map((cat) => ({ value: cat, textStyle: sel.includes(cat) ? { fontWeight: 700, color: c("text") } : {} })) },
    tooltip: { trigger: "item", formatter: tipItem(o.unit || "", o.note) },
    series: [{ type: "bar", data, barWidth: bw, showBackground: true, cursor: "pointer",
      backgroundStyle: { color: c("chart-track"), borderRadius: bw / 2 },
      label: { show: true, position: "right", color: c("text"), fontWeight: 700, fontSize: px("body") },
      emphasis: { itemStyle: glow(c("chart-highlight")), label: { color: c("chart-highlight") } }, universalTransition: true }] },
  rowH * Math.max(cats.length, 1) + 2 * G.pad];
};

/* ---------------- 세로 막대 ---------------- */
CH.vbar = (cats, values, o = {}) => {
  const total = values.reduce((a, b) => a + b, 0) || 1, rank = rankOf(values);
  return [{ grid: { left: G.pad, right: G.pad, top: 2 * G.pad, bottom: G.pad_sm, containLabel: true },
    xAxis: { type: "category", data: cats }, yAxis: { type: "value", splitNumber: 4 },
    tooltip: { trigger: "item", formatter: tipItem(o.unit || "") },
    series: [{ type: "bar", barMaxWidth: G.bar_max_w, data: cats.map((k, i) => ({ value: values[i], name: k,
      share: Math.round(values[i] / total * 1000) / 10, rank: rank(values[i]) })),
      itemStyle: { color: CH.grad(false), borderRadius: [G.bar_radius, G.bar_radius, 0, 0] }, emphasis: { itemStyle: glow(c("chart-highlight")) } }] },
  o.height || 240];
};

/* ---------------- 추이선 ---------------- */
CH.sparkline = (cats, values, unit, draw) => {
  const col = c("chart-primary");
  // draw: 펼칠 때 선이 왼쪽→오른쪽으로 일정한 속도로 그려짐(요청 I2)
  return [{ ...(draw ? { animationDuration: D.theme.motion.line_draw_ms, animationEasing: "linear" } : {}), grid: { left: G.pad_sm, right: G.pad_sm, top: G.pad, bottom: 2 * G.pad + 2 },
    xAxis: { type: "category", data: cats.map(String), boundaryGap: false, axisLabel: { fontSize: px("label") } },
    yAxis: { type: "value", show: false, scale: true },
    tooltip: { trigger: "axis", axisPointer: { type: "line", lineStyle: { color: c("chart-axis"), type: "dashed" } },
      formatter: (ps) => `${ps[0].name}<br/><b>${fmt(ps[0].value, 2).replace(/\.00$/, "")}</b> ${unit}` },
    series: [{ type: "line", data: values, symbol: "circle", symbolSize: G.marker, lineStyle: { width: G.stroke, color: col },
      itemStyle: { color: col }, emphasis: { scale: 2, itemStyle: glow(c("chart-highlight")) },
      areaStyle: { color: { type: "linear", x: 0, y: 0, x2: 0, y2: 1, colorStops: [{ offset: 0, color: col }, { offset: 1, color: "transparent" }] }, opacity: 0.22 } }] },
  G.spark_h];
};

/* ---------------- 누적 가로 / 양쪽 비교 / 누적 세로 (요청 F2) ---------------- */
CH.stackedHbar = (cats, series, o = {}) => {
  const sel = o.selected || [];
  const totals = cats.map((_, i) => series.reduce((a, s) => a + s[1][i], 0));
  return [{ legend: legend(), grid: { left: G.pad, right: G.value_gutter, top: 3 * G.pad + G.pad_sm, bottom: G.pad_sm, containLabel: true },
    xAxis: { type: "value", show: false },
    yAxis: { type: "category", inverse: true, axisLabel: { color: c("text-3"), fontSize: px("body-small"), width: G.label_w, overflow: "truncate" },
      data: cats.map((cat) => ({ value: cat, textStyle: sel.includes(cat) ? { fontWeight: 700, color: c("text") } : {} })) },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (ps) => `<b>${esc(ps[0].name)}</b>`
      + ps.map((p) => `<br/>${p.marker}${p.seriesName} ${fmt(p.value)} ${o.unit}`).join("") + `<br/>합계 ${fmt(ps[0].data.total)} ${o.unit}` },
    series: series.map(([name, vals, kind], si) => ({ type: "bar", name, stack: "all", barWidth: BAR_W, cursor: "pointer",
      itemStyle: { ...KIND[kind](true), borderColor: c("surface"), borderWidth: 1 },
      data: cats.map((cat, i) => ({ value: vals[i], name: cat, total: totals[i], ...(sel.length && !sel.includes(cat) ? { itemStyle: { opacity: G.dim } } : {}) })),
      label: { show: si === series.length - 1, position: "right", color: c("text"), fontWeight: 700, fontSize: px("body"), formatter: (p) => p.data.total },
      emphasis: { focus: "none", itemStyle: { shadowBlur: G.glow, shadowColor: c(kind === "defense" ? "defense-strong" : "chart-highlight") } } })) },
  ROW_H * Math.max(cats.length, 1) + 2 * G.pad + 3 * G.pad];
};
CH.divergingHbar = (cats, left, right, o = {}) => {
  const vmax = Math.max(...left[1], ...right[1], 1), unit = o.unit || "%";
  return [{ legend: legend(), grid: { left: G.pad, right: G.pad * 3, top: 3 * G.pad + G.pad_sm, bottom: G.pad, containLabel: true },
    xAxis: { type: "value", min: -vmax, max: vmax, axisLabel: { formatter: (v) => Math.abs(v) + unit } },
    yAxis: { type: "category", inverse: true, axisLabel: { color: c("text-3"), fontSize: px("body-small") }, data: cats },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (ps) => `<b>${esc(ps[0].name)}</b>`
      + ps.map((p) => `<br/>${p.marker}${p.seriesName} ${Math.abs(p.value)}${unit}`).join("")
      + (o.note ? `<br/><span style="opacity:.7">${o.note}</span>` : "") },
    series: [
      { type: "bar", name: left[0], stack: "d", barWidth: BAR_W, data: left[1].map((v) => -v),
        itemStyle: { ...KIND[left[2]](true), borderRadius: [BAR_W / 2, 0, 0, BAR_W / 2] } },
      { type: "bar", name: right[0], stack: "d", barWidth: BAR_W, data: right[1],
        itemStyle: { ...KIND[right[2]](true), borderRadius: [0, BAR_W / 2, BAR_W / 2, 0] } }] },
  ROW_H * Math.max(cats.length, 1) + 5 * G.pad];
};
CH.stackedVbar = (cats, series, o = {}) => [{ legend: legend(),
  grid: { left: G.pad, right: G.pad, top: 4 * G.pad, bottom: G.pad_sm, containLabel: true },
  xAxis: { type: "category", data: cats.map(String) }, yAxis: { type: "value", splitNumber: 4 },
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (ps) => { let t = 0;
    return `<b>${ps[0].name}</b>` + ps.map((p) => { t += p.value; return `<br/>${p.marker}${p.seriesName} ${fmt(p.value)} ${o.unit}`; }).join("")
      + `<br/>합계 ${fmt(t)} ${o.unit}`; } },
  series: series.map(([name, vals, kind]) => ({ type: "bar", name, stack: "all", barMaxWidth: G.bar_max_w, data: vals,
    itemStyle: { ...KIND[kind](false), borderColor: c("surface"), borderWidth: 1 } })) }, o.height || 320];

/* ---------------- 히트맵 ---------------- */
const seqMap = (vmax, dimension) => ({ show: false, min: 0, max: vmax || 1, inRange: { color: [c("chart-track"), c("chart-primary")] },
  ...(dimension != null ? { dimension } : {}) });
CH.heatmap = (x, y, matrix, o = {}) => {
  const vmax = Math.max(1, ...matrix.flat());
  const sel = { borderColor: c("text"), borderWidth: G.stroke + 1 };   // o.clickX: 셀 클릭 = 열 이름(요청 H6)
  return [{ grid: { left: G.pad, right: G.pad, top: G.pad, bottom: G.pad, containLabel: true },
    xAxis: { type: "category", data: x, position: "top", axisLabel: { interval: 0, rotate: o.rotateX || 0, ...(o.xFont ? { fontSize: o.xFont } : {}) } },
    yAxis: { type: "category", inverse: true, data: y }, visualMap: seqMap(vmax),
    tooltip: { trigger: "item", formatter: (p) => `<b>${esc(p.name)}</b> · ${esc(x[p.value[0]])}<br/><span style="font-size:16px;font-weight:700">${p.value[2]}</span> ${o.unit || ""}` },
    series: [{ type: "heatmap", cursor: o.clickX ? "pointer" : "default",
      data: matrix.flatMap((row, i) => row.map((v, j) => ({ value: [j, i, v], name: o.clickX ? x[j] : y[i],
        ...(x[j] === o.selectedX ? { itemStyle: sel } : {}) }))),
      label: { show: true, fontSize: px("caption"), color: c("text") },
      itemStyle: { borderColor: c("bg"), borderWidth: G.stroke, borderRadius: G.cell_radius },
      emphasis: { itemStyle: { borderColor: c("text"), borderWidth: G.stroke, shadowBlur: G.glow, shadowColor: c("chart-highlight") } } }] },
  G.heat_row_h * y.length + G.heat_extra + (o.rotateX ? G.heat_extra : 0)];
};

/* ---------------- 겹친 가로 막대 (요청 H1·H2): 전체(녹색) 위에 그중 방산(빨강·빗금) ---------------- */
CH.overlayHbar = (cats, totals, parts, o = {}) => {
  const sel = o.selected || [], dim = (cat) => (sel.length && !sel.includes(cat) ? { opacity: G.dim } : {});
  const bw = overlapW(BAR_W), base = { barWidth: bw, cursor: "pointer", barGap: OVERLAP_GAP }, top = Math.max(1, ...totals);
  return [{ legend: legend(), grid: { left: G.pad, right: G.value_gutter, top: 3 * G.pad + G.pad_sm, bottom: G.pad_sm, containLabel: true },
    xAxis: { type: "value", show: false, max: top },
    yAxis: { type: "category", inverse: true, axisLabel: { color: c("text-3"), fontSize: px("body-small"), width: G.label_w, overflow: "truncate" },
      data: cats.map((cat) => ({ value: cat, textStyle: sel.includes(cat) ? { fontWeight: 700, color: c("text") } : {} })) },
    tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, formatter: (ps) => { const d = ps[0].data;
      return `<b>${esc(ps[0].name)}</b><br/>${o.totalName} ${fmt(d.total)} ${o.unit}<br/>${o.partName} ${fmt(d.part)} ${o.unit} · ${d.total ? Math.round(d.part / d.total * 1000) / 10 : 0}%`
        + (o.note ? `<br/><span style="opacity:.7">${o.note}</span>` : ""); } },
    series: [
      { ...base, type: "bar", name: o.totalName, showBackground: true, z: 2, backgroundStyle: { color: c("chart-track"), borderRadius: Math.floor(bw / 2) },
        itemStyle: { color: CH.grad(), borderRadius: Math.floor(bw / 2) }, emphasis: { itemStyle: glow(c("chart-highlight")) },
        label: { show: true, position: "right", color: c("text"), fontWeight: 700, fontSize: px("body") },
        data: cats.map((cat, i) => ({ value: totals[i], name: cat, total: totals[i], part: parts[i], itemStyle: dim(cat) })) },
      { ...base, type: "bar", name: o.partName, z: 3, itemStyle: { color: CH.dgrad(), decal: decal(), borderRadius: Math.floor(bw / 2) },
        label: { show: true, position: "insideRight", color: c("on-defense"), fontWeight: 700, fontSize: px("label"),
          formatter: (p) => (p.value >= 0.12 * top ? p.value : "") },   // 빨강이 충분히 길 때만 숫자
        emphasis: { itemStyle: { shadowBlur: G.glow, shadowColor: c("defense-strong") } },
        data: cats.map((cat, i) => ({ value: parts[i], name: cat, total: totals[i], part: parts[i], itemStyle: dim(cat) })) }] },
  ROW_H * Math.max(cats.length, 1) + 2 * G.pad + 3 * G.pad];
};

/* ---------------- 03 키워드별 과정 막대(지도와 연동, 요청 J1-2) ---------------- */
CH.keywordBars = (keywords, vals, selected, region) => {
  const sel = new Set(selected), top = Math.max(1, ...keywords.map((k) => vals[k] || 0)), bw = Math.round(BAR_W * 2 / 3);
  return { animationDurationUpdate: 300, grid: { left: G.pad, right: G.value_gutter, top: G.pad_sm, bottom: G.pad_sm, containLabel: true },
    xAxis: { type: "value", show: false, max: top },
    yAxis: { type: "category", inverse: true, axisLine: { show: false }, axisTick: { show: false },
      data: keywords.map((k) => ({ value: k, textStyle: sel.has(k) ? { fontWeight: 700, color: c("text") } : {} })),
      axisLabel: { color: c("chart-axis"), fontSize: px("caption") } },
    tooltip: { trigger: "item", confine: true, formatter: (p) => `<b>${esc(p.name)}</b><br/>${esc(region)} 과정 ${fmt(p.value)}개` },
    series: [{ type: "bar", barWidth: bw, cursor: "pointer", showBackground: true, backgroundStyle: { color: c("chart-track"), borderRadius: bw / 2 },
      label: { show: true, position: "right", color: c("text"), fontWeight: 700, fontSize: px("caption") },
      data: keywords.map((k) => ({ name: k, value: vals[k] || 0, itemStyle: { borderRadius: bw / 2,
        color: sel.size && !sel.has(k) ? c("chart-dim") : CH.grad() } })) }] };
};

/* ---------------- 대한민국 시·도 지도 (요청 E3) ---------------- */
CH.REGIONS = ["서울", "부산", "대구", "인천", "광주", "대전", "울산", "세종", "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"];
const LABEL_AT = { 경기: [127.45, 37.2], 강원: [128.3, 37.65], 충북: [127.8, 36.8], 충남: [126.8, 36.35], 전북: [127.15, 35.72],
  전남: [126.95, 34.85], 경북: [128.75, 36.5], 경남: [128.25, 35.3], 제주: [126.55, 33.38], 서울: [126.25, 37.95], 인천: [125.55, 37.4],
  세종: [126.55, 36.8], 대전: [127.8, 36.12], 광주: [126.2, 35.35], 대구: [128.3, 35.72], 울산: [129.8, 35.72], 부산: [129.55, 34.95] };
const CITY_AT = { 서울: [126.98, 37.56], 인천: [126.65, 37.46], 세종: [127.29, 36.56], 대전: [127.39, 36.35], 광주: [126.85, 35.16],
  대구: [128.6, 35.87], 울산: [129.31, 35.54], 부산: [129.07, 35.18] };
CH.koreaMap = (values, o = {}) => {
  const sel = o.selected || [], total = Object.values(values).reduce((a, b) => a + b, 0) || 1;
  const vmax = Math.max(1, ...Object.values(values));
  const n = (r) => values[r] || 0, share = (r) => Math.round(n(r) / total * 1000) / 10;
  const label = { show: true, formatter: (p) => `${p.name}\n${p.value[2]}`, color: c("text"), fontSize: px("caption"), fontWeight: 700,
    lineHeight: px("caption") + 2, textBorderColor: c("surface"), textBorderWidth: 2 };
  return [{ geo: { map: "korea", roam: false, aspectScale: G.map_aspect, layoutCenter: ["50%", "50%"], layoutSize: "100%",
      selectedMode: false, label: { show: false },
      regions: sel.length ? CH.REGIONS.map((r) => ({ name: r, itemStyle: sel.includes(r) ? { borderColor: c("text"), borderWidth: G.stroke } : { opacity: G.dim } })) : [],
      itemStyle: { areaColor: c("chart-track"), borderColor: c("bg"), borderWidth: 1 },
      emphasis: { label: { show: false }, itemStyle: { areaColor: c("chart-highlight"), borderColor: c("text"), borderWidth: G.stroke,
        shadowBlur: G.glow, shadowColor: c("chart-highlight") } } },
    visualMap: { ...seqMap(vmax), seriesIndex: 0 },
    tooltip: { trigger: "item", formatter: (p) => { const d = p.data || {}; const v = d.n != null ? d.n : (d.value || 0);
      return `<b>${esc(p.name)}</b><br/><span style="font-size:16px;font-weight:700">${fmt(v)}</span> ${o.unit || ""}<br/>표시 합계의 ${d.share || 0}%`; } },
    series: [
      { type: "map", geoIndex: 0, cursor: "pointer", data: CH.REGIONS.map((r) => ({ name: r, value: n(r), share: share(r) })) },
      { type: "lines", coordinateSystem: "geo", silent: true, symbol: "none", z: 3,
        lineStyle: { color: c("chart-axis"), width: 1, type: "dashed", opacity: 0.8 },
        data: Object.keys(CITY_AT).map((r) => ({ coords: [CITY_AT[r], LABEL_AT[r]] })) },
      { type: "scatter", coordinateSystem: "geo", symbolSize: 4, cursor: "pointer", z: 4, itemStyle: { color: c("chart-axis") }, label,
        data: CH.REGIONS.map((r) => ({ name: r, value: [...LABEL_AT[r], n(r)], n: n(r), share: share(r), ...(CITY_AT[r] ? {} : { symbolSize: 0 }) })) }] },
  o.height || G.map_h];
};

/* ---------------- 직무 네트워크 (요청 F3) ---------------- */
const R1 = 1.6, R2 = 2.6, R3 = 3.5, NET_ROOT = "R:root";
CH.jobNetwork = (jobs, o = {}) => {
  const { major, middle, highlightDefense } = o;
  const majors = {}; jobs.forEach((j) => { majors[j.major_category] = (majors[j.major_category] || 0) + 1; });
  const majorList = Object.entries(majors).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0]));
  const total = Math.max(jobs.length, 1), pos = {}, nodes = [], links = [];
  let focus = new Set();
  if (middle) focus = new Set([NET_ROOT, `M:${major}`, `D:${middle}`, ...jobs.filter((j) => j.middle_category === middle).map((j) => `J:${j.job_id}`)]);
  else if (major) { const g = jobs.filter((j) => j.major_category === major);
    focus = new Set([NET_ROOT, `M:${major}`, ...g.map((j) => `D:${j.middle_category}`), ...g.map((j) => `J:${j.job_id}`)]); }
  const add = (name, label, x, y, size, color, level, value, showLabel) => {
    const on = !focus.size || focus.has(name);
    const scale = focus.size && on ? G.net_focus_scale : focus.size ? G.net_dim_scale : 1;
    pos[name] = [x, y];
    nodes.push({ name, x, y, value, symbolSize: Math.round(size * scale * 10) / 10,
      itemStyle: { color, opacity: on ? 1 : G.net_dim_opacity, borderColor: c("surface"), borderWidth: 1 },
      label: { show: showLabel && on, formatter: label, position: level === 0 ? "inside" : "right",
        fontSize: level < 3 ? px("caption") : px("label"), fontWeight: level < 3 ? 700 : 400, color: c("text") },
      tooltip: { formatter: label.replace(/\n/g, " · ") } });
  };
  add(NET_ROOT, `드론 직무\n${jobs.length}`, 0, 0, G.net_root, c("chart-grad-start"), 0, jobs.length, true);
  let start = 0;
  majorList.forEach(([mj, nMj]) => {
    const span = 2 * Math.PI * nMj / total, mid = start + span / 2, mname = `M:${mj}`;
    add(mname, `${mj}\n${nMj}`, R1 * Math.cos(mid), R1 * Math.sin(mid), G.net_major, c("chart-grad-start"), 1, nMj, true);
    links.push([NET_ROOT, mname]);
    const g = jobs.filter((j) => j.major_category === mj), mids = {};
    g.forEach((j) => { mids[j.middle_category] = (mids[j.middle_category] || 0) + 1; });
    let a0 = start;
    Object.entries(mids).sort((a, b) => b[1] - a[1] || cmp(a[0], b[0])).forEach(([md, nMd]) => {
      const mspan = span * nMd / nMj, dname = `D:${md}`, dir = a0 + mspan / 2;
      add(dname, `${md}\n${nMd}`, R2 * Math.cos(dir), R2 * Math.sin(dir), G.net_middle, c("chart-grad-end"), 2, nMd, !!major);
      links.push([mname, dname]);
      const js = g.filter((j) => j.middle_category === md).sort(by("job_title_ko")), fan = md === middle;
      js.forEach((j, i) => {
        let x, y;
        if (fan) { const ang = dir + (G.net_fan_deg * Math.PI / 180) * ((i + 0.5) / js.length - 0.5), fr = 1 + (i % 2 ? 0.28 : 0);
          x = R2 * Math.cos(dir) + fr * Math.cos(ang); y = R2 * Math.sin(dir) + fr * Math.sin(ang); }
        else { const ang = a0 + mspan * (i + 0.5) / js.length, rad = R3 + (i % 2 ? 0.3 : 0); x = rad * Math.cos(ang); y = rad * Math.sin(ang); }
        const red = !!j.defense_workplace;
        add(`J:${j.job_id}`, j.job_title_ko, x, y, G.net_job * (red ? 1.3 : 1),
          red ? c("defense-strong") : highlightDefense ? c("chart-muted") : c("chart-primary"), 3, 1, !!middle);
      });
      a0 += mspan;
    });
    start += span;
  });
  const edges = links.map(([s, t]) => { const on = !focus.size || (focus.has(s) && focus.has(t));
    return { source: s, target: t, lineStyle: { color: focus.size && on ? c("chart-primary") : c("chart-axis"),
      opacity: on ? G.net_edge_on : G.net_dim_opacity / 2, width: focus.size && on ? G.stroke : 1 } }; });
  if (focus.size) {   // 선택 가지를 가운데로 옮겨 화면을 채우고, 나머지는 가장자리 고리로 (charts.py와 같은 계산)
    const core = middle ? new Set([...focus].filter((n) => n.startsWith("D:") || n.startsWith("J:"))) : new Set([...focus].filter((n) => n !== NET_ROOT));
    const branch = [...core].filter((n) => pos[n]).map((n) => pos[n]);
    const cx = branch.reduce((a, p) => a + p[0], 0) / branch.length, cy = branch.reduce((a, p) => a + p[1], 0) / branch.length;
    const ex = (R3 + 0.5) * G.net_aspect * G.net_edge_ring, ey = (R3 + 0.5) * G.net_edge_ring;
    const sx = Math.max(...branch.map((p) => Math.abs(p[0] - cx))) || 1, sy = Math.max(...branch.map((p) => Math.abs(p[1] - cy))) || 1;
    const k = Math.min(ex * 0.9 / sx, ey * 0.9 / sy);
    nodes.forEach((n) => {
      let x = (n.x - cx) * k, y = (n.y - cy) * k;
      const inside = (x / ex) ** 2 + (y / ey) ** 2;
      if (!core.has(n.name) && inside > 1) { x /= Math.sqrt(inside); y /= Math.sqrt(inside); }
      n.x = Math.round(x * 1e4) / 1e4; n.y = Math.round(y * 1e4) / 1e4;
      if (n.name === NET_ROOT) { n.symbolSize = G.net_middle; Object.assign(n.label, { formatter: "전체 보기", position: "left", fontWeight: 400 }); }
    });
  }
  const extent = R3 + 0.5;
  [-1, 1].forEach((s, i) => nodes.push({ name: `_anchor${i}`, x: s * extent * G.net_aspect, y: s * extent, symbolSize: 0,
    label: { show: false }, tooltip: { show: false }, itemStyle: { opacity: 0 } }));
  const jobEdges = jobs.map((j) => ({ source: `D:${j.middle_category}`, target: `J:${j.job_id}`, lineStyle: { color: c("chart-axis"),
    opacity: !focus.size || focus.has(`J:${j.job_id}`) ? G.net_edge_on : G.net_dim_opacity / 2, width: 1 } }));
  return [{ tooltip: { trigger: "item" }, series: [{ type: "graph", layout: "none", roam: false, draggable: false, cursor: "pointer",
    animationDurationUpdate: D.theme.motion.chart_update_ms * 2, animationEasingUpdate: "cubicInOut",
    data: nodes, links: [...edges, ...jobEdges],
    emphasis: { label: { show: true }, itemStyle: { shadowBlur: G.glow, shadowColor: c("chart-highlight") } } }] }, G.net_h];
};

/* ---------------- 04 얇은 막대(요청 N10·N11·N13: 03 키워드 막대와 같은 모양) ---------------- */
const thinBase = (cats, sel, tip) => ({
  grid: { left: G.pad, right: G.value_gutter, top: G.pad_sm, bottom: G.pad_sm, containLabel: true },
  yAxis: { type: "category", inverse: true, axisLine: { show: false }, axisTick: { show: false },
    axisLabel: { color: c("chart-axis"), fontSize: px("caption") },
    data: cats.map((k) => ({ value: k, textStyle: sel.includes(k) ? { fontWeight: 700, color: c("text") } : {} })) },
  tooltip: { trigger: "axis", axisPointer: { type: "shadow" }, confine: true, formatter: tip } });
/** 합계(초록) 위에 그중 방산(빨강 빗금)을 0부터 겹쳐 그림 — 양 끝 모두 둥글게(charts.thin_split_hbar) */
CH.thinSplit = (cats, part, rest, o = {}) => {
  const sel = o.selected || [], bw = overlapW(Math.floor(G.bar_w * 2 / 3)), [pn, pv] = part, [rn, rv] = rest;
  const tot = cats.map((_, i) => pv[i] + rv[i]), dim = (k) => (sel.length && !sel.includes(k) ? { opacity: G.dim } : {});
  const data = (vals) => cats.map((k, i) => ({ value: vals[i], name: k, part: pv[i], rest: rv[i], total: tot[i], itemStyle: dim(k) }));
  const base = { type: "bar", barWidth: bw, barGap: OVERLAP_GAP, cursor: "pointer" };
  return { ...thinBase(cats, sel, (ps) => { const d = ps[0].data;
      return `<b>${esc(ps[0].name)}</b><br/>${pn} ${fmt(d.part)} ${o.unit || ""}<br/>${rn} ${fmt(d.rest)} ${o.unit || ""}<br/>합계 ${fmt(d.total)} ${o.unit || ""}`; }),
    xAxis: { type: "value", show: false, max: Math.max(1, ...tot) },
    series: [{ ...base, name: rn, z: 2, showBackground: true, backgroundStyle: { color: c("chart-track"), borderRadius: bw / 2 },
      itemStyle: { color: CH.grad(), borderRadius: bw / 2 }, data: data(tot),
      label: { show: true, position: "right", color: c("text"), fontWeight: 700, fontSize: px("caption"), formatter: (p) => fmt(p.data.total) } },
    { ...base, name: pn, z: 3, itemStyle: { color: CH.dgrad(), decal: decal(), borderRadius: bw / 2 }, data: data(pv) }] };
};
/** 그룹 안 비중 양쪽 비교(같은 줄에 겹쳐 그려 0%도 제자리, charts.thin_diverging_hbar) */
CH.thinDiverging = (cats, left, right, o = {}) => {
  const sel = o.selected || [], bw = Math.floor(G.bar_w * 2 / 3), [ln, lv] = left, [rn, rv] = right, vmax = Math.max(1, ...lv, ...rv);
  const lab = { show: true, color: c("text"), fontWeight: 700, fontSize: px("caption"), formatter: (p) => Math.abs(p.value) + "%" };
  const dim = (k) => (sel.length && !sel.includes(k) ? { opacity: G.dim } : {});
  return { ...thinBase(cats, sel, (ps) => `<b>${esc(ps[0].name)}</b>` + ps.map((p) => `<br/>${p.marker}${p.seriesName} ${Math.abs(p.value)}%`).join("")
      + '<br/><span style="opacity:.7">그룹 크기가 달라 비중으로 비교</span>'),
    xAxis: { type: "value", show: false, min: -vmax * 1.25, max: vmax * 1.25 },
    series: [{ type: "bar", name: ln, barGap: "-100%", barWidth: bw, cursor: "pointer", label: { ...lab, position: "left" },
      itemStyle: { color: CH.grad(), borderRadius: [bw / 2, 0, 0, bw / 2] }, data: cats.map((k, i) => ({ value: -lv[i], name: k, itemStyle: dim(k) })) },
    { type: "bar", name: rn, barGap: "-100%", barWidth: bw, cursor: "pointer", label: { ...lab, position: "right" },
      itemStyle: { color: CH.dgrad(), decal: decal(), borderRadius: [0, bw / 2, bw / 2, 0] }, data: cats.map((k, i) => ({ value: rv[i], name: k, itemStyle: dim(k) })) }] };
};

/* ---------------- 02 3D 네트워크 데이터(components/job_graph3d.py job_graph3d와 같은 계산) ---------------- */
CH.net3dData = (jobs, o) => {
  const ids = new Set(jobs.map((j) => "J:" + j.job_id)), majors = new Set(jobs.map((j) => j.major_category)), mids = new Set(jobs.map((j) => j.middle_category));
  const nodes = D.net3d.nodes.filter((n) => n.level === 0 || (n.level === 1 && majors.has(n.major)) || (n.level === 2 && mids.has(n.middle)) || ids.has(n.id));
  const keep = new Set(nodes.map((n) => n.id)), links = D.net3d.links.filter(([a, b]) => keep.has(a) && keep.has(b));
  let focus = new Set();
  if (o.middle) focus = new Set(["R:root", "M:" + o.major, "D:" + o.middle, ...nodes.filter((n) => n.middle === o.middle).map((n) => n.id)]);
  else if (o.major) focus = new Set(["R:root", ...nodes.filter((n) => n.major === o.major).map((n) => n.id)]);
  const def = new Set(["R:root"]); nodes.filter((n) => n.defense).forEach((n) => { def.add(n.id); def.add("D:" + n.middle); def.add("M:" + n.major); });
  const color = { 0: c("net-core"), 1: c("net-major"), 2: c("net-middle") };
  const size = { 0: G.net_root / 3.2, 1: G.net_major / 3.2, 2: G.net_middle / 3.0, 3: G.net_job / 2.6 };
  const out = nodes.map((n) => ({ ...n, def: def.has(n.id), color: n.level === 3 ? (n.defense ? c("defense-strong") : c("net-job")) : color[n.level],
    size: Math.round((n.level === 3 ? size[3] * (n.defense ? 1.35 : 1) : size[n.level]) * 10) / 10, label: n.level === 0 && focus.size ? "전체 보기" : n.label }));
  return { nodes: out, links, focus: [...focus], focus_zoom: o.middle ? 1.9 : o.major ? 1.45 : 1, sway: o.middle ? [0.08, 600] : [0.16, 420],
    highlight: !!o.highlight, show_jobs: !!o.middle, height: G.net_h_max, height_min: G.net_h, rings: [0.46, 0.76, 1.0], motion: S.ui.motion,
    font: `700 ${px("caption")}px ${FONT}`, colors: { link: c("chart-axis"), link_on: c("chart-primary"), text: c("text"), halo: c("bg"), ring: c("chart-primary") } };
};
/** 앱 부품 JS(G3·LCM)를 붙이는 자리: 다시 그려도 같은 요소를 다시 붙여 회전 상태가 이어진다 */
CH.hosts = {};
CH.cleanups = {};       // 부품이 돌려준 정리 함수(홈 3D: 홈을 떠나면 그리기 반복을 멈춤)
CH.mountComp = (id, fn, data, onTrigger, onState) => CH.after.push(() => {
  const ph = document.querySelector(`[data-comp="${id}"]`); if (!ph) return;
  const el = CH.hosts[id] || (CH.hosts[id] = document.createElement("div"));
  ph.replaceWith(el);
  // setStateValue(홈 메뉴 열림·움직임)은 저장만 하고 다시 그리지 않는다(부품이 스스로 상태를 그림)
  const ret = fn({ data, parentElement: el, setTriggerValue: (name, value) => { onTrigger(name, value); save(); render(); },
    setStateValue: (name, value) => { if (onState) onState(name, value); } });
  if (typeof ret === "function") CH.cleanups[id] = ret;
});
