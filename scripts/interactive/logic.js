/* logic.js — analytics/ 계산 규칙을 그대로 옮김. 같은 입력이면 Streamlit 앱과 같은 수치가 나와야 한다.
 * (common.py · companies.py · postings.py · jobs.py · learning.py) */
"use strict";

const L = {};

/* ---------------- common.py ---------------- */
L.splitTags = (text, sep = ";") => (typeof text === "string" ? text.split(sep).map((t) => t.trim()).filter(Boolean) : []);
L.applyFilters = (rows, filters, exclude) => rows.filter((r) =>
  Object.entries(filters).every(([col, vals]) => col === exclude || !vals || !vals.length || vals.includes(r[col])));
L.counts = (rows, dim, idCol, order) => {
  const m = new Map();
  rows.forEach((r) => { if (r[dim] == null) return; if (!m.has(r[dim])) m.set(r[dim], new Set()); m.get(r[dim]).add(r[idCol]); });
  const out = [...m].map(([k, s]) => ({ key: k, n: s.size }));
  if (order) return order.map((k) => ({ key: k, n: (out.find((o) => o.key === k) || { n: 0 }).n }));
  return out.sort((a, b) => b.n - a.n || cmp(a.key, b.key));
};
L.countsExcludingSelf = (rows, dim, idCol, filters, order) => L.counts(L.applyFilters(rows, filters, dim), dim, idCol, order);
L.paginate = (rows, no, size = 10) => {
  const last = Math.max(0, Math.floor((rows.length - 1) / size));
  const p = Math.max(0, Math.min(no, last));
  return [rows.slice(p * size, (p + 1) * size), rows.length, p, last];
};
L.mentions = (text, terms) => {
  const low = String(text || "").toLowerCase(), out = [];
  terms.forEach((term) => {
    const t = term.toLowerCase();
    let hit;
    if (/^[0-9a-z+#/.\- ]+$/.test(t)) {
      const re = new RegExp(`(?<![0-9a-z])${t.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![0-9a-z])`);
      hit = re.test(low);
    } else hit = low.includes(t);
    if (hit) out.push(term);
  });
  return out;
};
L.synonymGroups = () => {
  const g = {};
  Object.entries(D.synonyms).forEach(([alias, sid]) => { (g[sid] = g[sid] || new Set()).add(alias); });
  return g;
};
L.skillMentions = (text, skills) => {
  const groups = L.synonymGroups();
  return skills.filter((s) => L.mentions(text, [s, ...[...(groups[D.synonyms[s.toLowerCase()]] || [])].sort()]).length);
};

/* ---------------- defense.py ---------------- */
L.TIER = D.defense.tier;
L.GROUP_ORDER = D.defense.group_order;
L.isDefense = (group) => !!L.TIER[group];

/* ---------------- companies.py ---------------- */
L.NO_AREA = "분야 미수록";
L.areaLong = (companies) => companies.flatMap((c) => (c.areas.length ? c.areas : [L.NO_AREA]).map((a) => ({ id: c.company_id, area: a })));
L.keywordTier = (c, keyword) => {
  const kw = keyword.trim().toLowerCase();
  const tags = new Set([...c.areas, ...L.splitTags(c.drone_subfields), ...L.splitTags(c.drone_subfields, "/")].map((t) => t.toLowerCase()));
  if (tags.has(kw)) return 0;
  const text = [c.company_name_normalized, c.company_name_variants, c.main_business_areas, c.products_services,
    c.drone_subfields].map((v) => v || "").join(" ").toLowerCase();
  return text.includes(kw) ? 1 : null;
};
L.filterCompanies = (companies, f, exclude) => {
  let out = companies.filter((c) => {
    if (f.area.length && exclude !== "area" && !(c.areas.length ? c.areas : [L.NO_AREA]).some((a) => f.area.includes(a))) return false;
    if (f.defense_group.length && exclude !== "defense_group" && !f.defense_group.includes(c.defense_group)) return false;
    if (f.has_posting && exclude !== "has_posting" && !c.has_posting) return false;
    return true;
  });
  if (f.keyword.trim() && exclude !== "keyword") {
    out = out.map((c) => ({ ...c, match_tier: L.keywordTier(c, f.keyword) })).filter((c) => c.match_tier !== null);
  }
  return out;
};
L.areaCounts = (companies, f) => {
  const base = new Set(L.filterCompanies(companies, f, "area").map((c) => c.company_id));
  return L.counts(L.areaLong(companies).filter((r) => base.has(r.id)), "area", "id");
};
L.groupCounts = (companies, f) => {
  const base = L.filterCompanies(companies, f, "defense_group");
  return L.GROUP_ORDER.map((g) => ({ key: g, n: base.filter((c) => c.defense_group === g).length }));
};
L.sortCompanies = (rows, f, mode) => {
  if (mode === "name" || !(f.area.length || f.keyword.trim())) return [...rows].sort(by("company_name_normalized"));
  const rank = Object.fromEntries(L.GROUP_ORDER.map((g, i) => [g, i]));
  return [...rows].sort((a, b) => rank[a.defense_group] - rank[b.defense_group] || (a.match_tier || 0) - (b.match_tier || 0)
    || cmp(a.company_name_normalized, b.company_name_normalized));
};
L.isSortedByDefense = (f, mode) => mode !== "name" && !!(f.area.length || f.keyword.trim());
L.companyGoalReason = (c, jobId) => {
  const areas = new Set(D.applicationBridge.filter((r) => r.job_id === jobId && r.review_status !== "rejected").map((r) => r.application_id));
  const hit = c.areas.filter((a) => areas.has(a)).sort();
  return hit.length ? "사업 분야 " + hit.slice(0, 2).join(", ") : null;
};

/* ---------------- postings.py ---------------- */
L.CAREER_ORDER = ["신입", "신입·경력", "경력", "무관", "불명"];
L.EDUCATION_ORDER = ["고졸", "초대졸", "대졸", "석사", "학력무관", "불명"];
L.EDU_RANK = { 고졸: 0, 초대졸: 1, 대졸: 2, 석사: 3 };
L.MATCH = "입력 조건과 부합"; L.CHECK = "확인 필요"; L.DIFF = "입력값과 차이"; L.NO_INPUT = "사용자 미입력"; L.NO_POSTING = "공고 미확인";
L.DEF_KIND = "방산 관련 기업"; L.GEN_KIND = "그 외 연결 기업"; L.UNLINKED_KIND = "기업 미연결";
L.KIND_ORDER = [L.DEF_KIND, L.GEN_KIND, L.UNLINKED_KIND];
L.UNLINKED = "기업 미연결";
L.RELATION_LABEL = { direct: "직접 연결", adjacent: "인접 분류", broad: "넓은 후보" };

L.filterPostings = (rows, filters, companyIds) => {
  const out = L.applyFilters(rows, filters);
  return companyIds && companyIds.length ? out.filter((p) => companyIds.includes(p.company_id)) : out;
};
L.dimCounts = (rows, dim, filters, order) => L.countsExcludingSelf(rows, dim, "posting_id", filters, order);
L.kpis = (rows) => ({ postings: uniq(rows.map((p) => p.posting_id)).length, employer_names: uniq(rows.map((p) => p.employer_name)).length,
  linked: rows.filter((p) => p.company_id != null).length });
L.defenseKind = (p) => (L.isDefense(p.defense_group) ? L.DEF_KIND : p.defense_group === L.UNLINKED ? L.UNLINKED_KIND : L.GEN_KIND);
L.jobByDefense = (rows, filters) => {
  const f = { ...filters }; delete f.job_major_category;
  const base = L.applyFilters(rows, f), m = {};
  base.forEach((p) => { const r = (m[p.job_major_category] = m[p.job_major_category] || { key: p.job_major_category, [L.DEF_KIND]: new Set(), [L.GEN_KIND]: new Set(), [L.UNLINKED_KIND]: new Set() });
    r[L.defenseKind(p)].add(p.posting_id); });
  return Object.values(m).map((r) => { const o = { key: r.key }; L.KIND_ORDER.forEach((k) => { o[k] = r[k].size; });
    o.total = o[L.DEF_KIND] + o[L.GEN_KIND] + o[L.UNLINKED_KIND]; return o; })
    .sort((a, b) => b.total - a.total || b[L.DEF_KIND] - a[L.DEF_KIND] || cmp(a.key, b.key));
};
L.jobShareByDefense = (rows) => {
  const def = rows.filter((p) => L.defenseKind(p) === L.DEF_KIND), other = rows.filter((p) => L.defenseKind(p) !== L.DEF_KIND);
  const share = (part) => { const n = Math.max(uniq(part.map((p) => p.posting_id)).length, 1), m = {};
    L.counts(part, "job_major_category", "posting_id").forEach((c) => { m[c.key] = Math.round(c.n / n * 1000) / 10; }); return m; };
  const sd = share(def), so = share(other);
  const keys = uniq([...Object.keys(sd), ...Object.keys(so)]);
  const out = keys.map((k) => ({ key: k, defense: sd[k] || 0, other: so[k] || 0 }))
    .sort((a, b) => b.defense - a.defense || b.other - a.other || cmp(a.key, b.key));
  return [out, uniq(def.map((p) => p.posting_id)).length, uniq(other.map((p) => p.posting_id)).length];
};
L.jobCareerMatrix = (rows) => {
  const jobs = uniq(rows.map((p) => p.job_major_category)).sort(cmp);
  return { index: jobs, columns: L.CAREER_ORDER, values: jobs.map((j) => L.CAREER_ORDER.map((c) =>
    uniq(rows.filter((p) => p.job_major_category === j && p.career_type === c).map((p) => p.posting_id)).length)) };
};
L.employmentTagCounts = (rows) => L.counts(rows.flatMap((p) => (p.employment_types || []).map((t) => ({ t, id: p.posting_id }))), "t", "id");
L.compareToProfile = (p, profile) => {
  const out = [];
  let edu = p.education_normalized, mine = profile.education, st;
  if (edu === "불명") st = L.NO_POSTING; else if (edu === "학력무관") st = L.MATCH; else if (!mine) st = L.NO_INPUT;
  else st = (L.EDU_RANK[mine] ?? -1) >= (L.EDU_RANK[edu] ?? 99) ? L.MATCH : L.DIFF;
  out.push(["학력", edu, mine || "", st, p.education_raw]);
  const career = p.career_type; mine = profile.career_type;
  if (career === "불명") st = L.NO_POSTING; else if (career === "무관" || career === "신입·경력") st = L.MATCH;
  else if (!mine) st = L.NO_INPUT; else if (career === "신입") st = mine === "신입" ? L.MATCH : L.CHECK;
  else st = mine === "경력" ? L.CHECK : L.DIFF;
  out.push(["경력", career, mine || "", st, p.career_requirement_raw]);
  const regions = profile.regions || [];
  st = !regions.length ? L.NO_INPUT : regions.includes(p.province_name) ? L.MATCH : L.DIFF;
  out.push(["근무 지역", p.province_name, regions.join(", "), st, p.original_location]);
  return out;
};
L.filterByProfile = (rows, profile) => {
  if (!(profile.education || profile.career_type || (profile.regions || []).length)) return rows;
  return rows.filter((p) => !L.compareToProfile(p, profile).some((r) => r[3] === L.DIFF));
};
L.withRaw = (v, raw) => (isStr(raw) && raw !== v ? `${v} · ${raw}` : v);
L.compareToJob = (job, posts) => {
  const rel = Object.fromEntries(D.categoryBridge.filter((r) => r.job_id === job.job_id && r.review_status !== "rejected")
    .map((r) => [r.job_major_category, r.relation_type]));
  const vocab = D.postingKw.map((k) => k.keyword_normalized);
  const index = ["공고 직무 분류", `직무 중분류(${job.middle_category})와의 관계`, "직무 기술 중 공고에 언급", "공고에 언급 안 된 직무 기술",
    "공고 본문의 공고 키워드", "경력(원문)", "학력(원문)", "근무 지역", "확인한 본문"];
  const cols = posts.map((p) => {
    const body = isStr(p.responsibilities) ? p.responsibilities : "", text = `${p.title} ${body}`;
    const said = L.skillMentions(text, job.skills), kws = L.mentions(text, vocab), r = rel[p.job_major_category];
    return { head: `${p.title} (${p.employer_name})`, vals: [p.job_major_category,
      r ? `${L.RELATION_LABEL[r]} (관계표 초안)` : "연결 없음 (관계표 초안)", said.join(", ") || "언급 없음",
      job.skills.filter((s) => !said.includes(s)).join(", ") || "—", kws.join(", ") || "없음",
      L.withRaw(p.career_type, p.career_requirement_raw), L.withRaw(p.education_normalized, p.education_raw),
      `${p.province_name} ${p.district_name || ""}`.trim(), body ? "제목·담당 업무" : "제목만(담당 업무 원문 없음)"] };
  });
  return { header: ["항목", ...cols.map((c) => c.head)], rows: index.map((label, i) => [label, ...cols.map((c) => c.vals[i])]) };
};
L.postingGoalReason = (p, job) => {
  const rel = Object.fromEntries(D.categoryBridge.filter((r) => r.job_id === job.job_id && r.review_status !== "rejected"
    && ["direct", "adjacent"].includes(r.relation_type)).map((r) => [r.job_major_category, r.relation_type]));
  const why = p.job_major_category in rel ? [L.RELATION_LABEL[rel[p.job_major_category]]] : [];
  const said = L.skillMentions(`${p.title} ${isStr(p.responsibilities) ? p.responsibilities : ""}`, job.skills);
  if (said.length) why.push("기술 " + said.slice(0, 2).join(", "));
  return why.join(" · ") || null;
};

/* ---------------- jobs.py ---------------- */
L.filterJobs = (jobs, o) => jobs.filter((j) => {
  if (o.major && o.major.length && !o.major.includes(j.major_category)) return false;
  if (o.middle && o.middle.length && !o.middle.includes(j.middle_category)) return false;
  if (o.activities && o.activities.length && !j.activities.some((a) => o.activities.includes(a))) return false;
  if (o.evidence && o.evidence.length && !o.evidence.includes(j.evidence_type)) return false;
  if (o.jobIds && o.jobIds.length && !o.jobIds.includes(j.job_id)) return false;
  if (o.text && o.text.trim()) {
    const hay = [j.job_title_ko, j.job_title_en || "", j.skills_raw || "", j.core_duties || ""].join(" ").toLowerCase();
    if (!hay.includes(o.text.trim().toLowerCase())) return false;
  }
  return true;
});
L.skillOverlap = (jobs, mySkills) => {
  const key = (s) => { const c = s.toLowerCase(); return D.synonyms[c] || c; };
  const mine = new Set(mySkills.map(key));
  return jobs.map((j) => ({ job: j, common: j.skills.filter((s) => mine.has(key(s))) })).filter((r) => r.common.length);
};

/* ---------------- learning.py ---------------- */
L.BEFORE = "시작 전"; L.ONGOING = "진행 중"; L.ENDED = "종료"; L.NO_DATE = "일정 미수록";
L.STATUS_ORDER = [L.BEFORE, L.ONGOING, L.ENDED, L.NO_DATE];
L.GROUP_LINKED = "기술 학습과 연결된 과정"; L.GROUP_SEARCH = "키워드로 찾은 추가 과정"; L.GROUP_BASIC = "먼저 배울 기초 과정";
L.GROUP_ALL = "전체 과정";   // 아무 조건도 고르지 않은 기본 목록(요청 J3)
L.LEARN_GROUPS = [L.GROUP_LINKED, L.GROUP_BASIC, L.GROUP_SEARCH, L.GROUP_ALL];
L.RELEVANCE_LABEL = { DIRECT: "직접 학습", INCLUDED: "일부 포함", PREREQUISITE: "선수 학습", OFFICIAL_RESOURCE: "공식 참고자료" };
L.REMOTE = "원격";
L.today = () => { const n = new Date(); return new Date(n.getFullYear(), n.getMonth(), n.getDate()); };
L.dateStatus = (o, today) => {
  if (!o.start) return L.NO_DATE;
  if (o.start > today) return L.BEFORE;
  if (!o.end || o.end >= today) return L.ONGOING;
  return L.ENDED;
};
L.representative = (offs) => {   // 과정별 대표 회차: 시작 전(시작일↑) → 진행 중(종료일↑) → 종료 → 일정 미수록
  const rank = Object.fromEntries(L.STATUS_ORDER.map((s, i) => [s, i])), best = {};
  offs.forEach((o) => {
    const k = [rank[o.date_status], (o.date_status === L.ONGOING ? o.end : o.start) || new Date(8.64e15), o.offering_id];
    const cur = best[o.course_id];
    if (!cur || k[0] < cur.k[0] || (k[0] === cur.k[0] && (k[1] < cur.k[1] || (+k[1] === +cur.k[1] && k[2] < cur.k[2]))))
      best[o.course_id] = { o, k };
  });
  return Object.fromEntries(Object.entries(best).map(([cid, v]) => [cid, v.o]));
};
/** 영문·숫자 키워드는 단어 경계로('C'가 CAD·C++에, 'SW'가 SolidWorks에 걸리지 않게, 요청 K2) — learning._has_word */
L.hasWord = (text, kw) => (/^[\x20-\x7e]*$/.test(kw)
  ? new RegExp(`(?<![a-z0-9])${kw.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![a-z0-9+#])`).test(text) : text.includes(kw));
L.searchCourses = (keywords, jobId, searchOnly) => {
  const kws = keywords.filter((k) => k && k.trim()).map((k) => k.trim().toLowerCase());
  if (!kws.length) return [];
  const reasons = {}, relevance = {};
  const add = (cid, why) => { (reasons[cid] = reasons[cid] || new Set()).add(why); };
  kws.forEach((kw) => D.courses.forEach((c) => {
    if (!searchOnly && L.hasWord((c.course_name || "").toLowerCase(), kw)) add(c.course_id, "과정명 일치");
    if (L.splitTags((c.search_keywords || "").toLowerCase(), "|").includes(kw)) add(c.course_id, "수집 검색어 일치");
    if (!searchOnly && L.hasWord((c.ncs_name || "").toLowerCase(), kw)) add(c.course_id, "NCS명 일치");
  }));
  if (jobId) D.resources.filter((r) => r.is_work24 && r.job_id === jobId && kws.includes(String(r.selected_skill).toLowerCase()))
    .forEach((r) => { add(r.course_id, "연결표에 있음"); (relevance[r.course_id] = relevance[r.course_id] || new Set()).add(r.relevance_type); });
  return Object.entries(reasons).filter(([cid]) => D.courseById[cid]).map(([cid, why]) => {
    const rel = relevance[cid] || new Set();
    const group = rel.has("DIRECT") || rel.has("INCLUDED") ? L.GROUP_LINKED : rel.has("PREREQUISITE") ? L.GROUP_BASIC : L.GROUP_SEARCH;
    return { course_id: cid, reasons: [...why].sort(), relevance: [...rel].map((r) => L.RELEVANCE_LABEL[r]).sort(), group };
  });
};
L.rankCourses = (cands, rep, profile) => {
  const regions = profile.regions || [], allowRemote = profile.allow_remote !== false;
  const g = Object.fromEntries(L.LEARN_GROUPS.map((x, i) => [x, i]));
  return cands.map((c) => { const course = D.courseById[c.course_id], o = rep[c.course_id] || {};
    return { ...course, ...c, offering_id: o.offering_id, province_std: o.province_std, start: o.start || null, end: o.end || null,
      date_status: o.date_status || L.NO_DATE, course_url: o.course_url, session_no: o.session_no }; })
    .map((r) => ({ r, k: [g[r.group], regions.length ? !(regions.includes(r.province_std) || (allowRemote && r.remote_mode === L.REMOTE)) : false,
      !(r.date_status === L.BEFORE || r.date_status === L.ONGOING), r.start ? +r.start : Infinity, r.course_name, r.course_id] }))
    .sort((a, b) => { for (let i = 0; i < a.k.length; i++) { const x = a.k[i], y = b.k[i]; if (x !== y) return x < y ? -1 : 1; } return 0; })
    .map((x) => x.r);
};
/* 03 지도·막대(요청 J1): 그 지역에서 열리는 비원격 회차가 있는 과정 수. 원격은 따로 */
L.regionCourseCounts = (ids) => {
  const m = {}, remote = new Set();
  D.offerings.forEach((o) => { if (!ids.has(o.course_id)) return;
    if (o.remote_mode === L.REMOTE) remote.add(o.course_id); else (m[o.province_std] = m[o.province_std] || new Set()).add(o.course_id); });
  return { ...Object.fromEntries(Object.entries(m).map(([k, s]) => [k, s.size])), [L.REMOTE]: remote.size };
};
L.regionKeywordCounts = () => {   // {지역: {키워드: 과정 수}}
  const m = {};
  D.offerings.forEach((o) => { if (o.remote_mode === L.REMOTE) return; const c = D.courseById[o.course_id]; if (!c) return;
    uniq(L.splitTags(c.search_keywords, "|")).forEach((k) => { const r = (m[o.province_std] = m[o.province_std] || {});
      (r[k] = r[k] || new Set()).add(o.course_id); }); });
  return Object.fromEntries(Object.entries(m).map(([r, ks]) => [r, Object.fromEntries(Object.entries(ks).map(([k, s]) => [k, s.size]))]));
};
L.coursesInRegion = (region) => new Set(D.offerings.filter((o) => o.province_std === region && o.remote_mode !== L.REMOTE).map((o) => o.course_id));
L.keywordCounts = () => {
  const m = {};
  D.courses.forEach((c) => uniq(L.splitTags(c.search_keywords, "|")).forEach((k) => { (m[k] = m[k] || new Set()).add(c.course_id); }));
  return Object.entries(m).map(([k, s]) => ({ key: k, n: s.size })).sort((a, b) => b.n - a.n || cmp(a.key, b.key));
};
L.resourcesFor = (jobId, skill) => {
  const seen = new Set(), order = Object.keys(L.RELEVANCE_LABEL);
  return D.resources.filter((r) => r.job_id === jobId && r.selected_skill === skill && !seen.has(r.resource_key) && seen.add(r.resource_key))
    .map((r) => ({ ...r, relevance: L.RELEVANCE_LABEL[r.relevance_type] }))
    .sort((a, b) => order.indexOf(a.relevance_type) - order.indexOf(b.relevance_type));
};
L.courseGoalReason = (c, job) => {
  const linked = new Set(D.resources.filter((r) => r.is_work24 && r.job_id === job.job_id).map((r) => r.course_id));
  const why = linked.has(c.course_id) ? ["연결표 과정"] : [];
  const said = L.skillMentions(`${c.course_name} ${(c.search_keywords || "").replace(/\|/g, " ")}`, job.skills);
  if (said.length) why.push("기술 " + said.slice(0, 2).join(", "));
  return why.join(" · ") || null;
};
