/* main.js — 화면 틀(사이드바·상단바·나의 탐색 경로·푸터), 다시 그리기, 동작 연결, 시작 (app.py·components/shell.py·footer.py 대응). */
"use strict";

const ROADMAP = [  // 번호, 제목, 선택 전 안내, 스크랩 종류(null = 목표 직무), 살펴보기 대상
  ["01", "목표 직무", "선택 전 · 직무 살펴보기", null, "jobs", null],
  ["02", "학습 내용", "교육 스크랩 전", "course", "learning", null],
  ["03", "채용 공고 스크랩", "공고 스크랩 전", "posting", "recruit", "postings"],
  ["04", "관심 기업 스크랩", "기업 스크랩 전", "company", "recruit", "companies"],
];
const ROADMAP_TITLE = "나의 탐색 경로";
// 로드맵(요청 AB3): 화면마다 몇 번째 단계인지. 그 단계까지 번호·세로선이 초록, 드론이 그 번호 왼쪽에 내려앉음(01 = 제목 옆, 홈 = 없음)
const STEP_OF = { jobs: 1, learning: 2, "recruit.postings": 3, "recruit.companies": 4 };
const DRONE = '<span class="rm-drone" aria-hidden="true"></span>';
const LOGO = (size) => `<span class="logo logo--${size}" aria-hidden="true"></span>`;   // 서비스 로고(요청 AH)
const pageKey = () => (S.route.page === "recruit" ? `recruit.${S.route.sub}` : S.route.page);

/* ---------------- 테마 토큰 주입 (core/theme.py inject_css) ---------------- */
function applyTheme() {
  const vars = (o) => Object.entries(o).map(([k, v]) => `${k}:${v}`).join(";");
  const t = { ...D.theme.base, ...D.theme.modes[S.theme] };
  const svg = D.theme.logo_svg.replace(/\{ink\}/g, t["--text"]).replace(/\{green\}/g, t["--primary"]);
  document.getElementById("tokens").textContent =
    `:root{${vars({ ...t, ...D.theme.images, "--logo-img": `url(data:image/svg+xml;base64,${btoa(svg)})` })}}`
    + `.sidebar,.card,.tiles{${vars(D.theme.unscaled)}}`;
  document.documentElement.dataset.theme = S.theme;
}

/* ---------------- 사이드바(768px 이상 고정, 요청 AA3) ---------------- */
function sidebar() {
  const cur = S.route.page, inRecruit = cur === "recruit", open = S.ui.nav_open;
  const item = (key, title) => { const name = key === "home" ? "홈" : title.slice(3);
    return `<a href="#${key}" class="nav-item nav-item--${key}${key === cur ? " active" : ""}" data-act="nav" data-arg="${key}">
      <span class="nav-ico" aria-hidden="true"></span><span>${esc(name)}</span></a>`; };
  const ctx = C_.page_default[inRecruit ? `recruit.${S.route.sub}` : cur];
  return `<p class="sidebar-brand">${LOGO("sidebar")}드론 진로 탐색</p>
    <nav class="nav">${PAGES.slice(0, 4).map(([k, t]) => item(k, t)).join("")}
      <div class="nav-parent-row${inRecruit ? " active" : ""}"><a href="#recruit/postings" class="nav-item nav-item--recruit nav-parent" data-act="nav-recruit" title="채용 현황으로 이동하고 하위 메뉴를 펼칩니다">
        <span class="nav-ico" aria-hidden="true"></span><span>채용·기업 탐색</span></a>
        <button type="button" class="nav-fold" data-act="nav-fold" title="하위 메뉴 펼치기/접기" aria-expanded="${open}">${open ? "⌃" : "⌄"}</button></div>
      ${open ? `<div class="nav-subtree">${Object.entries(RECRUIT_SUBS).map(([k, v]) => `<a href="#recruit/${k}" class="nav-sub${inRecruit && S.route.sub === k ? " active" : ""}" data-act="nav-sub" data-arg="${k}">${esc(v)}</a>`).join("")}</div>` : ""}
    </nav>
    <div class="sidebar-bottom"><aside class="context-card"><p class="context-card__title">${esc(ctx.title)}</p>
      ${ctx.context_lines.map((l) => `<p class="context-card__line">${esc(l)}</p>`).join("")}</aside>
      <div class="theme-switch" role="group" aria-label="화면 테마">
        <button type="button" data-act="theme" data-arg="light" aria-pressed="${S.theme === "light"}">☀ 라이트</button>
        <button type="button" data-act="theme" data-arg="dark" aria-pressed="${S.theme === "dark"}">☾ 다크</button></div>
      ${storageOk ? "" : '<p class="caption">이 브라우저는 저장을 막아 선택이 이번 이용 중에만 유지됩니다.</p>'}</div>`;
}

