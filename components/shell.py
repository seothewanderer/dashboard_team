"""공통 셸 (plan.md 5장, 9.5.1, 9.7): 사이드바 메뉴·좌측 하단 안내·상단바·오른쪽 '나의 탐색 경로'."""
from contextlib import contextmanager
from html import escape

import streamlit as st

from components import footer
from content.module_meta import PAGE_DEFAULT
from core import routing, state, theme


def _split_title(title: str) -> tuple[str, str]:
    """'01 산업 이해' → ('01', '산업 이해'). 번호가 없으면 ('', 제목)."""
    no, _, name = title.partition(" ")
    return (no, name) if no.isdigit() else ("", title)


# 오른쪽 '나의 탐색 경로' (요청 D6·E4·E5): 번호, 제목, 선택 전 안내, 스크랩 종류(None = 목표 직무), 살펴보기 대상(페이지, 하위)
ROADMAP_TITLE = "나의 탐색 경로"
ROADMAP_STEPS = [
    ("01", "목표 직무", "선택 전 · 직무 살펴보기", None, "jobs", None),
    ("02", "학습 내용", "교육 스크랩 전", "course", "learning", None),
    ("03", "채용 공고 스크랩", "공고 스크랩 전", "posting", "recruit", "postings"),
    ("04", "관심 기업 스크랩", "기업 스크랩 전", "company", "recruit", "companies"),
]


def render_nav(pages: dict[str, st.Page], current: str, slot=None) -> None:
    """기본 메뉴를 숨기고 직접 그린다: 단일 항목 4개 + '04 채용·기업 탐색' 펼침 메뉴.
    상위 항목을 누르면 하위 메뉴를 펼치고 기본 하위 페이지(채용 현황)로 이동한다(요청 B4)."""
    with slot or st.sidebar:
        st.html('<p class="sidebar-brand"><span class="logo logo--sidebar" aria-hidden="true"></span>드론 진로 탐색</p>')   # 초록 점 → 로고(요청 AH)
        with st.container(key="nav"):
            for key in ("home", "industry", "jobs", "learning"):
                with st.container(key=f"nav-item{'-active' if key == current else ''}-{key}"):
                    st.page_link(pages[key], label=_split_title(pages[key].title)[1], width="stretch")

            in_recruit = current == "recruit"
            nav_open = st.session_state["ui"]["nav_open"]
            if in_recruit and st.session_state.get("_nav_last") != "recruit":
                nav_open["recruit"] = True          # 다른 화면에서 04로 들어오면 펼침
            st.session_state["_nav_prev"] = st.session_state.get("_nav_last")   # 직전 화면(홈 복귀 비행 방향, 요청 P1)
            st.session_state["_nav_last"] = current
            is_open = nav_open["recruit"]
            # 이름 = 채용 현황으로 이동(+펼침), 오른쪽 ^ = 하위 메뉴 펼치기·접기만(이동 없음, 요청 T4)
            with st.container(key=f"nav-parent{'-active' if in_recruit else ''}", gap=None):
                if st.button(_split_title(pages["recruit"].title)[1], key="nav_recruit_toggle", type="tertiary", width="stretch",
                             help="채용 현황으로 이동하고 하위 메뉴를 펼칩니다"):
                    nav_open["recruit"] = True
                    routing.go("recruit", sub=routing.DEFAULT_SUB)
                with st.container(key="nav-fold", width="content"):
                    st.button("", key="nav_recruit_fold", type="tertiary", help="하위 메뉴 펼치기/접기",
                              icon=":material/expand_less:" if is_open else ":material/expand_more:",
                              on_click=lambda: nav_open.update(recruit=not is_open))
            if is_open:
                with st.container(key="nav-subtree"):
                    for sub, label in routing.RECRUIT_SUBS.items():
                        active = in_recruit and routing.active_sub() == sub
                        with st.container(key=f"nav-sub{'-active' if active else ''}-{sub}"):
                            if st.button(label, key=f"nav_sub_{sub}", type="tertiary", width="stretch",
                                         icon=":material/chevron_right:" if active else None,
                                         icon_position="right"):
                                routing.go("recruit", sub=sub)


