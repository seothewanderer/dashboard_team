"""다시 실행된 뒤 화면 안의 한 요소로 부드럽게 스크롤 (요청 M5 '관련 직무 카드 보러가기', 2026-10-01).
Streamlit components.v2. nonce가 바뀔 때만 한 번 움직인다(같은 값으로 다시 그려지면 그대로)."""
import streamlit as st

_JS = """
export default function(component) {
  const { data } = component;
  // 이미 처리한 nonce는 창에 기억(부품이 다시 붙어도 — 다른 단추로 다시 그려질 때 또 내려가지 않게, 요청 M6)
  const done = window.__ddScrollDone || (window.__ddScrollDone = {});
  if (!data.nonce || done[data.nonce]) return;
  done[data.nonce] = true;
  // 다시 실행이 끝나며 화면이 다시 그려지면 스크롤이 되돌려질 수 있어, 1.5초 동안 몇 번 확인해 자리에 없으면 다시 이동
  // 첫 시도만 부드럽게, 이후 확인은 바로 이동(부드러운 스크롤이 막히거나 끊기는 환경 대비)
  const go = (smooth) => {
    const el = document.querySelector(data.selector);
    if (el && Math.abs(el.getBoundingClientRect().top) > 24) el.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };
  setTimeout(() => go(data.smooth), 200);
  [900, 1300, 1800, 2500, 3200, 4000].forEach((ms) => setTimeout(() => go(false), ms));   // 카드가 늦게 그려지는 화면(04) 대비 4초까지
}
"""

_comp = st.components.v2.component("scroll_to", js=_JS)


def scroll_to(selector: str, nonce: str | None, *, key: str) -> None:
    """selector = CSS 선택자(예: '.st-key-jobs_cards_open'), nonce = 누를 때마다 바뀌는 값(없으면 아무 일 없음)."""
    _comp(data={"selector": selector, "nonce": str(nonce) if nonce else None, "smooth": st.session_state["ui"]["motion"]}, key=key)