/* ---------------- 상단 줄(요청 AA4): 로고 + 서비스명 + 현재 화면은 본문 열, 탐색 경로 단추는 오른쪽 열 위. 홈 = 단추만 ---------------- */
function topbar() {
  if (S.route.page === "home") return "";
  const cur = S.route.page, title = PAGES.find(([k]) => k === cur)[1];
  const screen = cur === "recruit" ? `${title} · ${RECRUIT_SUBS[S.route.sub]}` : title;
  return `<div class="topbar"><div class="topbar__brand">${LOGO("topbar")}<span class="topbar__wordmark">드론 진로 탐색</span>
    <span class="topbar__screen">${esc(screen)}</span></div></div>`;
}
/** 탐색 경로 열기/접기(요청 AA7): 다시 그리지 않고 html[data-roadmap]만 바꿔 폭이 0.3초 동안 움직임 + 홈 드론 반응(AA8) */
const roadmapBtn = () => `<button type="button" class="rt" data-act="roadmap" aria-expanded="${S.ui.roadmap_open}"><span class="rt__icon" aria-hidden="true">${S.ui.roadmap_open ? "⇥" : "⇤"}</span>
  <span class="rt__label">${S.ui.roadmap_open ? "탐색 경로 접기" : ROADMAP_TITLE}</span></button>`;
