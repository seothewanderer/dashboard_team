"""기능이 살아 있는 단일 HTML 공유본 만들기 (plan.md 9.8, 요청 G1).

Streamlit 앱과 같은 데이터·같은 계산 규칙을 쓰되, 서버 없이 브라우저에서 동작하도록
  1) 파이썬 분석 함수(analytics/)로 화면 공용 프레임을 만들어 JSON 데이터 묶음으로 내보내고
  2) scripts/interactive/ 의 JavaScript 앱(app.js)·스타일(app.css)·ECharts·Pretendard를
  3) html/<버전명>.html 한 파일로 묶는다(인터넷 없이 열림).
화면 로직(필터·정렬·관련성 판단)은 app.js가 analytics/ 규칙을 그대로 옮겨 계산한다. 무거운 집계(NTIS 등)는 여기서 미리 계산.

실행: .venv\\Scripts\\python.exe scripts\\build_interactive.py v3_수정본_2026-10-01
"""
import base64
import json
import math
import sys
import warnings
from datetime import date
from pathlib import Path

warnings.filterwarnings("ignore")
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import numpy as np  # noqa: E402
import pandas as pd  # noqa: E402

from analytics import companies as C  # noqa: E402
from analytics import industry as I  # noqa: E402
from analytics import jobs as J  # noqa: E402
from analytics import job_layout  # noqa: E402
from analytics import learning as LN  # noqa: E402
from analytics import postings as P  # noqa: E402
from analytics.defense import GROUP_ORDER, TIER  # noqa: E402
from content.activity_tags import ACTIVITIES, ACTIVITY_BY_MIDDLE  # noqa: E402
from content.module_meta import MODULE_META, PAGE_DEFAULT  # noqa: E402
from content.page_intros import EYEBROW_SUFFIX, HOME_SUBTITLE, HOME_TITLE, PAGE_INTROS  # noqa: E402
from content.usage_guide import FAQ, STEPS  # noqa: E402
from core import theme  # noqa: E402
from core.data_loader import read_table  # noqa: E402

SRC = ROOT / "scripts" / "interactive"
OUT = ROOT / "html"
FONTS = {400: "Pretendard-Regular.otf", 700: "Pretendard-Bold.otf", 800: "Pretendard-ExtraBold.otf"}
GEO = ROOT / "data" / "reference" / "skorea_provinces_geo_simple.json"
REGION_SHORT = {"서울특별시": "서울", "부산광역시": "부산", "대구광역시": "대구", "인천광역시": "인천", "광주광역시": "광주",
                "대전광역시": "대전", "울산광역시": "울산", "세종특별자치시": "세종", "경기도": "경기", "강원도": "강원",
                "충청북도": "충북", "충청남도": "충남", "전라북도": "전북", "전라남도": "전남", "경상북도": "경북",
                "경상남도": "경남", "제주특별자치도": "제주"}


def clean(v):
    """JSON으로 보낼 값: NaN·NaT → None, numpy 값 → 파이썬 값, 날짜 → 'YYYY-MM-DD'."""
    if isinstance(v, (list, tuple, np.ndarray)):
        return [clean(x) for x in v]
    if v is None or v is pd.NaT or v is pd.NA:
        return None
    if isinstance(v, (pd.Timestamp, date)):
        return v.strftime("%Y-%m-%d")
    if isinstance(v, np.generic):
        v = v.item()
    if isinstance(v, float) and math.isnan(v):
        return None
    return v


def rows(df: pd.DataFrame, cols: list[str]) -> list[list]:
    """표를 [열 이름, 행...] 형태(열 이름은 한 번만)로 줄여 파일 크기를 줄인다."""
    return [cols] + [[clean(v) for v in r] for r in df[cols].itertuples(index=False, name=None)]


def ntis(projects: pd.DataFrame, topics_all: pd.DataFrame, wide: bool, index: dict) -> dict:
    """범위별 국가 R&D 집계(요청 H1·H7): 기술 겹침 막대, 연도별, 기술×활용 행렬, 과제 탐색용 태그 → 과제 번호."""
    topics = I.ntis_scope(topics_all, wide)
    tc = I.tech_counts_with_defense(topics, projects)
    m = I.tech_application_matrix(topics)
    by_year = I.defense_by_year(projects, wide)
    tagged = topics.assign(i=topics["project_id"].map(index)).dropna(subset=["i"])
    ids = {g: {name: sorted(int(x) for x in set(s)) for name, s in d.groupby("topic_name")["i"]}
           for g, d in tagged.groupby("topic_group")}
    return {"n_projects": int(topics["project_id"].nunique()), "tech": rows(tc, ["topic_name", "total", "defense"]),
            "matrix": {"index": list(m.index), "columns": list(m.columns), "values": m.values.tolist()},
            "by_year": rows(by_year, ["representative_start_year", "defense", "other", "total"]),
            "all_ids": sorted(int(x) for x in set(tagged["i"])),
            "tech_ids": ids.get("TECHNOLOGY", {}), "app_ids": ids.get("APPLICATION", {})}


