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
  const PATHS = data.paths;
  const themeKey = (p) => `stActiveTheme-${p}-v2`;
  let storageOk = true;
  try { localStorage.setItem('__probe', '1'); localStorage.removeItem('__probe'); } catch (e) { storageOk = false; }

  // 첫 방문: 사용자가 고른 테마가 없으면('System' 포함) 다크로 (dark-first)
  const saved = storageOk ? localStorage.getItem(themeKey(window.location.pathname)) : null;
  if (storageOk && (!saved || saved === JSON.stringify('System'))) {
    PATHS.forEach((p) => localStorage.setItem(themeKey(p), JSON.stringify('Dark')));
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
      window.location.reload();
    };
  });
}
"""

_bridge = st.components.v2.component("browser_bridge", css=_CSS, js=_JS)


def bridge(mode: str, paths: list[str], save_json: str | None, restored: bool):
    """반환값의 stored: 저장된 JSON 문자열('' = 없음, '__unavailable__' = 저장 불가). 세션당 한 번만 온다."""
    sid = st.session_state.setdefault("_bridge_sid", uuid.uuid4().hex)   # 세션 식별: 세션마다 한 번만 전송
    return _bridge(data={"mode": mode, "paths": paths, "storeKey": STORE_KEY, "save": save_json,
                         "restored": restored, "sid": sid},
                   key=BRIDGE_KEY, default={"stored": None}, on_stored_change=lambda: None)