def render_context_card(context_key: str, slot=None) -> None:
    """좌측 하단 문맥 안내 (plan 5.4). 페이지 기본 안내."""
    meta = PAGE_DEFAULT[context_key]
    lines = "".join(f'<p class="context-card__line">{escape(line)}</p>' for line in meta["context_lines"])
    with slot or st.sidebar:
        st.html(f'<aside class="context-card"><p class="context-card__title">{escape(meta["title"])}</p>'
                f'{lines}</aside>')


# 탐색 경로 열기/접기 단추(요청 AA7): 누르면 파이썬 재실행 없이 브라우저에서 바로 html[data-roadmap]을 바꿔
# 화면 구조는 그대로 두고 폭만 움직인다(깜빡임 없음). 바뀐 값은 뒤이어 파이썬에 알려 저장(persistence)만 한다.
# 홈 드론은 'dd-roadmap' 이벤트로 반응한다(요청 AA8, components/home_hero.js).
_TOGGLE_CSS = """
.rt{display:inline-flex;align-items:center;gap:var(--space-xs);height:var(--button-h);padding:0;border:0;background:transparent;cursor:pointer;
  color:var(--text-3);font-family:var(--font-sans);font-size:var(--type-button-size);letter-spacing:var(--type-button-ls);
  white-space:nowrap;transition:color var(--duration-fast) var(--ease-standard)}
.rt:hover{color:var(--text)}
.rt:focus-visible{outline:var(--focus-w) solid var(--text);outline-offset:2px;border-radius:var(--radius-sm)}
.rt__icon{font-family:"Material Symbols Rounded";font-size:var(--type-caption-size);line-height:1;font-weight:400}
.rt__label{font-size:var(--native-text);font-weight:400;line-height:normal}
"""

_TOGGLE_JS = """
export default function(component) {
  const { data, parentElement, setStateValue } = component;
  const doc = document.documentElement;
  let btn = parentElement.querySelector('.rt');
  if (!btn) {
    btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rt';
    btn.innerHTML = '<span class="rt__icon" aria-hidden="true"></span><span class="rt__label"></span>';
    parentElement.appendChild(btn);
  }
  const paint = (open) => {
    btn.querySelector('.rt__icon').textContent = open ? 'right_panel_close' : 'right_panel_open';
    btn.querySelector('.rt__label').textContent = open ? data.close_label : data.open_label;
    btn.setAttribute('aria-expanded', String(open));
  };
  const apply = (open, animate) => {
    if (animate) {   // 누를 때만 움직임(새로고침·저장값 복원 때는 바로 그 상태)
      doc.classList.add('roadmap-anim'); clearTimeout(window.__rtAnim);
      window.__rtAnim = setTimeout(() => doc.classList.remove('roadmap-anim'), data.ms + 100);
      window.dispatchEvent(new CustomEvent('dd-roadmap', { detail: { open } }));
    }
    doc.dataset.roadmap = open ? 'open' : 'closed'; paint(open);
  };
  // 파이썬이 아직 이전 값을 들고 다시 그린 경우(보낸 값이 반영되기 전)는 화면 상태를 유지
  if (window.__rtPending !== undefined && window.__rtPending !== data.open) apply(window.__rtPending, false);
  else { window.__rtPending = undefined; apply(data.open, false); }
  btn.onclick = () => {
    const next = doc.dataset.roadmap !== 'open';
    apply(next, true); window.__rtPending = next; setStateValue('open', next);
  };
}
"""

_toggle = st.components.v2.component("roadmap_toggle", css=_TOGGLE_CSS, js=_TOGGLE_JS)


def _roadmap_button() -> None:
    ui = st.session_state["ui"]

    def _sync():
        value = (st.session_state.get("roadmap_toggle") or {}).get("open")
        if value is not None:
            ui["roadmap_open"] = bool(value)

    _toggle(data={"open": bool(ui["roadmap_open"]), "open_label": ROADMAP_TITLE, "close_label": "탐색 경로 접기",
                  "ms": int(theme.BASE["--duration-slide"].removesuffix("ms"))},
            key="roadmap_toggle", on_open_change=_sync)


