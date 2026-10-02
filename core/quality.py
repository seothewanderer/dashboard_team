"""결측 감사 (사용자 확정 규칙, plan.md 6.3).

- 결측률 50% 이상 컬럼은 제외한다.
- 30% 이상 50% 미만은 '주의'로 남기고 화면에 표본 n을 함께 표기한다.
- 0이나 평균으로 채우지 않는다.

결측으로 세는 값: 빈 값(NaN·공백 문자열)과 원본이 '정보 없음'을 표시하려고 넣은 문자열(MISSING_TOKENS).
'불명', '미공개', '없음'처럼 그 자체가 의미 있는 범주인 값은 결측으로 세지 않는다.
"""
import pandas as pd

EXCLUDE_AT = 0.50
CAUTION_AT = 0.30

MISSING_TOKENS = frozenset({
    "공개정보 확인 불가",            # Drone_Company_Jobseeker_Database 전 컬럼
    "공개 채용공고 확인 불가",        # 같은 파일 현재_채용_여부
    "직무별 공개 급여 근거 없음",     # Drone_Job_Classification salary_original_text
})


def missing_mask(s: pd.Series) -> pd.Series:
    if s.dtype == object or pd.api.types.is_string_dtype(s):
        text = s.astype("string").str.strip()
        return s.isna() | text.eq("") | text.isin(MISSING_TOKENS)
    return s.isna()


def audit(df: pd.DataFrame, source: str) -> pd.DataFrame:
    """컬럼별 결측률과 판정(ok / caution / exclude)."""
    rows = []
    for col in df.columns:
        missing = int(missing_mask(df[col]).sum())
        rate = missing / len(df) if len(df) else 0.0
        status = "exclude" if rate >= EXCLUDE_AT else "caution" if rate >= CAUTION_AT else "ok"
        rows.append({"source": source, "column": col, "rows": len(df), "missing": missing,
                     "missing_rate": round(rate, 4), "status": status})
    return pd.DataFrame(rows)


def to_missing(df: pd.DataFrame) -> pd.DataFrame:
    """결측 표시 문자열을 빈 값으로 바꾼다(값을 채우지 않음, 표시만 통일)."""
    out = df.copy()
    for col in out.columns:
        if out[col].dtype == object:
            out[col] = out[col].mask(missing_mask(out[col]))
    return out
