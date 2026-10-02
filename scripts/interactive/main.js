/* main.js — 화면 틀(사이드바·상단바·나의 탐색 경로), 다시 그리기, 동작 연결, 시작 (app.py·components/shell.py 대응). */
"use strict";

const NAV_NO = { industry: "01", jobs: "02", learning: "03", recruit: "04" };
const ROADMAP = [  // 번호, 제목, 선택 전 안내, 스크랩 종류(null = 목표 직무), 살펴보기 대상
  ["01", "목표 직무", "선택 전 · 직무 살펴보기", null, "jobs", null],
  ["02", "학습 내용", "교육 스크랩 전", "course", "learning", null],
  ["03", "채용 공고 스크랩", "공고 스크랩 전", "posting", "recruit", "postings"],
  ["04", "관심 기업 스크랩", "기업 스크랩 전", "company", "recruit", "companies"],
];

/* ---------------- 테마 토큰 주입 (core/theme.py inject_css) ---------------- */
function applyTheme() {
  const vars = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
  document.getElementById("tokens").textContent =
    `:root{${vars({ ...D.theme.base, ...D.theme.modes[S.theme], ...D.theme.images })}}`
    + `.sidebar,.card,.tiles{${vars(D.theme.unscaled)}}`;
  document.documentElement.dataset.theme = S.theme;
}

/* ---------------- 사이드바 ---------------- */
function sidebar() {
  const cur = S.route.page, inRecruit = cur === "recruit", open = S.ui.nav_open;
  const item = (key, title) => { const name = key === "home" ? "홈" : title.slice(3);
    return `<a href="#${key}" class="nav-item${key === cur ? " active" : ""}${key === "home" ? " home" : ""}" data-act="nav" data-arg="${key}">
      <span class="nav-no">${NAV_NO[key] || ""}</span><span>${esc(name)}</span></a>`; };
  const ctx = C_.page_default[inRecruit ? `recruit.${S.route.sub}` : cur];
  return `<p class="sidebar-brand"><span class="sidebar-brand__dot"></span>드론 진로 탐색</p>
    <nav class="nav">${PAGES.slice(0, 4).map(([k, t]) => item(k, t)).join("")}
      <a href="#recruit/postings" class="nav-item nav-parent${inRecruit ? " active" : ""}" data-act="nav-recruit" title="${inRecruit ? "하위 메뉴 접기/펼치기" : "채용 현황으로 이동하고 하위 메뉴를 펼칩니다"}">
        <span class="nav-no">04</span><span>채용·기업 탐색</span><span class="nav-caret">${open ? "⌃" : "⌄"}</span></a>
      ${open ? `<div class="nav-subtree">${Object.entries(RECRUIT_SUBS).map(([k, v]) => `<a href="#recruit/${k}" class="nav-sub${inRecruit && S.route.sub === k ? " active" : ""}" data-act="nav-sub" data-arg="${k}">${esc(v)}</a>`).join("")}</div>` : ""}
    </nav>
    <div class="sidebar-bottom"><aside class="context-card"><p class="context-card__title">${esc(ctx.title)}</p>
      ${ctx.context_lines.map((l) => `<p class="context-card__line">${esc(l)}</p>`).join("")}</aside>
      <div class="theme-switch" role="group" aria-label="화면 테마">
        <button type="button" data-act="theme" data-arg="light" aria-pressed="${S.theme === "light"}">☀ 라이트</button>
        <button type="button" data-act="theme" data-arg="dark" aria-pressed="${S.theme === "dark"}">☾ 다크</button></div>
      ${storageOk ? "" : '<p class="caption">이 브라우저는 저장을 막아 선택이 이번 이용 중에만 유지됩니다.</p>'}</div>`;
}

