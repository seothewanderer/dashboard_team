"""경로와 전역 상수. 화면·데이터 계층이 공유한다."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
RAW_DB = DATA / "raw_db"          # DB(MySQL)에서 끌어와 저장한 원본(scripts/pull_db.py), RAW와 같은 경로·모양
REFERENCE = DATA / "reference"
BRIDGES = DATA / "bridges"
CONTENT = DATA / "content"
PROCESSED = DATA / "processed"
REPORTS = ROOT / "reports"

CSV_ENCODING = "utf-8-sig"

# 빌드 원본 기본값: "db" = RAW_DB(DB에서 끌어온 것), "csv" = RAW(원본 CSV). build_data.py --source 로 바꿀 수 있다
DATA_SOURCE = "db"
SECRETS = ROOT / ".streamlit" / "secrets.toml"   # DB 접속 정보 [mysql] (git·제출본 제외)
