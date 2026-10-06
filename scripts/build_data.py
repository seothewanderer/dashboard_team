"""P1: data/raw → data/processed/*.parquet (plan.md 6장).

1. 원본 CSV를 읽어 결측 감사(core/quality.py) → 50% 이상 컬럼 제외
2. plan.md 6.2 테이블로 변환(한글 컬럼은 영문 이름으로 정규화 — 로컬 DB 전환 대비, plan 6.1)
3. 계약 검사(plan 6.5) 실패 시 중단
4. parquet + quality_audit + reports/data_audit.md 저장

실행: .venv\\Scripts\\python.exe scripts\\build_data.py [--source db|csv]
  db  = data/raw_db (scripts/pull_db.py가 DB에서 끌어와 저장한 원본, 기본값 core.config.DATA_SOURCE)
        raw_db에 없는 파일은 원본 CSV(data/raw)로 읽고 끝에 목록을 알려 준다
  csv = data/raw (원본 CSV, DB 연동 전과 같음)
"""
import argparse
import json
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import quality  # noqa: E402
from core.config import BRIDGES, CONTENT, CSV_ENCODING, DATA_SOURCE, PROCESSED, RAW, RAW_DB, REPORTS  # noqa: E402

REVIEW_STATUSES = {"draft", "reviewed", "rejected"}

MANIFEST = "_manifest.json"

PROFILE_COLUMNS = {
    "기업ID": "company_id", "기업명": "company_name", "원본_기업명": "name_raw",
    "원본_기업목록_행수": "source_list_rows", "주요_사업_분야": "main_business_areas",
    "제품_서비스": "products_services", "드론_세부_분야": "drone_subfields", "채용_직무": "hiring_jobs",
    "담당_업무": "duties", "신입_경력_구분": "career_type", "근무_지역": "work_region",
    "사업장_주소": "address", "출퇴근_정보": "commute_info", "원격근무_가능여부": "remote_available",
    "요구_경력": "required_career", "요구_학력": "required_education", "관련_전공": "related_major",
    "요구_자격증": "required_certificates", "필수_기술": "required_skills", "현재_채용_여부": "hiring_status",
    "현재_채용공고_수": "open_posting_count", "채용공고_제목": "posting_title",
    "채용_마감일": "posting_deadline", "채용공고_원문_링크": "posting_url",
    "최소_연봉_만원": "salary_min_10k_krw", "최대_연봉_만원": "salary_max_10k_krw", "급여_원문": "salary_raw",
    "고용_형태": "employment_type", "수습기간": "probation", "기업_규모": "company_size",
    "직원_수": "employee_count", "설립일_설립연도": "founded", "매출액": "revenue_raw",
    "최근_성장_여부": "recent_growth", "근무시간": "work_hours", "유연근무제": "flexible_work",
    "교육비_자격증_지원": "training_support", "기숙사_식사_교통_지원": "living_support",
    "조직문화_복지제도": "culture_welfare", "보유_기술": "technologies", "개발_드론_시스템": "drone_systems",
    "주요_사업_연구_납품_실적": "track_record", "방산_계약_건수": "dapa_contract_count",
    "방산_계약금액_원": "dapa_contract_amount_krw", "공공조달_낙찰_건수": "pps_award_count",
    "NTIS_RnD_과제_건수": "ntis_project_count", "특허_인증": "patents_certifications",
    "공식_홈페이지": "homepage", "드론정보포털_수록여부": "in_drone_portal",
    "공공기관_등록_연결현황": "public_registry_links", "방산_연계_구분": "defense_link_class",
    "방산_연계_근거": "defense_link_evidence", "사업정보_출처명": "business_source_name",
    "사업정보_출처링크": "business_source_url", "채용정보_출처명": "hiring_source_name",
    "채용정보_출처링크": "hiring_source_url", "기업정보_출처명": "company_source_name",
    "기업정보_출처링크": "company_source_url", "프로젝트_출처명": "project_source_name",
    "프로젝트_출처링크": "project_source_url", "출처_확인일": "source_checked_date",
    "데이터_기준일": "reference_date", "항목별_출처_JSON": "field_sources_json",
    "공개정보_미확인_항목": "unverified_fields", "공개정보_확인율_퍼센트": "verified_share_pct",
}
OVERVIEW_COLUMNS = {
    "회사명": "company_name", "기업소개_원문발췌": "intro_excerpt", "주소": "address", "대표전화": "phone",
    "홈페이지": "homepage", "보고서접수번호": "report_receipt_no", "보고서명": "report_name",
    "사업개요_DART쪽": "business_overview", "추출범위": "extract_scope",
}
COST_CERT_COLUMNS = {
    "신규 인증일": "certified_date", "1차 갱신일": "renewal_1_date", "2차 갱신일": "renewal_2_date",
    "3차 갱신일": "renewal_3_date", "4차 갱신일": "renewal_4_date", "5차 갱신일": "renewal_5_date",
    "유효기간 시작일": "valid_from", "유효기간 종료일": "valid_to",
}

