"""기업·기관 탐색 집계 (research 3.2, 3.2.1, plan.md 9.6).

area_counts()는 01 I02와 기업 탐색 C01이 함께 쓴다 → 같은 조건이면 같은 값(plan 1.3-4).
집계 순서: 전체 필터 → 정렬 → 10개 묶음. 화면에 보이는 10개만 필터하지 않는다.
"""
from dataclasses import dataclass, field

import pandas as pd

from analytics.common import split_tags
from analytics.defense import DEFENSE_GROUPS, GROUP_ORDER, assign_groups

NO_AREA = "분야 미수록"


@dataclass
class CompanyFilters:
    area: list[str] = field(default_factory=list)            # 같은 분류 안 OR
    has_posting: bool = False
    keyword: str = ""


def company_frame(org: pd.DataFrame, org_area: pd.DataFrame, ledger: pd.DataFrame,
                  posting_bridge: pd.DataFrame) -> pd.DataFrame:
    """카드·필터에 쓰는 기업 한 행 = 한 조직(264)."""
    groups = assign_groups(org, ledger)
    linked = posting_bridge[posting_bridge["company_id"].notna() & posting_bridge["review_status"].ne("rejected")]
    areas = org_area.groupby("company_id")["business_category"].agg(sorted)
    df = org.merge(groups, on="company_id")
    df["areas"] = df["company_id"].map(areas).apply(lambda v: v if isinstance(v, list) else [])
    df["posting_count"] = df["company_id"].map(linked["company_id"].value_counts()).fillna(0).astype(int)
    df["has_posting"] = df["posting_count"] > 0
    return df.sort_values("company_name_normalized", ignore_index=True)


def area_long(companies: pd.DataFrame) -> pd.DataFrame:
    """(company_id, business_category). 분야가 없는 조직은 '분야 미수록'으로 남겨 누락시키지 않는다."""
    rows = companies[["company_id", "areas"]].explode("areas").rename(columns={"areas": "business_category"})
    return rows.fillna({"business_category": NO_AREA}).reset_index(drop=True)


def keyword_tier(companies: pd.DataFrame, keyword: str) -> pd.Series:
    """검색 일치도: 0=분야·세부 분야 태그 정확 일치, 1=이름·별칭·사업·제품 본문 포함, NaN=불일치."""
    kw = keyword.strip().casefold()
    tags = companies.apply(lambda r: {t.casefold() for t in r["areas"] + split_tags(r.get("drone_subfields"))
                                      + split_tags(r.get("drone_subfields"), "/")}, axis=1)
    text = companies[["company_name_normalized", "company_name_variants", "main_business_areas",
                      "products_services", "drone_subfields"]].fillna("").agg(" ".join, axis=1).str.casefold()
    tier = pd.Series(float("nan"), index=companies.index)
    tier[text.str.contains(kw, regex=False)] = 1
    tier[tags.apply(lambda s: kw in s)] = 0
    return tier


def filter_companies(companies: pd.DataFrame, f: CompanyFilters, exclude: str | None = None) -> pd.DataFrame:
    keep = pd.Series(True, index=companies.index)
    if f.area and exclude != "area":
        ids = area_long(companies).query("business_category in @f.area")["company_id"]
        keep &= companies["company_id"].isin(ids)
    if f.has_posting and exclude != "has_posting":
        keep &= companies["has_posting"]
    out = companies[keep]
    if f.keyword.strip() and exclude != "keyword":
        tier = keyword_tier(out, f.keyword)
        out = out[tier.notna()].assign(match_tier=tier[tier.notna()])
    return out


def area_counts(companies: pd.DataFrame, f: CompanyFilters) -> pd.DataFrame:
    """분야별 고유 조직 수 — 분야 자기 필터만 제외하고 나머지 조건 적용. 수 내림차순·분야명 순."""
    base = filter_companies(companies, f, exclude="area")
    long = area_long(companies)
    long = long[long["company_id"].isin(base["company_id"])]
    out = long.groupby("business_category")["company_id"].nunique().rename("n").reset_index()
    return out.sort_values(["n", "business_category"], ascending=[False, True], ignore_index=True)


