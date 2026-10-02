"""과정별 수집 검색어 관계표 만들기 (요청 J2-1, 2026-10-01).

전처리에서 1차 수집(드론 7개 검색어) 과정의 검색어가 모두 '드론' 하나로 합쳐져, 03 교육 키워드 단추에서
초경량비행장치·드론조종 등이 빠졌다. 수집 원본(../DataCollect/work24, 읽기만)에서 과정 ID별 검색어를 다시 모아
data/bridges/course_search_keywords.csv 로 쓴다. build_data.py 가 이 표로 courses.search_keywords 를 다시 채운다.
실행: .venv\\Scripts\\python.exe scripts\\make_course_keywords.py
"""
import pandas as pd

from core.config import BRIDGES, CSV_ENCODING, ROOT

SRC = ROOT.parent / "DataCollect" / "work24"
ROUNDS = [  # (수집 차수, 파일, 과정 ID 열, 검색어 열('|' 복수값))
    ("1차 드론", SRC / "work24_drone_courses_2026_2027.csv", "훈련과정ID", "검색키워드"),
    ("2차 기술", SRC / "keywords_20260928" / "전처리 필요한 데이터2.csv", "course_id", "search_keywords"),
]


def main() -> None:
    parts = []
    for name, path, cid, kw in ROUNDS:
        d = pd.read_csv(path, encoding="utf-8-sig", low_memory=False, usecols=[cid, kw])
        d = d.assign(keyword=d[kw].astype(str).str.split("|")).explode("keyword")
        parts.append(pd.DataFrame({"course_id": d[cid].astype(str), "search_keyword": d["keyword"].str.strip(),
                                   "collection_round": name,
                                   # 사람 판단이 없는 수집 기록 그대로라 검토 완료로 둔다(bridges/README)
                                   "review_status": "reviewed", "review_note": "수집 원본 기록"}))
    out = (pd.concat(parts).query("search_keyword != '' and search_keyword != 'nan'")
           .drop_duplicates().sort_values(["course_id", "collection_round", "search_keyword"], ignore_index=True))
    out.to_csv(BRIDGES / "course_search_keywords.csv", index=False, encoding=CSV_ENCODING)
    print(out.groupby("search_keyword").course_id.nunique().sort_values(ascending=False).to_string())


if __name__ == "__main__":
    main()
