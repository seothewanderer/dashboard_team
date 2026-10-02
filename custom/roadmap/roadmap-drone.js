/* =========================================================
   Roadmap Drone — progress positioning along the workflow rail
   A small drone hovers beside the vertical rail, level with the
   user's current position, and draws a green progress line from the
   start of the rail down to it. Changing position flies the drone along the rail
   (ease-in-out); nodes light up as the line reaches them and the
   current node lights up when the drone arrives.

   Positions: "start" (before the first step) · a step key · null
   (no drone, e.g. a page that is not part of the workflow).

   Hosts that re-render the list on every update just call sync()
   after each render: the flight continues across re-renders (the
   tween is kept here, measured against the newest DOM). This is
   UI animation memory only — no host state is stored.
   Requires: roadmap-workflow.js decoration (.rm-step, .rm-node).
   ========================================================= */
(function (global) {
  "use strict";

  const ICON = `<svg class="rm-drone__svg" viewBox="0 0 24 16" width="18" height="12" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <path d="M1 3.5h5.5M17.5 3.5H23"/><path d="M3.75 3.5v2.5M20.25 3.5v2.5"/>
    <path d="M3.75 6 9 8.25M20.25 6 15 8.25"/><rect class="rm-drone__body" x="8.5" y="6.75" width="7" height="4.5" rx="2"/>
    <path d="M10.25 11.25 9.25 14M13.75 11.25l1 2.75"/></svg>`;
  const easeInOut = (k) => (k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2);
  const BOB_MS = 2800;

  /* options:
   *   stepSelector     steps relative to the container (default ":scope > .rm-step")
   *   titleSelector    list title (optional) — the start anchor sits between it and the first step
   *   offsetX / offsetY   drone center relative to its rail anchor (default -20, 0: beside the rail, outside the list's left edge)
   *   stepMs / baseMs / maxMs   flight duration = baseMs + stepMs × steps travelled (≤ maxMs)
   *   reducedMotion    MediaQueryList (default: prefers-reduced-motion) */
  function createRoadmapDrone(options = {}) {
    const reduce = options.reducedMotion || global.matchMedia("(prefers-reduced-motion: reduce)");
    const stepSelector = options.stepSelector || ":scope > .rm-step";
    const titleSelector = options.titleSelector || null;
    const OX = options.offsetX ?? -20, OY = options.offsetY ?? 0, BASE = options.baseMs ?? 560, STEP = options.stepMs ?? 240, MAX = options.maxMs ?? 1300;
    let host = null, els = null, geo = null, steps = [];
    let pos = null, tween = null, arrival = null, effect = null, raf = 0;
    const ro = new ResizeObserver(() => { if (host) { measure(); paint(performance.now()); } });

    const currentP = (now) => { if (!tween) return pos; const k = Math.min(1, (now - tween.t0) / tween.dur); return tween.from + (tween.to - tween.from) * easeInOut(k); };
    // 위치 p(0 = 시작점, i + 1 = i번째 단계) → 세로 px: 앵커 사이 선형 보간
    const yAt = (p) => { const ys = geo.ys, i = Math.max(0, Math.min(ys.length - 1, Math.floor(p))), j = Math.min(ys.length - 1, i + 1); return ys[i] + (ys[j] - ys[i]) * (p - i); };

    function ensureElements(entering) {
      let track = host.querySelector(":scope > .rm-track");
      if (!track) {
        track = document.createElement("div"); track.className = "rm-track";
        track.innerHTML = `<span class="rm-track__start" aria-hidden="true"></span><span class="rm-track__progress" aria-hidden="true"></span><span class="rm-drone" role="img"><span class="rm-drone__bob">${ICON}</span></span>`;
        host.append(track);
        const bob = track.querySelector(".rm-drone__bob");
        bob.style.animationDelay = `${-(performance.now() % BOB_MS)}ms`;        // 다시 그려져도 hover 위상이 이어지게
        if (entering) track.querySelector(".rm-drone").classList.add("is-entering");
      }
      els = { start: track.querySelector(".rm-track__start"), progress: track.querySelector(".rm-track__progress"), drone: track.querySelector(".rm-drone"), svg: track.querySelector(".rm-drone__svg") };
    }
    function measure() {
      const cr = host.getBoundingClientRect();
      steps = [...host.querySelectorAll(stepSelector)];
      const nodes = steps.map((s) => s.querySelector(":scope > .rm-node")).filter(Boolean);
      if (!nodes.length) { geo = null; return; }
      const nr = nodes.map((n) => n.getBoundingClientRect()), ys = nr.map((r) => r.top - cr.top + r.height / 2);
      const title = titleSelector && host.querySelector(titleSelector), first = steps[0].getBoundingClientRect();
      const startY = title ? (title.getBoundingClientRect().bottom + first.top) / 2 - cr.top : ys[0] - 28;
      geo = { x: nr[0].left - cr.left + nr[0].width / 2, ys: [startY, ...ys] };
    }
    function paint(now) {
      if (!host || !geo || !els) return;
      const p = currentP(now), y = yAt(p), y0 = geo.ys[0];
      Object.assign(els.start.style, { left: `${geo.x}px`, top: `${y0}px`, height: `${geo.ys[1] - y0}px` });
      Object.assign(els.progress.style, { left: `${geo.x}px`, top: `${y0}px`, height: `${Math.max(0, y - y0)}px` });
      els.drone.style.transform = `translate3d(${(geo.x + OX).toFixed(2)}px,${(y + OY).toFixed(2)}px,0)`;
      steps.forEach((s, i) => { const lit = String(p >= i + 1 - 1e-3); if (s.dataset.lit !== lit) s.dataset.lit = lit; });   // 진행선이 닿은 노드
      if (arrival && arrival.step && !arrival.step.isConnected) arrival.step = steps[arrival.i] || null;
      if (arrival && arrival.step) arrival.step.classList.toggle("is-arrived", now < arrival.until);
      const r = effect ? effect(now) : null;
      if (effect && !r) effect = null;
      els.svg.style.transform = r && r.roll ? `rotate(${(-r.roll).toFixed(2)}deg)` : "";   // + roll = 왼쪽 날개가 내려감(화면 반시계)
    }
    function frame(now) {
      raf = 0;
      if (tween && now - tween.t0 >= tween.dur) {                               // 도착: 현재 노드 점등 + 짧은 pop
        pos = tween.to; tween = null;
        if (pos >= 1) arrival = { i: pos - 1, step: steps[pos - 1] || null, until: now + 380 };
      }
      paint(now);
      if (tween || effect || (arrival && now < arrival.until + 50)) raf = requestAnimationFrame(frame);
      else if (arrival) { if (arrival.step) arrival.step.classList.remove("is-arrived"); arrival = null; }
    }
    const loop = () => { if (!raf) raf = requestAnimationFrame(frame); };

    /* sync(container, { position, label }) — call after every host render (container may be a new element) */
    function sync(container, state = {}) {
      const now = performance.now();
      if (!container || state.position == null) {                              // 드론 없음: 위치 기억도 지운다(다음 등장은 순간 배치)
        if (host) ro.unobserve(host);
        host = els = geo = null; steps = []; pos = null; tween = null; arrival = null; effect = null;
        if (raf) cancelAnimationFrame(raf); raf = 0;
        return;
      }
      const entering = pos == null;
      if (host !== container) { if (host) ro.unobserve(host); host = container; ro.observe(host); }
      host.classList.add("has-progress");
      ensureElements(entering);
      measure();
      if (!geo) return;
      const keys = steps.map((s) => s.dataset.step);
      const target = state.position === "start" ? 0 : keys.indexOf(String(state.position)) + 1;
      if (target < 0 || (state.position !== "start" && target === 0)) return;
      if (entering || reduce.matches) { pos = target; tween = null; }
      else {
        const cur = currentP(now), end = tween ? tween.to : pos;
        if (target !== end) { tween = { from: cur, to: target, t0: now, dur: Math.min(MAX, BASE + STEP * Math.abs(target - cur)) }; arrival = null; }
      }
      els.drone.setAttribute("aria-label", state.label || "");
      if (state.label) els.drone.title = state.label;
      paint(now);
      if (tween || effect) loop();
    }
    /* react(effect): attitude reaction, e.g. DroneReactions.impact() — (now) → { roll } | null */
    function react(fx) { if (!host || reduce.matches || typeof fx !== "function") return; effect = fx; loop(); }

    return { sync, react, position: () => (tween ? tween.to : pos) };
  }

  global.createRoadmapDrone = createRoadmapDrone;
})(window);
