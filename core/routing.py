"""페이지 등록과 이동 (plan.md 5.2, 9.5).

st.Page 5개. '04 채용·기업 탐색' 안의 하위 페이지(채용 현황/기업 탐색)는
위젯 키 SUB_KEY 하나로 관리한다(사이드바 하위 메뉴와 중앙 탭이 같은 키를 읽음).
위젯 값은 위젯이 그려진 뒤에는 바꿀 수 없으므로, 매 실행 첫머리의 sync_sub()가
이동 요청(PENDING_SUB) → 외부에서 바뀐 URL ?sub=(직접 입력·링크) → 기존 값 순으로 정하고,
04 페이지는 write_sub_to_url()로 URL을 맞춘다. 탭 클릭 직후에는 URL이 아직 이전 값이므로,
마지막으로 쓴 URL 값(URL_WRITTEN)과 같으면 외부 요청으로 보지 않는다.
(st.segmented_control의 bind="query-params"는 코드에서 URL을 설정할 수 없어 쓰지 않음)
"""
import streamlit as st

SUB_KEY = "sub"
PENDING_SUB = "_pending_sub"
URL_WRITTEN = "_sub_in_url"
RECRUIT_SUBS = {"postings": "채용 현황", "companies": "기업 탐색"}
DEFAULT_SUB = "postings"

PAGE_SPECS = [  # key, 파일, 메뉴 제목, url
    ("home", "views/home.py", "홈", "home"),
    ("industry", "views/p01_industry.py", "01 산업 이해", "industry"),
    ("jobs", "views/p02_jobs.py", "02 직무 탐색", "jobs"),
    ("learning", "views/p03_learning.py", "03 준비 역량", "learning"),
    ("recruit", "views/p04_recruit.py", "04 채용·기업 탐색", "recruit"),
]


def pages() -> dict[str, st.Page]:
    return {key: st.Page(path, title=title, url_path=url, default=(key == "home"))
            for key, path, title, url in PAGE_SPECS}


def current_key(current: st.Page) -> str:
    return next(key for key, _, _, url in PAGE_SPECS if url == current.url_path or
                (key == "home" and current.url_path == ""))


def go(page_key: str, sub: str | None = None, handoff: dict | None = None) -> None:
    """다른 화면(또는 04 하위 페이지)으로 이동. 도착 화면은 consume_handoff()로 한 번만 읽는다."""
    target = f"recruit.{sub}" if sub else page_key
    st.session_state["handoff"] = {"target": target, **handoff} if handoff else None
    if sub:
        st.session_state[PENDING_SUB] = sub
    st.switch_page(pages()[page_key], query_params={SUB_KEY: sub} if sub else None)


def sync_sub() -> None:
    pending = st.session_state.pop(PENDING_SUB, None)
    from_url = st.query_params.get(SUB_KEY)
    if from_url == st.session_state.get(URL_WRITTEN):
        from_url = None
    for value in (pending, from_url, st.session_state.get(SUB_KEY), DEFAULT_SUB):
        if value in RECRUIT_SUBS:
            st.session_state[SUB_KEY] = value
            return


def write_sub_to_url() -> None:
    st.query_params[SUB_KEY] = st.session_state[URL_WRITTEN] = st.session_state[SUB_KEY]


def clear_sub_from_url() -> None:
    if SUB_KEY in st.query_params:
        del st.query_params[SUB_KEY]
    st.session_state.pop(URL_WRITTEN, None)


def active_sub() -> str:
    return st.session_state.get(SUB_KEY) or DEFAULT_SUB


def consume_handoff(target: str) -> dict | None:
    handoff = st.session_state.get("handoff")
    if handoff and handoff["target"] == target:
        st.session_state["handoff"] = None
        return {k: v for k, v in handoff.items() if k != "target"}
    return None
