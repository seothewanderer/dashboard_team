/* pages.js — 화면 7개 (views/ 대응). 각 함수는 HTML 문자열을 돌려주고, 차트는 CH.place()로 자리만 잡는다. */
"use strict";

const PG = {};

/* ================= 홈 (views/home.py) ================= */
const ENTRIES = [
  { key: "industry", label: "P1 산업 이해", desc: "활용 분야와 산업 규모 살펴보기" },
  { key: "jobs", label: "P2 직무 탐색", desc: "하는 일과 필요한 기술 알아보기" },
  { key: "learning", label: "P3 준비 역량", desc: "배울 기술과 교육 찾아보기" },
  { key: "recruit.postings", label: "P4 채용 공고", desc: "직무·지역별 공고 조건 확인하기" },
  { key: "recruit.companies", label: "P5 기업 탐색", desc: "관심 분야의 기업과 사업 알아보기" },
];
PG.home = () => {
  const latest = D.industrySize[D.industrySize.length - 1];
  const tiles = U.tiles([
    { label: "산업의 범위 · 전국 통계", value: latest.company_total, unit: "개 업체", sub: `${latest.reference_year}년 종사자 ${fmt(latest.employees_total)}명` },
    { label: "살펴볼 직무 · 사전", value: D.jobs.length, unit: "개 직무", sub: `직무–기술 관계 ${fmt(D.overview.relations)}개 · 현재 채용 직업 수 아님` },
    { label: "찾아볼 학습 기회 · 고용24", value: D.courses.length, unit: "개 과정", sub: `회차 ${fmt(D.overview.offerings)}개 · 모집 상태 미확인` },
    { label: "확인할 공고 · 수집 표본", value: D.postings.length, unit: "건 공고", sub: `탐색 조직 ${fmt(D.overview.org)}개(DART 보강 ${D.overview.dart}개) · 서로 더하지 않음` },
  ], 4);
  const go = (label, page, sub) => U.btn(label, "go", { kind: "secondary", arg: page, arg2: sub, icon: "→", cls: "btn--wide" });
  return `<header class="home-hero"><h1 class="home-hero__title">${esc(C_.home_title)}</h1><p class="home-hero__subtitle">${esc(C_.home_subtitle)}</p></header>
    ${U.hero(ENTRIES)}
    <details class="expander"><summary>탐색 메뉴를 버튼으로 열기</summary><div class="expander__body row-wrap">
      ${ENTRIES.map((e) => U.btn(e.label, "hero-go", { kind: "secondary", arg: e.key, title: e.desc })).join("")}</div></details>
    ${U.section("이 대시보드에서 볼 수 있는 것")}${tiles}
    <div class="cols4">${go("산업 보기", "industry")}${go("직무 보기", "jobs")}${go("교육 보기", "learning")}<div class="stack">${go("공고 보기", "recruit", "postings")}${go("기업 보기", "recruit", "companies")}</div></div>
    ${U.caption(`산업 매출 ${fmt(latest.revenue_total_100m_krw, 2)}억원(${latest.reference_year}년, 세부표 합계). 전국 산업 통계와 수집 표본은 서로 다른 자료입니다.`)}
    ${U.section("이렇게 이용해 보세요", "guide")}
    <div class="cols3">${C_.steps.map(([no, t, b]) => `<div class="guide-step"><span class="guide-step__no">${esc(no)}</span><p class="guide-step__title">${esc(t)}</p><p class="guide-step__body">${esc(b)}</p></div>`).join("")}</div>
    ${C_.faq.map(([q, a]) => `<details class="expander"><summary>${esc(q)}</summary><div class="expander__body"><p>${esc(a)}</p></div></details>`).join("")}`;
};