PROVINCE_ALIASES = {"경기도": "경기"}

# 산출 테이블명: 원본 파일 (1:1로 결측 감사만 적용하는 표)
PASS_THROUGH = {
    "defense_evidence": "defense/Company_Defense_Evidence_Ledger.csv",
    "business_area_defense": "defense/Business_Area_Defense_Relations.csv",
    "swarm_registry": "defense/Swarm_Drone_Registered_Companies.csv",
    "jobs": "jobs/Drone_Job_Classification.csv",
    "job_skills": "jobs/Required_Skills_By_Job_Long.csv",
    "job_workplaces": "jobs/Workplace_Type_By_Job_Long.csv",
    "job_employer_examples": "jobs/Company_Examples_By_Job_Long.csv",
    "job_posting_examples": "jobs/Actual_Job_Posting_Evidence.csv",
    "posting_kw_freq": "postings/Job_Posting_Keyword_Frequency.csv",
    "industry_size": "industry/Industry_Size_Annual_Trends.csv",
    "public_use_cases": "industry/Public_Agency_Drone_Use_Cases.csv",
    "operators": "industry/Registered_Operator_Activities.csv",
    "outlook": "industry/Employment_Outlook.csv",
    "export": "industry/Export_Competitiveness_Trade.csv",
    "patents": "industry/Patent_Statistics_Ranking.csv",
    "budget": "policy/2024_2026_Budget_By_Project.csv",
    "budget_2027": "policy/2027_Defense_Budget_Drone.csv",
    "ntis_projects": "rnd/NTIS_National_RnD_Project_Master.csv",
    "ntis_topics": "rnd/NTIS_Project_Topic_Relations_Long.csv",
    "ntis_collab": "rnd/NTIS_Joint_Research_Relations.csv",
    "dapa": "procurement/DAPA_Drone_Contracts.csv",
    "pps": "procurement/PPS_Drone_Bids.csv",
    "certs_cumulative": "certification/2024_Cumulative_Certifications.csv",
    "certs_annual": "certification/Annual_Certification_Issuance.csv",
    "certs_period": "certification/Pilot_Certifications_By_Period.csv",
    "certs_private": "certification/Private_Certification_Status.csv",
}


