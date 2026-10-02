/* =========================================================
   Home Layout — composes the Home page from feature modules
   Header · KPI · Hero stage (Drone Hero + Radial Navigation +
   Airspace) · How To Use · FAQ · note.

   Wires the modules together (menu open/close choreography,
   panel gaze, directional flight, airspace obstacles/focus).
   Content and host hooks come from options; no host state,
   router, or persistence is read directly.
   Requires: drone-hero.js, radial-navigation.js; optional
   airspace-core.js (+ airspace-dark.js / airspace-light.js).
   ========================================================= */
(function (global) {
  "use strict";

  /* options:
   *   container             stable ancestor the page is rendered into (delegated listeners)
   *   content()             { title, subtitle, kpiLabel, kpis: [{ label, value, unit, sub }], guideTitle, steps: [[no, title, body]], faqTitle, faq: [[q, a]], note }
   *   entries()             radial panels [{ key, label, desc }]
   *   escapeHtml, formatNumber   host text helpers
   *   menu  { get(), set(open) }      menu-open preference (host state)
   *   motion { get(), set(on) }       motion preference (host state + persistence)
   *   isActive()            Home is the current route
   *   onNavigate(key)       panel flight finished → host router
   *   overlayHost(), revealTarget()   handoff wipe host / arrival reveal element
   *   reducedMotion         MediaQueryList (optional) */
  function initHomeLayout(options = {}) {
    const container = options.container;
    const reduce = options.reducedMotion || global.matchMedia("(prefers-reduced-motion: reduce)");
    const menu = options.menu, motion = options.motion;
    const esc = options.escapeHtml, fmt = options.formatNumber;

    const airspace = global.DroneAirspace ? global.DroneAirspace.create({ reducedMotion: reduce, isMotionOn: motion.get }) : null;
    const hero = global.initDroneHero({
      container, reducedMotion: reduce, isActive: options.isActive,
      isMotionOn: motion.get, setMotionOn: motion.set,
      onCoreClick: () => { if (hero.inEntry()) { hero.finishEntry(); return; }   // 진입 비행 중 클릭: 바로 도착(메뉴는 다음 클릭에)
        if (hero.isIdle()) menu.get() ? closeMenu() : openMenu(); },
      onNavigate: (key) => { menu.set(false); radial.sync(false); options.onNavigate(key); },
      onFrame: (now, dt) => airspace && airspace.tick(now, dt),
      onFocus: (k, x, s) => airspace && airspace.setFocus(k, x, s),
      onDroneRect: (r) => airspace && airspace.setDrone(r),
      onFlightStart: (ux, uy) => airspace && airspace.flightReact(ux, uy),
      overlayHost: options.overlayHost, revealTarget: options.revealTarget,
      resolveReturnTarget: (i) => radial.panel(i),
    });
    const radial = global.initRadialNavigation({
      container, entries: options.entries, escapeHtml: esc,
      canInteract: () => hero.isIdle(),
      onGaze: (dir) => hero.gaze(dir),
      onLayout: (rects) => airspace && airspace.setPanels(rects),
      onSelect: (key, el) => { if (!hero.canFly()) return; radial.cancel();
        hero.fly(el, key, { returnRef: radial.indexOf(el), onSelect: () => radial.markSelected(el) }); },
    });

    function openMenu() { menu.set(true); hero.engage(); radial.open({ reduced: reduce.matches, onRevealed: () => hero.markExpanded() }); }
    function closeMenu() { menu.set(false); hero.release(); radial.close(); }

    /* ---------------- Home 화면 마크업 ---------------- */
    function render() {
      const c = options.content(), open = !!menu.get();
      const stageCls = ["hm-stage", open && radial.stageClasses(), ...hero.stageClasses(open)].filter(Boolean).join(" ");
      return `<div class="hm-pre"><header class="hm-head"><h1 class="hm-title">${esc(c.title)}</h1><p class="hm-subtitle">${esc(c.subtitle)}</p></header>
      <section class="hm-kpi" aria-label="${esc(c.kpiLabel)}">${c.kpis.map((k) => `<div class="hm-kpi__item" title="${esc(k.sub)}"><p class="hm-kpi__label">${esc(k.label)}</p>
        <p class="hm-kpi__value"><span class="num" data-countup="${k.value}" data-dec="0">${fmt(k.value)}</span><span class="hm-kpi__unit">${esc(k.unit)}</span></p></div>`).join("")}</section></div>
    <div class="${stageCls}" data-ui="hero-visual">${radial.guidesMarkup()}
      ${hero.ringsMarkup()}
      ${hero.coreMarkup(open)}
      ${radial.menuMarkup(open)}
      ${hero.toggleMarkup()}</div>
    <section class="hm-guide" aria-labelledby="hm-guide-title"><h2 class="hm-section-title" id="hm-guide-title">${esc(c.guideTitle)}</h2>
      <ol class="hm-guide__steps">${c.steps.map(([no, t, b]) => `<li class="hm-guide__step"><span class="hm-guide__no">${esc(no)}</span><p class="hm-guide__title">${esc(t)}</p><p class="hm-guide__body">${esc(b)}</p></li>`).join("")}</ol></section>
    <section class="hm-faq" aria-labelledby="hm-faq-title"><h2 class="hm-section-title" id="hm-faq-title">${esc(c.faqTitle)}</h2>
      <div class="hm-faq__list">${c.faq.map(([q, a]) => `<details class="hm-faq__item"><summary class="hm-faq__q"><span class="hm-faq__qtext">${esc(q)}</span><span class="hm-faq__chev" aria-hidden="true"></span></summary>
        <div class="hm-faq__a"><p>${esc(a)}</p></div></details>`).join("")}</div></section>
    <p class="hm-note">${esc(c.note)}</p>`;
    }

    /* ---------------- 호스트 render 뒤 mount (Home이 아니면 루프·관찰자는 멈춘다) ---------------- */
    const stageRO = new ResizeObserver(() => { if (airspace) airspace.resize(); hero.measure(); if (hero.isEngaged()) radial.layout(); });
    function afterRender(onHome) {
      stageRO.disconnect();
      const stage = onHome ? container.querySelector(".hm-stage") : null;
      if (!stage) { hero.unmount(); radial.unmount(); return; }
      radial.mount(stage);
      if (airspace) { airspace.mount(stage); if (!hero.isEngaged()) airspace.setPanels([]); }
      const want = !!menu.get();
      if (hero.isEngaged() !== want && hero.isIdle()) radial.sync(want);
      hero.mount(stage, { engaged: want });
      if (hero.isEngaged()) radial.layout();
      stageRO.observe(stage);
    }

    return { render, afterRender, openMenu, closeMenu, hero, radial, airspace };
  }

  global.initHomeLayout = initHomeLayout;
})(window);