/* ---------------- 상단바 · 나의 탐색 경로 ---------------- */
function topbar() {
  const cur = S.route.page, title = PAGES.find(([k]) => k === cur)[1];
  const screen = cur === "recruit" ? `${title} · ${RECRUIT_SUBS[S.route.sub]}` : title;
  return `<div class="topbar">${U.btn(S.ui.sidebar_open ? "«" : "☰", "sidebar", { cls: "sidebar-btn", title: "사이드바 접기/펼치기" })}
    <div class="topbar__brand"><span class="topbar__wordmark">드론 진로 탐색</span><span class="topbar__screen">${esc(screen)}</span></div>
    ${U.btn(S.ui.roadmap_open ? "탐색 경로 접기" : "나의 탐색 경로", "roadmap", { icon: S.ui.roadmap_open ? "⇥" : "⇤" })}</div>`;
}
function stepItems(kind) {
  if (kind) return scrapped(kind).map((v) => [v.entity_id, v.saved_title]);
  const g = S.plan.goal_job_id;
  return g && D.jobById[g] ? [[g, D.jobById[g].job_title_ko]] : [];
}
function roadmap() {
  return `<aside class="roadmap"><p class="roadmap__title">나의 탐색 경로</p>${ROADMAP.map(([no, title, empty, kind, page, sub]) => {
    const items = stepItems(kind);
    return `<div class="roadmap-step${items.length ? " set" : ""}"><div class="roadmap-step__head"><span class="roadmap-step__no">${no}</span>
      <p class="roadmap-step__title">${esc(title)}${kind ? `<span class="roadmap-step__count">${items.length}/${SCRAP_LIMIT}</span>` : ""}</p></div>
      ${items.length ? "" : `<p class="roadmap-step__state">${esc(empty)}</p>`}
      ${items.map(([id, name]) => `<div class="roadmap-item"><p class="roadmap-step__state set">${esc(name)}</p>
        ${U.btn("해제", "release", { arg: kind || "", arg2: id, icon: "✕", title: kind ? "스크랩을 해제합니다" : "목표 직무 선택을 해제합니다" })}</div>`).join("")}
      <a href="#${page}${sub ? "/" + sub : ""}" class="roadmap-link" data-act="go" data-arg="${page}" data-arg2="${sub || ""}">→ 살펴보기</a></div>`;
  }).join("")}${myConditions()}</aside>`;
}
/* 나의 탐색 경로 '내 조건'(요청 N14): 저장되며 공고 상세 '내 조건과 비교'·03 교육 정렬에 쓰임(거르지 않음) */
function myConditions() {
  return `<div class="roadmap-mycond"><p class="roadmap-step__title">내 조건</p><p class="roadmap-step__state">공고 상세의 “내 조건과 비교”와 교육 정렬에 쓰여요</p>
    <p class="mc-label">내 학력</p>${U.pills("profile.education", ["고졸", "초대졸", "대졸", "석사"])}
    <p class="mc-label">내 경력</p>${U.pills("profile.career_type", ["신입", "경력"])}
    <p class="mc-label">희망 지역</p>${U.dropdown("profile.regions", uniq(D.postings.map((p) => p.province_name)).sort(cmp), "전체 지역", { openKey: "ui.mycond_dd" })}</div>`;
}