class Builder:
    def __init__(self, source: str = "csv"):
        self.audits: list[pd.DataFrame] = []
        self.source = source
        self.csv_fallback: set[str] = set()   # source=db인데 raw_db에 없어 원본 CSV로 읽은 파일

    def read(self, rel: str) -> pd.DataFrame:
        path = RAW_DB / rel if self.source == "db" else RAW / rel
        if not path.exists() and self.source == "db":
            self.csv_fallback.add(rel)
            path = RAW / rel
        return pd.read_csv(path, encoding=CSV_ENCODING, low_memory=False)

    def clean(self, rel: str, *, also_drop: set[str] = frozenset()) -> pd.DataFrame:
        """감사 기록 후 제외 컬럼 제거. also_drop: union 상대 파일에서 제외된 컬럼(양쪽 통일)."""
        df = self.read(rel)
        report = quality.audit(df, rel)
        drop = set(report.loc[report.status == "exclude", "column"]) | (also_drop & set(df.columns))
        report.loc[report.column.isin(drop) & (report.status != "exclude"), "status"] = "exclude_union"
        self.audits.append(report)
        return quality.to_missing(df.drop(columns=sorted(drop)))

    def clean_union(self, rels: list[str]) -> list[pd.DataFrame]:
        """union할 파일들은 어느 한쪽에서 제외된 컬럼을 모두에서 제외한다(plan 6.3)."""
        excluded = set()
        for rel in rels:
            r = quality.audit(self.read(rel), rel)
            excluded |= set(r.loc[r.status == "exclude", "column"])
        return [self.clean(rel, also_drop=excluded) for rel in rels]

    def build(self) -> dict[str, pd.DataFrame]:
        t = {name: self.clean(rel) for name, rel in PASS_THROUGH.items()}

        # org: 조직 마스터 264 기준 + 프로필 239 + DART 개요 22 (plan 6.2)
        master = self.clean("companies/Company_Organization_Master_Normalized.csv")
        profile = self.clean("companies/Drone_Company_Jobseeker_Database.csv").rename(columns=PROFILE_COLUMNS)
        overview = self.clean("companies/Company_Overview_Normalized.csv").rename(columns=OVERVIEW_COLUMNS)
        org = master.merge(profile, on="company_id", how="left", indicator="_p")
        org["has_profile"] = org.pop("_p").eq("both")
        dart = overview.set_index("company_id").add_prefix("dart_").reset_index()
        org = org.merge(dart, on="company_id", how="left")
        org["has_dart"] = org["company_id"].isin(overview["company_id"])
        t["org"] = org

        # org_area: 마스터에 있는 ID만, (기업, 분야) 중복 제거
        area = self.clean("companies/Company_Business_Area_Links_Verified.csv")
        area = area[area["company_id"].isin(master["company_id"])]
        t["org_area"] = area.drop_duplicates(["company_id", "business_category"]).reset_index(drop=True)

        t["defense_evidence"]["in_master"] = t["defense_evidence"]["company_id"].isin(master["company_id"])
        t["defense_tech"] = self.clean("defense/Defense_Drone_Tech_Standard.csv").merge(
            self.clean("defense/Technology_Job_Mapping.csv"), on="technology_id", how="left")
        t["defense_cost_cert"] = self.clean("defense/Defense_Cost_Certified_Companies.csv").rename(
            columns=COST_CERT_COLUMNS)

        # 학습 연결: 고용24(정부사이트) vs 외부 공식 자료 구분, 행 단위 키
        res = self.clean("learning/selected_skill_learning_courses.csv")
        res["is_work24"] = res["source_type"].eq("정부사이트")
        res["resource_key"] = res["source_type"] + ":" + res["course_id"].astype(str).where(
            res["is_work24"], res["url"])
        t["skill_resources"] = res

        # 과정·회차: 드론/키워드 두 출처 union
        c_drone, c_kw = self.clean_union(["learning/Training_Course_drone.csv",
                                          "learning/Training_Course_Master_keywords.csv"])
        t["courses"] = pd.concat([c_drone.assign(source_group="drone"), c_kw.assign(source_group="keyword")],
                                 ignore_index=True)
        o_drone, o_kw = self.clean_union(["learning/Training_Session_Analysis_drone.csv",
                                          "learning/Training_Session_Analysis_keywords.csv"])
        offerings = pd.concat([o_drone.assign(source_group="drone"), o_kw.assign(source_group="keyword")],
                              ignore_index=True)
        for col in ("start_date", "end_date"):
            offerings[col] = pd.to_datetime(offerings[col], errors="raise")
        # 시도 표준명: 원본 표기 차이만 통일. '전남광주'는 광주·전남 중 어느 쪽인지 근거가 없어 그대로 둔다
        offerings["province_std"] = offerings["province_name"].replace(PROVINCE_ALIASES)
        t["offerings"] = offerings  # date_status는 화면에서 오늘 기준으로 계산(plan 6.2)

        postings = self.clean("postings/Job_Posting_Analysis_Data.csv")
        postings["employment_types"] = postings["employment_types"].str.split(", ")
        t["postings"] = postings

        # 관계표: 사람이 검토하는 CSV(data/bridges). 결측 감사 대상 아님(검토 메모 등 빈 칸이 정상)
        for path in sorted(BRIDGES.glob("*.csv")):
            t[f"bridge_{path.stem}"] = pd.read_csv(path, encoding=CSV_ENCODING)
        # 수집 검색어 되살리기(요청 J2-1): 전처리에서 '드론' 하나로 합쳐진 검색어를 수집 원본 관계표로 다시 채움
        kw = t["bridge_course_search_keywords"].astype({"course_id": str})
        joined = kw.groupby("course_id")["search_keyword"].agg(lambda s: "|".join(sorted(set(s))))
        t["courses"]["search_keywords"] = t["courses"]["course_id"].astype(str).map(joined).fillna(
            t["courses"]["search_keywords"])
        # 편집 콘텐츠(data/content): 원본 자료가 아닌 편집 제안. 화면에 '편집 제안'으로 표시
        for path in sorted(CONTENT.glob("*.csv")):
            t[f"content_{path.stem}"] = pd.read_csv(path, encoding=CSV_ENCODING)
        return t

    def audit_table(self) -> pd.DataFrame:
        return pd.concat(self.audits, ignore_index=True).drop_duplicates(["source", "column"])


