/* 홈 3D 드론 Hero (요청 P1·P2, 2026-10-02) — Streamlit components.v2.
 * 원본: 팀원 Downloads/home-only.html 의 Home 스크립트(3D 드론 · 5개 패널 · Data Airspace 배경).
 * 그대로 옮긴 부분: 공역 배경(AIR), 3D 모델(buildFoldableDrone), 진입 비행, 메뉴 열기·닫기, 패널 바라보기, 그리기 루프.
 * 바꾼 부분: 화면 전체 상태(S·render·#main) → 이 부품 안 상태(G·HM)와 setStateValue/setTriggerValue,
 *   Three.js CDN → static/vendor/three, 테마 = 토큰 값(core/theme.py --hm-*),
 *   패널을 누르면 그쪽으로 날아간 뒤 그 화면으로 이동(팀원 판은 제자리 반응만) + 홈에 다시 오면 같은 방향에서 돌아옴.
 * 3D renderer·canvas·루프는 창(window)에 하나만 두고 홈에 다시 들어와도 다시 쓴다.
 * HTML 공유본(scripts/build_interactive.py)도 이 파일을 그대로 쓴다: window.__ddThreeSrc에 Three.js 글이 있으면 그것으로 불러온다. */
function createEngine() {
  "use strict";
  const ROTOR_REV_PER_SEC = 3.0;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  // 모니터 크기 맞춤(요청 AE3): 앱 전체를 비율 확대(html zoom)하면 getBoundingClientRect·마우스 좌표는 확대된 화면 px,
  // clientWidth·offset은 확대 전 px이다. 화면 px로 계산한 비행 경로는 ZF()로 나눈다(해상도는 browser.py가 devicePixelRatio로 맞춤)
  const ZF = () => window.__ddZoom || 1;
  const FALLBACK_SVG = "<svg class=\"hm-svg\" viewBox=\"0 0 320 200\" aria-hidden=\"true\"><defs><linearGradient id=\"hd-shell\" x1=\"0\" y1=\"0\" x2=\"0.35\" y2=\"1\"><stop offset=\"0\" stop-color=\"#7b818a\"/><stop offset=\".55\" stop-color=\"#4c5158\"/><stop offset=\"1\" stop-color=\"#33373d\"/></linearGradient><linearGradient id=\"hd-face\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#2d3136\"/><stop offset=\"1\" stop-color=\"#15171a\"/></linearGradient><linearGradient id=\"hd-motor\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#1a1c1f\"/><stop offset=\".28\" stop-color=\"#6d737b\"/><stop offset=\".5\" stop-color=\"#3a3e44\"/><stop offset=\"1\" stop-color=\"#101113\"/></linearGradient><radialGradient id=\"hd-motor-top\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#8a9098\"/><stop offset=\"1\" stop-color=\"#2a2d32\"/></radialGradient><radialGradient id=\"hd-disc\" r=\".5\"><stop offset=\".08\" stop-color=\"#9aa1aa\" stop-opacity=\"0\"/><stop offset=\".6\" stop-color=\"#9aa1aa\" stop-opacity=\".07\"/><stop offset=\".97\" stop-color=\"#c9ced4\" stop-opacity=\".16\"/><stop offset=\"1\" stop-color=\"#c9ced4\" stop-opacity=\"0\"/></radialGradient><linearGradient id=\"hd-blade\" x1=\"0\" y1=\"-1\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6a7078\"/><stop offset=\".5\" stop-color=\"#34383e\"/><stop offset=\"1\" stop-color=\"#1b1d20\"/></linearGradient><radialGradient id=\"hd-glass\" cx=\".38\" cy=\".35\" r=\".7\"><stop offset=\"0\" stop-color=\"#6fa8d8\"/><stop offset=\".25\" stop-color=\"#1d3f63\"/><stop offset=\".7\" stop-color=\"#0a1522\"/><stop offset=\"1\" stop-color=\"#030609\"/></radialGradient><filter id=\"hd-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"6\"/></filter><filter id=\"hd-glow\" x=\"-200%\" y=\"-200%\" width=\"500%\" height=\"500%\"><feGaussianBlur stdDeviation=\"1.6\"/></filter></defs><ellipse cx=\"160\" cy=\"184\" rx=\"112\" ry=\"9\" class=\"hm-sv-shadow\"/><g class=\"hm-sv-body\"><path d=\"M132,84 L90,67.0\" class=\"hm-sv-arm-under\"/><path d=\"M132,82.5 L90,65.5\" class=\"hm-sv-arm-top\"/><circle cx=\"90\" cy=\"74\" r=\"2.2\" class=\"hm-sv-led hm-sv-ccw\"/><path d=\"M188,84 L230,67.0\" class=\"hm-sv-arm-under\"/><path d=\"M188,82.5 L230,65.5\" class=\"hm-sv-arm-top\"/><circle cx=\"230\" cy=\"74\" r=\"2.2\" class=\"hm-sv-led hm-sv-cw\"/><ellipse cx=\"90\" cy=\"71\" rx=\"10.0\" ry=\"3.6\" class=\"hm-sv-mount\"/><path d=\"M83.0,60 L83.0,70 A7.0,2.1 0 0 0 97.0,70 L97.0,60 Z\" fill=\"url(#hd-motor)\"/><path d=\"M83.0,64.5 A7.0,2.1 0 0 0 97.0,64.5\" class=\"hm-sv-band\"/><ellipse cx=\"90\" cy=\"60\" rx=\"7.0\" ry=\"2.1\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"90\" cy=\"60\" rx=\"3.15\" ry=\"0.9450000000000001\" class=\"hm-sv-bell\"/><ellipse cx=\"230\" cy=\"71\" rx=\"10.0\" ry=\"3.6\" class=\"hm-sv-mount\"/><path d=\"M223.0,60 L223.0,70 A7.0,2.1 0 0 0 237.0,70 L237.0,60 Z\" fill=\"url(#hd-motor)\"/><path d=\"M223.0,64.5 A7.0,2.1 0 0 0 237.0,64.5\" class=\"hm-sv-band\"/><ellipse cx=\"230\" cy=\"60\" rx=\"7.0\" ry=\"2.1\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"230\" cy=\"60\" rx=\"3.15\" ry=\"0.9450000000000001\" class=\"hm-sv-bell\"/><g transform=\"translate(90 57) scale(1 0.3)\"><circle r=\"40\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor hm-sv-r2\"><g transform=\"rotate(32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"90\" cy=\"56\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><g transform=\"translate(230 57) scale(1 0.3)\"><circle r=\"40\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor\"><g transform=\"rotate(-32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(-16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"230\" cy=\"56\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><path d=\"M110,100 Q160,111 210,100 L204,119 Q160,131 116,119 Z\" fill=\"url(#hd-face)\"/><path d=\"M128,79 Q160,70 192,79 L210,100 Q160,111 110,100 Z\" fill=\"url(#hd-shell)\" class=\"hm-sv-hull\"/><path d=\"M134,84 Q160,77 186,84 L196,97 Q160,104 124,97 Z\" class=\"hm-sv-panel\"/><path d=\"M140,86 Q160,81 180,86\" class=\"hm-sv-vent\"/><path d=\"M137,90 Q160,85 183,90\" class=\"hm-sv-vent\"/><ellipse cx=\"146\" cy=\"84\" rx=\"16\" ry=\"4\" class=\"hm-sv-spec\" filter=\"url(#hd-glow)\"/><path d=\"M110,100 Q160,111 210,100\" class=\"hm-sv-edge\"/><ellipse cx=\"146\" cy=\"113\" rx=\"5\" ry=\"3.2\" class=\"hm-sv-sensor\"/><ellipse cx=\"174\" cy=\"113\" rx=\"5\" ry=\"3.2\" class=\"hm-sv-sensor\"/><ellipse cx=\"144.8\" cy=\"112.2\" rx=\"1.6\" ry=\"1\" class=\"hm-sv-glint\"/><ellipse cx=\"172.8\" cy=\"112.2\" rx=\"1.6\" ry=\"1\" class=\"hm-sv-glint\"/><path d=\"M114,110 L58,119.1\" class=\"hm-sv-arm-under\"/><path d=\"M114,108.5 L58,117.6\" class=\"hm-sv-arm-top\"/><circle cx=\"58\" cy=\"127\" r=\"2.2\" class=\"hm-sv-led hm-sv-cw\"/><path d=\"M206,110 L262,119.1\" class=\"hm-sv-arm-under\"/><path d=\"M206,108.5 L262,117.6\" class=\"hm-sv-arm-top\"/><circle cx=\"262\" cy=\"127\" r=\"2.2\" class=\"hm-sv-led hm-sv-ccw\"/><ellipse cx=\"58\" cy=\"124\" rx=\"12.0\" ry=\"4.199999999999999\" class=\"hm-sv-mount\"/><path d=\"M49.0,110 L49.0,123 A9.0,2.6999999999999997 0 0 0 67.0,123 L67.0,110 Z\" fill=\"url(#hd-motor)\"/><path d=\"M49.0,115.85 A9.0,2.6999999999999997 0 0 0 67.0,115.85\" class=\"hm-sv-band\"/><ellipse cx=\"58\" cy=\"110\" rx=\"9.0\" ry=\"2.6999999999999997\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"58\" cy=\"110\" rx=\"4.05\" ry=\"1.2149999999999999\" class=\"hm-sv-bell\"/><ellipse cx=\"262\" cy=\"124\" rx=\"12.0\" ry=\"4.199999999999999\" class=\"hm-sv-mount\"/><path d=\"M253.0,110 L253.0,123 A9.0,2.6999999999999997 0 0 0 271.0,123 L271.0,110 Z\" fill=\"url(#hd-motor)\"/><path d=\"M253.0,115.85 A9.0,2.6999999999999997 0 0 0 271.0,115.85\" class=\"hm-sv-band\"/><ellipse cx=\"262\" cy=\"110\" rx=\"9.0\" ry=\"2.6999999999999997\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"262\" cy=\"110\" rx=\"4.05\" ry=\"1.2149999999999999\" class=\"hm-sv-bell\"/><rect x=\"150\" y=\"124\" width=\"20\" height=\"7\" rx=\"2.5\" class=\"hm-sv-gimbal\"/><rect x=\"148\" y=\"129\" width=\"24\" height=\"17\" rx=\"5\" fill=\"url(#hd-face)\" class=\"hm-sv-gimbal\"/><circle cx=\"160\" cy=\"137.5\" r=\"7\" class=\"hm-sv-lens\"/><circle cx=\"160\" cy=\"137.5\" r=\"5.4\" fill=\"url(#hd-glass)\"/><circle cx=\"158\" cy=\"135.4\" r=\"1.4\" class=\"hm-sv-glint\"/><g transform=\"translate(58 107) scale(1 0.3)\"><circle r=\"50\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor\"><g transform=\"rotate(-32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(-16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"58\" cy=\"106\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><g transform=\"translate(262 107) scale(1 0.3)\"><circle r=\"50\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor hm-sv-r2\"><g transform=\"rotate(32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"262\" cy=\"106\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/></g></svg>";
  const ICONS = '<svg class="hm-toggle__icon hm-toggle__icon--pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.4" height="10" rx="1"/><rect x="9.6" y="3" width="2.4" height="10" rx="1"/></svg>'
    + '<svg class="hm-toggle__icon hm-toggle__icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/></svg>';

  /* ---------------- 상태 ---------------- */
  // z: 깊이(카메라 쪽 +, 월드 단위). 호버 위치는 첫 진입의 '추가 접근' 뒤 자리(0.22). 메뉴가 열리면 드론이 한 발 뒤로 물러나 공간을 연다(0.0)
  const REST = { scale: 1, lift: 0, pitch: 0, rpm: 1, offX: 0, offY: 0, yaw: 0, z: 0.22 };   // lift/off: px, pitch/yaw: deg
  const REST_Z = REST.z;
  const OPEN_REST = { ...REST, scale: 1, lift: -4, rpm: 1.04, z: -1.2 };
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  /* 모션 상태(드론 기준): entering(첫 진입 곡선 하강) → settling(도착 후 잠깐 정지) → approaching(카메라 쪽 추가 접근) → hovering
   *   · returningHome(패널 방향에서 복귀) → approaching → hovering · expanding → expanded(패널 전개).
   * 입력 잠금은 기존 HM.phase(transitioning·navigating)만 쓴다 — 진입·복귀 중에도 다른 UI는 바로 쓸 수 있다. stage[data-motion]에 표시 */
  function setMode(m) { HM.mode = m; if (HM.stage) HM.stage.dataset.motion = m; }
  const HM = { stage: null, core: null, panels: [], canvas: null, three: null, loading: false, ready: false, failed: false, open: false, phase: "idle" };
  const st = { ...REST };
  let seq = null, fl = null, hover = 0, hoverTarget = 0;
  const ptr = { x: 0, y: 0 }, ptrS = { x: 0, y: 0 };
  const outCubic = (k) => 1 - Math.pow(1 - k, 3);
  const inOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const timers = [];
  const later = (ms, fn) => timers.push(setTimeout(fn, ms));
  const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };
  const cls = (...c) => HM.stage && HM.stage.classList.add(...c);
  const uncls = (...c) => HM.stage && HM.stage.classList.remove(...c);
  /* ---------------- 부품 상태(Streamlit) ----------------
   * motion = 사용자 '움직임 멈추기'(ui.motion), open = 메뉴 열림(ui.home_menu_open). 바뀌면 setStateValue로 파이썬에 알린다. */
  const G = { motion: true, root: null, entries: [], vendor: "", setState: null, trigger: null, playedVisit: null, pendingEntry: null, countupMs: 900 };
  const esc = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const fmt = (v) => Math.round(v).toLocaleString("ko-KR");

  /* ---------------- 동작 ---------------- */
  const ACT = {
    hero: () => { if (entry) { finishEntry(); return; }                       // 진입 비행 중 클릭: 바로 도착(메뉴는 다음 클릭에)
      if (HM.phase === "idle") { HM.open ? closeMenu() : openMenu(); } },
    motion: () => { G.motion = !G.motion; syncMotion(); G.setState && G.setState("motion", G.motion); },
    "hero-go": (el) => startFlight(el),
    "kpi-go": (el) => { if (HM.phase === "idle" && G.trigger) G.trigger("kpi", el.dataset.key); },   // 요약 카드 → 그 페이지(요청 R1)
  };

  function setPanelsFocusable(on) { HM.panels.forEach((p) => { p.tabIndex = on ? 0 : -1; }); }
  function setCoreState(open) { if (!HM.core) return; HM.core.setAttribute("aria-expanded", String(open)); HM.core.setAttribute("aria-label", open ? "탐색 메뉴 접기" : "탐색 메뉴 열기"); }
  function syncMotion() {
    if (!G.motion) finishEntry();                                             // 진입 비행 중 '움직임 멈추기' → 바로 도착 상태
    const still = !G.motion, label = still ? "움직임 재생" : "움직임 멈추기";
    if (G.root) G.root.classList.toggle("hm-still", still);                   // 요약 카드 아이콘도 멈춘 그림만
    if (HM.stage) { HM.stage.classList.toggle("is-still", still); const b = HM.stage.querySelector(".hm-toggle");
      if (b) { b.setAttribute("aria-pressed", String(still)); b.setAttribute("aria-label", label); b.title = label; } }
    wake();
  }
  function openMenu() {
    HM.open = true; G.setState && G.setState("open", true); clearTimers();
    uncls("is-releasing", "is-engaged-static"); cls("is-engaged"); setCoreState(true);
    if (reduce.matches) { run([{ d: 160, to: { scale: 1.015, rpm: 1.04 } }]); cls("is-open"); setPanelsFocusable(true); layoutGuides(); later(200, () => cls("is-revealed")); return; }
    setMode("expanding");
    run([
      { d: 300, to: { z: -1.05, lift: -2, pitch: -2.2, rpm: 1.12 }, ease: outCubic },          // STEP BACK: 커진 기체만큼 크게 물러나며 기수를 든다(제동 자세)
      { d: 280, to: { z: -1.2, lift: -4, pitch: 0, rpm: 1.04 }, ease: inOutSine },               // SETTLE: 원근상 약 2/3 크기 → 오각형 패널이 온전히 드러날 공간
    ]);
    later(400, () => { cls("is-open"); setPanelsFocusable(true); layoutGuides(); });   // 드론이 충분히 물러난 뒤 패널이 드론 쪽에서 앞으로 떠오르며 펼쳐진다(CSS 3D)
    later(400 + 120 + 4 * 55 + 560, () => { cls("is-revealed"); if (HM.open) setMode("expanded"); });
  }
  function closeMenu() {
    HM.open = false; G.setState && G.setState("open", false); clearTimers(); AIR.setPanels([]); leanT.x = leanT.y = 0; setMode("hovering");
    uncls("is-open", "is-revealed"); setCoreState(false); setPanelsFocusable(false);     // P5→P1 역순 stagger (CSS)
    run([{ d: reduce.matches ? 0.01 : 260, to: {} }, { d: reduce.matches ? 160 : 380, to: { scale: 1, lift: 0, pitch: 0, rpm: 1, z: REST_Z } }]);
    later(reduce.matches ? 0 : 240, () => { uncls("is-engaged", "is-engaged-static"); cls("is-releasing"); });
    later(reduce.matches ? 300 : 700, () => uncls("is-releasing"));
  }

  /* ---------------- 패널 쪽으로 출발 비행 → 그 화면으로 이동 (요청 P1, 팀원 판에 없던 부분) ----------------
   * 가이드 선 강조 · 배경 반응 → 패널이 접히고 → 드론이 그 패널 방향으로 가속하며 멀어져 화면 밖으로 나간 뒤 이동한다.
   * 홈에 다시 오면 같은 패널 방향에서 돌아온다(startEntry "return"). 움직임 멈춤·동작 줄이기·3D 미사용이면 비행 없이 바로 이동. */
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };
  function startFlight(el) {
    if (HM.phase !== "idle" || !HM.stage || !HM.core || !HM.open) return;
    const gi = HM.panels.indexOf(el), key = el.dataset.key;
    HM.phase = "navigating"; clearTimers(); seq = null;
    const rc = HM.core.getBoundingClientRect(), rg = el.getBoundingClientRect();
    const dx = rg.left + rg.width / 2 - rc.left - rc.width / 2, dy = rg.top + rg.height / 2 - rc.top - rc.height / 2, l = Math.hypot(dx, dy) || 1, ux = dx / l, uy = dy / l;
    HM.stage.querySelectorAll(`.hm-guides [data-i="${gi}"]`).forEach((n) => n.classList.add("is-active"));
    AIR.flightReact(ux, uy);
    const go = () => { if (G.trigger) G.trigger("go", key); };
    const g = !reduce.matches && G.motion && HM.three && !HM.failed ? HM.three.viewIn() : null;
    if (!g) { later(160, go); return; }
    later(260, () => { uncls("is-open", "is-revealed"); setPanelsFocusable(false); AIR.setPanels([]); });   // 패널이 드론 쪽으로 접히며 길을 연다
    const tx = ux > 1e-3 ? (g.vw - g.cx) / ux : ux < -1e-3 ? -g.cx / ux : Infinity, ty = uy > 1e-3 ? (g.vh - g.cy) / uy : uy < -1e-3 ? -g.cy / uy : Infinity;
    const L = Math.min(tx, ty) + g.canvasW * 0.3;                             // 화면(viewport) 경계 밖까지
    let nx = -uy, ny = ux; if (ny > 0 || (Math.abs(ny) < 1e-3 && nx > 0)) { nx = -nx; ny = -ny; }   // 곡선은 위쪽으로 살짝 불룩 → 떠오르며 선회
    const S1 = { x: ux * L, y: uy * L };
    fl = { t0: performance.now() + 140, turn: 260, dur: 1250, S1, z0: st.z, ux, uy, go,
      C1: { x: S1.x * 0.12 + nx * L * 0.1, y: S1.y * 0.12 + ny * L * 0.1 }, C2: { x: S1.x * 0.55 + nx * L * 0.08, y: S1.y * 0.55 + ny * L * 0.08 } };
    setMode("flyingToPanel"); cls("is-arriving"); wake();
  }
  // t(ms, t0 기준) → 화면 오프셋(px) · 깊이 z · 진행 s: 처음 turn 동안은 그쪽으로 몸을 돌리며 살짝 물러섰다가, 가속하며 멀어진다
  function flightPose(F, t) {
    if (t < F.turn) { const k = inOutSine(clamp01(t / F.turn));
      return { x: -F.ux * 6 * k, y: -F.uy * 4 * k - 3 * k, z: F.z0 + 0.12 * k, s: 0 }; }
    const k = clamp01((t - F.turn) / (F.dur - F.turn)), s = Math.pow(k, 1.9);
    return { x: bez(-F.ux * 6, F.C1.x, F.C2.x, F.S1.x, s), y: bez(-F.uy * 4 - 3, F.C1.y, F.C2.y, F.S1.y, s), z: F.z0 + 0.12 - 1.9 * s, s };
  }
  function finishFlight() {
    const F = fl; if (!F || F.done) return; F.done = true;
    if (HM.canvas) HM.canvas.style.opacity = "0";                             // 화면 밖 = 다음 화면이 그려질 때까지 숨김
    F.go();
    // 이동이 막혀 홈에 남는 경우(드묾): 3초 뒤 제자리로
    later(3000, () => { if (fl === F && HM.stage && HM.stage.isConnected) { fl = null; HM.phase = "idle"; if (HM.three) HM.three.viewOut();
      uncls("is-arriving"); HM.open = false; setCoreState(false); Object.assign(st, REST); setMode("hovering"); wake(); } });
  }
  // 전환 중에는 입력을 잠깐 막아 반응이 겹치지 않게 한다(이 부품 안에서만).
  const lock = (e) => { if (HM.phase !== "idle") { e.preventDefault(); e.stopPropagation(); } };

  /* ---------------- Data Airspace: Geo-Airspace Simulation Layer (Canvas 2D, Hero stage 안에서만) ----------------
   * 질서 있는 랜덤(seed 고정): 가로를 15개 슬롯으로 나누고, 슬롯마다 깊이 대역(근경·중경·원경)과 내용(단독 건물·건물 군집·구릉·능선·산·
   *   구릉+건물 혼합)을 가중치 난수로 정한다. 이웃 슬롯이 같은 종류면 반대 종류로 바꿔 건물·지형이 한쪽으로 몰리지 않는다.
   *   슬롯은 8~16초 생애(나타남 → 상승 → 유지 → 하강·소멸) 뒤 다른 내용으로 다시 생성된다. 슬롯마다 시점이 달라 동시에 움직이지 않는다.
   * 객체 단위 고도 로직: 객체마다 고정 높이(m) → 객체 전체 색. ≤150m teal(<60)/green, >150m muted red 계열. 150m 선에서 자르지 않는다.
   * 건물 형태: 저층 광폭 · 중층 박스 · 타워 · 슬림 고층 · 트윈 타워 · 셋백 타워 · 포디움+타워, 저층 군집 · 중층 군집. 건물마다 폭·깊이·높이·점 밀도가 다르다.
   * 지형 형태: 낮은 둔덕 · 구릉 · 완만한 능선 · 산 · 넓은 산 · 뾰족한 봉우리 · 쌍봉. 높이·폭·좌우 경사·정상 위치·점 분포가 다르다.
   * 고도 라벨: 점 + 얇은 leader line + 높이. 건물은 가장 높은 층 지붕 가운데, 산은 실제 정상(표면 굴곡이 정상에서 0)에 붙는다.
   * 깊이 위계: 근경이 가장 선명하고 원경일수록 약하다. 테마별 색·채움·라벨 plate는 .hm-stage의 --hm-air-* 변수로 정한다.
   * 드론 바닥 hover zone: 가는 기준 원 + 천천히 도는 점선 원 + 얇은 리플 3개.
   * 원경 산맥 3겹(아주 느린 drift) · 150m 위 옅은 공역 천장 band. 주간 전용: 강(수면·반사·반짝임) · 교량 2개(아치·사장교, 수면 반사).
   * 야간/주간: --hm-air-mode(night|day)와 변수로 분기 — 야간은 은은한 발광·대비, 주간은 대기 원근(haze·안개)·옅은 면·느린 전환.
   * 같은 rAF 루프에서 30fps, 점은 색·투명도 구간별 Path2D로 일괄. 좁은 화면은 점·건물·라벨 수를 줄인다. CDN 없이 동작. */
  const AIR = (() => {
    const HC = 100, LIMIT = 150, Z_DRONE = 300, VIS = 1.55;              // VIS: 점군·선 가시성 배율(1.4 → 1.55)
    let cv = null, ctx = null, stage = null, W = 0, H = 0, dpr = 1, lite = false;
    let simT = 26000, lastDraw = -1e9, dirty = true, col = null;
    let drone = null, panels = [], react = null, scanStart = 5200, scanDur = 3400;
    const focus = { k: 1, x: 0, s: 1 };                                       // 드론 바닥 hover zone: 세기(진입·비행 중 약하게) · 가로 위치(드론 아래) · 크기(다가올수록 커짐)
    /* 야간 별: 상단 하늘에만, 밀도·밝기 낮게(우주 배경이 아니라 야간 공역의 깊이 보조). 별 일부만 아주 느리게 미세 반짝임. 고정 seed */
    const STARS = (() => { let q = 7331; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
      return Array.from({ length: 118 }, () => ({ u: r(), v: Math.pow(r(), 1.3), sz: r() < 0.1 ? 1.5 + r() * 0.6 : 0.7 + r() * 0.5, a: 0.32 + Math.pow(r(), 1.6) * 0.5, tw: r() < 0.3 ? 2600 + r() * 2600 : 0, ph: r() * 6.28 })); })();   // 대부분 아주 작게, 10%만 조금 크게(옅은 halo)
    let s = 20261001;
    const rnd = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
    const sm = (k) => { k = Math.max(0, Math.min(1, k)); return k * k * (3 - 2 * k); };
    const lr = (a, b) => a + (b - a) * rnd();
    const pick = (w) => { let r = rnd() * Object.values(w).reduce((a, b) => a + b, 0); for (const [k, v] of Object.entries(w)) { r -= v; if (r <= 0) return k; } return Object.keys(w)[0]; };
    const band = (h) => (h > 200 ? "hiB" : h > LIMIT ? "hiA" : h < 60 ? "loA" : "loB");
    const avoidLimit = (h) => (h > 136 && h < 164 ? (h < LIMIT ? lr(116, 136) : lr(164, 196)) : h);   // 기준선 근처는 피해 색·라벨 의미가 분명하게

    /* ---- 건물: 층(tier) 목록으로 실루엣을 만든다. tier = [x0, x1, y0, y1] (폭·높이 비) ---- */
    function makeBuilding(kind) {
      const b = { obj: "bld", kind, dens: lr(0.8, 1.25) };
      if (kind === "low") { b.w = lr(70, 160); b.dz = lr(40, 100); b.h = lr(12, 42); b.tiers = [[0, 1, 0, 1]]; }
      else if (kind === "mid") { b.w = lr(32, 76); b.dz = lr(24, 60); b.h = lr(45, 128); b.tiers = [[0, 1, 0, 1]]; }
      else if (kind === "tower") { b.w = lr(16, 30); b.dz = lr(14, 30); b.h = lr(120, 320); b.tiers = [[0, 1, 0, 1]]; }
      else if (kind === "slim") { b.w = lr(8, 14); b.dz = lr(8, 14); b.h = lr(90, 270); b.tiers = [[0, 1, 0, 1]]; }                      // 좁은 고층
      else if (kind === "twin") { b.w = lr(30, 56); b.dz = lr(14, 26); b.h = lr(110, 300); const g = lr(0.14, 0.24), k = lr(0.62, 0.88);
        b.tiers = rnd() < 0.5 ? [[0, 0.5 - g / 2, 0, 1], [0.5 + g / 2, 1, 0, k]] : [[0, 0.5 - g / 2, 0, k], [0.5 + g / 2, 1, 0, 1]]; }
      else if (kind === "setback") { b.w = lr(22, 40); b.dz = lr(20, 36); b.h = lr(140, 300); const k = lr(0.6, 0.78); b.tiers = [[0, 1, 0, k], [0.2, 0.8, k, 1]]; }
      else { b.w = lr(60, 110); b.dz = lr(40, 80); b.h = lr(110, 280); const k = lr(0.1, 0.2); b.tiers = [[0, 1, 0, k], [0.34, 0.66, k, 1]]; }   // podium + tower
      b.h = avoidLimit(b.h); b.band = band(b.h); b.ph = rnd() * 6.28;
      const top = b.tiers.reduce((a, q) => (q[3] > a[3] ? q : a)); b.peakFx = (top[0] + top[1]) / 2;   // 라벨: 가장 높은 층 지붕 가운데
      const pts = [], dn = b.dens;
      for (const [fx0, fx1, fy0, fy1] of b.tiers) {
        const stepE = Math.max(7, b.h / 30) / b.h / dn, stepF = (b.h < 50 ? 9 : 14) / b.h / dn, tw = (fx1 - fx0) * b.w;
        for (const [fx, back] of [[fx0, 0], [fx1, 0], [fx1, 1]]) for (let fy = fy0; fy <= fy1 + 1e-4; fy += stepE) pts.push([fx, fy, back, rnd(), 0]);
        for (let fy = fy0 + stepF; fy < fy1; fy += stepF) for (let fx = fx0 + 0.08 * (fx1 - fx0); fx < fx1 - 0.04; fx += Math.max(9, tw / 7) / b.w / dn) pts.push([fx, fy, 0, rnd(), 0]);
        for (let fx = fx0; fx <= fx1 + 1e-4; fx += Math.max(4.5, tw / 10) / b.w / dn) { pts.push([fx, fy1, 0, rnd(), 1]); pts.push([fx, fy1, 1, rnd(), 1]); }
      }
      b.pts = pts;
      return b;
    }
    /* ---- 지형: 높이(m) · 반경(Z 대비) · 깊이 비 · 날카로움 지수(2 = 둥근 정상, 작을수록 뾰족) ---- */
    const TERR = {
      lowland: { h: [14, 40], r: [0.16, 0.24], rz: 0.4, p: [2.1, 2.6] },
      hill: { h: [26, 84], r: [0.09, 0.14], rz: 0.55, p: [1.9, 2.3] },
      ridge: { h: [72, 134], r: [0.16, 0.24], rz: 0.26, p: [1.8, 2.2] },
      mountain: { h: [112, 300], r: [0.10, 0.15], rz: 0.6, p: [1.7, 2.1] },
      wide: { h: [120, 240], r: [0.17, 0.24], rz: 0.5, p: [1.9, 2.3] },
      sharp: { h: [170, 380], r: [0.07, 0.10], rz: 0.7, p: [1.25, 1.5] },
      twinpeak: { h: [130, 330], r: [0.08, 0.12], rz: 0.6, p: [1.6, 2.0], twin: true },
    };
    function makeLand(kind, Z) {
      const T = TERR[kind], m = { obj: "land", kind };
      m.h = avoidLimit(lr(T.h[0], T.h[1])); m.Rx = Z * lr(T.r[0], T.r[1]); m.Rz = m.Rx * T.rz * lr(0.8, 1.2); m.p = lr(T.p[0], T.p[1]);
      m.sl = lr(0.72, 1.38); m.ph = rnd() * 6.28; m.band = band(m.h); m.peakDx = 0;               // sl: 좌우 경사 비대칭
      if (T.twin) { const d = lr(0.9, 1.3) * m.Rx, sg = rnd() < 0.5 ? -1 : 1; m.tw = { k: lr(0.6, 0.86) }; m.peakDx = sg * d / 2; }   // 주봉 · 낮은 부봉
      m.ext = (m.p < 1.6 ? 2.5 : 1.8) * Math.max(m.sl, 1 / m.sl) + (m.tw ? Math.abs(m.peakDx) / m.Rx : 0); m.extZ = m.p < 1.6 ? 2.2 : 1.6;
      return m;
    }
    /* ---- 슬롯: 깊이 대역·내용을 가중치 난수로 → 수명이 끝나면 다른 내용으로 ---- */
    const BANDS = { near: [420, 680], mid: [700, 1150], far: [1300, 2400] };
    const CONTENT = {
      near: { hill: 2.2, lowland: 1.4, low: 1.6, mid: 2, scluster: 2.2, mixed: 1.3 },
      mid: { cluster: 2.6, scluster: 1, tower: 1.3, slim: 1.1, twin: 1, setback: 1, podium: 1, mid: 1, ridge: 1.6, hill: 1.1, wide: 0.8, mixed: 1.4 },
      far: { mountain: 2, sharp: 1.1, twinpeak: 1.1, wide: 1, ridge: 1.4, cluster: 1.6, tower: 1, twin: 0.6 },
    };
    const isLand = (w) => !!TERR[w];
    const slots = [];
    function fill(sl, t) {
      const center = Math.abs(sl.u0) < 0.22;                                     // 드론 바로 뒤: 원경 지형·낮은 군집만(드론 실루엣 보호)
      const bandK = center ? "far" : Math.abs(sl.u0) < 0.3 ? pick({ mid: 1, far: 3 }) : pick({ near: 1.3, mid: 2.4, far: 1.8 });
      const [z0, z1] = BANDS[bandK];
      let what = pick(center ? { ridge: 1.6, wide: 1.4, mountain: 1, twinpeak: 0.6, scluster: 0.8 } : CONTENT[bandK]);
      // 질서 있는 랜덤: 이웃 두 슬롯이 이미 같은 종류(건물/지형)면 반대 종류로 → 한쪽만 건물·산으로 몰리지 않는다
      const nb = (slots.length > sl.idx ? [slots[sl.idx - 1], slots[sl.idx + 1]] : [slots[sl.idx - 1], slots[sl.idx - 2]]).filter((q) => q && q.cls);
      if (nb.length === 2 && nb[0].cls === nb[1].cls && nb[0].cls === (isLand(what) ? "land" : "bld"))
        what = pick(Object.fromEntries(Object.entries(CONTENT[bandK]).filter(([w]) => isLand(w) !== (nb[0].cls === "land"))));
      sl.cls = isLand(what) ? "land" : what === "mixed" ? "mix" : "bld";
      sl.u = sl.u0 + lr(-0.03, 0.03); sl.z = lr(z0, z1); sl.items = [];
      if (isLand(what)) sl.items.push({ ...makeLand(what, sl.z), dz: 0 });
      else if (what === "mixed") {                                               // 구릉 + 그 앞 기슭의 건물 1~2동
        const m = makeLand(rnd() < 0.6 ? "hill" : "lowland", sl.z); sl.items.push({ ...m, dz: 0 });
        const n = 1 + Math.floor(rnd() * 2); for (let i = 0; i < n; i++) sl.items.push({ ...makeBuilding(pick({ low: 1, mid: 1.6, slim: 0.8 })), dX: lr(-0.9, 0.9) * m.Rx, dz: -lr(0.6, 1.2) * m.Rz });
      }
      else if (what === "cluster" || what === "scluster") { const short = what === "scluster", n = (short ? 3 : 2) + Math.floor(rnd() * 3);
        for (let i = 0; i < n; i++) sl.items.push({ ...makeBuilding(pick(short ? { low: 1.2, mid: 2 } : { low: 0.8, mid: 2, tower: 1.3, slim: 0.9, twin: 0.5, setback: 0.7, podium: 0.5 })), dX: lr(-0.07, 0.07) * sl.z, dz: lr(-60, 60) }); }
      else sl.items.push({ ...makeBuilding(what), dX: 0, dz: 0 });
      sl.born = t + lr(300, 1800); sl.rise = lr(2200, 3600); sl.life = lr(8000, 16000); sl.fade = lr(2200, 3400);
      if (col && col.day) { sl.rise *= 1.3; sl.fade *= 1.3; sl.life = Math.max(sl.life, sl.rise + sl.fade + 2000); }   // 주간: 더 느리고 부드럽게
    }
    for (let i = 0; i < 15; i++) {
      const u0 = -0.95 + (1.9 * i) / 14, sl = { u0, idx: i };
      fill(sl, simT); sl.born = simT - sl.rise - rnd() * (sl.life - sl.rise - sl.fade);   // 첫 화면부터 생애 중간 상태
      slots.push(sl);
    }
    const lobe = (m, dxr, dz) => { const dx = dxr < 0 ? dxr * m.sl : dxr / m.sl; return Math.exp(-Math.pow(dx * dx + dz * dz, m.p / 2)); };
    const landH = (m, X, Z, t, env) => {
      const dz = (Z - m.Z) / m.Rz, ux = (X - m.X - m.peakDx) / m.Rx;
      const g = m.tw ? Math.max(lobe(m, ux, dz), m.tw.k * lobe(m, (X - m.X + m.peakDx) / m.Rx, dz)) : lobe(m, ux, dz);
      if (g < 0.04) return 0;
      // 표면 굴곡은 정상에서 0 → 정상 높이 = 객체 높이(라벨 값과 일치)
      return m.h * env * g * (1 + 0.1 * (1 - g) * Math.sin(ux * 3.1 + m.ph + t / 9000) * Math.cos(dz * 2.3 + m.ph));
    };
    const groundH = (X, Z) => (Z < 900 ? 0 : (Z - 900) / 1600 * (16 * Math.sin(X / 260 + Z / 400) + 10 * Math.sin(X / 110 - Z / 230)));   // 먼 지면에만 낮은 굴곡
    /* ---- 원경 산맥 레이어(3겹): 화면 폭 전체로 이어지는 능선. 먼 레이어일수록 흐리고 아주 느리게 흐른다(line drift). 배경 맥락이라 고도 색은 쓰지 않는다 ---- */
    const RIDGES = [4600, 3500, 2700].map((Z, i) => ({ Z, i, h: [560, 460, 380][i] * lr(0.88, 1.1),
      f: [2 * Math.PI / (Z * lr(0.45, 0.6)), 2 * Math.PI / (Z * lr(0.2, 0.26)), 2 * Math.PI / (Z * lr(0.12, 0.16))],
      p: [rnd() * 6.28, rnd() * 6.28, rnd() * 6.28], v: [1 / 95000, 1 / 70000, 1 / 50000][i] }));
    const ridgeH = (L, X, t) => { const d = t * L.v;
      const n = 0.56 * Math.sin(X * L.f[0] + L.p[0] + d) + 0.32 * Math.sin(X * L.f[1] + L.p[1] + d * 1.7) + 0.12 * (1 - 2 * Math.abs(Math.sin(X * L.f[2] + L.p[2] + d * 2.3)));
      return L.h * Math.max(0.06, 0.42 + 0.5 * n) * (1 + 0.03 * Math.sin(t / 9000 + L.p[0])); };
    /* ---- 강(수면, 주간 전용): 원경에서 근경으로 좁아지며 다가오는 물길(한쪽 측면, seed로 좌/우·굴곡 결정) + 교량 2개(아치 · 사장교) ---- */
    const RIV = { u: (rnd() < 0.5 ? -1 : 1) * lr(0.44, 0.56), ph: rnd() * 6.28, amp: lr(0.05, 0.08) };
    const riverU = (Z) => RIV.u + RIV.amp * Math.sin(Z / 380 + RIV.ph) * Math.min(1, Z / 900);
    const riverW = (Z) => 62 + 0.07 * Z;
    const BRIDGES = [{ Z: lr(560, 680), kind: "arch", h: lr(50, 64), ph: rnd() * 6.28 }, { Z: lr(1350, 1650), kind: "cable", h: lr(62, 96), ph: rnd() * 6.28 }]
      .map((b) => ({ ...b, obj: "bridge", band: band(b.h) }));

    function readColors() {
      const cs = getComputedStyle(stage || document.documentElement), g = (n, d) => (cs.getPropertyValue(n).trim() || d), f = (n, d) => { const v = parseFloat(g(n, "")); return isFinite(v) ? v : d; };
      col = { mesh: g("--hm-air-mesh", "128,146,166"), grid: g("--hm-air-grid", "128,146,166"), loA: g("--hm-air-low-a", "88,180,176"), loB: g("--hm-air-low-b", "96,178,128"),
        hiA: g("--hm-air-high-a", "208,104,84"), hiB: g("--hm-air-high-b", "198,74,72"), scan: g("--hm-air-scan", "150,186,196"), limit: g("--hm-air-limit", "206,110,88"),
        txtLo: g("--hm-air-txt-lo", "112,194,160"), txtHi: g("--hm-air-txt-hi", "222,120,108"), plate: g("--hm-air-plate", "0,0,0"),
        ridge: g("--hm-air-ridge", "104,124,146"), haze: g("--hm-air-haze", "20,24,30"), water: g("--hm-air-water", "96,170,196"), glint: g("--hm-air-glint", "150,210,224"),
        k: f("--hm-air-k", 1), gridK: f("--hm-air-grid-k", 1), plateA: f("--hm-air-plate-a", 0), fill: f("--hm-air-fill", 0), wash: f("--hm-air-wash", 0),
        ridgeFill: f("--hm-air-ridge-fill", 0.02), ridgeLine: f("--hm-air-ridge-line", 1), hazeA: f("--hm-air-haze-a", 0), waterA: f("--hm-air-water-a", 0.03),
        reflect: f("--hm-air-reflect", 0.06), shim: f("--hm-air-shimmer", 0.12), fog: f("--hm-air-fog", 1.15), ceil: f("--hm-air-ceil", 0.03),
        star: g("--hm-air-star", "200,214,230"), starA: f("--hm-air-star-a", 0), ground: g("--hm-air-ground", "168,200,186"), groundB: g("--hm-air-ground-b", "132,186,152"),
        groundA: f("--hm-air-ground-a", 0), groundPts: f("--hm-air-ground-pts", 1),
        day: g("--hm-air-mode", "night") === "day", lw: g("--hm-air-lw", "500"), lpx: g("--hm-label-px", "10px"), blend: g("--hm-air-blend", "source-over") };
    }
    function resize() {
      if (!stage || !cv) return;
      const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2); lite = w < 700;
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
        if (col) draw(performance.now()); }   // 크기를 바꾸면 캔버스가 지워지므로 바로 다시 그림(탐색 경로 열고 닫는 동안 배경이 깜빡이지 않게, 요청 AA7)
      dirty = true;
    }
    function mount(st) {
      stage = st;
      if (!cv) { cv = document.createElement("canvas"); cv.className = "hm-air-canvas"; cv.setAttribute("aria-hidden", "true"); ctx = cv.getContext("2d"); }
      stage.prepend(cv); readColors(); resize();
    }
    const setDrone = (r) => { drone = r; dirty = true; };
    const setPanels = (rs) => { panels = rs; dirty = true; };
    const flightReact = (ux, uy) => { react = { ux, uy, t0: performance.now() }; };
    const inPanel = (x, y, pad = 0) => panels.some((r) => x > r.l - pad && x < r.r + pad && y > r.t - pad && y < r.b + pad);
    const inDrone = (x, y) => drone && Math.abs(x - drone.cx) < drone.hw && Math.abs(y - drone.cy) < drone.hh;

    function draw(now) {
      if (!ctx || !W || !H) return;
      const rm = reduce.matches, t = simT, k = col.k * VIS, day = col.day, shimA = rm ? 0 : col.shim;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = drone ? drone.cx : W / 2, cy = drone ? drone.cy : H / 2, yh = H * 0.44, F = H * 1.0, uX = (u, Z) => u * Z * (W / 2) / F;
      const P = (X, Y, Z) => [cx + (X / Z) * F, yh + ((HC - Y) / Z) * F];
      const edgeA = (x, y) => sm(Math.min(x, W - x) / (W * 0.08)) * sm(y / (H * 0.12));
      const depthA = (Z, ref) => Math.min(1, Math.pow(ref / Z, col.fog));       // 근경 선명 → 원경 약하게(라이트는 원근 안개가 더 강하다)
      const rX = (Z) => uX(riverU(Z), Z);
      // 교량 형상(월드 X·Y, 같은 Z): 선 [{p, a}] · 점 [[X, Y, tw, a]] · 꼭대기(라벨). 그리기와 수면 반사가 함께 쓴다
      const bridgeShape = (b) => { const Z = b.Z, xr = rX(Z), half = riverW(Z) / 2 + 30, x0 = xr - half, x1 = xr + half, deck = 12, Ls = [], Ds = [];
        Ls.push({ p: [[x0, deck], [x1, deck]], a: 0.34 }, { p: [[x0, deck - 3.5], [x1, deck - 3.5]], a: 0.16 });
        for (let q = 0; q <= 1.0001; q += 0.035) Ds.push([x0 + q * (x1 - x0), deck, q * 30, 0.42]);
        let top;
        if (b.kind === "arch") {
          const rise = b.h - deck, A = (q) => deck + rise * (1 - (2 * q - 1) ** 2), xa = (q) => x0 + (0.1 + 0.8 * q) * (x1 - x0), arc = [];
          for (let q = 0; q <= 1.0001; q += 0.05) { arc.push([xa(q), A(q)]); Ds.push([xa(q), A(q), q * 40, 0.46]); }
          Ls.push({ p: arc, a: 0.32 });
          for (let q = 0.1; q < 0.95; q += 0.1) Ls.push({ p: [[xa(q), A(q)], [xa(q), deck]], a: 0.13 });
          [x0, x1, xa(0), xa(1)].forEach((x) => Ls.push({ p: [[x, 0], [x, deck]], a: 0.2 }));
          top = [xa(0.5), b.h];
        } else {
          [0.3, 0.7].forEach((q) => { const xp = x0 + q * (x1 - x0);
            Ls.push({ p: [[xp, 0], [xp, b.h]], a: 0.34 });
            for (let y = 0; y <= b.h; y += 6) Ds.push([xp, y, y * 0.2, 0.4]);
            for (const d of [-0.22, -0.14, -0.07, 0.07, 0.14, 0.22]) Ls.push({ p: [[xp, b.h * (0.97 - Math.abs(d) * 1.1)], [xp + d * (x1 - x0), deck]], a: 0.13 }); });
          top = [x0 + 0.7 * (x1 - x0), b.h];
        }
        return { Ls, Ds, top }; };
      let xs = -1e9, sp = 0;
      if (!rm) { if (t > scanStart + scanDur) scanStart = t + 7500 + rnd() * 5500; if (t >= scanStart) { sp = (t - scanStart) / scanDur; xs = -0.08 * W + 1.16 * W * sp; } }
      let rEnv = 0; if (react) { const e = now - react.t0; rEnv = e < 300 ? sm(e / 300) : e < 650 ? 1 : 1 - sm((e - 650) / 900); if (e > 1600) react = null; }
      const batches = new Map(), labels = [];
      const add = (x, y, a, c, sz, tw) => {
        if (x < -3 || x > W + 3 || y < -3 || y > H + 3) return;
        a *= edgeA(x, y);
        if (inDrone(x, y)) a *= 0.3;
        if (inPanel(x, y)) a *= 0.22;
        if (tw !== undefined && shimA) a *= 1 + shimA * Math.sin(t / 760 + tw);  // 아주 약한 shimmer
        if (sp) { const gs = Math.exp(-(((x - xs) / 40) ** 2)); a *= 1 + 1.0 * gs; if (c[0] === "h") sz += 0.4 * gs; }
        if (rEnv && react) { const dx = x - cx, dy = y - cy, l = Math.hypot(dx, dy) || 1, cs = (dx * react.ux + dy * react.uy) / l; if (cs > 0.9) a *= 1 + 0.9 * rEnv * (cs - 0.9) / 0.1; }
        a *= k; if (a < 0.012) return;
        const ai = Math.min(20, Math.round(a / 0.03)), key = c + "|" + ai;
        let p = batches.get(key); if (!p) { p = new Path2D(); batches.set(key, p); }
        p.rect(x - sz / 2, y - sz / 2, sz + 0.15, sz + 0.15);
      };
      const line = (pts, c, a) => {
        if (pts.length < 2) return; const m = pts[pts.length >> 1]; a *= edgeA(m[0], m[1]) * (inPanel(m[0], m[1]) ? 0.2 : 1) * (inDrone(m[0], m[1]) ? 0.35 : 1) * k;
        if (a < 0.01) return; ctx.strokeStyle = `rgba(${col[c]},${Math.min(0.6, a)})`; ctx.beginPath(); ctx.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]); ctx.stroke();
      };
      // 옅은 반투명 면(라이트: 건물·산이 배경에 묻히지 않게 / 다크: 거의 보이지 않게)
      const shade = (poly, c, a) => {
        if (poly.length < 3 || a < 0.004) return; const m = poly[poly.length >> 1]; a *= edgeA(m[0], m[1]) * (inPanel(m[0], m[1]) ? 0.3 : 1);
        ctx.fillStyle = `rgba(${col[c]},${Math.min(0.14, a)})`; ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]); for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i][0], poly[i][1]); ctx.closePath(); ctx.fill();
      };
      ctx.lineWidth = 1;
      const tD = rm ? 0 : t;                                                    // reduced motion: 원경 drift 정지

      // 별(야간 전용): 원경 산맥보다 위 하늘에만. 드론·패널 영역은 건너뜀
      if (col.starA > 0) { const top = H * 0.03, bot = yh - H * 0.15, n = lite ? 60 : STARS.length;
        for (let i = 0; i < n; i++) { const S_ = STARS[i], x = S_.u * W, y = top + S_.v * (bot - top);
          if (inDrone(x, y) || inPanel(x, y, 6)) continue;
          const a = col.starA * S_.a * (S_.tw && !rm ? 0.82 + 0.18 * Math.sin(t / S_.tw + S_.ph) : 1) * sm(Math.min(x, W - x) / (W * 0.06)) * (1 - 0.45 * S_.v);
          if (a < 0.01) continue; ctx.fillStyle = `rgba(${col.star},${Math.min(0.9, a)})`; ctx.fillRect(x - S_.sz / 2, y - S_.sz / 2, S_.sz, S_.sz);
          if (S_.sz > 1.4) { ctx.fillStyle = `rgba(${col.star},${Math.min(0.9, a) * 0.16})`; ctx.beginPath(); ctx.arc(x, y, S_.sz * 1.9, 0, Math.PI * 2); ctx.fill(); } } }
      // 0. 원경 산맥 3겹(먼 것부터) — 라이트: 대기 원근(뒤 레이어일수록 밝고 흐림) / 다크: 옅은 능선 윤곽
      const ridgePts = RIDGES.filter((L) => !lite || L.i > 0).map((L) => {
        const pts = []; for (let x = -12; x <= W + 12; x += 6) { const X = (x - cx) * L.Z / F; pts.push(P(X, ridgeH(L, X, tD), L.Z)); }
        return { L, pts, base: P(0, 0, L.Z)[1] };
      });
      for (const { L, pts, base } of ridgePts) {
        const near = (L.i + 1) / 3, poly = pts.concat([[W + 12, base + 2], [-12, base + 2]]);
        const gr = ctx.createLinearGradient(0, Math.min(...pts.map((p) => p[1])), 0, base);
        gr.addColorStop(0, `rgba(${col.ridge},${col.ridgeFill * (0.45 + 0.55 * near)})`); gr.addColorStop(1, `rgba(${col.ridge},${col.ridgeFill * (0.2 + 0.3 * near)})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]); for (const p of poly) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
        line(pts, "ridge", (0.07 + 0.08 * near) * col.ridgeLine);
        for (let i = 2; i < pts.length; i += lite ? 4 : 2) { const [x, y] = pts[i]; add(x, y + ((i * 7) % 5), (0.07 + 0.08 * near) * col.ridgeLine, "ridge", 1.2, i * 1.3 + L.i); }
      }
      // 지평선 대기층(라이트: white mist / 다크: 옅은 navy haze)
      // 주간 지면: 격자 대신 연한 녹색~청록 그라데이션 + 원근으로 좁아지는 아주 옅은 잔디 띠(그래픽적인 지면감). 지평선은 아래 대기층이 부드럽게 덮는다
      if (col.groundA > 0) { const g0 = P(0, 0, 2600)[1];
        const gr = ctx.createLinearGradient(0, g0, 0, H); gr.addColorStop(0, `rgba(${col.ground},0)`); gr.addColorStop(0.18, `rgba(${col.ground},${col.groundA * 0.55})`);
        gr.addColorStop(0.6, `rgba(${col.groundB},${col.groundA * 0.85})`); gr.addColorStop(1, `rgba(${col.groundB},${col.groundA})`);
        ctx.fillStyle = gr; ctx.fillRect(0, g0, W, H - g0);
        for (let Z = 240, i = 0; Z < 2400; Z *= 1.22, i++) { if (i % 2) continue;
          const y0 = P(0, 0, Z * 1.22)[1], y1 = P(0, 0, Z)[1]; ctx.fillStyle = `rgba(${col.groundB},${(0.045 * Math.min(1, 700 / Z)).toFixed(3)})`; ctx.fillRect(0, y0, W, y1 - y0); } }
      if (col.hazeA > 0) { const gr = ctx.createLinearGradient(0, yh - H * 0.2, 0, yh + H * 0.14);
        gr.addColorStop(0, `rgba(${col.haze},0)`); gr.addColorStop(0.62, `rgba(${col.haze},${col.hazeA})`); gr.addColorStop(1, `rgba(${col.haze},0)`);
        ctx.fillStyle = gr; ctx.fillRect(0, yh - H * 0.2, W, H * 0.34); }

      // A. 지면 grid(먼 지면은 낮은 굴곡) + 지면 점군
      for (let Z = 230; Z < 2600; Z *= 1.16) {
        const pts = []; for (let X = -Z * 1.8; X <= Z * 1.8; X += Z * 0.06) pts.push(P(X, groundH(X, Z), Z));
        line(pts, "grid", 0.08 * Math.min(1, 520 / Z) * col.gridK);
      }
      ctx.strokeStyle = `rgba(${col.grid},${Math.min(0.5, 0.05 * k * col.gridK)})`; ctx.beginPath();
      for (let X = -2400; X <= 2400; X += 200) { const [x1, y1] = P(X, 0, 230), [x2, y2] = P(X, groundH(X, 2600), 2600); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); }
      ctx.stroke();
      for (let Z = 240; Z < 2500; Z *= lite ? 1.2 : 1.13) for (let X = -Z * 1.7; X <= Z * 1.7; X += Z * (lite ? 0.18 : 0.12)) {
        if (day && Math.abs(X - rX(Z)) < riverW(Z) / 2) continue;                // 수면 위에는 지면 점 없음(주간)
        const [x, y] = P(X, groundH(X, Z), Z); add(x, y, 0.15 * Math.min(1, 600 / Z) * col.groundPts, "mesh", 1.4); }   // 주간: 지면 점 옅게(격자 느낌 완화)

      // A2. 강(수면, 주간 전용): 옅은 수면 + 강변 선 + 원경 능선·교량 반사 + 흔들리는 반짝임. 근경 끝은 부드럽게 사라진다. 야간에는 그리지 않는다
      if (day) { const zs = []; for (let Z = 2500; Z > 255; Z /= 1.05) zs.push(Z);
        const Lb = zs.map((Z) => P(rX(Z) - riverW(Z) / 2, 0, Z)), Rb = zs.map((Z) => P(rX(Z) + riverW(Z) / 2, 0, Z));
        const yFar = Lb[0][1], yNear = P(0, 0, 260)[1], yFull = P(0, 0, 420)[1];
        const wg = (a0) => { const g = ctx.createLinearGradient(0, yFar, 0, yNear); const r = Math.max(0.01, Math.min(0.99, (yFull - yFar) / (yNear - yFar)));
          g.addColorStop(0, `rgba(${col.water},${a0 * 0.55})`); g.addColorStop(r, `rgba(${col.water},${a0})`); g.addColorStop(1, `rgba(${col.water},0)`); return g; };
        const poly = Lb.concat(Rb.slice().reverse());
        ctx.save(); ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]); for (const p of poly) ctx.lineTo(p[0], p[1]); ctx.closePath();
        ctx.fillStyle = wg(col.waterA); ctx.fill(); ctx.clip();
        // 반사: 원경 능선을 각 레이어 기준선에서 뒤집어 수면 안에만
        for (const { L, pts, base } of ridgePts) { const near = (L.i + 1) / 3;
          ctx.strokeStyle = `rgba(${col.ridge},${col.reflect * (0.5 + 0.5 * near)})`; ctx.beginPath();
          pts.forEach(([x, y], i) => (i ? ctx.lineTo(x, 2 * base - y) : ctx.moveTo(x, 2 * base - y))); ctx.stroke(); }
        BRIDGES.forEach((b, i) => { if (lite && i) return; const da = depthA(b.Z, 1300);         // 교량 반사: 수면 기준(Y=0)으로 뒤집기
          for (const l of bridgeShape(b).Ls) line(l.p.map(([X, Y]) => P(X, -Y, b.Z)), b.band, l.a * 0.5 * da); });
        ctx.restore();
        ctx.strokeStyle = wg(Math.min(0.45, col.waterA * 2.6 * k)); ctx.beginPath();
        [Lb, Rb].forEach((B) => B.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))); ctx.stroke();
        const nG = lite ? 34 : 64;
        for (let i = 0; i < nG; i++) {
          const Z = 280 * Math.pow(2400 / 280, i / nG), hsh = Math.sin(i * 12.9898) * 43758.5453, fr = hsh - Math.floor(hsh), w = riverW(Z);
          const X = rX(Z) + (fr - 0.5) * w * 0.74, len = w * (0.05 + 0.1 * ((fr * 7.3) % 1));
          const tw = rm ? 0.6 : 0.5 + 0.5 * Math.sin(t / 650 + i * 1.7), [x1, y] = P(X - len / 2, 0, Z), [x2] = P(X + len / 2, 0, Z);
          const a = 0.2 * tw * Math.min(1, Math.pow(700 / Z, 0.5)) * sm((Z - 300) / 420) * edgeA(x1, y) * (inPanel(x1, y) ? 0.25 : 1) * k;
          if (a < 0.015) continue; ctx.strokeStyle = `rgba(${col.glint},${Math.min(0.5, a)})`; ctx.beginPath(); ctx.moveTo(x1, y + 0.5); ctx.lineTo(x2, y + 0.5); ctx.stroke();
        } }

      // 드론 바닥 hover zone: 옅은 투영 원 + 가는 기준 원 + 아주 천천히 도는 점선 원 + 얇은 리플 3개(9초 주기, 1/3 간격)
      { const fk = focus.k, [gx0, gy] = P(0, 0, Z_DRONE), gx = gx0 + focus.x * 0.9, rx = (90 / Z_DRONE) * F * 1.25 * focus.s, ry = rx * 0.32, sq = ry / rx;
        const gr = ctx.createRadialGradient(gx, gy, 0, gx, gy, rx * 1.1); gr.addColorStop(0, `rgba(${col.scan},${0.07 * k * fk})`); gr.addColorStop(1, `rgba(${col.scan},0)`);
        ctx.save(); ctx.translate(gx, gy); ctx.scale(1, sq); ctx.translate(-gx, -gy); ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(gx, gy, rx * 1.1, 0, Math.PI * 2); ctx.fill(); ctx.restore();
        ctx.strokeStyle = `rgba(${col.scan},${0.07 * k * fk})`; ctx.beginPath(); ctx.ellipse(gx, gy, rx * 0.55, rx * 0.55 * sq, 0, 0, Math.PI * 2); ctx.stroke();
        ctx.save(); ctx.setLineDash([1.5, 6]); ctx.lineDashOffset = rm ? 0 : -t / 160; ctx.strokeStyle = `rgba(${col.scan},${0.09 * k * fk})`;
        ctx.beginPath(); ctx.ellipse(gx, gy, rx * 1.42, rx * 1.42 * sq, 0, 0, Math.PI * 2); ctx.stroke(); ctx.restore();
        const waves = rm ? [0.3, 0.62] : [0, 1 / 3, 2 / 3].map((o) => ((t / 9000 + o) % 1));
        for (const p of waves) { const e = 1 - Math.pow(1 - p, 2.2), R = rx * (0.25 + 1.75 * e), a = (rm ? 0.08 : 0.13 * sm(p / 0.08) * Math.pow(1 - p, 1.4)) * k * fk;
          if (a < 0.008) continue; ctx.strokeStyle = `rgba(${col.scan},${a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.ellipse(gx, gy, R, R * 0.32, 0, 0, Math.PI * 2); ctx.stroke(); }
        for (let i = 0; i < 72; i++) { const an = (i / 72) * 2 * Math.PI, [x, y] = P(Math.cos(an) * 88, 0, Z_DRONE + Math.sin(an) * 88); add(x + focus.x * 0.9, y, 0.12 * fk, "mesh", 1.2); } }

      // B. 슬롯 객체 + 교량(먼 것부터)
      for (const sl of slots) { if (!rm && t > sl.born + sl.life) fill(sl, t); }
      const items = [];
      for (const sl of slots) {
        if (!rm && t < sl.born) continue;
        if (lite && sl.idx % 3 === 1) continue;                                  // 좁은 화면: 객체 수 줄임
        if (day && Math.abs(sl.u - riverU(sl.z)) < 0.16) continue;               // 주간: 강·교량 구간은 비워 수면과 교량이 읽히게
        const rp = rm ? 1 : sm((t - sl.born) / sl.rise), fp = rm ? 0 : sm((t - (sl.born + sl.life - sl.fade)) / sl.fade);
        for (const it of sl.items) items.push({ sl, it, rp, fp, Z: sl.z + it.dz });
      }
      if (day) BRIDGES.forEach((b, i) => { if (!lite || i === 0) items.push({ it: b, Z: b.Z, rp: 1, fp: 0 }); });   // 교량: 주간 전용
      items.sort((a, b) => b.Z - a.Z);
      for (const { sl, it, rp, fp, Z } of items) {
        if (it.obj === "bridge") {
          const da = depthA(Z, 1300) * (rm ? 1 : 0.9 + 0.1 * Math.sin(t / 6000 + it.ph)), c = it.band, sh = bridgeShape(it);
          for (const l of sh.Ls) line(l.p.map(([X, Y]) => P(X, Y, Z)), c, l.a * 1.35 * da);
          for (const [X, Y, tw, a] of sh.Ds) { const [x, y] = P(X, Y, Z); add(x, y, a * 1.25 * da, c, 1.6, tw); }
          const [px, py] = P(sh.top[0], sh.top[1], Z), [, gy] = P(sh.top[0], 0, Z);
          labels.push({ id: 1000 + Z, x: px, y: py, gy, h: it.h, c, a: 1 });
        } else if (it.obj === "land") {
          const da = depthA(Z, 1400);
          const env = (0.3 + 0.7 * rp) * (1 - 0.6 * fp) * (rm ? 1 : 0.96 + 0.04 * Math.sin(t / 7000 + it.ph));
          it.X = uX(sl.u, Z); it.Z = Z;
          const c = it.band, hi = c[0] === "h", stepX = it.Rx / (lite ? 5 : 7.5), stepZ = it.Rz / 3.4, ex = it.Rx * it.ext;
          // 산 앞면 실루엣 아래 옅은 wash
          { const top = [], base = []; for (let X = it.X - ex; X <= it.X + ex; X += stepX / 2) { const h = landH(it, X, Z, t, env); if (h > 1.5) { top.push(P(X, h, Z)); base.push(P(X, 0, Z)); } }
            shade(top.concat(base.reverse()), c, col.wash * da * (1 - fp * 0.6)); }
          for (let dzI = -1.5; dzI <= 1.5; dzI += 1) {
            const Zs = Z + dzI * stepZ * 1.2, pts = [];
            for (let X = it.X - ex; X <= it.X + ex; X += stepX / 2) { const h = landH(it, X, Zs, t, env); if (h > 1.5 || pts.length) pts.push(P(X, h, Zs)); }
            line(pts, c, (hi ? 0.31 : 0.23) * da * (dzI < 0 ? 1 : 0.6) * (1 - fp * 0.6));
          }
          for (let Zs = Z - it.Rz * it.extZ; Zs <= Z + it.Rz * it.extZ; Zs += stepZ) for (let X = it.X - ex, n = 0; X <= it.X + ex; X += stepX, n++) {
            const h = landH(it, X, Zs, t, env); if (h < 3) continue;
            const [x, y] = P(X, h, Zs); add(x, y, (hi ? 0.36 : 0.29) * da * (1 - fp * 0.5), c, 1.4, X * 0.05 + Zs * 0.013);
            if (n % 4 === 0 && Math.abs(Zs - Z) < stepZ * 0.6) for (let L = 12; L < h - 6; L += 14) { const [ex2, ey] = P(X, L, Zs); add(ex2, ey, 0.09 * da, c, 1); }
          }
          if (env > 0.7) { const Xp = it.X + it.peakDx, [px, py] = P(Xp, landH(it, Xp, Z, t, env), Z), [, gy] = P(Xp, 0, Z); labels.push({ id: sl.idx * 10, x: px, y: py, gy, h: it.h, c, a: sm((env - 0.7) / 0.25) }); }
        } else {
          const da = depthA(Z, 820);
          const breath = rm ? 1 : 1 + 0.03 * Math.sin(t / 5200 + it.ph);
          const hNow = it.h * (0.3 + 0.7 * rp) * (1 - 0.4 * fp) * breath, c = it.band, hi = c[0] === "h";
          let Xc = uX(sl.u, Z) + it.dX;
          if (day) { const xr = rX(Z), need = riverW(Z) / 2 + it.w / 2 + 8; if (Math.abs(Xc - xr) < need) Xc = xr + (Xc >= xr ? 1 : -1) * need; }   // 주간: 건물은 강변으로 비켜 선다
          const X0 = Xc - it.w / 2;
          for (const [fx0, fx1, fy0, fy1] of it.tiers) {                         // 앞면 옅은 채움(쌓아 올라가는 높이까지)
            const yTop = Math.min(fy1, rp + 0.02); if (yTop <= fy0) continue;
            shade([P(X0 + fx0 * it.w, fy0 * hNow, Z), P(X0 + fx1 * it.w, fy0 * hNow, Z), P(X0 + fx1 * it.w, yTop * hNow, Z), P(X0 + fx0 * it.w, yTop * hNow, Z)], c, col.fill * da * (1 - fp));
          }
          for (const [fx, fy, back, rv, tip] of it.pts) {
            if (fy > rp + 0.02 || rv < fp) continue;
            if (lite && !tip && rv > 0.6) continue;
            const edge = fy > rp - 0.06 ? sm((rp + 0.02 - fy) / 0.08) : 1;
            const [x, y] = P(X0 + fx * it.w, fy * hNow, Z + back * it.dz);
            add(x, y, (tip ? (hi ? 0.56 : 0.46) : hi ? 0.34 : 0.28) * da * edge, c, tip ? (hi ? 2 : 1.7) : 1.4, rv * 40);
          }
          if (rp > 0.85) {
            const a = (hi ? 0.38 : 0.28) * da * (1 - fp);
            for (const [fx0, fx1, fy0, fy1] of it.tiers) {
              line([P(X0 + fx0 * it.w, fy0 * hNow, Z), P(X0 + fx0 * it.w, fy1 * hNow, Z), P(X0 + fx1 * it.w, fy1 * hNow, Z), P(X0 + fx1 * it.w, fy1 * hNow, Z + it.dz)], c, a);
              line([P(X0 + fx1 * it.w, fy0 * hNow, Z), P(X0 + fx1 * it.w, fy1 * hNow, Z)], c, a * 0.75);
            }
          }
          if (rp > 0.9 && fp < 0.6 && it.kind !== "low") { const Xp = X0 + it.peakFx * it.w, Zp = Z + it.dz / 2, [px, py] = P(Xp, hNow, Zp), [, gy] = P(Xp, 0, Zp);
            labels.push({ id: sl.idx * 10 + 1, x: px, y: py, gy, h: it.h, c, a: 1 - sm(fp / 0.6) }); }
        }
      }
      // C. 150m 기준: 아주 얇은 점선 + 그 위 공역 천장 쪽으로 옅게 번지는 band(간접 표현)
      const y150 = P(0, LIMIT, 1850)[1];
      if (col.ceil > 0) { const bh = H * 0.16, n = 16;
        for (let i = 0; i < n; i++) { const a = col.ceil * Math.pow(1 - (i + 0.5) / n, 1.6), gr = ctx.createLinearGradient(W * 0.04, 0, W * 0.96, 0);
          gr.addColorStop(0, `rgba(${col.limit},0)`); gr.addColorStop(0.18, `rgba(${col.limit},${a})`); gr.addColorStop(0.82, `rgba(${col.limit},${a})`); gr.addColorStop(1, `rgba(${col.limit},0)`);
          ctx.fillStyle = gr; ctx.fillRect(W * 0.04, y150 - (i + 1) * bh / n, W * 0.92, bh / n + 0.5); } }
      ctx.save(); ctx.setLineDash([2, 6]); ctx.strokeStyle = `rgba(${col.limit},${Math.min(0.5, 0.24 * k)})`; ctx.beginPath(); ctx.moveTo(W * 0.06, y150); ctx.lineTo(W * 0.93, y150); ctx.stroke(); ctx.restore();
      ctx.globalCompositeOperation = col.blend === "lighter" ? "lighter" : "source-over";   // 다크: 겹치는 점이 은은하게 발광 / 라이트: 일반 합성
      for (const [key, p] of batches) { const [c, ai] = key.split("|"); ctx.fillStyle = `rgba(${col[c]},${Math.min(0.6, ai * 0.03)})`; ctx.fill(p); }
      ctx.globalCompositeOperation = "source-over";
      // 고도 라벨: 슬롯 순서(안정적) 기준 최대 6개(좁은 화면 4개) + 150 m 기준선 라벨. 교량은 남는 자리에만
      ctx.font = `${col.lw} ${col.lpx} Pretendard, sans-serif`; ctx.textBaseline = "middle";
      const placed = [{ x: W * 0.94, y: y150, fixed: true }], maxL = lite ? 4 : 6;
      const tag = (txt, x, y, align, rgb, a) => {
        if (col.plateA > 0) { const w = ctx.measureText(txt).width, x0 = align === "left" ? x - 3 : x - w - 3;
          ctx.fillStyle = `rgba(${col.plate},${col.plateA * a})`; ctx.beginPath(); ctx.roundRect(x0, y - 7, w + 6, 14, 3); ctx.fill(); }
        ctx.textAlign = align; ctx.fillStyle = `rgba(${rgb},${a})`; ctx.fillText(txt, x, y);
      };
      for (const L of labels.sort((a, b) => a.id - b.id)) {
        if (placed.length > maxL) break;
        const right = L.x < W * 0.86, tx = right ? L.x + 6 : L.x - 6, ty = L.y - 8;
        if (L.x < W * 0.07 || L.x > W * 0.95 || L.y < H * 0.1) continue;
        if (inDrone(L.x, L.y) || inPanel(L.x, L.y, 10) || inPanel(tx, ty, 10)) continue;
        if (placed.some((q) => Math.abs(q.x - L.x) < (q.fixed ? 90 : 70) && Math.abs(q.y - L.y) < (q.fixed ? 26 : 24))) continue;
        const a = L.a * Math.min(1.1, col.k), cc = col[L.c], hiL = L.c[0] === "h";
        ctx.strokeStyle = `rgba(${cc},${0.4 * a})`; ctx.beginPath(); ctx.moveTo(L.x + 0.5, Math.min(L.gy, H)); ctx.lineTo(L.x + 0.5, L.y); ctx.stroke();
        ctx.fillStyle = `rgba(${cc},${0.9 * a})`; ctx.beginPath(); ctx.arc(L.x + 0.5, L.y, 1.8, 0, Math.PI * 2); ctx.fill();
        tag(`${Math.round(L.h / 5) * 5} m`, tx, ty, right ? "left" : "right", hiL ? col.txtHi : col.txtLo, Math.min(1, 0.86 * a));
        placed.push(L);
      }
      tag("150 m", W * 0.965, y150, "right", col.limit, Math.min(1, 0.6 * Math.min(1.1, col.k)));
      if (sp) { const a = 0.05 * Math.sin(Math.PI * sp) * col.k, gr = ctx.createLinearGradient(0, yh - H * 0.28, 0, H);
        gr.addColorStop(0, `rgba(${col.scan},0)`); gr.addColorStop(0.45, `rgba(${col.scan},${a})`); gr.addColorStop(1, `rgba(${col.scan},0)`);
        ctx.fillStyle = gr; ctx.fillRect(xs - 0.5, yh - H * 0.28, 1, H); }
      dirty = false;
    }
    function tick(now, dt) {
      if (!stage || !stage.isConnected) return;
      const moving = !reduce.matches && G.motion;
      if (moving) simT += dt * 1000;
      if ((moving && now - lastDraw >= 32) || dirty || react) { lastDraw = now; draw(now); }
    }
    const setFocus = (k, x, sc = 1) => { if (Math.abs(k - focus.k) > 0.01 || Math.abs(x - focus.x) > 0.5 || Math.abs(sc - focus.s) > 0.01) { focus.k = k; focus.x = x; focus.s = sc; dirty = true; } };
    return { mount, resize, setDrone, setPanels, flightReact, setFocus, tick, markDirty: () => { dirty = true; } };
  })();

  function run(steps) { seq = { steps, i: 0, t0: performance.now(), from: { ...st } }; wake(); }
  function tickSeq(now) {
    while (seq) {
      const s = seq.steps[seq.i], k = clamp01((now - seq.t0) / s.d), e = (s.ease || inOutSine)(k);
      for (const key in s.to) st[key] = seq.from[key] + (s.to[key] - seq.from[key]) * e;
      if (k < 1) return;
      seq.i++;
      if (seq.i >= seq.steps.length) { seq = null; return; }
      seq.t0 += s.d; seq.from = { ...st };
    }
  }

  /* ---------------- 화면 HTML: 요약 카드 4개 + 드론 무대 ---------------- */
  function html(data) {
    const open = HM.open, still = !G.motion, label = still ? "움직임 재생" : "움직임 멈추기";
    const stageCls = ["hm-stage", open && "is-open is-revealed is-engaged-static", still && "is-still", HM.ready && "is-3d", HM.failed && "is-fallback"].filter(Boolean).join(" ");
    return `<section class="hm-kpi" aria-label="진로 탐색 데이터 요약">${data.kpis.map((k) => `<button type="button" class="hm-kpi__item" data-act="kpi-go" data-key="${esc(k.key)}" title="${esc(k.sub)}"
        style="--rest:${k.icon.rest};--hover:${k.icon.hover}"><i class="hm-kpi__ico" aria-hidden="true"></i><span class="hm-kpi__text"><span class="hm-kpi__label">${esc(k.label)}</span>
        <span class="hm-kpi__value"><span class="num" data-countup="${k.value}">${fmt(k.value)}</span><span class="hm-kpi__unit">${esc(k.unit)}</span></span></span><i class="hm-kpi__go" aria-hidden="true"></i></button>`).join("")}</section>
      <div class="${stageCls}" data-ui="hero-visual"><svg class="hm-guides" aria-hidden="true"></svg>
        <span class="hm-ring"></span><span class="hm-ring hm-ring--b"></span>
        <button class="hm-core" type="button" data-act="hero" aria-expanded="${open}" aria-label="${open ? "탐색 메뉴 접기" : "탐색 메뉴 열기"}">${FALLBACK_SVG}</button>
        <div class="hm-menu">${data.entries.map((e, i) => `<button type="button" class="hm-go hm-p${i + 1}" data-act="hero-go" data-key="${esc(e.key)}" tabindex="${open ? 0 : -1}"><b><i class="hm-go__ico" aria-hidden="true" style="--ico:${e.icon}"></i>${esc(e.label)}</b><span>${esc(e.desc)}</span></button>`).join("")}</div>
        <button class="hm-toggle" type="button" data-act="motion" aria-pressed="${still}" aria-label="${label}" title="${label}">${ICONS}</button></div>`;
  }
  /* KPI 숫자 올라가기(움직임 멈춤·동작 줄이기면 바로 최종값) */
  function runCountups(root) {
    if (!G.motion || reduce.matches) return;
    root.querySelectorAll("[data-countup]").forEach((el) => {
      const v = +el.dataset.countup, t0 = performance.now(), dur = G.countupMs;
      const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(v * e); if (p < 1) requestAnimationFrame(step); };
      requestAnimationFrame(step);
    });
  }

  /* ---------------- 부품을 그릴 때마다: 처음이면 화면을 만들고 무대를 연결, 진입·복귀 비행 요청을 확인 ---------------- */
  const io = new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; updateVisible(); });
  const stageRO = new ResizeObserver(() => { AIR.resize(); updateDroneRect(); if (HM.open) layoutGuides(); });
  window.addEventListener("dd-zoom", () => {                                   // 비율 확대가 바뀌면 캔버스 해상도를 다시(요청 AE3)
    if (HM.three && !HM.three.flying) { HM.three.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); HM.three.fit(true); }
    AIR.resize(); wake();
  });
  function updateDroneRect() { if (HM.core) AIR.setDrone({ cx: HM.core.offsetLeft, cy: HM.core.offsetTop, hw: HM.core.offsetWidth * 0.72 * 1.2, hh: HM.core.offsetHeight * 0.66 * 1.2 }); }   // 커진 기체만큼 배경 점·라벨 비켜 두는 영역도 확대
  const onKey = (e) => { if (e.key === "Escape" && HM.open && HM.phase === "idle" && HM.stage && HM.stage.isConnected) closeMenu(); };
  function mount(component) {
    const { data, parentElement, setStateValue, setTriggerValue } = component;
    G.setState = setStateValue; G.trigger = setTriggerValue; G.vendor = data.vendor; G.countupMs = data.countup_ms;
    let root = parentElement.querySelector(".hm-root");
    if (!root) {                                                              // 처음 그림(홈에 들어올 때마다 새 화면): 저장된 열림·움직임 상태 적용
      teardown();
      G.motion = !!data.motion; HM.open = !!data.open; HM.phase = "idle";
      root = document.createElement("div"); root.className = "hm-root" + (G.motion ? "" : " hm-still"); root.innerHTML = html(data);
      parentElement.appendChild(root); G.root = root;
      root.addEventListener("click", lock, true);
      root.addEventListener("keydown", (e) => { if (["Enter", " ", "Escape"].includes(e.key)) lock(e); }, true);
      root.addEventListener("click", (e) => { const el = e.target.closest("[data-act]"); if (el && ACT[el.dataset.act]) ACT[el.dataset.act](el, e); });
      bindHover(root);
      document.addEventListener("keydown", onKey);
      runCountups(root);
      attachStage();
    }
    // 진입(첫 방문)·복귀(다른 화면에서 돌아옴) 비행: 방문 번호가 바뀔 때만 한 번
    if (data.entry && data.entry.visit !== G.playedVisit) { G.playedVisit = data.entry.visit; G.pendingEntry = data.entry; tryEntry(); }
    // 정리: 다시 그릴 때가 아니라 홈을 떠나 부품이 빠졌을 때만
    return () => setTimeout(() => { if (!root.isConnected && G.root === root) teardown(); }, 0);
  }
  function teardown() {
    clearTimers(); entry = null; fl = null;
    if (HM.three && HM.three.staged) HM.three.viewOut();
    if (HM.canvas) { HM.canvas.style.opacity = ""; HM.canvas.remove(); }
    io.disconnect(); stageRO.disconnect(); document.removeEventListener("keydown", onKey);
    HM.stage = HM.core = null; HM.panels = []; HM.phase = "idle"; G.root = null; leanT.x = leanT.y = 0; hoverTarget = 0; sleep();
  }
  function tryEntry() {
    if (!G.pendingEntry || !HM.ready || !HM.stage) return;                    // 3D 준비 전이면 setup3d 끝에서 다시
    const e = G.pendingEntry; G.pendingEntry = null; HM.lastPanel = e.panel ?? null;
    requestAnimationFrame(() => startEntry(e.kind));
  }
  function attachStage() {
    HM.stage = G.root.querySelector(".hm-stage"); HM.core = HM.stage.querySelector(".hm-core"); HM.panels = [...HM.stage.querySelectorAll(".hm-go")];
    if (!HM.canvas) { HM.canvas = document.createElement("canvas"); HM.canvas.className = "hm-canvas"; HM.canvas.setAttribute("aria-hidden", "true"); }
    HM.core.prepend(HM.canvas);
    if (HM.three) { HM.three.fit(true); HM.three.applyLights(); }
    AIR.mount(HM.stage); updateDroneRect(); AIR.setPanels([]);
    seq = null; Object.assign(st, HM.open ? OPEN_REST : REST);                 // 저장된 열림 상태 그대로
    if (HM.open) requestAnimationFrame(layoutGuides);
    io.observe(HM.stage); stageRO.observe(HM.stage);
    if (!HM.loading && !HM.ready && !HM.failed) setup3d();
    setMode("hovering");
    if (HM.three) draw(performance.now(), 0);
    wake();
  }

  /* 패널 방향 guide: 드론 중심 → 각 카드 가장자리까지 옅은 점선 (열린 상태에서만 보임) */
  function layoutGuides() {
    const stg = HM.stage, svg = stg && stg.querySelector(".hm-guides");
    if (!svg || !HM.core || !HM.panels.length) return;
    const w = stg.clientWidth, h = stg.clientHeight;
    if (!w || !h || getComputedStyle(HM.panels[0]).position !== "absolute") { svg.innerHTML = ""; return; }
    const cx = HM.core.offsetLeft, cy = HM.core.offsetTop, rx = HM.core.offsetWidth * 0.66, ry = HM.core.offsetHeight * 0.62;
    svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
    const rects = [];
    svg.innerHTML = HM.panels.map((p, i) => {
      const px = p.offsetLeft, py = p.offsetTop, dx = px - cx, dy = py - cy, len = Math.hypot(dx, dy) || 1, ux = dx / len, uy = dy / len;
      const tEdge = Math.min(Math.abs(ux) > 1e-3 ? p.offsetWidth / 2 / Math.abs(ux) : Infinity, Math.abs(uy) > 1e-3 ? p.offsetHeight / 2 / Math.abs(uy) : Infinity);
      rects.push({ l: px - p.offsetWidth / 2 - 18, r: px + p.offsetWidth / 2 + 18, t: py - p.offsetHeight / 2 - 18, b: py + p.offsetHeight / 2 + 18 });
      const t0 = 1 / Math.sqrt((ux / rx) ** 2 + (uy / ry) ** 2), t1 = len - tEdge - 10;
      if (t1 - t0 < 16) return "";
      return `<line class="hm-guide-line" data-i="${i}" x1="${(cx + ux * t0).toFixed(1)}" y1="${(cy + uy * t0).toFixed(1)}" x2="${(cx + ux * t1).toFixed(1)}" y2="${(cy + uy * t1).toFixed(1)}"/>`
        + `<circle class="hm-guide-dot" data-i="${i}" cx="${(cx + ux * t1).toFixed(1)}" cy="${(cy + uy * t1).toFixed(1)}" r="2"/>`;
    }).join("");
    AIR.setPanels(rects);
  }

  /* ---------------- 입력(hover) — 부품 안에 위임 등록 ---------------- */
  // 패널에 마우스를 올리면 드론이 그쪽으로 살짝 고개를 돌린다(yaw·pitch) — 드론과 패널이 하나의 3D 인터페이스처럼
  const leanT = { x: 0, y: 0 }, leanS = { x: 0, y: 0 }, leanV = { x: 0, y: 0 };
  function bindHover(root) {
    root.addEventListener("pointerover", (e) => { const c = e.target.closest && e.target.closest(".hm-core");
      if (c && !c.contains(e.relatedTarget)) { hoverTarget = 1; cls("is-hover"); wake(); } });
    root.addEventListener("pointerout", (e) => { const c = e.target.closest && e.target.closest(".hm-core");
      if (c && !c.contains(e.relatedTarget)) { hoverTarget = 0; uncls("is-hover"); ptr.x = ptr.y = 0; } });
    root.addEventListener("pointerover", (e) => { const g = e.target.closest && e.target.closest(".hm-go"); if (!g || !HM.open || !HM.core || HM.phase !== "idle") return;
      const rc = HM.core.getBoundingClientRect(), rg = g.getBoundingClientRect(), dx = rg.left + rg.width / 2 - rc.left - rc.width / 2, dy = rg.top + rg.height / 2 - rc.top - rc.height / 2, l = Math.hypot(dx, dy) || 1;
      leanT.x = dx / l; leanT.y = dy / l; wake(); });
    // 펼치기 전후 모두: 무대 위 마우스 위치를 바라본다(정도 = 패널 hover와 같음, 요청 Q3). 패널 위에서는 위 pointerover가 패널 가운데로
    root.addEventListener("pointermove", (e) => {
      if (!HM.core || !HM.stage || HM.phase !== "idle" || entry || fl) return;
      if (!HM.stage.contains(e.target)) { leanT.x = leanT.y = 0; return; }   // 요약 카드 위 = 정면
      if (e.target.closest(".hm-go")) return;
      const rc = HM.core.getBoundingClientRect(), dx = e.clientX - (rc.left + rc.width / 2), dy = e.clientY - (rc.top + rc.height / 2), l = Math.hypot(dx, dy) || 1;
      const k = Math.min(1, l / (rc.width * 0.9));                            // 드론 가까이에서는 약하게 → 멀어질수록 패널 hover만큼
      leanT.x = dx / l * k; leanT.y = dy / l * k; wake(); });
    root.addEventListener("pointerleave", () => { leanT.x = leanT.y = 0; wake(); });   // 무대를 벗어나면 정면으로
    root.addEventListener("pointermove", (e) => { if (!HM.core || !HM.core.contains(e.target)) return;
      const r = HM.core.getBoundingClientRect();
      ptr.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ptr.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))); });
  }

  /* ---------------- Three.js: static/vendor/three(0.169.0)을 한 번만 읽는다 ----------------
   * Streamlit 정적 파일은 text/plain으로 오므로 글로 받아 Blob 모듈로 불러오고, 부가 모듈의 'three' 이름을 그 주소로 바꾼다. */
  let threeLib = null;
  function loadThree() {
    if (threeLib) return threeLib;
    const inline = window.__ddThreeSrc;                                       // HTML 공유본: 파일 안에 넣어 둔 글(인터넷·서버 없이)
    const get = (f) => (inline && inline[f] != null ? Promise.resolve(inline[f])
      : fetch(G.vendor + f).then((r) => { if (!r.ok) throw new Error(`${f} ${r.status}`); return r.text(); }));
    const url = (src) => URL.createObjectURL(new Blob([src], { type: "text/javascript" }));
    threeLib = get("three.module.js").then((core) => {
      const coreUrl = url(core);
      const addon = (f) => get(f).then((src) => import(url(src.replace(/from\s*['"]three['"]/g, `from '${coreUrl}'`))));
      return Promise.all([import(coreUrl), addon("RoomEnvironment.js"), addon("RoundedBoxGeometry.js"), addon("BufferGeometryUtils.js")]);
    });
    threeLib.catch(() => { threeLib = null; });
    return threeLib;
  }

  /* ---------------- 3D 드론 모델: 실버 폴더블형(코드로 생성) ----------------
   * 착륙 스키드 없는 컴팩트 실루엣. 단위 mm · 위 +Y · 기수 -Z.
   * 얇은 셸 바디(앞쪽이 낮고 좁아지는 형태) · 접이식 암(앞 암은 바디 위쪽, 뒤 암은 아래쪽 힌지 → 뒤 로터가 한 단 낮음)
   * · 전면 3축 짐벌 카메라 · 2날 접이식 프로펠러(비틀림 있는 블레이드). */
  function buildFoldableDrone(THREE, RoundedBoxGeometry, BGU) {
    const V = (x, y, z) => new THREE.Vector3(x, y, z);
    const lin = (r, g, b) => new THREE.Color().setRGB(r, g, b);
    const model = new THREE.Group(), solids = [];
    const add = (geo, mat, parent = model) => { const m = new THREE.Mesh(geo, mat); parent.add(m); solids.push(m); return m; };
    /* 재질 텍스처(캔버스로 생성): 브러시드 금속 roughness(길이 방향 가는 결) · 카본 2×2 능직(twill) */
    const brushed = (rep) => { const c = document.createElement("canvas"); c.width = c.height = 256; const g = c.getContext("2d");
      g.fillStyle = "rgb(0,150,0)"; g.fillRect(0, 0, 256, 256);                      // roughness = G 채널
      for (let i = 0; i < 900; i++) { const x = Math.random() * 256, v = 110 + Math.random() * 80, a = 0.18 + Math.random() * 0.3;
        g.strokeStyle = `rgba(0,${v | 0},0,${a})`; g.lineWidth = 0.4 + Math.random() * 0.9; g.beginPath(); g.moveTo(x, 0); g.lineTo(x + (Math.random() - 0.5) * 3, 256); g.stroke(); }
      const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep, rep); t.anisotropy = 4; return t; };
    const carbon = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d"), n = 8, w = 64 / n;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { const on = ((i + j) >> 1) % 2 === 0;          // 2×2 twill: 대각선으로 이어지는 결
        const gr = on ? g.createLinearGradient(i * w, 0, (i + 1) * w, 0) : g.createLinearGradient(0, j * w, 0, (j + 1) * w);
        gr.addColorStop(0, on ? "#141518" : "#0c0d0f"); gr.addColorStop(0.5, on ? "#2b2e33" : "#1b1d21"); gr.addColorStop(1, on ? "#141518" : "#0c0d0f");
        g.fillStyle = gr; g.fillRect(i * w, j * w, w, w); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(1 / 9, 1 / 9); t.anisotropy = 4; return t; })();
    // 메인 프레임: 폴리싱된 실버 메탈(크롬처럼 번쩍이지 않게) — 브러시드 roughness 결 + 얇은 clearcoat
    const shellMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, vertexColors: true, metalness: 0.84, roughness: 0.3, roughnessMap: brushed(1), clearcoat: 0.55, clearcoatRoughness: 0.16, specularIntensity: 0.6 });
    const silver = new THREE.MeshPhysicalMaterial({ color: lin(0.52, 0.54, 0.57), metalness: 0.84, roughness: 0.3, roughnessMap: brushed(1 / 60), clearcoat: 0.45, clearcoatRoughness: 0.18, specularIntensity: 0.6 });
    const camShell = new THREE.MeshPhysicalMaterial({ color: lin(0.24, 0.25, 0.27), metalness: 0.8, roughness: 0.34, clearcoat: 0.5, clearcoatRoughness: 0.2, specularIntensity: 0.6 });   // 건메탈 짐벌 헤드
    const graphite = new THREE.MeshStandardMaterial({ color: lin(0.035, 0.037, 0.04), metalness: 0.4, roughness: 0.42 });
    const motorMat = new THREE.MeshStandardMaterial({ color: lin(0.06, 0.063, 0.068), metalness: 0.85, roughness: 0.3 });
    const glass = new THREE.MeshPhysicalMaterial({ color: 0x010203, metalness: 0.2, roughness: 0.06, clearcoat: 1, clearcoatRoughness: 0.03, specularIntensity: 1 });
    const ringMat = new THREE.MeshStandardMaterial({ color: lin(0.55, 0.57, 0.6), metalness: 0.92, roughness: 0.22 });
    // 프로펠러: 어두운 카본 복합재(능직 결). 얇은 날개를 비스듬히 볼 때 반사로 하얗게 뜨지 않도록 clearcoat 없이 환경 반사·specular는 낮게
    const bladeMat = new THREE.MeshPhysicalMaterial({ color: 0xffffff, map: carbon, metalness: 0.1, roughness: 0.48, specularIntensity: 0.22, envMapIntensity: 0.22, side: THREE.DoubleSide });   // specular를 낮춰 역광(rim)에서도 은색으로 뜨지 않게

    /* 바디: 구를 super-ellipsoid로 변형 → 앞은 좁고 낮게, 뒤는 넓고 평평하게. 아랫면·배터리 커버는 vertex color로 한 톤씩 어둡게 */
    const L = 104, smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };
    const se = (c, e) => Math.sign(c) * Math.pow(Math.abs(c), e);
    const halfW = (t) => 47 * (0.56 + 0.44 * Math.sin(Math.PI * (0.1 + 0.75 * t)));
    const topH = (t) => 21 * (0.55 + 0.45 * smooth(0, 0.6, t)), botH = (t) => 14 * (0.7 + 0.3 * smooth(0, 0.5, t));
    let fg = new THREE.SphereGeometry(1, 112, 72);
    fg.deleteAttribute("normal"); fg.deleteAttribute("uv"); fg = BGU.mergeVertices(fg);
    const fp = fg.attributes.position, col = new Float32Array(fp.count * 3), uv = new Float32Array(fp.count * 2), base = [0.58, 0.60, 0.63];
    for (let i = 0; i < fp.count; i++) {
      const x = se(fp.getX(i), 0.5), y = se(fp.getY(i), 0.66), z = se(fp.getZ(i), 0.62), t = (z + 1) / 2;
      const Y = (y > 0 ? y * topH(t) : y * botH(t)) - Math.pow(1 - t, 2.2) * 7;
      fp.setXYZ(i, x * halfW(t), Y, z * L);
      const belly = smooth(-2, -8, Y), cover = smooth(0.46, 0.52, t) * smooth(0.55, 0.75, y) * (1 - smooth(0.93, 0.99, t));
      const k = (1 - belly * 0.6) * (1 - cover * 0.16);
      col[i * 3] = base[0] * k; col[i * 3 + 1] = base[1] * k; col[i * 3 + 2] = base[2] * k;
      uv[i * 2] = fp.getX(i) / 96 + 0.5; uv[i * 2 + 1] = fp.getZ(i) / 220 + 0.5;   // 위에서 투영한 UV: 브러시드 결이 기체 길이 방향
    }
    fg.setAttribute("color", new THREE.BufferAttribute(col, 3)); fg.setAttribute("uv", new THREE.BufferAttribute(uv, 2)); fg.computeVertexNormals();
    const body = add(fg, shellMat);
    model.updateMatrixWorld(true);
    // 바디 표면 위 한 점: 바깥에서 안쪽으로 ray
    const rc = new THREE.Raycaster();
    const onBody = (from, dir) => { rc.set(from, dir.normalize()); const h = rc.intersectObject(body, false)[0]; return h ? { p: h.point, n: h.face.normal.clone() } : null; };
    const stick = (geo, mat, hit, lift = 0) => { const m = add(geo, mat); m.position.copy(hit.p).addScaledVector(hit.n, lift);
      m.quaternion.setFromUnitVectors(V(0, 0, 1), hit.n); return m; };
    // 전면·후면 장애물 센서(어두운 유리 한 쌍)
    [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([sx, sz]) => {
      const h = onBody(V(sx * 11, sz < 0 ? 0 : 2, sz * 200), V(0, 0, -sz)); if (!h) return;
      const s = stick(new THREE.SphereGeometry(1, 24, 16), glass, h, -0.4); s.scale.set(sz < 0 ? 4.6 : 3.4, sz < 0 ? 3.4 : 2.6, 1.6);
    });
    // 후면 배기 슬롯(얇은 그래파이트 선)
    [-1, 1].forEach((sx) => { const r = onBody(V(sx * 20, -5, 200), V(0, 0, -1)); if (r) stick(new RoundedBoxGeometry(14, 2, 1.6, 2, 0.8), graphite, r, -0.25); });

    /* 접이식 암: 위에서 본 사다리꼴 판(둥근 모서리), 루트에 힌지. 끝에 모터 마운트 */
    const armGeo = (len, w0, w1, th) => { const s = new THREE.Shape();
      s.moveTo(0, -w0 / 2); s.lineTo(len, -w1 / 2); s.lineTo(len, w1 / 2); s.lineTo(0, w0 / 2); s.closePath();
      const g = new THREE.ExtrudeGeometry(s, { depth: th - 3, bevelEnabled: true, bevelThickness: 1.5, bevelSize: 1.6, bevelSegments: 4, curveSegments: 4 });
      g.rotateX(-Math.PI / 2); g.translate(0, -(th - 3) / 2, 0); g.computeVertexNormals(); return g; };
    const R = 92;                                                               // 프로펠러 반경
    const bladeGeo = (dir) => {                                               // 앞전(lead)이 회전 방향을 향하고, 뿌리에서 끝으로 비틀림이 줄어드는 2날 블레이드
      const tr = [[6, -3.2], [14, -5.4], [30, -6.6], [52, -5.6], [74, -4.2], [90, -2.6]], ld = [[90, 3.4], [74, 6.2], [52, 8.4], [30, 9.4], [14, 7.4], [6, 3.6]];
      const s = new THREE.Shape(); s.moveTo(tr[0][0], tr[0][1] * dir);
      s.splineThru(tr.slice(1).map(([u, v]) => new THREE.Vector2(u, v * dir)));
      s.quadraticCurveTo(R + 1.5, 0.6 * dir, ld[0][0], ld[0][1] * dir);
      s.splineThru(ld.slice(1).map(([u, v]) => new THREE.Vector2(u, v * dir))); s.closePath();
      let g = new THREE.ExtrudeGeometry(s, { depth: 0.7, bevelEnabled: true, bevelThickness: 0.35, bevelSize: 0.45, bevelSegments: 2, curveSegments: 20 });
      g.rotateX(-Math.PI / 2); g.translate(0, -0.35, 0);
      const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) { const u = p.getX(i), y = p.getY(i), l = -p.getZ(i) * dir, th = (22 - 13 * Math.min(1, u / R)) * Math.PI / 180;
        p.setXYZ(i, u, y * Math.cos(th) + l * Math.sin(th) + u * 0.03, -(l * Math.cos(th) - y * Math.sin(th)) * dir); }
      const g2 = g.clone(); g2.rotateY(Math.PI);
      g = BGU.mergeGeometries([g, g2]); g.computeVertexNormals(); return g; };
    const discTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 256;
      const g = c.getContext("2d"), grd = g.createRadialGradient(128, 128, 0, 128, 128, 128);
      grd.addColorStop(0, "rgba(255,255,255,0)"); grd.addColorStop(0.55, "rgba(255,255,255,.03)"); grd.addColorStop(0.9, "rgba(255,255,255,.10)");
      grd.addColorStop(0.98, "rgba(255,255,255,.05)"); grd.addColorStop(1, "rgba(255,255,255,0)"); g.fillStyle = grd; g.fillRect(0, 0, 256, 256);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const ARMS = [                                                            // root: 바디 안쪽 힌지 / tip: 모터 축
      { root: V(-30, 8, -44), tip: V(-110, 12, -88), w: [19, 13], th: 9 }, { root: V(30, 8, -44), tip: V(110, 12, -88), w: [19, 13], th: 9 },
      { root: V(-28, -7, 48), tip: V(-106, -2, 100), w: [18, 12.5], th: 8.5 }, { root: V(28, -7, 48), tip: V(106, -2, 100), w: [18, 12.5], th: 8.5 },
    ];
    const rotors = [], motors = [];
    ARMS.forEach((a) => {
      const d = a.tip.clone().sub(a.root), len = d.length(), arm = add(armGeo(len, a.w[0], a.w[1], a.th), silver);
      arm.position.copy(a.root); arm.quaternion.setFromUnitVectors(V(1, 0, 0), d.normalize());
      const hinge = add(new THREE.CylinderGeometry(6.2, 6.2, a.th + 3, 24), graphite); hinge.position.copy(a.root).addScaledVector(d, 15);
      const T = a.tip, mountH = 10, y0 = T.y - mountH / 2;
      const mount = add(new THREE.CylinderGeometry(13, 14.5, mountH, 40), silver); mount.position.set(T.x, T.y, T.z);
      const bell = add(new THREE.CylinderGeometry(12, 12.4, 10, 40), motorMat); bell.position.set(T.x, y0 + mountH + 5, T.z);
      const band = add(new THREE.TorusGeometry(12.3, 0.55, 8, 48), ringMat); band.rotation.x = Math.PI / 2; band.position.set(T.x, y0 + mountH + 7.2, T.z);
      const propY = y0 + mountH + 10 + 2.2, axis = V(T.x, propY, T.z), dir = T.x * T.z > 0 ? 1 : -1;
      const pivot = new THREE.Group(); pivot.position.copy(axis); model.add(pivot);
      const geo = bladeGeo(dir), blade = new THREE.Mesh(geo, bladeMat); pivot.add(blade);
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(5.6, 6.4, 4.2, 32), graphite); hub.position.y = 0.4; pivot.add(hub);
      const cap = new THREE.Mesh(new THREE.SphereGeometry(4.2, 24, 12, 0, Math.PI * 2, 0, Math.PI / 2), motorMat); cap.position.y = 2.4; cap.scale.y = 0.55; pivot.add(cap);
      const ghosts = [];
      [[0.24, 0.30], [0.48, 0.12]].forEach(([ang, op]) => { const g = new THREE.Group(); g.rotation.y = -dir * ang; ghosts.push(g);
        g.add(new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color: 0x0a0a0a, roughness: 0.7, envMapIntensity: 0.2, transparent: true, opacity: op, depthWrite: false, side: THREE.DoubleSide }))); pivot.add(g); });
      const disc = new THREE.Mesh(new THREE.CircleGeometry(R * 0.99, 64),
        new THREE.MeshBasicMaterial({ map: discTex, color: 0xb8bcc2, transparent: true, opacity: 0.5, depthWrite: false, side: THREE.DoubleSide, toneMapped: false }));
      disc.rotation.x = -Math.PI / 2; disc.position.copy(axis); model.add(disc);
      rotors.push({ pivot, disc, ghosts, dir, axis, angle: Math.random() * Math.PI });
      motors.push({ axis, dir, base: V(T.x, y0, T.z), arm: a.root.clone(), r: 14.1 });   // base: 모터 마운트 하단 중심 · r: 하단 둘레 반경(표면)
    });

    /* 전면 3축 짐벌: 바디 아래 요크 → 측면 롤 암 → 카메라 헤드(렌즈 정면 -Z) */
    const nose = onBody(V(0, -6, -200), V(0, 0, 1)), nz = nose ? nose.p.z : -L;
    const yoke = add(new RoundedBoxGeometry(24, 7, 20, 3, 2.5), graphite); yoke.position.set(0, -14, nz + 13);
    const roll = add(new RoundedBoxGeometry(4.5, 20, 15, 3, 2), graphite); roll.position.set(15.5, -20, nz + 2);
    const head = add(new RoundedBoxGeometry(27, 22, 22, 4, 6), camShell); head.position.set(0, -25, nz - 2);
    const lensZ = nz - 13.2;
    const barrel = add(new THREE.CylinderGeometry(9.2, 9.6, 3, 40), graphite); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, -25, lensZ + 0.6);
    const lens = add(new THREE.SphereGeometry(7.6, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass); lens.rotation.x = -Math.PI / 2; lens.scale.y = 0.32; lens.position.set(0, -25, lensZ - 0.6);
    const lensRing = add(new THREE.TorusGeometry(8.5, 0.8, 12, 48), ringMat); lensRing.position.set(0, -25, lensZ - 0.9);

    return { model, rotors, motors, navTargets: solids };
  }

  /* ---------------- 3D (한 번만 만든다) ---------------- */
  async function setup3d() {
    HM.loading = true;
    const canvas = HM.canvas;
    const [THREE, { RoomEnvironment }, { RoundedBoxGeometry }, BGU] = await loadThree();
    const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: "high-performance" });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 1.0;
    const scene = new THREE.Scene();
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture; pmrem.dispose();
    scene.environmentIntensity = 0.6;
    scene.add(new THREE.HemisphereLight(0xffffff, 0x202020, 0.32));
    const key = new THREE.DirectionalLight(0xffffff, 0.95); key.position.set(-2.2, 3.4, 3.0); scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35); fill.position.set(3.0, 0.8, 2.0); scene.add(fill);
    const rim = new THREE.DirectionalLight(0xffffff, 1.1); rim.position.set(0.5, 2.2, -4.0); scene.add(rim);

    const { model, rotors, motors, navTargets } = buildFoldableDrone(THREE, RoundedBoxGeometry, BGU);
    model.updateMatrixWorld(true);
    const boxOf = (o) => new THREE.Box3().setFromObject(o);
    // 모터 하부등 4개: 회전 방향 기준 색(CW 적색 / CCW 녹색, 라이트 테마는 백색) — 색은 .hm-stage의 CSS 변수에서 읽는다
    const glowTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 64;
      const g = c.getContext("2d"), grd = g.createRadialGradient(32, 32, 0, 32, 32, 32);
      grd.addColorStop(0, "rgba(255,255,255,1)"); grd.addColorStop(0.22, "rgba(255,255,255,.55)"); grd.addColorStop(1, "rgba(255,255,255,0)");
      g.fillStyle = grd; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
    const navLights = motors.map((m) => {
      const lamp = new THREE.Mesh(new THREE.SphereGeometry(2.2, 16, 12), new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false }));
      const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: 0xffffff, transparent: true, opacity: 0.55, depthWrite: false, blending: THREE.AdditiveBlending, toneMapped: false }));
      glow.scale.setScalar(16); model.add(lamp); model.add(glow);
      return { spin: m.dir > 0 ? "ccw" : "cw", rear: m.axis.z > 0, axis: m.axis, base: m.base, arm: m.arm, r: m.r, lamp, glow };
    });

    const box = boxOf(model), size = box.getSize(new THREE.Vector3()), ctr = box.getCenter(new THREE.Vector3());
    const unit = 1 / Math.max(size.x, size.z), norm = new THREE.Group();
    model.position.sub(ctr); norm.add(model); norm.scale.setScalar(unit);
    // transform 계층: rig = 비행 위치·깊이·크기 / look = 시선(yaw·pitch: 패널 바라보기·비행 방향) / att = 자세(roll: idle 자세제어·bank) / yawG = 기본 3/4 각도
    // 각 층이 자기 회전만 맡아 서로 덮어쓰지 않는다
    const rig = new THREE.Group(), look = new THREE.Group(), att = new THREE.Group(), yawG = new THREE.Group();
    look.rotation.order = "YXZ";
    yawG.rotation.y = Math.PI - 0.5; yawG.add(norm); att.add(yawG); look.add(att); rig.add(look); scene.add(rig);
    const sc = document.createElement("canvas"); sc.width = sc.height = 128;
    const g2 = sc.getContext("2d"), grd2 = g2.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd2.addColorStop(0, "rgba(0,0,0,.30)"); grd2.addColorStop(0.45, "rgba(0,0,0,.14)"); grd2.addColorStop(1, "rgba(0,0,0,0)"); g2.fillStyle = grd2; g2.fillRect(0, 0, 128, 128);
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(0.82, 0.82), new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(sc), transparent: true, depthWrite: false, toneMapped: false }));
    shadow.rotation.x = -Math.PI / 2; shadow.position.y = -size.y * unit / 2 - 0.09; scene.add(shadow);

    const camera = new THREE.PerspectiveCamera(24, 1, 0.01, 50), elev = 0.24, halfH = size.y * unit / 2;
    let lastW = 0, lastH = 0;
    const three = { renderer, scene, camera, rig, look, att, rotors, shadow, pxToWorld: 0.003, flying: false };
    function fit(force) {
      if (three.flying) return false;
      const w = canvas.clientWidth, h = canvas.clientHeight;
      if (!w || !h || (!force && w === lastW && h === lastH)) return false;
      lastW = w; lastH = h; renderer.setSize(w, h, false); camera.aspect = w / h;
      const vfov = camera.fov * Math.PI / 180, hfov = 2 * Math.atan(Math.tan(vfov / 2) * camera.aspect);
      const dist = Math.max(0.5 / 0.58 / Math.tan(hfov / 2), (halfH + 0.08) / 0.6 / Math.tan(vfov / 2));
      camera.position.set(0, Math.sin(elev) * dist, Math.cos(elev) * dist); camera.lookAt(0, -0.01, 0); camera.updateProjectionMatrix();
      three.pxToWorld = (2 * dist * Math.tan(vfov / 2)) / h;
      three.D = dist; three.camDir = camera.position.clone().normalize();     // 깊이 z는 시선 축을 따라 → 화면 위치는 그대로, 원근으로 크기만 변함
      return true;
    }
    // 항법등: 각 모터 마운트 하단 둘레 표면에 붙인다(모터축 기준 계산 → 떠 보이지 않음). 방향은 카메라 쪽, 암과 겹치면 암 옆(±60°) 중 카메라에 가까운 쪽. 카메라가 정해진 뒤 1회
    function placeNavLights() {
      scene.updateMatrixWorld(true);
      const camL = model.worldToLocal(camera.position.clone()), up = new THREE.Vector3(0, 1, 0);
      navLights.forEach((l) => { const b = l.base;
        const toCam = new THREE.Vector3(camL.x - b.x, 0, camL.z - b.z).normalize(), toArm = new THREE.Vector3(l.arm.x - b.x, 0, l.arm.z - b.z).normalize();
        let dir = toCam;
        if (toCam.dot(toArm) > 0.55) { const c1 = toArm.clone().applyAxisAngle(up, 1.05), c2 = toArm.clone().applyAxisAngle(up, -1.05); dir = c1.dot(toCam) >= c2.dot(toCam) ? c1 : c2; }
        const pos = new THREE.Vector3(b.x + dir.x * l.r, b.y + 2.4, b.z + dir.z * l.r);
        l.lamp.position.copy(pos); l.glow.position.copy(pos).addScaledVector(dir, 1.2); });
    }
    three.fit = fit;
    three.applyLights = () => { const cs = getComputedStyle(HM.stage || document.documentElement);   // 테마별 값은 토큰(--hm-env·--hm-motor-*)
      scene.environmentIntensity = parseFloat(cs.getPropertyValue("--hm-env")) || 0.6;           // 라이트: 프레임 표면 반사를 은은하게 더
      navLights.forEach((l) => { const v = cs.getPropertyValue(l.spin === "cw" ? "--hm-motor-cw" : "--hm-motor-ccw").trim() || "#ffffff";
        l.lamp.material.color.setStyle(v); l.glow.material.color.setStyle(v); }); };
    // 진입·복귀 비행용 화면 모드: canvas를 화면(viewport) 전체 고정 레이어로 옮기고, 매 프레임 드론 버튼 위치에 맞춰 camera view offset을 갱신
    //   → 대시보드 화면 바깥에서 날아들어 Hero 안 호버 자리로 들어온다(스크롤해도 도착 지점이 맞음). viewOut: 원래 자리(드론 버튼 안)로 복귀
    const CANVAS_K = 2.35;                                                    // .hm-canvas = 드론 버튼의 235%
    three.track = () => { if (!three.staged || !HM.core || !HM.core.isConnected) return; const cr = HM.core.getBoundingClientRect(), w = cr.width * CANVAS_K, h = cr.height * CANVAS_K;
      if (!w || !h) return; camera.aspect = w / h;
      const cv = canvas.getBoundingClientRect();   // 화면 px(비율 확대 반영)
      camera.setViewOffset(w, h, -(cr.left + cr.width / 2 - w / 2), -(cr.top + cr.height / 2 - h / 2), cv.width || window.innerWidth, cv.height || window.innerHeight); };
    three.viewIn = () => { const cr = HM.core && HM.core.getBoundingClientRect(); if (!cr || !cr.width) return null;
      const vw = document.documentElement.clientWidth, vh = window.innerHeight;
      three.flying = three.staged = true; document.body.appendChild(canvas);
      const z = ZF();                                                    // 확대 중에는 CSS 크기를 배율로 나눠 화면을 꼭 채움
      canvas.style.cssText = `position:fixed;left:0;top:0;width:${vw / z}px;height:${vh / z}px;transform:none;opacity:1;z-index:45;pointer-events:none`;
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(vw / z, vh / z, false); three.track();
      return { cx: cr.left + cr.width / 2, cy: cr.top + cr.height / 2, vw, vh, canvasW: cr.width * CANVAS_K }; };
    three.viewOut = () => { if (!three.staged) return; three.staged = three.flying = false; canvas.style.cssText = ""; camera.clearViewOffset();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); lastW = lastH = 0;
      if (HM.core && HM.core.isConnected) HM.core.prepend(canvas); else canvas.remove(); fit(true); };
    HM.three = three;
    fit(true); placeNavLights(); three.applyLights();
    new ResizeObserver(() => { if (fit()) draw(performance.now(), 0); }).observe(canvas);
    if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
    draw(performance.now(), 0);
    await new Promise((r) => requestAnimationFrame(() => r()));
    draw(performance.now(), 0);
    HM.ready = true; HM.loading = false;
    if (HM.stage) HM.stage.classList.add("is-3d");
    tryEntry();
    wake();
  }

  /* ---------------- 루프: Home이 보일 때만 ---------------- */
  let raf = 0, last = 0, inView = true, visible = !document.hidden;
  function updateVisible() { visible = inView && !document.hidden; visible ? wake() : sleep(); }
  function wake() { if (!raf && (fl || (visible && HM.stage))) { last = performance.now(); raf = requestAnimationFrame(frame); } }
  function sleep() { if (raf) cancelAnimationFrame(raf); raf = 0; }
  document.addEventListener("visibilitychange", updateVisible);
  /* idle sway(호버링 자세 보정): 좌우로 아주 조금 이동하고, 그 가속도 방향으로 미세하게 roll(가속할 때 그쪽으로 기울고 멈출 때 반대로).
   * 주기가 다른 두 성분(4.3s · 7.1s)을 겹쳐 기계적 왕복처럼 보이지 않게 한다. 최대 약 ±2.8px · ±0.5°. */
  let swayW = 1;                                                              // 0~1: idle에서만 1, 비행·전환이 시작되면 부드럽게 0
  /* 진입·복귀 비행(3D) — 3단계: ① 곡선 하강(화면 경로 3차 베지어 + 깊이 z: 멀리서 작게 → 가까워지며 커짐) → ② settling(호버 자리에서 잠깐 정지·미세 침하)
   *   → ③ approaching(카메라 쪽으로 한 번 더 다가와 최종 호버 깊이에 정착). 자세(yaw·bank·pitch)는 경로의 속도·가속도에서 계산.
   *   그림자·바닥 hover zone·ring도 단계에 맞춰 짙어지고 커진다(ring은 ③에서 나타남).
   * 첫 진입: 2시 방향(오른쪽 위)에서 하강 2.4s + 정지 0.42s + 접근 0.95s (빈 Hero 0.45s 뒤).
   * Home 복귀: 마지막으로 누른 패널이 있는 방향(지금 Home에서 그 패널의 실제 위치로 다시 계산)에서 하강 2.0s + 접근 0.5s.
   *   사이드바 등으로 나갔다 오면 2시 방향. 방향은 Home을 떠나는 순간에만 정하고, 다른 화면에서 다시 그려져도 유지된다.
   * 진입 중 드론 클릭·움직임 멈춤·다시 그리기(테마·이동) → 즉시 도착. reduced motion·움직임 멈춤·3D 미사용이면 생략. */
  let entry = null;
  function startEntry(kind) {
    if (reduce.matches || !G.motion || !HM.three || !HM.stage || HM.open || HM.phase !== "idle") return;
    const g = HM.three.viewIn(); if (!g) return;
    const first = kind === "first";
    let d = { ux: 0.8, uy: -0.6 };                                            // 2시 방향
    if (!first) { const pEl = HM.lastPanel != null ? HM.panels[HM.lastPanel] : null;
      if (pEl && HM.core) { const rc = HM.core.getBoundingClientRect(), rp = pEl.getBoundingClientRect();
        const dx = rp.left + rp.width / 2 - rc.left - rc.width / 2, dy = rp.top + rp.height / 2 - rc.top - rc.height / 2;
        if (Math.hypot(dx, dy) > 1) d = { ux: dx, uy: dy }; }
      else if (HM.lastDir) d = HM.lastDir; }
    const n = Math.hypot(d.ux, d.uy) || 1, ux = d.ux / n, uy = d.uy / n;
    const tx = ux > 1e-3 ? (g.vw - g.cx) / ux : ux < -1e-3 ? -g.cx / ux : Infinity, ty = uy > 1e-3 ? (g.vh - g.cy) / uy : uy < -1e-3 ? -g.cy / uy : Infinity;
    const L = Math.min(tx, ty) + g.canvasW * 0.22;                            // 대시보드 화면(viewport) 경계 밖에서 시작
    let nx = -uy, ny = ux; if (ny < 0 || (Math.abs(ny) < 1e-3 && nx < 0)) { nx = -nx; ny = -ny; }   // 곡선은 아래쪽(또는 오른쪽)으로 불룩 → 내려오며 선회
    const S0 = { x: ux * L, y: uy * L }, bow = first ? 0.38 : 0.3;            // 첫 진입은 곡선을 더 크게
    entry = { kind, t0: performance.now() + (first ? 450 : 120), S0,
      C1: { x: S0.x * 0.5 + nx * L * bow, y: S0.y * 0.5 + ny * L * bow }, C2: { x: S0.x * 0.1 + nx * L * bow * 0.4, y: S0.y * 0.1 + ny * L * bow * 0.4 },
      ...(first ? { z0: -3.2, zA: -0.12, d1: 2400, hold: 420, d2: 950 } : { z0: -1.8, zA: REST_Z - 0.14, d1: 2000, hold: 0, d2: 500 }) };
    entry.dur = entry.d1 + entry.hold + entry.d2;
    setMode(first ? "entering" : "returningHome"); cls("is-arriving");
  }
  function entryPose(E, t) {                                                  // t(ms, t0 기준) → 화면 오프셋(px) · 깊이 z · 진행 s(0~1) · 단계
    if (t < E.d1) { const k = clamp01(t / E.d1), s = 1 - Math.pow(1 - k, 2.4), sz = 1 - Math.pow(1 - k, 1.7);
      return { x: bez(E.S0.x, E.C1.x, E.C2.x, 0, s), y: bez(E.S0.y, E.C1.y, E.C2.y, 0, s), z: E.z0 + (E.zA - E.z0) * sz, s: 0.85 * sz, k, ph: "descent" }; }
    if (t < E.d1 + E.hold) { const h = (t - E.d1) / E.hold;                  // 도착 후 잠깐 정지: 2px 정도 가라앉았다 회복(settle)
      return { x: 0, y: 2 * Math.sin(Math.PI * h), z: E.zA, s: 0.85, k: 1, ph: "settling" }; }
    const a = E.d2 ? clamp01((t - E.d1 - E.hold) / E.d2) : 1, e = inOutSine(a);   // 카메라 쪽으로 한 번 더 다가옴(살짝 떠오르며)
    return { x: 0, y: -2.5 * Math.sin(Math.PI * a), z: E.zA + (REST_Z - E.zA) * e, s: 0.85 + 0.15 * e, k: 1, ph: "approaching" };
  }
  function finishEntry() { if (!entry) return; entry = null; if (HM.three) HM.three.viewOut(); uncls("is-arriving"); setMode("hovering"); }
  /* 탐색 경로 열고 닫기 반응(요청 AA8, 신호 'dd-roadmap'은 components/shell.py 단추가 보냄)
   * 열림 = 오른쪽에서 들어온 패널에 한 대 맞은 듯 왼쪽으로 밀렸다가 휘청이며 제자리로(덜 감쇠된 스프링 + 왼쪽 충격).
   * 닫힘 = 무대가 넓어지는 동안 원래 화면 위치에 남아 있다가 조금 늦게 가운데를 찾아감(따라가는 스프링).
   * 자세: 밀리는 속도 방향으로 기울고(roll) 고개를 조금 돌림(yaw). 움직임 멈춤·동작 줄이기·비행·메뉴 전환 중에는 없음 */
  const BUMP = { open: { v: -900, w: 6.5, z: 0.32 }, close: { w: 4.2, z: 0.85, track: 450 } };
  const bump = { x: 0, v: 0, w: 0, z: 0, track: 0, cx: 0 };
  const coreCx = () => { const r = HM.core.getBoundingClientRect(); return r.left + r.width / 2; };
  window.addEventListener("dd-roadmap", (e) => {
    if (!HM.core || !HM.core.isConnected || reduce.matches || !G.motion || entry || fl || HM.phase !== "idle") return;
    const P = e.detail.open ? BUMP.open : BUMP.close;
    bump.w = P.w; bump.z = P.z;
    if (e.detail.open) bump.v += P.v;
    else { bump.track = performance.now() + P.track; bump.cx = coreCx(); }
    wake();
  });
  function stepBump(now, dt) {
    if (bump.track) { const c = coreCx(); bump.x -= (c - bump.cx) / ZF(); bump.cx = c; if (now > bump.track) bump.track = 0; }   // 무대 가운데가 움직인 만큼 반대로 → 화면 위치 유지
    if (!bump.w) return;
    const ds = Math.min(0.05, dt || 0);
    bump.v += (-bump.w * bump.w * bump.x - 2 * bump.z * bump.w * bump.v) * ds; bump.x += bump.v * ds;
    if (!bump.track && Math.abs(bump.x) < 0.3 && Math.abs(bump.v) < 3) bump.x = bump.v = bump.w = 0;
  }
  function idleSway(t) {
    const w1 = 2 * Math.PI / 4.3, w2 = 2 * Math.PI / 7.1, A1 = 2.0, A2 = 0.8, s1 = Math.sin(w1 * t + 0.4), s2 = Math.sin(w2 * t + 2.1);
    const acc = A1 * w1 * w1 * s1 + A2 * w2 * w2 * s2;                         // = -(가로 가속도)
    return { x: A1 * s1 + A2 * s2, roll: 0.5 * acc / (A1 * w1 * w1 + A2 * w2 * w2) };
  }
  function draw(now, dt) {
    const rm = reduce.matches, motionOff = !G.motion;
    const t = now / 1000, amp = motionOff ? 0 : rm ? 0.25 : 1;
    // 위아래 bob은 거의 느껴지지 않게(2.5 → 1px), pitch·기본 roll도 줄여 좌우 sway가 주가 되게
    const idleY = Math.sin(t * 2 * Math.PI / 4.8) * 1.0 * amp, idlePitch = Math.sin(t * 2 * Math.PI / 5.6) * 0.2 * amp, idleRoll = Math.sin(t * 2 * Math.PI / 6.4 + 1.3) * 0.15 * amp;
    // idle 자세제어 roll: 4.6s 주기 ±1.6° + 2.9s 주기 ±0.65°(위상차) → 최대 약 ±2.2°, 한쪽으로 기울 때와 돌아올 때 속도가 달라 기계적 왕복이 아님.
    // 호버(idle)에서만 1, 비행·전환 중엔 swayW로 0(비행은 bank가 대신), 패널을 바라보는 동안은 panel-look bank가 우선(최대 70% 감쇠). reduced motion·움직임 멈춤: 0
    const attRollRaw = 1.6 * Math.sin(t * 2 * Math.PI / 4.6) + 0.65 * Math.sin(t * 2 * Math.PI / 2.9 + 1.1);
    swayW += ((fl || entry || HM.phase !== "idle" ? 0 : 1) - swayW) * (1 - Math.exp(-(dt || 0) * 6));
    const sw = idleSway(t), swK = (motionOff || rm ? 0 : 1) * swayW, swX = sw.x * swK, swR = sw.roll * swK;   // reduced motion·움직임 멈춤: sway 없음
    let eX = 0, eY = 0, eZ = 0, eYaw = 0, eR = 0, eP = 0, eScale = 1, eShadow = 1, focusK = 1, focusX = 0, focusS = 1;   // 진입·복귀 비행
    if (entry) { if (HM.three) HM.three.track();                             // 화면 고정 레이어: 드론 버튼 위치를 따라 view offset 갱신
      const E = entry, t1 = clampv(now - E.t0, 0, E.dur), hh = 40, ta = Math.max(0, t1 - hh), tb = Math.min(E.dur, t1 + hh);
      const p = entryPose(E, t1), pa = entryPose(E, ta), pb = entryPose(E, tb), sd = Math.max(1e-3, (tb - ta) / 1000), hs = hh / 1000;
      const vx = (pb.x - pa.x) / sd, vy = (pb.y - pa.y) / sd, vz = (pb.z - pa.z) / sd, ax = ta < t1 && tb > t1 ? (pb.x - 2 * p.x + pa.x) / (hs * hs) : 0;
      const mode = p.ph === "descent" ? (E.kind === "first" ? "entering" : "returningHome") : p.ph;
      if (HM.mode !== mode) { setMode(mode); if (mode === "approaching") uncls("is-arriving"); }   // 추가 접근과 함께 ring이 나타남
      eX = p.x / ZF(); eY = p.y / ZF(); eZ = p.z - REST_Z;   // 경로는 화면 px → 확대 전 px
      eYaw = clampv(vx * 0.03, -24, 24);                                      // 진행 방향으로 기수를 돌림(선회)
      eR = clampv(-(vx * 0.013 + ax * 0.0014), -14, 14);                       // 선회·감속 bank
      eP = clampv(vz * 3, -8, 8) + clampv(vy * 0.005, -3, 3);                  // 다가올 때·내려올 때 앞으로 숙임
      eScale = 0.9 + 0.1 * Math.min(1, p.s / 0.85);                           // 원근 위에 약간의 크기 변화를 더해 접근감 보강
      eShadow = Math.pow(clamp01((p.k - 0.4) / 0.6), 2) * (0.8 + 0.2 * clamp01((p.s - 0.85) / 0.15)); focusK = 0.15 + 0.85 * eShadow; focusX = eX; focusS = 0.5 + 0.5 * p.s;   // 그림자·hover zone은 하강·접근에 맞춰 짙어지고 커짐
      if (now - E.t0 >= E.dur) finishEntry(); }
    if (fl) { if (HM.three) HM.three.track();                                // 패널 쪽 출발 비행(요청 P1): 진입 비행처럼 속도·가속도로 자세를 정한다
      const F = fl, t1 = clampv(now - F.t0, 0, F.dur), hh = 40, ta = Math.max(0, t1 - hh), tb = Math.min(F.dur, t1 + hh);
      const p = flightPose(F, t1), pa = flightPose(F, ta), pb = flightPose(F, tb), sd = Math.max(1e-3, (tb - ta) / 1000), hs = hh / 1000;
      const vx = (pb.x - pa.x) / sd, vy = (pb.y - pa.y) / sd, vz = (pb.z - pa.z) / sd, ax = ta < t1 && tb > t1 ? (pb.x - 2 * p.x + pa.x) / (hs * hs) : 0;
      eX = p.x / ZF(); eY = p.y / ZF(); eZ = p.z - st.z;
      eYaw = clampv(vx * 0.03 + F.ux * 10 * clamp01(t1 / F.turn), -24, 24);  // 출발 전 그쪽으로 고개를 돌리고, 날며 진행 방향으로
      eR = clampv(-(vx * 0.013 + ax * 0.0014), -14, 14);
      eP = clampv(vz * 3, -8, 8) + clampv(vy * 0.005, -3, 3);
      eShadow = 1 - p.s; focusK = 0.15 + 0.85 * eShadow; focusX = eX;          // 멀어질수록 그림자·바닥 원이 옅어짐
      if (now - F.t0 >= F.dur) finishFlight(); }
    { const w = 7, ds = Math.min(0.05, dt || 0);                             // 패널 hover 시선: 임계 감쇠 스프링 → 시작·끝 모두 부드러운 ease-in-out, 튐 없음
      for (const c of ["x", "y"]) { leanV[c] += (w * w * (leanT[c] - leanS[c]) - 2 * w * leanV[c]) * ds; leanS[c] += leanV[c] * ds; } }
    // 패널의 실제 방향 벡터(lx, ly)로 자세를 정한다: yaw(좌우로 돌아봄) · pitch(위는 올려다보고 아래는 내려다봄) · bank(좌우 패널 쪽으로 기울기) · 그쪽으로 몇 px 이동
    // panel-look bank: 좌우 패널일수록(|lx|) 그쪽으로 기울고, 위·아래 패널은 roll 대신 pitch·yaw 중심
    const lx = leanS.x, ly = leanS.y, lYaw = lx * 16, lPitch = ly * (ly < 0 ? 8 : 7), lRoll = -lx * Math.abs(lx) * 5.5, lX = lx * 6, lY = ly * 4;
    const attRoll = attRollRaw * swK * (1 - 0.7 * Math.min(1, Math.hypot(lx, ly)));
    const seqK = rm ? 0.3 : 1;
    let scale = (1 + (st.scale - 1) * seqK) * (1 + (rm ? 0.005 : 0.025) * hover * (HM.open ? 0.4 : 1)) * eScale;
    const yPx = idleY + st.lift * seqK;
    let pitch = idlePitch + st.pitch * seqK + eP + lPitch + ptrS.y * 0.6 * hover * amp, roll = idleRoll + attRoll + swR + eR + lRoll - ptrS.x * 0.6 * hover * amp - st.offX * 0.12;
    stepBump(now, dt);                                                        // 탐색 경로 열고 닫기 반응(요청 AA8)
    roll += clampv(-bump.v * 0.018, -18, 18);
    let rpm = st.rpm * (1 + 0.05 * hover), offX = st.offX + swX + eX + lX + bump.x, offY = st.offY + eY + lY, yaw = st.yaw + eYaw + lYaw + clampv(bump.v * 0.012, -12, 12), z = st.z + eZ, shadowK = eShadow;
    AIR.setFocus(focusK, focusX, focusS);
    const three = HM.three;
    if (three && (three.flying || (HM.canvas && HM.canvas.isConnected))) {
      const { rig, look, att, rotors, shadow, renderer, scene, camera, pxToWorld } = three;
      const kz = (three.D - z) / three.D;                                     // 깊이 z만큼 시선 축 이동 + 가로세로 보정 → 화면 경로는 그대로, 크기는 원근으로
      rig.position.set(offX * pxToWorld * kz, -(yPx + offY) * pxToWorld * kz, 0).addScaledVector(three.camDir, z);
      look.rotation.set(pitch * Math.PI / 180, yaw * Math.PI / 180, 0);       // 시선 층
      att.rotation.set(0, 0, roll * Math.PI / 180);                           // 자세 층(roll·bank)
      rig.scale.setScalar(scale);
      shadow.position.x = rig.position.x; shadow.position.z = rig.position.z;   // 그림자는 드론 바로 아래 바닥을 따라간다
      shadow.material.opacity = (1 - Math.max(0, -yPx) * 0.025) * shadowK;
      const speed = motionOff && !fl ? 0 : 2 * Math.PI * (rm ? 1.4 : ROTOR_REV_PER_SEC) * rpm, spinning = speed > 0;
      rotors.forEach((r) => { r.angle += r.dir * speed * dt; r.pivot.rotation.y = r.angle; r.disc.material.opacity = spinning ? 0.45 + (rpm - 1) * 2 : 0; r.ghosts.forEach((g) => { g.visible = spinning; }); });
      renderer.render(scene, camera);
    } else if (HM.failed && HM.stage) {
      const svg = HM.stage.querySelector(".hm-svg");
      if (svg) svg.style.transform = `translate(${(st.offX + swX).toFixed(2)}px,${(yPx + st.offY).toFixed(2)}px) rotate(${roll.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
    }
  }
  function frame(now) {
    raf = 0;
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000)); last = now;
    tickSeq(now);
    hover += (hoverTarget - hover) * (1 - Math.exp(-dt * 8));
    ptrS.x += (ptr.x - ptrS.x) * (1 - Math.exp(-dt * 5)); ptrS.y += (ptr.y - ptrS.y) * (1 - Math.exp(-dt * 5));
    draw(now, dt);
    AIR.tick(now, dt);
    if (fl || (visible && HM.stage)) raf = requestAnimationFrame(frame);
  }

  /* 3D를 쓸 수 없을 때(오프라인·file:// 등): SVG 드론으로 같은 동작 */
  const _setup = setup3d;
  setup3d = function () { return _setup().catch((err) => { console.warn("[home] 3D 드론을 불러오지 못해 기본 드론으로 표시합니다.", err);
    HM.failed = true; HM.loading = false; if (HM.stage) HM.stage.classList.add("is-fallback"); wake(); }); };

  return { mount };
}

export default function (component) {
  const E = window.__ddHomeHero || (window.__ddHomeHero = createEngine());
  return E.mount(component);
}
