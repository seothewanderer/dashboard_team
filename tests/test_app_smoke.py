"""앱 셸 스모크 테스트 (plan.md 13장): 5개 페이지 + 04 하위 2개가 예외 없이 렌더되고,
사이드바 하위 메뉴·중앙 탭·홈 버튼이 같은 하위 페이지 상태를 쓰는지 확인."""
import sys

import pytest
from streamlit.testing.v1 import AppTest

from core import routing
from core.config import ROOT

TIMEOUT = 30


def _fresh_components() -> None:
    """v2 컴포넌트(echarts·효과)는 import 시 런타임에 등록된다. 테스트마다 새 런타임이므로 다시 import."""
    for name in list(sys.modules):
        if name.startswith(("streamlit_echarts", "components", "views")):
            del sys.modules[name]


def run(page: str | None = None, **query) -> AppTest:
    _fresh_components()
    at = AppTest.from_file(str(ROOT / "app.py"), default_timeout=TIMEOUT)
    at.query_params.update(query)
    at.run()
    if page:
        at.switch_page(page).run()
    return at


def screen(at: AppTest) -> str:
    """상단바의 현재 화면 표시(예: '04 채용·기업 탐색 · 기업 탐색')."""
    return next(h.proto.body for h in at.get("html") if 'class="topbar__screen"' in h.proto.body)


@pytest.mark.parametrize("path", [p for _, p, _, _ in routing.PAGE_SPECS])
def test_every_page_renders(path):
    at = run(path)
    assert not at.exception, at.exception
    assert '<section class="page-intro">' in "".join(h.proto.body for h in at.get("html")) or path.endswith("home.py")


@pytest.mark.parametrize("sub,label", routing.RECRUIT_SUBS.items())
def test_recruit_sub_from_url(sub, label):
    at = run("views/p04_recruit.py", sub=sub)
    assert not at.exception
    assert at.session_state[routing.SUB_KEY] == sub
    assert label in screen(at)


def test_invalid_sub_falls_back_to_default():
    at = run("views/p04_recruit.py", sub="nope")
    assert at.session_state[routing.SUB_KEY] == routing.DEFAULT_SUB


def test_sidebar_submenu_and_center_tab_share_state():
    at = run("views/p04_recruit.py")
    at.button(key="nav_sub_companies").click().run()
    assert at.session_state[routing.SUB_KEY] == "companies" and "기업 탐색" in screen(at)
    at.segmented_control(key=routing.SUB_KEY).set_value("postings").run()
    assert "채용 현황" in screen(at)
    assert at.query_params[routing.SUB_KEY] == ["postings"]


def test_home_drone_entry_then_return_from_last_panel():
    # 요청 P1: 첫 방문 = 진입 비행, 다른 화면에서 돌아오면 = 마지막에 누른 패널 방향에서 복귀(한 방문에 한 번)
    at = run()
    assert not at.exception
    assert at.session_state["_home_entry"] == {"visit": 1, "kind": "first", "panel": None}
    at.switch_page("views/p02_jobs.py").run()
    at.session_state["_home_return"] = 1          # 홈에서 P2 패널을 눌러 떠났다고 가정(부품 트리거는 브라우저에서만)
    at.switch_page("views/home.py").run()
    assert at.session_state["_home_entry"] == {"visit": 2, "kind": "return", "panel": 1}
    at.run()                                      # 같은 방문 안의 다시 실행: 같은 값(다시 날지 않음)
    assert at.session_state["_home_entry"]["visit"] == 2
    at.switch_page("views/p03_learning.py").run()
    at.switch_page("views/home.py").run()         # 사이드바로 나갔다 오면 패널 없음(2시 방향)
    assert at.session_state["_home_entry"] == {"visit": 3, "kind": "return", "panel": None}


def test_sub_is_kept_after_visiting_another_page():
    at = run("views/p04_recruit.py", sub="companies")
    at.switch_page("views/p02_jobs.py").run()
    at.switch_page("views/p04_recruit.py").run()
    assert at.session_state[routing.SUB_KEY] == "companies"


def test_roadmap_panel_toggle():
    at = run()
    assert any('<p class="roadmap__title">' in h.proto.body for h in at.get("html"))
    at.button(key="topbar_roadmap").click().run()
    assert not any('<p class="roadmap__title">' in h.proto.body for h in at.get("html"))


def test_recruit_parent_menu_opens_postings_by_default():
    # 요청 B4: '04 채용·기업 탐색'을 누르면 하위 메뉴를 펼치고 채용 현황으로 이동
    at = run("views/p02_jobs.py")
    at.button(key="nav_recruit_toggle").click().run()
    assert not at.exception
    assert at.session_state[routing.SUB_KEY] == routing.DEFAULT_SUB
    assert at.session_state["ui"]["nav_open"]["recruit"] is True
    assert "채용 현황" in screen(at)
