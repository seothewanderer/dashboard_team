"""준비 역량: 교육 검색·그룹·정렬 (research 7장 S02·S04, 7.1, 7.2).

날짜 상태는 이용 시점의 한국 날짜(today)로 계산하며, 현재 모집 상태와는 다르다.
"""
import re
from datetime import date

import pandas as pd

from analytics.common import skill_mentions, split_tags

BEFORE, ONGOING, ENDED, NO_DATE = "시작 전", "진행 중", "종료", "일정 미수록"
STATUS_ORDER = [BEFORE, ONGOING, ENDED, NO_DATE]

GROUP_LINKED, GROUP_SEARCH, GROUP_BASIC = "기술 학습과 연결된 과정", "키워드로 찾은 추가 과정", "먼저 배울 기초 과정"
GROUP_ALL = "전체 과정"                    # 아무 조건도 고르지 않은 기본 목록(요청 J3)
GROUP_ORDER = [GROUP_LINKED, GROUP_BASIC, GROUP_SEARCH, GROUP_ALL]
RELEVANCE_LABEL = {"DIRECT": "직접 학습", "INCLUDED": "일부 포함", "PREREQUISITE": "선수 학습",
                   "OFFICIAL_RESOURCE": "공식 참고자료"}
REMOTE = "원격"
# 수집 때 검색 결과가 0건이던 검색어(DataCollect/work24: 1차 UAV, 2차 keyword_search_counts.csv) — 단추에서 빠짐을 안내(요청 J2-1)
EMPTY_KEYWORDS = ("UAV", "비행제어기", "Pixhawk", "DJI", "GIS")


def date_status(start, end, today: date) -> str:
    if pd.isna(start):
        return NO_DATE
    if start.date() > today:
        return BEFORE
    if pd.isna(end) or end.date() >= today:
        return ONGOING
    return ENDED


def with_status(offerings: pd.DataFrame, today: date) -> pd.DataFrame:
    return offerings.assign(date_status=[date_status(s, e, today) for s, e in
                                         zip(offerings["start_date"], offerings["end_date"])])


def representative(offerings: pd.DataFrame) -> pd.DataFrame:
    """과정별 대표 회차: 시작 전(시작일 오름) → 진행 중(종료일 오름) → 종료 → 일정 미수록."""
    rank = offerings["date_status"].map({s: i for i, s in enumerate(STATUS_ORDER)})
    key = offerings["start_date"].where(offerings["date_status"].ne(ONGOING), offerings["end_date"])
    ordered = offerings.assign(_r=rank, _k=key).sort_values(["course_id", "_r", "_k", "offering_id"])
    return ordered.drop_duplicates("course_id").drop(columns=["_r", "_k"])


def _has_word(text: pd.Series, kw: str) -> pd.Series:
    """casefold 된 글에 키워드 포함 여부. 영문·숫자 키워드는 단어 경계로('C'가 CAD·C++에, 'SW'가 SolidWorks에 걸리지 않게, 요청 K2)."""
    if kw.isascii():
        return text.str.contains(rf"(?<![a-z0-9]){re.escape(kw)}(?![a-z0-9+#])", regex=True)
    return text.str.contains(kw, regex=False)


def search_courses(keywords: list[str], courses: pd.DataFrame, resources: pd.DataFrame,
                   job_id: str | None = None, search_only: bool = False) -> pd.DataFrame:
    """7.1: 과정 한 개 = 한 행, 후보 이유 병합. 연결표 관계는 선택 직무의 관계만 사용.
    search_only: 교육 키워드 칩(요청 F4) — 수집 검색어 컬럼만 본다(칩의 과정 수와 카드 수를 맞춤)."""
    cols = ["course_id", "reasons", "relevance", "group"]
    kws = [k.strip() for k in keywords if k and k.strip()]
    if not kws:
        return pd.DataFrame(columns=cols)
    reasons: dict[str, set] = {}
    relevance: dict[str, set] = {}
    lowered = [k.casefold() for k in kws]
    name = courses["course_name"].fillna("").str.casefold()
    search = courses["search_keywords"].fillna("").str.casefold()
    ncs = courses["ncs_name"].fillna("").str.casefold()
    for kw in lowered:
        for cid in courses.loc[_has_word(name, kw) & (not search_only), "course_id"]:
            reasons.setdefault(cid, set()).add("과정명 일치")
        for cid in courses.loc[search.apply(lambda s: kw in split_tags(s, "|")), "course_id"]:
            reasons.setdefault(cid, set()).add("수집 검색어 일치")
        for cid in courses.loc[_has_word(ncs, kw) & (not search_only), "course_id"]:
            reasons.setdefault(cid, set()).add("NCS명 일치")
    if job_id:
        linked = resources[resources["is_work24"] & resources["job_id"].eq(job_id)
                           & resources["selected_skill"].str.casefold().isin(lowered)]
        for cid, rel in zip(linked["course_id"], linked["relevance_type"]):
            reasons.setdefault(cid, set()).add("연결표에 있음")
            relevance.setdefault(cid, set()).add(rel)
    rows = []
    for cid, why in reasons.items():
        rel = relevance.get(cid, set())
        group = GROUP_LINKED if rel & {"DIRECT", "INCLUDED"} else GROUP_BASIC if "PREREQUISITE" in rel else GROUP_SEARCH
        rows.append({"course_id": cid, "reasons": sorted(why), "relevance": sorted(RELEVANCE_LABEL[r] for r in rel),
                     "group": group})
    return pd.DataFrame(rows, columns=cols)        # 일치 0건이어도 열 유지(요청 K3: 공고 기술 클릭 오류)