function stepItems(kind) {
  if (kind) return scrapped(kind).map((v) => [v.entity_id, v.saved_title]);
  const g = S.plan.goal_job_id;
  return g && D.jobById[g] ? [[g, D.jobById[g].job_title_ko]] : [];
}
function courseUrl(id) { const o = (S._rep || (S._rep = L.representative(D.offerings)))[id]; return o && isStr(o.course_url) ? o.course_url : ""; }
function roadmap() {
  const page = pageKey(), step = STEP_OF[page];
  return `<aside class="roadmap" id="roadmap-panel"><p class="roadmap__title">${ROADMAP_TITLE}${page === "industry" ? DRONE : ""}</p>${ROADMAP.map(([no, title, empty, kind, pg, sub], k) => {
    const idx = k + 1, items = stepItems(kind);
    const cls = (items.length ? " set" : "") + (step && idx <= step ? " reach" : "") + (step && idx < step ? " path" : "");
    // 담긴 항목(요청 AB4): 작은 글씨 한 줄 + …, 누르면 상세 팝업(교육은 원문 새 창), 해제 = ×. 스크랩 목록은 펼치기·접기(기본 접힘)
    const row = ([id, name]) => { const url = kind === "course" ? courseUrl(id) : "";
      const open = kind === "course" ? (url ? `<a class="rm-item__link" href="${esc(url)}" target="_blank" rel="noopener" title="${esc(name)}">${esc(name)}</a>`
        : `<p class="rm-item__link" title="${esc(name)}">${esc(name)}</p>`)
        : `<button type="button" class="rm-item__link" data-act="dialog" data-arg="${kind || "job"}" data-arg2="${esc(id)}" title="${esc(name)}">${esc(name)}</button>`;
      return `<div class="rm-item" data-no="${no}"${kind ? "" : ' data-always="1"'}>${open}<button type="button" class="rm-item__x" data-act="release" data-arg="${kind || ""}" data-arg2="${esc(id)}" title="${kind ? "스크랩을 해제합니다" : "목표 직무 선택을 해제합니다"}" aria-label="해제">✕</button></div>`; };
    return `<div class="rm-step${cls}" data-no="${no}"><div class="rm-head"><div class="roadmap-step"><span class="roadmap-step__no">${idx === step ? DRONE : ""}${no}</span>
      <div><p class="roadmap-step__title">${esc(title)}${kind ? `<span class="roadmap-step__count">${items.length}/${SCRAP_LIMIT}</span>` : ""}</p>
      ${items.length ? "" : `<p class="roadmap-step__state">${esc(empty)}</p>`}</div></div>
      ${kind && items.length ? `<button type="button" class="rf" data-act="rm-fold" data-arg="${no}" aria-label="목록 펼치기·접기"></button>` : ""}</div>
      ${items.map(row).join("")}
      <div class="rm-actions"><a href="#${pg}${sub ? "/" + sub : ""}" class="roadmap-link" data-act="go" data-arg="${pg}" data-arg2="${sub || ""}">→ 살펴보기</a>
      ${kind && items.length ? `<button type="button" class="rm-reset" data-act="rm-reset" data-arg="${kind}" title="${esc(title)} ${items.length}개를 모두 해제합니다">초기화</button>` : ""}</div></div>`;   // 요청 AT
  }).join("")}${myConditions()}</aside>`;
}
/* 나의 탐색 경로 '내 조건'(요청 N14·AA5·AF4): 제목·한 줄 안내 + 학력·경력·희망 지역은 펼치기 안(기본 접힘), 글꼴 85% */
function myConditions() {
  return `<div class="roadmap-mycond"><div class="roadmap-mycond__head"><div class="rm-mycond-top"><p class="roadmap-step__title">내 조건</p>
    <button type="button" class="rm-reset" data-act="mc-reset" title="내 학력·경력·희망 지역을 모두 비웁니다">초기화</button></div>
    ${U.note("공고 상세 “내 조건과 비교”·교육 정렬에 사용")}</div>
    <details class="expander rm-cond" data-open-key="ui.mycond_open"${S.ui.mycond_open ? " open" : ""}><summary>학력·경력·희망 지역</summary><div class="expander__body">
    <p class="mc-label">내 학력</p>${U.pills("profile.education", ["고졸", "초대졸", "대졸", "석사"])}
    <p class="mc-label">내 경력</p>${U.pills("profile.career_type", ["신입", "경력"])}
    <p class="mc-label">희망 지역</p>${U.dropdown("profile.regions", uniq(D.postings.map((p) => p.province_name)).sort(cmp), "전체 지역", { openKey: "ui.mycond_dd" })}</div></details></div>`;
}

/* ---------------- 푸터(components/footer.py, 요청 AG1·AH): 다음 단계 + 3칸 + 맨 아래 한 줄 ---------------- */
function footer() {
  const F = C_.footer, nxt = F.next[pageKey()];
  const ul = (items) => `<ul class="ft__list">${items.map((i) => `<li>${i}</li>`).join("")}</ul>`;
  return `<footer class="site-footer">${nxt ? `<button type="button" class="footer-next" data-act="go" data-arg="${nxt[0]}" data-arg2="${nxt[1] || ""}">
      <span class="footer-next__eyebrow">다음 단계</span><span class="footer-next__name"><b>${esc(nxt[2])}</b> →</span><span class="footer-next__desc">${esc(nxt[3])}</span></button>` : ""}
    <div class="ft__grid">
      <section><p class="ft__label">${esc(F.about_label)}</p>${ul(F.about.map(esc))}<div class="ft__team">${LOGO("footer")}<div><p class="ft__team-name">${esc(F.team)}</p><p class="ft__team-members">${F.members.map(esc).join(" · ")}</p></div></div></section>
      <section><p class="ft__label">데이터 출처 · 기준일</p>${ul(F.sources.map(([n, d, w]) => `<b>${esc(n)}</b> <span class="ft__muted">· ${esc(d)} · ${esc(w)}</span>`))}</section>
      <section><p class="ft__label">이용 주의 · 용어</p>${ul([...F.cautions.map(esc), ...F.terms.map(([t, d]) => `<b>${esc(t)}</b> = ${esc(d)}`)])}</section></div>
    <p class="ft__bottom">© 2026 드론 진로 탐색 · ${esc(F.version)} · 업데이트 ${esc(F.updated)} · ${F.credits.map(esc).join(" · ")}</p></footer>`;
}

