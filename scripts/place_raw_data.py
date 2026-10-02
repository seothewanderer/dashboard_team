"""P0: ../datas.zip에서 plan.md 3장 선별대로 data/raw·data/reference에 원본을 그대로 배치하고 해시로 검증한다.

실행: .venv\\Scripts\\python.exe scripts\\place_raw_data.py
"""
import hashlib
import io
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
ZIP_PATH = ROOT.parent / "datas.zip"
RAW = ROOT / "data" / "raw"
REFERENCE = ROOT / "data" / "reference"

# plan.md 3.2 — 앱이 읽는 원본 39개 (하위 폴더: 파일)
RAW_FILES = {
    "industry": ["Industry_Size_Annual_Trends.csv", "Public_Agency_Drone_Use_Cases.csv",
                 "Registered_Operator_Activities.csv", "Employment_Outlook.csv",
                 "Export_Competitiveness_Trade.csv", "Patent_Statistics_Ranking.csv"],
    "policy": ["2024_2026_Budget_By_Project.csv", "2027_Defense_Budget_Drone.csv"],
    "rnd": ["NTIS_National_RnD_Project_Master.csv", "NTIS_Project_Topic_Relations_Long.csv",
            "NTIS_Joint_Research_Relations.csv"],
    "procurement": ["DAPA_Drone_Contracts.csv", "PPS_Drone_Bids.csv"],
    "defense": ["Defense_Drone_Tech_Standard.csv", "Technology_Job_Mapping.csv",
                "Business_Area_Defense_Relations.csv", "Company_Defense_Evidence_Ledger.csv",
                "Defense_Cost_Certified_Companies.csv", "Swarm_Drone_Registered_Companies.csv"],
    "jobs": ["Drone_Job_Classification.csv", "Required_Skills_By_Job_Long.csv",
             "Workplace_Type_By_Job_Long.csv", "Company_Examples_By_Job_Long.csv",
             "Actual_Job_Posting_Evidence.csv"],
    "learning": ["selected_skill_learning_courses.csv", "Training_Course_drone.csv",
                 "Training_Course_Master_keywords.csv", "Training_Session_Analysis_drone.csv",
                 "Training_Session_Analysis_keywords.csv"],
    "certification": ["2024_Cumulative_Certifications.csv", "Annual_Certification_Issuance.csv",
                      "Pilot_Certifications_By_Period.csv", "Private_Certification_Status.csv"],
    "postings": ["Job_Posting_Analysis_Data.csv", "Job_Posting_Keyword_Frequency.csv"],
    "companies": ["Company_Organization_Master_Normalized.csv", "Drone_Company_Jobseeker_Database.csv",
                  "Company_Overview_Normalized.csv", "Company_Business_Area_Links_Verified.csv"],
}
# plan.md 3.3 — 검산 전용 4개
REFERENCE_FILES = ["Company_Count_By_Business_Area.csv", "Supply_Demand_By_Region.csv",
                   "Company_Defense_Evidence_Verified.csv", "Company_Master_Verified.csv"]
# plan.md 3.2 — DART 4묶음(내부 ZIP을 폴더로 해제)
DART_BUNDLES = ["02_product_service_data", "03_revenue_export_data",
                "05_research_personnel_data", "06_research_development_expense_data"]
DART_TABLE_COUNTS = {"02_product_service_data": 32, "03_revenue_export_data": 51,
                     "05_research_personnel_data": 7, "06_research_development_expense_data": 38}


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def write_verified(data: bytes, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    dest.write_bytes(data)
    assert sha256(dest.read_bytes()) == sha256(data), f"해시 불일치: {dest}"


def main() -> None:
    outer = zipfile.ZipFile(ZIP_PATH)
    read = lambda name: outer.read(f"datas/{name}")

    raw_count = 0
    for sub, files in RAW_FILES.items():
        for name in files:
            write_verified(read(name), RAW / sub / name)
            raw_count += 1
    for name in REFERENCE_FILES:
        write_verified(read(name), REFERENCE / name)

    for bundle in DART_BUNDLES:
        inner = zipfile.ZipFile(io.BytesIO(read(f"{bundle}.zip")))
        tables = 0
        for member in inner.namelist():
            if member.endswith("/"):
                continue
            write_verified(inner.read(member), RAW / "dart" / bundle / member)
            tables += member.startswith("tables/") and member.endswith(".csv")
        assert tables == DART_TABLE_COUNTS[bundle], f"{bundle}: 표 {tables}개"

    assert raw_count == 39
    print(f"raw {raw_count}개, reference {len(REFERENCE_FILES)}개, "
          f"DART {sum(DART_TABLE_COUNTS.values())}표·{len(DART_BUNDLES)}목록 배치 완료 (해시 일치)")


if __name__ == "__main__":
    main()