def bundle() -> dict:
    t = {n: read_table(n) for n in ["org", "org_area", "defense_evidence", "bridge_posting_company_bridge", "postings",
                                    "jobs", "job_skills", "job_workplaces", "job_employer_examples", "job_posting_examples",
                                    "bridge_skill_dictionary", "bridge_job_posting_category_bridge",
                                    "bridge_application_job_bridge", "posting_kw_freq", "industry_size", "courses",
                                    "offerings", "skill_resources", "business_area_defense", "ntis_projects", "ntis_topics"]}
    comp = C.company_frame(t["org"], t["org_area"], t["defense_evidence"], t["bridge_posting_company_bridge"])
    pf = P.posting_frame(t["postings"], t["bridge_posting_company_bridge"], comp)
    jf = J.job_frame(t["jobs"], t["job_skills"], t["job_workplaces"], ACTIVITY_BY_MIDDLE)
    size = t["industry_size"].sort_values("reference_year")
    # 연구 과제 탐색 정렬(최근 기준연도 → 정부 투자액 → 제목)을 미리 해 두고, 범위별 태그는 이 순서의 번호로 보낸다
    plist = I.projects_for(t["ntis_projects"], I.ntis_scope(t["ntis_topics"], True))
    index = {pid: i for i, pid in enumerate(plist["project_id"])}
    geo = json.loads(GEO.read_text(encoding="utf-8"))
    for f in geo["features"]:
        f["properties"] = {"name": REGION_SHORT[f["properties"]["name"]]}
    return {
        "generated": str(date.today()),
        "theme": {"base": theme.BASE, "modes": theme.MODE, "unscaled": theme.UNSCALED, "images": theme._image_vars() | {f"--kpi-{n}-{s}": theme.img_uri(f"kpi_{n}_{s}") for n in
                                                       ("company", "revenue", "employee", "posting", "shield") for s in ("rest", "hover")},
                  "chart": theme.CHART, "motion": theme.MOTION, "type": {k: list(v) for k, v in theme.TYPE.items()},
                  "font_scale": theme.FONT_SCALE},
        "content": {"intros": PAGE_INTROS, "eyebrow_suffix": EYEBROW_SUFFIX, "home_title": HOME_TITLE,
                    "home_subtitle": HOME_SUBTITLE, "steps": STEPS, "faq": FAQ, "page_default": PAGE_DEFAULT,
                    "meta": MODULE_META, "activities": ACTIVITIES, "activity_by_middle": ACTIVITY_BY_MIDDLE},
        "defense": {"group_order": GROUP_ORDER, "tier": TIER},
        "companies": rows(comp, ["company_id", "company_name_normalized", "company_name_variants", "main_business_areas",
                                 "products_services", "drone_subfields", "areas", "defense_group", "drone_evidence_missing",
                                 "posting_count", "has_posting", "has_profile", "has_dart", "dart_intro_excerpt",
                                 "dart_report_name", "track_record", "reference_date", "source_checked_date", "homepage"]),
        "ledger": rows(t["defense_evidence"], ["company_id", "evidence_type", "evidence_strength", "evidence_detail",
                                               "as_of_date", "caveat"]),
        "postings": rows(pf, ["posting_id", "title", "employer_name", "job_major_category", "province_name", "district_name",
                              "career_type", "education_normalized", "employment_types", "career_requirement_raw",
                              "education_raw", "salary_raw", "responsibilities", "verification_note", "primary_source_url",
                              "original_location", "company_id", "link_status", "defense_group"]),
        "jobs": rows(jf, ["job_id", "major_category", "middle_category", "job_title_ko", "job_title_en", "core_duties",
                          "skills", "workplaces", "activities", "evidence_type", "preferred_qualifications",
                          "primary_source_name", "collected_date", "defense_workplace", "skills_raw"]),
        "job_examples": rows(t["job_employer_examples"].sort_values(["job_id", "employer_example_order"]),
                             ["job_id", "employer_example"]),
        "job_postings": rows(t["job_posting_examples"], ["job_id", "actual_employer", "actual_posting_title",
                                                         "actual_posting_url", "salary_original_text"]),
        "job_skill_counts": t["job_skills"]["skill_keyword"].value_counts().to_dict(),
        "synonyms": J.synonym_groups(t["bridge_skill_dictionary"]),
        "category_bridge": rows(t["bridge_job_posting_category_bridge"], ["job_id", "job_major_category", "relation_type",
                                                                          "review_status"]),
        "application_bridge": rows(t["bridge_application_job_bridge"], ["application_id", "job_id", "review_status"]),
        "business_area_defense": rows(t["business_area_defense"], ["business_category", "defense_use_case_relation",
                                                                   "relation_rationale", "usage_note"]),
        "posting_kw": rows(t["posting_kw_freq"], ["keyword_category_name", "keyword_normalized", "posting_count",
                                                  "posting_share_pct"]),
        "industry_size": rows(size, ["reference_year", "company_total", "company_manufacturing", "company_utilization",
                                     "revenue_total_100m_krw", "employees_total", "employees_manufacturing",
                                     "employees_utilization"]),
        "courses": rows(t["courses"], ["course_id", "course_name", "institution_name", "ncs_name", "search_keywords",
                                       "total_training_hours", "remote_mode", "source_group"]),
        "net3d": dict(zip(("nodes", "links"), job_layout.layout(jf))),   # 02 3D 네트워크 배치(앱과 같은 계산, 요청 M)
        "offerings": rows(t["offerings"], ["offering_id", "course_id", "session_no", "province_std", "remote_mode",
                                           "start_date", "end_date", "course_url"]),
        "resources": rows(t["skill_resources"], ["job_id", "selected_skill", "course_id", "is_work24", "relevance_type",
                                                 "why_learn", "prerequisite", "course_name", "provider", "learning_type",
                                                 "url", "resource_key", "verified_date"]),
        "ntis": {"high": ntis(t["ntis_projects"], t["ntis_topics"], False, index),
                 "wide": ntis(t["ntis_projects"], t["ntis_topics"], True, index)},
        "projects": rows(plist, ["project_title", "lead_institution", "representative_start_year", "latest_reference_year",
                                 "ministry", "defense_flag"]),
        "area_defense": C.area_defense_counts(comp, C.CompanyFilters()),
        "recruit_kw": rows(LN.recruit_keyword_counts(t["posting_kw_freq"], t["courses"]), ["keyword", "posting_count", "n"]),
        "empty_keywords": list(LN.EMPTY_KEYWORDS),
        "overview": {"org": int(t["org"]["company_id"].nunique()), "dart": int(t["org"]["has_dart"].sum()),
                     "relations": len(t["job_skills"]), "offerings": int(t["offerings"]["offering_id"].nunique())},
        "geo": geo,
    }