/* ================= 01 산업 이해 (views/p01_industry.py) ================= */
PG.industry = () => {
  const st = P("industry", { area: null, all: false, wide: false, tech: null, app: null, trend_open: false, ex_open: false, ex_page: 0 });
  const latest = D.industrySize[D.industrySize.length - 1];
  let h = U.intro("industry") + U.tiles([   // KPI 아이콘 카드(요청 I1)
    { label: `${latest.reference_year}년 드론 업체`, value: latest.company_total, unit: "개", icon: "company", sub: `제작 ${fmt(latest.company_manufacturing)} · 활용 ${fmt(latest.company_utilization)}` },
    { label: `${latest.reference_year}년 매출`, value: latest.revenue_total_100m_krw, unit: "억원", decimals: 2, icon: "revenue", sub: "세부표 합계 기준" },
    { label: `${latest.reference_year}년 종사자`, value: latest.employees_total, unit: "명", icon: "employee", sub: `제작 ${fmt(latest.employees_manufacturing)} · 활용 ${fmt(latest.employees_utilization)}` },
  ], 3);
  // 펼칠 때만 그려, 선이 왼쪽에서 오른쪽으로 그려지게(요청 I2)
  const years = D.industrySize.map((r) => r.reference_year);
  h += `<details class="expander" data-open-key="industry.trend_open"${st.trend_open ? " open" : ""}><summary>연도별 추이와 제작·활용 구성 보기</summary><div class="expander__body">`;
  if (st.trend_open) h += `<div class="cols3">${[["company_total", "업체", "개"], ["revenue_total_100m_krw", "매출", "억원"], ["employees_total", "종사자", "명"]].map(([f, label, unit]) => {
      const [opt, ht] = CH.sparkline(years, D.industrySize.map((r) => Math.round(r[f] * 100) / 100), unit, S.ui.motion);
      return `<div>${U.caption(`${label}(${unit})`)}${CH.place(`i01_${f}`, opt, ht)}</div>`; }).join("")}</div>
    ${U.caption("조사 표본이 해마다 달라 연도 차이를 성장률로 해석하지 않습니다.")}`;
  h += "</div></details>";

  // I02 분야 — 방산 근거 기업 겹침(요청 H2), 접힌 상태 미리보기 흐림 + 더보기 단추(요청 H3·I3)
  const f = { area: [], defense_group: [], has_posting: false, keyword: "" };
  const counts = L.areaCounts(D.companies, f), TOP = 8, PREVIEW = 2;
  let view = st.all ? counts : counts.slice(0, TOP + PREVIEW);
  if (st.area && !view.some((r) => r.key === st.area)) view = view.concat(counts.filter((r) => r.key === st.area));
  const def = (k) => D.areaDefense[k] || 0;
  const [opt, ht] = CH.overlayHbar(view.map((r) => r.key), view.map((r) => r.n), view.map((r) => def(r.key)),
    { totalName: "전체 기업·기관", partName: "방산 근거 기업·기관", unit: "개", selected: st.area ? [st.area] : [], note: "분야 간 중복 포함" });
  const fade = !st.all && counts.length > TOP;
  h += U.chartCard({ meta: "I02", subtitle: "분야를 누르면 그 분야의 일과 기업으로 이어집니다 · 빨강 = 그중 방산 근거 기업·기관", n: D.companies.length,
    table: [["분야", "기업·기관 수", "그중 방산 근거"], counts.map((r) => [r.key, r.n, def(r.key)])] },
    `<div class="${fade ? "fade" : ""}">${CH.place("i02_bar", opt, ht, (name) => { st.area = st.area === name ? null : name; })}</div>
    <div class="more-row">${U.btn(st.all ? "접기" : `분야 더보기 (전체 ${counts.length}개)`, "ind-more", { kind: "secondary", icon: st.all ? "⌃" : "⌄" })}</div>`
    + U.pills("industry.area", counts.map((r) => r.key), { label: "분야 선택" }));
  if (st.area) {
    const sel = st.area, rel = D.businessAreaDefense.find((r) => r.business_category === sel);
    const jobsHere = D.applicationBridge.filter((r) => r.application_id === sel && r.review_status !== "rejected");
    const nOrg = (counts.find((r) => r.key === sel) || { n: 0 }).n;
    h += `<div class="detail"><p class="detail__title">${esc(sel)}</p>`;
    if (jobsHere.length) {   // '이 분야' 대신 분야 이름(요청 H4)
      h += `<p class="detail__label">${esc(sel)}에서 하는 일 예시 ${U.draftBadge(jobsHere[0].review_status)}</p><ul class="detail__list">
        ${jobsHere.slice(0, 3).map((r) => `<li><b>${esc(D.jobById[r.job_id].job_title_ko)}</b> — ${esc(D.jobById[r.job_id].core_duties || "")}</li>`).join("")}</ul>`;
    } else h += U.caption(`${esc(sel)}에 연결된 직무 후보가 아직 없습니다. 직무 전체에서 찾아보세요.`);
    if (rel) h += U.caption(esc(`국방 활용 관계(${rel.defense_use_case_relation}): ${rel.relation_rationale} · ${rel.usage_note}`));
    h += `<div class="cols3">${U.btn("관련 직무 보기", "i02-jobs", { kind: "secondary", icon: "→", cls: "btn--wide" })}
      ${U.btn(`기업·기관 ${nOrg}개 보기`, "go-companies-area", { kind: "secondary", icon: "→", arg: sel, cls: "btn--wide" })}
      ${U.btn("채용 현황에서 자세히", "go", { kind: "secondary", icon: "→", arg: "recruit", arg2: "postings", cls: "btn--wide" })}</div></div>`;
  } else h += U.caption("분야를 고르면 대표 업무와 관련 직무·기업으로 이어집니다. 인기 분야를 미리 고르지 않습니다.");

  // 드론 분야 연구 기술 (국가 R&D) — 그래프 상시, 과제 목록은 '연구 과제 탐색' 펼치기(요청 H1·H6·H7)
  const N = st.wide ? D.ntis.wide : D.ntis.high, tc = table(N.tech), by = table(N.by_year);
  if (st.tech && !tc.some((r) => r.topic_name === st.tech)) Object.assign(st, { tech: null, app: null });
  const pick = (name) => { st.tech = st.tech === name ? null : name; st.app = null; st.ex_page = 0; if (st.tech) st.ex_open = true; };
  h += U.section("드론 분야에서 연구하는 기술 · 국가 R&D 과제")
    + U.toggle("industry.wide", "탐색 범위 과제까지 포함", { help: "기본은 관련성이 높은 과제만. 켜면 탐색 범위 과제를 더합니다(관련성 낮은 과제는 항상 제외)." });
  const [o3, h3] = CH.overlayHbar(tc.map((r) => r.topic_name), tc.map((r) => r.total), tc.map((r) => r.defense),
    { totalName: "전체 과제", partName: "방산 태그 과제", unit: "개 과제", selected: st.tech ? [st.tech] : [], note: "한 과제가 여러 기술에 중복 집계" });
  const [o1, h1] = CH.stackedVbar(by.map((r) => r.representative_start_year), [["방산 태그 과제", by.map((r) => r.defense), "defense"],
    ["그 외 과제", by.map((r) => r.other), "other"]], { unit: "개 과제", height: h3 });
  h += `<div class="cols2 equal"><div>${U.chartCard({ meta: "I04", title: "연도별 국가 R&D 과제 · 방산 태그", subtitle: "대표 시작 연도 · 빨강 = 방산 태그 과제",
      n: by.reduce((a, r) => a + r.total, 0), table: [["시작 연도", "방산 태그", "그 외", "합계"], by.map((r) => [r.representative_start_year, r.defense, r.other, r.total])] },
      CH.place("i04_year", o1, h1))}</div>
    <div>${U.chartCard({ meta: "I03", n: N.n_projects, subtitle: "막대 = 기술별 전체 과제 · 빨강 = 그중 방산 태그 과제 · 누르면 활용 분야와 과제",
      table: [["기술", "과제 수", "그중 방산 태그"], tc.map((r) => [r.topic_name, r.total, r.defense])] },
      CH.place("i03_bar", o3, h3, pick) + U.pills("industry.tech", tc.map((r) => r.topic_name), { act: "ind-tech", label: "기술 선택" }))}</div></div>`;
  if (st.tech && N.matrix.index.includes(st.tech)) {
    const row = N.matrix.values[N.matrix.index.indexOf(st.tech)];
    const [o4, h4] = CH.heatmap(N.matrix.columns, [st.tech], [row], { unit: "개 과제", selectedX: st.app, clickX: true, rotateX: 30 });
    h += U.caption(`'${esc(st.tech)}' 과제의 활용 분야 · 셀 = 두 태그를 함께 가진 과제 수 · 칸을 누르면 아래 '연구 과제 탐색'에 그 과제가 나옵니다`)
      + CH.place("i03_heat", o4, h4, (name) => { st.app = st.app === name ? null : name; st.ex_page = 0; st.ex_open = true; });
  }
  // 연구 과제 탐색: 최근 기준연도 → 정부 투자액 순(빌드 때 정렬), 10개씩
  let ids = N.all_ids;
  if (st.tech) { const s = new Set(N.tech_ids[st.tech] || []); ids = ids.filter((i) => s.has(i)); }
  if (st.tech && st.app) { const s = new Set(N.app_ids[st.app] || []); ids = ids.filter((i) => s.has(i)); }
  const scope = st.app ? `${st.tech} × ${st.app}` : st.tech || "전체 과제";
  h += `<details class="expander" data-open-key="industry.ex_open"${st.ex_open ? " open" : ""}><summary>연구 과제 탐색 · ${esc(scope)} ${fmt(ids.length)}개</summary><div class="expander__body">`;
  if (st.ex_open) {
    h += `<div class="row-wrap">${U.context("조건", scope, " · 최근 기준연도 → 정부 투자액 순")}${st.tech ? U.btn("조건 해제(전체 과제)", "ind-clear-tech", { icon: "✕" }) : ""}</div>`
      + U.pager("industry.ex_page", ids.length, "개 과제")
      + L.paginate(ids, st.ex_page)[0].map((i) => { const p = D.projects[i];
        return `<div class="evidence-row"><p class="evidence-row__title">${esc(p.project_title)} ${p.defense_flag === 1 ? U.badge("방산 태그", "defense") : ""}</p>
          <p class="evidence-row__meta">${esc(p.lead_institution || "")} · ${p.representative_start_year}~${p.latest_reference_year} · ${esc(p.ministry || "")}</p></div>`; }).join("");
  }
  return h + "</div></details>";
};