def area_defense_counts(companies: pd.DataFrame, f: CompanyFilters) -> dict[str, int]:
    """분야별 방산 근거 기업·기관 수(직접확인·교차출처·인접 후보, 요청 H2). area_counts와 같은 필터 규칙."""
    base = filter_companies(companies, f, exclude="area")
    base = base[base["defense_group"].isin(DEFENSE_GROUPS)]
    long = area_long(companies)
    long = long[long["company_id"].isin(base["company_id"])]
    return long.groupby("business_category")["company_id"].nunique().to_dict()


BASES = {"companies": "전체 기업 수", "posted": "채용 기업 수", "postings": "채용 공고 수"}   # C01 기준(요청 U1·V3)


def area_basis_counts(companies: pd.DataFrame, f: CompanyFilters, basis: str = "companies") -> pd.DataFrame:
    """분야별 값과 그중 방산 근거 값(business_category, n, defense) — 분야 자기 필터만 제외(area_counts와 같은 규칙).
    basis: companies = 고유 기업·기관 수, posted = 그중 수집 공고가 연결된 기업 수, postings = 연결 공고 수 합(분야 간 중복)."""
    base = filter_companies(companies, f, exclude="area")
    long = area_long(companies).merge(base[["company_id", "posting_count", "has_posting", "defense_group"]], on="company_id")
    if basis == "posted":
        long = long[long["has_posting"]]
    w = long["posting_count"] if basis == "postings" else 1
    long = long.assign(w=w, d=long["defense_group"].isin(DEFENSE_GROUPS))
    out = long.assign(dw=long["w"].where(long["d"], 0)).groupby("business_category").agg(n=("w", "sum"), defense=("dw", "sum"))
    out = out[out["n"] > 0].astype(int).reset_index()
    return out.sort_values(["n", "business_category"], ascending=[False, True], ignore_index=True)


def area_cooccurrence(companies: pd.DataFrame, f: CompanyFilters, areas: list[str]) -> pd.DataFrame:
    """고른 분야 기업들이 함께 하는 다른 분야(요청 U2): (business_category, n, defense). 고른 분야 기업 중 그 분야도 하는 고유 기업 수.
    분야 외 조건은 적용, 고른 분야와 '분야 미수록'은 뺀다."""
    base = filter_companies(companies, CompanyFilters(area=areas, has_posting=f.has_posting, keyword=f.keyword))
    long = area_long(base)
    long = long[~long["business_category"].isin([*areas, NO_AREA])].merge(base[["company_id", "defense_group"]], on="company_id")
    long = long.assign(d=long["defense_group"].isin(DEFENSE_GROUPS))
    out = long.groupby("business_category").agg(n=("company_id", "nunique"),
                                                 defense=("company_id", lambda s: s[long.loc[s.index, "d"]].nunique()))
    return out.reset_index().sort_values(["n", "business_category"], ascending=[False, True], ignore_index=True)


def sort_companies(df: pd.DataFrame, f: CompanyFilters, mode: str = "auto") -> pd.DataFrame:
    """auto: 결과 안에서 방산 관련 우선(직접→교차→인접→미확인) → 키워드 일치도 → 이름. 분야·키워드를 고르지 않은
    전체일 때도 같다(요청 X2, 이전 research 3.2의 '미선택이면 이름순'을 바꿈). mode='name'이면 이름순."""
    if mode == "name":
        return df.sort_values("company_name_normalized", ignore_index=True)
    rank = df["defense_group"].map({g: i for i, g in enumerate(GROUP_ORDER)})
    tier = df["match_tier"] if "match_tier" in df else 0
    return (df.assign(_rank=rank, _tier=tier)
            .sort_values(["_rank", "_tier", "company_name_normalized"], ignore_index=True)
            .drop(columns=["_rank", "_tier"]))


def is_sorted_by_defense(f: CompanyFilters, mode: str) -> bool:
    return mode != "name"


def goal_reasons(companies: pd.DataFrame, job: pd.Series, application_bridge: pd.DataFrame) -> pd.Series:
    """목표 직무 관련 이유(요청 F5): 기업 사업 분야가 '분야 → 직무' 관계표에서 목표 직무와 연결된 경우."""
    areas = set(application_bridge.loc[application_bridge["job_id"].eq(job["job_id"])
                                       & application_bridge["review_status"].ne("rejected"), "application_id"])
    return companies["areas"].map(
        lambda a: ("사업 분야 " + ", ".join(sorted(set(a) & areas)[:2])) if set(a) & areas else None).astype(object)
