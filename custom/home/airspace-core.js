/* =========================================================
   Airspace Core — Geo-Airspace Simulation Layer (Canvas 2D)
   Shared engine for the Dark and Light Airspace layers.

   Owns: seeded procedural slots (buildings · terrain), slot
   lifecycle (appear → rise → hold → fade → regenerate), far
   ridges, ground grid + point cloud, drone hover zone + ripple,
   150 m reference, altitude labels, and scan.

   Theme-specific drawing plugs in through registerLayer()
   (airspace-dark.js · airspace-light.js). Palettes come from the
   stage's --hm-air-* CSS variables. No host state is read: motion
   and reduced-motion are supplied by the caller.
   ========================================================= */
(function (global) {
  "use strict";

  /* ---- Layer registry: layers are created per engine, in registration order ----
   * layer = { name, create(api) → hooks }
   * hooks (all optional): slot(sl, col) · sky(f) · ground(f) · skipGroundPoint(f, X, Z) · water(f)
   *                       skipSlot(f, sl) · items(f, push) · placeBuilding(f, it, Z, Xc) → Xc */
  const LAYERS = [];
  function registerLayer(layer) { if (layer && layer.name && !LAYERS.some((l) => l.name === layer.name)) LAYERS.push(layer); }

  /* 질서 있는 랜덤(seed 고정): 가로를 15개 슬롯으로 나누고, 슬롯마다 깊이 대역(근경·중경·원경)과 내용(단독 건물·건물 군집·구릉·능선·산·
   *   구릉+건물 혼합)을 가중치 난수로 정한다. 이웃 슬롯이 같은 종류면 반대 종류로 바꿔 건물·지형이 한쪽으로 몰리지 않는다.
   *   슬롯은 8~16초 생애(나타남 → 상승 → 유지 → 하강·소멸) 뒤 다른 내용으로 다시 생성된다. 슬롯마다 시점이 달라 동시에 움직이지 않는다.
   * 객체 단위 고도 로직: 객체마다 고정 높이(m) → 객체 전체 색. ≤150m teal(<60)/green, >150m muted red 계열. 150m 선에서 자르지 않는다.
   * 건물 형태: 저층 광폭 · 중층 박스 · 타워 · 슬림 고층 · 트윈 타워 · 셋백 타워 · 포디움+타워, 저층 군집 · 중층 군집. 건물마다 폭·깊이·높이·점 밀도가 다르다.
   * 지형 형태: 낮은 둔덕 · 구릉 · 완만한 능선 · 산 · 넓은 산 · 뾰족한 봉우리 · 쌍봉. 높이·폭·좌우 경사·정상 위치·점 분포가 다르다.
   * 고도 라벨: 점 + 얇은 leader line + 높이. 건물은 가장 높은 층 지붕 가운데, 산은 실제 정상(표면 굴곡이 정상에서 0)에 붙는다.
   * 깊이 위계: 근경이 가장 선명하고 원경일수록 약하다. 테마별 색·채움·라벨 plate는 .hm-stage의 --hm-air-* 변수로 정한다.
   * 드론 바닥 hover zone: 가는 기준 원 + 천천히 도는 점선 원 + 얇은 리플 3개. 원경 산맥 3겹(아주 느린 drift) · 150m 위 옅은 공역 천장 band.
   * 같은 rAF 루프에서 30fps, 점은 색·투명도 구간별 Path2D로 일괄. 좁은 화면은 점·건물·라벨 수를 줄인다. CDN 없이 동작. */
  function create(options = {}) {
    const reduce = options.reducedMotion || global.matchMedia("(prefers-reduced-motion: reduce)");
    const motionOn = options.isMotionOn || (() => true);
    const HC = 100, LIMIT = 150, Z_DRONE = 300, VIS = 1.55;              // VIS: 점군·선 가시성 배율(1.4 → 1.55)
    let cv = null, ctx = null, stage = null, W = 0, H = 0, dpr = 1, lite = false;
    let simT = 26000, lastDraw = -1e9, dirty = true, col = null;
    let drone = null, panels = [], react = null, scanStart = 5200, scanDur = 3400;
    const focus = { k: 1, x: 0, s: 1 };                                       // 드론 바닥 hover zone: 세기(진입·비행 중 약하게) · 가로 위치(드론 아래) · 크기(다가올수록 커짐)
    let layers = [];
    const hooks = (name) => layers.filter((l) => l.on && l[name]);
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
      for (const l of hooks("slot")) l.slot(sl, col);                            // 테마 레이어별 생애 조정(주간: 더 느리고 부드럽게)
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
    // 테마 레이어 생성: 공유 seed 난수를 원래 순서(산맥 다음)대로 이어서 쓴다 → 등록된 레이어가 같으면 절차 생성 결과가 같다
    layers = LAYERS.map((L) => ({ name: L.name, on: true, ...L.create({ rnd, lr, sm, band, LIMIT }) }));

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
        day: g("--hm-air-mode", "night") === "day", lw: g("--hm-air-lw", "500"), blend: g("--hm-air-blend", "source-over") };
    }
    function resize() {
      if (!stage || !cv) return;
      const w = stage.clientWidth, h = stage.clientHeight; if (!w || !h) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2); lite = w < 700;
      if (w !== W || h !== H || cv.width !== Math.round(w * dpr)) { W = w; H = h; cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
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
      const rm = reduce.matches, t = simT, k = col.k * VIS, shimA = rm ? 0 : col.shim;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, W, H);
      const cx = drone ? drone.cx : W / 2, cy = drone ? drone.cy : H / 2, yh = H * 0.44, F = H * 1.0, uX = (u, Z) => u * Z * (W / 2) / F;
      const P = (X, Y, Z) => [cx + (X / Z) * F, yh + ((HC - Y) / Z) * F];
      const edgeA = (x, y) => sm(Math.min(x, W - x) / (W * 0.08)) * sm(y / (H * 0.12));
      const depthA = (Z, ref) => Math.min(1, Math.pow(ref / Z, col.fog));       // 근경 선명 → 원경 약하게(라이트는 원근 안개가 더 강하다)
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
      // 테마 레이어에 넘기는 프레임 문맥(투영·그리기 도구·라벨 목록)
      const f = { ctx, col, W, H, t, tD, rm, k, lite, yh, F, P, uX, edgeA, depthA, add, line, shade, inPanel, inDrone, labels, sm, ridgePts: null };

      for (const l of hooks("sky")) l.sky(f);                                   // 하늘(야간: 별)
      // 0. 원경 산맥 3겹(먼 것부터) — 라이트: 대기 원근(뒤 레이어일수록 밝고 흐림) / 다크: 옅은 능선 윤곽
      const ridgePts = RIDGES.filter((L) => !lite || L.i > 0).map((L) => {
        const pts = []; for (let x = -12; x <= W + 12; x += 6) { const X = (x - cx) * L.Z / F; pts.push(P(X, ridgeH(L, X, tD), L.Z)); }
        return { L, pts, base: P(0, 0, L.Z)[1] };
      });
      f.ridgePts = ridgePts;
      for (const { L, pts, base } of ridgePts) {
        const near = (L.i + 1) / 3, poly = pts.concat([[W + 12, base + 2], [-12, base + 2]]);
        const gr = ctx.createLinearGradient(0, Math.min(...pts.map((p) => p[1])), 0, base);
        gr.addColorStop(0, `rgba(${col.ridge},${col.ridgeFill * (0.45 + 0.55 * near)})`); gr.addColorStop(1, `rgba(${col.ridge},${col.ridgeFill * (0.2 + 0.3 * near)})`);
        ctx.fillStyle = gr; ctx.beginPath(); ctx.moveTo(poly[0][0], poly[0][1]); for (const p of poly) ctx.lineTo(p[0], p[1]); ctx.closePath(); ctx.fill();
        line(pts, "ridge", (0.07 + 0.08 * near) * col.ridgeLine);
        for (let i = 2; i < pts.length; i += lite ? 4 : 2) { const [x, y] = pts[i]; add(x, y + ((i * 7) % 5), (0.07 + 0.08 * near) * col.ridgeLine, "ridge", 1.2, i * 1.3 + L.i); }
      }
      for (const l of hooks("ground")) l.ground(f);                             // 지면 면(주간: 잔디 그라데이션)
      // 지평선 대기층(라이트: white mist / 다크: 옅은 navy haze)
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
      const groundMasks = hooks("skipGroundPoint");
      for (let Z = 240; Z < 2500; Z *= lite ? 1.2 : 1.13) for (let X = -Z * 1.7; X <= Z * 1.7; X += Z * (lite ? 0.18 : 0.12)) {
        if (groundMasks.some((l) => l.skipGroundPoint(f, X, Z))) continue;      // 레이어가 비워 둔 지면(주간: 수면 위)
        const [x, y] = P(X, groundH(X, Z), Z); add(x, y, 0.15 * Math.min(1, 600 / Z) * col.groundPts, "mesh", 1.4); }   // 주간: 지면 점 옅게(격자 느낌 완화)

      for (const l of hooks("water")) l.water(f);                               // 수면(주간: 강·반사·반짝임)

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

      // B. 슬롯 객체 + 레이어 객체(먼 것부터)
      for (const sl of slots) { if (!rm && t > sl.born + sl.life) fill(sl, t); }
      const items = [], slotMasks = hooks("skipSlot");
      for (const sl of slots) {
        if (!rm && t < sl.born) continue;
        if (lite && sl.idx % 3 === 1) continue;                                  // 좁은 화면: 객체 수 줄임
        if (slotMasks.some((l) => l.skipSlot(f, sl))) continue;                  // 레이어가 비워 둔 구간(주간: 강·교량)
        const rp = rm ? 1 : sm((t - sl.born) / sl.rise), fp = rm ? 0 : sm((t - (sl.born + sl.life - sl.fade)) / sl.fade);
        for (const it of sl.items) items.push({ sl, it, rp, fp, Z: sl.z + it.dz });
      }
      for (const l of hooks("items")) l.items(f, (entry) => items.push(entry));  // 레이어 객체(주간: 교량) — { it, Z, rp, fp, draw(f, it, Z) }
      const placers = hooks("placeBuilding");
      items.sort((a, b) => b.Z - a.Z);
      for (const { sl, it, rp, fp, Z, draw: drawItem } of items) {
        if (drawItem) drawItem(f, it, Z);
        else if (it.obj === "land") {
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
          for (const l of placers) Xc = l.placeBuilding(f, it, Z, Xc);           // 레이어 배치 보정(주간: 건물은 강변으로 비켜 선다)
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
      // 고도 라벨: 슬롯 순서(안정적) 기준 최대 6개(좁은 화면 4개) + 150 m 기준선 라벨. 레이어 객체(교량)는 남는 자리에만
      ctx.font = `${col.lw} 10px Pretendard, sans-serif`; ctx.textBaseline = "middle";
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
      const moving = !reduce.matches && motionOn();
      if (moving) simT += dt * 1000;
      if ((moving && now - lastDraw >= 32) || dirty || react) { lastDraw = now; draw(now); }
    }
    new MutationObserver(() => { if (stage) { readColors(); dirty = true; } }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme"] });
    const setFocus = (k, x, sc = 1) => { if (Math.abs(k - focus.k) > 0.01 || Math.abs(x - focus.x) > 0.5 || Math.abs(sc - focus.s) > 0.01) { focus.k = k; focus.x = x; focus.s = sc; dirty = true; } };
    const setLayerEnabled = (name, on) => { const l = layers.find((q) => q.name === name); if (l && l.on !== !!on) { l.on = !!on; dirty = true; } };
    return { mount, resize, setDrone, setPanels, flightReact, setFocus, tick, setLayerEnabled, markDirty: () => { dirty = true; } };
  }

  global.DroneAirspace = { registerLayer, create };
})(window);
