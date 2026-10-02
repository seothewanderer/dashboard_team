"""결측 규칙(plan.md 6.3)이 processed에 반영됐는지 확인."""
import pandas as pd
import pytest

from core import quality
from core.data_loader import read_table

# plan.md 6.3 '제외' 표의 대표 컬럼 → 산출 테이블에 없어야 함
EXCLUDED = {
    "postings": ["career_min_years", "career_max_years", "annual_salary_min_10k_krw",
                 "annual_salary_max_10k_krw", "major_requirement_raw", "duplicate_candidate_type"],
    "jobs": ["actual_employer", "actual_posting_title", "actual_posting_url",
             "salary_min_10k_krw", "salary_max_10k_krw", "salary_midpoint_10k_krw"],
    "job_posting_examples": ["salary_min_10k_krw", "salary_max_10k_krw"],
    "offerings": ["enrolled", "completion_rate", "ncs_code_standard"],
    "courses": ["ncs_code_standard", "standard_confirmed_flag", "certificate_course_flag",
                "estimated_certificate_type", "related_certificate_raw"],
    "skill_resources": ["recruitment_period", "alternative_resource"],
    "defense_evidence": ["source_page"],
    "defense_cost_cert": ["renewal_4_date", "renewal_5_date"],
    "ntis_collab": ["subcontract_project_title"],
    "ntis_projects": ["prior_data_source"],
    "export": ["subcategory"],
    "org": ["open_posting_count", "salary_min_10k_krw", "salary_max_10k_krw", "address",
            "company_size", "employee_count", "revenue_raw"],
}
CAUTION = {("postings/Job_Posting_Analysis_Data.csv", "salary_raw"),
           ("learning/Training_Session_Analysis_drone.csv", "satisfaction_score_100"),
           ("procurement/PPS_Drone_Bids.csv", "awarded_company"),
           ("procurement/PPS_Drone_Bids.csv", "winning_bid_krw"),
           ("defense/Defense_Cost_Certified_Companies.csv", "3차 갱신일")}


@pytest.mark.parametrize("table,columns", EXCLUDED.items())
def test_excluded_columns_absent(table, columns):
    present = set(read_table(table).columns) & set(columns)
    assert not present, f"{table}에 제외 컬럼이 남음: {present}"


def test_caution_list():
    audit = read_table("quality_audit")
    caution = set(map(tuple, audit.loc[audit.status == "caution", ["source", "column"]].values))
    assert CAUTION <= caution


def test_kept_columns_are_not_filled():
    # 주의 컬럼은 남기되 값을 채우지 않는다: salary_raw 결측 50/135 유지
    assert read_table("postings")["salary_raw"].isna().sum() == 50


def test_audit_thresholds():
    df = pd.DataFrame({"a": [None, None, "x", "y"], "b": [None, "x", "y", "z"],
                       "c": ["공개정보 확인 불가", "공개정보 확인 불가", "  ", "v"], "d": ["불명"] * 4})
    status = quality.audit(df, "t").set_index("column")["status"].to_dict()
    assert status == {"a": "exclude", "b": "ok", "c": "exclude", "d": "ok"}  # 불명은 범주, 결측 아님


def test_union_exclusion_consistent():
    audit = read_table("quality_audit")
    union = audit[audit.status == "exclude_union"]
    assert set(union["column"]) >= {"enrolled", "ncs_code_standard", "certificate_course_flag"}
