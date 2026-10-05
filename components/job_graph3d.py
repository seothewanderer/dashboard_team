"""02 직무 3D 네트워크 (요청 M2, 2026-10-01). 옵시디언 그래프처럼 점·선이 공간에 떠 있는 홀로그램 모양.

- 구조: 가운데 코어(전체) → 대분류(안쪽 구) → 중분류(가운데 구) → 직무(바깥 구). 가지마다 방향을 나눠 같은 가지가 모인다.
- 움직임: 마우스를 올리면 멈추고, 누른 채 끌면 돌아감(요청 M2 후속).
  마우스가 없으면 홈 드론처럼 천천히 스스로 회전(축이 조금씩 바뀌어 한 방향만이 아님).
- 클릭: 코어 = 전체, 대분류·중분류 = 그 가지 강조(기존 필터와 같은 이름 규칙 R:/M:/D:/J:), 직무 = 상세 팝업.
- 색: 토큰 값(테마별). 방산기업 근무처 직무는 빨강(요청 F2 유지). 움직임 끄기·동작 줄이기 설정이면 자동 회전 없음.
Streamlit components.v2 + canvas 2D(새 라이브러리 없음).
"""
from collections.abc import Callable

import pandas as pd
import streamlit as st

from analytics import job_layout
from components import charts
from core import export_mode, theme

ROOT_ID, R1, R2, R3 = job_layout.ROOT_ID, job_layout.R1, job_layout.R2, job_layout.R3

_CSS = """
.g3{position:relative;width:100%;border-radius:var(--radius-md);overflow:hidden;
  background:radial-gradient(ellipse at 50% 45%, var(--holo-core) 0%, transparent 62%)}
.g3 canvas{display:block;width:100%;cursor:grab}
.g3 canvas.drag{cursor:grabbing}.g3 canvas.hot{cursor:pointer}
.g3::after{content:"";position:absolute;inset:0;pointer-events:none;opacity:var(--holo-scan-opacity);
  background:repeating-linear-gradient(to bottom, var(--holo-scan) 0 1px, transparent 1px 4px)}
.g3-tip{position:absolute;pointer-events:none;padding:6px 10px;border-radius:6px;font:var(--font-caption);
  background:var(--tip-bg);color:var(--tip-fg);box-shadow:var(--shadow-tip);opacity:0;transition:opacity 120ms;white-space:nowrap}
"""

