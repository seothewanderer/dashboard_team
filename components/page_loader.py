"""페이지 이동 로딩 화면(요청 AW): 다른 화면으로 넘어갈 때 Streamlit이 본문을 비우고 새로 그리는 사이(배포본 약 0.3초)
푸터만 잠깐 보이던 것을 가린다. 본문 열만 덮고(사이드바·탐색 경로는 그대로) 크게 로고 막대 + 홈 3D 드론 정지 그림,
작게 '○○로 이동 중'. 같은 화면 안 필터 재실행에서는 본문 제목(h1)이 남아 있어 나오지 않는다.
판단: 실행 중(stApp data-test-script-state=running)인데 본문에 h1이 없음 → 켬, 실행이 끝나면 끔."""
import streamlit as st

from core import routing, theme

_CSS = """
.ddl{position:fixed;z-index:90;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:var(--space-md);
  background:var(--bg);opacity:0;visibility:hidden;pointer-events:none;
  transition:opacity var(--duration-fast) var(--ease-standard),visibility 0s linear var(--duration-fast)}
.ddl.is-on{opacity:1;visibility:visible;pointer-events:auto;transition:opacity var(--duration-fast) var(--ease-standard)}
.ddl__logo{position:relative;width:var(--loader-drone-w);display:flex;flex-direction:column;align-items:center}
.ddl__drone{width:var(--loader-drone-w);aspect-ratio:474 / 134;background:var(--loader-drone-img) center / contain no-repeat;
  margin-bottom:var(--space-xs)}
.ddl.is-motion .ddl__drone{animation:ddl-float var(--loader-float) var(--ease-standard) infinite alternate}
.ddl__bars{height:var(--loader-bars);aspect-ratio:34 / 30;background:var(--loader-bars-img) center / contain no-repeat}
.ddl__text{margin:0;font:var(--font-caption);color:var(--text-2);white-space:nowrap}
@keyframes ddl-float{from{transform:translateY(0)}to{transform:translateY(calc(-1 * var(--space-sm)))}}
@media (prefers-reduced-motion:reduce){.ddl.is-motion .ddl__drone{animation:none}}
html.dd-nav .st-key-site-footer{visibility:hidden}
"""

_JS = """
export default function(component) {
  const { data } = component;
  window.__ddLoaderCfg = data;
  if (window.__ddLoader) return;
  window.__ddLoader = true;
  const style = document.createElement('style'); style.textContent = data.css; document.head.appendChild(style);
  const box = document.createElement('div'); box.className = 'ddl'; box.setAttribute('role', 'status'); box.setAttribute('aria-live', 'polite');
  box.innerHTML = '<div class="ddl__logo" aria-hidden="true"><span class="ddl__drone"></span><span class="ddl__bars"></span></div><p class="ddl__text"></p>';
  document.body.appendChild(box);
  const txt = box.querySelector('.ddl__text');
  const app = () => document.querySelector('[data-testid="stApp"]');
  const main = () => document.querySelector('[data-testid="stMain"]');
  // 본문 열 = 화면 틀(frame)의 첫 칸. 비는 순간에도 남아 있지만, 없으면 마지막으로 잰 자리
  const column = () => main()?.querySelector('[data-testid="stHorizontalBlock"] > [data-testid="stColumn"]');
  let lastRect = null, shown = false, shownAt = 0, hideT = null, tick = 0;
  const particle = (s) => { const c = s.charCodeAt(s.length - 1) - 0xAC00;                 // 받침 없음·ㄹ → '로', 그 밖 → '으로'
    return c < 0 || c > 11171 || c % 28 === 0 || c % 28 === 8 ? '로' : '으로'; };
  // 가는 화면: 주소가 바뀌었으면 그 주소, 아직이면 누른 링크 주소. 둘 다 없으면 이름 없이(예전 화면 이름이 잠깐 나오지 않게)
  const keyOf = (u) => { const cfg = window.__ddLoaderCfg, seg = u.pathname.replace(/\\/$/, '').split('/').pop();
    return seg === cfg.recruit ? `${seg}:${new URLSearchParams(u.search).get('sub') || cfg.defaultSub}` : seg; };
  let from = keyOf(location), pending = null;
  document.addEventListener('click', (e) => { const a = e.target.closest && e.target.closest('a[href]');
    if (a && a.origin === location.origin) pending = keyOf(new URL(a.href)); }, true);
  const label = () => { const now = keyOf(location), k = now !== from ? now : pending;
    return (k != null && window.__ddLoaderCfg.labels[k]) || ''; };
  const place = () => { const c = column(), r = c && c.getBoundingClientRect(); if (r && r.width) lastRect = r; if (!lastRect) return;
    const z = window.__ddZoom || 1, top = Math.max(lastRect.top, 0);
    box.style.cssText = `left:${lastRect.left / z}px;top:${top / z}px;width:${lastRect.width / z}px;height:${(window.innerHeight - top) / z}px`; };
  const show = () => { clearTimeout(hideT); place(); const l = label(); txt.textContent = l ? `${l}${particle(l)} 이동 중` : '이동 중';
    box.classList.toggle('is-motion', !!window.__ddLoaderCfg.motion);
    if (!shown) { shown = true; shownAt = performance.now(); box.classList.add('is-on'); document.documentElement.classList.add('dd-nav'); } };
  const hide = () => { clearInterval(tick); if (!shown) { document.documentElement.classList.remove('dd-nav'); return; }
    const wait = Math.max(0, window.__ddLoaderCfg.minMs - (performance.now() - shownAt));   // 켜졌으면 아주 잠깐이라도 깜빡이지 않게 최소 시간
    hideT = setTimeout(() => { shown = false; pending = null; from = keyOf(location); box.classList.remove('is-on'); document.documentElement.classList.remove('dd-nav'); }, wait); };
  // 실행 중에만 짧은 간격으로 확인(requestAnimationFrame은 화면이 가려진 탭에서 멈춰 쓰지 않음)
  const watch = () => { const m = main(); if ((m && !m.querySelector('h1')) || shown) show(); };   // 켜진 뒤에는 주소가 바뀌면 문구도 맞춤
  const onState = () => { const s = app()?.dataset.testScriptState;
    if (s === 'running') { clearInterval(tick); watch(); tick = setInterval(watch, 16); }
    else { place(); hide(); if (!shown) { pending = null; from = keyOf(location); } } };
  new MutationObserver(onState).observe(app(), { attributes: true, attributeFilter: ['data-test-script-state'] });
  window.addEventListener('resize', () => { if (shown) place(); });
  place();
}
"""

_comp = st.components.v2.component("page_loader", js=_JS)


def render(motion: bool) -> None:
    labels = {"": "홈", "home": "홈"} | {url: title for key, _, title, url in routing.PAGE_SPECS if key not in ("home", "recruit")}
    labels |= {f"recruit:{k}": f"04 {v}" for k, v in routing.RECRUIT_SUBS.items()}
    with st.container(key="page-loader"):
        _comp(data={"css": _CSS, "labels": labels, "recruit": "recruit", "defaultSub": routing.DEFAULT_SUB,
                    "motion": motion, "minMs": theme.MOTION["loader_min_ms"]}, key="page_loader")