/* ================= 02 직무 탐색 (views/p02_jobs.py) ================= */
PG.jobs = () => {
  const st = P("jobs", { text: "", acts: [], major: null, middle: null, page: 0, handoff: null, j05: null, j05_page: 0, cards_open: false, def_only: false });
  const ho = consumeHandoff("jobs");
  if (ho) { st.handoff = ho; st.page = 0; }
  let h = U.intro("jobs");
  if (st.handoff) h += U.handoff(`01 산업 이해의 '${esc(st.handoff.area)}' 분야에서 온 직무 후보 ${(st.handoff.job_ids || []).length}개 · 검토 전 후보`, "jobs-clear-handoff");
  // 직무·기술 검색 = 검색 상자(요청 O2·O4), 근거 유형 필터 삭제(O3)
  h += `<div class="filter-row"><label class="field"><span class="field__label">직무·기술 검색</span>
      ${U.searchBox("jobs.text", [...D.jobs.map((j) => j.job_title_ko), ...D.jobs.flatMap((j) => j.skills)], "예: 자율비행, GIS, CAD · 입력하거나 펼쳐서 찾기", { act: "jobs-search" })}</label>
    <div class="field"><span class="field__label">하는 일</span>${U.pills("jobs.acts", C_.activities, { multi: true, reset: "jobs.page", label: "하는 일" })}</div></div>`;
  const base = L.filterJobs(D.jobs, { activities: st.acts, text: st.text, jobIds: st.handoff ? st.handoff.job_ids : null });
  const middle = st.major ? st.middle : null, hl = S.ui.highlight_defense;
  const tableRows = {}; base.forEach((j) => { const k = j.major_category + "|" + j.middle_category; tableRows[k] = (tableRows[k] || 0) + 1; });
  // 3D 홀로그램 네트워크(요청 M) + 오른쪽 열(방산 관련 직무 ↔ 전체 보기, 대분류·중분류 한 줄씩, 보러가기)
  const majors = uniq(D.jobs.map((j) => j.major_category)).sort(cmp);
  const middles = st.major ? uniq(D.jobs.filter((j) => j.major_category === st.major).map((j) => j.middle_category)).sort(cmp) : [];
  const defJobs = base.filter((j) => j.defense_workplace), defMaj = new Set(defJobs.map((j) => j.major_category)), defMid = new Set(defJobs.map((j) => j.middle_category));
  const vpills = (key, opts, defSet, act) => `<div class="pills pills--col">${opts.map((v) => { const on = st[key] === v;
    return `<button type="button" class="pill${on ? " on" : ""}${hl && !defSet.has(v) ? " pill--faded" : ""}" data-act="${act}" data-val="${esc(v)}" aria-pressed="${on}">${esc(v)}</button>`; }).join("")}</div>`;
  const side = `<div class="j01-col">
      <div class="j01-actions">${U.btn("방산 관련 직무", "j01-defense", { cls: "j01-btn j01-btn--defense" + (hl ? " on" : "") })}
        ${U.btn("전체 보기", "j01-all", { cls: "j01-btn j01-btn--all" + (!st.major && !hl ? " on" : "") })}</div>
      <div class="j01-sep"><span>대분류</span></div>${vpills("major", majors, defMaj, "jobs-major")}
      <div class="j01-sep"><span>중분류</span></div>${st.major ? vpills("middle", middles, defMid, "jobs-middle") : '<p class="j01-hint">대분류를 먼저 선택하세요</p>'}
      <div class="j01-bottom">${U.btn("관련 직무 카드 보러가기", "jobs-to-cards", { kind: "primary", icon: "↓", cls: "j01-btn--cards" })}</div></div>`;
  h += U.chartCard({ meta: "J01", title: "드론 직무 네트워크", n: base.length,
    subtitle: "누른 채 끌어서 돌려 보세요(마우스를 올리면 멈춤) · 대분류·중분류를 누르면 그 가지만 강조 · 가운데 = 전체 · 빨강 = 방산기업 근무처 직무",
    table: [["대분류", "중분류", "직무 수"], Object.entries(tableRows).sort().map(([k, n]) => [...k.split("|"), n])] },
    `<div class="j01-row"><div class="j01-graph"><div data-comp="g3-${S.theme}"></div></div>${side}</div>`);
  CH.mountComp(`g3-${S.theme}`, G3, CH.net3dData(base, { major: st.major, middle, highlight: hl }), (name, value) => netClick(value));

  // 직무 카드 펼치기(제목 고정, 요청 L5·M12) + 방산 관련만 보기
  let result = L.filterJobs(base, { major: st.major ? [st.major] : null, middle: middle ? [middle] : null }).sort(by("major_category", "middle_category", "job_title_ko"));
  if (st.def_only) result = result.filter((j) => j.defense_workplace);
  h += `<details class="expander" id="jobs-cards" data-open-key="jobs.cards_open"${st.cards_open ? " open" : ""}><summary>직무 카드 보기</summary><div class="expander__body">`;
  if (st.cards_open) {
    h += `<div class="row-wrap">${U.onlyToggle("jobs.def_only", "방산 관련만 보기", "defense", "방산기업이 근무처에 있는 직무 카드만 봅니다. 위 네트워크 그래프는 그대로입니다.")}</div>`
      + U.pager("jobs.page", result.length, "개 직무") + U.grid(L.paginate(result, st.page)[0], U.jobCard);
    if (!result.length) h += U.info("조건에 맞는 직무가 없습니다. 검색어나 필터를 해제해 보세요.");
  }
  h += "</div></details>";

  // J05
  h += U.section("직무 키워드 또는 보유 기술로 직무 찾기");
  const counts = Object.entries(D.jobSkillCounts).sort((a, b) => b[1] - a[1]);
  const frequent = counts.filter(([, n]) => n >= 3).map(([k]) => k);
  h += `<div class="field"><span class="field__label">자주 나오는 키워드</span>${U.pills("jobs.j05", frequent, { act: "j05-pick" })}</div>
    <label class="field"><span class="field__label">전체 키워드에서 찾기</span>${U.searchBox("jobs.j05", counts.map(([k]) => k), `키워드 ${counts.length}개 중 검색 · 입력하거나 펼쳐서 찾기`, { act: "j05-input" })}</label>`;
  if (st.j05) {
    const ov = L.skillOverlap(D.jobs, [st.j05]);
    const found = ov.map((r) => r.job).sort(by("major_category", "middle_category", "job_title_ko"));
    h += U.context("키워드", st.j05, ` · 사전에 이 키워드가 적힌 직무 ${ov.length}개`) + U.pager("jobs.j05_page", found.length, "개 직무")
      + U.grid(L.paginate(found, st.j05_page)[0], U.jobCard) + U.caption("정확히 같은 표기와 검토된 동의어만 연결합니다. 합격 가능성이나 적합도 점수가 아닙니다.");
  } else h += U.caption("키워드를 고르면 직무 사전에서 그 키워드가 적힌 직무 카드를 보여 줍니다.");
  return h;

  function netClick(name) {
    if (!name || name.includes(" > ")) return;
    const [kind, value] = [name.slice(0, 1), name.slice(2)];
    if (kind === "M") { st.major = st.major === value ? null : value; st.middle = null; st.page = 0; }
    else if (kind === "D") { const j = D.jobs.find((x) => x.middle_category === value); if (!j) return;
      const same = st.middle === value; Object.assign(st, { major: j.major_category, middle: same ? null : value, page: 0 }); }
    else if (kind === "J") S.dialog = { kind: "job", id: value };
    else if (kind === "R") Object.assign(st, { major: null, middle: null, page: 0 });
  }
};

