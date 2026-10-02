// 정적 HTML 공유본 캡처 (plan.md 9.8). 앱 페이지(…?export=1)를 브라우저에 연 뒤 이 함수를 실행한다.
// - 차트 canvas → 이미지, 격리 컴포넌트(shadow DOM: KPI 타일·드론) → 일반 HTML로 풀어 담는다.
// - 메뉴·버튼에 data-export-go(이동할 화면 키)를 붙여 공유본에서 화면 전환에 쓴다.
// - 결과를 scripts/export_html.py 의 수신 서버로 보낸다.
// 펼치기 영역 안의 차트는 접힌 상태에서 폭 0으로 그려지므로, 캡처 전에 openAllDetails()로 모두 연 뒤
// 화면을 한 번 그리게 하고(차트가 제 크기로 다시 그려짐) exportCapture()를 실행한다.
function openAllDetails() {
  const closed = [...document.querySelectorAll('details:not([open]) > summary')];
  closed.forEach((s) => s.click());
  return closed.length;
}

async function exportCapture(name, label, receiver) {
  const root = document.getElementById('root');
  const clone = root.cloneNode(true);

  // 1) shadow DOM 풀기: 원본의 호스트 위치(자식 인덱스 경로)로 복제본의 같은 요소를 찾는다
  const pathOf = (el) => { const p = []; while (el && el !== root) { p.unshift([...el.parentNode.children].indexOf(el)); el = el.parentNode; } return p; };
  const at = (base, path) => path.reduce((n, i) => n && n.children[i], base);
  const hosts = [...root.querySelectorAll('*')].filter((e) => e.shadowRoot);
  const plans = hosts.map((h) => {
    const sr = h.shadowRoot;
    const css = [...(sr.adoptedStyleSheets || [])].map((s) => [...s.cssRules].map((r) => r.cssText).join('\n')).join('\n');
    return { path: pathOf(h), html: `<style>${css}</style>` + sr.innerHTML };
  });
  plans.forEach(({ path, html }) => { const t = at(clone, path); if (t) { t.innerHTML = html; } });

  // 2) canvas → 이미지(차트). 원본과 복제본의 canvas 순서는 같다
  const live = [...root.querySelectorAll('canvas')], copies = [...clone.querySelectorAll('canvas')];
  live.forEach((c, i) => {
    const img = document.createElement('img');
    img.src = c.toDataURL('image/webp', 0.92);
    img.style.width = c.style.width || `${c.clientWidth}px`;
    img.style.height = c.style.height || `${c.clientHeight}px`;
    img.style.display = 'block';
    img.className = 'export-canvas';   // 겹친 캔버스 층을 같은 자리에 둔다(export_html.py CSS)
    img.alt = '차트 이미지(정적 공유본)';
    if (copies[i]) copies[i].replaceWith(img);
  });

  // 2-1) 캡처 전에 열어 둔 펼치기 영역은 공유본에서 다시 접힌 상태로 둔다(요약을 눌러 펼칠 수 있음)
  clone.querySelectorAll('details').forEach((d) => d.removeAttribute('open'));

  // 3) 동작하지 않는 요소 제거
  clone.querySelectorAll('[data-testid="stIconMaterial"]').forEach((e) => e.remove());   // 오프라인에선 글자로 보임
  clone.querySelectorAll('script, iframe, [data-testid="stHeader"], [data-testid="stToolbar"], [data-testid="stDecoration"], '
    + '[data-testid="stStatusWidget"], [data-testid="stSidebarCollapseButton"], [data-testid="stExpandSidebarButton"]')
    .forEach((e) => e.remove());

  // 4) 화면 전환 대상 표시
  const byText = {
    '04 채용·기업 탐색': 'recruit.postings', '채용 현황': 'recruit.postings', '기업 탐색': 'recruit.companies',
    '산업 보기': 'industry', '직무 보기': 'jobs', '교육 보기': 'learning', '공고 보기': 'recruit.postings',
    '기업 보기': 'recruit.companies', 'P1 산업 이해': 'industry', 'P2 직무 탐색': 'jobs', 'P3 준비 역량': 'learning',
    'P4 채용 공고': 'recruit.postings', 'P5 기업 탐색': 'recruit.companies', '채용 현황에서 자세히': 'recruit.postings',
  };
  const byPath = { '/': 'home', '/home': 'home', '/industry': 'industry', '/jobs': 'jobs', '/learning': 'learning', '/recruit': 'recruit.postings' };
  clone.querySelectorAll('a[href]').forEach((a) => {
    const u = new URL(a.getAttribute('href'), location.origin);
    let key = byPath[u.pathname];
    if (u.pathname === '/recruit' && u.searchParams.get('sub') === 'companies') key = 'recruit.companies';
    if (key && u.origin === location.origin) { a.dataset.exportGo = key; a.removeAttribute('target'); }
  });
  clone.querySelectorAll('button').forEach((b) => {
    const text = b.innerText.replace(/(expand_less|expand_more|chevron_right|arrow_forward)/g, '').trim();
    const key = b.dataset.key || byText[text];
    if (key) b.dataset.exportGo = key;
  });

  // 5) 스타일(emotion은 CSSOM으로 넣어 style 태그에 글자가 없으므로 규칙을 직접 읽는다)
  const css = [];
  for (const sheet of document.styleSheets) {
    try { for (const r of sheet.cssRules) css.push(r.cssText); } catch (e) { /* 다른 출처 스타일은 건너뜀 */ }
  }

  const payload = { name, label, html: clone.innerHTML, css, width: innerWidth };
  const res = await fetch(receiver, { method: 'POST', headers: { 'Content-Type': 'text/plain' }, body: JSON.stringify(payload) });
  return { name, status: res.status, htmlKB: Math.round(payload.html.length / 1024), charts: live.length, shadows: plans.length };
}
