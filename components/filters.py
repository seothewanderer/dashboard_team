"""필터·조작 공용 부품 (plan.md 8.4, DESIGN 'Defense vs General' 2.2).

- 막대 클릭과 칩(st.pills)은 같은 session_state 키를 쓴다. toggle_value()가 클릭을 그 키에 반영한다.
- 방산 강조 토글: 켜도 건수·순서가 바뀌지 않는다. 켜져 있으면 상태 줄을 필터 줄 아래에 둔다.
"""
from contextlib import contextmanager

import streamlit as st

HL_KEY = "hl_defense"


def toggle_value(key: str, value: str, multi: bool = False, reset: str | None = None) -> None:
    """콜백용: 같은 값 다시 누르면 해제. multi면 목록에 추가/제거. reset 키(묶음 번호)는 0으로."""
    cur = st.session_state.get(key)
    if multi:
        cur = list(cur or [])
        st.session_state[key] = [v for v in cur if v != value] if value in cur else cur + [value]
    else:
        st.session_state[key] = None if cur == value else value
    if reset:
        st.session_state[reset] = 0


def as_list(value) -> list:
    if value is None:
        return []
    return list(value) if isinstance(value, (list, tuple)) else [value]


def defense_toggle() -> bool:
    ui = st.session_state["ui"]
    if HL_KEY not in st.session_state:
        st.session_state[HL_KEY] = ui["highlight_defense"]

    def _sync():
        ui["highlight_defense"] = st.session_state[HL_KEY]

    on = st.session_state[HL_KEY]
    with st.container(key=f"defense-toggle{'-on' if on else ''}", width="content"):
        st.toggle("방산 강조 켜짐" if on else "방산 강조", key=HL_KEY, on_change=_sync,
                  help="방산 관련 근거가 확인된 항목을 강조하고 카드는 방산 관련을 앞에 둡니다. 필터가 아닙니다.")
    return ui["highlight_defense"]


def defense_status_line() -> None:
    if st.session_state["ui"]["highlight_defense"]:
        st.html('<p class="status-line note">방산 강조 중 · 카드는 방산 관련을 앞에 둡니다 · 건수는 바뀌지 않습니다</p>')


def highlight_first(df, defense=None):
    """강조가 켜져 있으면 관련 카드를 앞으로(요청 AD1, 모든 카드 목록 같은 규칙). 목표 직무 관련(goal_reason 열이 있을 때)
    → 그중 방산 관련 → 방산 관련(방산 강조가 켜졌고 defense 표시가 있을 때) → 나머지. 각 묶음 안은 지금 순서 그대로.
    defense = df와 같은 줄의 참/거짓 Series(방산 판단 대상이 아니면 None)."""
    keys = {}
    if "goal_reason" in df.columns:
        keys["_g"] = df["goal_reason"].isna()
    if defense is not None and st.session_state["ui"]["highlight_defense"]:
        keys["_d"] = ~defense.astype(bool)
    if not keys:
        return df
    return df.assign(**keys).sort_values(list(keys), kind="stable").drop(columns=list(keys))


def goal_toggle(page: str) -> bool:
    """목표 직무 관련 강조(요청 F5). 목표 직무가 없으면 비활성. 필터가 아니라 강조(건수 불변, 관련 카드를 앞으로 — 요청 AD1).
    화면마다 따로이고 처음엔 꺼짐(요청 AR: 다른 화면에서 켠 것이 넘어오지 않게). 카드 모양(cards.py)이 읽는
    ui["highlight_goal"]은 그리는 화면의 값으로 매번 맞춘다."""
    ui, goal = st.session_state["ui"], st.session_state["plan"]["goal_job_id"]
    key = f"hl_goal_{page}"
    st.session_state.setdefault(key, False)
    ui["highlight_goal"] = bool(st.session_state[key])

    def _sync():
        ui["highlight_goal"] = st.session_state[key]

    with st.container(key=f"goal-toggle{'-on' if goal and st.session_state[key] else ''}-{page}", width="content"):
        st.toggle("목표 직무 관련 강조", key=key, on_change=_sync, disabled=not goal,
                  help="02 직무 탐색에서 목표 직무를 고르면 켤 수 있습니다. 관련 카드에 이유를 표시하고 나머지는 옅게 합니다."
                  if not goal else "목표 직무와 분류·기술·사업 분야가 이어지는 카드를 강조하고 앞에 둡니다. 필터가 아닙니다.")
    return bool(goal and ui.get("highlight_goal"))


def goal_status_line(n_related: int, n_total: int) -> None:
    st.html(f'<p class="status-line note">목표 직무 관련 {n_related}개 / {n_total}개 강조 중 · 관련 카드를 앞에 둡니다 · 건수는 바뀌지 않습니다</p>')


