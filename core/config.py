"""경로와 전역 상수. 화면·데이터 계층이 공유한다."""
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
REFERENCE = DATA / "reference"
BRIDGES = DATA / "bridges"
CONTENT = DATA / "content"
PROCESSED = DATA / "processed"
REPORTS = ROOT / "reports"

CSV_ENCODING = "utf-8-sig"
