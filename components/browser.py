"""브라우저 연결 컴포넌트 (components.v2) — 사이드바 하단의 라이트/다크 토글 + 선택 상태 저장.

- 테마(DESIGN §11.1): Streamlit은 파이썬에서 테마를 바꿀 수 없어, Streamlit이 저장하는 활성 테마
  (localStorage "stActiveTheme-<경로>-v2" = "Light" | "Dark")를 모든 페이지 경로에 쓰고 새로고침한다.
  저장된 테마가 없으면(첫 방문) 다크로 저장하고 한 번 새로고침한다(dark-first).
- 저장(plan.md 7.2): 새로고침은 새 세션이므로, 선택 상태를 localStorage["drone-career-v1"]에 저장하고
  다음 세션 첫 실행에서 복원한다. 저장이 막힌 브라우저면 이번 이용 중에만 유지된다.
"""
import uuid

import streamlit as st

STORE_KEY = "drone-career-v1"
BRIDGE_KEY = "browser_bridge"

_CSS = """
.bridge{display:flex;gap:var(--space-xxs);padding:var(--space-xxs);border-radius:var(--radius-full);background:var(--surface-2);
  font-family:var(--font-sans)}
.bridge button{flex:1;border:none;border-radius:var(--radius-full);padding:var(--space-xs) var(--space-sm);cursor:pointer;
  font:var(--font-body);font-weight:var(--type-card-title-weight);color:var(--text-2);background:transparent;
  transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard),
             transform var(--duration-fast) var(--ease-standard)}
.bridge button:hover{color:var(--text);transform:scale(var(--hover-scale))}
.bridge button[aria-pressed="true"]{background:var(--select-bg);color:var(--select-fg)}
.bridge button:focus-visible{outline:var(--focus-w) solid var(--text);outline-offset:var(--card-border-w)}
.bridge-note{font:var(--font-caption);color:var(--text-2);margin:var(--space-xxs) 0 0}
@media (prefers-reduced-motion:reduce){.bridge button{transition:none}.bridge button:hover{transform:none}}
"""

_JS = """
export default function(component) {
  const { data, parentElement, setStateValue } = component;
  // 배포(Streamlit Community Cloud)에서는 앱 주소 앞에 경로가 붙는다(예: /~/+/industry). Streamlit은 지금 주소로
  // 테마를 저장하므로 같은 앞부분을 붙여야 한다 — 안 붙이면 '저장된 테마 없음 → 저장 → 새로고침'이 끝없이 반복됐다
  const here = window.location.pathname;
  const page = data.paths.find((p) => p !== '/' && here.endsWith(p));
  const base = page ? here.slice(0, here.length - page.length) : here.replace(/\/$/, '');
  const PATHS = [...new Set([here, ...data.paths.map((p) => base + p)])];
  const themeKey = (p) => `stActiveTheme-${p}-v2`;
  // 검색란 펼치기 단추(▾/▴)를 열린 상태에서 다시 누르면 닫기(요청 AB1). Streamlit 1.64 콤보박스는 닫혔다가 곧바로 다시 열려
  // 계속 펼쳐지기만 했다 → 그 누름을 가로채 Esc로 닫는다. 페이지 전체에 한 번만 건다
  if (!window.__ddComboClose) {
    window.__ddComboClose = true;
    document.addEventListener('pointerdown', (e) => {
      const btn = e.target.closest && e.target.closest(
        ':is([data-testid="stMultiSelect"], [data-testid="stSelectbox"]) button[aria-haspopup="listbox"]');
      if (!btn || btn.getAttribute('aria-expanded') !== 'true') return;
      const input = btn.closest('.react-aria-ComboBox')?.querySelector('input');
      if (!input) return;
      e.preventDefault(); e.stopPropagation();
      input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
      input.blur();
    }, true);
  }
  let storageOk = true;
  try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); } catch (e) { storageOk = false; }

  // 첫 방문: 사용자가 고른 테마가 없으면('System' 포함) 다크로 (dark-first)
  // 새로고침은 탭마다 한 번만(혹시 저장이 반영되지 않는 환경이어도 깜빡임이 반복되지 않게)
  const saved = storageOk ? localStorage.getItem(themeKey(here)) : null;
  let reloaded = false;
  try { reloaded = sessionStorage.getItem('drone-dark-first') === '1'; } catch (e) {}
  if (storageOk && !reloaded && (!saved || saved === JSON.stringify('System'))) {
    PATHS.forEach((p) => localStorage.setItem(themeKey(p), JSON.stringify('Dark')));
    try { sessionStorage.setItem('drone-dark-first', '1'); } catch (e) {}
    window.location.reload();
    return;
  }

  // 선택 상태 복원: 페이지(세션)당 딱 한 번만 전달한다. 매 실행마다 보내면 재실행이 끝없이 반복된다.
  if (!data.restored) {
    if (window.__droneStoredSentFor !== data.sid) {
      window.__droneStoredSentFor = data.sid;
      setStateValue('stored', storageOk ? (localStorage.getItem(data.storeKey) || '') : '__unavailable__');
    }
  } else if (storageOk && data.save) {
    localStorage.setItem(data.storeKey, data.save);
  }

  let root = parentElement.querySelector('.bridge');
  if (!root) {
    root = document.createElement('div'); root.className = 'bridge'; root.setAttribute('role', 'group');
    root.setAttribute('aria-label', '화면 테마');
    root.innerHTML = '<button type="button" data-mode="Light">☀ 라이트</button><button type="button" data-mode="Dark">☾ 다크</button>';
    parentElement.appendChild(root);
    if (!storageOk) {
      const note = document.createElement('p'); note.className = 'bridge-note';
      note.textContent = '이 브라우저는 저장을 막아 선택이 이번 이용 중에만 유지됩니다.';
      parentElement.appendChild(note);
    }
  }
  root.querySelectorAll('button').forEach((b) => {
    const active = b.dataset.mode.toLowerCase() === data.mode;
    b.setAttribute('aria-pressed', String(active));
    b.onclick = () => {
      if (active) return;
      if (storageOk && data.save) localStorage.setItem(data.storeKey, data.save);   // 새로고침 전에 최신 상태 저장
      PATHS.forEach((p) => localStorage.setItem(themeKey(p), JSON.stringify(b.dataset.mode)));
      try { sessionStorage.setItem('drone-theme-reload', window.location.pathname); } catch (e) {}   // 02 네트워크 첫 등장 효과를 다시 틀지 않게
      window.location.reload();
    };
  });
}
"""