/* ================= 03 준비 역량 (views/p03_learning.py) ================= */
// 위에서부터: 지도·키워드 막대 → 교육/채용 키워드로 찾기 → 공고 기술 그래프 펼치기 → 교육 과정 펼치기 (요청 J, K)
const LEARN_EDU = "교육 키워드", LEARN_REC = "채용 키워드";
PG.learning = () => {
  const st = P("learning", { job: null, skill: null, extra: null, mode: LEARN_EDU, kws: [], rkws: [], region: null, group: null,
    page: 0, s03: "비행제어/드론플랫폼", ex_open: false, no_course: null });
  const ho = consumeHandoff("learning");
  if (ho) { st.job = ho.job_id || st.job; if (ho.skill) { st.skill = ho.skill; st.extra = ho.skill; } if (ho.keyword) st.extra = ho.keyword; st.page = 0; }
  const goal = S.plan.goal_job_id, jobId = st.job || goal;
  let h = U.intro("learning");
  if (jobId) h += U.context(jobId === goal ? "목표 직무" : "살펴보는 직무(목표 아님)", D.jobById[jobId].job_title_ko);
  else h += U.info("목표 직무를 고르면 그 직무에 필요한 기술별 학습 자료를 볼 수 있어요. 키워드로 교육만 찾아볼 수도 있습니다.")
    + U.btn("직무부터 둘러보기", "go", { kind: "secondary", arg: "jobs", icon: "→" });

  // S02 (목표 직무가 있을 때)
  if (jobId) {
    const skills = D.jobById[jobId].skills;
    h += U.section("기술을 왜 배우고 어디서 배우나") + U.pills("learning.skill", skills, { act: "learn-skill", label: "기술 선택" });
    if (st.skill && skills.includes(st.skill)) {
      const rs = L.resourcesFor(jobId, st.skill);
      if (rs.length) {
        h += `<div class="why"><p class="why__label">배우는 이유</p><p class="why__text">${esc(rs[0].why_learn)}</p>
          <p class="why__label">먼저 알면 좋은 것</p><p class="why__text">${esc(rs[0].prerequisite)}</p></div>`;
        uniq(rs.map((r) => r.relevance)).forEach((rel) => { const g = rs.filter((r) => r.relevance === rel);
          h += `<p class="detail__label">${esc(rel)} ${U.badge(g.length + "개", "neutral")}</p>` + g.map((r) => `<div class="res-row">
            <p class="evidence-row__title">${esc(r.course_name)} · <span class="muted">${esc(r.provider)} · ${esc(r.learning_type)}</span></p>${U.link("원문", r.url)}</div>`).join(""); });
        h += U.caption(`연결표의 관계(직접 학습·일부 포함·선수 학습)는 교육 내용을 재검증했다는 뜻이 아닙니다. 확인일 ${esc(rs[0].verified_date)}.`);
      } else h += U.caption("이 기술과 연결된 학습 리소스가 연결표에 없습니다. 아래 키워드로 찾아보세요.");
    }
  }

  // 조건에 맞는 과정: 교육 키워드 = 수집 검색어만 / 채용 키워드 = 과정명·검색어·NCS명. 넘어온 기술은 합집합. 조건 없으면 전체
  const kc = L.keywordCounts(), kwN = Object.fromEntries(kc.map((r) => [r.key, r.n])), keywords = kc.map((r) => r.key);
  const recN = Object.fromEntries(D.recruitKw.map((r) => [r.keyword, r.n])), recPost = Object.fromEntries(D.recruitKw.map((r) => [r.keyword, r.posting_count]));
  const edu = st.mode === LEARN_EDU, words = edu ? st.kws : st.rkws;
  let cands = L.searchCourses(words, jobId, edu);
  if (st.extra) { const have = new Set(cands.map((c) => c.course_id));
    cands = cands.concat(L.searchCourses([st.extra], jobId, false).filter((c) => !have.has(c.course_id))); }
  if (!words.length && !st.extra) cands = D.courses.map((c) => ({ course_id: c.course_id, reasons: [], relevance: [], group: L.GROUP_ALL }));
  const label = edu ? LEARN_EDU : LEARN_REC;
  const scope = [...(words.length ? [`${label} ${words.join(", ")}`] : []), ...(st.extra ? [`기술 ${st.extra}`] : [])].join(" · ") || "전체 교육";

  // 1) 지도 + 키워드 막대: 들어오자마자 보이게 맨 위(요청 K1). 지도에 마우스 = 막대가 그 지역 값, 클릭 = 지역 필터
  const rc = L.regionCourseCounts(new Set(cands.map((c) => c.course_id)));
  const bars = { ...L.regionKeywordCounts(), 전국: kwN };
  const totalsAll = { ...L.regionCourseCounts(new Set(D.courses.map((c) => c.course_id))), 전국: D.courses.length };
  const [om, hm] = CH.koreaMap(Object.fromEntries(CH.REGIONS.map((r) => [r, rc[r] || 0])), { selected: st.region ? [st.region] : [], unit: "개 과정" });
  om.tooltip.confine = true;
  const home = st.region || "전국", selKw = edu ? st.kws : [];
  const offMap = Object.entries(rc).filter(([k, n]) => !CH.REGIONS.includes(k) && n > 0);
  h += U.chartCard({ meta: "S04", title: `어느 지역에서 열리나 · ${scope}`, n: cands.length, table: [["지역", "과정 수"], Object.entries(rc)] },
    `<div class="linked"><div>${CH.place("s04_map", om, hm, (name) => { if (!CH.REGIONS.includes(name)) return;
        st.region = st.region === name ? null : name; st.page = 0; if (st.region) st.ex_open = true; })}</div>
      <div><p class="linked__title" id="s04-title"></p><p class="linked__sub" id="s04-sub"></p>
        ${CH.place("s04_kw", CH.keywordBars(keywords, bars[home] || {}, selKw, home), hm - 64, (name) => { learnToggle(st, LEARN_EDU, name); })}</div></div>`
    + U.caption((offMap.length ? offMap.map(([k, n]) => `${k} ${n}개 과정`).join(" · ") + " (지도 밖 별도 표기) · " : "")
      + "지도에 마우스를 올리면 오른쪽 막대가 그 지역 값으로 바뀌고, 누르면 그 지역 과정만 봅니다. 막대를 누르면 교육 키워드로 찾습니다."));
  CH.after.push(() => {   // 마우스 연동: 다시 그리지 않고 막대만 바꿈
    const map = CH.cache.s04_map, bar = CH.cache.s04_kw;
    if (!map || !bar) return;
    const show = (region) => { bar.inst.setOption(CH.keywordBars(keywords, bars[region] || {}, selKw, region), { notMerge: false });
      document.getElementById("s04-title").textContent = `${region} · 키워드별 교육 과정`;
      document.getElementById("s04-sub").textContent = `과정 ${fmt(totalsAll[region] || 0)}개 · 막대를 누르면 그 키워드로 찾습니다`; };
    show(home);
    map.inst.off("mouseover"); map.inst.off("globalout");
    map.inst.on("mouseover", (p) => { if (CH.REGIONS.includes(p.name)) show(p.name); });
    map.inst.on("globalout", () => show(home));
  });

  // 2) 교육 키워드로 찾기 / 채용 키워드로 찾기 (요청 K2). 지역 조건은 두 방식 공통
  h += U.section("키워드로 교육 찾기") + `<div class="subtabs">${[LEARN_EDU, LEARN_REC].map((m) =>
    `<button type="button" class="subtab${m === st.mode ? " on" : ""}" data-act="learn-mode" data-arg="${m}">${m}로 찾기</button>`).join("")}</div>`;
  const options = edu ? keywords : D.recruitKw.map((r) => r.keyword), nOf = edu ? kwN : recN;
  h += `<label class="field kw-search"><span class="field__label">${label} 검색 · 여러 개 선택</span>
    <select data-act="learn-add">${`<option value="">${edu ? "교육 키워드 검색 (예: 드론조종, CAD)" : "채용 키워드 검색 (예: 비행제어, 임베디드)"}</option>`}
    ${options.filter((k) => !words.includes(k)).map((k) => `<option value="${esc(k)}">${esc(k)} (${edu ? kwN[k] : `교육 ${recN[k]} · 공고 ${recPost[k]}`})</option>`).join("")}</select></label>`;
  h += U.pills(edu ? "learning.kws" : "learning.rkws", options, { multi: true, act: "learn-kw", label,
    html: (k) => `${esc(k)}<span class="pill__n">(${nOf[k]})</span>` });   // 개수는 괄호·흐리게·작게(요청 J2)
  if (st.extra || st.region) h += `<div class="filters-row">${st.extra ? U.btn(`선택한 기술: ${st.extra}`, "learn-clear-extra", { kind: "secondary", icon: "✕", title: "선택한 기술을 지웁니다" }) : ""}
    ${st.region ? U.btn(`지역: ${st.region}`, "learn-clear-region", { kind: "secondary", icon: "✕", title: "지역 조건을 지웁니다" }) : ""}</div>`;
  h += U.caption(edu ? `교육 키워드 = 고용24에서 과정을 모을 때 쓴 검색어(괄호 = 그 검색어로 모인 과정 수). 여러 개를 고르면 하나라도 해당하는 과정을 보여 줍니다. 수집 때 결과가 없던 검색어(${D.emptyKeywords.join(", ")})는 단추에 없습니다.`
    : `채용 키워드 = 수집 공고에서 언급된 기술 중 관련 교육이 있는 ${D.recruitKw.length}개(공고 언급 많은 순, 괄호 = 과정명·검색어·NCS명에 그 단어가 있는 과정 수). 단어 일치일 뿐 교육 내용은 확인이 필요합니다. 공고 언급 수는 아래 그래프에서 볼 수 있습니다.`);

  // 3) 채용 키워드 그래프 펼치기 (S03): 막대 클릭 = 채용 키워드로 찾기
  const cats = uniq(D.postingKw.map((k) => k.keyword_category_name)).sort(cmp);
  const sub = D.postingKw.filter((k) => k.keyword_category_name === st.s03).sort((a, b) => b.posting_count - a.posting_count).slice(0, 12);
  const [o1, h1] = CH.hbar(sub.map((k) => k.keyword_normalized), sub.map((k) => k.posting_count), { unit: "건 공고", selected: edu ? [] : st.rkws });
  if (!edu) h += `<details class="expander"><summary>수집 공고에서 언급된 기술 보기 (전체 공고 기준)</summary><div class="expander__body">
    ${U.pills("learning.s03", cats, { required: true, label: "분류" })}
    ${U.chartCard({ meta: "S03", table: [["키워드", "공고 수", "비율(%)"], sub.map((k) => [k.keyword_normalized, k.posting_count, k.posting_share_pct])] },
      CH.place("s03_bar", o1, h1, (name) => { if (name in recN) { st.no_course = null; learnToggle(st, LEARN_REC, name); } else st.no_course = name; }))}
    ${st.no_course && sub.some((k) => k.keyword_normalized === st.no_course) ? U.info(`'${esc(st.no_course)}'과(와) 이름이 일치하는 교육 과정이 없습니다.`) : ""}
    ${U.caption("막대를 누르면 '채용 키워드로 찾기'에 들어가고 과정 목록이 펼쳐집니다.")}</div></details>`;

  // 4) 교육 과정 펼치기 (요청 J3): 기본 닫힘, 조건을 고르면 자동으로 펼쳐짐, 10개씩
  const today = L.today();
  D.offerings.forEach((o) => { o.date_status = L.dateStatus(o, today); });
  let ranked = L.rankCourses(cands, L.representative(D.offerings), S.profile);
  if (st.region) { const inR = L.coursesInRegion(st.region); ranked = ranked.filter((r) => inR.has(r.course_id)); }
  if (st.drone_only) ranked = ranked.filter((r) => r.source_group === "drone");   // 1차 드론 수집 과정(요청 L5)
  const where = [scope, ...(st.region ? [st.region] : []), ...(st.drone_only ? ["드론 관련만"] : [])].join(" · ");
  h += `<details class="expander" data-open-key="learning.ex_open"${st.ex_open ? " open" : ""}><summary>교육 과정 보기 · ${esc(where)} ${fmt(ranked.length)}개</summary><div class="expander__body">`;
  if (st.ex_open) {
    h += `<div class="row-wrap">${U.onlyToggle("learning.drone_only", "드론 관련만 보기", "drone", "드론 검색어로 모인 과정만 봅니다. 초록 띠 카드입니다.")}${U.goalToggle()}</div>`;
    if (!ranked.length) h += U.info("조건에 맞는 과정이 없습니다. 키워드나 지역 조건을 바꿔 보세요.");
    else {
      if (U.goalOn()) { const job = D.jobById[goal]; ranked = ranked.map((r) => ({ ...r, goal_reason: L.courseGoalReason(r, job) }));
        h += U.goalStatus(ranked.filter((r) => r.goal_reason).length, ranked.length); }
      const groups = L.LEARN_GROUPS.filter((g) => ranked.some((r) => r.group === g));
      if (!groups.includes(st.group)) st.group = groups[0];
      if (groups.length > 1) h += U.pills("learning.group", groups, { required: true, reset: "learning.page", format: (g) => `${g} ${ranked.filter((r) => r.group === g).length}` });
      const inGroup = ranked.filter((r) => r.group === st.group);
      if (st.group === L.GROUP_SEARCH) h += U.caption("검색어·과정명이 일치하는 후보 · 교육 내용 확인 필요");
      h += U.pager("learning.page", inGroup.length, "개 과정") + U.grid(L.paginate(inGroup, st.page)[0], U.courseCard);
    }
  }
  h += "</div></details>";
  if (jobId && st.skill) {
    const ext = L.resourcesFor(jobId, st.skill).filter((r) => !r.is_work24);
    if (ext.length) h += `<details class="expander"><summary>공식 참고자료 ${ext.length}개</summary><div class="expander__body">
      ${ext.map((r) => `<p>${isStr(r.url) ? `<a href="${esc(r.url)}" target="_blank" rel="noopener">${esc(r.course_name)}</a>` : esc(r.course_name)} · ${esc(r.provider)}</p>`).join("")}</div></details>`;
  }
  return h;
};
/** 한 방식 안에서 키워드 추가/해제. 고르면 과정 목록을 펼친다 */
function learnToggle(st, mode, name) {
  const key = mode === LEARN_EDU ? "kws" : "rkws", now = st[key];
  st[key] = now.includes(name) ? now.filter((k) => k !== name) : [...now, name];
  Object.assign(st, { mode, page: 0 });
  if (st[key].length) st.ex_open = true;
}