_JS = """
export default function(component) {
  const { data, parentElement, setTriggerValue } = component;
  let root = parentElement.querySelector('.g3');
  if (!root) {
    root = document.createElement('div'); root.className = 'g3';
    root.innerHTML = '<canvas></canvas><div class="g3-tip"></div>';
    parentElement.appendChild(root);
  }
  const cv = root.querySelector('canvas'), tip = root.querySelector('.g3-tip'), ctx = cv.getContext('2d');
  const C = data.colors, N = data.nodes, byId = {};
  N.forEach((n) => { byId[n.id] = n; });
  const focus = new Set(data.focus), hasFocus = focus.size > 0;
  const reduce = !data.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  // 상태는 다시 그려도 이어지게 root에 둔다(선택을 바꿔도 회전 각도 유지)
  const S = root._s || (root._s = { yaw: 0.6, pitch: -0.25, vy: 0, vp: 0, t: 0, mx: null, my: null, drag: null, hover: null, zoom: 1 });
  S.data = data;
  // 강조 가지를 앞으로: 가지 무게중심 방향의 각도
  let target = null;
  if (hasFocus) {
    let x = 0, y = 0, z = 0, k = 0;
    N.forEach((n) => { if (focus.has(n.id) && n.level > 0) { x += n.x; y += n.y; z += n.z; k++; } });
    // 화면 앞쪽(z<0)으로: 회전 후 z1 = r·cos(φ+yaw) = -r 이 되게 yaw = π - φ, 높이는 pitch = -atan2(y, 수평거리)
    if (k) target = { yaw: Math.PI - Math.atan2(x, z), pitch: -Math.atan2(y, Math.hypot(x, z)) * 0.8 };
  }
  S.target = target; S.zoomTarget = hasFocus ? data.focus_zoom : 1;
  // 첫 등장: 가운데 핵에서 대분류 → 중분류 → 직무 순으로 가지가 자라남. 페이지에 들어올 때마다 한 번.
  // 시작 시각을 window에 두어 다시 붙어도 처음부터 다시 하지 않고 이어 감. 테마 전환(새로고침)으로 다시 열린 경우는 생략
  const G0 = window.__g3Grow;
  if (!G0 || G0.id !== data.grow_id) {
    let themeReload = false;
    if (!G0) { try { themeReload = sessionStorage.getItem('drone-theme-reload') === window.location.pathname;
      sessionStorage.removeItem('drone-theme-reload'); } catch (e) {} }
    window.__g3Grow = { id: data.grow_id, t0: themeReload ? -Infinity : performance.now() };
  }
  S.grow0 = reduce ? null : window.__g3Grow.t0;
  const LV = [[0, 0.15], [0.1, 0.32], [0.35, 0.32], [0.62, 0.3]];   // 층별 [시작, 길이](전체 진행 0~1 기준)
  N.forEach((n, i) => { n._g0 = LV[n.level][0] + (n.level ? 0.06 * ((i * 0.618) % 1) : 0); });   // 같은 층도 조금씩 엇갈리게

  function size() {
    const w = root.clientWidth || 600, d = window.devicePixelRatio || 1;
    const h = Math.round(Math.min(Math.max(w * 0.9, data.height_min), data.height));   // 폭에 맞춰 정사각형에 가깝게(요청 M2 후속)
    if (cv.width !== Math.round(w * d) || cv.height !== Math.round(h * d)) {
      cv.width = Math.round(w * d); cv.height = Math.round(h * d);
    }
    if (cv.style.height !== h + 'px') cv.style.height = h + 'px';   // 다시 붙은 캔버스도 높이를 꼭 맞춤
    ctx.setTransform(d, 0, 0, d, 0, 0);
    return [w, h];
  }
  function project(n, w, h) {
    const cy = Math.cos(S.yaw), sy = Math.sin(S.yaw), cp = Math.cos(S.pitch), sp = Math.sin(S.pitch);
    const x1 = n.x * cy + n.z * sy, z1 = -n.x * sy + n.z * cy;
    const y2 = n.y * cp - z1 * sp, z2 = n.y * sp + z1 * cp;
    const scale = Math.min(w, h) * 0.42 * S.zoom, f = 3.2, p = f / (f + z2);
    return { x: w / 2 + x1 * scale * p, y: h / 2 + y2 * scale * p, p, z: z2 };
  }
  function step() {
    const [w, h] = size();
    S.t += 1;
    // 회전: 마우스 위치로 좌우 빠르게(가운데·점 위는 멈춤), 마우스가 없으면 천천히 자전(축이 바뀜)
    if (S.drag) { /* 끌기 중에는 손이 돌림 */ }
    else if (S.mx !== null) { S.vy *= 0.8; S.vp *= 0.8; }   // 마우스를 올리면 멈춤(요청 M2 후속), 돌리기는 끌어서
    else if (!reduce) {
      // 가만히 두면 천천히 자전: 빨라졌다 느려졌다·축이 바뀜, 최대 속도는 낮춤(요청 M2 후속)
      const idleY = 0.0016 * Math.sin(S.t / 900 + 1.3) + 0.0016, idleP = 0.0007 * Math.sin(S.t / 520);
      S.vy += (idleY - S.vy) * 0.02; S.vp += (idleP - S.vp) * 0.02;
    } else { S.vy *= 0.9; S.vp *= 0.9; }
    S.yaw += S.vy; S.pitch += S.vp;
    if (S.target && S.mx === null && !S.drag) {      // 강조 가지는 앞쪽으로 천천히 돌아와 좌우로 흔들림
      // 확대 상태에서는 작고 느리게 흔들림: 대분류 < 중분류 순으로 폭·속도를 줄임(요청 M5 후속)
      const sway = reduce ? 0 : data.sway[0] * Math.sin(S.t / data.sway[1]);
      let dy = S.target.yaw + sway - S.yaw; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
      S.yaw += dy * 0.03; S.pitch += (S.target.pitch - S.pitch) * 0.03; S.vy *= 0.9;
    }
    S.pitch = Math.max(-1.1, Math.min(1.1, S.pitch));
    S.zoom += (S.zoomTarget - S.zoom) * 0.06;
    draw(w, h);
    if (root.isConnected) root._raf = requestAnimationFrame(step);   // 화면에서 빠지면 멈춤
  }
  function ring(r, w, h, alpha) {   // 바닥 고리(홀로그램 받침)
    ctx.beginPath();
    for (let i = 0; i <= 96; i++) {
      const a = i / 96 * Math.PI * 2, q = project({ x: Math.cos(a) * r, y: 0.0, z: Math.sin(a) * r }, w, h);
      i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y);
    }
    ctx.strokeStyle = C.ring; ctx.globalAlpha = alpha; ctx.lineWidth = 1; ctx.stroke(); ctx.globalAlpha = 1;
  }
  function draw(w, h) {
    ctx.clearRect(0, 0, w, h);
    const g = S.grow0 === null ? 1 : Math.min(1, (performance.now() - S.grow0) / data.grow_ms);
    const ge = (n) => {   // 이 점까지 자란 정도(0~1, 끝으로 갈수록 느려짐)
      if (g >= 1) return 1;
      const t = Math.max(0, Math.min(1, (g - n._g0) / LV[n.level][1])); return 1 - Math.pow(1 - t, 3);
    };
    data.rings.forEach((r, i) => ring(r, w, h, (0.18 - i * 0.04) * Math.min(1, g * 3)));
    const P = {}; N.forEach((n) => { P[n.id] = project(n, w, h); });
    // 선: 깊이에 따라 흐리게, 강조 가지는 초록. 자라는 중에는 부모 점에서 자식 쪽으로 뻗음
    data.links.forEach(([a, b]) => {
      const pa = P[a], pb0 = P[b]; if (!pa || !pb0) return;
      const e = ge(byId[b]); if (e <= 0) return;
      const pb = e >= 1 ? pb0 : { x: pa.x + (pb0.x - pa.x) * e, y: pa.y + (pb0.y - pa.y) * e, p: pb0.p };
      const on = !hasFocus || (focus.has(a) && focus.has(b));
      const depth = Math.max(0.15, Math.min(1, (pa.p + pb.p) / 2 - 0.45));
      const lit = !data.highlight || (byId[a].def && byId[b].def);   // 방산 강조: 방산 가지 밖은 불이 꺼진 듯 흐리게
      ctx.strokeStyle = on && hasFocus && lit ? C.link_on : C.link;
      ctx.globalAlpha = (on && lit ? 0.55 : 0.08) * depth; ctx.lineWidth = on && hasFocus && lit ? 1.4 : 0.8;
      ctx.beginPath(); ctx.moveTo(pa.x, pa.y); ctx.lineTo(pb.x, pb.y); ctx.stroke();
    });
    ctx.globalAlpha = 1;
    // 점: 뒤에서 앞으로
    const order = N.slice().sort((a, b) => P[b.id].z - P[a.id].z);
    order.forEach((n) => {
      const q = P[n.id], on = (!hasFocus || focus.has(n.id)) && (!data.highlight || n.def), hot = S.hover === n.id;
      const k = n.level ? Math.max(0, (ge(n) - 0.75) / 0.25) : ge(n);   // 선이 거의 닿으면 점이 톡 생김(핵은 바로 커짐)
      if (k <= 0) { n._q = null; return; }   // 아직 안 생긴 점은 누를 수 없음
      const r = n.size * q.p * (on && hasFocus ? 1.25 : 1) * (hot ? 1.5 : 1) * (0.8 + 0.2 * S.zoom) * k;
      const depth = Math.max(0.25, Math.min(1, q.p * 1.2 - 0.3));
      ctx.globalAlpha = (on ? 1 : 0.18) * depth;
      if (n.level <= 1 || hot || (on && hasFocus && n.level === 2)) { ctx.shadowBlur = hot ? 22 : 14; ctx.shadowColor = n.color; }
      ctx.fillStyle = n.color; ctx.beginPath(); ctx.arc(q.x, q.y, r, 0, Math.PI * 2); ctx.fill();
      ctx.shadowBlur = 0;
      n._r = r; n._q = q;
    });
    // 이름: 코어·대분류는 항상, 중분류는 대분류 강조 때, 직무는 중분류 강조 때(앞쪽만)
    ctx.textBaseline = 'middle'; ctx.font = data.font;
    const lab = Math.max(0, (g - 0.85) / 0.15);   // 이름은 다 자란 뒤 서서히
    order.forEach((n) => {
      if (!lab || !n._q) return;
      const q = P[n.id], on = (!hasFocus || focus.has(n.id)) && (!data.highlight || n.def);
      // 선택·방산 강조 중에는 관련 없는 가지 이름을 숨김(마우스를 올리면 보임, 요청 M5)
      const quiet = hasFocus || data.highlight;
      const show = S.hover === n.id || n.level === 0 || (n.level === 1 && (on || !quiet))
        || (on && quiet && n.level === 2) || (on && data.show_jobs && n.level === 3);
      if (!show || (S.hover !== n.id && q.z > (n.level <= 1 && !hasFocus ? 0.05 : 0.55))) return;   // 대분류 이름은 앞쪽 반구만(겹침 방지)
      ctx.globalAlpha = (on ? 1 : 0.35) * Math.max(0.35, Math.min(1, q.p * 1.3 - 0.3)) * lab;
      ctx.lineWidth = 3; ctx.strokeStyle = C.halo; ctx.fillStyle = C.text;
      const label = n.label, x = q.x + n._r + 5;
      ctx.strokeText(label, x, q.y); ctx.fillText(label, x, q.y);
    });
    ctx.globalAlpha = 1;
  }
  // 마우스 좌표는 화면 px, 점 위치는 확대 전 px → 비율 확대(요청 AE3) 중에는 그만큼 나눠 맞춘다
  const local = (ev) => { const b = cv.getBoundingClientRect(), k = b.width / (cv.clientWidth || b.width) || 1;
    return [(ev.clientX - b.left) / k, (ev.clientY - b.top) / k]; };
  function pick(ev) {
    const [x, y] = local(ev);
    let best = null, bd = 1e9;
    N.forEach((n) => { if (!n._q) return; const d = Math.hypot(n._q.x - x, n._q.y - y);
      if (d < Math.max(7, n._r + 3) && n._q.z < bd) { best = n; bd = n._q.z; } });
    return [best, x, y];
  }
  cv.onmousemove = (ev) => {
    [S.mx, S.my] = local(ev);
    if (S.drag) { S.yaw += (ev.clientX - S.drag.x) * 0.008; S.pitch += (ev.clientY - S.drag.y) * 0.006;
      S.drag = { x: ev.clientX, y: ev.clientY, moved: true }; return; }
    const [n, x, y] = pick(ev);
    S.hover = n ? n.id : null; cv.classList.toggle('hot', !!n);
    if (n) { tip.textContent = n.tip; tip.style.left = Math.min(x + 14, root.clientWidth - tip.offsetWidth - 8) + 'px';
      tip.style.top = (y + 14) + 'px'; tip.style.opacity = 1; } else tip.style.opacity = 0;
  };
  cv.onmouseleave = () => { S.mx = S.my = null; S.hover = null; S.drag = null; tip.style.opacity = 0; cv.classList.remove('drag'); };
  cv.onmousedown = (ev) => { S.drag = { x: ev.clientX, y: ev.clientY, moved: false }; cv.classList.add('drag'); };
  cv.onmouseup = (ev) => {
    const moved = S.drag && S.drag.moved; S.drag = null; cv.classList.remove('drag');
    if (moved) return;
    const [n] = pick(ev); if (n) setTriggerValue('node', n.id);
  };
  if (root._raf) cancelAnimationFrame(root._raf);   // 다시 그릴 때 이전 루프를 멈추고 새 데이터로 시작
  root._raf = requestAnimationFrame(step);
}
"""

