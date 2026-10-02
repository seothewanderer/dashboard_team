/* =========================================================
   Radial Navigation — five panels around the Home drone
   Owns: panel markup, staged open/close reveal (3D unfold via
   CSS), keyboard focusability, center→panel guide lines, panel
   hover direction (gaze), and selection.

   No routing: selection is reported through onSelect(key, el).
   Requires: a stage element containing a center element
   (default .hm-core) — see README for the markup contract.
   ========================================================= */
(function (global) {
  "use strict";

  /* options:
   *   container            stable ancestor of the (re-rendered) stage — delegated listeners live here
   *   entries()            [{ key, label, desc }] — five panels, P1 (top) → P5 (bottom right)
   *   escapeHtml(text)     host HTML escaper for labels
   *   onSelect(key, el)    panel chosen (host decides what happens: flight, route, …)
   *   onGaze(dir | null)   unit vector center → hovered panel, null when the pointer leaves
   *   canInteract()        gaze allowed now (e.g. no flight in progress)
   *   onLayout(rects)      panel obstacle rects in stage px (e.g. Airspace setPanels), [] when closed
   *   centerSelector       element the panels orbit (default ".hm-core") */
  function initRadialNavigation(options = {}) {
    const container = options.container;
    const noop = () => {};
    const entries = options.entries || (() => []);
    const esc = options.escapeHtml;
    const onGaze = options.onGaze || noop, onLayout = options.onLayout || noop;
    const canInteract = options.canInteract || (() => true);
    const centerSelector = options.centerSelector || ".hm-core";
    const R = { stage: null, center: null, panels: [], open: false };
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const cancel = () => { while (timers.length) clearTimeout(timers.pop()); };
    const cls = (...c) => R.stage && R.stage.classList.add(...c);
    const uncls = (...c) => R.stage && R.stage.classList.remove(...c);

    /* ---------------- 마크업 ---------------- */
    const stageClasses = () => "is-open is-revealed";
    const guidesMarkup = () => '<svg class="hm-guides" aria-hidden="true"></svg>';
    const menuMarkup = (open) => `<div class="hm-menu">${entries().map((e, i) => `<button type="button" class="hm-go hm-p${i + 1}" data-hm-radial="go" data-key="${esc(e.key)}" tabindex="${open ? 0 : -1}"><b>${esc(e.label)}</b><span>${esc(e.desc)}</span></button>`).join("")}</div>`;

    function setPanelsFocusable(on) { R.panels.forEach((p) => { p.tabIndex = on ? 0 : -1; }); }
    /* 열림: 드론이 물러난 뒤(400ms) 패널이 드론 쪽에서 앞으로 떠오르며 펼쳐진다(CSS 3D) → 전개 완료 후 is-revealed(onRevealed) */
    function open({ reduced = false, onRevealed } = {}) {
      R.open = true; cancel();
      if (reduced) { cls("is-open"); setPanelsFocusable(true); layout(); later(200, () => cls("is-revealed")); return; }
      later(400, () => { cls("is-open"); setPanelsFocusable(true); layout(); });
      later(400 + 120 + 4 * 55 + 560, () => { cls("is-revealed"); if (onRevealed) onRevealed(); });
    }
    // 닫힘: P5→P1 역순 stagger(CSS)
    function close() { R.open = false; cancel(); onLayout([]); uncls("is-open", "is-revealed"); setPanelsFocusable(false); }
    // 다시 그려진 stage와 상태만 맞춤(클래스는 호스트 마크업이 이미 반영)
    function sync(open) { R.open = !!open; cancel(); }
    function markSelected(el) {
      el.classList.add("is-selected");
      const gi = R.panels.indexOf(el); if (R.stage) R.stage.querySelectorAll(`.hm-guides [data-i="${gi}"]`).forEach((n) => n.classList.add("is-active"));
    }
    function mount(stage) { R.stage = stage; R.center = stage.querySelector(centerSelector); R.panels = [...stage.querySelectorAll(".hm-go")]; }
    function unmount() { R.stage = R.center = null; R.panels = []; }

    /* 패널 방향 guide: 중심 → 각 카드 가장자리까지 옅은 점선 (열린 상태에서만 보임) */
    function layout() {
      const stg = R.stage, svg = stg && stg.querySelector(".hm-guides");
      if (!svg || !R.center || !R.panels.length) return;
      const w = stg.clientWidth, h = stg.clientHeight;
      if (!w || !h || getComputedStyle(R.panels[0]).position !== "absolute") { svg.innerHTML = ""; return; }
      const cx = R.center.offsetLeft, cy = R.center.offsetTop, rx = R.center.offsetWidth * 0.66, ry = R.center.offsetHeight * 0.62;
      svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
      const rects = [];
      svg.innerHTML = R.panels.map((p, i) => {
        const px = p.offsetLeft, py = p.offsetTop, dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
        const tEdge = Math.min(Math.abs(ux) > 1e-3 ? p.offsetWidth / 2 / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-3 ? p.offsetHeight / 2 / Math.abs(uy) : Infinity);
        rects.push({ l: px - p.offsetWidth / 2 - 18, r: px + p.offsetWidth / 2 + 18, t: py - p.offsetHeight / 2 - 18, b: py + p.offsetHeight / 2 + 18 });
        const t0 = 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2), t1 = len - tEdge - 10;
        if (t1 - t0 < 16) return "";
        return `<line class="hm-guide-line" data-i="${i}" x1="${(cx + ux * t0).toFixed(1)}" y1="${(cy + uy * t0).toFixed(1)}" x2="${(cx + ux * t1).toFixed(1)}" y2="${(cy + uy * t1).toFixed(1)}"/>`
          + `<circle class="hm-guide-dot" data-i="${i}" cx="${(cx + ux * t1).toFixed(1)}" cy="${(cy + uy * t1).toFixed(1)}" r="2"/>`;
      }).join("");
      onLayout(rects);
    }

    /* ---------------- 입력 — container에 한 번만 위임 등록 ---------------- */
    container.addEventListener("click", (e) => {
      const g = e.target.closest && e.target.closest('[data-hm-radial="go"]'); if (!g || !container.contains(g)) return;
      if (options.onSelect) options.onSelect(g.dataset.key, g);
    });
    // 패널에 마우스를 올리면 그 방향(중심 → 패널)을 알린다 — 드론이 그쪽으로 고개를 돌려 드론과 패널이 하나의 3D 인터페이스처럼
    container.addEventListener("pointerover", (e) => { const g = e.target.closest && e.target.closest(".hm-go"); if (!g || !R.open || !R.center || !canInteract()) return;
      const rc = R.center.getBoundingClientRect(), rg = g.getBoundingClientRect(), dx = rg.left + rg.width / 2 - rc.left - rc.width / 2, dy = rg.top + rg.height / 2 - rc.top - rc.height / 2, l = Math.hypot(dx, dy) || 1;
      onGaze({ x: dx / l, y: dy / l }); });
    container.addEventListener("pointerout", (e) => { const g = e.target.closest && e.target.closest(".hm-go"); if (g && !g.contains(e.relatedTarget)) onGaze(null); });

    return {
      stageClasses, guidesMarkup, menuMarkup, open, close, sync, cancel, layout, markSelected, mount, unmount,
      indexOf: (el) => R.panels.indexOf(el), panel: (i) => R.panels[i] || null, isOpen: () => R.open,
    };
  }

  global.initRadialNavigation = initRadialNavigation;
})(window);
