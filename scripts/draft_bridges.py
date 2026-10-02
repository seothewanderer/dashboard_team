"""P2: 관계표(브리지) 초안 생성 (plan.md 3.5, research 10.2).

모든 행은 review_status=draft 로 만든다. 사람이 검토하며 reviewed/rejected 로 바꾼다.
이미 있는 파일은 검토 내용을 지키기 위해 덮어쓰지 않는다(--overwrite 로만 재생성).

실행: .venv\\Scripts\\python.exe scripts\\draft_bridges.py [--overwrite]
"""
import re
import sys
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core.config import BRIDGES, CSV_ENCODING, RAW  # noqa: E402
from core.data_loader import read_table  # noqa: E402

DRAFT = "draft"

# 분야(사업 분야 18) → 직무 중분류. 명칭·업무 대응에 따른 초안 규칙(검토 대상).
AREA_TO_MIDDLE = {
    "감시.정찰.수색": ["조종·운항", "센서·임무장비", "재난·치안·해양·물류"],
    "인프라관리": ["측량·건설·시설점검", "조종·운항"],
    "특수촬영": ["촬영·콘텐츠·스포츠", "조종·운항"],
    "공간정보": ["측량·건설·시설점검", "플랫폼·데이터"],
    "물류·운송·구조": ["재난·치안·해양·물류", "조종·운항"],
    "방역/방제/살포": ["농림·환경", "조종·운항"],
    "임무장비": ["센서·임무장비"],
    "통합솔루션": ["기획·통합·사업", "플랫폼·데이터"],
    "취미·교육": ["교육·연구", "촬영·콘텐츠·스포츠"],
    "환경측량": ["농림·환경", "측량·건설·시설점검"],
    "다목적 H/W": ["기체개발", "제조·생산"],
    "모듈": ["항전·비행제어", "추진·에너지", "통신·관제장비"],
    "지상통제장비": ["통신·관제장비"],
    "드론스테이션": ["통신·관제장비", "플랫폼·데이터"],
    "앱": ["플랫폼·데이터", "자율비행·AI"],
    "방송·공연": ["촬영·콘텐츠·스포츠"],
    "안티드론": ["센서·임무장비", "통신·관제장비"],
    "기타": [],  # 분야 정의가 없어 연결하지 않음
}

# 직무 중분류(사전 18) → 공고 직무 분류(15). relation_type: direct / adjacent / broad
MIDDLE_TO_POSTING = {
    "교육·연구": [("연구개발", "adjacent"), ("PM/기획", "broad")],
    "정책·표준·산업지원": [("PM/기획", "broad")],
    "기체개발": [("기구/기계설계", "direct"), ("연구개발", "adjacent")],
    "제조·생산": [("생산/제조", "direct")],
    "자율비행·AI": [("비행제어/자율비행", "direct"), ("AI/컴퓨터비전", "direct"), ("SW개발", "adjacent")],
    "플랫폼·데이터": [("SW개발", "direct"), ("GIS/측량/공간정보", "adjacent")],
    "조종·운항": [("드론조종/운영", "direct")],
    "시험·정비": [("정비", "direct"), ("연구개발", "broad")],
    "안전·인증": [("PM/기획", "broad")],
    "기획·통합·사업": [("PM/기획", "direct"), ("영업/사업개발", "direct")],
    "추진·에너지": [("HW/전자", "adjacent"), ("기구/기계설계", "adjacent")],
    "항전·비행제어": [("HW/전자", "direct"), ("비행제어/자율비행", "direct"), ("임베디드/펌웨어", "adjacent")],
    "통신·관제장비": [("HW/전자", "direct"), ("임베디드/펌웨어", "adjacent")],
    "센서·임무장비": [("HW/전자", "direct"), ("AI/컴퓨터비전", "adjacent")],
    "촬영·콘텐츠·스포츠": [("영상/촬영", "direct"), ("드론조종/운영", "adjacent")],
    "농림·환경": [("드론조종/운영", "adjacent")],
    "측량·건설·시설점검": [("GIS/측량/공간정보", "direct"), ("드론조종/운영", "adjacent")],
    "재난·치안·해양·물류": [("드론조종/운영", "adjacent")],
}


def norm_name(name: str) -> str:
    """법인 표기·공백·대소문자만 제거한 비교용 이름."""
    name = re.sub(r"\(주\)|㈜|주식회사|\(유\)|유한회사", "", str(name))
    return re.sub(r"\s+", "", name).casefold()


def norm_skill(term: str) -> str:
    """대소문자·공백·하이픈·밑줄만 무시. C++ 와 C/C++, ROS 와 ROS2 는 다른 키로 남는다."""
    return re.sub(r"[\s\-_]+", "", str(term)).casefold()


def posting_company(org: pd.DataFrame, postings: pd.DataFrame) -> pd.DataFrame:
    exact = dict(zip(org.company_name_normalized, org.company_id))
    by_norm: dict[str, set] = {}
    for cid, main, variants in org[["company_id", "company_name_normalized", "company_name_variants"]].itertuples(index=False):
        for v in [main, *str(variants).split(";")]:
            if v.strip():
                by_norm.setdefault(norm_name(v), set()).add(cid)
    rows = []
    for p in postings.itertuples():
        cid, method, cands = exact.get(p.employer_name), "exact_name", []
        if cid is None:
            cands = sorted(by_norm.get(norm_name(p.employer_name), ()))
            method = "normalized_name_or_variant" if len(cands) == 1 else "ambiguous" if cands else "none"
            cid = cands[0] if len(cands) == 1 else None
        rows.append({"posting_id": p.posting_id, "employer_name": p.employer_name, "company_id": cid,
                     "company_name": org.set_index("company_id").company_name_normalized.get(cid),
                     "match_method": method, "candidates": ";".join(cands) if len(cands) > 1 else None,
                     "evidence_url": p.primary_source_url, "review_status": DRAFT, "review_note": None})
    return pd.DataFrame(rows)


