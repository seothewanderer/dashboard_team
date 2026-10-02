"""앱의 유일한 데이터 접근 지점 (plan.md 6.1).

analytics·views·components는 파일 경로나 형식을 모르고 테이블 이름만 쓴다.
로컬 DB 전환(plan P9) 때는 `read_table()`의 본문만 DB 조회로 바꾼다.
"""
import json

import pandas as pd
import streamlit as st

from core.config import BRIDGES, CONTENT, PROCESSED, RAW

MANIFEST = PROCESSED / "_manifest.json"
BUILD_COMMAND = r".venv\Scripts\python.exe scripts\build_data.py"


def read_table(name: str) -> pd.DataFrame:
    """캐시 없는 읽기(테스트·스크립트용)."""
    return pd.read_parquet(PROCESSED / f"{name}.parquet")


@st.cache_data(show_spinner=False)
def load_table(name: str) -> pd.DataFrame:
    return read_table(name)


def build_status() -> str | None:
    """빌드 산출물이 없거나 원본보다 오래되면 안내 문구, 정상이면 None."""
    if not MANIFEST.exists():
        return f"데이터 빌드 필요: {BUILD_COMMAND}"
    built = MANIFEST.stat().st_mtime
    sources = [p for folder in (RAW, BRIDGES, CONTENT) if folder.exists() for p in folder.rglob("*.csv")]
    if any(p.stat().st_mtime > built for p in sources):
        return f"원본이 빌드 이후 바뀌었습니다. 다시 빌드: {BUILD_COMMAND}"
    return None


def table_names() -> list[str]:
    return sorted(json.loads(MANIFEST.read_text(encoding="utf-8"))["tables"])
