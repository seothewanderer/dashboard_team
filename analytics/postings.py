"""채용 현황 집계 (research 8.1 H01·H02·H06). 모든 수치는 수집 공고 135건 표본 기준."""
import pandas as pd

from analytics.common import apply_filters, counts_excluding_self, mentions, skill_mentions
from analytics.defense import TIER, UNLINKED

CAREER_ORDER = ["신입", "신입·경력", "경력", "무관", "불명"]
EDUCATION_ORDER = ["고졸", "초대졸", "대졸", "석사", "학력무관", "불명"]
EDU_RANK = {"고졸": 0, "초대졸": 1, "대졸": 2, "석사": 3}
FILTER_DIMS = ["job_major_category", "province_name", "career_type", "education_normalized"]

# H06 항목별 상태 (점수 없음)
MATCH, CHECK, DIFF, NO_INPUT, NO_POSTING = "입력 조건과 부합", "확인 필요", "입력값과 차이", "사용자 미입력", "공고 미확인"


def posting_frame(postings: pd.DataFrame, bridge: pd.DataFrame, companies: pd.DataFrame) -> pd.DataFrame:
    """공고 + 연결 기업(검토 전 포함, rejected 제외) + 연결 기업의 방산 집단(미연결은 '기업 미연결')."""
    link = bridge[bridge["review_status"].ne("rejected")][["posting_id", "company_id", "review_status"]]
    df = postings.merge(link.rename(columns={"review_status": "link_status"}), on="posting_id", how="left")
    df = df.merge(companies[["company_id", "defense_group"]], on="company_id", how="left")
    df["defense_group"] = df["defense_group"].where(df["company_id"].notna(), UNLINKED)
    return df


def filter_postings(df: pd.DataFrame, filters: dict, company_ids: list | None = None) -> pd.DataFrame:
    out = apply_filters(df, filters)
    return out[out["company_id"].isin(company_ids)] if company_ids else out


def dim_counts(df: pd.DataFrame, dim: str, filters: dict, order: list | None = None) -> pd.DataFrame:
    return counts_excluding_self(df, dim, "posting_id", filters, order)


def kpis(df: pd.DataFrame) -> dict:
    return {"postings": df["posting_id"].nunique(), "employer_names": df["employer_name"].nunique(),
            "linked": int(df["company_id"].notna().sum())}


# ---- 방산 관련 기업 공고 (요청 F2): 공고의 연결 기업 방산 집단 기준 ----
DEF_KIND, GEN_KIND, UNLINKED_KIND = "방산 관련 기업", "그 외 연결 기업", "기업 미연결"
KIND_ORDER = [DEF_KIND, GEN_KIND, UNLINKED_KIND]


def defense_kind(df: pd.DataFrame) -> pd.Series:
    return df["defense_group"].map(lambda g: DEF_KIND if TIER.get(g) else UNLINKED_KIND if g == UNLINKED else GEN_KIND)


def job_by_defense(df: pd.DataFrame, filters: dict) -> pd.DataFrame:
    """직무 분류 × (방산 관련 기업 / 그 외 연결 기업 / 기업 미연결) 고유 공고 수. 직무 자기 필터 제외, 나머지 조건 적용."""
    base = apply_filters(df, {k: v for k, v in filters.items() if k != "job_major_category"})
    m = (base.assign(kind=defense_kind(base))
         .pivot_table(index="job_major_category", columns="kind", values="posting_id", aggfunc="nunique", fill_value=0)
         .reindex(columns=KIND_ORDER, fill_value=0))
    m["total"] = m.sum(axis=1)
    return m.sort_values(["total", DEF_KIND], ascending=False).reset_index()


def _job_share(part: pd.DataFrame) -> pd.Series:
    return part.groupby("job_major_category")["posting_id"].nunique() / max(part["posting_id"].nunique(), 1) * 100


def job_share_by_defense(df: pd.DataFrame) -> tuple[pd.DataFrame, int, int]:
    """그룹 안 직무 비중(%): 방산 관련 기업 공고 vs 그 외 공고(연결·미연결 합). 그룹 크기가 달라 비중으로 비교.
    반환: (표, 방산 관련 기업 공고 수, 그 외 공고 수)."""
    is_def = defense_kind(df).eq(DEF_KIND)
    out = pd.DataFrame({"defense": _job_share(df[is_def]), "other": _job_share(df[~is_def])}).fillna(0).round(1)
    out = out.sort_values(["defense", "other"], ascending=False).reset_index()
    return out, int(df[is_def]["posting_id"].nunique()), int(df[~is_def]["posting_id"].nunique())


def job_career_matrix(df: pd.DataFrame) -> pd.DataFrame:
    return (df.pivot_table(index="job_major_category", columns="career_type", values="posting_id",
                           aggfunc="nunique", fill_value=0)
            .reindex(columns=CAREER_ORDER, fill_value=0))


def employment_tag_counts(df: pd.DataFrame) -> pd.DataFrame:
    """고용형태 다중값: 한 공고가 여러 태그에 중복 집계된다."""
    tags = df[["posting_id", "employment_types"]].explode("employment_types")
    return (tags.groupby("employment_types")["posting_id"].nunique().rename("n").reset_index()
            .sort_values(["n", "employment_types"], ascending=[False, True], ignore_index=True))


