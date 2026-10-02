/* ui.js — 화면 부품 (components/ badges·chart_card·filters·cards·effects 대응). 모두 HTML 문자열을 돌려준다. */
"use strict";

const U = {};
const C_ = D.content;

/** "ui.motion" · "profile.regions" · "<화면>.<필드>" → [객체, 필드] */
function ref(key) {
  const [a, b] = key.split(".");
  return ["ui", "profile", "plan"].includes(a) ? [S[a], b] : [P(a), b];
}
const getv = (key) => { const [o, f] = ref(key); return o[f]; };
const setv = (key, v) => { const [o, f] = ref(key); o[f] = v; };
const attrs = (o) => Object.entries(o).filter(([, v]) => v != null && v !== false)
  .map(([k, v]) => (v === true ? k : `${k}="${esc(v)}"`)).join(" ");

/* ---------------- 배지 (badges.py) ---------------- */
U.badge = (text, variant = "neutral") => `<span class="ds-badge ds-badge--${variant}">${esc(text)}</span>`;
U.defenseBadge = (group) => (L.isDefense(group) ? U.badge("방산 관련 기업", "defense") : "");
U.defenseJobBadge = (on) => (on ? U.badge("방산기업 근무처", "defense") : "");
U.draftBadge = (status) => (status === "draft" ? U.badge("검토 전 후보", "neutral") : "");

/* ---------------- 소개·제목 ---------------- */
U.intro = (key) => { const [eyebrow, title, body] = C_.intros[key];
  return `<section class="page-intro"><p class="page-intro__eyebrow">${esc(eyebrow)} · ${esc(C_.eyebrow_suffix)}</p>
    <h1 class="page-intro__title">${esc(title)}</h1><p class="page-intro__body">${esc(body)}</p></section>`; };
U.section = (t, id) => `<h2 class="section-title"${id ? ` id="${id}"` : ""}>${esc(t)}</h2>`;
U.caption = (t) => `<p class="caption">${t}</p>`;
U.info = (t) => `<div class="info">${t}</div>`;
U.context = (label, value, extra = "") => `<p class="context-line">${esc(label)} · <b>${esc(value)}</b>${extra}</p>`;

/* ---------------- 표 ---------------- */
U.table = (header, rows) => `<div class="tbl-wrap"><table class="tbl"><thead><tr>${header.map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead>
  <tbody>${rows.map((r) => `<tr>${r.map((v) => `<td>${esc(v ?? "")}</td>`).join("")}</tr>`).join("")}</tbody></table></div>`;

/* ---------------- 차트 카드 (chart_card.py): 제목 → 본문 → 출처 한 줄 → 근거 자세히(한계 + 숫자 표) ---------------- */
U.metaCaption = (id, n) => { const m = C_.meta[id];
  return `${n != null ? `표시 ${fmt(n)} · ` : ""}단위 ${m.unit} · 분모 ${m.denominator} · 출처 ${m.source} · ${m.filter_scope}`; };
U.chartCard = (o, body) => { const m = C_.meta[o.meta];
  return `<div class="chart-card">
    <div class="chart-card__head"><p class="chart-card__title">${esc(o.title || m.title)}${o.badge || ""}</p>
      ${o.subtitle ? `<p class="chart-card__subtitle">${esc(o.subtitle)}</p>` : ""}</div>
    <div class="chart-card__body">${body}</div>
    <p class="chart-card__footer">${esc(U.metaCaption(o.meta, o.n))}</p>
    <details class="expander"><summary>근거 자세히</summary><div class="expander__body">
      <p class="caption">${esc(m.limitation)}</p>
      ${o.table ? `<details class="expander expander--inner"><summary>표로 보기</summary>${U.table(o.table[0], o.table[1])}</details>` : ""}
    </div></details></div>`; };