def recruit_keyword_counts(posting_kw: pd.DataFrame, courses: pd.DataFrame) -> pd.DataFrame:
    """채용 키워드로 찾기(요청 K2): 공고 기술 키워드별 언급 공고 수와 관련 교육 과정 수(과정명·수집 검색어·NCS명에 포함).
    관련 과정이 1개 이상인 키워드만, 공고 언급 많은 순. keyword, posting_count, n."""
    kw = posting_kw.groupby("keyword_normalized")["posting_count"].max()
    text = (courses["course_name"].fillna("") + " " + courses["search_keywords"].fillna("").str.replace("|", " ")
            + " " + courses["ncs_name"].fillna("")).str.casefold()
    n = {k: int(_has_word(text, k.casefold()).sum()) for k in kw.index}
    out = pd.DataFrame({"keyword": kw.index, "posting_count": kw.values, "n": [n[k] for k in kw.index]})
    return (out[out["n"].gt(0)].sort_values(["posting_count", "n", "keyword"], ascending=[False, False, True])
            .reset_index(drop=True))


def course_keywords(courses: pd.DataFrame) -> pd.DataFrame:
    """과정 × 수집 검색 키워드('|' 복수값) 긴 표: course_id, keyword."""
    kw = courses[["course_id", "search_keywords"]].assign(
        keyword=courses["search_keywords"].map(lambda s: split_tags(s, "|"))).explode("keyword")
    return kw.dropna(subset=["keyword"])[["course_id", "keyword"]]


def keyword_counts(courses: pd.DataFrame) -> pd.DataFrame:
    """교육 키워드 칩(요청 F4): 수집 검색 키워드 컬럼('|' 복수값)을 나눠 키워드별 고유 과정 수. 많은 순."""
    return (course_keywords(courses).groupby("keyword")["course_id"].nunique().rename("n").reset_index()
            .sort_values(["n", "keyword"], ascending=[False, True], ignore_index=True))


def region_keyword_counts(courses: pd.DataFrame, offerings: pd.DataFrame) -> pd.DataFrame:
    """지역 × 키워드별 고유 과정 수(요청 J1-2): 그 지역에서 열리는(비원격) 회차가 있는 과정. province_std, keyword, n."""
    local = offerings.loc[offerings["remote_mode"].ne(REMOTE), ["course_id", "province_std"]].drop_duplicates()
    return (local.merge(course_keywords(courses), on="course_id")
            .groupby(["province_std", "keyword"])["course_id"].nunique().rename("n").reset_index())


def region_course_counts(offerings: pd.DataFrame, course_ids) -> pd.DataFrame:
    """시도별 고유 과정 수(요청 J1-1, 비원격 회차 기준) + 원격(REMOTE) 한 줄. course_ids = 보여 줄 과정."""
    offs = offerings[offerings["course_id"].isin(set(course_ids))]
    local = offs[offs["remote_mode"].ne(REMOTE)]
    out = local.groupby("province_std")["course_id"].nunique().rename("n").reset_index()
    remote = pd.DataFrame({"province_std": [REMOTE],
                           "n": [offs.loc[offs["remote_mode"].eq(REMOTE), "course_id"].nunique()]})
    return pd.concat([out, remote], ignore_index=True)


