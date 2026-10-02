/* core.js — 데이터 해석·상태·저장·이동·다시 그리기 (Streamlit 앱의 core/state.py·persistence.py·routing.py 대응).
 * 모든 화면은 render()가 상태(S)에서 다시 그린다. 상태를 바꾸는 곳은 act()(동작 표)뿐이다. */
"use strict";

const RAW = JSON.parse(document.getElementById("dash-data").textContent);

/** [열 이름, 행...] → 객체 배열 */
function table(t) {
  const [cols, ...rs] = t;
  return rs.map((r) => Object.fromEntries(cols.map((c, i) => [c, r[i]])));
}

const D = {
  companies: table(RAW.companies), ledger: table(RAW.ledger), postings: table(RAW.postings), jobs: table(RAW.jobs),
  jobExamples: table(RAW.job_examples), jobPostings: table(RAW.job_postings), jobSkillCounts: RAW.job_skill_counts,
  synonyms: RAW.synonyms, categoryBridge: table(RAW.category_bridge), applicationBridge: table(RAW.application_bridge),
  businessAreaDefense: table(RAW.business_area_defense), postingKw: table(RAW.posting_kw),
  industrySize: table(RAW.industry_size), courses: table(RAW.courses), offerings: table(RAW.offerings),
  resources: table(RAW.resources), ntis: RAW.ntis, overview: RAW.overview, geo: RAW.geo,
  content: RAW.content, theme: RAW.theme, defense: RAW.defense,
  projects: table(RAW.projects), areaDefense: RAW.area_defense, recruitKw: table(RAW.recruit_kw),
  emptyKeywords: RAW.empty_keywords, net3d: RAW.net3d,
};
D.jobById = Object.fromEntries(D.jobs.map((j) => [j.job_id, j]));
D.companyById = Object.fromEntries(D.companies.map((c) => [c.company_id, c]));
D.postingById = Object.fromEntries(D.postings.map((p) => [p.posting_id, p]));
D.courseById = Object.fromEntries(D.courses.map((c) => [c.course_id, c]));
D.offerings.forEach((o) => { o.start = o.start_date ? new Date(o.start_date + "T00:00:00") : null;
  o.end = o.end_date ? new Date(o.end_date + "T00:00:00") : null; });

const PAGES = [  // key, 메뉴 제목 (core/routing.py PAGE_SPECS)
  ["home", "홈"], ["industry", "01 산업 이해"], ["jobs", "02 직무 탐색"], ["learning", "03 준비 역량"],
  ["recruit", "04 채용·기업 탐색"],
];
const RECRUIT_SUBS = { postings: "채용 현황", companies: "기업 탐색" };
const SCRAP_KINDS = { course: "학습 내용", posting: "채용 공고", company: "관심 기업" };
const SCRAP_LIMIT = 3;
const STORE_KEY = "drone-career-html-v3";

/* ---------------- 상태 (core/state.py DEFAULTS) ---------------- */
const S = {
  theme: "dark",
  profile: { education: null, career_type: null, regions: [], allow_remote: true },
  plan: { goal_job_id: null },
  scrap: {},
  ui: { highlight_defense: false, highlight_goal: false, roadmap_open: true, home_menu_open: false, motion: true,
        nav_open: false, sidebar_open: true },
  route: { page: "home", sub: "postings" },
  p: {},            // 화면별 필터·페이지(세션 한정, 저장 안 함)
  handoff: null,    // 다른 화면으로 넘기는 값(도착 화면이 한 번 읽음)
  dialog: null,     // {kind, id, back}
};
let storageOk = true;

function load() {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    if (!raw) return;
    const d = JSON.parse(raw);
    if (d.theme === "light" || d.theme === "dark") S.theme = d.theme;
    if (d.profile && typeof d.profile === "object") Object.assign(S.profile, d.profile);
    if (d.plan && typeof d.plan === "object") S.plan.goal_job_id = d.plan.goal_job_id || null;
    if (d.scrap && typeof d.scrap === "object") S.scrap = d.scrap;
    if (d.ui && typeof d.ui === "object") ["motion", "roadmap_open"].forEach((k) => {
      if (k in d.ui) S.ui[k] = !!d.ui[k]; });
  } catch (e) { storageOk = false; }
}
function save() {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify({ theme: S.theme, profile: S.profile, plan: S.plan, scrap: S.scrap,
      ui: { motion: S.ui.motion, roadmap_open: S.ui.roadmap_open } }));   // 방산 강조는 저장 안 함(요청 M11)
  } catch (e) { storageOk = false; }
}

