/* =========================================================
   Drone Reactions — shared attitude-reaction profiles
   Renderer-agnostic pose effects for any drone (3D Drone Hero,
   2D roadmap drone). An effect is a function (now) → pose | null:
     { roll }  degrees, + = left wing down (bank left)
     { rpm }   relative rotor boost (0.1 = +10 %)
   null means the effect has finished. Effects never move the
   drone or change its height — attitude only.
   ========================================================= */
(function (global) {
  "use strict";

  const smooth = (a, b, x) => { const k = Math.max(0, Math.min(1, (x - a) / (b - a))); return k * k * (3 - 2 * k); };

  /* impact: 충격을 받은 것처럼 제자리에서 크게 한쪽으로 롤 → 반대로 한 번 작게 넘어갔다 → 자세 복구 → 안정 hover
   * 감쇠 진동(impulse response): e^(-k·t)·sin(ω·t), 첫 정점이 angle이 되도록 정규화. 끝부분은 smoothstep으로 0에 정확히 수렴 */
  function impact({ direction = "left", angle = 26, duration = 1400, rpmBoost = 0.12, start = performance.now() } = {}) {
    const k = 4.2, w = 2 * Math.PI / 0.72;
    const tPeak = Math.atan(w / k) / w, peak = Math.exp(-k * tPeak) * Math.sin(w * tPeak);
    const sign = direction === "left" ? 1 : -1, dur = duration / 1000;
    return (now) => {
      const t = (now - start) / 1000;
      if (t >= dur) return null;
      if (t <= 0) return { roll: 0, rpm: 0 };
      const end = 1 - smooth(dur * 0.72, dur, t);
      return { roll: sign * angle * (Math.exp(-k * t) * Math.sin(w * t) / peak) * end, rpm: rpmBoost * Math.exp(-3 * t) * end };
    };
  }

  global.DroneReactions = { impact };
})(window);