def render_topbar(screen_label: str | None) -> None:
    """서비스명 · 현재 화면 (research 3.1 상단 약 56px). 스크랩 수는 삭제(요청 D7).
    탐색 경로 단추는 탐색 경로 열 위에 따로(요청 AA4). screen_label None = 홈: 제목 줄 없음."""
    if screen_label is None:
        return
    with st.container(key="topbar", horizontal=True, vertical_alignment="center"):
        st.html(f'<div class="topbar__brand"><span class="logo logo--topbar" aria-hidden="true"></span>'   # 로고(요청 AH)
                f'<span class="topbar__wordmark">드론 진로 탐색</span>'
                f'<span class="topbar__screen">{escape(screen_label)}</span></div>', width="stretch")


def _roadmap_side() -> None:
    """탐색 경로 열 맨 위의 단추 줄: 구분선 없이 단추만 오른쪽 위에(요청 AA4). 닫혀도 같은 자리(요청 AA7)."""
    with st.container(key="topbar-side", horizontal=True, horizontal_alignment="right", vertical_alignment="center"):
        _roadmap_button()


def _step_items(kind: str | None) -> list[tuple[str, str]]:
    """단계에 담긴 항목 (id, 표시 이름). 목표 직무는 최대 1개, 스크랩은 종류별 최대 3개."""
    if kind:
        return [(v["entity_id"], v["saved_title"]) for v in state.scrapped(kind)]
    goal = st.session_state["plan"]["goal_job_id"]
    if not goal:
        return []
    from core.datasets import job_titles
    return [(goal, job_titles().get(goal, goal))]


def _release(kind: str | None, entity_id: str) -> None:
    if kind:
        state.unscrap(kind, entity_id)
    else:
        state.select_goal(None)


# 로드맵(요청 AB3): 화면마다 몇 번째 단계인지. 그 단계까지 번호·세로선이 초록, 드론이 그 번호 왼쪽에 내려앉음.
# 01 산업 이해는 담을 단계가 없어 드론이 제목 오른쪽, 홈은 드론 없음
STEP_OF = {"jobs": 1, "learning": 2, "recruit.postings": 3, "recruit.companies": 4}
# 드론 그림(static/img/rm_drone.png, 사용자 제공 요청 AC1)을 초록으로 칠한 마스크(st.html은 svg·img 속성을 지워 CSS로)
_DRONE = '<span class="rm-drone" aria-hidden="true"></span>'


def _course_url(course_id: str) -> str:
    from core.datasets import representative_offerings, today
    url = representative_offerings(today()).set_index("course_id")["course_url"].get(course_id)
    return url if isinstance(url, str) and url else ""


def _step_item(kind: str | None, no: str, i: int, eid: str, name: str) -> None:
    """담긴 항목 한 줄(요청 AB4): 작은 글씨 한 줄, 넘치면 …. 누르면 상세 팝업(요청 AB2), 교육은 원문 새 창(사용자 결정)."""
    from components import dialogs
    with st.container(horizontal=True, vertical_alignment="center", key=f"roadmap-item-{no}-{i}"):
        if kind == "course":
            url = _course_url(eid)
            st.html(f'<a class="roadmap-item__link" href="{escape(url)}" target="_blank" rel="noopener" title="{escape(name)}">'
                    f'{escape(name)}</a>' if url else f'<p class="roadmap-item__link" title="{escape(name)}">{escape(name)}</p>',
                    width="stretch")
        else:
            st.button(name, key=f"roadmap-open-{no}-{eid}", type="tertiary", width="stretch", help=name,
                      on_click=dialogs.open_dialog, args=(kind or "job", eid))
        st.button("", key=f"roadmap-release-{no}-{eid}", type="tertiary", icon=":material/close:",
                  help="목표 직무 선택을 해제합니다" if kind is None else "스크랩을 해제합니다",
                  on_click=_release, args=(kind, eid))


# 스크랩 목록 펼치기·접기 단추(요청 AB4·AC3): 누르면 브라우저에서 바로 html[data-rm-open]을 바꿔 목록을 보이고 숨김
# (예전 st.button은 파이썬 재실행을 기다려 접힐 때 늦게 반응). 값은 뒤이어 파이썬에 알려 다른 화면에서도 유지
_FOLD_CSS = """
.rf{display:inline-flex;align-items:center;justify-content:center;padding:0;border:0;background:transparent;cursor:pointer;
  color:var(--text-2);font-family:"Material Symbols Rounded";font-size:var(--type-body-size);line-height:1;
  transition:color var(--duration-fast) var(--ease-standard)}
.rf:hover{color:var(--text)}
.rf:focus-visible{outline:var(--focus-w) solid var(--text);outline-offset:2px;border-radius:var(--radius-sm)}
"""

