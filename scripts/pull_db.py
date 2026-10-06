"""DB(MySQL) → data/raw_db/*.csv: DB 표를 끌어와 원본 CSV(data/raw)와 같은 경로·모양으로 저장한다.

- 짝 찾기: DB 표 이름 = CSV 파일 이름(대소문자 무시). 이름이 다른 것은 TABLE_NAMES에 적는다.
- DB 표에 없는 열(예: search_keywords)은 원본 CSV에서 기본키로 맞춰 가져온다.
- DB에 없는 표는 저장하지 않는다 → build_data.py --source db가 원본 CSV로 읽고 알려 준다.
- 무엇을 CSV에서 가져왔는지 data/raw_db/_pull_report.md에 남긴다.

실행(학원 네트워크, .streamlit/secrets.toml 필요): .venv\\Scripts\\python.exe scripts\\pull_db.py
"""
import sys
from datetime import datetime
from pathlib import Path

import pandas as pd

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from core import db  # noqa: E402
from core.config import CSV_ENCODING, RAW, RAW_DB  # noqa: E402

# CSV 파일 이름 → DB 표 이름(이름이 다른 것만, 2026-10-06 사용자 확인)
TABLE_NAMES = {
    "Company_Organization_Master_Normalized": "Company_Organization_Master",
    "Training_Course_drone": "Training_Course_Master",
    "Training_Session_Analysis_drone": "Training_Session_Analysis",
}
REPORT = RAW_DB / "_pull_report.md"


def main() -> None:
    eng = db.engine()
    tables = {t.lower(): t for t in db.table_names(eng)}
    pulled, from_csv, skipped = [], [], []
    for csv_path in sorted(RAW.rglob("*.csv")):
        rel = csv_path.relative_to(RAW).as_posix()
        table = tables.get(TABLE_NAMES.get(csv_path.stem, csv_path.stem).lower())
        if table is None:
            continue
        df = db.read_table(eng, table)
        src = pd.read_csv(csv_path, encoding=CSV_ENCODING, low_memory=False)
        missing = [c for c in src.columns if c not in df.columns]
        if missing:
            key = db.primary_key(eng, table)
            if not key or any(k not in src.columns for k in key):
                skipped.append((rel, table, missing))   # 맞출 키가 없으면 저장하지 않음 → 빌드가 CSV 사용
                continue
            add = src[key + missing].astype({k: df[k].dtype for k in key})
            df = df.merge(add, on=key, how="left")
            from_csv.append((rel, table, missing))
        df = df[list(src.columns) + [c for c in df.columns if c not in src.columns]]   # 열 순서 = 원본 CSV
        out = RAW_DB / rel
        out.parent.mkdir(parents=True, exist_ok=True)
        df.to_csv(out, index=False, encoding=CSV_ENCODING)
        pulled.append((rel, table, len(df)))
    write_report(pulled, from_csv, skipped, len(tables))
    print(f"DB 표 {len(pulled)}개 저장 → {RAW_DB} · CSV에서 열을 가져온 표 {len(from_csv)}개 · 보고서 {REPORT.name}")


def write_report(pulled, from_csv, skipped, n_tables) -> None:
    s = db.settings()
    lines = ["# DB에서 끌어온 원본 (scripts/pull_db.py)", "",
             f"- 실행: {datetime.now():%Y-%m-%d %H:%M} · DB: {s['host']} / {s['database']} (표 {n_tables}개)",
             f"- 저장한 표: {len(pulled)}개 (원본 CSV와 이름이 맞는 표만)", "",
             "## 원본 CSV에서 가져온 열 (DB 표에 없음)", ""]
    lines += [f"- `{rel}` ← DB `{t}` + CSV 열 {', '.join(cols)}" for rel, t, cols in from_csv] or ["- 없음"]
    lines += ["", "## 저장하지 않은 표 (DB 열이 모자라고 맞출 기본키가 없음 → 빌드가 원본 CSV 사용)", ""]
    lines += [f"- `{rel}` (DB `{t}`, 없는 열 {', '.join(cols)})" for rel, t, cols in skipped] or ["- 없음"]
    lines += ["", "## 저장한 표", "", "| 원본 경로 | DB 표 | 행 수 |", "|---|---|---|"]
    lines += [f"| {rel} | {t} | {n} |" for rel, t, n in pulled]
    RAW_DB.mkdir(parents=True, exist_ok=True)
    REPORT.write_text("\n".join(lines) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