/* ---------------- 다시 그리기 ---------------- */
function render(o = {}) {
  // 펼친 '그래프 해설' 등과 입력 중인 칸을 기억했다가 되살린다
  const openDetails = new Set([...document.querySelectorAll("details[open] > summary")].map(detailKey));
  const focused = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.key : null;
  const main = document.getElementById("main"), y = main.scrollTop;
  const doc = document.documentElement;
  doc.dataset.roadmap = S.ui.roadmap_open ? "open" : "closed";
  doc.dataset.rmOpen = S.ui.rm_open || "";
  document.getElementById("sidebar").innerHTML = sidebar();
  S._arrived = S._lastPage !== S.route.page; S._lastPage = S.route.page;   // 이번 그리기가 화면에 처음 들어온 것인지(홈 비행·02 네트워크 자라기)
  if (S._arrived) S.pageEntry = (S.pageEntry || 0) + 1;
  const page = PG[S.route.page]();
  if (S.route.page !== "home" && CH.cleanups.hh) { const done = CH.cleanups.hh; delete CH.cleanups.hh; setTimeout(done, 0); }   // 홈을 떠남 → 3D 정리
  main.innerHTML = `<div class="frame"><div class="center"><div class="center__in">${topbar()}${page}${footer()}</div></div>
    <div class="rcol"><div class="rcol__btn">${roadmapBtn()}</div><div class="rcol__panel">${roadmap()}</div></div></div>`;
  document.querySelectorAll("details > summary").forEach((s) => {   // 상태로 여닫는 영역(data-open-key)은 이미 반영됨
    if (!s.parentElement.dataset.openKey && openDetails.has(detailKey(s))) s.parentElement.open = true; });
  CH.mountAll();
  U.runCountups();
  renderDialog();
  if (focused) { const el = document.querySelector(`input[data-key="${focused}"]`); if (el) { el.focus(); el.setSelectionRange(el.value.length, el.value.length); } }
  main.scrollTop = o.scrollTop ? 0 : y;
  if (S._scrollTo) { const id = S._scrollTo; S._scrollTo = null; setTimeout(() => scrollToId(id), 60); }
}
function detailKey(summary) {
  const path = []; let el = summary.parentElement;
  while (el && el.id !== "main") { if (el.tagName === "DETAILS") path.unshift(el.querySelector(":scope > summary").textContent.trim()); el = el.parentElement; }
  return S.route.page + "|" + S.route.sub + "|" + path.join(">");
}
/** id로 부드럽게 이동(components/scroll.py·page_toc): 그려지는 동안 몇 번 다시 맞추고, 사용자가 스크롤하면 그만둔다(요청 AB8·AD4) */
function scrollToId(id, again = true) {
  const go = (smooth) => { const el = document.getElementById(id); if (!el) return;
    el.style.scrollMarginTop = "var(--space-md)";
    const gap = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    if (!smooth && Math.abs(el.getBoundingClientRect().top - gap * (window.__ddZoom || 1)) < 8) return;
    el.scrollIntoView({ behavior: smooth && S.ui.motion ? "smooth" : "auto", block: "start" }); };
  go(true);
  if (!again) return;
  let user = false; const stop = () => { user = true; }, evs = ["wheel", "touchmove", "keydown", "pointerdown"];
  evs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, capture: true }));
  [400, 800, 1300, 2000].forEach((ms) => setTimeout(() => { if (!user) go(false); }, ms));
  setTimeout(() => evs.forEach((ev) => window.removeEventListener(ev, stop, { capture: true })), 2100);
}
function renderDialog() {
  const dlg = document.getElementById("dlg");
  if (!S.dialog) { if (dlg.open) dlg.close(); return; }
  const back = S.dialog.back;
  dlg.innerHTML = `<div class="dlg-bar">${back ? U.btn("이전 상세로", "dlg-back", { icon: "‹" }) : "<span></span>"}
    ${U.btn("닫기", "dlg-close", { icon: "✕" })}</div><div class="dlg-body">${DLG[S.dialog.kind](S.dialog.id)}</div>`;
  if (!dlg.open) dlg.showModal();
}

