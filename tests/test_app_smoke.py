"""앱 셸 스모크 테스트 (plan.md 13장): 5개 페이지 + 04 하위 2개가 예외 없이 렌더되고,
사이드바 하위 메뉴·중앙 탭·홈 버튼이 같은 하위 페이지 상태를 쓰는지 확인."""
import json
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
    # 요청 AA7: 열림·닫힘과 관계없이 패널을 늘 그리고(구조가 같아 깜빡임 없음), 닫힘은 단추 컴포넌트에 open=False로 전달
    def toggle_open(at):
        comp = next(c for c in at.get("bidi_component") if c.proto.component_name.endswith("roadmap_toggle"))
        return json.loads(comp.proto.json)["open"]

    at = run("views/p02_jobs.py")
    assert any('<p class="roadmap__title">' in h.proto.body for h in at.get("html"))
    assert toggle_open(at) is True
    at.session_state["ui"]["roadmap_open"] = False
    at.run()
    assert not at.exception
    assert any('<p class="roadmap__title">' in h.proto.body for h in at.get("html"))
    assert toggle_open(at) is False


def test_recruit_parent_menu_opens_postings_by_default():
    # 요청 B4: '04 채용·기업 탐색'을 누르면 하위 메뉴를 펼치고 채용 현황으로 이동
    at = run("views/p02_jobs.py")
    at.button(key="nav_recruit_toggle").click().run()
    assert not at.exception
    assert at.session_state[routing.SUB_KEY] == routing.DEFAULT_SUB
    assert at.session_state["ui"]["nav_open"]["recruit"] is True
    assert "채용 현황" in screen(at)


def test_learning_skill_pick_keeps_course_search():
    # 요청 AG2: 기술을 골라도 아래 교육 찾기는 그대로, '이 기술 관련 교육 찾기'를 눌러야 넘어간다
    at = run("views/p03_learning.py")
    at.session_state["learn_job"] = "DJ-113"
    at.session_state["learn_skill"] = "CAD"
    at.run()
    assert not at.exception
    assert "learn_keyword" not in at.session_state or not at.session_state["learn_keyword"]
    at.button(key="learn_find").click().run()
    assert not at.exception
    assert at.session_state["learn_keyword"] == "CAD"
    assert any("기술 컴퓨터 지원 설계(CAD)" in h.proto.body for h in at.get("html"))


def test_footer_next_step():
    # 요청 AG1: 푸터 '다음 단계'로 다음 화면 이동, 마지막 화면(기업 탐색)에는 없음
    at = run("views/p02_jobs.py")
    assert any("데이터 출처 · 기준일" in h.proto.body for h in at.get("html"))
    at.button(key="footer-next").click().run()
    assert not at.exception
    assert "준비 역량" in screen(at)


def test_postings_compare_table_renders():
    # 요청 AI 중 발견: 목표 직무 + 스크랩 공고가 있으면 비교 표(AgGrid)가 그려짐 — 표 색 토큰(--border)이 없으면 오류
    from core.data_loader import load_table
    pid = load_table("postings")["posting_id"].iloc[0]
    at = run("views/p04_recruit.py")
    at.session_state["plan"]["goal_job_id"] = "DJ-113"
    at.session_state["scrap"][f"posting:{pid}"] = {"entity_type": "posting", "entity_id": pid,
                                                   "saved_at": "2026-10-05T00:00:00", "saved_title": "t", "source_ref": ""}
    at.run()
    assert not at.exception, at.exception
    assert any('스크랩한 공고 1개' in h.proto.body for h in at.get('html'))   # 비교 표 쪽까지 그려졌는지


def test_postings_defense_only_toggles_shared():
    # 요청 AI2: 공고 조건 줄과 공고 카드 줄의 '방산 관련 기업만 보기'는 같은 상태
    at = run("views/p04_recruit.py")
    at.session_state["post_cards_open"] = True
    at.run()
    at.toggle(key="post_only_defense_cards").set_value(True).run()
    assert not at.exception
    assert at.session_state["post_only_defense_all"] is True
    assert at.toggle(key="post_only_defense_cards").value is True


def test_j05_keyword_filters_job_cards():
    # 요청 AM: 키워드를 고르면 따로 카드를 띄우지 않고 위 '직무 카드 보기'를 거르고 펼친다
    at = run("views/p02_jobs.py")
    at.button_group(key="j05_pick").set_value("CAD").run()
    assert not at.exception
    assert at.session_state["j05_keyword"] == "CAD"
    assert at.session_state["jobs_cards_open"] is True
    assert any(b.key == "j05_clear" for b in at.button)            # 카드 줄에 '키워드: CAD' 해제 단추
    pager = next(h.proto.body for h in at.get("html") if "pager__text" in h.proto.body)
    assert "전체 209개" not in pager                                  # 전체 직무보다 줄어듦
    at.button(key="j05_clear").click().run()
    assert not at.session_state["j05_keyword"]


def test_goal_toggle_per_page_default_off():
    # 요청 AR: '목표 직무 관련 강조'는 화면마다 따로, 처음엔 꺼짐(다른 화면에서 켠 것이 넘어오지 않음)
    at = run("views/p03_learning.py")
    at.session_state["plan"]["goal_job_id"] = "DJ-113"
    at.session_state["learn_explore"] = True
    at.run()
    at.toggle(key="hl_goal_learning").set_value(True).run()
    assert not at.exception
    at.switch_page("views/p04_recruit.py").run()
    at.session_state["post_cards_open"] = True
    at.run()
    assert not at.exception
    assert at.toggle(key="hl_goal_postings").value is False


def test_companies_cooccurrence_narrows_cards():
    # 요청 AS: 함께 하는 분야를 고르면 왼쪽 분야는 그대로, 카드는 두 분야를 모두 하는 곳만
    at = run("views/p04_recruit.py", sub="companies")
    at.session_state["co_area"] = "방역/방제/살포"
    at.session_state["co_cards_open"] = True
    at.run()
    count = lambda: int(next(h.proto.body for h in at.get("html") if "result-count" in h.proto.body).split("<b>")[1].split("<")[0])
    before = count()
    at.session_state["co_with"] = ["감시.정찰.수색"]
    at.session_state["co_with_for"] = ("방역/방제/살포",)
    at.run()
    assert not at.exception
    assert at.session_state["co_area"] == "방역/방제/살포"
    assert 0 < count() < before
    assert any(b.key == "co_with_clear" for b in at.button)
    at.button(key="co_with_clear").click().run()
    assert count() == before


def test_roadmap_reset_buttons():
    # 요청 AT: 스크랩 종류별 초기화(목표 직무 제외) · 내 조건 초기화
    at = run("views/p02_jobs.py")
    at.session_state["plan"]["goal_job_id"] = "DJ-113"
    for i, cid in enumerate(["C1", "C2"]):
        at.session_state["scrap"][f"company:{cid}"] = {"entity_type": "company", "entity_id": cid,
                                                       "saved_at": f"2026-10-05T00:00:0{i}", "saved_title": cid, "source_ref": ""}
    at.session_state["profile"].update(education="대졸", career_type="신입", regions=["서울"])
    at.run()
    at.button(key="roadmap-reset-04").click().run()
    assert not at.exception
    assert not [k for k in at.session_state["scrap"] if k.startswith("company:")]
    assert at.session_state["plan"]["goal_job_id"] == "DJ-113"              # 목표 직무는 그대로
    at.button(key="roadmap-reset-mycond").click().run()
    assert not at.exception
    p = at.session_state["profile"]
    assert (p["education"], p["career_type"], p["regions"]) == (None, None, [])
