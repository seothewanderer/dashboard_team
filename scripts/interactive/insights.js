/* insights.js — 그래프 해설의 '주요 수치'(analytics/insights.py를 그대로 옮김, 요청 AE2·AF1).
 * 그래프에 실제로 그려진 표([열 이름, 행...])에서 지금 조건 기준으로 계산한 짧은 문장. 해석(좋다·나쁘다)은 하지 않는다.
 * spec = content.chart_explain.EXPLAIN[...].insight, cols = 표의 열 위치. */
"use strict";

const INS = {};
INS.MIN_BASE = 5;   // 방산 비중 비교는 전체가 이 값 이상인 항목만(한두 개짜리 100% 방지)

INS.pct = (a, b) => { const p = b ? a / b * 100 : 0; return p >= 10 || p === 0 ? `${p.toFixed(0)}%` : `${p.toFixed(1)}%`; };
const insNum = (v) => fmt(v, Number.isInteger(v) ? 0 : 1);
const insSum = (rows, i) => rows.reduce((a, r) => a + (+r[i] || 0), 0);

INS.rank = (rows, ni, vi, spec, n) => {
  const unit = spec.unit || "", label = spec.label || "항목";
  const d = rows.map((r, k) => [r, k]).sort((a, b) => b[0][vi] - a[0][vi] || a[1] - b[1]).map(([r]) => r).filter((r) => r[vi] > 0);
  if (!d.length) return [];
  const v = d[0][vi], tops = d.filter((r) => r[vi] === v).map((r) => String(r[ni]));   // 같은 값이면 함께(공동 1위)
  const out = [`가장 많은 ${label}: ${tops.join(" · ")} ${tops.length > 1 ? "각 " : ""}${insNum(v)}${unit}`];
  if (spec.overlap) { if (n) out[0] += ` (표본 ${fmt(n)}${unit} 중 ${INS.pct(v, n)})`; }   // 한 대상이 여러 항목 → 표본 기준
  else if (d.length >= 3) { const t3 = d.slice(0, 3);
    out.push(`상위 3개(${t3.map((r) => r[ni]).join(" · ")}): 전체의 ${INS.pct(insSum(t3, vi), insSum(d, vi))}`); }
  const rest = d.filter((r) => r[vi] < v);
  if (rest.length) out.push(`${label} ${d.length}개 중 그다음: ${rest[0][ni]} ${insNum(rest[0][vi])}${unit}`);
  return out;
};

INS.bestShare = (rows, ni, pi, ti, spec, what) => {
  const d = rows.filter((r) => r[ti] >= INS.MIN_BASE);
  if (!d.length || !insSum(d, pi)) return null;
  let best = d[0];
  d.forEach((r) => { if (r[pi] / r[ti] > best[pi] / best[ti]) best = r; });
  return `${what} 비중이 가장 높은 ${spec.label || "항목"}: ${best[ni]} (${insNum(best[pi])}/${insNum(best[ti])}${spec.unit || ""}, ${INS.pct(best[pi], best[ti])})`;
};

INS.insights = (table, spec, n) => {
  if (!table || !spec) return [];
  const rows = table[1];
  if (!rows || !rows.length) return [];
  const kind = spec.kind;
  if (kind === "rank") { const [i, j] = spec.cols || [0, 1]; return INS.rank(rows, i, j, spec, n); }
  if (kind === "overlay") {                // [이름, 전체, 그중 방산]
    const out = INS.rank(rows, 0, 1, spec, n), best = INS.bestShare(rows, 0, 2, 1, spec, spec.part || "방산 관련");
    return best ? [...out, best] : out;
  }
  if (kind === "split") {                  // [이름, 방산, 그 외, 합계]
    const out = INS.rank(rows, 0, 3, spec, n);
    if (out.length) {
      const tot = insSum(rows, 3), part = insSum(rows, 1), u = spec.unit;
      out[0] += ` (전체의 ${INS.pct(Math.max(...rows.map((r) => r[3])), tot)})`;
      out.push(`방산 관련 기업 공고: 전체 ${fmt(tot)}${u} 중 ${fmt(part)}${u}(${INS.pct(part, tot)})`);
      const best = INS.bestShare(rows, 0, 1, 3, spec, "방산 관련 기업 공고");
      if (best) out.push(best);
    }
    return out;
  }
  if (kind === "years") {                  // cols = (연도, 방산, 합계) 열 위치
    const [y, dp, tt] = spec.cols || [0, 1, 3], u = spec.unit || "";
    const d = [...rows].sort((a, b) => a[y] - b[y]);
    if (!insSum(d, tt)) return [];
    let peak = d[0]; d.forEach((r) => { if (r[tt] > peak[tt]) peak = r; });
    const out = [`과제 시작이 가장 많은 해: ${peak[y]}년 ${fmt(peak[tt])}${u}`,
      `전체 ${fmt(insSum(d, tt))}${u} 중 방산 태그 ${fmt(insSum(d, dp))}${u}(${INS.pct(insSum(d, dp), insSum(d, tt))})`];
    const busy = d.filter((r) => r[tt] >= INS.MIN_BASE);
    if (busy.length && insSum(busy, dp)) { let hi = busy[0]; busy.forEach((r) => { if (r[dp] / r[tt] > hi[dp] / hi[tt]) hi = r; });
      out.push(`방산 태그 비중이 가장 높은 해: ${hi[y]}년 (${INS.pct(hi[dp], hi[tt])})`); }
    return out;
  }
  if (kind === "network") {                // [대분류, 중분류, 직무 수]
    const m = {}; rows.forEach((r) => { m[r[0]] = (m[r[0]] || 0) + r[2]; });
    const majors = Object.entries(m).sort((a, b) => b[1] - a[1]);
    if (!majors.length) return [];
    const total = majors.reduce((a, [, v]) => a + v, 0), last = majors[majors.length - 1];
    return [`현재 조건 직무 ${fmt(total)}개 · 대분류 ${majors.length}개 · 중분류 ${uniq(rows.map((r) => r[1])).length}개`,
      `직무가 가장 많은 대분류: ${majors[0][0]} ${fmt(majors[0][1])}개(${INS.pct(majors[0][1], total)})`,
      `가장 적은 대분류: ${last[0]} ${fmt(last[1])}개`];
  }
  return [];
};