/* ---------------- 모니터 크기 맞춤(browser.fit_zoom, 요청 AE3·AF3): 기준 폭보다 넓은 창은 앱 전체를 비율대로 확대 ---------------- */
function fitZoom() {
  const doc = document.documentElement, cfg = D.theme.zoom;
  const fit = () => {
    const r = Math.round(Math.min(cfg.max, Math.max(1, window.innerWidth / cfg.base)) * 1000) / 1000;
    if (String(r) === doc.style.getPropertyValue("--app-zoom")) return;
    doc.style.zoom = r === 1 ? "" : String(r);
    doc.style.setProperty("--app-zoom", String(r));
    window.__ddZoom = r;
    window.dispatchEvent(new Event("dd-zoom"));
  };
  window.addEventListener("resize", fit);
  // 캔버스 선명도: devicePixelRatio를 배율만큼 크게 알려 준다
  const dpr = Object.getOwnPropertyDescriptor(window, "devicePixelRatio") || Object.getOwnPropertyDescriptor(Window.prototype, "devicePixelRatio");
  if (dpr && dpr.get) Object.defineProperty(window, "devicePixelRatio", { configurable: true, get() { return dpr.get.call(window) * (window.__ddZoom || 1); } });
  // 그래프(ECharts) 마우스 위치: 확대된 화면 px → 확대 전 px(안 하면 막대를 누를 때 한 칸 아래가 골라짐)
  const fix = (e) => { const z = window.__ddZoom || 1; if (z === 1) return;
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    if (!(t instanceof Element) || !t.closest("[_echarts_instance_]")) return;
    const r = t.getBoundingClientRect();
    Object.defineProperty(e, "offsetX", { value: (e.clientX - r.left) / z, configurable: true });
    Object.defineProperty(e, "offsetY", { value: (e.clientY - r.top) / z, configurable: true }); };
  ["mousemove", "mousedown", "mouseup", "click", "dblclick", "contextmenu", "wheel", "mousewheel", "mouseover", "mouseout",
    "pointermove", "pointerdown", "pointerup", "pointerover", "pointerout"].forEach((ev) => window.addEventListener(ev, fix, true));
  fit();
}

/* ---------------- 동작 ---------------- */
act("nav", (el) => go(el.dataset.arg));
act("nav-recruit", () => { S.ui.nav_open = true; go("recruit", "postings"); return false; });   // 이름 = 늘 채용 현황(요청 T4)
act("nav-fold", () => { S.ui.nav_open = !S.ui.nav_open; });                                   // ^ = 펼치기·접기만
act("nav-sub", (el) => { go("recruit", el.dataset.arg); return false; });
act("sub", (el) => { go("recruit", el.dataset.arg); return false; });
act("go", (el) => { go(el.dataset.arg, el.dataset.arg2 || null); return false; });
act("theme", (el) => { S.theme = el.dataset.arg; applyTheme(); delete CH.hosts.hh; S._lastPage = null; S.pageEntry = (S.pageEntry || 0) - 1; });   // 홈 무대를 새 테마 색으로(02 네트워크는 다시 자라지 않음)
act("roadmap", (el) => {   // 다시 그리지 않음: 폭만 움직이고(요청 AA7) 홈 드론에 알림(AA8)
  const open = !S.ui.roadmap_open, doc = document.documentElement, ms = parseInt(D.theme.base["--duration-slide"], 10) || 300;
  S.ui.roadmap_open = open; save();
  doc.classList.add("roadmap-anim"); clearTimeout(window.__rtAnim);
  window.__rtAnim = setTimeout(() => { doc.classList.remove("roadmap-anim"); Object.values(CH.cache).forEach((x) => x.inst.resize()); }, ms + 100);
  window.dispatchEvent(new CustomEvent("dd-roadmap", { detail: { open } }));
  doc.dataset.roadmap = open ? "open" : "closed";
  el.outerHTML = roadmapBtn();
  return false;
});
act("rm-fold", (el) => {   // 스크랩 목록 펼치기·접기(요청 AB4·AC3): 다시 그리지 않고 바로
  const no = el.dataset.arg, cur = (S.ui.rm_open || "").split("|").filter((x) => x && x !== no);
  if (!(S.ui.rm_open || "").includes(`|${no}|`)) cur.push(no);
  S.ui.rm_open = cur.length ? `|${cur.join("|")}|` : ""; document.documentElement.dataset.rmOpen = S.ui.rm_open;
  return false;
});
act("toc", (el) => {       // 화면 목차(요청 AB5·AD3·AD4): 접힌 펼치기면 펼치며 이동
  const id = el.dataset.arg, target = document.getElementById(id); if (!target) return false;
  const d = target.matches("details") ? target : target.querySelector("details");
  if (el.dataset.arg2 && d && !d.open) { const k = d.dataset.openKey; if (k) { setv(k, true); save(); render(); scrollToId(id); return false; } d.open = true; }
  scrollToId(id, !!el.dataset.arg2);
  return false;
});
act("rm-reset", (el) => { scrapped(el.dataset.arg).forEach((v) => delete S.scrap[scrapKey(v.entity_type, v.entity_id)]); });   // 종류별 스크랩 모두 해제(요청 AT)
act("mc-reset", () => { Object.assign(S.profile, { education: null, career_type: null, regions: [] }); });        // 내 조건 비움(요청 AT)
act("co-with-clear", () => { Object.assign(P("companies"), { with: [], page: 0 }); });                               // 함께 하는 분야 해제(요청 AS)
act("card-size", (el) => { setv(el.dataset.key, +el.value); if (el.dataset.reset) setv(el.dataset.reset, 0); });
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
act("i02-jobs", () => { const st = P("industry"); go("jobs", null, { area: st.area, job_ids: D.applicationBridge
  .filter((r) => r.application_id === st.area && r.review_status !== "rejected").map((r) => r.job_id) }); return false; });