def font_faces() -> str:
    out = []
    for weight, file in FONTS.items():
        data = base64.b64encode((ROOT / "design" / file).read_bytes()).decode("ascii")
        out.append(f'@font-face{{font-family:"Pretendard";src:url(data:font/otf;base64,{data}) format("opentype");'
                   f"font-weight:{weight};font-style:normal;font-display:swap}}")
    return "\n".join(out)


# 앱 부품의 JS·CSS를 그대로 가져와 공유본에서도 같은 동작(요청: 02 3D 네트워크·04 지도+막대). 파이썬 import 없이 글로 읽는다
COMPONENTS = {"G3": ROOT / "components" / "job_graph3d.py", "LCM": ROOT / "components" / "linked_chart_map.py"}


def _component(path: Path) -> tuple[str, str]:
    src = path.read_text(encoding="utf-8")
    css = src.split('_CSS = """', 1)[1].split('"""', 1)[0]
    js = src.split('_JS = """', 1)[1].split('\n"""', 1)[0]
    return css, js.replace("export default function(component)", "return function(component)")


def build(version: str) -> Path:
    data = json.dumps(bundle(), ensure_ascii=False, separators=(",", ":"), default=clean).replace("</", "<\\/")
    page = (SRC / "template.html").read_text(encoding="utf-8")
    parts = {"__TITLE__": f"드론 진로 탐색 — {version.replace('_', ' ')}", "/*__FONTS__*/": font_faces(),
             "/*__CSS__*/": (SRC / "app.css").read_text(encoding="utf-8"),
             "/*__ECHARTS__*/": (SRC / "vendor" / "echarts.min.js").read_text(encoding="utf-8"),
             "/*__COMP_CSS__*/": "\n".join(_component(f)[0] for f in COMPONENTS.values()),
             "/*__APP__*/": "\n".join([*(f"const {name} = (() => {{{_component(f)[1]}}})();" for name, f in COMPONENTS.items()),
                                      *((SRC / f).read_text(encoding="utf-8")
                                        for f in ["core.js", "logic.js", "charts.js", "ui.js", "pages.js", "main.js"])]),
             "__DATA__": data, "__VERSION__": version}
    for k, v in parts.items():
        page = page.replace(k, v)
    OUT.mkdir(exist_ok=True)
    path = OUT / f"{version}.html"
    path.write_text(page, encoding="utf-8")
    return path


if __name__ == "__main__":
    out = build(sys.argv[1] if len(sys.argv) > 1 else f"v3_수정본_{date.today()}")
    print(f"저장: {out} ({out.stat().st_size / 1_048_576:.1f}MB)")
