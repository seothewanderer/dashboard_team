"""MySQL 접속(프로젝트 DB, 학원 네트워크에서만 접속됨).

접속 정보는 `.streamlit/secrets.toml`의 [mysql] 칸(host·port·database·user·password)에서 읽는다.
이 파일은 git과 제출본에서 제외한다. 앱은 DB에 직접 접속하지 않고, scripts/pull_db.py만 쓴다.
"""
import tomllib

import pandas as pd
from sqlalchemy import URL, Engine, create_engine, inspect

from core.config import SECRETS


def settings() -> dict:
    if not SECRETS.exists():
        raise SystemExit(f"DB 접속 정보 파일이 없습니다: {SECRETS} ([mysql] host·port·database·user·password)")
    with SECRETS.open("rb") as f:
        return tomllib.load(f)["mysql"]


def engine() -> Engine:
    s = settings()
    return create_engine(URL.create("mysql+pymysql", username=s["user"], password=s.get("password") or None,
                                    host=s["host"], port=int(s.get("port", 3306)), database=s["database"],
                                    query={"charset": "utf8mb4"}))


def table_names(eng: Engine) -> list[str]:
    return inspect(eng).get_table_names()


def primary_key(eng: Engine, table: str) -> list[str]:
    return inspect(eng).get_pk_constraint(table).get("constrained_columns") or []


def read_table(eng: Engine, table: str) -> pd.DataFrame:
    return pd.read_sql_table(table, eng)
