"""plan.md 6.5 계약 검사 — processed 산출물 기준."""
import pandas as pd
import pytest

from core.data_loader import read_table, table_names
from scripts.build_data import check_contracts


@pytest.fixture(scope="module")
def tables():
    return {name: read_table(name) for name in table_names()}


def test_contracts_pass(tables):
    assert check_contracts(tables) == []


def test_contract_detects_broken_data(tables):
    broken = dict(tables, jobs=tables["jobs"].iloc[:-1])
    assert any("jobs 행 수" in f for f in check_contracts(broken))


def test_org_is_master_scope(tables):
    org = tables["org"]
    assert len(org) == 264 and org["has_profile"].sum() == 239 and org["has_dart"].sum() == 22


def test_posting_exact_name_match(tables):
    # plan 1.2: 공고 기업명 ↔ 조직 마스터 정확 일치 22개 기업명 / 52행 (브리지 초안의 근거)
    names = set(tables["org"]["company_name_normalized"])
    matched = tables["postings"]["employer_name"].isin(names)
    assert matched.sum() == 52
    assert tables["postings"].loc[matched, "employer_name"].nunique() == 22


def test_courses_union_has_no_duplicate_ids(tables):
    courses = tables["courses"]
    assert courses["source_group"].value_counts().to_dict() == {"keyword": 290, "drone": 148}
    assert courses["course_id"].is_unique


def test_employment_types_is_list(tables):
    # 고용형태는 다중값 태그: '계약직, 정규직' → ['계약직', '정규직'] (H02 중복 허용 집계)
    types = tables["postings"]["employment_types"].map(list)
    assert types.map(len).min() == 1
    assert int((types.map(len) > 1).sum()) == 13
    assert ["계약직", "정규직"] in types.tolist()


def test_no_korean_column_names(tables):
    # 로컬 DB 전환 대비: 앱이 읽는 org는 영문 컬럼만 (plan 6.1)
    assert not [c for c in tables["org"].columns if any("가" <= ch <= "힣" for ch in c)]
