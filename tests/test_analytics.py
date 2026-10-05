"""집계 규칙 (plan.md 13장, research 15.2-13·14·18·22·23·24)."""
from datetime import date

import pandas as pd
import pytest

from analytics import companies as C
from analytics import defense as D
from analytics import jobs as J
from analytics import learning as L
from analytics import postings as P
from analytics.common import paginate
from core.data_loader import read_table


@pytest.fixture(scope="module")
def comp():
    return C.company_frame(read_table("org"), read_table("org_area"), read_table("defense_evidence"),
                           read_table("bridge_posting_company_bridge"))


def test_company_frame_is_master_scope(comp):
    assert len(comp) == 264 and comp["company_id"].is_unique


def test_defense_groups_q2(comp):
    n = comp["defense_group"].value_counts()
    # 마스터 4/5/25 + '방산근거만 확인' 8개가 원장의 가장 강한 근거로 한 집단에만 배정
    assert n[D.DIRECT] + n[D.CROSS] + n[D.ADJACENT] == 4 + 5 + 25 + 8
    assert n[D.UNCONFIRMED] == 201 + 21
    assert comp["drone_evidence_missing"].sum() == 8


def test_area_counts_exclude_self_and_count_unique(comp):
    base = C.area_counts(comp, C.CompanyFilters())
    picked = C.area_counts(comp, C.CompanyFilters(area=["안티드론"]))
    pd.testing.assert_frame_equal(base, picked)            # 자기 필터 제외 → 분야 선택 전과 같은 분포
    assert base.loc[base.business_category.eq("안티드론"), "n"].item() == 25
    assert C.NO_AREA in set(base.business_category)       # 분야 없는 조직 누락 금지
    total = C.filter_companies(comp, C.CompanyFilters(area=["감시.정찰.수색", "인프라관리"]))
    assert total["company_id"].is_unique                   # 여러 분야 기업은 결과에 한 번만


def test_area_counts_apply_other_filters(comp):
    # 분야 자기 필터만 빼고 나머지 조건(여기서는 '수집 공고 연결됨')은 적용된다. 근거 집단 필터는 삭제(요청 S2)
    linked = C.area_counts(comp, C.CompanyFilters(has_posting=True))
    assert linked["n"].max() < C.area_counts(comp, C.CompanyFilters())["n"].max()
    assert linked["n"].sum() <= int(comp["has_posting"].sum()) * len(linked)


def test_filter_sort_paginate_order(comp):
    f = C.CompanyFilters(area=["감시.정찰.수색"])
    ranked = C.sort_companies(C.filter_companies(comp, f), f)
    first, total = paginate(ranked, 0)
    assert total == 152 and len(first) == 10
    rank = ranked["defense_group"].map({g: i for i, g in enumerate(D.GROUP_ORDER)})
    assert rank.is_monotonic_increasing                     # 전체 결과를 정렬한 뒤 10개 분할
    second, _ = paginate(ranked, 1)
    assert set(first.company_id).isdisjoint(second.company_id)


def test_no_selection_still_defense_first(comp):
    # 요청 X2: 분야·키워드를 고르지 않아도 자동 정렬은 방산 관련 우선, '이름순'을 고르면 이름순
    out = C.sort_companies(comp, C.CompanyFilters())
    rank = out["defense_group"].map({g: i for i, g in enumerate(D.GROUP_ORDER)})
    assert rank.is_monotonic_increasing
    assert C.sort_companies(comp, C.CompanyFilters(), "name")["company_name_normalized"].is_monotonic_increasing


def test_keyword_does_not_pull_unrelated_defense_companies(comp):
    f = C.CompanyFilters(keyword="방제")
    out = C.filter_companies(comp, f)
    assert len(out) > 0 and out["match_tier"].notna().all()
    assert len(out) < len(comp)


def test_posting_frame_groups(comp):
    pf = P.posting_frame(read_table("postings"), read_table("bridge_posting_company_bridge"), comp)
    assert len(pf) == 135
    assert (pf["defense_group"] == D.UNLINKED).sum() == pf["company_id"].isna().sum() == 82