act("go-companies-area", (el) => { go("recruit", "companies", { area: [el.dataset.arg] }); return false; });
act("jobs-clear-handoff", () => { Object.assign(P("jobs"), { handoff: null, page: 0 }); });
act("jobs-major", (el) => { const st = P("jobs"); st.major = st.major === el.dataset.val ? null : el.dataset.val; st.middle = null; st.page = 0;
  if (st.major) st.cards_open = true; });   // 고르면 직무 카드 펼침(요청 X3)
act("jobs-acts", (el) => { ACTIONS.pill(el); if ((P("jobs").acts || []).length) P("jobs").cards_open = true; });
act("ind-area", (el) => { ACTIONS.pill(el); indReveal(); });
act("post-pill", (el) => { ACTIONS.pill(el); const st = P("postings"); if (["job", "region", "career", "edu"].some((k) => st[k].length)) st.cards_open = true; });
// 02 키워드 필터(요청 AM): 고르면 위 직무 카드를 펼치고 그리로 이동
const j05Set = (v) => { const st = P("jobs"); Object.assign(st, { j05: v || null, page: 0 }); if (v) { st.cards_open = true; S._scrollTo = "jobs-cards"; } };
act("j05-pick", (el) => j05Set(P("jobs").j05 === el.dataset.val ? null : el.dataset.val));
act("j05-select", (el) => j05Set(el.value));
act("j05-clear", () => { Object.assign(P("jobs"), { j05: null, page: 0 }); });
// 03 기술 칩(요청 AG2): 고르면 '내 직무 준비'만 바뀜. 아래 교육 찾기는 '이 기술 관련 교육 찾기' 단추로만
act("learn-skill", (el) => { const st = P("learning"), v = el.dataset.val; st.skill = st.skill === v ? null : v; });
act("learn-find", (el) => { Object.assign(P("learning"), { extra: el.dataset.arg, page: 0, ex_open: true }); S._scrollTo = "toc-learning-0"; });
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
act("co-area", (el) => { coPickArea(el.dataset.val); });
act("co-more-areas", () => { const st = P("companies"); st.all = !st.all; });
act("co-kw", (el) => { const st = P("companies"); Object.assign(st, { kw: el.value, page: 0 }); if (el.value) st.cards_open = true; });
act("input", (el) => { setv(el.dataset.key, el.value); if (el.dataset.reset) setv(el.dataset.reset, 0); });
// 02 직무·기술 검색(요청 O4): 고르면 아래 직무 카드가 열림 / J05 전체 키워드 검색 상자
act("jobs-search", (el) => { const st = P("jobs"); Object.assign(st, { text: el.value, page: 0 }); if (el.value) st.cards_open = true; });
act("j05-input", (el) => j05Set(el.value));
act("jobs-middle", (el) => { const st = P("jobs"); st.middle = st.middle === el.dataset.val ? null : el.dataset.val; st.page = 0;
  if (st.middle) st.cards_open = true; });