def company_identity(org: pd.DataFrame) -> pd.DataFrame:
    lists = pd.concat([pd.read_csv(f, encoding=CSV_ENCODING) for f in sorted((RAW / "dart").glob("*/*_table_list.csv"))])
    src = lists[["company_id", "회사명", "보고서접수번호"]].drop_duplicates()
    names = dict(zip(org.company_id, org.company_name_normalized))
    rows = []
    for sid, sname, receipt in src.itertuples(index=False):
        if sid in names and norm_name(names[sid]) == norm_name(sname):
            cid, method, ev = sid, "id_and_name", f"마스터 {sid} 명칭 일치"
        else:
            hits = org.loc[org.company_name_normalized.map(norm_name) == norm_name(sname), "company_id"].tolist()
            cid = hits[0] if len(hits) == 1 else None
            method = "name_only_id_mismatch" if cid else "none"
            ev = f"DART 표 ID {sid}는 마스터에 없음, 명칭은 마스터 {cid}와 일치(research 10.3-2: 출처 제한 매핑)" if cid else "대응 없음"
        rows.append({"source_dataset": "dart_table_list", "source_id": sid, "source_name": sname,
                     "report_receipt_no": receipt, "company_id": cid, "match_method": method,
                     "evidence": ev, "review_status": DRAFT, "review_note": None})
    return pd.DataFrame(rows)


def application_job(jobs: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for area, middles in AREA_TO_MIDDLE.items():
        for j in jobs[jobs.middle_category.isin(middles)].itertuples():
            rows.append({"application_id": area, "job_id": j.job_id, "job_title_ko": j.job_title_ko,
                         "middle_category": j.middle_category,
                         "basis": f"분야 '{area}' ↔ 직무 중분류 '{j.middle_category}' 명칭·업무 대응(초안 규칙)",
                         "review_status": DRAFT, "review_note": None})
    return pd.DataFrame(rows)


def job_posting_category(jobs: pd.DataFrame) -> pd.DataFrame:
    rows = []
    for j in jobs.itertuples():
        for cat, rel in MIDDLE_TO_POSTING[j.middle_category]:
            rows.append({"job_id": j.job_id, "job_title_ko": j.job_title_ko, "middle_category": j.middle_category,
                         "job_major_category": cat, "relation_type": rel,
                         "rationale": f"사전 중분류 '{j.middle_category}' → 공고 분류 '{cat}' ({rel}, 초안 규칙)",
                         "review_status": DRAFT, "review_note": None})
    return pd.DataFrame(rows)


def skill_dictionary(job_skills: pd.DataFrame, kw: pd.DataFrame) -> pd.DataFrame:
    terms = pd.concat([
        job_skills.assign(term=job_skills.skill_keyword, source="job_skill")[["term", "source"]],
        kw.assign(term=kw.keyword_normalized, source="posting_keyword",
                  skill_type=kw.keyword_category_name)[["term", "source", "skill_type"]],
    ])
    terms["key"] = terms.term.map(norm_skill)
    freq = terms.groupby("term").size()
    rows = []
    for i, (key, g) in enumerate(sorted(terms.groupby("key"), key=lambda kv: kv[0]), start=1):
        forms = sorted(g.term.unique(), key=lambda t: (-freq[t], t))
        skill_type = g.skill_type.dropna().iloc[0] if g.skill_type.notna().any() else None
        for alias in forms:
            rows.append({"skill_id": f"SK{i:04d}", "canonical_name": forms[0], "alias": alias,
                         "skill_type": skill_type, "sources": ";".join(sorted(g[g.term == alias].source.unique())),
                         "match_method": "identity" if alias == forms[0] else "case_space_hyphen",
                         "review_status": DRAFT, "review_note": None})
    return pd.DataFrame(rows)


def main() -> None:
    overwrite = "--overwrite" in sys.argv
    org, jobs = read_table("org"), read_table("jobs")
    drafts = {
        "posting_company_bridge": lambda: posting_company(org, read_table("postings")),
        "company_identity_bridge": lambda: company_identity(org),
        "application_job_bridge": lambda: application_job(jobs),
        "job_posting_category_bridge": lambda: job_posting_category(jobs),
        "skill_dictionary": lambda: skill_dictionary(read_table("job_skills"), read_table("posting_kw_freq")),
    }
    BRIDGES.mkdir(parents=True, exist_ok=True)
    for name, make in drafts.items():
        path = BRIDGES / f"{name}.csv"
        if path.exists() and not overwrite:
            print(f"건너뜀(검토 내용 보호): {path.name}")
            continue
        df = make()
        df.to_csv(path, index=False, encoding=CSV_ENCODING)
        print(f"{path.name}: {len(df)}행")


if __name__ == "__main__":
    main()