def test_posting_region_counts_exclude_self(comp):
    pf = P.posting_frame(read_table("postings"), read_table("bridge_posting_company_bridge"), comp)
    a = P.dim_counts(pf, "province_name", {})
    b = P.dim_counts(pf, "province_name", {"province_name": ["서울"]})
    pd.testing.assert_frame_equal(a, b)
    c = P.dim_counts(pf, "province_name", {"career_type": ["신입"]})
    assert c["n"].sum() == 3


def test_compare_to_profile_statuses():
    posting = pd.Series({"education_normalized": "학력무관", "career_type": "경력", "province_name": "서울",
                         "education_raw": "", "career_requirement_raw": "3년 이상", "original_location": "서울"})
    out = P.compare_to_profile(posting, {"education": None, "career_type": "신입", "regions": []})
    assert out["상태"].tolist() == [P.MATCH, P.DIFF, P.NO_INPUT]


def _posting(**kw):
    base = {"posting_id": "P1", "title": "드론 개발자", "employer_name": "A", "job_major_category": "연구개발",
            "province_name": "서울", "district_name": "강남구", "career_type": "신입", "career_requirement_raw": None,
            "education_normalized": "대졸", "education_raw": "대졸이상", "responsibilities": None,
            "original_location": "서울"}
    return base | kw


def test_filter_by_profile_drops_only_confirmed_differences():
    df = pd.DataFrame([_posting(posting_id="P1", province_name="서울"),
                       _posting(posting_id="P2", province_name="부산"),
                       _posting(posting_id="P3", career_type="경력"),
                       _posting(posting_id="P4", career_type="불명", education_normalized="불명")])
    assert P.filter_by_profile(df, {"education": None, "career_type": None, "regions": []}).equals(df)   # 입력 없음
    out = P.filter_by_profile(df, {"education": "대졸", "career_type": "신입", "regions": ["서울"]})
    assert out["posting_id"].tolist() == ["P1", "P4"]          # 지역 차이·경력 차이만 빠지고 원문 미확인은 남김


def test_compare_to_job_relation_mentions_and_word_boundary():
    job = pd.Series({"job_id": "J1", "middle_category": "소프트웨어", "skills": ["Python", "C", "공간정보"]})
    postings = pd.DataFrame([_posting(title="Python 개발", responsibilities="CAD 도면과 공간정보 처리"),
                             _posting(posting_id="P2", title="영업", job_major_category="영업/사업개발")])
    bridge = pd.DataFrame({"job_id": ["J1", "J1"], "job_major_category": ["연구개발", "영업/사업개발"],
                           "relation_type": ["direct", "broad"], "review_status": ["draft", "rejected"]})
    out = P.compare_to_job(job, postings, bridge, {}, ["드론", "CAD", "영업"]).set_index("항목")
    first, second = out.iloc[:, 0], out.iloc[:, 1]
    assert first.iloc[1].startswith("직접 연결") and second.iloc[1].startswith("연결 없음")   # rejected 제외
    assert first.iloc[2] == "Python, 공간정보"                                               # 'C'는 'CAD'에 걸리지 않음
    assert first.iloc[4] == "CAD" and second.iloc[4] == "영업"
    assert second.iloc[8].startswith("제목만")


def test_job_by_defense_splits_three_kinds_and_sums(comp):
    """F2: 직무별 공고 = 방산 관련 기업 / 그 외 연결 기업 / 기업 미연결, 합계 = 고유 공고 수."""
    pf = P.posting_frame(read_table("postings"), read_table("bridge_posting_company_bridge"), comp)
    jd = P.job_by_defense(pf, {})
    assert list(jd.columns[1:4]) == P.KIND_ORDER and int(jd["total"].sum()) == pf["posting_id"].nunique()
    assert int(jd[P.DEF_KIND].sum()) == int(pf.defense_group.map(lambda g: bool(D.TIER.get(g))).sum())
    share, n_def, n_other = P.job_share_by_defense(pf)
    assert n_def + n_other == len(pf) and round(share["defense"].sum()) == 100 and round(share["other"].sum()) == 100


def test_keyword_counts_split_pipe_values():
    """F4: 'CAD|SolidWorks' 같은 복수값은 나눠 센다."""
    courses = pd.DataFrame({"course_id": ["A", "B", "C"], "search_keywords": ["CAD|SolidWorks", "CAD", None]})
    out = L.keyword_counts(courses).set_index("keyword")["n"].to_dict()
    assert out == {"CAD": 2, "SolidWorks": 1}


