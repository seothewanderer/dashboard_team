/* =========================================================
   Dark Airspace — night layer for Airspace Core
   Adds the night sky (sparse stars, slow twinkle) above the far
   ridges. The night palette itself lives in airspace-dark.css.
   Active while the stage palette sets --hm-air-star-a > 0.
   Requires: airspace-core.js (DroneAirspace) loaded first.
   ========================================================= */
(function (global) {
  "use strict";
  if (!global.DroneAirspace) return;

  global.DroneAirspace.registerLayer({
    name: "dark",
    create() {
      /* 야간 별: 상단 하늘에만, 밀도·밝기 낮게(우주 배경이 아니라 야간 공역의 깊이 보조). 별 일부만 아주 느리게 미세 반짝임. 고정 seed */
      const STARS = (() => { let q = 7331; const r = () => { q = (q * 16807) % 2147483647; return q / 2147483647; };
        return Array.from({ length: 118 }, () => ({ u: r(), v: Math.pow(r(), 1.3), sz: r() < 0.1 ? 1.5 + r() * 0.6 : 0.7 + r() * 0.5, a: 0.32 + Math.pow(r(), 1.6) * 0.5, tw: r() < 0.3 ? 2600 + r() * 2600 : 0, ph: r() * 6.28 })); })();   // 대부분 아주 작게, 10%만 조금 크게(옅은 halo)
      return {
        // 별(야간 전용): 원경 산맥보다 위 하늘에만. 드론·패널 영역은 건너뜀
        sky({ ctx, col, W, H, t, rm, lite, yh, sm, inDrone, inPanel }) {
          if (!(col.starA > 0)) return;
          const top = H * 0.03, bot = yh - H * 0.15, n = lite ? 60 : STARS.length;
          for (let i = 0; i < n; i++) { const S_ = STARS[i], x = S_.u * W, y = top + S_.v * (bot - top);
            if (inDrone(x, y) || inPanel(x, y, 6)) continue;
            const a = col.starA * S_.a * (S_.tw && !rm ? 0.82 + 0.18 * Math.sin(t / S_.tw + S_.ph) : 1) * sm(Math.min(x, W - x) / (W * 0.06)) * (1 - 0.45 * S_.v);
            if (a < 0.01) continue; ctx.fillStyle = `rgba(${col.star},${Math.min(0.9, a)})`; ctx.fillRect(x - S_.sz / 2, y - S_.sz / 2, S_.sz, S_.sz);
            if (S_.sz > 1.4) { ctx.fillStyle = `rgba(${col.star},${Math.min(0.9, a) * 0.16})`; ctx.beginPath(); ctx.arc(x, y, S_.sz * 1.9, 0, Math.PI * 2); ctx.fill(); } }
        },
      };
    },
  });
})(window);