def courses_in_region(offerings: pd.DataFrame, region: str) -> set:
    """지역 필터(요청 J3): 그 시도에서 열리는 비원격 회차가 있는 과정."""
    hit = offerings["province_std"].eq(region) & offerings["remote_mode"].ne(REMOTE)
    return set(offerings.loc[hit, "course_id"])


def rank_courses(candidates: pd.DataFrame, courses: pd.DataFrame, rep: pd.DataFrame, profile: dict) -> pd.DataFrame:
    """7.2 그룹 내 정렬: 지역·학습 방식 일치 → 시작 전·진행 중 회차 보유 → 가까운 시작일 → 과정명·ID."""
    df = candidates.merge(courses, on="course_id").merge(
        rep[["course_id", "offering_id", "province_std", "start_date", "end_date", "date_status", "course_url",
             "session_no"]], on="course_id", how="left")
    regions, allow_remote = profile.get("regions") or [], profile.get("allow_remote", True)
    fit = df["province_std"].isin(regions) | (allow_remote & df["remote_mode"].eq(REMOTE)) if regions else False
    active = df["date_status"].isin([BEFORE, ONGOING])
    df = df.assign(_g=df["group"].map({g: i for i, g in enumerate(GROUP_ORDER)}),
                   _fit=~pd.Series(fit, index=df.index).astype(bool), _active=~active,
                   _start=df["start_date"].fillna(pd.Timestamp.max))
    return (df.sort_values(["_g", "_fit", "_active", "_start", "course_name", "course_id"], ignore_index=True)
            .drop(columns=["_g", "_fit", "_active", "_start"]))


def resources_for(resources: pd.DataFrame, job_id: str, skill: str) -> pd.DataFrame:
    """S02: 선택 직무·기술의 학습 리소스, 리소스 키 기준 중복 제거, 관련성 라벨."""
    rows = resources[resources["job_id"].eq(job_id) & resources["selected_skill"].eq(skill)]
    rows = rows.drop_duplicates("resource_key").assign(relevance=lambda d: d["relevance_type"].map(RELEVANCE_LABEL))
    order = {r: i for i, r in enumerate(RELEVANCE_LABEL)}
    return rows.sort_values(by="relevance_type", key=lambda s: s.map(order), ignore_index=True)


# 내 직무 준비(요청 AG2): 연결 자료를 세 묶음으로 — 직접·포함 / 기초 참고 / 공식 문서
RES_GROUPS = {"직접·포함": ("DIRECT", "INCLUDED"), "기초 참고": ("PREREQUISITE",), "공식 문서": ("OFFICIAL_RESOURCE",)}
_KO_PLACEHOLDER = " 관련 기술"   # 연결표에 한글 이름이 없으면 'X 관련 기술'로 적혀 있음 → 한글 이름 없음으로 본다


def skill_names(resources: pd.DataFrame) -> dict[str, str]:
    """기술 키(selected_skill) → 한글 이름. 한글 이름이 없거나 키와 같으면 넣지 않는다."""
    d = resources.drop_duplicates("selected_skill").set_index("selected_skill")["skill_name_ko"].dropna()
    return {k: v for k, v in d.items() if v != k and not v.endswith(_KO_PLACEHOLDER)}


def skill_label(skill: str, names: dict[str, str], md: bool = True) -> str:
    """한글 이름(원래 이름). md = Streamlit 마크다운(원래 이름을 작게·흐리게)."""
    ko = names.get(skill)
    if not ko:
        return skill
    return f"{ko} :small[:gray[{skill}]]" if md else f"{ko}({skill})"


def goal_reasons(courses: pd.DataFrame, job: pd.Series, resources: pd.DataFrame, synonyms: dict[str, str]) -> pd.Series:
    """목표 직무 관련 이유(요청 F5, 점수 없음): 연결표에서 목표 직무와 연결된 과정, 과정명·수집 검색어에 직무 기술."""
    linked = set(resources.loc[resources["is_work24"] & resources["job_id"].eq(job["job_id"]), "course_id"])
    out = []
    for r in courses.itertuples():
        why = ["연결표 과정"] if r.course_id in linked else []
        said = skill_mentions(f"{r.course_name} {r.search_keywords or ''}".replace("|", " "), job["skills"], synonyms)
        if said:
            why.append("기술 " + ", ".join(said[:2]))
        out.append(" · ".join(why) or None)
    return pd.Series(out, index=courses.index, dtype=object)