def test_goal_reasons_postings_and_courses():
    """F5: 관련 이유(분류 직접·인접, 기술 언급, 연결표 과정). 관련 없으면 None, 순서·건수 불변."""
    job = pd.Series({"job_id": "J1", "skills": ["Python", "GIS"]})
    postings = pd.DataFrame([_posting(posting_id="P1", title="GIS 분석", job_major_category="영업/사업개발"),
                             _posting(posting_id="P2", title="드론 조종", job_major_category="드론조종/운영"),
                             _posting(posting_id="P3", title="개발", job_major_category="연구개발")])
    bridge = pd.DataFrame({"job_id": ["J1", "J1"], "job_major_category": ["연구개발", "드론조종/운영"],
                           "relation_type": ["adjacent", "broad"], "review_status": ["draft", "draft"]})
    r = P.goal_reasons(postings, job, bridge, {}).tolist()
    assert r == ["기술 GIS", None, "인접 분류"]                    # broad는 관련으로 보지 않음
    courses = pd.DataFrame({"course_id": ["C1", "C2", "C3"], "course_name": ["Python 기초", "용접", "측량"],
                            "search_keywords": [None, None, "GIS"]})
    res = pd.DataFrame({"is_work24": [True], "job_id": ["J1"], "course_id": ["C2"]})
    assert L.goal_reasons(courses, job, res, {}).tolist() == ["기술 Python", "연결표 과정", "기술 GIS"]


def test_company_goal_reasons_by_area():
    companies = pd.DataFrame({"areas": [["방제", "측량"], ["교육"], []]})
    bridge = pd.DataFrame({"application_id": ["측량", "교육"], "job_id": ["J1", "J1"],
                           "review_status": ["draft", "rejected"]})
    assert C.goal_reasons(companies, {"job_id": "J1"}, bridge).tolist() == ["사업 분야 측량", None, None]


def test_defense_by_year_counts_scope():
    projects = pd.DataFrame({"project_id": [1, 2, 3, 4], "analysis_scope": ["HIGH_CONFIDENCE"] * 3 + ["EXPLORATORY"],
                             "representative_start_year": [2020, 2020, 2021, 2021], "defense_flag": [1, 0, 1, 1]})
    from analytics import industry as I
    out = I.defense_by_year(projects, include_exploratory=False)
    assert out[["representative_start_year", "defense", "other"]].values.tolist() == [[2020, 1, 1], [2021, 1, 0]]
    assert int(I.defense_by_year(projects, include_exploratory=True)["defense"].sum()) == 3


def test_skill_overlap_exact_only_without_review():
    jf = J.job_frame(read_table("jobs"), read_table("job_skills"), read_table("job_workplaces"), {})
    out = J.skill_overlap(jf, ["python"], {})
    assert len(out) > 0 and all("Python" in c for c in out["common"])


def test_date_status():
    t = date(2026, 9, 30)
    ts = pd.Timestamp
    assert L.date_status(ts("2026-10-01"), ts("2026-11-01"), t) == L.BEFORE
    assert L.date_status(ts("2026-09-01"), ts("2026-10-01"), t) == L.ONGOING
    assert L.date_status(ts("2026-01-01"), ts("2026-02-01"), t) == L.ENDED
    assert L.date_status(pd.NaT, pd.NaT, t) == L.NO_DATE


def test_course_search_merges_reasons_one_card_per_course():
    res = L.search_courses(["CAD", "SolidWorks"], read_table("courses"), read_table("skill_resources"))
    assert res["course_id"].is_unique
    both = res[res["reasons"].apply(len) >= 1]
    assert len(both) == len(res) and (res["group"] == L.GROUP_SEARCH).all()   # 직무 없이는 연결표 관계 미사용


def test_linked_courses_need_selected_job():
    rs = read_table("skill_resources")
    row = rs[rs["is_work24"] & rs["relevance_type"].eq("DIRECT")].iloc[0]
    res = L.search_courses([row.selected_skill], read_table("courses"), rs, job_id=row.job_id)
    hit = res[res.course_id.eq(row.course_id)]
    assert hit["group"].item() == L.GROUP_LINKED and "연결표에 있음" in hit["reasons"].item()