def compare_to_profile(posting: pd.Series, profile: dict) -> pd.DataFrame:
    """H06: 항목별 상태표. 합격·적합 점수를 만들지 않는다."""
    rows = []

    edu, mine = posting["education_normalized"], profile.get("education")
    if edu == "불명":
        state = NO_POSTING
    elif edu == "학력무관":
        state = MATCH
    elif not mine:
        state = NO_INPUT
    else:
        state = MATCH if EDU_RANK.get(mine, -1) >= EDU_RANK.get(edu, 99) else DIFF
    rows.append(("학력", edu, mine or "", state, posting.get("education_raw")))

    career, mine = posting["career_type"], profile.get("career_type")
    if career == "불명":
        state = NO_POSTING
    elif career in ("무관", "신입·경력"):
        state = MATCH
    elif not mine:
        state = NO_INPUT
    elif career == "신입":
        state = MATCH if mine == "신입" else CHECK
    else:  # 경력 요구: 연수·관련성은 원문 확인
        state = CHECK if mine == "경력" else DIFF
    rows.append(("경력", career, mine or "", state, posting.get("career_requirement_raw")))

    region, mine = posting["province_name"], profile.get("regions") or []
    state = NO_INPUT if not mine else MATCH if region in mine else DIFF
    rows.append(("근무 지역", region, ", ".join(mine), state, posting.get("original_location")))

    return pd.DataFrame(rows, columns=["항목", "공고", "내 입력", "상태", "공고 원문"])


def filter_by_profile(df: pd.DataFrame, profile: dict) -> pd.DataFrame:
    """'내 조건' 칩(학력·경력·희망 지역, 요청 E 충돌 4): 입력값과 차이가 확인된 공고만 뺀다.
    공고에 조건이 없거나(공고 미확인) 원문 확인이 필요한 공고는 남긴다."""
    if not (profile.get("education") or profile.get("career_type") or profile.get("regions")):
        return df
    keep = df.apply(lambda r: not compare_to_profile(r, profile)["상태"].eq(DIFF).any(), axis=1)
    return df[keep]


# ---- 나의 탐색 경로 01 직무와 비교 (요청 E 충돌 3): 분류 관계·기술·키워드. 점수 없음 ----
RELATION_LABEL = {"direct": "직접 연결", "adjacent": "인접 분류", "broad": "넓은 후보"}


def _with_raw(value: str, raw) -> str:
    return f"{value} · {raw}" if isinstance(raw, str) and raw and raw != value else value


def compare_to_job(job: pd.Series, postings: pd.DataFrame, category_bridge: pd.DataFrame,
                   synonyms: dict[str, str], vocabulary: list[str]) -> pd.DataFrame:
    """행 = 비교 항목, 열 = 공고 제목. 공고별 요구 기술 관계는 자료에 없어 본문(제목·담당 업무) 언급만 본다."""
    links = category_bridge[category_bridge["job_id"].eq(job["job_id"]) & category_bridge["review_status"].ne("rejected")]
    relation = dict(zip(links["job_major_category"], links["relation_type"]))
    cols = {}
    for p in postings.itertuples():
        body = p.responsibilities if isinstance(p.responsibilities, str) else ""
        text = f"{p.title} {body}"
        said = skill_mentions(text, job["skills"], synonyms)
        keywords = mentions(text, vocabulary)
        rel = relation.get(p.job_major_category)
        cols[f"{p.title} ({p.employer_name})"] = [
            p.job_major_category,
            f"{RELATION_LABEL[rel]} (관계표 초안)" if rel else "연결 없음 (관계표 초안)",
            ", ".join(said) or "언급 없음",
            ", ".join(s for s in job["skills"] if s not in said) or "—",
            ", ".join(keywords) or "없음",
            _with_raw(p.career_type, p.career_requirement_raw),
            _with_raw(p.education_normalized, p.education_raw),
            f"{p.province_name} {p.district_name or ''}".strip(),
            "제목·담당 업무" if body else "제목만(담당 업무 원문 없음)",
        ]
    index = ["공고 직무 분류", f"직무 중분류({job['middle_category']})와의 관계", "직무 기술 중 공고에 언급",
             "공고에 언급 안 된 직무 기술", "공고 본문의 공고 키워드", "경력(원문)", "학력(원문)", "근무 지역", "확인한 본문"]
    return pd.DataFrame(cols, index=pd.Index(index, name="항목")).reset_index()


def goal_reasons(postings: pd.DataFrame, job: pd.Series, category_bridge: pd.DataFrame,
                 synonyms: dict[str, str]) -> pd.Series:
    """목표 직무 관련 이유(요청 F5, 점수 없음): 분류 직접·인접 연결, 제목·담당 업무의 직무 기술 언급. 없으면 None."""
    links = category_bridge[category_bridge["job_id"].eq(job["job_id"]) & category_bridge["review_status"].ne("rejected")
                            & category_bridge["relation_type"].isin(["direct", "adjacent"])]
    relation = dict(zip(links["job_major_category"], links["relation_type"]))
    out = []
    for p in postings.itertuples():
        why = [RELATION_LABEL[relation[p.job_major_category]]] if p.job_major_category in relation else []
        body = p.responsibilities if isinstance(p.responsibilities, str) else ""
        said = skill_mentions(f"{p.title} {body}", job["skills"], synonyms)
        if said:
            why.append("기술 " + ", ".join(said[:2]))
        out.append(" · ".join(why) or None)
    return pd.Series(out, index=postings.index, dtype=object)
