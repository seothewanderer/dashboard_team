"""시각 효과 컴포넌트 (Streamlit 내장 components.v2). 색은 :root 토큰(var)만, 움직임은 theme.MOTION.

- stat_tiles: StatTile(DESIGN §6.23) + 숫자 카운트업
모든 움직임은 prefers-reduced-motion 과 사용자 '움직임 멈추기'(ui.motion)를 따른다.
"""
import streamlit as st

from core import export_mode, theme

_TILES_CSS = """
.tiles{display:grid;grid-template-columns:repeat(var(--cols),minmax(0,1fr));gap:var(--gutter);font-family:var(--font-sans)}
.tile{background:var(--surface);border-radius:var(--radius-md);padding:var(--space-lg);display:flex;flex-direction:column;gap:var(--space-xs);
  opacity:0;transform:translateY(var(--space-xs));animation:rise var(--rise) var(--ease-standard) forwards;
  transition:background var(--duration-base) var(--ease-standard),transform var(--duration-fast) var(--ease-standard)}
.tile:hover{background:var(--surface-2);transform:scale(var(--hover-scale))}
.tile:hover .value{color:var(--primary)}
.tile:nth-child(2){animation-delay:60ms}.tile:nth-child(3){animation-delay:120ms}.tile:nth-child(4){animation-delay:180ms}
.label{font:var(--font-label);letter-spacing:var(--type-label-ls);color:var(--text-2);margin:0}
.value{font:var(--font-data);letter-spacing:var(--type-data-ls);color:var(--text);margin:0;white-space:nowrap;transition:color var(--duration-fast) var(--ease-standard)}
.unit{font:var(--font-body);color:var(--text-2);margin-left:var(--space-xxs)}
.sub{font:var(--font-caption);color:var(--text-2);margin:0}
.tile.kpi{flex-direction:row;align-items:center;gap:var(--space-md);padding:var(--space-md) var(--space-lg)}
.ico{flex:none;width:var(--kpi-icon);height:var(--kpi-icon);border-radius:var(--radius-full);background:var(--accent-soft);display:grid;place-items:center}
.ico::before{content:"";width:var(--kpi-glyph);height:var(--kpi-glyph);background:var(--primary);
  -webkit-mask:var(--rest) center/contain no-repeat;mask:var(--rest) center/contain no-repeat}
.tile.kpi:hover .ico::before{-webkit-mask-image:var(--hover);mask-image:var(--hover)}
.kpi .label{font:var(--font-card-title);letter-spacing:0;color:var(--text)}
.kpi .value{font:var(--font-kpi);letter-spacing:var(--type-kpi-ls);color:var(--primary)}
.kpi--defense .ico{background:var(--defense-soft)}
.kpi--defense .ico::before{background:var(--defense-strong)}
.kpi--defense .value,.tile.kpi--defense:hover .value{color:var(--defense-strong)}
@keyframes rise{to{opacity:1;transform:none}}
@media (max-width:1024px){.tiles{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media (max-width:767px){.tiles{grid-template-columns:1fr}}
@media (prefers-reduced-motion:reduce){.tile{animation:none;opacity:1;transform:none}.tile:hover{transform:none}}
"""

_TILES_JS = """
export default function(component) {
  const { data, parentElement } = component;
  let root = parentElement.querySelector('.tiles');
  if (!root) { root = document.createElement('div'); root.className = 'tiles'; parentElement.appendChild(root); }
  root.style.setProperty('--cols', data.cols);
  Object.entries(data.type_vars).forEach(([k, v]) => root.style.setProperty(k, v));   // 카드: 원래 글자 크기(요청 E1)
  root.style.setProperty('--rise', data.motion ? '400ms' : '0ms');
  root.innerHTML = '';
  const reduce = !data.motion || window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const fmt = (v, d) => v.toLocaleString('ko-KR', {minimumFractionDigits: d, maximumFractionDigits: d});
  data.items.forEach((it) => {
    const el = document.createElement('div');
    el.className = it.icon ? 'tile kpi' + (it.tone === 'defense' ? ' kpi--defense' : '') : 'tile';   // tone defense = 빨강(요청 N1)
    const body = `<p class="label"></p><p class="value"><span class="num"></span><span class="unit"></span></p><p class="sub"></p>`;
    // 아이콘 카드(01 KPI, 요청 I1): 왼쪽 원 안 아이콘, 마우스를 올린 동안 움직임(움직임 끔이면 멈춘 그림만)
    el.innerHTML = it.icon ? `<span class="ico" aria-hidden="true"></span><div>${body}</div>` : body;
    if (it.icon) {
      const ico = el.querySelector('.ico');
      ico.style.setProperty('--rest', it.icon.rest);
      ico.style.setProperty('--hover', reduce ? it.icon.rest : it.icon.hover);
    }
    el.querySelector('.label').textContent = it.label;
    el.querySelector('.unit').textContent = it.unit || '';
    el.querySelector('.sub').textContent = it.sub || '';
    const num = el.querySelector('.num');
    root.appendChild(el);
    if (reduce) { num.textContent = fmt(it.value, it.decimals || 0); return; }
    const start = performance.now(), dur = data.duration;
    const step = (now) => {
      const p = Math.min(1, (now - start) / dur), e = 1 - Math.pow(1 - p, 3);   // cubic-out, 튀지 않음
      num.textContent = fmt(it.value * e, it.decimals || 0);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  });
}
"""

_tiles = st.components.v2.component("stat_tiles", css=_TILES_CSS, js=_TILES_JS)


def stat_tiles(items: list[dict], *, key: str, cols: int = 4) -> None:
    """items: {label, value, unit, decimals, sub, icon, tone}. 값은 계산된 실제 수치만. tone="defense" = 빨강 카드(요청 N1).
    icon(선택) = static/img/kpi_<icon>_rest/hover.webp 이름 — 있으면 아이콘 카드 모양(01 KPI, 요청 I1)."""
    items = [it | {"icon": {s: theme.img_uri(f"kpi_{it['icon']}_{s}") for s in ("rest", "hover")}} if it.get("icon") else it
             for it in items]
    _tiles(data={"items": items, "cols": cols, "motion": st.session_state["ui"]["motion"] and not export_mode.on(),
                 "duration": theme.MOTION["countup_ms"], "type_vars": theme.UNSCALED}, key=key)