/* ---------------- 칩·토글·버튼·페이지 넘김 ---------------- */
U.pills = (key, options, o = {}) => {
  const cur = getv(key), sel = o.multi ? cur || [] : cur;
  return `<div class="pills${o.wrap === false ? " pills--scroll" : ""}" role="group" aria-label="${esc(o.label || "")}">${options.map((v) => {
    const on = o.multi ? sel.includes(v) : sel === v;
    return `<button type="button" class="pill${on ? " on" : ""}" ${attrs({ "data-act": o.act || "pill", "data-key": key, "data-val": v,
      "data-multi": o.multi ? "1" : null, "data-reset": o.reset, "data-required": o.required ? "1" : null, "aria-pressed": String(on) })}>${o.html ? o.html(v) : esc(o.format ? o.format(v) : v)}</button>`;
  }).join("")}</div>`;
};
U.toggle = (key, label, o = {}) => { const on = !!getv(key);
  return `<label class="tog${on ? " on" : ""}${o.cls ? " " + o.cls + (on ? " " + o.cls + "--on" : "") : ""}${o.disabled ? " disabled" : ""}" ${o.help ? `title="${esc(o.help)}"` : ""}>
    <input type="checkbox" ${attrs({ "data-act": o.act || "toggle", "data-key": key, "data-reset": o.reset, checked: on, disabled: !!o.disabled })}>
    <span class="tog__track"></span><span class="tog__label">${esc(o.onLabel && on ? o.onLabel : label)}</span></label>`; };
U.btn = (label, act, o = {}) => `<button type="button" class="btn btn--${o.kind || "tertiary"}${o.cls ? " " + o.cls : ""}" ${attrs({
  "data-act": act, "data-arg": o.arg, "data-arg2": o.arg2, "data-arg3": o.arg3, disabled: !!o.disabled, title: o.title })}>${o.icon ? `<span class="ico">${o.icon}</span>` : ""}${esc(label)}</button>`;
U.link = (label, href, o = {}) => (isStr(href) ? `<a class="btn btn--${o.kind || "tertiary"}" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)} <span class="ico">↗</span></a>` : "");
U.pager = (key, total, label = "개", size = 10) => {
  const last = Math.max(0, Math.floor((total - 1) / size));
  const no = Math.min(getv(key) || 0, last); setv(key, no);
  const [s, e] = total ? [no * size + 1, Math.min(total, (no + 1) * size)] : [0, 0];
  return `<div class="pager"><p class="pager__text">전체 ${fmt(total)}${label} 중 ${s}~${e}</p>
    ${U.btn("이전 10개", "page", { arg: key, arg2: no - 1, disabled: no === 0, icon: "‹" })}
    ${U.btn("다음 10개", "page", { arg: key, arg2: no + 1, disabled: no >= last, icon: "›" })}</div>`;
};
U.handoff = (text, act) => `<div class="handoff"><p class="handoff__text">${text}</p>${U.btn("전체로 보기", act, { icon: "✕" })}</div>`;
U.defenseToggle = () => U.toggle("ui.highlight_defense", "방산 강조", { cls: "pill-tog defense-tog", onLabel: "방산 강조 켜짐",
  help: "방산 관련 근거가 확인된 항목만 진하게 두고 나머지를 흐리게 합니다. 필터나 정렬이 아닙니다." });
U.defenseStatus = () => (S.ui.highlight_defense ? '<p class="status-line">방산 강조 중 · 건수는 바뀌지 않습니다</p>' : "");
U.goalOn = () => !!(S.plan.goal_job_id && S.ui.highlight_goal);
U.goalToggle = () => U.toggle("ui.highlight_goal", "목표 직무 관련 강조", { cls: "pill-tog goal-tog", disabled: !S.plan.goal_job_id,
  help: S.plan.goal_job_id ? "목표 직무와 분류·기술·사업 분야가 이어지는 카드를 강조합니다. 필터가 아닙니다."
    : "02 직무 탐색에서 목표 직무를 고르면 켤 수 있습니다." });
U.goalStatus = (n, total) => `<p class="status-line">목표 직무 관련 ${n}개 / ${total}개 강조 중 · 건수와 순서는 바뀌지 않습니다</p>`;