// 02 오른쪽 열: 방산 관련 직무 ↔ 전체 보기(서로 해제, 요청 M7)
act("j01-defense", () => { const on = !S.ui.highlight_defense; S.ui.highlight_defense = on; if (on) Object.assign(P("jobs"), { major: null, middle: null, page: 0 }); });
act("j01-all", () => { S.ui.highlight_defense = false; Object.assign(P("jobs"), { major: null, middle: null, page: 0 }); });
// 카드 펼치기로 이동(02 보러가기, 04 스크랩하러 가기): 펼치고 그 자리로(사용자가 스크롤하면 그만둠, 요청 AB8)
const openAndScroll = (page, id) => { P(page).cards_open = true; S._scrollTo = id; save(); render(); return false; };
act("jobs-to-cards", () => openAndScroll("jobs", "jobs-cards"));
act("post-to-cards", () => openAndScroll("postings", "post-cards"));

/* ---------------- 시작 ---------------- */
function boot() {
  load(); readHash(); applyTheme(); fitZoom();
  const banner = document.querySelector(".share-banner");   // 탐색 경로 패널 높이 = 본문 스크롤 영역(배너 아래)
  const setBanner = () => document.documentElement.style.setProperty("--banner-h", (banner ? banner.offsetHeight : 0) + "px");
  setBanner(); window.addEventListener("resize", setBanner);
  const app = document.getElementById("app");
  app.addEventListener("click", (e) => handle(e, "click"));
  app.addEventListener("change", (e) => { if (e.target.matches("input[type=checkbox], select, input[type=search]")) handle(e, "change"); });
  app.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.matches("input[type=search]")) handle(e, "change"); });
  // 검색 상자 목록에서 고르면 바로 반영(datalist 선택은 change 대신 input으로 옴)
  app.addEventListener("input", (e) => { if (e.target.matches("input[list]") && (!e.inputType || e.inputType === "insertReplacementText")) handle(e, "change"); });
  app.addEventListener("toggle", (e) => {   // 펼칠 때 그리는 영역(국가 R&D·행렬)과 숨어 있던 차트 크기 맞춤
    const k = e.target.dataset && e.target.dataset.openKey;
    if (k) { if (!!getv(k) !== e.target.open) { setv(k, e.target.open); if (!k.startsWith("ui.")) render(); else save(); } }
    else Object.values(CH.cache).forEach((x) => x.inst.resize());
  }, true);
  const dlg = document.getElementById("dlg");
  dlg.addEventListener("click", (e) => { if (e.target === dlg) { S.dialog = null; render(); } else handle(e, "click"); });
  dlg.addEventListener("cancel", (e) => { e.preventDefault(); S.dialog = null; render(); });
  window.addEventListener("hashchange", () => { readHash(); render({ scrollTop: true }); });
  // 글꼴(5개 굵기)을 모두 불러온 뒤 처음 그린다: 차트가 대체 글꼴로 글자 폭을 재면 줄바꿈·잘림이 달라짐(v5 렌더링 맞춤)
  const ready = document.fonts && document.fonts.load
    ? Promise.all([400, 500, 600, 700, 800].map((w) => document.fonts.load(`${w} 16px Pretendard`))).catch(() => null) : Promise.resolve();
  Promise.race([ready, new Promise((r) => setTimeout(r, 2500))]).then(() => render());
}
/** 01 분야: 접힌 상태에서 안 보이는 분야(흐린 맨 아래 줄부터)를 고르면 '분야 더보기'를 펼친다(요청 T2) */
function indReveal() { const st = P("industry"); if (st.area && (PG._indHidden || []).includes(st.area)) st.all = true; }
boot();