/* ---------------- 다시 그리기 ---------------- */
function render(o = {}) {
  // 펼친 '근거 자세히' 등과 입력 중인 칸을 기억했다가 되살린다
  const openDetails = new Set([...document.querySelectorAll("details[open] > summary")].map(detailKey));
  const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
  const main = document.getElementById("main"), y = main.scrollTop;
  document.getElementById("app").classList.toggle("no-sidebar", !S.ui.sidebar_open);
  document.getElementById("sidebar").innerHTML = sidebar();
  const page = PG[S.route.page]();
  main.innerHTML = topbar() + `<div class="frame${S.ui.roadmap_open ? "" : " frame--wide"}"><div class="center">${page}</div>${S.ui.roadmap_open ? roadmap() : ""}</div>`;
  document.querySelectorAll("details > summary").forEach((s) => {   // 상태로 여닫는 영역(data-open-key)은 이미 반영됨
    if (!s.parentElement.dataset.openKey && openDetails.has(detailKey(s))) s.parentElement.open = true; });
  CH.mountAll();
  U.runCountups();
  renderDialog();
  if (focused) { const el = document.querySelector(`input[data-key="${focused}"]`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  main.scrollTop = o.scrollTop ? 0 : y;
}
function detailKey(summary) {
  const path = []; let el = summary.parentElement;
  while (el && el.id !== "main") { if (el.tagName === "DETAILS") path.unshift(el.querySelector(":scope > summary").textContent.trim()); el = el.parentElement; }
  return S.route.page + "|" + S.route.sub + "|" + path.join(">");
}
function renderDialog() {
  const dlg = document.getElementById("dlg");
  if (!S.dialog) { if (dlg.open) dlg.close(); return; }
  const back = S.dialog.back;
  dlg.innerHTML = `<div class="dlg-bar">${back ? U.btn(back === "company_list" ? "목록으로" : "이전 상세로", "dlg-back", { icon: "‹" }) : "<span></span>"}
    ${U.btn("닫기", "dlg-close", { icon: "✕" })}</div><div class="dlg-body">${DLG[S.dialog.kind](S.dialog.id)}</div>`;
  if (!dlg.open) dlg.showModal();
}

/* ---------------- 동작 ---------------- */
act("nav", (el) => go(el.dataset.arg));
act("nav-recruit", () => { if (S.route.page === "recruit") S.ui.nav_open = !S.ui.nav_open; else { S.ui.nav_open = true; go("recruit", "postings"); return false; } });
act("nav-sub", (el) => { go("recruit", el.dataset.arg); return false; });
act("sub", (el) => { go("recruit", el.dataset.arg); return false; });
act("go", (el) => { go(el.dataset.arg, el.dataset.arg2 || null); return false; });
act("theme", (el) => { S.theme = el.dataset.arg; applyTheme(); });
act("sidebar", () => { S.ui.sidebar_open = !S.ui.sidebar_open; });
act("roadmap", () => { S.ui.roadmap_open = !S.ui.roadmap_open; });
act("release", (el) => { if (el.dataset.arg) delete S.scrap[scrapKey(el.dataset.arg, el.dataset.arg2)]; else S.plan.goal_job_id = null; });
act("scrap", (el) => toggleScrap(el.dataset.arg, el.dataset.arg2, el.dataset.arg3));
act("goal", (el) => { S.plan.goal_job_id = el.dataset.arg || null; });
act("pill", (el) => {
  const key = el.dataset.key, v = el.dataset.val, cur = getv(key);
  if (el.dataset.multi) setv(key, (cur || []).includes(v) ? cur.filter((x) => x !== v) : [...(cur || []), v]);
  else setv(key, cur === v && !el.dataset.required ? null : v);
  if (el.dataset.reset) setv(el.dataset.reset, 0);
  if (key === "jobs.major") P("jobs").middle = null;
});
act("toggle", (el) => { setv(el.dataset.key, el.checked); if (el.dataset.reset) setv(el.dataset.reset, 0); });
act("page", (el) => { setv(el.dataset.arg, +el.dataset.arg2); });
act("dialog", (el) => { S.dialog = { kind: el.dataset.arg, id: el.dataset.arg2 }; });
act("dlg-close", () => { S.dialog = null; });
act("dlg-back", () => { const [kind, id] = S.dialog.back.split(":"); S.dialog = { kind, id: id || null }; });
act("dlg-switch", (el) => { S.dialog = { kind: el.dataset.arg, id: el.dataset.arg2, back: el.dataset.arg3 }; });
act("dlg-skill", (el) => { go("learning", null, { job_id: el.dataset.arg, skill: el.dataset.arg2 }); return false; });
act("dlg-postings", (el) => { go("recruit", "postings", { company_id: el.dataset.arg }); return false; });
act("dlg-explore", (el) => { go("recruit", "companies", { company_ids: [el.dataset.arg] }); return false; });
act("hero", (el) => { S.ui.home_menu_open = !S.ui.home_menu_open; const h = el.closest(".hero"); h.classList.toggle("open", S.ui.home_menu_open);
  el.setAttribute("aria-expanded", S.ui.home_menu_open); h.querySelectorAll(".go").forEach((b) => { b.tabIndex = S.ui.home_menu_open ? 0 : -1; }); return false; });
act("motion", (el) => { S.ui.motion = !S.ui.motion; el.closest(".hero").classList.toggle("move", S.ui.motion);
  el.textContent = S.ui.motion ? "움직임 멈추기" : "움직임 재생"; save(); return false; });
act("hero-go", (el) => { const [page, sub] = el.dataset.arg.split("."); go(page, sub || null); return false; });
act("i02-jobs", () => { const st = P("industry"); go("jobs", null, { area: st.area, job_ids: D.applicationBridge
  .filter((r) => r.application_id === st.area && r.review_status !== "rejected").map((r) => r.job_id) }); return false; });
act("go-companies-area", (el) => { go("recruit", "companies", { area: [el.dataset.arg] }); return false; });
act("jobs-clear-handoff", () => { Object.assign(P("jobs"), { handoff: null, page: 0 }); });
act("jobs-major", (el) => { const st = P("jobs"); st.major = st.major === el.dataset.val ? null : el.dataset.val; st.middle = null; st.page = 0; });
act("j05-pick", (el) => { const st = P("jobs"); st.j05 = st.j05 === el.dataset.val ? null : el.dataset.val; st.j05_page = 0; });
act("j05-select", (el) => { const st = P("jobs"); st.j05 = el.value || null; st.j05_page = 0; });
act("learn-skill", (el) => { const st = P("learning"), v = el.dataset.val;
  Object.assign(st, st.skill === v ? { skill: null } : { skill: v, extra: v, page: 0 }); });
act("learn-clear-extra", () => { Object.assign(P("learning"), { extra: null, page: 0 }); });
act("learn-clear-region", () => { Object.assign(P("learning"), { region: null, page: 0 }); });
act("learn-mode", (el) => { Object.assign(P("learning"), { mode: el.dataset.arg, page: 0 }); });
act("learn-kw", (el) => { const st = P("learning"); learnToggle(st, st.mode, el.dataset.val); });
act("learn-add", (el) => { const st = P("learning"); if (el.value) learnToggle(st, st.mode, el.value); });
act("ind-more", () => { const st = P("industry"); st.all = !st.all; });
act("ind-tech", (el) => { const st = P("industry"), v = el.dataset.val;
  Object.assign(st, { tech: st.tech === v ? null : v, app: null, ex_page: 0 }); if (st.tech) st.ex_open = true; });
act("ind-clear-tech", () => { Object.assign(P("industry"), { tech: null, app: null, ex_page: 0 }); });
act("post-clear", () => { Object.assign(P("postings"), { job: [], region: [], career: [], edu: [], page: 0 }); });
act("post-clear-company", () => { Object.assign(P("postings"), { company: null, page: 0 }); });
act("co-clear-ids", () => { P("companies").ids = null; });
act("co-multi", (el) => { const st = P("companies"); st.multi = el.checked; if (!st.multi) st.area = st.area.slice(0, 1); });
act("co-area", (el) => { const st = P("companies"), v = el.dataset.val;
  st.area = st.multi ? (st.area.includes(v) ? st.area.filter((x) => x !== v) : [...st.area, v]) : (st.area[0] === v ? [] : [v]); });
act("co-more", () => { P("companies").more = 1; S.dialog = { kind: "company_list" }; });
act("co-more-page", (el) => { P("companies").more = +el.dataset.arg; });
act("input", (el) => { setv(el.dataset.key, el.value); if (el.dataset.reset) setv(el.dataset.reset, 0); });
// 02 직무·기술 검색(요청 O4): 고르면 아래 직무 카드가 열림 / J05 전체 키워드 검색 상자
act("jobs-search", (el) => { const st = P("jobs"); Object.assign(st, { text: el.value, page: 0 }); if (el.value) st.cards_open = true; });
act("j05-input", (el) => { Object.assign(P("jobs"), { j05: el.value || null, j05_page: 0 }); });
act("jobs-middle", (el) => { const st = P("jobs"); st.middle = st.middle === el.dataset.val ? null : el.dataset.val; st.page = 0; });
// 02 오른쪽 열: 방산 관련 직무 ↔ 전체 보기(서로 해제, 요청 M7)
act("j01-defense", () => { const on = !S.ui.highlight_defense; S.ui.highlight_defense = on; if (on) Object.assign(P("jobs"), { major: null, middle: null, page: 0 }); });
act("j01-all", () => { S.ui.highlight_defense = false; Object.assign(P("jobs"), { major: null, middle: null, page: 0 }); });
// 카드 펼치기로 이동(02 보러가기, 04 스크랩하러 가기)
const openAndScroll = (page, id) => { P(page).cards_open = true; save(); render();
  setTimeout(() => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: S.ui.motion ? "smooth" : "auto", block: "start" }); }, 60); return false; };
