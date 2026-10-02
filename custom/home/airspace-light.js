/* =========================================================
   Light Airspace — daylight layer for Airspace Core
   Adds the grass/ground gradient, the river (water, banks, ridge
   and bridge reflections, glints), two bridges (arch · cable-stayed)
   with altitude labels, slower slot transitions, and river-aware
   placement. The daylight palette lives in airspace-light.css.
   Active while the stage palette sets --hm-air-mode: day
   (ground gradient: --hm-air-ground-a > 0).
   Requires: airspace-core.js (DroneAirspace) loaded first.
   ========================================================= */
(function (global) {
  "use strict";
  if (!global.DroneAirspace) return;

  global.DroneAirspace.registerLayer({
    name: "light",
    create({ rnd, lr, sm, band }) {
      /* ---- 강(수면, 주간 전용): 원경에서 근경으로 좁아지며 다가오는 물길(한쪽 측면, seed로 좌/우·굴곡 결정) + 교량 2개(아치 · 사장교) ---- */
      const RIV = { u: (rnd() < 0.5 ? -1 : 1) * lr(0.44, 0.56), ph: rnd() * 6.28, amp: lr(0.05, 0.08) };
      const riverU = (Z) => RIV.u + RIV.amp * Math.sin(Z / 380 + RIV.ph) * Math.min(1, Z / 900);
      const riverW = (Z) => 62 + 0.07 * Z;
      const BRIDGES = [{ Z: lr(560, 680), kind: "arch", h: lr(50, 64), ph: rnd() * 6.28 }, { Z: lr(1350, 1650), kind: "cable", h: lr(62, 96), ph: rnd() * 6.28 }]
        .map((b) => ({ ...b, obj: "bridge", band: band(b.h) }));
      const rX = (f, Z) => f.uX(riverU(Z), Z);
      // 교량 형상(월드 X·Y, 같은 Z): 선 [{p, a}] · 점 [[X, Y, tw, a]] · 꼭대기(라벨). 그리기와 수면 반사가 함께 쓴다
      const bridgeShape = (f, b) => { const Z = b.Z, xr = rX(f, Z), half = riverW(Z) / 2 + 30, x0 = xr - half, x1 = xr + half, deck = 12, Ls = [], Ds = [];
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
      // 교량 그리기(깊이 정렬된 객체 목록 안에서 호출)
      const drawBridge = (f, it, Z) => {
        const { P, rm, t, depthA, line, add, labels } = f;
        const da = depthA(Z, 1300) * (rm ? 1 : 0.9 + 0.1 * Math.sin(t / 6000 + it.ph)), c = it.band, sh = bridgeShape(f, it);
        for (const l of sh.Ls) line(l.p.map(([X, Y]) => P(X, Y, Z)), c, l.a * 1.35 * da);
        for (const [X, Y, tw, a] of sh.Ds) { const [x, y] = P(X, Y, Z); add(x, y, a * 1.25 * da, c, 1.6, tw); }
        const [px, py] = P(sh.top[0], sh.top[1], Z), [, gy] = P(sh.top[0], 0, Z);
        labels.push({ id: 1000 + Z, x: px, y: py, gy, h: it.h, c, a: 1 });
      };

      return {
        slot(sl, col) { if (col && col.day) { sl.rise *= 1.3; sl.fade *= 1.3; sl.life = Math.max(sl.life, sl.rise + sl.fade + 2000); } },   // 주간: 더 느리고 부드럽게
        // 주간 지면: 격자 대신 연한 녹색~청록 그라데이션 + 원근으로 좁아지는 아주 옅은 잔디 띠(그래픽적인 지면감). 지평선은 대기층이 부드럽게 덮는다
        ground({ ctx, col, W, H, P }) {
          if (!(col.groundA > 0)) return;
          const g0 = P(0, 0, 2600)[1];
          const gr = ctx.createLinearGradient(0, g0, 0, H); gr.addColorStop(0, `rgba(${col.ground},0)`); gr.addColorStop(0.18, `rgba(${col.ground},${col.groundA * 0.55})`);
          gr.addColorStop(0.6, `rgba(${col.groundB},${col.groundA * 0.85})`); gr.addColorStop(1, `rgba(${col.groundB},${col.groundA})`);
          ctx.fillStyle = gr; ctx.fillRect(0, g0, W, H - g0);
          for (let Z = 240, i = 0; Z < 2400; Z *= 1.22, i++) { if (i % 2) continue;
            const y0 = P(0, 0, Z * 1.22)[1], y1 = P(0, 0, Z)[1]; ctx.fillStyle = `rgba(${col.groundB},${(0.045 * Math.min(1, 700 / Z)).toFixed(3)})`; ctx.fillRect(0, y0, W, y1 - y0); }
        },
        skipGroundPoint: (f, X, Z) => f.col.day && Math.abs(X - rX(f, Z)) < riverW(Z) / 2,   // 수면 위에는 지면 점 없음(주간)
        // 강(수면, 주간 전용): 옅은 수면 + 강변 선 + 원경 능선·교량 반사 + 흔들리는 반짝임. 근경 끝은 부드럽게 사라진다. 야간에는 그리지 않는다
        water(f) {
          const { ctx, col, P, rm, t, k, lite, depthA, line, edgeA, inPanel, ridgePts } = f;
          if (!col.day) return;
          const zs = []; for (let Z = 2500; Z > 255; Z /= 1.05) zs.push(Z);
          const Lb = zs.map((Z) => P(rX(f, Z) - riverW(Z) / 2, 0, Z)), Rb = zs.map((Z) => P(rX(f, Z) + riverW(Z) / 2, 0, Z));
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
            for (const l of bridgeShape(f, b).Ls) line(l.p.map(([X, Y]) => P(X, -Y, b.Z)), b.band, l.a * 0.5 * da); });
          ctx.restore();
          ctx.strokeStyle = wg(Math.min(0.45, col.waterA * 2.6 * k)); ctx.beginPath();
          [Lb, Rb].forEach((B) => B.forEach(([x, y], i) => (i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)))); ctx.stroke();
          const nG = lite ? 34 : 64;
          for (let i = 0; i < nG; i++) {
            const Z = 280 * Math.pow(2400 / 280, i / nG), hsh = Math.sin(i * 12.9898) * 43758.5453, fr = hsh - Math.floor(hsh), w = riverW(Z);
            const X = rX(f, Z) + (fr - 0.5) * w * 0.74, len = w * (0.05 + 0.1 * ((fr * 7.3) % 1));
            const tw = rm ? 0.6 : 0.5 + 0.5 * Math.sin(t / 650 + i * 1.7), [x1, y] = P(X - len / 2, 0, Z), [x2] = P(X + len / 2, 0, Z);
            const a = 0.2 * tw * Math.min(1, Math.pow(700 / Z, 0.5)) * sm((Z - 300) / 420) * edgeA(x1, y) * (inPanel(x1, y) ? 0.25 : 1) * k;
            if (a < 0.015) continue; ctx.strokeStyle = `rgba(${col.glint},${Math.min(0.5, a)})`; ctx.beginPath(); ctx.moveTo(x1, y + 0.5); ctx.lineTo(x2, y + 0.5); ctx.stroke();
          }
        },
        skipSlot: (f, sl) => f.col.day && Math.abs(sl.u - riverU(sl.z)) < 0.16,   // 주간: 강·교량 구간은 비워 수면과 교량이 읽히게
        items(f, push) { if (f.col.day) BRIDGES.forEach((b, i) => { if (!f.lite || i === 0) push({ it: b, Z: b.Z, rp: 1, fp: 0, draw: drawBridge }); }); },   // 교량: 주간 전용
        placeBuilding(f, it, Z, Xc) {                                              // 주간: 건물은 강변으로 비켜 선다
          if (!f.col.day) return Xc;
          const xr = rX(f, Z), need = riverW(Z) / 2 + it.w / 2 + 8;
          return Math.abs(Xc - xr) < need ? xr + (Xc >= xr ? 1 : -1) * need : Xc;
        },
      };
    },
  });
})(window);
