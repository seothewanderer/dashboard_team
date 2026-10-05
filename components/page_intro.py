"""분석 화면 상단 소개: 작은 표시 → 질문형 제목 → 짧은 설명 (research 3.9, V21).
설명 오른쪽 같은 줄에 이 화면 목차(요청 AB5·AD2): 번호 + 짧은 이름, 누르면 그 부분으로 부드럽게 이동(접힌 펼치기는 펼침, AD3)."""
from html import escape

import streamlit as st

from content.page_intros import EYEBROW_SUFFIX, PAGE_INTROS, PAGE_TOC

_TOC_CSS = """
.toc{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;row-gap:var(--space-xs)}
.toc__item{display:inline-flex;align-items:center;gap:var(--space-xs);padding:0 var(--space-md);border:0;background:transparent;
  cursor:pointer;color:var(--text-2);font:var(--font-body);font-weight:var(--type-button-weight);white-space:nowrap;
  transition:color var(--duration-fast) var(--ease-standard)}
.toc__item + .toc__item{border-left:var(--border-w) solid var(--outline)}
.toc__item:last-child{padding-right:0}
.toc__no{display:inline-flex;align-items:center;justify-content:center;width:var(--toc-no);height:var(--toc-no);flex:none;
  border-radius:var(--radius-full);border:var(--border-w) solid var(--primary);color:var(--primary);font:var(--font-label);
  font-variant-numeric:tabular-nums;transition:background var(--duration-fast) var(--ease-standard),color var(--duration-fast) var(--ease-standard)}
.toc__item:hover{color:var(--text)}
.toc__item:hover .toc__no{background:var(--primary);color:var(--on-primary)}
.toc__item:focus-visible{outline:var(--focus-w) solid var(--text);outline-offset:2px;border-radius:var(--radius-sm)}
"""

_TOC_JS = """
export default function(component) {
  const { data, parentElement } = component;
  let nav = parentElement.querySelector('.toc');
  if (!nav) { nav = document.createElement('nav'); nav.className = 'toc'; nav.setAttribute('aria-label', '이 화면 목차'); parentElement.appendChild(nav); }
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  nav.innerHTML = data.items.map((it, i) =>
    `<button type="button" class="toc__item" data-i="${i}"><span class="toc__no">${i + 1}</span>${esc(it.label)}</button>`).join('');
  nav.onclick = (e) => {
    const b = e.target.closest('.toc__item'); if (!b) return;
    const it = data.items[+b.dataset.i], el = document.querySelector(it.sel); if (!el) return;
    let opened = false;
    if (it.open) {                                            // 접힌 펼치기면 이동하면서 펼친다(요청 AD3)
      const d = el.matches('details') ? el : el.querySelector('details');
      if (d && !d.open) { d.querySelector('summary').click(); opened = true; }
    }
    el.style.scrollMarginTop = 'var(--space-md)';             // 화면 맨 위에 딱 붙지 않게
    el.scrollIntoView({ behavior: data.smooth ? 'smooth' : 'auto', block: 'start' });
    if (!opened) return;
    // 접혀 있으면 페이지가 짧아 펼치기 머리가 화면 아래에 멈춘다 → 내용이 그려지는 동안 몇 번 다시 맞춰
    // 펼친 부분이 화면 맨 위에 오게(요청 AD4). 사용자가 직접 스크롤하면 그만둔다
    let user = false;
    const stop = () => { user = true; }, evs = ['wheel', 'touchmove', 'keydown'];
    evs.forEach((ev) => window.addEventListener(ev, stop, { passive: true, capture: true }));
    const again = () => {
      const node = document.querySelector(it.sel);
      if (!node || user) return;
      node.style.scrollMarginTop = 'var(--space-md)';
      const gap = parseFloat(getComputedStyle(node).scrollMarginTop) || 0;
      if (Math.abs(node.getBoundingClientRect().top - gap) > 8) node.scrollIntoView({ behavior: 'auto', block: 'start' });
    };
    [400, 800, 1300, 2000, 3000].forEach((ms) => setTimeout(again, ms));
    setTimeout(() => evs.forEach((ev) => window.removeEventListener(ev, stop, { capture: true })), 3100);
  };
}
"""

_toc = st.components.v2.component("page_toc", css=_TOC_CSS, js=_TOC_JS)


def page_intro(key: str) -> None:
    eyebrow, title, body = PAGE_INTROS[key]
    with st.container(key="page-intro"):
        st.html(f'<section class="page-intro"><p class="page-intro__eyebrow">{escape(eyebrow)} · {EYEBROW_SUFFIX}</p>'
                f'<h1 class="page-intro__title">{escape(title)}</h1></section>')
        # 설명과 목차를 한 줄에(요청 AD2: 목차를 설명 오른쪽에 맞춰 카드 높이를 줄임). 좁으면 목차가 설명 아래로
        with st.container(horizontal=True, vertical_alignment="bottom", key="page-intro-row"):
            st.html(f'<p class="page-intro__body">{escape(body)}</p>', width="stretch")
            if PAGE_TOC.get(key):
                _toc(data={"items": [{"label": label, "sel": sel, "open": opens} for label, sel, opens in PAGE_TOC[key]],
                           "smooth": st.session_state["ui"]["motion"]}, key=f"toc-{key}")