act("jobs-to-cards", () => openAndScroll("jobs", "jobs-cards"));
act("post-to-cards", () => openAndScroll("postings", "post-cards"));

/* ---------------- 시작 ---------------- */
function boot() {
  load(); readHash(); applyTheme();
  const app = document.getElementById("app");
  app.addEventListener("click", (e) => handle(e, "click"));
  app.addEventListener("change", (e) => { if (e.target.matches("input[type=checkbox], select, input[type=search]")) handle(e, "change"); });
  app.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input[type=search]")) handle(e, "change"); });
  // 검색 상자 목록에서 고르면 바로 반영(datalist 선택은 change 대신 input으로 옴)
  app.addEventListener("input", (e) => { if (e.target.matches("input[list]") && (!e.inputType || e.inputType === "insertReplacementText")) handle(e, "change"); });
  app.addEventListener("toggle", (e) => {   // 펼칠 때 그리는 영역(국가 R&D·행렬)과 숨어 있던 차트 크기 맞춤
    const k = e.target.dataset && e.target.dataset.openKey;
    if (k) { if (!!getv(k) !== e.target.open) { setv(k, e.target.open); render(); } }
    else Object.values(CH.cache).forEach((x) => x.inst.resize());
  }, true);
  const dlg = document.getElementById("dlg");
  dlg.addEventListener("click", (e) => { if (e.target === dlg) { S.dialog = null; render(); } else handle(e, "click"); });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); S.dialog = null; render(); });
  window.addEventListener("hashchange", () => { readHash(); render({ scrollTop: true }); });
  document.addEventListener("keydown", (e) => { if (e.key === "Escape" && S.ui.home_menu_open && S.route.page === "home") {
    S.ui.home_menu_open = false; render(); } });
  render();
}
boot();
