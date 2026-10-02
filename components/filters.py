"""필터·조작 공용 부품 (plan.md 8.4, DESIGN 'Defense vs General' 2.2).

- 막대 클릭과 칩(st.pills)은 같은 session_state 키를 쓴다. toggle_value()가 클릭을 그 키에 반영한다.
- 방산 강조 토글: 켜도 건수·순서가 바뀌지 않는다. 켜져 있으면 상태 줄을 필터 줄 아래에 둔다.
"""
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
                  help="방산 관련 근거가 확인된 항목을 주황색으로 강조합니다. 필터나 정렬이 아닙니다.")
    return ui["highlight_defense"]


def defense_status_line() -> None:
    if st.session_state["ui"]["highlight_defense"]:
        st.html('<p class="status-line">방산 강조 중 · 건수는 바뀌지 않습니다</p>')


GOAL_KEY = "hl_goal"


def goal_toggle() -> bool:
    """목표 직무 관련 강조(요청 F5). 목표 직무가 없으면 비활성. 필터가 아니라 강조(건수·순서 불변)."""
    ui, goal = st.session_state["ui"], st.session_state["plan"]["goal_job_id"]
    if GOAL_KEY not in st.session_state:
        st.session_state[GOAL_KEY] = ui.get("highlight_goal", False)

    def _sync():
        ui["highlight_goal"] = st.session_state[GOAL_KEY]

    with st.container(key=f"goal-toggle{'-on' if goal and st.session_state[GOAL_KEY] else ''}", width="content"):
        st.toggle("목표 직무 관련 강조", key=GOAL_KEY, on_change=_sync, disabled=not goal,
                  help="02 직무 탐색에서 목표 직무를 고르면 켤 수 있습니다. 관련 카드에 이유를 표시하고 나머지는 옅게 합니다."
                  if not goal else "목표 직무와 분류·기술·사업 분야가 이어지는 카드를 강조합니다. 필터가 아닙니다.")
    return bool(goal and ui.get("highlight_goal"))


def goal_status_line(n_related: int, n_total: int) -> None:
    st.html(f'<p class="status-line">목표 직무 관련 {n_related}개 / {n_total}개 강조 중 · 건수와 순서는 바뀌지 않습니다</p>')


def pager(page_key: str, total: int, size: int = 10, label: str = "개") -> int:
    """'전체 N개 중 a~b  ‹ 이전 10개  현재/전체  다음 10개 ›' (요청 W2). 반환: 현재 묶음 번호(0부터).
    순환: 첫 페이지에서 '이전' = 마지막 페이지, 마지막에서 '다음' = 첫 페이지. 한 페이지뿐이면 단추를 막는다."""
    last = max(0, (total - 1) // size)
    no = min(st.session_state.get(page_key, 0), last)
    st.session_state[page_key] = no
    start, end = (no * size + 1, min(total, (no + 1) * size)) if total else (0, 0)
    with st.container(horizontal=True, vertical_alignment="center", key=f"pager-{page_key}"):
        st.html(f'<p class="pager__text">전체 {total:,}{label} 중 {start}~{end}</p>', width="content")
        st.button("이전 10개", key=f"{page_key}_prev", disabled=last == 0, type="tertiary",
                  icon=":material/chevron_left:", on_click=lambda: st.session_state.update({page_key: last if no == 0 else no - 1}))
        st.html(f'<p class="pager__no"><b>{no + 1}</b> / {last + 1}</p>', width="content")
        st.button("다음 10개", key=f"{page_key}_next", disabled=last == 0, type="tertiary",
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
