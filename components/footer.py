"""푸터(요청 AG1, A안): 본문 열 맨 아래. 위층 = 화면마다 '다음 단계' 단추, 아래층 = 모든 화면 같은 3칸, 맨 아래 한 줄.
shell.frame이 페이지 다음에 그린다. 탐색 경로 열 아래로는 넓히지 않는다."""
from html import escape

import streamlit as st

from content import footer as F
from core import export_mode, routing


def _ul(items: list[str]) -> str:
    return '<ul class="ft__list">' + "".join(f"<li>{i}</li>" for i in items) + "</ul>"


def render(page: str | None) -> None:
    with st.container(key="site-footer"):
        nxt = F.NEXT_STEP.get(page or "")
        if nxt and not export_mode.on():            # 정적 공유본은 화면 이동이 없어 뺌
            target, sub, name, desc = nxt
            # 카드 모양 단추 한 개: 위 작은 글 '다음 단계', 큰 글 화면 이름, 아래 한 줄 설명
            if st.button(f"다음 단계\n\n**{name}** →\n\n{desc}", key="footer-next", type="secondary", width="stretch"):
                routing.go(target, sub=sub)
        sources = "".join(f'<li><b>{escape(n)}</b> <span class="ft__muted">· {escape(d)} · {escape(w)}</span></li>'
                          for n, d, w in F.SOURCES)
        terms = [f"<b>{escape(t)}</b> = {escape(d)}" for t, d in F.TERMS]
        st.html('<div class="ft__grid">'
                f'<section><p class="ft__label">{escape(F.ABOUT_LABEL)}</p>{_ul([escape(a) for a in F.ABOUT])}'
                # 큰 로고 + 오른쪽 위 조 이름(굵게·크게), 아래 조원 이름(푸터 글꼴·색)(요청 AH·AI3)
                f'<div class="ft__team"><span class="logo logo--footer" aria-hidden="true"></span><div>'
                f'<p class="ft__team-name">{escape(F.TEAM)}</p>'
                f'<p class="ft__team-members">{" · ".join(escape(m) for m in F.MEMBERS)}</p></div></div></section>'
                f'<section><p class="ft__label">데이터 출처 · 기준일</p><ul class="ft__list">{sources}</ul></section>'
                f'<section><p class="ft__label">이용 주의 · 용어</p>{_ul([escape(c) for c in F.CAUTIONS] + terms)}</section>'
                '</div>'
                f'<p class="ft__bottom">© 2026 드론 진로 탐색 · {F.VERSION} · 업데이트 {F.UPDATED} · '
                + " · ".join(escape(c) for c in F.CREDITS) + "</p>")
