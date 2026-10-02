/* =========================================================
   Drone Hero — Three.js silver foldable drone for the Home stage
   Owns: scene/camera/renderer setup, generated drone geometry,
   polished silver + carbon materials, rotors, navigation lights,
   hover · sway · roll · yaw · pitch, entry flight, retreat
   (menu step-back), panel gaze, directional flight + surface
   handoff, Home return flight, SVG fallback, motion toggle,
   reduced motion, and the single rAF loop.

   No host routing/state: navigation, motion persistence, and
   route visibility are supplied through options/callbacks.
   Requires: Three.js import map ("three", "three/addons/").
   ========================================================= */
(function (global) {
  "use strict";
  const ROTOR_REV_PER_SEC = 3.0;
  const FALLBACK_SVG = "<svg class=\"hm-svg\" viewBox=\"0 0 320 200\" aria-hidden=\"true\"><defs><linearGradient id=\"hd-shell\" x1=\"0\" y1=\"0\" x2=\"0.35\" y2=\"1\"><stop offset=\"0\" stop-color=\"#7b818a\"/><stop offset=\".55\" stop-color=\"#4c5158\"/><stop offset=\"1\" stop-color=\"#33373d\"/></linearGradient><linearGradient id=\"hd-face\" x1=\"0\" y1=\"0\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#2d3136\"/><stop offset=\"1\" stop-color=\"#15171a\"/></linearGradient><linearGradient id=\"hd-motor\" x1=\"0\" y1=\"0\" x2=\"1\" y2=\"0\"><stop offset=\"0\" stop-color=\"#1a1c1f\"/><stop offset=\".28\" stop-color=\"#6d737b\"/><stop offset=\".5\" stop-color=\"#3a3e44\"/><stop offset=\"1\" stop-color=\"#101113\"/></linearGradient><radialGradient id=\"hd-motor-top\" cx=\".35\" cy=\".3\" r=\".8\"><stop offset=\"0\" stop-color=\"#8a9098\"/><stop offset=\"1\" stop-color=\"#2a2d32\"/></radialGradient><radialGradient id=\"hd-disc\" r=\".5\"><stop offset=\".08\" stop-color=\"#9aa1aa\" stop-opacity=\"0\"/><stop offset=\".6\" stop-color=\"#9aa1aa\" stop-opacity=\".07\"/><stop offset=\".97\" stop-color=\"#c9ced4\" stop-opacity=\".16\"/><stop offset=\"1\" stop-color=\"#c9ced4\" stop-opacity=\"0\"/></radialGradient><linearGradient id=\"hd-blade\" x1=\"0\" y1=\"-1\" x2=\"0\" y2=\"1\"><stop offset=\"0\" stop-color=\"#6a7078\"/><stop offset=\".5\" stop-color=\"#34383e\"/><stop offset=\"1\" stop-color=\"#1b1d20\"/></linearGradient><radialGradient id=\"hd-glass\" cx=\".38\" cy=\".35\" r=\".7\"><stop offset=\"0\" stop-color=\"#6fa8d8\"/><stop offset=\".25\" stop-color=\"#1d3f63\"/><stop offset=\".7\" stop-color=\"#0a1522\"/><stop offset=\"1\" stop-color=\"#030609\"/></radialGradient><filter id=\"hd-soft\" x=\"-50%\" y=\"-50%\" width=\"200%\" height=\"200%\"><feGaussianBlur stdDeviation=\"6\"/></filter><filter id=\"hd-glow\" x=\"-200%\" y=\"-200%\" width=\"500%\" height=\"500%\"><feGaussianBlur stdDeviation=\"1.6\"/></filter></defs><ellipse cx=\"160\" cy=\"184\" rx=\"112\" ry=\"9\" class=\"hm-sv-shadow\"/><g class=\"hm-sv-body\"><path d=\"M132,84 L90,67.0\" class=\"hm-sv-arm-under\"/><path d=\"M132,82.5 L90,65.5\" class=\"hm-sv-arm-top\"/><circle cx=\"90\" cy=\"74\" r=\"2.2\" class=\"hm-sv-led hm-sv-ccw\"/><path d=\"M188,84 L230,67.0\" class=\"hm-sv-arm-under\"/><path d=\"M188,82.5 L230,65.5\" class=\"hm-sv-arm-top\"/><circle cx=\"230\" cy=\"74\" r=\"2.2\" class=\"hm-sv-led hm-sv-cw\"/><ellipse cx=\"90\" cy=\"71\" rx=\"10.0\" ry=\"3.6\" class=\"hm-sv-mount\"/><path d=\"M83.0,60 L83.0,70 A7.0,2.1 0 0 0 97.0,70 L97.0,60 Z\" fill=\"url(#hd-motor)\"/><path d=\"M83.0,64.5 A7.0,2.1 0 0 0 97.0,64.5\" class=\"hm-sv-band\"/><ellipse cx=\"90\" cy=\"60\" rx=\"7.0\" ry=\"2.1\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"90\" cy=\"60\" rx=\"3.15\" ry=\"0.9450000000000001\" class=\"hm-sv-bell\"/><ellipse cx=\"230\" cy=\"71\" rx=\"10.0\" ry=\"3.6\" class=\"hm-sv-mount\"/><path d=\"M223.0,60 L223.0,70 A7.0,2.1 0 0 0 237.0,70 L237.0,60 Z\" fill=\"url(#hd-motor)\"/><path d=\"M223.0,64.5 A7.0,2.1 0 0 0 237.0,64.5\" class=\"hm-sv-band\"/><ellipse cx=\"230\" cy=\"60\" rx=\"7.0\" ry=\"2.1\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"230\" cy=\"60\" rx=\"3.15\" ry=\"0.9450000000000001\" class=\"hm-sv-bell\"/><g transform=\"translate(90 57) scale(1 0.3)\"><circle r=\"40\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor hm-sv-r2\"><g transform=\"rotate(32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"90\" cy=\"56\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><g transform=\"translate(230 57) scale(1 0.3)\"><circle r=\"40\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor\"><g transform=\"rotate(-32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(-16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C12.0,-7.5 28.8,-6.2 38.0,-2.6 Q41.0,0 38.0,2.2 C28.0,4.2 12.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"230\" cy=\"56\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><path d=\"M110,100 Q160,111 210,100 L204,119 Q160,131 116,119 Z\" fill=\"url(#hd-face)\"/><path d=\"M128,79 Q160,70 192,79 L210,100 Q160,111 110,100 Z\" fill=\"url(#hd-shell)\" class=\"hm-sv-hull\"/><path d=\"M134,84 Q160,77 186,84 L196,97 Q160,104 124,97 Z\" class=\"hm-sv-panel\"/><path d=\"M140,86 Q160,81 180,86\" class=\"hm-sv-vent\"/><path d=\"M137,90 Q160,85 183,90\" class=\"hm-sv-vent\"/><ellipse cx=\"146\" cy=\"84\" rx=\"16\" ry=\"4\" class=\"hm-sv-spec\" filter=\"url(#hd-glow)\"/><path d=\"M110,100 Q160,111 210,100\" class=\"hm-sv-edge\"/><ellipse cx=\"146\" cy=\"113\" rx=\"5\" ry=\"3.2\" class=\"hm-sv-sensor\"/><ellipse cx=\"174\" cy=\"113\" rx=\"5\" ry=\"3.2\" class=\"hm-sv-sensor\"/><ellipse cx=\"144.8\" cy=\"112.2\" rx=\"1.6\" ry=\"1\" class=\"hm-sv-glint\"/><ellipse cx=\"172.8\" cy=\"112.2\" rx=\"1.6\" ry=\"1\" class=\"hm-sv-glint\"/><path d=\"M114,110 L58,119.1\" class=\"hm-sv-arm-under\"/><path d=\"M114,108.5 L58,117.6\" class=\"hm-sv-arm-top\"/><circle cx=\"58\" cy=\"127\" r=\"2.2\" class=\"hm-sv-led hm-sv-cw\"/><path d=\"M206,110 L262,119.1\" class=\"hm-sv-arm-under\"/><path d=\"M206,108.5 L262,117.6\" class=\"hm-sv-arm-top\"/><circle cx=\"262\" cy=\"127\" r=\"2.2\" class=\"hm-sv-led hm-sv-ccw\"/><ellipse cx=\"58\" cy=\"124\" rx=\"12.0\" ry=\"4.199999999999999\" class=\"hm-sv-mount\"/><path d=\"M49.0,110 L49.0,123 A9.0,2.6999999999999997 0 0 0 67.0,123 L67.0,110 Z\" fill=\"url(#hd-motor)\"/><path d=\"M49.0,115.85 A9.0,2.6999999999999997 0 0 0 67.0,115.85\" class=\"hm-sv-band\"/><ellipse cx=\"58\" cy=\"110\" rx=\"9.0\" ry=\"2.6999999999999997\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"58\" cy=\"110\" rx=\"4.05\" ry=\"1.2149999999999999\" class=\"hm-sv-bell\"/><ellipse cx=\"262\" cy=\"124\" rx=\"12.0\" ry=\"4.199999999999999\" class=\"hm-sv-mount\"/><path d=\"M253.0,110 L253.0,123 A9.0,2.6999999999999997 0 0 0 271.0,123 L271.0,110 Z\" fill=\"url(#hd-motor)\"/><path d=\"M253.0,115.85 A9.0,2.6999999999999997 0 0 0 271.0,115.85\" class=\"hm-sv-band\"/><ellipse cx=\"262\" cy=\"110\" rx=\"9.0\" ry=\"2.6999999999999997\" fill=\"url(#hd-motor-top)\"/><ellipse cx=\"262\" cy=\"110\" rx=\"4.05\" ry=\"1.2149999999999999\" class=\"hm-sv-bell\"/><rect x=\"150\" y=\"124\" width=\"20\" height=\"7\" rx=\"2.5\" class=\"hm-sv-gimbal\"/><rect x=\"148\" y=\"129\" width=\"24\" height=\"17\" rx=\"5\" fill=\"url(#hd-face)\" class=\"hm-sv-gimbal\"/><circle cx=\"160\" cy=\"137.5\" r=\"7\" class=\"hm-sv-lens\"/><circle cx=\"160\" cy=\"137.5\" r=\"5.4\" fill=\"url(#hd-glass)\"/><circle cx=\"158\" cy=\"135.4\" r=\"1.4\" class=\"hm-sv-glint\"/><g transform=\"translate(58 107) scale(1 0.3)\"><circle r=\"50\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor\"><g transform=\"rotate(-32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(-16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"58\" cy=\"106\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/><g transform=\"translate(262 107) scale(1 0.3)\"><circle r=\"50\" class=\"hm-sv-disc\"/><g class=\"hm-sv-rotor hm-sv-r2\"><g transform=\"rotate(32)\" class=\"hm-sv-ghost hm-sv-g2\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(16)\" class=\"hm-sv-ghost\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><g transform=\"rotate(0)\" class=\"hm-sv-blade\"><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\"/><path d=\"M3,-2.6 C15.0,-7.5 36.0,-6.2 48.0,-2.6 Q51.0,0 48.0,2.2 C35.0,4.2 15.0,4 3,2.6 Z\" transform=\"rotate(180)\"/></g><circle r=\"4.5\" class=\"hm-sv-spinner\"/></g></g><ellipse cx=\"262\" cy=\"106\" rx=\"2.6\" ry=\"1.4\" class=\"hm-sv-shaft\"/></g></svg>";
  const ICONS = '<svg class="hm-toggle__icon hm-toggle__icon--pause" viewBox="0 0 16 16" aria-hidden="true"><rect x="4" y="3" width="2.4" height="10" rx="1"/><rect x="9.6" y="3" width="2.4" height="10" rx="1"/></svg>'
    + '<svg class="hm-toggle__icon hm-toggle__icon--play" viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3.2v9.6a.6.6 0 0 0 .9.5l7.6-4.8a.6.6 0 0 0 0-1L5.9 2.7a.6.6 0 0 0-.9.5z"/></svg>';

  /* ---------------- 상태 상수 ---------------- */
  // z: 깊이(카메라 쪽 +, 월드 단위). 호버 위치는 첫 진입의 '추가 접근' 뒤 자리(0.22). 메뉴가 열리면 드론이 한 발 뒤로 물러나 공간을 연다(0.0)
  const REST = { scale: 1, lift: 0, pitch: 0, rpm: 1, offX: 0, offY: 0, yaw: 0, z: 0.22 };   // lift/off: px, pitch/yaw: deg
  const REST_Z = REST.z;
  const OPEN_REST = { ...REST, scale: 1, lift: -4, rpm: 1.04, z: -1.2 };
  const clampv = (v, a, b) => Math.max(a, Math.min(b, v));
  const outCubic = (k) => 1 - Math.pow(1 - k, 3);
  const inOutSine = (k) => -(Math.cos(Math.PI * k) - 1) / 2;
  const clamp01 = (v) => Math.max(0, Math.min(1, v));
  const lerp = (a, b, k) => a + (b - a) * k;

  /* ---------------- 패널 선택 → 드론 비행·도착 → 화면 handoff → onNavigate ----------------
   * SELECT(120) → ORIENT(170) → ANTICIPATION(80) → FLIGHT(1000, 곡선·감속 lock-in) → HANDOFF(380 wipe) → onNavigate() → 도착 화면 reveal */
  const T = { select: 120, orient: 170, antic: 80, flight: 1000, handoff: 380 };   // flight: 화면 밖 이탈까지 보이도록 760 → 1000
  const T_ANTIC = T.select + T.orient, T_DEPART = T_ANTIC + T.antic, T_ARRIVE = T_DEPART + T.flight;
  const T_HANDOFF = T_ARRIVE + 20, T_NAV = T_HANDOFF + T.handoff + 30;
  function bezierEase(x1, y1, x2, y2) {
    const bx = (t) => ((1 - 3 * x2 + 3 * x1) * t + (3 * x2 - 6 * x1)) * t * t + 3 * x1 * t;
    const by = (t) => ((1 - 3 * y2 + 3 * y1) * t + (3 * y2 - 6 * y1)) * t * t + 3 * y1 * t;
    const dbx = (t) => (3 * (1 - 3 * x2 + 3 * x1) * t + 2 * (3 * x2 - 6 * x1)) * t + 3 * x1;
    return (x) => { let t = x; for (let i = 0; i < 6; i++) { const d = dbx(t); if (Math.abs(d) < 1e-6) break; t -= (bx(t) - x) / d; } return by(clamp01(t)); };
  }
  const flightEase = bezierEase(0.5, 0, 0.18, 1);
  const bez = (p0, p1, p2, p3, t) => { const u = 1 - t; return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3; };

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

  /* options:
   *   container              stable ancestor of the (re-rendered) stage — delegated input listeners live here
   *   onNavigate(key)        called once the directional flight hands off (host router)
   *   onCoreClick()          drone button activated (host decides: open/close menu)
   *   isMotionOn() / setMotionOn(on)   motion preference (host persistence)
   *   isActive()             the stage's route is currently shown (entry flights only then)
   *   theme()                "dark" | "light" (default: <html data-theme>)
   *   reducedMotion          MediaQueryList (default: prefers-reduced-motion)
   *   onFrame(now, dt)       per-frame hook inside the single rAF loop (e.g. Airspace tick)
   *   onFocus(k, x, s)       hover-zone strength/offset/scale under the drone (e.g. Airspace setFocus)
   *   onDroneRect(rect)      drone footprint in stage px (e.g. Airspace setDrone)
   *   onFlightStart(ux, uy)  flight direction at departure (e.g. Airspace flightReact)
   *   overlayHost()          element covered by the directional wipe (default: container)
   *   revealTarget()         element revealed from the flight direction after navigation
   *   resolveReturnTarget(ref)  element the return flight comes from (ref = fly()'s returnRef)
   *   labels                 { open, close, play, pause } accessible labels */
  function initDroneHero(options = {}) {
    const container = options.container;
    const noop = () => {};
    const reduce = options.reducedMotion || global.matchMedia("(prefers-reduced-motion: reduce)");
    const isMotionOn = options.isMotionOn || (() => true);
    const setMotionOn = options.setMotionOn || noop;
    const isActive = options.isActive || (() => true);
    const themeOf = options.theme || (() => document.documentElement.dataset.theme);
    const onFrame = options.onFrame || noop, onFocus = options.onFocus || noop, onDroneRect = options.onDroneRect || noop, onFlightStart = options.onFlightStart || noop;
    const overlayHost = options.overlayHost || (() => container);
    const revealTarget = options.revealTarget || (() => null);
    const resolveReturnTarget = options.resolveReturnTarget || (() => null);
    const LABELS = { open: "탐색 메뉴 열기", close: "탐색 메뉴 접기", play: "움직임 재생", pause: "움직임 멈추기", ...options.labels };

    /* 모션 상태(드론 기준): entering(첫 진입 곡선 하강) → settling(도착 후 잠깐 정지) → approaching(카메라 쪽 추가 접근) → hovering
     *   · returningHome(패널 방향에서 복귀) → approaching → hovering · expanding → expanded(패널 전개) · flyingToPanel.
     * 입력 잠금은 HM.phase(transitioning·navigating)만 쓴다 — 진입·복귀 중에도 다른 UI는 바로 쓸 수 있다. stage[data-motion]에 표시 */
    const HM = { stage: null, core: null, canvas: null, three: null, loading: false, ready: false, failed: false, engaged: false, phase: "idle" };
    function setMode(m) { HM.mode = m; if (HM.stage) HM.stage.dataset.motion = m; }
    const st = { ...REST };
    let seq = null, fl = null, overlay = null, hover = 0, hoverTarget = 0;
    const ptr = { x: 0, y: 0 }, ptrS = { x: 0, y: 0 };
    const timers = [];
    const later = (ms, fn) => timers.push(setTimeout(fn, ms));
    const clearTimers = () => { while (timers.length) clearTimeout(timers.pop()); };
    const cls = (...c) => HM.stage && HM.stage.classList.add(...c);
    const uncls = (...c) => HM.stage && HM.stage.classList.remove(...c);

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

    /* ---------------- 마크업(호스트 stage 안에 넣는다) ---------------- */
    const stageClasses = (engaged) => { const still = !isMotionOn(); return [engaged && "is-engaged-static", still && "is-still", HM.ready && "is-3d", HM.failed && "is-fallback"]; };
    const ringsMarkup = () => '<span class="hm-ring"></span><span class="hm-ring hm-ring--b"></span>';
    const coreMarkup = (engaged) => `<button class="hm-core" type="button" data-hm-hero="core" aria-expanded="${engaged}" aria-label="${engaged ? LABELS.close : LABELS.open}">${FALLBACK_SVG}</button>`;
    const toggleMarkup = () => { const still = !isMotionOn(), label = still ? LABELS.play : LABELS.pause;
      return `<button class="hm-toggle" type="button" data-hm-hero="motion" aria-pressed="${still}" aria-label="${label}" title="${label}">${ICONS}</button>`; };

    function setCoreState(open) { if (!HM.core) return; HM.core.setAttribute("aria-expanded", String(open)); HM.core.setAttribute("aria-label", open ? LABELS.close : LABELS.open); }
    function syncMotion() {
      if (!isMotionOn()) finishEntry();                                         // 진입 비행 중 '움직임 멈추기' → 바로 도착 상태
      const still = !isMotionOn(), label = still ? LABELS.play : LABELS.pause;
      if (HM.stage) { HM.stage.classList.toggle("is-still", still); const b = HM.stage.querySelector(".hm-toggle");
        if (b) { b.setAttribute("aria-pressed", String(still)); b.setAttribute("aria-label", label); b.title = label; } }
      wake();
    }
    /* 메뉴 열림(retreat): ring 반응 + 드론이 한 발 물러나 패널이 펼쳐질 공간을 연다. 패널 전개는 호스트(radial)가 맡는다 */
    function engage() {
      HM.engaged = true; clearTimers();
      uncls("is-releasing", "is-engaged-static"); cls("is-engaged"); setCoreState(true);
      if (reduce.matches) { run([{ d: 160, to: { scale: 1.015, rpm: 1.04 } }]); return; }
      setMode("expanding");
      run([
        { d: 300, to: { z: -1.05, lift: -2, pitch: -2.2, rpm: 1.12 }, ease: outCubic },          // STEP BACK: 커진 기체만큼 크게 물러나며 기수를 든다(제동 자세)
        { d: 280, to: { z: -1.2, lift: -4, pitch: 0, rpm: 1.04 }, ease: inOutSine },               // SETTLE: 원근상 약 2/3 크기 → 오각형 패널이 온전히 드러날 공간
      ]);
    }
    function markExpanded() { if (HM.engaged) setMode("expanded"); }
    /* 메뉴 닫힘: 드론이 호버 자리로 돌아오고 ring이 원위치 */
    function release() {
      HM.engaged = false; clearTimers(); leanT.x = leanT.y = 0; setMode("hovering");
      setCoreState(false);
      run([{ d: reduce.matches ? 0.01 : 260, to: {} }, { d: reduce.matches ? 160 : 380, to: { scale: 1, lift: 0, pitch: 0, rpm: 1, z: REST_Z } }]);
      later(reduce.matches ? 0 : 240, () => { uncls("is-engaged", "is-engaged-static"); cls("is-releasing"); });
      later(reduce.matches ? 300 : 700, () => uncls("is-releasing"));
    }
    // 패널 hover 시선: 패널의 실제 방향 벡터(단위) → 드론이 그쪽으로 살짝 고개를 돌린다(yaw·pitch). null = 정면
    const leanT = { x: 0, y: 0 }, leanS = { x: 0, y: 0 }, leanV = { x: 0, y: 0 };
    function gaze(dir) { if (dir) { leanT.x = dir.x; leanT.y = dir.y; wake(); } else leanT.x = leanT.y = 0; }

    function flight(now) {
      const e = now - fl.t0, k = (a, b) => clamp01((e - a) / (b - a));
      const o = inOutSine(k(T.select, T_ANTIC)), a = inOutSine(k(T_ANTIC, T_DEPART)), d = k(T_DEPART, T_ARRIVE), p = flightEase(d);
      const bank = Math.sin(Math.PI * d);
      const f = { yaw: fl.yaw * o, roll: fl.roll * o * (1 - 0.6 * p) + fl.bank * bank, shadow: 1 - d,
        pitch: fl.pitch * o * (1 - p) + (d > 0 ? 3 * Math.sin(2 * Math.PI * d) - 4 * Math.sin(Math.PI * d) : 0) };   // 깊이로 멀어질 때 기체를 그쪽으로 숙임
      if (d <= 0) { f.x = -fl.ux * 2.5 * a; f.y = -fl.uy * 2.5 * a; f.scale = lerp(1.02, 1.025, a); f.rpm = lerp(lerp(1, 1.06, o), 1.10, a); f.z = lerp(fl.z0, fl.z0 + 0.08, inOutSine(k(T.select, T_DEPART))); }   // 출발 전 한 걸음 앞으로
      else {
        f.x = bez(fl.P0.x, fl.C1.x, fl.C2.x, fl.E.x, p); f.y = bez(fl.P0.y, fl.C1.y, fl.C2.y, fl.E.y, p);
        f.z = lerp(fl.z0 + 0.08, fl.z0 - 1.4, inOutSine(p));                    // 패널 방향으로 멀어지며(원근으로 작아짐) 화면 밖으로
        f.scale = lerp(1.025, 0.86, inOutSine(p));
        f.rpm = d < 0.3 ? lerp(1.10, 1.15, d / 0.3) : lerp(1.15, 1.04, (d - 0.3) / 0.7);
      }
      return f;
    }
    function planFlight(go) {
      const rc = HM.core.getBoundingClientRect(), rg = go.getBoundingClientRect();
      const c0 = { x: rc.left + rc.width / 2, y: rc.top + rc.height / 2 }, g = { x: rg.left + rg.width / 2, y: rg.top + rg.height / 2 };
      const len = Math.hypot(g.x - c0.x, g.y - c0.y) || 1, ux = (g.x - c0.x) / len, uy = (g.y - c0.y) / len;
      // 패널을 지나 대시보드 화면(viewport) 밖까지: 패널 방향 직선을 따라 화면 경계 + 여유(멀어진 기체 크기)까지 날아가 이탈
      const endScale = 0.6, vw = document.documentElement.clientWidth, vh = window.innerHeight;
      const tx = ux > 1e-3 ? (vw - c0.x) / ux : ux < -1e-3 ? -c0.x / ux : Infinity, ty = uy > 1e-3 ? (vh - c0.y) / uy : uy < -1e-3 ? -c0.y / uy : Infinity;
      const stop = Math.max(len + 40, Math.min(tx, ty) + rc.width * 0.9);
      let nx = -uy, ny = ux; if (ny > 0 || (Math.abs(ny) < 0.2 && nx < 0)) { nx = -nx; ny = -ny; }
      const P0 = { x: -ux * 2.5, y: -uy * 2.5 }, E = { x: ux * stop, y: uy * stop };
      const C1 = { x: P0.x + ux * stop * 0.28 + nx * 26, y: P0.y + uy * stop * 0.28 - 18 + ny * 26 };   // 살짝 휘며 패널 쪽으로 가속
      const C2 = { x: E.x - ux * stop * 0.3 + nx * 14, y: E.y - uy * stop * 0.3 + ny * 14 };
      return { t0: performance.now(), ux, uy, P0, C1, C2, E, endScale, z0: st.z,
        yaw: ux * 22, roll: Math.max(-7, Math.min(7, -ux * 5)), pitch: Math.max(-5, Math.min(5, uy * 4)), bank: -ux * 7 };   // bank: 비행 중 진행 방향 쪽 기울기(sin 곡선으로 생겼다 풀림)
    }
    function startOverlay(ux, uy, fade) {
      const r = overlayHost().getBoundingClientRect();
      overlay = document.createElement("div");
      overlay.className = "hm-handoff-overlay" + (fade ? " is-fade" : "");
      Object.assign(overlay.style, { left: r.left + "px", top: r.top + "px", width: r.width + "px", height: r.height + "px" });
      overlay.style.setProperty("--hm-bg", getComputedStyle(document.body).backgroundColor);
      overlay.style.setProperty("--hm-ang", (Math.atan2(ux, -uy) * 180 / Math.PI).toFixed(1) + "deg");
      document.body.appendChild(overlay);
      void overlay.offsetWidth;
      overlay.classList.add("is-run");
    }
    const canFly = () => HM.phase === "idle" && !!HM.stage && !!HM.core;
    /* 방향 비행: target(선택된 패널) 쪽으로 날아가 화면 밖으로 이탈 → wipe → onNavigate(key) → 도착 화면 reveal
     * hooks.onSelect(): 출발 순간 호스트 표시(선택 패널 강조) · hooks.returnRef: Home 복귀 때 resolveReturnTarget(ref)로 다시 찾을 값 */
    function fly(target, key, hooks = {}) {
      if (!canFly()) return false;
      HM.phase = "transitioning"; clearTimers(); seq = null; leanT.x = leanT.y = 0;
      const rm = reduce.matches || !HM.ready;
      const plan = planFlight(target);
      HM.lastDir = { ux: plan.ux, uy: plan.uy }; HM.lastRef = hooks.returnRef ?? null; setMode("flyingToPanel");   // Home 복귀 때 이 패널 방향에서 돌아온다
      document.body.style.setProperty("--hx", (plan.ux * 12).toFixed(1) + "px");
      document.body.style.setProperty("--hy", (plan.uy * 12).toFixed(1) + "px");
      if (hooks.onSelect) hooks.onSelect();
      cls("is-leaving");
      onFlightStart(plan.ux, plan.uy);
      const navigate = () => {
        if (HM.phase !== "transitioning") return;
        HM.phase = "navigating";
        fl = null; seq = null; Object.assign(st, REST); HM.engaged = false;
        if (HM.three) HM.three.park();
        document.body.classList.remove("hm-handoff");
        if (options.onNavigate) options.onNavigate(key);                        // 호스트 라우터(render 포함)
        revealDestination(plan, rm);
      };
      if (rm) { later(120, () => { cls("is-fade-others", "is-fade-ring"); startOverlay(plan.ux, plan.uy, true); }); later(360, navigate); return true; }
      HM.three.detach(); fl = plan; wake();
      later(T_DEPART, () => cls("is-depart"));
      later(560, () => cls("is-fade-others"));
      later(700, () => cls("is-fade-ring"));
      later(T_ARRIVE - 80, () => cls("is-locked"));
      later(T_HANDOFF, () => { document.body.classList.add("hm-handoff"); startOverlay(plan.ux, plan.uy, false); });
      later(T_HANDOFF + 170, () => cls("is-fade-selected"));
      later(T_HANDOFF + 280, () => cls("is-fade-selected-out"));
      later(T_HANDOFF + 290, () => HM.three && HM.three.fadeOut());
      later(T_NAV, navigate);
      return true;
    }
    // 도착 화면: wipe가 걷히며 선택 방향에서 10px 진입(일시 애니메이션만, 도착 화면의 스타일은 바꾸지 않음)
    function revealDestination(plan, rm) {
      const frame = revealTarget();
      if (frame && frame.animate && !rm) frame.animate([{ opacity: 0, transform: `translate(${(plan.ux * 10).toFixed(1)}px,${(plan.uy * 10).toFixed(1)}px)` }, { opacity: 1, transform: "none" }],
        { duration: 300, easing: "cubic-bezier(.22,.61,.36,1)" });
      const ov = overlay; overlay = null;
      if (ov) { requestAnimationFrame(() => ov.classList.add("is-out")); setTimeout(() => ov.remove(), 380); }
      setTimeout(() => { HM.phase = "idle"; document.body.style.removeProperty("--hx"); document.body.style.removeProperty("--hy"); }, 360);
    }
    // 전환 중에는 사이드바·필터·Esc 포함 모든 입력을 막아 이동은 한 번만 일어난다
    const lock = (e) => { if (HM.phase !== "idle") { e.preventDefault(); e.stopPropagation(); } };
    window.addEventListener("click", lock, true);
    window.addEventListener("change", lock, true);
    window.addEventListener("keydown", (e) => { if (["Enter", " ", "Escape"].includes(e.key)) lock(e); }, true);

    /* ---------------- mount / unmount (호스트가 stage를 다시 그릴 때마다) ---------------- */
    const io = new IntersectionObserver((es) => { inView = es[es.length - 1].isIntersecting; updateVisible(); });
    function measure() { if (HM.core) onDroneRect({ cx: HM.core.offsetLeft, cy: HM.core.offsetTop, hw: HM.core.offsetWidth * 0.72 * 1.2, hh: HM.core.offsetHeight * 0.66 * 1.2 }); }   // 커진 기체만큼 배경 점·라벨 비켜 두는 영역도 확대
    // 진입·복귀 비행 중 다시 그려짐: 같은 화면에 그대로 있으면(라우팅 직후 hashchange 재렌더·테마 전환 등) 화면 고정 레이어에서 비행을 그대로 이어 가고
    // (새 드론 버튼 위치는 track()이 따라감), 화면을 떠나면 즉시 도착 상태로 정리한다
    function mount(stage, state = {}) {
      io.disconnect();
      const resume = !!(entry && HM.three);
      if (!resume) finishEntry();
      HM.stage = stage; HM.core = stage.querySelector(".hm-core");
      if (!HM.canvas) { HM.canvas = document.createElement("canvas"); HM.canvas.className = "hm-canvas"; HM.canvas.setAttribute("aria-hidden", "true"); }
      if (!(HM.three && HM.three.flying)) HM.core.prepend(HM.canvas);
      if (HM.three) { HM.three.fit(true); HM.three.applyLights(); }
      measure();
      if (resume && HM.mode !== "approaching") cls("is-arriving");
      const want = !!state.engaged;                                             // Esc·테마 변경 등으로 다시 그려진 경우 상태 맞춤
      if (HM.engaged !== want && HM.phase === "idle") {
        HM.engaged = want; clearTimers();
        if (want) { seq = null; Object.assign(st, OPEN_REST); }
        else run([{ d: reduce.matches ? 160 : 380, to: { scale: 1, lift: 0, pitch: 0, rpm: 1, z: REST_Z } }]);   // Esc 등으로 닫힘 → 드론만 부드럽게 복귀
      }
      io.observe(HM.stage);
      if (!HM.loading && !HM.ready && !HM.failed) setup3d();
      setMode(HM.mode && HM.mode !== "flyingToPanel" ? HM.mode : "hovering");   // 새 stage에 현재 모션 상태 표시
      if (HM.away) { HM.away = false; if (HM.ready) startEntry("return"); }     // 다른 화면에서 돌아옴 → 복귀 비행
      if (HM.three) draw(performance.now(), 0);
      wake();
    }
    function unmount() {
      io.disconnect();
      finishEntry();
      // 화면을 떠나는 순간에만: 패널 비행이 아니면(사이드바 등) 복귀 방향 없음. 다른 화면에서 다시 그려져도 유지
      if (!HM.away) { if (HM.phase !== "navigating") HM.lastDir = HM.lastRef = null; HM.away = true; }
      HM.stage = HM.core = null; hoverTarget = hover = 0; sleep();
    }

    /* ---------------- 입력 — container에 한 번만 위임 등록 ---------------- */
    container.addEventListener("click", (e) => {
      const b = e.target.closest && e.target.closest("[data-hm-hero]"); if (!b || !container.contains(b)) return;
      if (b.dataset.hmHero === "core") { if (options.onCoreClick) options.onCoreClick(); }
      else if (b.dataset.hmHero === "motion") { setMotionOn(!isMotionOn()); syncMotion(); }
    });
    container.addEventListener("pointerover", (e) => { const c = e.target.closest && e.target.closest(".hm-core");
      if (c && !c.contains(e.relatedTarget)) { hoverTarget = 1; cls("is-hover"); wake(); } });
    container.addEventListener("pointerout", (e) => { const c = e.target.closest && e.target.closest(".hm-core");
      if (c && !c.contains(e.relatedTarget)) { hoverTarget = 0; uncls("is-hover"); ptr.x = ptr.y = 0; } });
    container.addEventListener("pointermove", (e) => { if (!HM.core || !HM.core.contains(e.target)) return;
      const r = HM.core.getBoundingClientRect();
      ptr.x = Math.max(-1, Math.min(1, (e.clientX - (r.left + r.width / 2)) / (r.width / 2)));
      ptr.y = Math.max(-1, Math.min(1, (e.clientY - (r.top + r.height / 2)) / (r.height / 2))); });

    /* ---------------- 3D (한 번만 만든다) ---------------- */
    async function setup3dScene() {
      HM.loading = true;
      const canvas = HM.canvas;
      const [THREE, { RoomEnvironment }, { RoundedBoxGeometry }, BGU] = await Promise.all([
        import("three"), import("three/addons/environments/RoomEnvironment.js"),
        import("three/addons/geometries/RoundedBoxGeometry.js"), import("three/addons/utils/BufferGeometryUtils.js"),
      ]);
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

      const { model, rotors, motors } = buildFoldableDrone(THREE, RoundedBoxGeometry, BGU);
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
      three.applyLights = () => { const src = HM.stage || document.documentElement, cs = getComputedStyle(src);
        const light = themeOf() === "light";
        scene.environmentIntensity = light ? 0.82 : 0.6;                          // 라이트: 프레임 표면 반사를 은은하게 더
        navLights.forEach((l) => { const v = cs.getPropertyValue(l.spin === "cw" ? "--motor-light-cw" : "--motor-light-ccw").trim() || (light ? "#fff8ee" : l.spin === "cw" ? "#ff4a3d" : "#2fe07c");
          l.lamp.material.color.setStyle(v); l.glow.material.color.setStyle(v); }); };
      // 비행: canvas를 viewport 고정 레이어로 옮기고 camera view offset으로 화면 위치·크기 유지 / park: 비행 후 다음 mount까지 보관
      three.detach = () => { const r = canvas.getBoundingClientRect(), vw = document.documentElement.clientWidth, vh = window.innerHeight;
        three.flying = true; document.body.appendChild(canvas);
        canvas.style.cssText = `position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;transform:none;opacity:1;z-index:45;pointer-events:none;transition:opacity 150ms ease`;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(vw, vh, false);
        camera.aspect = r.width / r.height; camera.setViewOffset(r.width, r.height, -r.left, -r.top, vw, vh); draw(performance.now(), 0); };
      three.park = () => { if (!three.flying) return; three.flying = false; canvas.remove(); canvas.style.cssText = "";
        camera.clearViewOffset(); renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); lastW = lastH = 0; };
      three.fadeOut = () => { canvas.style.opacity = "0"; };
      // 진입·복귀 비행용 화면 모드: canvas를 화면(viewport) 전체 고정 레이어로 옮기고, 매 프레임 드론 버튼 위치에 맞춰 camera view offset을 갱신
      //   → 대시보드 화면 바깥에서 날아들어 Hero 안 호버 자리로 들어온다(스크롤해도 도착 지점이 맞음). viewOut: 원래 자리(드론 버튼 안)로 복귀
      const CANVAS_K = 2.35;                                                    // .hm-canvas = 드론 버튼의 235%
      three.track = () => { if (!three.staged || !HM.core || !HM.core.isConnected) return; const cr = HM.core.getBoundingClientRect(), w = cr.width * CANVAS_K, h = cr.height * CANVAS_K;
        if (!w || !h) return; camera.aspect = w / h;
        camera.setViewOffset(w, h, -(cr.left + cr.width / 2 - w / 2), -(cr.top + cr.height / 2 - h / 2), canvas.clientWidth || window.innerWidth, canvas.clientHeight || window.innerHeight); };
      three.viewIn = () => { const cr = HM.core && HM.core.getBoundingClientRect(); if (!cr || !cr.width) return null;
        const vw = document.documentElement.clientWidth, vh = window.innerHeight;
        three.flying = three.staged = true; document.body.appendChild(canvas);
        canvas.style.cssText = `position:fixed;left:0;top:0;width:${vw}px;height:${vh}px;transform:none;opacity:1;z-index:45;pointer-events:none`;
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5)); renderer.setSize(vw, vh, false); three.track();
        return { cx: cr.left + cr.width / 2, cy: cr.top + cr.height / 2, vw, vh, canvasW: cr.width * CANVAS_K }; };
      three.viewOut = () => { if (!three.staged) return; three.staged = three.flying = false; canvas.style.cssText = ""; camera.clearViewOffset();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2)); lastW = lastH = 0;
        if (HM.core && HM.core.isConnected) HM.core.prepend(canvas); else canvas.remove(); fit(true); };
      HM.three = three;
      fit(true); placeNavLights(); three.applyLights();
      new MutationObserver(() => three.applyLights()).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "class"] });
      new ResizeObserver(() => { if (fit()) draw(performance.now(), 0); }).observe(canvas);
      if (renderer.compileAsync && renderer.extensions.has("KHR_parallel_shader_compile")) await renderer.compileAsync(scene, camera); else renderer.compile(scene, camera);
      draw(performance.now(), 0);
      await new Promise((r) => requestAnimationFrame(() => r()));
      draw(performance.now(), 0);
      HM.ready = true; HM.loading = false;
      if (HM.stage) HM.stage.classList.add("is-3d");
      startEntry("first");
      wake();
    }
    /* 3D를 쓸 수 없을 때(오프라인·file:// 등): SVG 드론으로 같은 동작 */
    function setup3d() { return setup3dScene().catch((err) => { console.warn("[drone-hero] 3D 드론을 불러오지 못해 기본 드론으로 표시합니다.", err);
      HM.failed = true; HM.loading = false; if (HM.stage) HM.stage.classList.add("is-fallback"); wake(); }); }

    /* ---------------- 루프: stage가 보일 때만(또는 비행 중) ---------------- */
    let raf = 0, last = 0, inView = true, visible = !document.hidden;
    function updateVisible() { visible = inView && !document.hidden; visible ? wake() : sleep(); }
    function wake() { if (!raf && (fl || (visible && HM.stage))) { last = performance.now(); raf = requestAnimationFrame(frame); } }
    function sleep() { if (raf) cancelAnimationFrame(raf); raf = 0; }
    document.addEventListener("visibilitychange", updateVisible);
    /* idle sway(호버링 자세 보정): 좌우로 아주 조금 이동하고, 그 가속도 방향으로 미세하게 roll(가속할 때 그쪽으로 기울고 멈출 때 반대로).
     * 주기가 다른 두 성분(4.3s · 7.1s)을 겹쳐 기계적 왕복처럼 보이지 않게 한다. 최대 약 ±2.8px · ±0.5°. */
    /* 자세 반응 효과(pose effects): (now) → { roll, rpm } | null. 위치·높이는 건드리지 않고 자세(roll)와 로터만 더한다(예: shared/drone-reactions.js impact).
     * 같은 key는 교체(연속 토글에도 누적되지 않음). 움직임 멈춤이면 추가하지 않고, reduced motion은 진폭을 줄인다 */
    const effects = new Map();
    function addEffect(fn, key = Symbol("effect")) { if (!isMotionOn() || typeof fn !== "function") return; effects.set(key, fn); wake(); }
    let swayW = 1;                                                              // 0~1: idle에서만 1, 비행·전환이 시작되면 부드럽게 0
    /* 진입·복귀 비행(3D) — 3단계: ① 곡선 하강(화면 경로 3차 베지어 + 깊이 z: 멀리서 작게 → 가까워지며 커짐) → ② settling(호버 자리에서 잠깐 정지·미세 침하)
     *   → ③ approaching(카메라 쪽으로 한 번 더 다가와 최종 호버 깊이에 정착). 자세(yaw·bank·pitch)는 경로의 속도·가속도에서 계산.
     *   그림자·바닥 hover zone·ring도 단계에 맞춰 짙어지고 커진다(ring은 ③에서 나타남).
     * 첫 진입: 2시 방향(오른쪽 위)에서 하강 2.4s + 정지 0.42s + 접근 0.95s (빈 Hero 0.45s 뒤).
     * 복귀: 마지막으로 누른 패널이 있는 방향(지금 stage에서 그 패널의 실제 위치로 다시 계산)에서 하강 2.0s + 접근 0.5s.
     *   다른 경로로 나갔다 오면 2시 방향. 방향은 화면을 떠나는 순간에만 정하고, 다른 화면에서 다시 그려져도 유지된다.
     * 진입 중 드론 클릭·움직임 멈춤·다시 그리기(테마·이동) → 즉시 도착. reduced motion·움직임 멈춤·3D 미사용이면 생략. */
    let entry = null;
    function startEntry(kind) {
      if (kind === "first") { if (HM.entered) return; HM.entered = true; }
      if (reduce.matches || !isMotionOn() || !HM.three || !HM.stage || !isActive() || HM.engaged || HM.phase !== "idle") return;
      const g = HM.three.viewIn(); if (!g) return;
      const first = kind === "first";
      let d = { ux: 0.8, uy: -0.6 };                                            // 2시 방향
      if (!first) { const pEl = HM.lastRef != null ? resolveReturnTarget(HM.lastRef) : null;
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
    function idleSway(t) {
      const w1 = 2 * Math.PI / 4.3, w2 = 2 * Math.PI / 7.1, A1 = 2.0, A2 = 0.8, s1 = Math.sin(w1 * t + 0.4), s2 = Math.sin(w2 * t + 2.1);
      const acc = A1 * w1 * w1 * s1 + A2 * w2 * w2 * s2;                         // = -(가로 가속도)
      return { x: A1 * s1 + A2 * s2, roll: 0.5 * acc / (A1 * w1 * w1 + A2 * w2 * w2) };
    }
    function draw(now, dt) {
      const rm = reduce.matches, motionOff = !isMotionOn();
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
        eX = p.x; eY = p.y; eZ = p.z - REST_Z;
        eYaw = clampv(vx * 0.03, -24, 24);                                      // 진행 방향으로 기수를 돌림(선회)
        eR = clampv(-(vx * 0.013 + ax * 0.0014), -14, 14);                       // 선회·감속 bank
        eP = clampv(vz * 3, -8, 8) + clampv(vy * 0.005, -3, 3);                  // 다가올 때·내려올 때 앞으로 숙임
        eScale = 0.9 + 0.1 * Math.min(1, p.s / 0.85);                           // 원근 위에 약간의 크기 변화를 더해 접근감 보강
        eShadow = Math.pow(clamp01((p.k - 0.4) / 0.6), 2) * (0.8 + 0.2 * clamp01((p.s - 0.85) / 0.15)); focusK = 0.15 + 0.85 * eShadow; focusX = eX; focusS = 0.5 + 0.5 * p.s;   // 그림자·hover zone은 하강·접근에 맞춰 짙어지고 커짐
        if (now - E.t0 >= E.dur) finishEntry(); }
      { const w = 7, ds = Math.min(0.05, dt || 0);                             // 패널 hover 시선: 임계 감쇠 스프링 → 시작·끝 모두 부드러운 ease-in-out, 튐 없음
        for (const c of ["x", "y"]) { leanV[c] += (w * w * (leanT[c] - leanS[c]) - 2 * w * leanV[c]) * ds; leanS[c] += leanV[c] * ds; } }
      // 패널의 실제 방향 벡터(lx, ly)로 자세를 정한다: yaw(좌우로 돌아봄) · pitch(위는 올려다보고 아래는 내려다봄) · bank(좌우 패널 쪽으로 기울기) · 그쪽으로 몇 px 이동
      // panel-look bank: 좌우 패널일수록(|lx|) 그쪽으로 기울고, 위·아래 패널은 roll 대신 pitch·yaw 중심
      const lx = leanS.x, ly = leanS.y, lYaw = lx * 16, lPitch = ly * (ly < 0 ? 8 : 7), lRoll = -lx * Math.abs(lx) * 5.5, lX = lx * 6, lY = ly * 4;
      const attRoll = attRollRaw * swK * (1 - 0.7 * Math.min(1, Math.hypot(lx, ly)));
      const seqK = rm ? 0.3 : 1;
      let scale = (1 + (st.scale - 1) * seqK) * (1 + (rm ? 0.005 : 0.025) * hover * (HM.engaged ? 0.4 : 1)) * eScale;
      const yPx = idleY + st.lift * seqK;
      let pitch = idlePitch + st.pitch * seqK + eP + lPitch + ptrS.y * 0.6 * hover * amp, roll = idleRoll + attRoll + swR + eR + lRoll - ptrS.x * 0.6 * hover * amp - st.offX * 0.12;
      let fxRoll = 0, fxRpm = 0;
      for (const [key, fx] of effects) { const r = fx(now); if (!r) { effects.delete(key); continue; } fxRoll += r.roll || 0; fxRpm += r.rpm || 0; }
      if (fxRoll || fxRpm) { const fk = rm ? 0.35 : 1; roll += fxRoll * fk; }        // 회전 중심은 기체 중심(att) → 높이·위치 유지
      let rpm = st.rpm * (1 + 0.05 * hover) * (1 + fxRpm * (rm ? 0.35 : 1)), offX = st.offX + swX + eX + lX, offY = st.offY + eY + lY, yaw = st.yaw + eYaw + lYaw, z = st.z + eZ, shadowK = eShadow;
      if (fl) { const f = flight(now); offX = f.x + swX + lX; offY = f.y + lY; yaw = f.yaw + lYaw; pitch = idlePitch * 0.3 + f.pitch + lPitch; roll = idleRoll * 0.3 + swR + f.roll + lRoll;   // hover 자세가 비행 자세로 이어지며 스프링으로 풀림
        scale = f.scale; rpm = f.rpm; shadowK = f.shadow; z = f.z;
        focusK = f.shadow; focusX = f.x; }   // swX·swR은 비행 시작과 함께 0으로 수렴
      onFocus(focusK, focusX, focusS);
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
      onFrame(now, dt);
      if (fl || (visible && HM.stage)) raf = requestAnimationFrame(frame);
    }

    return {
      stageClasses, ringsMarkup, coreMarkup, toggleMarkup,
      mount, unmount, measure, engage, release, markExpanded, gaze, fly, canFly, syncMotion, finishEntry, wake, addEffect,
      isIdle: () => HM.phase === "idle", isEngaged: () => HM.engaged, inEntry: () => !!entry,
      get ready() { return HM.ready; }, get failed() { return HM.failed; },
    };
  }

  global.initDroneHero = initDroneHero;
})(window);
