/* =========================================================
   V4 Adapter — connects the reusable feature modules to the
   V4 Dashboard Core. This is the only custom file that reads
   V4 globals (S, D, C_, PG, ENTRIES, ROADMAP, stepItems, act,
   ACTIONS, render, go, save, esc, fmt, boot).

   - Home Layout (+ Drone Hero, Radial Navigation, Airspace)
       PG.home → initHomeLayout().render(); S.ui.motion /
       S.ui.home_menu_open ↔ motion/menu; panel flight → go()
   - Roadmap Workflow
       V4 route → currentStage, V4 goal/scrap → completedStages,
       01 산업 이해 → pre-workflow drone
   - V4 render hook, roadmap overlay mount/toggle animation,
     Home-only sidebar brand
   - boot(): called exactly once, after all hooks are installed
   Load after the V4 Core script and after every module script.
   ========================================================= */
(function () {
  "use strict";
  const mainEl = document.getElementById("main");
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");

  /* ---------------- Roadmap status ← V4 roadmap state ----------------
   * current  = ROADMAP 행 중 지금 화면(page/sub)과 같은 단계 → 초록 원 + 드론 위치
   * complete = 실제 저장 데이터(목표 직무 / 스크랩 수 > 0) — V4 .set(초록 카드 배경)과 같은 기준
   * 01 산업 이해 = roadmap 01 이전 단계(드론이 rail 시작점) · Home = 워크플로우 밖(드론 없음) */
  const PRE_WORKFLOW = { industry: true };
  const ROADMAP_MARKUP = { stepSelector: ":scope > .roadmap-step", titleSelector: ":scope > .roadmap__title" };   // V4 roadmap() 마크업
  function roadmapStatus() {
    const { page, sub } = S.route;
    const current = ROADMAP.find(([, , , , p, s]) => p === page && (!s || s === sub));
    const screen = PAGES.find(([k]) => k === page)[1] + (page === "recruit" ? ` · ${RECRUIT_SUBS[sub]}` : "");
    const position = page === "home" ? null : PRE_WORKFLOW[page] ? "start" : current ? current[0] : null;
    return {
      stages: ROADMAP.map(([no]) => no),
      currentStage: current ? current[0] : null,
      completedStages: ROADMAP.filter(([, , , kind]) => stepItems(kind).length > 0).map(([no]) => no),
      position,
      label: position === "start" ? `현재 위치: ${screen} · 탐색 경로 시작 전` : current ? `현재 위치: ${screen} · ${current[0]} ${current[1]}` : "",
    };
  }
  if (window.updateRoadmapWorkflow) {
    const coreRoadmap = roadmap;
    roadmap = function () {   // eslint-disable-line no-global-assign
      const tpl = document.createElement("template");
      tpl.innerHTML = coreRoadmap();
      const aside = tpl.content.querySelector(".roadmap");
      if (aside) window.updateRoadmapWorkflow(aside, roadmapStatus(), ROADMAP_MARKUP);
      return tpl.innerHTML;
    };
  }
  const roadmapDrone = window.createRoadmapDrone ? window.createRoadmapDrone({ ...ROADMAP_MARKUP, reducedMotion: reduce }) : null;
  /* 탐색 경로 열림 반응: 실제 상태 전환(닫힘 → 열림)일 때만 1회. 닫힘·다른 UI 클릭·첫 로드에는 반응 없음.
   * 애니메이션은 드론 모듈이 실행(Home: Drone Hero addEffect / 다른 화면: roadmap 드론 react). 같은 key라 연속 토글에도 누적되지 않음 */
  let wasRoadmapOpen = null;
  function triggerRoadmapOpenReaction(onHome, rmEl) {
    const fx = window.DroneReactions && window.DroneReactions.impact({ direction: "left" });   // 왼쪽 큰 roll → 복구 → 안정 hover(위치·높이 유지)
    if (!fx) return;
    if (onHome) { if (home) home.hero.addEffect(fx, "roadmap-open"); }
    else if (roadmapDrone && rmEl) roadmapDrone.react(fx);
  }

  /* ---------------- Home Layout ← V4 data/state/router ----------------
   * 산업 규모(업체·종사자·매출)는 01 산업 이해의 역할이라 Home에서는 쓰지 않는다(데이터는 그대로 남아 01에서 사용).
   * Home 요약은 진로 탐색 중심의 수집 자료 값만, 시장 규모로 오해되지 않는 표현으로 보여 준다.
   * 브랜드명(Drone Career Navigator)은 사이드바, Home 큰 제목은 메시지 — 같은 표현이 반복되지 않게 */
  const HOME_CONTENT = {
    title: "나의 드론 커리어를 설계하세요",
    subtitle: "직무·학습·채용·기업 정보를 하나로 이어, 나에게 맞는 드론 커리어 경로를 찾아보세요.",
    kpiLabel: "진로 탐색 데이터 요약",
    guideTitle: "이렇게 이용해 보세요",
    steps: [
      ["1", "목표 직무 찾기", "관심 직무를 고르고 필요한 기술을 확인합니다."],
      ["2", "학습 내용 고르기", "부족한 기술에 맞는 과정을 비교해 스크랩합니다."],
      ["3", "채용 공고 비교하기", "수집된 공고의 직무·지역·자격 조건을 나란히 살펴봅니다."],
      ["4", "관심 기업 정리하기", "관심 기업·기관을 모아 나의 탐색 경로를 완성합니다."],
    ],
    faqTitle: "자주 묻는 질문",
    note: "각 수치는 서로 다른 수집 자료(직무 사전 · 고용24 · 채용 공고 수집 표본)이며 서로 더하지 않습니다. 현재 채용·모집 상태가 아닙니다.",
  };
  const home = window.initHomeLayout && window.initHomeLayout({
    container: mainEl, reducedMotion: reduce,
    escapeHtml: esc, formatNumber: fmt,
    content: () => { const o = D.overview; return { ...HOME_CONTENT, faq: C_.faq, kpis: [
      { label: "직무 탐색", value: 209, unit: "개 직무", sub: `직무 사전 · 직무–기술 관계 ${fmt(o.relations)}` },
      { label: "학습 기회", value: 438, unit: "개 과정", sub: `고용24 훈련과정 · 회차 ${fmt(o.offerings)}` },
      { label: "수집 공고", value: 135, unit: "건 공고", sub: "수집 표본 · 현재 모집 상태 미확인" },
      { label: "탐색 조직", value: o.org, unit: "개 조직", sub: `기업·기관 · DART 보강 ${fmt(o.dart)}` },
    ] }; },
    entries: () => ENTRIES.map((e) => ({ key: e.key, label: e.label.replace(/^P\d+\s*/, ""), desc: e.desc })),   // 화면에 P1~P5 접두어는 표시하지 않음
    menu: { get: () => !!S.ui.home_menu_open, set: (open) => { S.ui.home_menu_open = open; } },
    motion: { get: () => S.ui.motion, set: (on) => { S.ui.motion = on; save(); } },
    isActive: () => S.route.page === "home",
    onNavigate: (key) => { const [page, sub] = key.split("."); go(page, sub || null); },   // V4 라우터 그대로(render 포함)
    overlayHost: () => mainEl,
    revealTarget: () => document.querySelector("#main .frame"),
  });
  if (home) PG.home = () => home.render();

  /* ---------------- 탐색 경로 toggle: Home에서는 슬라이드 인/아웃 ---------------- */
  let rmEnter = false;
  const roadmapToggle = ACTIONS["roadmap"];
  act("roadmap", (el, e) => {
    if (S.route.page !== "home") return roadmapToggle(el, e);
    if (!S.ui.roadmap_open) { rmEnter = true; return roadmapToggle(el, e); }                       // 열기: render 후 슬라이드 인
    const rmEl = mainEl.querySelector(".roadmap");
    if (!rmEl || reduce.matches) return roadmapToggle(el, e);
    rmEl.classList.add("hm-rm-leave");                                                             // 닫기: 페이드·슬라이드 아웃 후 상태 반영
    setTimeout(() => { S.ui.roadmap_open = false; save(); render(); }, 190);
    return false;
  });

  /* ---------------- V4 render 뒤 mount ---------------- */
  function mountRoadmapOverlay() {
    const topbar = mainEl.querySelector(":scope > .topbar");
    const roadmapEl = mainEl.querySelector(".roadmap");
    if (topbar && roadmapEl && roadmapEl.parentElement !== topbar) topbar.appendChild(roadmapEl);
  }
  function afterRender() {
    mountRoadmapOverlay();
    const onHome = S.route.page === "home";
    mainEl.classList.toggle("hm-route", onHome);
    // V4의 sidebar() 구현은 유지하고, Home에서만 승인된 영문 브랜드를 표시한다.
    const homeBrand = document.querySelector("#sidebar .sidebar-brand");
    if (onHome && homeBrand) homeBrand.innerHTML = '<span class="sidebar-brand__dot"></span><span class="sidebar-brand__name">Drone Career Navigator</span>';
    if (home) home.afterRender(onHome);
    if (roadmapDrone) {                                                                            // 드론 위치·진행선(이전 위치에서 부드럽게 이동)
      const rmEl = mainEl.querySelector(".roadmap"), st = roadmapStatus();
      roadmapDrone.sync(rmEl, { position: st.position, label: st.label });
    }
    const roadmapOpen = !!S.ui.roadmap_open;                                                       // 상태 전환 감지: 닫힘 → 열림일 때만 반응
    if (wasRoadmapOpen === false && roadmapOpen) triggerRoadmapOpenReaction(onHome, mainEl.querySelector(".roadmap"));
    wasRoadmapOpen = roadmapOpen;
    if (onHome && rmEnter) { rmEnter = false; const rmEl = mainEl.querySelector(".roadmap"); if (rmEl && !reduce.matches) rmEl.classList.add("hm-rm-enter"); }
  }
  const coreRender = render;
  render = function (o) { coreRender(o); afterRender(); };   // eslint-disable-line no-global-assign

  boot();
})();
