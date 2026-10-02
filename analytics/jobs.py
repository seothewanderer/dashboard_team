"""직무 탐색 (research 6장 J01·J05). 209개는 사전상 역할이며 현재 채용 직업 수가 아니다."""
import pandas as pd

from analytics.common import split_tags


def job_frame(jobs: pd.DataFrame, job_skills: pd.DataFrame, workplaces: pd.DataFrame,
              activity_by_middle: dict[str, list[str]]) -> pd.DataFrame:
    skills = job_skills.sort_values("skill_order").groupby("job_id")["skill_keyword"].agg(list)
    places = workplaces.sort_values("workplace_type_order").groupby("job_id")["workplace_type"].agg(list)
    df = jobs.copy()
    df["skills"] = df["job_id"].map(skills).apply(lambda v: v if isinstance(v, list) else [])
    df["workplaces"] = df["job_id"].map(places).apply(lambda v: v if isinstance(v, list) else [])
    df["activities"] = df["middle_category"].map(activity_by_middle).apply(lambda v: v or [])
    df["defense_workplace"] = df["workplaces"].apply(lambda w: DEFENSE_WORKPLACE in w)
    return df


# 방산 직무 표시(요청 F2): 근무처 유형 '방산기업'만. '소방·경찰·해경·군·교정·세관'은 군 외 기관이 섞여 제외
DEFENSE_WORKPLACE = "방산기업"


def filter_jobs(df: pd.DataFrame, major: list | None = None, middle: list | None = None,
                activities: list | None = None, evidence: list | None = None, text: str = "",
                job_ids: list | None = None) -> pd.DataFrame:
    keep = pd.Series(True, index=df.index)
    if major:
        keep &= df["major_category"].isin(major)
    if middle:
        keep &= df["middle_category"].isin(middle)
    if activities:
        keep &= df["activities"].apply(lambda a: bool(set(a) & set(activities)))
    if evidence:
        keep &= df["evidence_type"].isin(evidence)
    if job_ids:
        keep &= df["job_id"].isin(job_ids)
    if text.strip():
        t = text.strip().casefold()
        hay = (df["job_title_ko"] + " " + df["job_title_en"].fillna("") + " " + df["skills_raw"].fillna("")
               + " " + df["core_duties"].fillna("")).str.casefold()
        keep &= hay.str.contains(t, regex=False)
    return df[keep]


def tree(df: pd.DataFrame) -> list[dict]:
    """대분류 → 중분류 트리맵 데이터. 크기 = 사전 직무 수."""
    out = []
    for major, g in df.groupby("major_category"):
        children = [{"name": mid, "value": int(n)} for mid, n in g["middle_category"].value_counts().sort_index().items()]
        out.append({"name": major, "value": int(len(g)), "children": children})
    return sorted(out, key=lambda d: (-d["value"], d["name"]))


def synonym_groups(skill_dictionary: pd.DataFrame) -> dict[str, str]:
    """검토된(reviewed) 동의어만: 표기 → skill_id. 정확히 같은 표기는 검토 없이 같은 기술."""
    rv = skill_dictionary[skill_dictionary["review_status"].eq("reviewed")]
    return dict(zip(rv["alias"].str.casefold(), rv["skill_id"]))


def skill_overlap(job_df: pd.DataFrame, my_skills: list[str], synonyms: dict[str, str]) -> pd.DataFrame:
    """J05: 명시한 보유 기술과 사전 기술의 교집합. 정확 일치 → 검토 동의어. 점수·순위 없음."""
    def key(s: str) -> str:
        c = s.casefold()
        return synonyms.get(c, c)

    mine = {key(s) for s in my_skills}
    rows = []
    for r in job_df.itertuples():
        common = [s for s in r.skills if key(s) in mine]
        if common:
            rows.append({"job_id": r.job_id, "job_title_ko": r.job_title_ko, "middle_category": r.middle_category,
                         "common": common, "others": [s for s in r.skills if s not in common],
                         "n_common": len(common), "n_skills": len(r.skills)})
    cols = ["job_id", "job_title_ko", "middle_category", "common", "others", "n_common", "n_skills"]
    out = pd.DataFrame(rows, columns=cols)
    return out.sort_values(["n_common", "job_title_ko"], ascending=[False, True], ignore_index=True)


def workplaces_summary(row: pd.Series, n: int = 3) -> str:
    places = row["workplaces"] or split_tags(row.get("workplace_types_raw"))
    return " · ".join(places[:n]) + (f" 외 {len(places) - n}" if len(places) > n else "")