_FOLD_JS = """
export default function(component) {
  const { data, parentElement, setStateValue } = component;
  const doc = document.documentElement, tag = '|' + data.no + '|';
  let btn = parentElement.querySelector('.rf');
  if (!btn) { btn = document.createElement('button'); btn.type = 'button'; btn.className = 'rf'; parentElement.appendChild(btn); }
  const apply = (open) => {
    const cur = (doc.dataset.rmOpen || '').split('|').filter((s) => s && s !== data.no);
    if (open) cur.push(data.no);
    doc.dataset.rmOpen = cur.length ? '|' + cur.join('|') + '|' : '';
    btn.textContent = open ? 'expand_less' : 'expand_more';
    btn.title = open ? '목록 접기' : '목록 펼치기'; btn.setAttribute('aria-expanded', String(open));
  };
  // 파이썬이 아직 이전 값을 들고 다시 그린 경우(보낸 값이 반영되기 전)는 화면 상태 유지
  const P = window.__rfPending || (window.__rfPending = {});
  if (P[data.no] !== undefined && P[data.no] !== data.open) apply(P[data.no]);
  else { delete P[data.no]; apply(data.open); }
  btn.onclick = () => { const next = !(doc.dataset.rmOpen || '').includes(tag); apply(next); P[data.no] = next; setStateValue('open', next); };
}
"""

_fold = st.components.v2.component("roadmap_fold", css=_FOLD_CSS, js=_FOLD_JS)


def _fold_button(no: str) -> None:
    key, comp = f"rm_open_{no}", f"roadmap-fold-{no}"

    def _sync():
        value = (st.session_state.get(comp) or {}).get("open")
        if value is not None:
            st.session_state[key] = bool(value)

    _fold(data={"no": no, "open": bool(st.session_state.get(key))}, key=comp, on_open_change=_sync)


def _render_roadmap_panel(page: str | None) -> None:
    step = STEP_OF.get(page or "")
    with st.container(key="roadmap-panel"):
        st.html(f'<p class="roadmap__title">{ROADMAP_TITLE}{_DRONE if page == "industry" else ""}</p>')
        pages = routing.pages()
        for idx, (no, title, empty_text, kind, page_key, sub) in enumerate(ROADMAP_STEPS, 1):
            items = _step_items(kind)
            count = f'<span class="roadmap-step__count">{len(items)}/{state.SCRAP_LIMIT}</span>' if kind else ""
            # 키 = 표시 상태(base.css): -set 담김, -reach 이 화면까지 온 단계(번호 초록), -path 다음 단계로 가는 선도 초록
            reach = "-reach" if step and idx <= step else ""
            path = "-path" if step and idx < step else ""
            with st.container(key=f"roadmap-step-{no}{'-set' if items else ''}{reach}{path}"):
                with st.container(horizontal=True, vertical_alignment="center", key=f"roadmap-head-{no}", gap="small"):
                    st.html(f'<div class="roadmap-step"><span class="roadmap-step__no">{_DRONE if idx == step else ""}{no}</span>'
                            f'<div><p class="roadmap-step__title">{escape(title)}{count}</p>'
                            + ("" if items else f'<p class="roadmap-step__state">{escape(empty_text)}</p>')
                            + "</div></div>", width="content")
                    if kind and items:   # 스크랩 목록 펼치기·접기(요청 AB4, 기본 접힘). 목표 직무는 늘 보임
                        _fold_button(no)
                if items:            # 스크랩 목록은 늘 그리고, 접힘·펼침은 CSS가 바로 처리(요청 AC3)
                    for i, (eid, name) in enumerate(items):
                        _step_item(kind, no, i, eid, name)
                with st.container(horizontal=True, key=f"roadmap-actions-{no}"):
                    st.page_link(pages[page_key], label="살펴보기", icon=":material/arrow_forward:",
                                 query_params={routing.SUB_KEY: sub} if sub else None)
                    if kind and items:   # 이 종류 스크랩 모두 해제(요청 AT): 회색 글자, 접기 단추 바로 아래 줄 오른쪽 끝(제목 줄은 폭이 모자람)
                        st.button("초기화", key=f"roadmap-reset-{no}", type="tertiary",
                                  help=f"{title} {len(items)}개를 모두 해제합니다", on_click=_reset_scraps, args=(kind,))
        _render_my_conditions()