/* ================= 04 채용·기업 탐색 (views/p04_recruit.py) ================= */
PG.recruit = () => {
  const sub = S.route.sub;
  return U.intro(`recruit.${sub}`) + `<div class="subtabs">${Object.entries(RECRUIT_SUBS).map(([k, v]) =>
    `<button type="button" class="subtab${k === sub ? " on" : ""}" data-act="sub" data-arg="${k}">${esc(v)}</button>`).join("")}</div>`
    + (sub === "postings" ? PG.postings() : PG.companies());
};

/* ----- 채용 현황 (views/recruit/postings.py) ----- */
const KEYS = { job_major_category: "job", province_name: "region", career_type: "career", education_normalized: "edu" };
const COLLECTED = "2026년 9월 14일";   // 공고 수집일(원본에 날짜 열 없음, 사용자 확인)
PG.postings = () => {
  const st = P("postings", { job: [], region: [], career: [], edu: [], page: 0, company: null, def_only: false, ratio: false,
    cards_open: false, region_dd: false, mx_open: false });
  const ho = consumeHandoff("recruit.postings");
  if (ho && ho.company_id) { st.company = ho.company_id; st.page = 0; }
  const pf = D.postings, comp = st.company ? [st.company] : null;
  let h = "";
  if (st.company) h += U.handoff(`기업 탐색에서 온 '${esc(D.companyById[st.company].company_name_normalized)}'의 연결 공고만 보는 중`, "post-clear-company");
  // KPI 아이콘 카드(요청 N1): 종이·건물·방패(빨강)
  const sample = L.filterPostings(pf, {}, comp), k = L.kpis(sample);
  const dfn = sample.filter((p) => L.isDefense(p.defense_group)), nDefEmp = uniq(dfn.map((p) => p.employer_name)).length;
  h += U.tiles([{ label: "수집 공고", value: k.postings, unit: "건", icon: "posting", sub: `${COLLECTED} 수집 기준 · 현재 모집 상태 미확인` },
    { label: "공고의 기업 수", value: k.employer_names, unit: "개", icon: "company", sub: "드론 관련 직무 공고를 낸 기업(기업명 기준)" },
    { label: "방산 관련 기업 비율", value: Math.round(nDefEmp / Math.max(k.employer_names, 1) * 1000) / 10, unit: "%", decimals: 1, icon: "shield", tone: "defense",
      sub: `공고를 낸 기업 ${k.employer_names}곳 중 ${nDefEmp}곳 · 공고로는 ${dfn.length}건` }], 3);
  // 공고 조건으로 거르기(요청 N10·N12): 한 줄, 그래프·지도와 같은 필터 상태
  const present = (dim, order) => order.filter((v) => pf.some((p) => p[dim] === v));
  h += `<div class="mycond"><p class="filter-label">공고 조건으로 거르기 · 아래 그래프를 눌러도 같이 바뀝니다</p><div class="mycond__row mycond__row--one">
    <div class="mc"><span class="mc-label">학력</span>${U.pills("postings.edu", present("education_normalized", L.EDUCATION_ORDER), { multi: true, reset: "postings.page" })}</div>
    <div class="mc"><span class="mc-label">경력</span>${U.pills("postings.career", present("career_type", L.CAREER_ORDER), { multi: true, reset: "postings.page" })}</div>
    <div class="mc"><span class="mc-label">지역</span>${U.dropdown("postings.region", uniq(pf.map((p) => p.province_name)).sort(cmp), "전체 지역 · 눌러서 선택", { openKey: "postings.region_dd", reset: "postings.page" })}</div>
    <div class="mc mc--right">${U.onlyToggle("postings.def_only", "방산 관련 기업만 보기", "defense", "켜면 아래 그래프와 공고 카드가 모두 방산 관련 기업의 공고만 보여 줍니다.")}</div></div></div>`;
  const mine = st.def_only ? pf.filter((p) => L.isDefense(p.defense_group)) : pf;
  const filters = Object.fromEntries(Object.entries(KEYS).map(([dim, key]) => [dim, st[key]]));
  const scoped = L.filterPostings(mine, {}, comp), result = L.filterPostings(mine, filters, comp);
  const anyF = Object.values(filters).some((v) => v.length);
  h += `<div class="filterbar"><p class="result-count">조건에 맞는 공고 <b>${result.length}</b>건</p>${anyF ? U.btn("필터 모두 해제", "post-clear", { icon: "✕" }) : ""}</div>`;
  const togF = (key) => (name) => { const a = st[key]; st[key] = a.includes(name) ? a.filter((x) => x !== name) : [...a, name]; st.page = 0; };

  // 직무 막대(왼쪽) + 지역 지도(오른쪽) 연동(요청 N5·N10): 앱 부품 JS(LCM) 그대로
  const fBase = { ...filters }; delete fBase.job_major_category; delete fBase.province_name;
  const base = L.filterPostings(mine, fBase, comp), ratio = st.ratio && !st.def_only;
  const order = L.jobByDefense(base, {}).map((r) => r.key);
  const view = (rows, place) => {
    if (ratio) { const [share, nd, no] = L.jobShareByDefense(rows), m = Object.fromEntries(share.map((r) => [r.key, r]));
      return { title: `${place} · 직무별 공고`, sub: `그룹 안 비중(%) · 방산 관련 기업 공고 ${nd}건 / 그 외 ${no}건 · 빨강 = 방산`,
        option: CH.thinDiverging(order, ["그 외 공고", order.map((k) => (m[k] || {}).other || 0)], [L.DEF_KIND + " 공고", order.map((k) => (m[k] || {}).defense || 0)], { selected: st.job }) }; }
    const jd = Object.fromEntries(L.jobByDefense(rows, {}).map((r) => [r.key, r]));
    return { title: `${place} · 직무별 공고`, sub: `공고 ${uniq(rows.map((p) => p.posting_id)).length}건 · 빨강 = 방산 관련 기업 · 막대를 누르면 그 직무로 거릅니다`,
      option: CH.thinSplit(order, [L.DEF_KIND, order.map((k) => (jd[k] || {})[L.DEF_KIND] || 0)],
        ["그 외 공고", order.map((k) => ((jd[k] || {})[L.GEN_KIND] || 0) + ((jd[k] || {})[L.UNLINKED_KIND] || 0))], { unit: "건", selected: st.job }) };
  };
  const homeRows = st.region.length ? base.filter((p) => st.region.includes(p.province_name)) : base, home = st.region.length ? "선택 지역" : "전국";
  const views = { [home]: view(homeRows, st.region.length ? st.region.join(", ") : "전국") };
  CH.REGIONS.forEach((r) => { views[r] = view(base.filter((p) => p.province_name === r), r); });
  const rc = L.dimCounts(scoped, "province_name", filters);
  const [mapOpt, mapH] = CH.koreaMap(Object.fromEntries(rc.map((r) => [r.key, r.n])), { selected: st.region, unit: "건" });
  const scope = [...st.job, ...st.region].join(", ") || (st.def_only ? "방산 관련 기업" : "전체 공고");
  const jdAll = L.jobByDefense(homeRows, {});
  h += U.chartCard({ meta: ratio ? "H07" : "H01", title: `어느 직무·지역의 공고인가 · ${scope}`, n: homeRows.length,
    table: [["직무 분류", L.DEF_KIND, "그 외 공고", "합계"], jdAll.map((r) => [r.key, r[L.DEF_KIND], r[L.GEN_KIND] + r[L.UNLINKED_KIND], r.total])] },
    `<div class="row-wrap">${U.toggle("postings.ratio", "비율(%)로 보기", { disabled: st.def_only,
      help: st.def_only ? "방산 관련 기업만 보는 중에는 비교할 '그 외' 공고가 없습니다." : "방산 관련 기업 공고와 그 외 공고를 각 그룹 안 비중(%)으로 비교합니다." })}</div>
    <div data-comp="lcm-${S.theme}"></div>`
    + U.caption("지도에 마우스를 올리면 왼쪽 막대가 그 지역 값으로 바뀌고, 누르면 그 지역 공고만 봅니다. 막대를 누르면 그 직무로 거릅니다(다시 누르면 해제)."));
  CH.mountComp(`lcm-${S.theme}`, LCM, { geo: D.geo, map_name: "korea", map_opt: mapOpt, theme: CH.theme(), regions: CH.REGIONS, views, home,
    height: mapH, bar_height: mapH - 2 * (px("caption") + 18 + G.pad), motion: S.ui.motion ? {} : { animation: false } },
    (name, value) => { if (name === "region") togF("region")(value); else togF("job")(value); });

  const bar = (dim, key, title, ord) => { const cc = L.dimCounts(scoped, dim, filters, ord);
    const [o, hh] = CH.hbar(cc.map((r) => r.key), cc.map((r) => r.n), { selected: st[key], unit: "건" });
    return U.chartCard({ meta: "H02", title, n: scoped.length, table: [["구분", "공고 수"], cc.map((r) => [r.key, r.n])] }, CH.place(`h_${key}`, o, hh, togF(key))); };
  h += `<div class="cols2 equal">${bar("career_type", "career", "경력 조건", L.CAREER_ORDER)}${bar("education_normalized", "edu", "학력 조건", L.EDUCATION_ORDER)}</div>`;

  const m = L.jobCareerMatrix(result), et = L.employmentTagCounts(result);
  h += `<details class="expander" data-open-key="postings.mx_open"${st.mx_open ? " open" : ""}><summary>직무 × 경력 / 고용형태 보기</summary><div class="expander__body">`;
  if (st.mx_open) {
    if (m.index.length) { const [o, hh] = CH.heatmap(m.columns, m.index, m.values, { unit: "건" }); h += CH.place("h02_heat", o, hh); }
    const [o, hh] = CH.hbar(et.map((r) => r.key), et.map((r) => r.n), { unit: "건", note: "한 공고가 여러 형태에 중복 집계" });
    h += U.caption("고용형태 · 한 공고가 여러 형태에 중복 집계됩니다") + CH.place("h02_emp", o, hh);
  }
  h += "</div></details>";

  // 공고 카드 펼치기(제목 고정) · 안에 '목표 직무 관련 강조'(요청 N15)
  let ordered = [...result].sort(by("job_major_category", "title"));
  h += `<details class="expander" id="post-cards" data-open-key="postings.cards_open"${st.cards_open ? " open" : ""}><summary>공고 카드 보기 · 원문에서 조건을 확인하세요</summary><div class="expander__body">`;
  if (st.cards_open) {
    h += `<div class="row-wrap">${U.goalToggle()}</div>`;
    if (U.goalOn()) { const job = D.jobById[S.plan.goal_job_id]; ordered = ordered.map((p) => ({ ...p, goal_reason: L.postingGoalReason(p, job) }));
      h += U.goalStatus(ordered.filter((p) => p.goal_reason).length, ordered.length); }
    h += U.pager("postings.page", ordered.length, "건") + U.grid(L.paginate(ordered, st.page)[0], U.postingCard);
    if (!ordered.length) h += U.info("선택한 자료·조건에서 관측 0건입니다. 시장에 채용이 없다는 뜻은 아닙니다.");
  }
  h += "</div></details>";

  // 선택한 직무와 스크랩한 공고 비교(요청 N4·N9): 없으면 파란 안내 상자 + 같은 폭 테두리 단추
  h += U.section("선택한 직무와 스크랩한 공고 비교");
  const goal = S.plan.goal_job_id, ids = scrapped("posting").map((v) => v.entity_id).filter((id) => D.postingById[id]);
  if (!goal || !ids.length) {
    if (!goal) h += `<div class="note"><p class="note__text">아직 선택한 목표 직무가 없습니다. 02 직무 탐색에서 '해당 직무 선택'을 누르면 여기서 비교합니다.</p>${U.btn("직무 선택하러 가기", "go", { arg: "jobs", icon: "→", cls: "note__btn" })}</div>`;
    if (!ids.length) h += `<div class="note"><p class="note__text">아직 스크랩한 공고가 없습니다. 위 공고 카드에서 '스크랩'을 누르면(최대 3개) 목표 직무와 나란히 비교합니다.</p>${U.btn("공고 스크랩하러 가기", "post-to-cards", { icon: "↑", cls: "note__btn" })}</div>`;
  } else { const job = D.jobById[goal], t = L.compareToJob(job, ids.map((id) => D.postingById[id]));
    h += U.context("목표 직무", job.job_title_ko, ` · 기술 ${job.skills.length}개 · 스크랩한 공고 ${ids.length}개`) + U.table(t.header, t.rows)
      + U.caption("점수·적합도가 아닙니다. 공고별 요구 기술 자료가 없어 공고 제목·담당 업무 원문에 나온 용어만 확인합니다(정확 표기 → 검토된 동의어). 분류 관계는 검토 전 관계표 초안입니다."); }
  return h;
};

