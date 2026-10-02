"""홈 M03 오버뷰 (research 4.3). 각 분석 화면과 같은 테이블·같은 고유 ID 기준으로 계산하며,
서로 다른 자료의 수를 더하거나 같은 분모의 비율로 만들지 않는다."""
import pandas as pd

from analytics.industry import size_latest


def overview(t: dict[str, pd.DataFrame]) -> dict:
    latest = size_latest(t["industry_size"])
    return {
        "industry": {"year": int(latest["reference_year"]), "companies": int(latest["company_total"]),
                     "employees": int(latest["employees_total"]),
                     "revenue_100m": float(latest["revenue_total_100m_krw"])},
        "jobs": {"jobs": t["jobs"]["job_id"].nunique(), "relations": len(t["job_skills"])},
        "learning": {"courses": t["courses"]["course_id"].nunique(), "offerings": t["offerings"]["offering_id"].nunique()},
        "recruit": {"postings": t["postings"]["posting_id"].nunique(), "orgs": t["org"]["company_id"].nunique(),
                    "dart": int(t["org"]["has_dart"].sum())},
    }