/* ---------------- KPI 타일 (effects.py stat_tiles): 숫자 올라가기 ---------------- */
U.tiles = (items, cols = 4) => `<div class="tiles" style="--cols:${cols}">${items.map((t, i) => {
  // icon: 01 KPI 아이콘 카드(요청 I1) — 왼쪽 원 안 아이콘, 마우스를 올린 동안 움직임
  const text = `<p class="tile__label">${esc(t.label)}</p><p class="tile__value"><span class="num" data-countup="${t.value}" data-dec="${t.decimals || 0}">${fmt(t.value, t.decimals || 0)}</span><span class="tile__unit">${esc(t.unit || "")}</span></p>
  <p class="tile__sub">${esc(t.sub || "")}</p>`;
  return t.icon ? `<div class="tile tile--kpi${t.tone === "defense" ? " tile--defense" : ""}" style="animation-delay:${i * 60}ms;--rest:var(--kpi-${t.icon}-rest);--hover:var(--kpi-${t.icon}-${S.ui.motion ? "hover" : "rest"})">
    <span class="tile__ico" aria-hidden="true"></span><div>${text}</div></div>` : `<div class="tile" style="animation-delay:${i * 60}ms">${text}</div>`;
}).join("")}</div>`;
U.runCountups = () => {
  if (!S.ui.motion || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  document.querySelectorAll("[data-countup]:not([data-done])").forEach((el) => {
    el.dataset.done = "1"; const v = +el.dataset.countup, d = +el.dataset.dec, t0 = performance.now(), dur = D.theme.motion.countup_ms;
    const step = (now) => { const p = Math.min(1, (now - t0) / dur), e = 1 - Math.pow(1 - p, 3); el.textContent = fmt(v * e, d);
      if (p < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
};

/* ---------------- 카드 (cards.py) ---------------- */
const tags = (items, n = 3) => items.slice(0, n).map((t) => U.badge(t, "neutral")).join("") + (items.length > n ? U.badge(`+${items.length - n}`, "neutral") : "");
/** 카드 표시 상태(cards._frame_key): 방산 빨강·드론 교육 초록 띠(L5)·목표 직무 관련(F5)·스크랩/선택 강조(L4 C안) */
function frameCls(defense, row, o = {}) {
  let cls = defense ? " card--defense" : defense === false && S.ui.highlight_defense ? " card--muted" : "";
  if (o.drone) cls += " card--drone";
  if (U.goalOn() && row && "goal_reason" in row) cls += row.goal_reason ? " card--goal" : " card--faded";
  if (o.picked) cls += " card--picked";
  return cls;
}
const goalBadge = (row) => (U.goalOn() && row && row.goal_reason ? U.badge(`목표 직무 관련 · ${row.goal_reason}`, "goal") : "");
const body = (title, eyebrow, lines, tagsHtml = "", meta = "") => `<p class="card__eyebrow">${esc(eyebrow)}</p>
  <p class="card__title">${esc(title)}</p>${lines.filter(Boolean).map((l) => `<p class="card__line">${esc(l)}</p>`).join("")}
  ${tagsHtml ? `<div class="card__tags">${tagsHtml}</div>` : ""}${meta ? `<p class="card__meta">${meta}</p>` : ""}`;
/** 별·책갈피 그림 단추(icon_button.py, 요청 L2·L3): 빈 모양 → 마우스를 올리면 채워짐, 선택됨 = 채운 모양 */
U.iconBtn = (icon, on, label, act, o = {}) => `<button type="button" class="btn btn--primary ibtn ibtn--${icon}${on ? " on" : ""}" ${attrs({
  "data-act": act, "data-arg": o.arg, "data-arg2": o.arg2, "data-arg3": o.arg3 })}><span class="ibtn__ico" aria-hidden="true"></span>${esc(label)}</button>`;
const scrapBtn = (kind, id, title) => { const on = isScrapped(kind, id);
  return U.iconBtn("bookmark", on, on ? "스크랩됨" : "스크랩", "scrap", { arg: kind, arg2: id, arg3: title }); };
const goalBtn = (j) => { const on = S.plan.goal_job_id === j.job_id;
  return U.iconBtn("star", on, on ? "선택됨" : "해당 직무 선택", "goal", { arg: on ? "" : j.job_id }); };
U.jobCard = (j) => `<div class="card${frameCls(!!j.defense_workplace, null, { picked: S.plan.goal_job_id === j.job_id })}">${body(j.job_title_ko,
    `${j.major_category} · ${j.middle_category}`, [j.core_duties, `근무처 ${workplacesSummary(j)}`],
    U.defenseJobBadge(j.defense_workplace) + tags(j.skills), esc(j.evidence_type))}
    <div class="card__actions">${U.btn("상세 보기", "dialog", { arg: "job", arg2: j.job_id, icon: "⤢" })}${goalBtn(j)}</div></div>`;
U.postingCard = (p) => `<div class="card${frameCls(L.isDefense(p.defense_group), p, { picked: isScrapped("posting", p.posting_id) })}">${body(p.title,
  `${p.employer_name} · ${p.province_name} ${p.district_name || ""}`.trim(),
  [`${p.job_major_category} · 경력 ${p.career_type} · 학력 ${p.education_normalized}`, isStr(p.responsibilities) ? p.responsibilities.slice(0, 80) : ""],
  U.defenseBadge(p.defense_group) + goalBadge(p), "수집 공고 · 현재 모집 상태 미확인")}
  <div class="card__actions">${U.btn("상세 보기", "dialog", { arg: "posting", arg2: p.posting_id, icon: "⤢" })}${scrapBtn("posting", p.posting_id, p.title)}</div></div>`;
U.companyCard = (co) => { const sub = L.splitTags(co.drone_subfields);
  return `<div class="card${frameCls(L.isDefense(co.defense_group), co, { picked: isScrapped("company", co.company_id) })}">${body(co.company_name_normalized,
    co.areas.length ? `사업 분야 ${co.areas.length}개` : "분야 미수록", [sub.length ? sub.slice(0, 2).join(" · ") : "사업 정보 미수록"],
    U.defenseBadge(co.defense_group) + goalBadge(co) + tags(co.areas) + (co.drone_evidence_missing ? U.badge("드론 활동 근거 미확인", "neutral") : ""),
    co.has_posting ? `수집 공고 연결 ${co.posting_count}건` : "수집 공고 미연결")}
    <div class="card__actions">${U.btn("상세 보기", "dialog", { arg: "company", arg2: co.company_id, icon: "⤢" })}${scrapBtn("company", co.company_id, co.company_name_normalized)}</div></div>`; };
U.courseCard = (r) => { const where = r.remote_mode === L.REMOTE ? "원격" : r.province_std || "지역 미수록";
  const when = r.start ? `${r.date_status} · ${dstr(r.start)}~${r.end ? dstr(r.end) : ""}` : "일정 미수록";
  const drone = r.source_group === "drone";   // 1차 드론 수집 과정(요청 L5)
  return `<div class="card${frameCls(null, r, { drone, picked: isScrapped("course", r.course_id) })}">${body(r.course_name,
    `${r.institution_name} · ${where} · ${fmt(r.total_training_hours || 0)}시간`,
    [`대표 회차 ${when}`], (drone ? U.badge("드론 교육", "drone") : "") + goalBadge(r) + tags([...r.relevance, ...r.reasons], 4), "날짜 기준 상태 · 모집 여부는 원문에서 확인")}
    <div class="card__actions">${isStr(r.course_url) ? U.link("원문 보기", r.course_url) : '<span class="caption">원문 링크 미수집</span>'}
    ${scrapBtn("course", r.course_id, r.course_name)}</div></div>`; };
U.grid = (rows, fn) => `<div class="grid2">${rows.map(fn).join("")}</div>`;
/** 검색 상자(search_box.py, 요청 O2): 입력하면 관련 항목 추천, 펼치면 전체 목록, 목록에 없는 말도 검색(브라우저 datalist) */
U.searchBox = (key, options, placeholder, o = {}) => { const id = "dl-" + key.replace(/\W/g, "_");
  return `<input type="search" list="${id}" ${attrs({ "data-act": o.act || "input", "data-key": key, "data-reset": o.reset })} value="${esc(getv(key) || "")}" placeholder="${esc(placeholder)}">
    <datalist id="${id}">${uniq(options.filter(isStr)).sort((a, b) => cmp(a.toLowerCase(), b.toLowerCase())).map((v) => `<option value="${esc(v)}"></option>`).join("")}</datalist>`; };
/** 여러 개 고르는 드롭다운(목록이 위에 떠서 레이아웃이 밀리지 않음, 요청 N11) */
U.dropdown = (key, options, label, o = {}) => { const sel = getv(key) || [];
  return `<details class="dd" data-open-key="${o.openKey}"${getv(o.openKey) ? " open" : ""}><summary>${esc(sel.length ? sel.join(", ") : label)}</summary>
    <div class="dd__panel">${U.pills(key, options, { multi: true, reset: o.reset })}</div></details>`; };
/** 카드 목록 필터 토글(only_toggle, 요청 L5·N7): tone defense = 빨강, drone = 초록 */
U.onlyToggle = (key, label, tone, help) => U.toggle(key, label, { cls: `pill-tog ${tone === "defense" ? "defense-tog" : "goal-tog"}`, help });
function workplacesSummary(j, n = 3) { const w = j.workplaces || [];
  return w.slice(0, n).join(" · ") + (w.length > n ? ` 외 ${w.length - n}` : ""); }
function dstr(d) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; }

/* ---------------- 홈 드론 (effects.py drone_hero): 클릭 → P1~P5, 닫히면 크게 ---------------- */
U.DRONE_SVG = `<svg class="drone" viewBox="0 0 320 200" aria-hidden="true"><g class="body">
  <line x1="160" y1="100" x2="62" y2="58" class="arm"/><line x1="160" y1="100" x2="258" y2="58" class="arm"/>
  <line x1="160" y1="100" x2="62" y2="142" class="arm"/><line x1="160" y1="100" x2="258" y2="142" class="arm"/>
  <rect x="128" y="82" width="64" height="36" rx="12" class="hull"/><circle cx="160" cy="100" r="7" class="lens"/>
  <rect x="146" y="118" width="28" height="12" rx="4" class="gimbal"/>
  <g class="rotor" style="transform-origin:62px 58px"><ellipse cx="62" cy="58" rx="40" ry="6" class="prop"/></g>
  <g class="rotor r2" style="transform-origin:258px 58px"><ellipse cx="258" cy="58" rx="40" ry="6" class="prop"/></g>
  <g class="rotor r2" style="transform-origin:62px 142px"><ellipse cx="62" cy="142" rx="40" ry="6" class="prop"/></g>
  <g class="rotor" style="transform-origin:258px 142px"><ellipse cx="258" cy="142" rx="40" ry="6" class="prop"/></g>
  <circle cx="62" cy="58" r="5" class="hub"/><circle cx="258" cy="58" r="5" class="hub"/><circle cx="62" cy="142" r="5" class="hub"/><circle cx="258" cy="142" r="5" class="hub"/></g></svg>`;
U.hero = (entries) => { const open = S.ui.home_menu_open, move = S.ui.motion;
  return `<div class="hero${open ? " open" : ""}${move ? " move" : ""}"><span class="ring"></span><span class="ring b"></span>
    <button class="core" type="button" data-act="hero" aria-expanded="${open}" aria-label="${open ? "탐색 메뉴 접기" : "탐색 메뉴 열기"}">${U.DRONE_SVG}</button>
    <div class="menu">${entries.map((e, i) => `<button type="button" class="go p${i + 1}" data-act="hero-go" data-arg="${e.key}" tabindex="${open ? 0 : -1}"><b>${esc(e.label)}</b><span>${esc(e.desc)}</span></button>`).join("")}</div>
    <button class="hero-toggle" type="button" data-act="motion">${move ? "움직임 멈추기" : "움직임 재생"}</button></div>`; };