/* ----- 기업 탐색 (views/recruit/companies.py) ----- */
PG.companies = () => {
  const st = P("companies", { area: [], group: [], posted: false, kw: "", multi: false, all: false, sort: "auto", ids: null, more: 1, cards_open: false, def_only: false });
  const ho = consumeHandoff("recruit.companies");
  if (ho) { if (ho.area) { st.multi = ho.area.length > 1; st.area = ho.area; } st.ids = ho.company_ids || null; }
  const base = st.ids ? D.companies.filter((co) => st.ids.includes(co.company_id)) : D.companies;
  let h = st.ids ? U.handoff(`'${esc(D.companyById[st.ids[0]].company_name_normalized)}' 기업에서 이동해 왔습니다`, "co-clear-ids") : "";
  const f = { area: st.area, defense_group: st.group, has_posting: st.posted, keyword: st.kw || "" };
  h += `<div class="filterbar"><label class="field"><span class="field__label">키워드</span>
      ${U.searchBox("companies.kw", [...D.companies.map((co) => co.company_name_normalized), ...D.companies.flatMap((co) => co.areas), ...D.companies.flatMap((co) => L.splitTags(co.drone_subfields))], "예: 방제, 매핑, 안티드론 · 입력하거나 펼쳐서 찾기")}</label>
    ${U.toggle("companies.posted", "수집 공고 연결됨", { help: "검토 전 연결 후보를 포함합니다." })}
    ${U.toggle("companies.multi", "여러 분야 선택", { act: "co-multi", help: "같은 분류 안에서는 '하나 이상'으로 합칩니다." })}
    ${U.defenseToggle()}${U.goalToggle()}</div>${U.defenseStatus()}`;
  const counts = L.areaCounts(base, f);
  let view = st.all ? counts : counts.slice(0, 8);
  view = view.concat(counts.filter((r) => f.area.includes(r.key) && !view.includes(r)));
  const [o1, h1] = CH.hbar(view.map((r) => r.key), view.map((r) => r.n), { selected: f.area, unit: "개 기업·기관", note: "분야 간 중복 포함" });
  const gc = L.groupCounts(base, f);
  const [o2, h2] = CH.hbar(gc.map((r) => r.key), gc.map((r) => r.n), { selected: f.defense_group, unit: "개",
    tiers: gc.map((r) => L.TIER[r.key] || null), highlight: S.ui.highlight_defense });
  const togArea = (name) => { st.area = st.multi ? (st.area.includes(name) ? st.area.filter((x) => x !== name) : [...st.area, name])
    : (st.area[0] === name ? [] : [name]); };
  h += `<div class="cols32"><div>${U.chartCard({ meta: "C01", title: "분야별 기업·기관", subtitle: "다른 조건 적용 · 분야 선택 전 분포", n: base.length,
      table: [["분야", "기업·기관 수"], counts.map((r) => [r.key, r.n])] },
      CH.place("c01_area", o1, h1, togArea) + U.toggle("companies.all", `분야 더보기 (전체 ${counts.length}개)`)
      + U.pills("companies.area", counts.map((r) => r.key), { multi: true, act: "co-area" }))}</div>
    <div>${U.chartCard({ meta: "C01G", title: "방산 근거 집단", n: base.length, subtitle: "직접확인은 수집 자료 범위의 확인이며 공식 지정과 다릅니다",
      table: [["집단", "기업·기관 수"], gc.map((r) => [r.key, r.n])] },
      CH.place("c01_group", o2, h2, (name) => { st.group = st.group.includes(name) ? st.group.filter((x) => x !== name) : [...st.group, name]; })
      + U.pills("companies.group", L.GROUP_ORDER, { multi: true }))}</div></div>`;

  let result = L.filterCompanies(base, f);
  const dfn = result.filter((co) => L.isDefense(co.defense_group));
  if (dfn.length) {
    const exposed = dfn.filter((co) => co.posting_count > 0).sort((a, b) => b.posting_count - a.posting_count || cmp(a.company_name_normalized, b.company_name_normalized));
    const silent = dfn.filter((co) => co.posting_count === 0).map((co) => co.company_name_normalized).sort(cmp);
    let b = "";
    if (exposed.length) { const [o, hh] = CH.hbar(exposed.map((co) => co.company_name_normalized), exposed.map((co) => co.posting_count),
      { unit: "건", tiers: exposed.map((co) => L.TIER[co.defense_group]) }); b += CH.place("c04_bar", o, hh); }
    if (silent.length) b += U.caption(`수집 공고 0건 ${silent.length}곳: ${esc(silent.slice(0, 8).join(", "))}${silent.length > 8 ? " 외" : ""} · 수집 시점에 공고가 확인되지 않았다는 뜻이며 채용이 없다는 뜻은 아닙니다.`);
    h += U.chartCard({ meta: "C04", n: dfn.length, subtitle: `방산 관련 기업 ${dfn.length}곳 중 수집 공고가 연결된 곳 ${exposed.length}곳`,
      table: [["기업·기관", "근거 집단", "연결 공고 수"], dfn.map((co) => [co.company_name_normalized, co.defense_group, co.posting_count])] }, b);
  }
  // 기업 카드 펼치기(요청 L5) + 방산 관련만 보기
  if (st.def_only) result = result.filter((co) => L.isDefense(co.defense_group));
  h += `<details class="expander" data-open-key="companies.cards_open"${st.cards_open ? " open" : ""}><summary>기업 카드 보기 · ${result.length}개</summary><div class="expander__body">`;
  if (st.cards_open) {
    h += `<div class="row-wrap">${U.onlyToggle("companies.def_only", "방산 관련만 보기", "defense", "방산 근거가 있는 기업·기관 카드만 봅니다. 위 그래프는 그대로입니다.")}</div>
      <div class="field"><span class="field__label">정렬</span>${U.pills("companies.sort", ["auto", "name"], { required: true,
      format: (v) => ({ auto: "자동(방산 근거 우선)", name: "이름순" }[v]) })}</div>`;
    let ranked = L.sortCompanies(result, f, st.sort);
    if (U.goalOn()) { ranked = ranked.map((co) => ({ ...co, goal_reason: L.companyGoalReason(co, S.plan.goal_job_id) }));
      h += U.goalStatus(ranked.filter((co) => co.goal_reason).length, ranked.length); }
    PG._companyRanked = ranked;
    const first = ranked.slice(0, 10);
    const note = L.isSortedByDefense(f, st.sort) ? " · 선택 결과 안에서 원문 직접확인 → 교차출처 → 인접 후보 → 미확인 순, 우수성·채용 순위 아님" : " · 이름순";
    h += `<p class="result-count">조건에 맞는 기업·기관 <b>${ranked.length}</b>개 · 현재 1~${first.length}${esc(note)}</p>` + U.grid(first, U.companyCard);
    if (!ranked.length) h += U.info("조건에 맞는 기업이 없습니다. 필터를 해제해 보세요.");
    if (ranked.length > 10) h += U.btn(`기업 더보기 (11~${Math.min(20, ranked.length)}번째부터)`, "co-more", { kind: "secondary", icon: "⌄" });
  }
  return h + "</div></details>";
};