PAGE_SIZES = (5, 10, 20)   # 카드 'N개씩 보기'(요청 AB7)


def card_fold(label: str, key: str):
    """카드 펼치기(제목·키 고정, 요청 AB8). 'with card_fold(...):'
    코드(칩·그래프 콜백)로 여닫은 뒤 위쪽 화면이 바뀌어 펼치기가 다시 붙으면, 브라우저가 예전 열림 값을 들고 있다가
    안쪽 단추(이전/다음 등)를 누를 때 그 값을 보내 펼치기가 접혔다(요청 AU). 사용자가 아닌 코드로 값이 바뀌었으면
    제목 끝에 보이지 않는 글자(U+200B)를 넣고 빼 새 위젯으로 만든다 → 예전 값이 없어 지금 값대로 열린다."""
    now, user = bool(st.session_state.get(key)), st.session_state.pop(f"{key}__user", False)
    gen = st.session_state.get(f"{key}__gen", 0)
    if now != st.session_state.get(f"{key}__shown", now) and not user:
        gen += 1
        st.session_state[f"{key}__gen"] = gen
    st.session_state[f"{key}__shown"] = now
    return st.expander(label + "​" * (gen % 2), key=key,
                       on_change=lambda: st.session_state.update({f"{key}__user": True}))


@contextmanager
def card_bar(size_key: str, default: int, page_key: str):
    """카드 펼치기 맨 위 한 줄(요청 AB8, 다섯 곳 같은 배치): 왼쪽 = 카드에만 영향을 주는 토글·정렬(with 블록 안에서 그림),
    오른쪽 = 'N개씩 보기' 펼침 목록(요청 AB7, 5·10·20). 개수를 바꾸면 첫 쪽으로. 'with card_bar(...) as size:'"""
    st.session_state.setdefault(size_key, default)
    with st.container(horizontal=True, vertical_alignment="center", key=f"cardbar-{size_key}"):
        with st.container(horizontal=True, vertical_alignment="center", key=f"cardbar-left-{size_key}", width="stretch"):
            yield st.session_state[size_key]
        with st.container(key=f"cardsize-{size_key}", width="content"):
            st.selectbox("한 번에 보기", PAGE_SIZES, key=size_key, format_func=lambda n: f"{n}개씩 보기",
                         label_visibility="collapsed", on_change=lambda: st.session_state.update({page_key: 0}))


def pager(page_key: str, total: int, size: int = 10, label: str = "개") -> int:
    """'전체 N개 중 a~b  ‹ 이전 N개  현재/전체  다음 N개 ›' (요청 W2, N = 한 번에 보는 개수 AB7). 반환: 현재 묶음 번호(0부터).
    순환: 첫 페이지에서 '이전' = 마지막 페이지, 마지막에서 '다음' = 첫 페이지. 한 페이지뿐이면 단추를 막는다."""
    last = max(0, (total - 1) // size)
    no = min(st.session_state.get(page_key, 0), last)
    st.session_state[page_key] = no
    start, end = (no * size + 1, min(total, (no + 1) * size)) if total else (0, 0)
    with st.container(horizontal=True, vertical_alignment="center", key=f"pager-{page_key}"):
        st.html(f'<p class="pager__text">전체 {total:,}{label} 중 {start}~{end}</p>', width="content")
        st.button(f"이전 {size}개", key=f"{page_key}_prev", disabled=last == 0, type="tertiary",
                  icon=":material/chevron_left:", on_click=lambda: st.session_state.update({page_key: last if no == 0 else no - 1}))
        st.html(f'<p class="pager__no"><b>{no + 1}</b> / {last + 1}</p>', width="content")
        st.button(f"다음 {size}개", key=f"{page_key}_next", disabled=last == 0, type="tertiary",
                  icon=":material/chevron_right:", icon_position="right",
                  on_click=lambda: st.session_state.update({page_key: 0 if no >= last else no + 1}))
    return no


def handoff_banner(text: str, clear_key: str, on_clear) -> None:
    with st.container(horizontal=True, vertical_alignment="center", key=f"handoff-{clear_key}"):
        st.html(f'<p class="handoff__text">{text}</p>', width="stretch")
        st.button("전체로 보기", key=clear_key, type="tertiary", icon=":material/close:", on_click=on_clear)


def only_toggle(key: str, label: str, tone: str, help: str, on_change=None) -> bool:
    """카드 목록 필터 토글(요청 L5): 켜면 카드만 걸러 건수가 줄어든다(그래프는 그대로). tone = defense(빨강) / drone(초록)."""
    on = bool(st.session_state.get(key))
    with st.container(key=f"only-{tone}{'-on' if on else ''}-{key}", width="content"):
        st.toggle(label, key=key, help=help, on_change=on_change)
    return bool(st.session_state.get(key))