def check_contracts(t: dict[str, pd.DataFrame]) -> list[str]:
    """plan.md 6.5 계약 검사. 실패 항목 목록을 돌려준다(빈 목록 = 통과)."""
    fails = []

    def expect(ok: bool, msg: str):
        if not ok:
            fails.append(msg)

    rows = {"jobs": 209, "job_skills": 645, "skill_resources": 915, "courses": 438, "offerings": 2395,
            "postings": 135, "org": 264, "ntis_projects": 8078, "defense_evidence": 106}
    for name, n in rows.items():
        expect(len(t[name]) == n, f"{name} 행 수 {len(t[name])} ≠ {n}")
    expect(int(t["org"]["has_profile"].sum()) == 239, "프로필 239개가 마스터에 모두 연결되지 않음")
    expect(int(t["org"]["has_dart"].sum()) == 22, "DART 개요 22개가 마스터에 모두 연결되지 않음")
    expect(int(t["ntis_projects"]["analysis_scope"].eq("HIGH_CONFIDENCE").sum()) == 2936, "NTIS 고신뢰 ≠ 2,936")
    for name, key in [("jobs", "job_id"), ("courses", "course_id"), ("offerings", "offering_id"),
                      ("postings", "posting_id"), ("org", "company_id"), ("defense_evidence", "evidence_id")]:
        expect(t[name][key].is_unique, f"{name}.{key} 중복")
    expect(t["offerings"]["course_id"].isin(t["courses"]["course_id"]).all(), "회차의 course_id가 과정에 없음")
    w24 = t["skill_resources"][t["skill_resources"]["is_work24"]]
    expect(len(w24) == 645, f"고용24 학습 연결 {len(w24)} ≠ 645")
    expect(w24["offering_id"].isin(t["offerings"]["offering_id"]).all(), "고용24 학습 연결의 offering_id가 회차에 없음")
    expect(t["org_area"]["company_id"].isin(t["org"]["company_id"]).all(), "사업 분야 ID가 마스터에 없음")
    expect(t["org_area"]["company_id"].nunique() == 239, "사업 분야 기업 수 ≠ 239")
    expect(t["org_area"]["business_category"].nunique() == 18, "사업 분야 수 ≠ 18")
    expect(int((~t["defense_evidence"]["in_master"]).sum()) == 36, "원장 미연결 ≠ 36")
    for name, key in [("job_skills", "job_id"), ("job_workplaces", "job_id"),
                      ("job_employer_examples", "job_id"), ("job_posting_examples", "job_id")]:
        expect(t[name][key].isin(t["jobs"]["job_id"]).all(), f"{name}.{key}가 직무 사전에 없음")

    # 관계표(있는 것만): 검토 상태 값, 참조 무결성, 공고당 확정 기업 1개 이하
    bridges = {k: v for k, v in t.items() if k.startswith("bridge_")}
    for name, df in bridges.items():
        bad = set(df["review_status"].dropna()) - REVIEW_STATUSES
        expect(not bad and df["review_status"].notna().all(), f"{name}.review_status 허용값 아님: {bad}")
    refs = {"company_id": set(t["org"]["company_id"]), "job_id": set(t["jobs"]["job_id"]),
            "posting_id": set(t["postings"]["posting_id"])}
    for name, df in bridges.items():
        for col, valid in refs.items():
            if col in df:
                unknown = set(df[col].dropna()) - valid
                expect(not unknown, f"{name}.{col} 참조 없음: {sorted(unknown)[:5]}")
    if "bridge_posting_company_bridge" in t:
        expect(t["bridge_posting_company_bridge"]["posting_id"].is_unique, "공고–기업 연결: 공고당 1행이어야 함")
    return fails