/* ================= 상세 팝업 (components/dialogs.py) ================= */
const DLG = {};
const dsec = (label, html) => (html ? `<div class="dlg-sec"><p class="dlg-sec__label">${esc(label)}</p>${html}</div>` : "");
const dp = (t) => (isStr(t) ? `<p class="dlg-sec__text">${esc(t)}</p>` : "");
const dhead = (title, eyebrow, badges) => `<div class="dlg-head"><p class="dlg-head__eyebrow">${esc(eyebrow)}</p><p class="dlg-head__title">${esc(title)}</p><div class="dlg-head__badges">${badges}</div></div>`;
const dscrap = (kind, id, title) => scrapBtn(kind, id, title);   // 카드와 같은 책갈피 단추(요청 L3)
DLG.job = (id) => { const j = D.jobById[id], goal = S.plan.goal_job_id === id;
  const ex = D.jobExamples.filter((r) => r.job_id === id).map((r) => r.employer_example);
  return dhead(j.job_title_ko, `${j.major_category} · ${j.middle_category}`, U.badge(j.evidence_type) + U.defenseJobBadge(j.defense_workplace))
    + dsec("핵심 업무", dp(j.core_duties))
    + `<p class="dlg-sec__label">필요 기술 · 누르면 준비 역량에서 관련 교육을 찾습니다</p><div class="row-wrap">${j.skills.map((s) => U.btn(s, "dlg-skill", { kind: "secondary", arg: id, arg2: s })).join("")}</div>`
    + dsec("우대 자격(원문)", dp(j.preferred_qualifications)) + dsec("근무처 유형", dp(j.workplaces.join(" · ")))
    + (ex.length ? dsec("기업 예시 · 현재 채용 사실이 아닙니다", dp(ex.join(" · "))) : "")
    + D.jobPostings.filter((r) => r.job_id === id).map((cse) => dsec("실제 공고 사례", dp(`${cse.actual_employer} · ${cse.actual_posting_title} · 급여 ${cse.salary_original_text}`)) + U.link("공고 원문", cse.actual_posting_url)).join("")
    + U.caption(`출처 ${esc(j.primary_source_name || "")} · 정리일 ${esc(j.collected_date || "")}`)
    + `<div class="row-wrap">${goalBtn(j)}</div>`; };   // 카드와 같은 별 단추(요청 L2)