_comp = st.components.v2.component("job_graph3d", css=_CSS, js=_JS)


@st.cache_data(show_spinner=False)
def layout(jobs: pd.DataFrame) -> tuple[list[dict], list[list[str]]]:
    return job_layout.layout(jobs)


def job_graph3d(jobs: pd.DataFrame, *, major: str | None, middle: str | None, highlight_defense: bool,
                key: str, on_click: Callable[[str], None], height: int | None = None) -> None:
    """jobs = 지금 필터가 걸린 직무. major·middle = 강조 가지(기존 필터). on_click(이름: R:/M:/D:/J:)."""
    nodes, links = layout(jobs)
    G = theme.CHART
    color = {0: charts.c("net-core"), 1: charts.c("net-major"), 2: charts.c("net-middle")}   # 층마다 초록 진하기 차이(요청 M2 후속)
    # 방산 강조: 방산 직무와 그 중분류·대분류(+코어)만 밝게, 나머지 가지는 불이 꺼진 듯 흐리게(회색 아님, 사용자 결정)
    defense = {ROOT_ID} | {n["id"] for n in nodes if n.get("defense")}
    defense |= {f"D:{n['middle']}" for n in nodes if n.get("defense")} | {f"M:{n['major']}" for n in nodes if n.get("defense")}
    sizes = {0: G["net_root"] / 3.2, 1: G["net_major"] / 3.2, 2: G["net_middle"] / 3.0, 3: G["net_job"] / 2.6}
    focus: set[str] = set()
    if middle:
        focus = {ROOT_ID, f"M:{major}", f"D:{middle}"} | {n["id"] for n in nodes if n.get("middle") == middle}
    elif major:
        focus = {ROOT_ID} | {n["id"] for n in nodes if n.get("major") == major}
    out = []
    for n in nodes:
        lv = n["level"]
        if lv == 3:
            c = charts.c("defense-strong") if n["defense"] else charts.c("net-job")
            s = sizes[3] * (1.35 if n["defense"] else 1)
        else:
            c, s = color[lv], sizes[lv]
        out.append({**n, "color": c, "size": round(s, 1), "label": "전체 보기" if lv == 0 and focus else n["label"],
                    "def": n["id"] in defense})
    comp_key = f"{key}-{theme.mode()}"

    def _fire():
        value = (st.session_state.get(comp_key) or {}).get("node")
        if value:
            on_click(value)

    _comp(data={
        "nodes": out, "links": links, "focus": sorted(focus), "focus_zoom": 1.9 if middle else (1.45 if major else 1), "sway": [0.08, 600] if middle else [0.16, 420], "highlight": bool(highlight_defense),
        "show_jobs": bool(middle), "height": height or G["net_h_max"], "height_min": G["net_h"], "rings": [R1, R2, R3],
        "motion": st.session_state["ui"]["motion"] and not export_mode.on(),
        "grow_id": st.session_state.get("page_entry"), "grow_ms": theme.MOTION["net_grow_ms"],
        "font": f"700 {theme.px('caption')}px {theme.FONT_SANS}",
        "colors": {"link": charts.c("chart-axis"), "link_on": charts.c("chart-primary"), "text": charts.c("text"),
                   "halo": charts.c("bg"), "ring": charts.c("chart-primary")},
    }, key=comp_key, on_node_change=_fire)