/* 화면별 상태: 처음 읽을 때 기본값으로 만든다 */
function P(page, defaults) {
  if (!S.p[page]) S.p[page] = JSON.parse(JSON.stringify(defaults || {}));
  return S.p[page];
}

/* ---------------- 스크랩·목표 (core/state.py) ---------------- */
const scrapKey = (k, id) => `${k}:${id}`;
const isScrapped = (k, id) => scrapKey(k, id) in S.scrap;
function scrapped(kind) {
  return Object.values(S.scrap).filter((v) => v.entity_type === kind).sort((a, b) => cmp(a.saved_at, b.saved_at));
}
function scrap(kind, id, title) {
  const key = scrapKey(kind, id);
  if (key in S.scrap) return true;
  if (kind in SCRAP_KINDS && scrapped(kind).length >= SCRAP_LIMIT) return false;
  S.scrap[key] = { entity_type: kind, entity_id: id, saved_at: new Date().toISOString(), saved_title: title };
  return true;
}
function toggleScrap(kind, id, title) {
  const key = scrapKey(kind, id);
  if (key in S.scrap) delete S.scrap[key];
  else if (!scrap(kind, id, title)) toast(`${SCRAP_KINDS[kind]} 스크랩은 ${SCRAP_LIMIT}개까지입니다. 오른쪽 '나의 탐색 경로'에서 하나를 해제한 뒤 스크랩하세요.`);
}

/* ---------------- 이동 (core/routing.py) ---------------- */
function go(page, sub, handoff) {
  if (page === "recruit") { S.route.sub = sub || "postings"; if (S.route.page !== "recruit") S.ui.nav_open = true; }
  S.handoff = handoff ? { target: page === "recruit" ? `recruit.${S.route.sub}` : page, ...handoff } : null;
  S.route.page = page;
  S.dialog = null;
  writeHash();
  render({ scrollTop: true });
}
function consumeHandoff(target) {
  if (S.handoff && S.handoff.target === target) { const h = S.handoff; S.handoff = null; return h; }
  return null;
}
function writeHash() {
  const h = S.route.page === "recruit" ? `#recruit/${S.route.sub}` : `#${S.route.page}`;
  if (location.hash !== h) history.replaceState(null, "", h);
}
function readHash() {
  const [page, sub] = (location.hash || "#home").slice(1).split("/");
  if (PAGES.some(([k]) => k === page)) S.route.page = page;
  if (sub in RECRUIT_SUBS) S.route.sub = sub;
  if (S.route.page === "recruit") S.ui.nav_open = true;
}

/* ---------------- 공용 도구 ---------------- */
function cmp(a, b) { return a < b ? -1 : a > b ? 1 : 0; }
function by(...keys) {   // keys: "col" 오름차순, "-col" 내림차순
  return (a, b) => {
    for (const k of keys) {
      const desc = k[0] === "-", c = desc ? k.slice(1) : k;
      const r = cmp(a[c], b[c]);
      if (r) return desc ? -r : r;
    }
    return 0;
  };
}
function esc(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}
const fmt = (v, d = 0) => Number(v).toLocaleString("ko-KR", { minimumFractionDigits: d, maximumFractionDigits: d });
const uniq = (a) => [...new Set(a)];
const isStr = (v) => typeof v === "string" && v.trim() !== "";

let toastTimer = null;
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("show"), 4200);
}

/* ---------------- 동작 표: data-act 클릭·변경을 여기로 보낸다 ---------------- */
const ACTIONS = {};
function act(name, fn) { ACTIONS[name] = fn; }
function handle(e, type) {
  const el = e.target.closest("[data-act]");
  if (!el || (type === "click" && el.matches("select, input"))) return;
  const fn = ACTIONS[el.dataset.act];
  if (!fn) return;
  if (el.tagName === "A") e.preventDefault();
  const keep = fn(el, e);
  if (keep !== false) { save(); render(); }
}