DLG.posting = (id) => { const p = D.postingById[id];
  return dhead(p.title, `${p.employer_name} · ${p.province_name} ${p.district_name || ""}`, U.badge("수집 공고 · 현재 모집 상태 미확인") + U.defenseBadge(p.defense_group))
    + dsec("담당 업무(원문)", dp(p.responsibilities) || dp("원문에 업무 설명이 없습니다.")) + dsec("경력(원문)", dp(p.career_requirement_raw) || dp(p.career_type))
    + dsec("학력(원문)", dp(p.education_raw) || dp(p.education_normalized)) + dsec("급여(원문)", dp(p.salary_raw) || dp("원문에 급여 표기가 없습니다."))
    + dsec("고용형태", dp((p.employment_types || []).join(", "))) + (isStr(p.verification_note) ? U.caption("검증 메모: " + esc(p.verification_note)) : "")
    + `<p class="dlg-sec__label">내 조건과 비교 · 점수가 아닌 항목별 확인</p>${U.table(["항목", "공고", "내 입력", "상태", "공고 원문"], L.compareToProfile(p, S.profile))}`
    + `<div class="row-wrap">${U.link("공고 원문", p.primary_source_url)}${dscrap("posting", id, p.title)}
      ${p.company_id && D.companyById[p.company_id] ? U.btn("연결 기업 보기", "dlg-switch", { arg: "company", arg2: p.company_id, arg3: `posting:${id}` }) + U.draftBadge(p.link_status) : ""}</div>`; };
DLG.company = (id) => { const co = D.companyById[id];
  let h = dhead(co.company_name_normalized, co.defense_group, U.defenseBadge(co.defense_group) + (co.drone_evidence_missing ? U.badge("드론 활동 근거 미확인") : ""));
  if (co.has_dart) h += dsec("기업 소개(DART 사업보고서 발췌)", dp(co.dart_intro_excerpt)) + U.caption(`${esc(co.dart_report_name || "")} · 회사 전체 소개이며 드론 전담 사업이 아닐 수 있습니다.`);
  else if (co.has_profile) h += U.caption("수집된 DART 자료 없음");
  if (co.has_profile) {
    h += dsec("사업 분야", co.areas.map((a) => U.badge(a)).join("") || dp("분야 미수록")) + dsec("드론 세부 분야", dp(co.drone_subfields))
      + dsec("제품·서비스(원문)", dp(L.splitTags(co.products_services)[0])) + dsec("사업·연구·납품 실적(원문)", dp(co.track_record))
      + U.caption(`드론정보포털 기준일 ${esc(co.reference_date || "")} · 출처 확인일 ${esc(co.source_checked_date || "")} · 주소·근무지 정보는 결측이 많아 표시하지 않습니다.`);
  }
  if (!(co.has_dart || co.has_profile)) h += U.info("현재 보유 자료에서 제공할 수 있는 상세 정보가 없습니다.");
  const led = D.ledger.filter((r) => r.company_id === id);
  if (led.length) h += `<p class="dlg-sec__label">국방·연구·납품 근거 · 서로 다른 근거를 합산하지 않습니다</p>`
    + U.table(["근거 종류", "강도", "내용", "시점", "해석 제한"], led.map((r) => [r.evidence_type, r.evidence_strength, r.evidence_detail, r.as_of_date, r.caveat]));
  return h + `<div class="row-wrap">${isStr(co.homepage) && co.homepage.startsWith("http") ? U.link("홈페이지", co.homepage) : ""}${dscrap("company", id, co.company_name_normalized)}
    ${co.has_posting ? U.btn(`수집 공고 ${co.posting_count}건 보기`, "dlg-postings", { kind: "primary", arg: id }) : ""}
    ${U.btn("기업 탐색에서 보기", "dlg-explore", { arg: id })}</div>`; };
DLG.company_list = () => { const ranked = PG._companyRanked || [], st = P("companies");
  const [rows, total, no, last] = L.paginate(ranked, st.more || 1);
  return dhead("기업 더보기", `조건에 맞는 기업·기관 ${total}개 중 ${no * 10 + 1}~${no * 10 + rows.length}`, "")
    + rows.map((co) => `<div class="dlg-list"><p class="dlg-list__name">${esc(co.company_name_normalized)} ${U.defenseBadge(co.defense_group)}</p>
      ${U.btn("상세", "dlg-switch", { arg: "company", arg2: co.company_id, arg3: "company_list" })}</div>`).join("")
    + `<div class="row-wrap">${U.btn("이전 10개", "co-more-page", { arg: no - 1, disabled: no <= 1 })}${U.btn("다음 10개", "co-more-page", { arg: no + 1, disabled: no >= last })}</div>`; };