_bridge = st.components.v2.component("browser_bridge", css=_CSS, js=_JS)


# 모니터 크기 맞춤(요청 AE3): 창이 기준 폭(1920)보다 넓으면 앱 전체를 비율대로 키운다(최대 1.5배).
# html에 zoom과 --app-zoom(CSS의 화면 높이 계산·캔버스 해상도용)을 둔다. 실행 맨 앞에서 그려 첫 화면부터 맞춘다
_ZOOM_JS = """
export default function(component) {
  const { data } = component;
  window.__ddZoomCfg = data;
  if (window.__ddZoomFit) { window.__ddZoomFit(); return; }
  const doc = document.documentElement;
  window.__ddZoomFit = () => {
    const c = window.__ddZoomCfg, z = Math.min(c.max, Math.max(1, window.innerWidth / c.base));
    const r = Math.round(z * 1000) / 1000;
    if (String(r) === doc.style.getPropertyValue('--app-zoom')) return;
    doc.style.zoom = r === 1 ? '' : String(r);
    doc.style.setProperty('--app-zoom', String(r));
    window.__ddZoom = r;
    window.dispatchEvent(new Event('dd-zoom'));   // 캔버스가 해상도를 다시 맞추게
  };
  window.addEventListener('resize', window.__ddZoomFit);
  // 확대 중 캔버스 선명도: 모든 캔버스(그래프·3D)가 읽는 devicePixelRatio를 배율만큼 크게 알려 준다
  const dprDesc = Object.getOwnPropertyDescriptor(window, 'devicePixelRatio') || Object.getOwnPropertyDescriptor(Window.prototype, 'devicePixelRatio');
  if (dprDesc && dprDesc.get) Object.defineProperty(window, 'devicePixelRatio', { configurable: true,
    get() { return dprDesc.get.call(window) * (window.__ddZoom || 1); } });
  // 확대 중 그래프(ECharts) 마우스 위치: 브라우저가 주는 offsetX/Y는 확대된 화면 px, 그래프는 확대 전 px로 그려서
  // 막대를 누르면 한 칸 아래가 골라졌다 → 그래프 안의 마우스 이벤트만 배율로 나눠 준다
  const fix = (e) => {
    const z = window.__ddZoom || 1; if (z === 1) return;
    const t = e.composedPath ? e.composedPath()[0] : e.target;
    if (!(t instanceof Element) || !t.closest('[_echarts_instance_]')) return;
    // 그림자 DOM 안의 그래프는 창 단계에서 offsetX가 바깥 틀 기준이 되므로, 실제 대상 위치로 직접 계산
    const r = t.getBoundingClientRect();
    Object.defineProperty(e, 'offsetX', { value: (e.clientX - r.left) / z, configurable: true });
    Object.defineProperty(e, 'offsetY', { value: (e.clientY - r.top) / z, configurable: true });
  };
  ['mousemove', 'mousedown', 'mouseup', 'click', 'dblclick', 'contextmenu', 'wheel', 'mousewheel', 'mouseover', 'mouseout',
   'pointermove', 'pointerdown', 'pointerup', 'pointerover', 'pointerout']   // 누름은 pointer 이벤트로 받는 그래프가 있음
    .forEach((ev) => window.addEventListener(ev, fix, true));
  window.__ddZoomFit();
}
"""

_zoom = st.components.v2.component("app_zoom", js=_ZOOM_JS)


def fit_zoom(base: int, max_zoom: float) -> None:
    with st.container(key="app-zoom"):
        _zoom(data={"base": base, "max": max_zoom}, key="app_zoom")


def bridge(mode: str, paths: list[str], save_json: str | None, restored: bool):
    """반환값의 stored: 저장된 JSON 문자열('' = 없음, '__unavailable__' = 저장 불가). 세션당 한 번만 온다."""
    sid = st.session_state.setdefault("_bridge_sid", uuid.uuid4().hex)   # 세션 식별: 세션마다 한 번만 전송
    return _bridge(data={"mode": mode, "paths": paths, "storeKey": STORE_KEY, "save": save_json,
                         "restored": restored, "sid": sid},
                   key=BRIDGE_KEY, default={"stored": None}, on_stored_change=lambda: None)