MY_EDU, MY_CAREER = ["고졸", "초대졸", "대졸", "석사"], ["신입", "경력"]


def _reset_scraps(kind: str) -> None:
    """그 종류(교육·공고·기업) 스크랩을 모두 해제(요청 AT). 목표 직무는 대상 아님."""
    for eid, _ in _step_items(kind):
        state.unscrap(kind, eid)


def _reset_profile() -> None:
    """내 조건(학력·경력·희망 지역)을 모두 비움(요청 AT). 위젯 값도 같이 비워 다시 그릴 때 맞게."""
    st.session_state["profile"].update(education=None, career_type=None, regions=[])
    st.session_state.update({"my_edu": None, "my_career": None, "my_regions": []})


def _render_my_conditions() -> None:
    """'내 조건'(학력·경력·희망 지역, 요청 N14): 04 화면의 거르기가 공고 조건 필터로 바뀌면서 이리로 옮김.
    저장되며(persistence), 공고 상세 '내 조건과 비교' 표와 03 교육 정렬(희망 지역 우선)에 쓰인다. 거르기는 하지 않는다."""
    from core.datasets import posting_frame
    profile = st.session_state["profile"]
    with st.container(key="roadmap-mycond"):
        # 번호 칸 없이 패널 왼쪽에 맞춤, 안내는 한 줄(요청 AF4)
        with st.container(horizontal=True, vertical_alignment="center", key="roadmap-mycond-top"):
            st.html('<p class="roadmap-step__title">내 조건</p>', width="content")
            st.button("초기화", key="roadmap-reset-mycond", type="tertiary",   # 학력·경력·희망 지역 모두 비움(요청 AT)
                      help="내 학력·경력·희망 지역을 모두 비웁니다", on_click=_reset_profile)
        st.html('<div class="roadmap-mycond__head">'
                '<p class="note">공고 상세 “내 조건과 비교”·교육 정렬에 사용</p></div>')   # 파란 안내(요청 AE1)
        # 학력·경력·지역은 펼치기 안에, 처음엔 접힘(요청 AA5). 이름·키 고정이라 다시 만들어지지 않음
        with st.expander("학력·경력·희망 지역", key="my_cond_open", on_change="rerun"):
            st.pills("내 학력", MY_EDU, key="my_edu", default=profile["education"],
                     on_change=lambda: profile.update(education=st.session_state["my_edu"]))
            st.pills("내 경력", MY_CAREER, key="my_career", default=profile["career_type"],
                     on_change=lambda: profile.update(career_type=st.session_state["my_career"]))
            st.multiselect("희망 지역", sorted(posting_frame().province_name.unique()), key="my_regions",
                           default=[r for r in profile["regions"]], placeholder="전체 지역",
                           on_change=lambda: profile.update(regions=list(st.session_state["my_regions"])))


@contextmanager
def frame(topbar_label: str | None, page: str | None = None):
    """중앙 본문 + 오른쪽 탐색 경로. 페이지는 중앙 열 안에서 실행된다.
    상단 줄을 나눔: 제목·구분선은 중앙 열, 단추는 탐색 경로 열 위(요청 AA4). topbar_label None = 홈.
    열림·닫힘과 관계없이 늘 같은 구조로 그리고, 닫힘은 CSS(html[data-roadmap])로 폭만 줄인다(요청 AA7: 깜빡임 없음).
    page = 'jobs'·'recruit.postings' 같은 현재 화면(로드맵 단계 표시, 요청 AB3)."""
    center, right = st.columns([3, 1], gap=None)
    with right:
        _roadmap_side()
        _render_roadmap_panel(page)
    with center:
        render_topbar(topbar_label)
        yield
        footer.render(page)                          # 본문 열 맨 아래(요청 AG1)
