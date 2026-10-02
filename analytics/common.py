"""공통 집계 규칙 (plan.md 1.3, research 3.2.1). Streamlit을 import하지 않는다.

필터는 {컬럼: [값, …]} 사전. 같은 컬럼 안은 OR, 서로 다른 컬럼끼리는 AND.
빈 목록·None은 '필터 없음'이다.
"""
import re

import pandas as pd

PAGE_SIZE = 10


def apply_filters(df: pd.DataFrame, filters: dict, exclude: str | None = None) -> pd.DataFrame:
    mask = pd.Series(True, index=df.index)
    for col, values in filters.items():
        if col == exclude or not values:
            continue
        mask &= df[col].isin(values)
    return df[mask]


def counts(df: pd.DataFrame, dim: str, id_col: str, order: list | None = None) -> pd.DataFrame:
    """dim별 고유 id 수. 기본은 수 내림차순·이름순, order가 있으면 그 순서(0건 포함)."""
    out = df.groupby(dim)[id_col].nunique().rename("n").reset_index()
    if order is not None:
        return pd.DataFrame({dim: order}).merge(out, on=dim, how="left").fillna({"n": 0}).astype({"n": int})
    return out.sort_values(["n", dim], ascending=[False, True], ignore_index=True)


def counts_excluding_self(df: pd.DataFrame, dim: str, id_col: str, filters: dict,
                          order: list | None = None) -> pd.DataFrame:
    """자기 필터만 빼고 나머지 조건을 적용한 분포 (research 3.2.1-3)."""
    return counts(apply_filters(df, filters, exclude=dim), dim, id_col, order)


def paginate(df: pd.DataFrame, page_no: int, size: int = PAGE_SIZE) -> tuple[pd.DataFrame, int]:
    """정렬이 끝난 전체 결과에서 page_no번째 묶음. (묶음, 전체 수)"""
    total = len(df)
    page_no = max(0, min(page_no, max(0, (total - 1) // size)))
    return df.iloc[page_no * size:(page_no + 1) * size], total


def split_tags(text, sep: str = ";") -> list[str]:
    if not isinstance(text, str):
        return []
    return [t.strip() for t in text.split(sep) if t.strip()]


def mentions(text: str, terms: list[str]) -> list[str]:
    """본문에 나온 용어. 영문·숫자 용어는 단어 경계로(예: 'C'가 'CAD'에 걸리지 않게), 한글은 부분 일치."""
    found, low = [], text.casefold()
    for term in terms:
        t = term.casefold()
        if re.fullmatch(r"[0-9a-z+#/.\- ]+", t):
            hit = re.search(rf"(?<![0-9a-z]){re.escape(t)}(?![0-9a-z])", low)
        else:
            hit = t in low
        if hit:
            found.append(term)
    return found


def skill_mentions(text: str, skills: list[str], synonyms: dict[str, str]) -> list[str]:
    """직무 기술 중 본문에 언급된 것(정확 표기 → 검토된 동의어 묶음)."""
    groups: dict[str, set[str]] = {}
    for alias, sid in synonyms.items():
        groups.setdefault(sid, set()).add(alias)
    return [s for s in skills if mentions(text, [s] + sorted(groups.get(synonyms.get(s.casefold(), ""), set())))]