def write_audit_report(audit: pd.DataFrame, path: Path) -> None:
    lines = ["# data_audit.md — 결측 감사 결과", "",
             f"- 생성: {datetime.now():%Y-%m-%d %H:%M} (`scripts/build_data.py`)",
             "- 규칙: 결측 50% 이상 제외 / 30~50% 주의(표본 n 표기) / 채우지 않음 (plan.md 6.3)",
             f"- 결측으로 세는 표시 문자열: {', '.join(sorted(quality.MISSING_TOKENS))}",
             "- `exclude_union`: 자기 파일은 50% 미만이지만 union 상대 파일에서 제외되어 함께 제외", ""]
    for title, statuses in [("제외", ("exclude", "exclude_union")), ("주의", ("caution",))]:
        part = audit[audit.status.isin(statuses)]
        lines += [f"## {title} ({len(part)}개 컬럼)", "", "| 원본 파일 | 컬럼 | 결측 | 결측률 | 판정 |", "|---|---|---|---|---|"]
        lines += [f"| `{r.source}` | `{r.column}` | {r.missing}/{r.rows} | {r.missing_rate:.0%} | {r.status} |"
                  for r in part.itertuples()]
        lines.append("")
    path.write_text("\n".join(lines), encoding="utf-8")


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--source", choices=["db", "csv"], default=DATA_SOURCE)
    builder = Builder(ap.parse_args().source)
    tables = builder.build()
    fails = check_contracts(tables)
    if fails:
        sys.exit("계약 검사 실패 — 빌드 중단:\n- " + "\n- ".join(fails))

    PROCESSED.mkdir(parents=True, exist_ok=True)
    REPORTS.mkdir(parents=True, exist_ok=True)
    audit = builder.audit_table()
    tables["quality_audit"] = audit
    for name, df in tables.items():
        df.to_parquet(PROCESSED / f"{name}.parquet", index=False)
    write_audit_report(audit, REPORTS / "data_audit.md")
    (PROCESSED / MANIFEST).write_text(json.dumps(
        {"built_at": datetime.now().isoformat(timespec="seconds"), "source": builder.source,
         "csv_fallback": sorted(builder.csv_fallback), "tables": {n: len(df) for n, df in tables.items()}}, ensure_ascii=False, indent=2), encoding="utf-8")
    excluded = audit.status.str.startswith("exclude").sum()
    print(f"원본: {builder.source} · 테이블 {len(tables)}개 저장, 계약 검사 통과, 제외 컬럼 {excluded}개 / 주의 {(audit.status == 'caution').sum()}개")
    if builder.csv_fallback:
        print(f"DB 저장본에 없어 원본 CSV로 읽은 파일 {len(builder.csv_fallback)}개: " + ", ".join(sorted(builder.csv_fallback)))


if __name__ == "__main__":
    main()
