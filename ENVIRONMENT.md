# ENVIRONMENT.md — 실행 환경과 모듈 버전

- 최종 갱신: 2026-09-30 (Green Deck 재디자인: streamlit-aggrid 추가)
- 이 문서가 환경 정보의 기준이다. 패키지를 추가·변경하면 이 문서, `requirements.txt`, `requirements-lock.txt`를 함께 갱신한다.

## 1 Python과 가상환경

| 항목 | 값 |
|---|---|
| OS | Windows 11 Pro 10.0.26200 |
| Python | **3.12.10** (64-bit) — `C:\Users\acorn\AppData\Local\Programs\Python\Python312\python.exe` |
| 설치 방법 | `winget install --id Python.Python.3.12 -e --scope user` (python.org 공식 설치 파일, 해시 검증됨) |
| 가상환경 | `main\.venv` (`py -3.12 -m venv .venv`) |
| 선택 이유 | 호환성 우선(사용자 결정, plan.md 17장 Q7). 로컬 기본 Python은 3.14.6이지만 이 프로젝트에서는 쓰지 않는다 |

## 2 직접 사용하는 패키지 (`requirements.txt`)

| 패키지 | 버전 | 용도 |
|---|---|---|
| streamlit | 1.64.0 | 앱 프레임워크(navigation, dialog, pills, 테마·fontFaces) |
| plotly | 6.9.0 | **현재 코드에서 미사용**(P4에서 차트를 ECharts로 전환). 삭제 여부 사용자 확인 대기 |
| streamlit-echarts | 0.7.0 | 차트(Apache ECharts): 등장·전환 애니메이션, 클릭 선택, 트리맵·히트맵·타일 지도. Streamlit 1.64의 components.v2 기반 |
| streamlit-aggrid | 1.2.1.post2 | 인터랙티브 표(AG Grid): 행 호버·정렬·필터·검색. '근거 자세히', 비교표, 방산 근거 원장 |
| pandas | 2.3.3 | 데이터 처리. 3.0의 동작 변경(문자열 dtype 기본값 등)을 피하려 2.x로 고정 |
| pyarrow | 25.0.1 | parquet 캐시(`data/processed`) |
| pytest | 9.1.1 | 테스트 |
| pip | 26.2.1 | 패키지 관리자(가상환경 안) |

주요 간접 의존성: numpy 2.5.3, altair 6.3.0. 전체 47개 고정 목록은 `requirements-lock.txt`(`pip freeze`).

추가 패키지 없이 쓰는 기능: Streamlit 내장 `st.components.v2`(홈 드론·숫자 카운트업 `components/effects.py`, 라이트/다크 토글·브라우저 저장 `components/browser.py`).

## 3 설치·실행

```
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.venv\Scripts\python.exe scripts\place_raw_data.py     # datas.zip → data/raw, data/reference (P0)
.venv\Scripts\python.exe scripts\draft_bridges.py      # 관계표 초안(data/bridges, 기존 파일은 건너뜀) (P2)
.venv\Scripts\python.exe scripts\build_data.py         # raw + bridges → data/processed/*.parquet + reports/data_audit.md (P1)
.venv\Scripts\python.exe -m pytest -q                   # 테스트
$env:PYTHONPATH="."; .venv\Scripts\python.exe scripts\make_home_icon.py   # 홈 아이콘: static/img/home.gif → home_rest/home_hover.webp (Pillow, streamlit 의존성)
.\run.ps1                                               # 앱 실행(= .venv\Scripts\streamlit.exe run app.py, 추가 인자 전달 가능)
.venv\Scripts\python.exe scripts\export_html.py serve <캡처폴더>                         # HTML 공유본: 캡처 수신
.venv\Scripts\python.exe scripts\export_html.py build <캡처폴더> v1_초안본_2026-09-30   # 한 파일로 조립 → html/
.venv\Scripts\python.exe scripts\build_interactive.py v2_수정본_2026-10-01            # 기능 공유본(단일 HTML, 오프라인) → html/
```

## 4 설정 파일

| 파일 | 내용 |
|---|---|
| `.streamlit/config.toml` | DESIGN.md §9.2~9.3 테마·폰트 값. streamlit 1.64 `config show`로 키 인식 확인 |
| `pytest.ini` | 테스트 경로(`tests`)와 import 기준(`pythonpath = .`). 실행: `.venv\Scripts\python.exe -m pytest -q` |
| `.claude\launch.json` | Claude 미리보기용 실행 설정(`run.ps1 --server.headless true --server.port 8501`/8502, html 8777). 앱 동작과 무관. 2026-10-03 Claude 루트를 main으로 바꾸며 상위 폴더에서 이리로 옮김 |
| 참고 | 실행 중 파이썬 모듈(core/components/views)을 고치면 서버를 재시작해야 반영된다. CSS(`static/css/base.css`)는 새로고침만으로 반영 |
| 테마 | 첫 방문은 다크. 사이드바 하단 ☀/☾ 토글이 Streamlit 테마 저장값(localStorage)을 바꾸고 새로고침한다. 선택 상태는 localStorage `drone-career-v1`에 저장·복원 |
| `static/fonts/` | Pretendard 400/500/600/700/800 OTF(300은 미등록, 파일만 남음) (`design/`에서 복사, 원본은 `design/`에 보존) |

## 5 앞으로 바뀔 예정인 부분

- **데이터 소스:** 지금은 CSV → parquet이지만, 대시보드 화면이 확정된 뒤 **로컬 DB에서 읽는 방식으로 바꿀 예정**(plan.md 6.1). DB 드라이버 패키지가 추가되면 이 문서에 기록한다.

## 6 기능 공유본(HTML)에 넣는 외부 파일

| 파일 | 버전 | 출처 | 용도 |
|---|---|---|---|
| `scripts/interactive/vendor/echarts.min.js` | ECharts 5.6.0 (1,034,102바이트, SHA-256 BF4A223524E40B77C304BEC67E1222CF551F14880CF42C69DC046558E11C07B1) | cdn.jsdelivr.net/npm/echarts@5.6.0 공식 배포본, Apache-2.0 | 단일 HTML 안 차트(사용자 허용 2026-10-01). 파이썬 패키지가 아니라 requirements에는 없음 |
| `static/vendor/echarts.min.js` | 위와 같은 파일(복사본) | 위와 같음 | 03 지도·키워드 막대 연동 부품(components/linked_map.py, 요청 J1). 정적 서빙(/app/static)으로 읽음 |
| `data/reference/skorea_provinces_geo_simple.json` | KOSTAT 2013 시·도 단순화 | GitHub southkorea/southkorea-maps | 지도(앱·공유본 공용) |

