"""산업 이해 (research 5장 I01·I03). 개인 조건 필터를 적용하지 않는 맥락 자료."""
import pandas as pd

HIGH, EXPLORATORY = "HIGH_CONFIDENCE", "EXPLORATORY"


def size_latest(size: pd.DataFrame) -> pd.Series:
    return size.sort_values("reference_year").iloc[-1]


def size_trend(size: pd.DataFrame) -> pd.DataFrame:
    """연도별 업체·매출(억원)·종사자. 단위가 달라 한 축에 넣지 않는다."""
    return size.sort_values("reference_year")[["reference_year", "company_total", "revenue_total_100m_krw",
                                                "employees_total"]]


def make_use_split(row: pd.Series) -> pd.DataFrame:
    """제작/활용 구성(업체·매출·종사자 각각)."""
    return pd.DataFrame([
        ("업체", row["company_manufacturing"], row["company_utilization"]),
        ("매출", row["revenue_manufacturing_million_krw"], row["revenue_utilization_million_krw"]),
        ("종사자", row["employees_manufacturing"], row["employees_utilization"]),
    ], columns=["measure", "제작", "활용"])


def ntis_scope(topics: pd.DataFrame, include_exploratory: bool) -> pd.DataFrame:
    scopes = [HIGH, EXPLORATORY] if include_exploratory else [HIGH]
    return topics[topics["analysis_scope"].isin(scopes)]


def tech_counts(topics: pd.DataFrame) -> pd.DataFrame:
    """기술 태그별 고유 과제 수(다중 태그 → 합계가 과제 수보다 클 수 있음)."""
    t = topics[topics["topic_group"].eq("TECHNOLOGY")]
    return (t.groupby("topic_name")["project_id"].nunique().rename("n").reset_index()
            .sort_values(["n", "topic_name"], ascending=[False, True], ignore_index=True))


def tech_application_matrix(topics: pd.DataFrame) -> pd.DataFrame:
    """셀 = 두 태그를 함께 가진 고유 과제 수."""
    tech = topics[topics["topic_group"].eq("TECHNOLOGY")][["project_id", "topic_name"]].rename(columns={"topic_name": "tech"})
    app = topics[topics["topic_group"].eq("APPLICATION")][["project_id", "topic_name"]].rename(columns={"topic_name": "app"})
    both = tech.merge(app, on="project_id")
    return both.pivot_table(index="tech", columns="app", values="project_id", aggfunc="nunique", fill_value=0)


def defense_by_year(projects: pd.DataFrame, include_exploratory: bool, years: int = 12) -> pd.DataFrame:
    """연도별(대표 시작 연도) 방산 태그 과제 vs 그 외 과제 수 (요청 F2). 최근 years개 연도."""
    scopes = [HIGH, EXPLORATORY] if include_exploratory else [HIGH]
    p = projects[projects["analysis_scope"].isin(scopes)]
    out = (p.assign(defense=p["defense_flag"].eq(1))
           .groupby("representative_start_year")["defense"].agg(defense="sum", total="count").reset_index())
    out["other"] = out["total"] - out["defense"]
    return out.sort_values("representative_start_year").tail(years).reset_index(drop=True)


def defense_tech_counts(topics: pd.DataFrame, projects: pd.DataFrame) -> pd.DataFrame:
    """방산 태그 과제의 기술 태그별 고유 과제 수(다중 태그)."""
    ids = projects.loc[projects["defense_flag"].eq(1), "project_id"]
    return tech_counts(topics[topics["project_id"].isin(ids)])


def tech_counts_with_defense(topics: pd.DataFrame, projects: pd.DataFrame) -> pd.DataFrame:
    """기술 태그별 전체 과제 수 + 그중 방산 태그 과제 수 (요청 H1: 두 그래프 겹치기). 전체 수 순서."""
    out = tech_counts(topics).rename(columns={"n": "total"})
    dfn = defense_tech_counts(topics, projects[projects["project_id"].isin(topics["project_id"])]).set_index("topic_name")["n"]
    return out.assign(defense=out["topic_name"].map(dfn).fillna(0).astype(int))


def projects_for(projects: pd.DataFrame, topics: pd.DataFrame, tech: str | None = None,
                 app: str | None = None) -> pd.DataFrame:
    """연구 과제 탐색(요청 H6·H7): 범위 안 과제 → 기술 태그 → 활용 분야 태그(두 태그를 함께 가진 과제).
    최근 기준연도 → 정부 투자액 큰 순."""
    ids = set(topics["project_id"])
    for group, name in (("TECHNOLOGY", tech), ("APPLICATION", app)):
        if name:
            ids &= set(topics.loc[topics["topic_group"].eq(group) & topics["topic_name"].eq(name), "project_id"])
    rows = projects[projects["project_id"].isin(ids)]
    return rows.sort_values(["latest_reference_year", "government_funding_krw", "project_title"],
                            ascending=[False, False, True], ignore_index=True)[
        ["project_id", "project_title", "lead_institution", "representative_start_year", "latest_reference_year",
         "ministry", "government_funding_krw", "defense_flag"]]