def test_province_std_unifies_gyeonggi():
    o = read_table("offerings")
    assert "경기도" not in set(o["province_std"]) and "전남광주" in set(o["province_std"])


def test_search_courses_no_match_keeps_columns():
    """요청 K3: 일치 과정이 0개여도 열이 있어야 화면에서 course_id 를 쓸 수 있다."""
    courses = pd.DataFrame({"course_id": ["A"], "course_name": ["드론 조종"], "search_keywords": ["드론"], "ncs_name": [None]})
    resources = pd.DataFrame(columns=["is_work24", "job_id", "selected_skill", "course_id", "relevance_type"])
    out = L.search_courses(["Pixhawk"], courses, resources)
    assert out.empty and "course_id" in out.columns


def test_recruit_keyword_counts_word_boundary():
    """요청 K2: 'C'가 CAD·C++ 에, 'SW'가 SolidWorks 에 걸리지 않는다."""
    courses = pd.DataFrame({"course_id": ["A", "B", "C"], "course_name": ["CAD 실무", "C++ 기초", "C 언어 SW 개발"],
                            "search_keywords": ["CAD", "C++", None], "ncs_name": [None, None, None]})
    kw = pd.DataFrame({"keyword_normalized": ["C", "SW", "C++", "Pixhawk"], "posting_count": [3, 2, 5, 9]})
    out = L.recruit_keyword_counts(kw, courses).set_index("keyword")["n"].to_dict()
    assert out == {"C": 1, "SW": 1, "C++": 1}


def test_area_basis_counts_match_existing(comp):
    # 요청 U1: '기업 수' 기준은 01·C01 기존 값(area_counts·area_defense_counts)과 같다
    f = C.CompanyFilters()
    b = C.area_basis_counts(comp, f, "companies").set_index("business_category")
    a = C.area_counts(comp, f).set_index("business_category")["n"]
    assert b["n"].to_dict() == a.to_dict()
    d = C.area_defense_counts(comp, f)
    assert {k: v for k, v in b["defense"].items() if v} == d
    posted = C.area_basis_counts(comp, f, "posted").set_index("business_category")["n"]
    assert all(posted[k] <= a[k] for k in posted.index)            # 공고 있는 기업 ⊂ 기업
    n = C.area_basis_counts(comp, f, "postings")["n"]
    assert n.sum() >= int(comp["posting_count"].sum()) - int(comp.loc[comp["areas"].str.len().eq(0), "posting_count"].sum())


def test_area_cooccurrence(comp):
    # 요청 U2: 고른 분야와 '분야 미수록'은 빼고, 값은 고른 분야 기업 수를 넘지 않는다
    f = C.CompanyFilters(area=["방역/방제/살포"])
    co = C.area_cooccurrence(comp, f, f.area)
    picked = len(C.filter_companies(comp, f))
    assert "방역/방제/살포" not in set(co.business_category) and C.NO_AREA not in set(co.business_category)
    assert co["n"].max() <= picked and (co["defense"] <= co["n"]).all()


def test_skill_names_skip_placeholder():
    # 요청 AG2: 연결표의 'X 관련 기술'은 한글 이름이 아니므로 키 그대로 보인다
    names = L.skill_names(read_table("skill_resources"))
    assert names["CAD"] == "컴퓨터 지원 설계"
    assert "Regulation" not in names
    assert L.skill_label("CAD", names, md=False) == "컴퓨터 지원 설계(CAD)"
    assert L.skill_label("Regulation", names) == "Regulation"


def test_table_height_estimate_grows_with_long_text():
    # 요청 AP·AQ: 표 높이는 줄바꿈될 긴 글까지 어림(자동 높이는 팝업에서 0으로 남아 쓰지 않음)
    from components.tables import HEADER_H, ROW_H, _est_height
    short = pd.DataFrame({"a": ["x"], "b": ["y"]})
    long = pd.DataFrame({"a": ["x"], "b": ["보고서 수록 내용 기준이며 계약·납품 여부는 별도 확인 필요 " * 4]})
    assert _est_height(short, 10, 90) >= HEADER_H + ROW_H
    assert _est_height(long, 10, 90) > _est_height(short, 10, 90) + ROW_H
