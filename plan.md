# plan.md — 드론 진로 탐색 대시보드 구현 계획 (Streamlit)

- 문서 버전: v0.16 (계속 수정 예정)
- 작성일: 2026-09-30
- 설계 근거: `../research.md`(v0.5 최종 채택본), `../드론_진로탐색_대시보드_프로젝트_기획서.docx`, `../datas.zip`(최상위 CSV 59개 + DART 내부 ZIP 4개)
- 상태: **구현 진행 중.** 단계별 완료 상태는 14장 표를 따른다(2026-09-30 기준 P0·P1·P3·P4 완료, P2 초안 생성 후 사용자 검토 대기).
- 작업 루트: `C:\Projects\Dashboard\main` — 진행 상태는 14장 표의 '완료' 표시를 따른다. 환경·버전은 `ENVIRONMENT.md`.
- 구조 우선순위: research의 04·05 독립 하위 페이지 구조는 이 문서 9.5의 '04 상위 1개 + 하위 2개' 구조가 대체한다(범위는 plan.md 우선).
- 문서 사용법: 결정이 바뀌면 해당 절을 수정하고, 결정이 필요한 항목은 **17장 결정 필요 항목**에 모아 둔다. 화면 모듈 ID(M/I/J/S/H/C/R)는 research.md와 동일하게 쓴다.

---

## 0 한눈에 보는 계획

| 항목 | 결정(초안) |
|---|---|
| 프레임워크 | Streamlit 1.64 + **Apache ECharts(`streamlit-echarts` 0.7)** 차트, Streamlit 내장 `components.v2`(드론·카운트업), pandas 2.3, pyarrow(파케이 캐시). P4에서 Plotly → ECharts로 전환(사용자 요청: 다양한 시각 효과) |
| 페이지 구성 | 홈 + 01 산업 이해 / 02 직무 탐색 / 03 준비 역량 / 04 채용·기업 탐색(하위: 채용 현황, 기업 탐색) = 등록 페이지 5개, 사용자가 보는 화면 6개 (D01, 9.5) |
| 라우팅 | `st.navigation(position="hidden")` + `st.Page` 5개. 사이드바 메뉴는 직접 그림(04 아래 하위 메뉴 펼침/접힘), 04 안의 하위 페이지는 `?sub=` + 중앙 탭으로 전환. 화면 파일 폴더는 `views/` (`pages/` 사용 안 함) |
| 공통 레이아웃 | 왼쪽: `st.sidebar` **240px**(메뉴 + 하단 문맥 안내·☀/☾ 테마 토글) / 중앙: 페이지 본문 / 오른쪽: **260px**(1440 미만 240) '나의 탐색 경로'(v0.13 이름 변경). 톤: 다크 사이드바·카드 #181818, 메인 #121212 (Green Deck, DESIGN §6.4) |
| 상세 팝업 | `st.dialog` (한 번에 1개만 열리므로 '팝업을 겹치지 않음' 규칙과 일치) |
| 차트 클릭 | ECharts `events.click` → 같은 상태 키를 쓰는 칩(`st.pills`)을 키보드 대안으로 동시 제공 (`components/charts.py`, `components/filters.py`) |
| 홈 드론 | Streamlit 내장 `st.components.v2` 컴포넌트(`components/home_hero.py`, 팀원 Home 반영 2026-10-02) — Three.js 3D 드론·공역 배경, 클릭 후 P1~P5 → 그 방향 비행 → 트리거 값으로 `routing.go`, 복귀 비행 |
| 데이터 처리 | `data/raw`(원본 그대로, 읽기 전용) → `scripts/build_data.py` → `data/processed/*.parquet` → `core/data_loader.py`(`st.cache_data`) |
| 결측 기준 | 사용자 확정 규칙: 결측 50% 이상 컬럼 제외, 30~50% '주의' 배지+표본 n 표기, 0·평균 대체 금지 (6.3절) |
| 사용자 상태 | `st.session_state` 단일 스키마 + 브라우저 로컬 저장(목표 직무·스크랩·내 조건). 기술 자기보고(v0.12)·계획 선택(v0.13)은 삭제 |
| 첫 구현 범위 | research 12장의 '기본 탐색' 모듈만. 확장·조건부는 이후 단계 (14장) |

---

## 1 입력 자료 검토 요약 (계획에 직접 영향을 주는 사실만)

### 1.1 기획서(docx) 1~7절 → 코드 요구

| 기획서 | 코드에서 지켜야 할 것 | 구현 위치 |
|---|---|---|
| 1 개요 | 산업·직무·역량·교육·기업·채용을 질문에 따라 연결 | 6개 화면(04 안의 하위 페이지 2개 포함) + 오른쪽 공통 로드맵 |
| 2 배경 | 조종 외 개발·설계·정비·활용·사업지원 경로 노출 | `views/p02_jobs.py` J01 직무 지도 |
| 3 타겟 | 입문자 / 취준생 / 전환자 세 경로 모두 시작 가능 | 홈 M02, J05(직무 키워드·보유 기술로 직무 찾기), 9.6 '지금 필요한 도움' |
| 4 기대효과 | 탐색 결과가 학습·결과물·조건 확인 행동으로 남음 | `core/state.py` 로드맵·스크랩, `analytics/roadmap.py` 다음 행동 |
| 5 흐름 | 산업 → 직무 → 역량 → 채용 → 로드맵 | `core/routing.py` 페이지 간 상태 전달 |
| 6 구성 방향 | 질문 중심, 직무 중심 연결, 준비 방법, 민간·국방 맥락 | 각 화면 상단 질문형 소개(V21), 방산 하이라이트 |
| 7 데이터 원칙 | 사전/공고/제안 구분, 시점·표본·미확인 표기, 현재 채용·취업 가능성 단정 금지 | `content/module_meta.py`, `components/chart_card.py`의 출처·분모 표기, `content/copy.py` 문구 |

### 1.2 datas.zip 실측 확인 (2026-09-30, 스크래치 영역에서 압축 해제 후 확인)

- 최상위 CSV 59개, 모두 `utf-8-sig`로 읽힘. 빈 폴더 `수정된 파일/` 1개(파일 없음).
- DART 내부 ZIP 4개: 각 `*_table_list.csv`(19열) + `tables/*.csv`. 표 수 32 / 51 / 7 / 38 = 128. research 11.1과 일치.
- DART 표 파일은 헤더가 `제25기 (2026년 2분기) / 매출액` 형태의 **기간+지표 복합 헤더**, 값은 `"1,342,067"`, `58.9%` 같은 문자열 → 파싱 규칙 필요(10.3 규칙 적용).
- 공고 135건, `employer_name` 고유 76개, `analysis_use_flag` 전부 1, `responsibilities` 결측 32건.
- 공고 기업명 ↔ 조직 마스터 정확 일치: 22개 기업명 / 52개 공고행 (research의 52/135와 일치).
- 조직 마스터 `defense_drone_relation_class`: 미분류 201, 방산인접 탐색후보 25, 드론근거만 확인 21, 방산근거만 확인 8, 교차출처 후보 5, 원문 직접확인 4.
- 사업 분야 검증본: 18개 분야, 239개 기업, 1,322행.
- 교육 회차 시작일 범위: 2026-01-01 ~ 2027-01-04. `course_url` 결측 0.
- 로컬 Python은 3.14.6만 설치되어 있고(`py -0p` 확인, 3.12 없음) streamlit 미설치. 가상환경은 **Python 3.12로 확정**(17장 Q7, 사용자 결정) → P0 전에 3.12 설치 필요. 참고: `testDash/.venv`는 3.14.6에서 streamlit 1.64 / plotly 7.1 / pandas 3.0 / pyarrow 25로 동작 중이나, 호환성을 우선해 3.12를 쓴다.
- 결측 재감사(2026-09-30): 6.3 표 수치 재확인. 누락되어 있던 2개 컬럼 추가(`Training_Session_Analysis_keywords.ncs_code_standard` 97%, `Defense_Cost_Certified_Companies.3차 갱신일` 31%).
- 원장 `evidence_strength` 실측 값 6종: 기술활동 보조근거 50, 탐색후보 25, 공식 보조근거 13, 공식 드론운용 근거 12, 직접 4, 보조 2 (17장 Q2).

### 1.3 research.md에서 코드 구조를 결정짓는 규칙

1. 화면 6개(채용·기업은 상위 1개 + 하위 2개), 왼쪽 약 160px·오른쪽 약 240px·중앙 우선 (D01·D03·V18).
2. 기업 카드는 첫 화면·더보기 모두 **최대 10개**, 필터 → 정렬 → 10개 분할 순서 (D02, 15.2-13).
3. 분야 막대는 **자기 필터 제외** 분포, 카드·결과 수는 전체 필터 적용 (3.2.1).
4. 01과 기업 탐색(research의 05, 이 계획에서는 04의 하위 페이지)의 같은 조건 분야 집계는 반드시 같은 함수·같은 값 (15.2-22).
5. 스크랩 ≠ 계획 선택. 서로 독립 저장, 취소가 서로를 지우지 않음 (9.7).
6. 방산 하이라이트(강조) ≠ 방산 관련만 보기(필터) ≠ 방산 우선(정렬). 강조만 켜면 건수 불변 (3.5).
7. 없는 관계는 만들지 않음: 공고별 키워드 관계 없음 → 공고별 기술 충족률·직무별 키워드 히트맵 금지 (10.1).
8. 모든 차트는 제목·단위·분모·기준시점·출처·필터 적용 여부를 표시 (3.3).
9. 빈 값·미확인을 0이나 '부적합'으로 바꾸지 않음. 문구는 14장 표를 따름.

---

## 2 전체 프로젝트 폴더 구조 (목표 상태)

```
main/
├─ CLAUDE.md                     # 기존. 행동 가이드
├─ plan.md                       # 이 문서
├─ README.md                     # 실행법·데이터 출처·제외 컬럼 목록(구현 시 작성)
├─ ENVIRONMENT.md                # Python·가상환경·모든 모듈 버전 기록(환경 정보의 기준)
├─ requirements.txt              # 직접 사용 패키지(버전 고정)
├─ requirements-lock.txt         # pip freeze 전체 고정 목록
├─ html/                         # 팀 공유용 정적 HTML 버전 보관(9.8)
├─ run.ps1                       # 가상환경 활성화 + streamlit run app.py
├─ .streamlit/
│  └─ config.toml                # 라이트/다크 테마 기본값, 서버 옵션
├─ design/
│  ├─ DESIGN.md                  # 디자인 레퍼런스(색·타이포·간격·컴포넌트) — 테마 토큰의 원천
│  └─ Pretendard-*.otf           # 9개, 원본 보관(사용자가 추가 예정). static/fonts/로 복사해 사용(DESIGN §9.2)
├─ report/
│  └─ report.md                  # 변경 기록(CLAUDE.md 형식, 최신이 위)
│
├─ app.py                        # 진입점: 페이지 설정 → 상태 초기화 → 공통 셸 → st.navigation 실행
│
├─ core/                         # 화면과 무관한 기반 계층
│  ├─ __init__.py
│  ├─ config.py                  # 경로, 페이지 키, 상수(카드 10개, 분야 막대 8개 등), 색 의미(파랑/청록/주황)
│  ├─ data_loader.py             # processed parquet 로더(@st.cache_data), 없으면 build 안내
│  ├─ quality.py                 # 결측 감사: ≥50% 제외, 30~50% 주의 목록 생성
│  ├─ state.py                   # session_state 스키마·초기화·접근 함수(스크랩/계획/조건/페이지 필터)
│  ├─ persistence.py             # 브라우저 로컬 저장 ↔ session_state 동기화
│  ├─ routing.py                 # 페이지 레지스트리, 페이지 간 전달값(handoff), switch_page 래퍼
│  ├─ theme.py                   # DESIGN.md 기반 토큰(색·치수 CHART·움직임 MOTION), CSS 주입
│  ├─ datasets.py                # 화면 공용 가공 프레임(캐시): 기업·공고·직무·대표 회차, 한국 날짜 today()
│
├─ analytics/                    # 순수 함수(데이터프레임 in → 데이터프레임/값 out). Streamlit import 금지
│  ├─ __init__.py
│  ├─ common.py                  # 고유 ID 집계, 자기 필터 제외 집계, 10개 페이지 분할, 정렬 유틸
│  ├─ overview.py                # 홈 M03 오버뷰 수치(각 분석 화면과 같은 함수 재사용)
│  ├─ industry.py                # I01~I10
│  ├─ jobs.py                    # J01~J06 (직무 지도, 기술 교집합)
│  ├─ learning.py                # S01~S08, 7.1 키워드→교육 검색, 7.2 그룹·정렬
│  ├─ postings.py                # H01~H06
│  ├─ companies.py               # C01~C03, 분야·키워드 집계, 기업 정렬(방산 우선)
│  ├─ defense.py                 # 3.5.1 방산 근거 집단 배정, 하이라이트 규칙
│  ├─ dart.py                    # C04~C06 DART 표 파싱·검증·지표 추출
│  └─ roadmap.py                 # 9.3 다음 행동 생성, 9.6 '지금 필요한 도움' 이동 제안
│
├─ components/                   # 재사용 UI 조각(Streamlit 사용)
│  ├─ __init__.py
│  ├─ shell.py                   # 공통 셸: 상단바, 좌측 하단 문맥 안내, 오른쪽 준비 경로 패널
│  ├─ page_intro.py              # V21 작은 페이지 표시 + 질문형 제목 + 짧은 설명
│  ├─ chart_card.py              # ChartCard: 제목 → 본문 → 출처/단위/분모 한 줄 → '근거 자세히'(한계·제외 컬럼·숫자 표)
│  ├─ charts.py                  # ECharts 테마·가로막대(그라데이션)·세로막대·스파크라인·히트맵·대한민국 시·도 지도·트리맵, 클릭 콜백
│  ├─ effects.py                 # components.v2: StatTile 카운트업
│  ├─ home_hero.py(.js·.css)     # components.v2: 홈 요약 카드 + 3D 드론 진입(M01·M02, 요청 P)
│  ├─ cards.py                   # 직무/교육/공고/기업 카드(3.4)
│  ├─ dialogs.py                 # 기업/직무/공고/스크랩/기업 더보기 상세 팝업(st.dialog)
│  ├─ filters.py                 # 칩·막대 공용 필터 위젯, 필터 요약·해제
│  ├─ badges.py                  # 근거 배지(방산 근거·결측 주의·자료 미수록)
│  ├─ (empty_state.py)           # 만들지 않음(P4): 빈 상태는 research 14장 문구를 각 화면에서 직접 사용
│  ├─ browser.py                 # components.v2: 사이드바 ☀/☾ 테마 토글 + 선택 상태 브라우저 저장(7.2)
│  ├─ tables.py                  # streamlit-aggrid 인터랙티브 표(행 호버·정렬·필터·검색)
│
├─ content/                      # 편집 콘텐츠(코드와 분리)
│  ├─ page_intros.py             # research 3.9 소개 문구 5개
│  ├─ module_meta.py             # 모듈 ID별 source_ref·기준시점·단위·분모·필터 범위·한계(좌측 안내·근거 상세 공용)
│  ├─ activity_tags.py           # J01 활동 태그(중분류 기준 편집 규칙, 검토 대상)
│  └─ usage_guide.py             # 홈 M04 이용 안내 3단계 + 기능 Q&A
│
├─ views/                        # st.Page 5개 + 04의 하위 페이지 2개
│  ├─ home.py                    # M01~M04
│  ├─ p01_industry.py            # I01~I03 (+확장 I04~I10 펼치기)
│  ├─ p02_jobs.py                # J01~J03, J05 (+J04, J06)
│  ├─ p03_learning.py            # S02~S04 (+S05, S07, S08). S01·S06 삭제(v0.12)
│  ├─ p04_recruit.py             # 상위 페이지 '채용·기업 탐색': 소개 → 하위 탭 바 → 활성 하위 페이지
│  └─ recruit/
│     ├─ __init__.py
│     ├─ postings.py             # 하위 '채용 현황' render(): H01, H02, H04, H06 (+H03, H05 조건부)
│     └─ companies.py            # 하위 '기업 탐색' render(): C01~C03 (+C04~C06 DART 팝업)
│
├─ static/                       # config.toml의 enableStaticServing으로 제공
│  ├─ fonts/Pretendard-*.otf     # design/의 OTF 복사본(300/400/500/600/700), config.toml [[theme.fontFaces]]가 참조
│  ├─ img/drone.png              # 브랜드 중립 3D 느낌 드론 이미지(자산 준비 필요, 17장 Q5)
│  └─ css/base.css               # 레이아웃 폭·카드·배지·반응형 규칙(토큰은 theme.py가 주입)
│
├─ scripts/
│  ├─ place_raw_data.py          # P0: datas.zip → data/raw·reference 배치 + 해시 검증(완료)
│  ├─ export_html.py             # 9.8: 캡처 수신(serve)·한 파일 조립(build) → html/<버전>.html
│  ├─ export_capture.js          # 9.8: 브라우저에서 실행하는 화면 캡처 함수
│  ├─ build_data.py              # raw → processed parquet 생성 + 계약 검사
│  └─ draft_bridges.py           # 관계표 초안 자동 생성(review_status=draft)
│
├─ data/                         # 3장 참고
│  ├─ raw/ …                     # 선별 원본(수정 금지)
│  ├─ reference/ …               # 검산 전용(테스트만 읽음)
│  ├─ bridges/ …                 # 사람이 검토하는 관계표 CSV + README.md(검토 안내·초안 규칙 A/B)
│  ├─ content/ …                 # 편집 데이터 CSV(프로젝트 제안 등)
│  └─ processed/ …               # 빌드 산출물(parquet, 재생성 가능, git 제외 권장)
│
├─ reports/
│  └─ data_audit.md              # build_data.py가 함께 생성(별도 audit_data.py 없음)
│
└─ tests/
   ├─ test_data_contract.py      # 행 수·고유 ID·조인 무결성(1.2절 수치)
   ├─ test_quality.py            # 결측 규칙 적용 여부
   ├─ test_analytics.py          # 집계 규칙(01=05 일치, 자기 필터 제외, 10개 분할 등)
   ├─ test_state.py              # 스크랩/계획 독립성, 목표 변경, 되돌리기
   └─ test_app_smoke.py          # streamlit.testing.v1.AppTest로 5개 페이지 + 04 하위 2개 렌더
```

설계 원칙
- `analytics/`는 Streamlit을 import하지 않는다 → pytest로 바로 검증 가능.
- `views/`는 **배치만** 담당한다(analytics 호출 → components로 그리기). 계산 로직을 views에 두지 않는다.
- 화면 폴더 이름은 `views/`. Streamlit이 `pages/` 폴더를 자동 페이지로 인식하는 동작과 섞이지 않게 한다(testDash에서 확인한 주의점).

---

## 3 data 폴더 구성과 선별 기준 (조건 2 반영)

> 이 절은 **계획**이다. 폴더 생성·파일 복사는 구현 지시 후 `P0` 단계에서 수행한다.

### 3.1 선별 기준

- research 11장 판단이 `기본`·`확장`·`조건부`이고 화면에서 **실제로 읽는** 파일 → `data/raw/`
- `보조` 중 화면에 직접 쓰는 파일(C03 근거 원문 등) → `data/raw/`
- `보조` 중 **검산·대조 전용**이며 테스트에서 쓸 파일 → `data/reference/`
- `보류`, 출처 추적용 원문 보관본, 검증본과 중복되는 원본, CMP와 연결되지 않은 DC 체계 → 복사하지 않음(원본은 `../datas.zip`에 그대로 보존)
- 파일명·내용은 원본 그대로 유지. 도메인별 하위 폴더로만 나눈다.

### 3.2 `data/raw/` — 앱이 읽는 원본 39개 + DART 4묶음

| 하위 폴더 | 파일 | research 판단 | 사용 모듈 |
|---|---|---|---|
| `industry/` | `Industry_Size_Annual_Trends.csv` | 기본 | I01, M03 |
| | `Public_Agency_Drone_Use_Cases.csv` | 기본 | I02 |
| | `Registered_Operator_Activities.csv` | 확장 | I10 |
| | `Employment_Outlook.csv` | 확장 | I10 |
| | `Export_Competitiveness_Trade.csv` | 조건부 | I09 (지표 4종만) |
| | `Patent_Statistics_Ranking.csv` | 확장 | I07 |
| `policy/` | `2024_2026_Budget_By_Project.csv` | 확장 | I08 |
| | `2027_Defense_Budget_Drone.csv` | 확장 | I08 |
| `rnd/` | `NTIS_National_RnD_Project_Master.csv` | 기본 | I03 |
| | `NTIS_Project_Topic_Relations_Long.csv` | 기본 | I03 |
| | `NTIS_Joint_Research_Relations.csv` | 확장 | I06 |
| `procurement/` | `DAPA_Drone_Contracts.csv` | 조건부 | I05, C03 |
| | `PPS_Drone_Bids.csv` | 조건부 | I05, C03 |
| `defense/` | `Defense_Drone_Tech_Standard.csv` | 기본 | I04, J04 |
| | `Technology_Job_Mapping.csv` | 기본 | I04, J04 |
| | `Business_Area_Defense_Relations.csv` | 보조(화면 설명) | I04, C03 |
| | `Company_Defense_Evidence_Ledger.csv` | 기본 | C03, H03, 방산 집단 |
| | `Defense_Cost_Certified_Companies.csv` | 보조(근거 원문) | C03 |
| | `Swarm_Drone_Registered_Companies.csv` | 보조(근거 원문) | C03 |
| `jobs/` | `Drone_Job_Classification.csv` | 기본 | J01~J06 |
| | `Required_Skills_By_Job_Long.csv` | 기본 | J05, S01 |
| | `Workplace_Type_By_Job_Long.csv` | 기본 | J03 |
| | `Company_Examples_By_Job_Long.csv` | 기본 | J03 |
| | `Actual_Job_Posting_Evidence.csv` | 기본 | J03 |
| `learning/` | `selected_skill_learning_courses.csv` | 기본 | S01, S02 |
| | `Training_Course_drone.csv` | 기본 | S04 |
| | `Training_Course_Master_keywords.csv` | 기본 | S04 |
| | `Training_Session_Analysis_drone.csv` | 기본 | S04, S05 |
| | `Training_Session_Analysis_keywords.csv` | 기본 | S04, S05 |
| `certification/` | `2024_Cumulative_Certifications.csv` | 확장 | S07 |
| | `Annual_Certification_Issuance.csv` | 확장 | S07 |
| | `Pilot_Certifications_By_Period.csv` | 확장 | S07 |
| | `Private_Certification_Status.csv` | 확장 | S07 |
| `postings/` | `Job_Posting_Analysis_Data.csv` | 기본 | H01~H06, S08 |
| | `Job_Posting_Keyword_Frequency.csv` | 기본 보조 | S03, S07 |
| `companies/` | `Company_Organization_Master_Normalized.csv` | 기본 | C01 전체(264 기준) |
| | `Drone_Company_Jobseeker_Database.csv` | 기본 | C01, C02 |
| | `Company_Overview_Normalized.csv` | 기본 | C02, DART 팝업 |
| | `Company_Business_Area_Links_Verified.csv` | 기본 | I02, C01 |
| `dart/` | `02_product_service_data/`(table_list + tables 32) | 조건부 | C04 |
| | `03_revenue_export_data/`(table_list + tables 51) | 조건부 | C05 |
| | `05_research_personnel_data/`(table_list + tables 7) | 조건부 | C06 |
| | `06_research_development_expense_data/`(table_list + tables 38) | 조건부 | C06 |

DART는 내부 ZIP을 풀어 폴더로 둔다(`data/raw/dart/<묶음>/<묶음>_table_list.csv`, `.../tables/*.csv`). `table_list`의 `데이터CSV` 값(`tables/…csv`)이 그대로 상대 경로로 작동한다. 목록의 `group_zip`(이전 한글 묶음명)은 원본 분류값으로 보존한다.

### 3.3 `data/reference/` — 검산 전용 4개 (앱 화면은 읽지 않음)

| 파일 | 테스트 용도 |
|---|---|
| `Company_Count_By_Business_Area.csv` | 관계표에서 재집계한 분야별 고유 기업 수와 대조 |
| `Supply_Demand_By_Region.csv` | S08 지역별 공고·비원격 과정 재집계 검산 |
| `Company_Defense_Evidence_Verified.csv` | 원장 106행과 evidence_id 대조(212건 중복 집계 방지 테스트) |
| `Company_Master_Verified.csv` | 300 vs 264 범위·명칭 별칭 차이 확인(CMP0002 LIG 명칭 등) |

### 3.4 복사하지 않는 파일 16개와 이유

| 파일 | 이유 |
|---|---|
| `2024_2026_Budget_Execution_By_Function.csv` | research '보류' — 진로 흐름과 연결 약함 |
| `Public_Sector_Drone_Inventory.csv` | research '보류' — 기관 범위 확정 불가 |
| `Company_Business_Area_Links.csv` | 검증본과 같은 관계의 원본. 원문은 검증본 `record_json.original`로 추적 가능 |
| `Company_Count_By_Keyword.csv` | DC 체계 집계. CMP와 혼합 금지, 브리지 전 사용 보류 |
| `Company_Keyword_Matrix.csv` | DC 체계(341행). `company_identity_bridge` 완성 전 사용 보류 |
| `Company_Keyword_Relations_Long.csv` | 위와 동일 |
| `Drone_Portal_Company_Directory.csv` | 239개 원본 확인용. 대표 목록과 중복 |
| `Defense_Preprocessing_Raw_Data.csv` | 출처 추적용 원문 보관 |
| `Industry_Survey_Raw_Data.csv` | 출처 추적용 원문 보관 |
| `NTIS_Prior_Data_Cleaned.csv` / `NTIS_Prior_Data_Exact_Match.csv` | 이전 자료 반영 이력. 화면·집계에 쓰지 않음 |
| `NTIS_Project_ID_Relations_Long.csv` | 다중 과제번호 추적용. 마스터의 `all_project_numbers_raw`로 대체 |
| `Patent_Ranking_Verified.csv` | Statistics와 동일 집계의 검증 포장본 |
| `Pilot_Certifications_By_Aircraft.csv` | 누적 원본과 이중 합산 위험, 대조용 |
| `Public_Agency_Drone_Inventory_Verified.csv` | Use_Cases와 동일 30행의 검증 포장본 |
| `Defense_Drone_Tech_Class_Verified.csv` | Standard와 동일 12개 기술의 검증 포장본 |

합계: raw 39 + reference 4 + 제외 16 = 59 (최상위 CSV 전체). DC 체계 파일은 확장 단계에서 브리지를 만들 때 다시 추가한다.

### 3.5 `data/bridges/`, `data/content/`, `data/processed/`

- `bridges/`: research 10.2의 관계표. **사람이 검토하는 CSV**이며 `review_status ∈ {draft, reviewed, rejected}` 필수. 앱은 `reviewed`만 확정 연결로, `draft`는 '검토 전 후보' 배지로 표시.
  - 1차 구현에 필요: `application_job_bridge.csv`, `job_posting_category_bridge.csv`, `posting_company_bridge.csv`, `skill_dictionary.csv`, `company_identity_bridge.csv`(최소 `CMP0003→CMP0002` 1행)
  - 확장 시: `technology_job_bridge.csv`, `company_keyword_link.csv`, `posting_skill_evidence.csv`
- `content/`: `project_suggestion.csv`(S06 편집 제안 6개 방향, research 7장 표 기반) — S06 삭제(v0.12)로 **화면에서 미사용**, 파일 삭제 여부 사용자 확인 대기
- `processed/`: `build_data.py` 산출물. 언제든 재생성 가능하므로 원본으로 취급하지 않는다.

---

## 4 기술 스택과 실행 환경

| 구분 | 선택 | 이유 |
|---|---|---|
| Python | 3.12 가상환경(`main/.venv`) — **확정** | 호환성 우선(사용자 결정). 로컬에 3.12 미설치 → P0 전 설치 필요 |
| streamlit | `>=1.50,<2` | `st.navigation(position="hidden")`, `st.switch_page`, `st.query_params`, `st.dialog`, `plotly_chart(on_select)`, `st.pills`, `st.context.theme`, `st.html` |
| streamlit-echarts | 0.7.0 | 차트(ECharts): 등장·전환 애니메이션, 클릭 선택, 트리맵·히트맵·시·도 지도(GeoJSON 등록). plotly 6.9.0은 설치돼 있으나 P4 이후 미사용(삭제 여부 확인 대기) |
| pandas / pyarrow | `>=2.2` / 최신 | parquet 캐시(17MB NTIS, 14MB PPS 로딩 시간 단축) |
| pytest | 최신 | analytics·state·AppTest |
| 기타 | 추가 외부 패키지 없이 시작 | 로컬 저장·드론은 정적 커스텀 컴포넌트로 직접 구현 |

`.streamlit/config.toml`: 테마·폰트 값은 **`design/DESIGN.md` §9.2~9.3을 그대로 사용**한다(이 문서에 따로 적지 않음). 그 외 추가 항목:
```toml
[server]
enableStaticServing = true      # static/fonts, static/img 제공

[client]
toolbarMode = "minimal"
```
DESIGN §9.3의 테마 키는 streamlit 1.64 `config show`로 존재를 확인했다(2026-09-30, testDash 환경). 3.12 환경에 설치된 버전으로 P0에서 다시 확인한다.

실행: `.\run.ps1` → `streamlit run app.py`

---

## 5 앱 셸과 라우팅 설계

### 5.1 `app.py` 실행 순서

```
1. st.set_page_config(page_title="드론 진로 탐색", layout="wide", initial_sidebar_state="expanded")
2. theme.inject_css()                 # base.css + DESIGN 토큰(현재 테마 기준)
3. state.init()                       # 스키마 기본값 채우기(이미 있으면 유지)
4. persistence.sync()                 # 최초 1회 로컬 저장 → session_state 복원
5. nav = st.navigation(routing.PAGES, position="hidden")   # 기본 메뉴 숨김, URL 라우팅만 사용
6. shell.render_nav(nav)              # 사이드바 메뉴 직접 렌더(9.5.1: 04 상위 항목 + 하위 메뉴 펼침/접힘)
   shell.render_sidebar_context()     # 좌측 하단 문맥 안내(메뉴 아래)
7. shell.render_topbar()              # 서비스명·현재 화면·선택 요약·스크랩(건수)·테마 안내
8. with shell.frame():                # 중앙/오른쪽 2열 → 중앙에서 nav.run(), 오른쪽에 준비 경로
       nav.run()
```

`shell.frame()`은 `st.columns([중앙, 오른쪽], gap="small")`을 만들고 오른쪽 열에 `render_roadmap_panel()`을 그린다. 페이지 파일은 중앙 열 컨텍스트 안에서 실행되므로 각 view는 레이아웃을 신경 쓰지 않는다.

### 5.2 페이지 레지스트리 (`core/routing.py`)

```python
PAGES = [
    st.Page("views/home.py", title="홈", url_path="home", default=True),
    st.Page("views/p01_industry.py", title="01 산업 이해", url_path="industry"),
    st.Page("views/p02_jobs.py", title="02 직무 탐색", url_path="jobs"),
    st.Page("views/p03_learning.py", title="03 준비 역량", url_path="learning"),
    st.Page("views/p04_recruit.py", title="04 채용·기업 탐색", url_path="recruit"),
]

NAV_TREE = [                      # shell.render_nav()가 그리는 사이드바 메뉴 정의
    {"page": "home"}, {"page": "industry"}, {"page": "jobs"}, {"page": "learning"},
    {"page": "recruit", "children": [
        {"sub": "postings",  "title": "채용 현황"},
        {"sub": "companies", "title": "기업 탐색"},
    ]},
]
RECRUIT_SUBS = ("postings", "companies")   # 기본값 "postings"
```
- '04 채용·기업 탐색'은 st.Page 1개이고, '채용 현황'·'기업 탐색'은 그 안의 하위 페이지다(9.5). 사이드바에서는 상위 항목 아래 하위 메뉴로, 중앙에서는 탭으로 전환한다. 두 하위 페이지는 각자 전체 중앙 영역을 쓰고 서로의 카드 목록을 섞지 않는다(V16 취지 유지).
- 페이지 이동 함수 `go(page_key, sub=None, handoff=None)`: `state.handoff`에 전달값을, `sub`가 있으면 이동 요청(`_pending_sub`)을 남기고 `st.switch_page(…, query_params={"sub": sub})`. 다음 실행 첫머리의 `routing.sync_sub()`가 하위 페이지 상태에 반영한다(위젯이 그려진 뒤에는 값을 바꿀 수 없기 때문, 9.5.0). 도착한 쪽은 `routing.consume_handoff(target)`로 한 번만 읽는다(target은 `"industry"`처럼 페이지 키, 04는 `"recruit.postings"`/`"recruit.companies"`).
- research 4.4의 전달 규칙을 handoff 타입으로 고정:

| 이동 | 대상 | handoff 키 |
|---|---|---|
| 01→02 | jobs | `{"from":"I02","area": business_category}` |
| 01·02→기업 탐색 | recruit, `sub="companies"` | `{"area": …}` 또는 `{"company_ids":[…]}` |
| 02→03 | learning | `{"job_id":…, "skill":…}` |
| 03→채용 현황 | recruit, `sub="postings"` | `{"job_major_category":[…]}` (브리지 reviewed/draft 구분 포함) |
| 채용 현황→기업 탐색 | 같은 페이지, `sub="companies"` | `{"company_id":…}` (posting_company_bridge 확정만) |
| 기업 탐색→채용 현황 | 같은 페이지, `sub="postings"` | `{"company_id":…}` → 연결 공고만, 0건이면 설명 |
| 채용 현황·기업 탐색→03 | learning | `{"keyword":…, "origin":("H04", posting_id)}` |

- 페이지별 필터·10개 묶음·스크롤 상태는 `state.page[key]` 네임스페이스에 보관 → 재방문 시 복원(4.2 '페이지별 복원 상태'). 04의 두 하위 페이지는 `state.page["postings"]`, `state.page["companies"]`로 따로 보관한다.

### 5.3 폭·반응형 (V18)

| 너비 | Streamlit 구현 | 비고 |
|---|---|---|
| ≥1440 | 사이드바 240px(Green Deck), 오른쪽 열 260px 고정(`st.columns` + CSS) | 1920 기준 중앙 약 1300px |
| 1280~1439 | 사이드바 240 유지, 오른쪽 240px | **아이콘 레일(60px)과 접힌 상태의 하위 메뉴 플라이아웃은 Streamlit 기본 사이드바로 구현이 어려움** → 17장 Q3. 사이드바를 접어도 04 하위 페이지는 중앙 탭으로 이동 가능(9.5.2) |
| 768~1279 | 오른쪽 패널을 '내 준비 경로' 토글 버튼으로 접기(`state.ui.roadmap_open`) | |
| <768 | Streamlit 기본 동작으로 열이 세로 쌓임, 사이드바 접힘 | 오른쪽 경로는 본문 아래로 |

CSS 선택자는 Streamlit 내부 DOM에 의존하므로 `static/css/base.css` 한 곳에만 모으고, 버전 업그레이드 시 점검 목록으로 관리한다.

### 5.4 좌측 하단 문맥 안내 (V17) — Streamlit 제약 반영

Streamlit은 마우스 호버 이벤트를 서버로 보내지 않는다. 따라서 우선순위를 다음처럼 구현한다.

| research 우선순위 | 구현 |
|---|---|
| 사용자 고정 | 안내 카드의 '고정' 토글 → `state.context.pinned=True` |
| 키보드/명시적 선택 | 각 `chart_card` 헤더의 '이 데이터는?' 버튼, 차트 선택(on_select) 이벤트 → `state.context.module_id` 갱신 |
| 마우스 대상 | **1차 구현 제외**(서버 왕복 불가). 대신 Plotly 툴팁에 단위·분모·출처 요약을 넣어 호버 시 정보는 확보 |
| 현재 보이는 모듈 | 1차 구현 제외(스크롤 감지 불가) |
| 페이지 기본 안내 | 페이지 진입 시 `module_meta[page_default]` |

페이지가 바뀌면 고정 해제. 안내 문구는 `content/module_meta.py` 하나에서 읽어 차트 캡션·근거 상세·좌측 안내가 같은 정의를 공유한다.

### 5.5 테마 (V08)

- `config.toml`에 라이트/다크 두 테마를 정의하고, **사이드바 하단 ☀ 라이트 / ☾ 다크 토글**로 전환한다(2026-09-30 구현). Streamlit은 파이썬에서 테마를 바꿀 수 없어 토글이 Streamlit의 테마 저장값(localStorage)을 바꾸고 새로고침하며, 선택 상태는 7.2 브라우저 저장으로 유지된다. 첫 방문 기본은 다크(Green Deck dark-first).
- 코드에서는 `st.context.theme.type`('light'|'dark')을 읽어 Plotly 템플릿·배지·카드 CSS 토큰을 고른다(`theme.plotly_template()`).
- 의미 색 고정(2026-09-30 Green Deck 전환 후): **녹색 = 분석 강조·상호작용**(다크 #1DB954 / 라이트 #0A873A), **반전 칩(흰 바탕·검은 글자) + ✓ = 사용자 선택·학습**(청록은 녹색과 구분이 어려워 폐기), 주황 = 국방 관련(직접확인 진한 주황 + 빗금, 후보 옅은 주황 + 점선). 테마가 바뀌어도 의미는 불변(DESIGN §4·§9·§12).
- 테마 토글 위치: 왼쪽 사이드바 하단(사용자 요청, 17장 Q4 확정).

---

## 6 데이터 파이프라인

### 6.1 흐름

```
data/raw/*.csv ─┐
data/bridges/*  ├─ scripts/build_data.py ─→ data/processed/*.parquet ─→ core/data_loader.py(@st.cache_data)
data/content/*  ┘        │                                                   └→ analytics/* → views/*
                         └─ 계약 검사 실패 시 빌드 중단 + reports/data_audit.md
```

- 앱 실행 중에는 raw CSV를 직접 파싱하지 않는다(로딩 속도·일관성).
- **향후 변경 예정 — 로컬 DB 전환(사용자 지시, 2026-09-30):** 화면이 확정된 뒤 마지막 단계(14장 P9)에서 데이터 소스를 CSV/parquet에서 **로컬 DB**로 바꾼다. 지금부터 지킬 것:
  - 데이터 접근은 `core/data_loader.py`의 `load_table(name) -> DataFrame` **한 곳**으로만 한다. analytics·views·components는 파일 경로·포맷을 모르며 테이블 이름(6.2의 산출 테이블명)만 쓴다.
  - 6.2의 산출 테이블명·컬럼명을 그대로 DB 테이블 스키마로 옮길 수 있게 유지한다(한글 원본 컬럼은 build 단계에서 영문 이름으로 정규화).
  - 결측 규칙·계약 검사는 소스와 무관하게 로더 이후 데이터에 대해 동작하도록 둔다.
  - DB 종류(SQLite/PostgreSQL/MySQL 등)는 전환 시점에 결정(17장 Q12).
- `data_loader`는 processed 파일이 없거나 raw보다 오래되면 화면에 '데이터 빌드 필요: python scripts/build_data.py' 안내를 띄운다.

### 6.2 processed 테이블 명세(초안)

| 산출 테이블 | 원천 | 주요 처리 | 키 |
|---|---|---|---|
| `org` | 조직 마스터 264 + 프로필 239 + DART 개요 22 | 264 기준 left join, `has_profile`, `has_dart`(DART 개요는 `dart_` 접두), 별칭. 프로필 한글 컬럼은 영문으로 정규화. **P1 반영 완료. `defense_group`은 Q2 확정 후 P4(analytics/defense.py)에서, `org_type`은 원천 컬럼 부재로 미정(Q13)** | `company_id` |
| `org_area` | 사업 분야 검증본 1,322 | 264에 존재하는 ID만, `(company_id, business_category)` 중복 제거, `defense_relation` 유지 | (company_id, category) |
| `defense_evidence` | 원장 106 | 264 미연결 36개 대상은 `in_master=False`로 별도 보관 | `evidence_id` |
| `jobs` | 직무 사전 209 | 제외 컬럼 제거(P1 완료). `activity_tags`(J01 활동 태그, content 규칙)는 P4 | `job_id` |
| `job_skills` | 645 | 원문 그대로(P1). `skill_dictionary` 정규화 키는 P2 브리지 이후 | (job_id, skill) |
| `job_workplaces` / `job_employer_examples` / `job_posting_examples` | 769 / 668 / 20 | 그대로 | job_id |
| `skill_resources` | 915 | `resource_key = source_type + course_id/url`, 고용24 14 vs 외부 30 구분, 제외 컬럼 제거 | 행 단위 |
| `courses` | 드론 148 + 키워드 290 | `source_group ∈ {drone, keyword}` 추가 후 union, `course_id` 중복 검사 | `course_id` |
| `offerings` | 1,262 + 1,133 | union(`source_group`), 날짜 datetime 변환. `province_std`: 표기 차이만 통일(`경기도`→`경기`), `전남광주`(27회차)는 광주·전남 중 어느 쪽인지 근거가 없어 그대로 두고 화면에 별도 표기(P4). `date_status ∈ {시작 전, 진행 중, 종료, 일정 미수록}`(빌드 시 기준일 아님 — 화면에서 today로 계산) | `offering_id` |
| `postings` | 135 | 제외 컬럼 제거, `career_type`·`education_normalized` 그대로, `employment_types` → 리스트 | `posting_id` |
| `bridge_<파일명>` | `data/bridges/*.csv` 전부 | 그대로 적재(결측 감사 제외). 계약 검사: `review_status ∈ {draft, reviewed, rejected}`, company_id·job_id·posting_id 참조 무결성, 공고당 1행. 예: `bridge_posting_company_bridge`(확정 1개 또는 미연결) | 파일별 |
| `posting_kw_freq` | 189 | 그대로(직무 필터 불가 플래그) | |
| `industry_size` | 4 | 연도별, `revenue_check_pass` 유지 | reference_year |
| `public_use_cases` | 30 | 자산 그룹 수와 `quantity` 구분 | asset_group_id |
| `ntis_projects` | 8,078 중 필요한 열 | `analysis_scope` 유지(기본 HIGH_CONFIDENCE 2,936) | project_id |
| `ntis_topics` | 37,523 | 그대로 | (project_id, topic) |
| `ntis_collab` | 5,160 | 확장 | |
| `defense_tech` | Standard 12 + Mapping 12 | `technology_id` 조인 | technology_id |
| `dapa` / `pps` | 416 / 5,226 | 조건부. DAPA `contract_no` 중복 표시, PPS 관련성 플래그(7단계에서) | |
| `patents`, `budget`, `budget_2027`, `export`, `operators`, `outlook`, `certs_*` | 각 원본 | 단위·기간 필드 보존, 합산 금지 플래그 | |
| `dart_tables` | 4개 table_list | `canonical_company_id` 부여(브리지), 표 메타 | table_id |
| `dart_metric_long` | 128 표 | 10.3 규칙 통과 값만, `quality_status` | (company, table, row, period, metric) |

### 6.3 결측 규칙 적용 결과 (사용자 확정 규칙 × 실측)

`core/quality.py`가 빌드 시 자동 산출하며, 아래는 현재 데이터 기준 예상 결과다. 제외 목록은 README와 해당 화면의 '근거 자세히'에 사유와 함께 남긴다.

**결측으로 세는 값 (P1에서 확정):** 빈 값(NaN·공백)과, 원본이 '정보 없음'을 표시하려고 넣은 문자열 `공개정보 확인 불가` · `공개 채용공고 확인 불가` · `직무별 공개 급여 근거 없음`(`core/quality.py` `MISSING_TOKENS`). `불명`·`미공개`·`없음`은 의미 있는 범주라 결측으로 세지 않는다.
**union 통일:** 함께 합치는 파일(과정 2개, 회차 2개)은 한쪽에서 제외된 컬럼을 양쪽 모두 제외한다. 이 때문에 드론 과정·회차의 `ncs_code_standard`(결측 4%/1%)와 `standard_confirmed_flag`도 제외되어 NCS 표준코드 필터는 없다(`ncs_name`만).

**제외(결측 ≥ 50%)**

| 파일 | 제외 컬럼(결측률) | 화면 영향 |
|---|---|---|
| `Job_Posting_Analysis_Data` | `career_min_years`(52), `career_max_years`(84), `annual_salary_min_10k_krw`(93), `annual_salary_max_10k_krw`(100), `major_requirement_raw`(92), `duplicate_candidate_type`(97) | **H02 경력 연수 수치 차트 없음** → `career_type` 범주 + `career_requirement_raw` 원문. **H05 급여 수치 차트 없음** → `salary_type` 구성 + `salary_raw` 원문 표 |
| `Drone_Job_Classification` | `actual_employer`·`actual_posting_title`·`actual_posting_url`(90), `salary_min/max/midpoint`(97~99) | J03 실제 사례는 `Actual_Job_Posting_Evidence`(20행, 결측 없음)로 제공 |
| `Actual_Job_Posting_Evidence` | `salary_min_10k_krw`(70), `salary_max_10k_krw`(90) | 급여는 `salary_original_text`만 |
| `Drone_Company_Jobseeker_Database` | `현재_채용공고_수`(88), `최소_연봉_만원`·`최대_연봉_만원`(100) 외 **'공개정보 확인 불가'를 결측으로 셀 때 추가 제외 30개**: 채용·경력·학력·자격·기술·급여·고용형태 관련 전부, `사업장_주소`(75), `기업_규모`(62), `직원_수`(87), `매출액`(70), `설립일_설립연도`(83), 복지·근무 조건, `개발_드론_시스템`, `특허_인증`, `방산_연계_근거` 등 — 전체 목록은 `reports/data_audit.md` | 기업 연봉 차트 없음. **C02 기업 상세에서 주소·규모·직원 수·매출 표시 없음**(주소 '근무지 아님' 표기 항목도 불필요). 기업 상세 본문은 사업 분야·제품·드론 세부 분야·출처로 구성 |
| `Training_Session_Analysis_drone/keywords` | `enrolled`(54/50), `completion_rate`(61/63) | 수료율·등록 인원 표시 안 함. 두 파일을 union하므로 **양쪽 모두 제외로 통일** |
| `Training_Session_Analysis_keywords` | `ncs_code_standard`(97) | 회차에서도 NCS 표준코드 필터 없음(과정 파일과 동일 처리) |
| `Training_Course_Master_keywords` | `ncs_code_standard`·`standard_confirmed_flag`(96), `certificate_course_flag`·`estimated_certificate_type`(77), `related_certificate_raw`(95) | 키워드 과정은 NCS 표준코드 필터 없음 → `ncs_name`만 |
| `Training_Course_drone` | `related_certificate_raw`(90) | 통합 스키마 일관성을 위해 자격 관련 3컬럼은 두 파일 모두 제외 |
| `selected_skill_learning_courses` | `recruitment_period`(70), `alternative_resource`(74) | 모집 기간은 회차 파일의 날짜로만 판단 |
| `Company_Defense_Evidence_Ledger` | `source_page`(94) | 페이지 번호 미표시 |
| `Defense_Cost_Certified_Companies` | `4차 갱신일`·`5차 갱신일`(92) | 유효기간 시작·종료일만 사용 |
| `NTIS_Joint_Research_Relations` | `subcontract_project_title`(82) | 확장 I06에서 미사용 |
| `NTIS_National_RnD_Project_Master` | `prior_data_source`(100) | 미사용 |
| `Export_Competitiveness_Trade` | `subcategory`(86) | I09는 `item` 기준 |

**주의 배지(30~50%) — 표본 n 함께 표기**

| 파일 | 컬럼(결측률) | 처리 |
|---|---|---|
| `Job_Posting_Analysis_Data` | `salary_raw`(37) | 원문 표에 '급여 원문 있음 n=85/135' 표기 |
| `Training_Session_Analysis_drone` | `satisfaction_score_100`(35) | 추천·정렬에 쓰지 않음(research S05). 상세에만 '주의' |
| `Training_Course_drone` | `certificate_course_flag`·`estimated_certificate_type`(33) | 키워드 과정에서 제외되므로 통합 화면에는 쓰지 않음 |
| `PPS_Drone_Bids` | `awarded_company`·`winning_bid_krw`(49) | 조건부 I05에서만, 낙찰 정보는 '주의' |
| `Defense_Cost_Certified_Companies` | `3차 갱신일`(31) | C03 근거 원문에서 갱신일 표시 시 '주의'. 유효기간 판단에는 쓰지 않음 |

> 결정 필요: H02에서 research는 `career_min_years` 사용을 언급하지만 결측 52%로 규칙상 제외된다. 이 계획은 **규칙을 우선**했다(17장 Q1).

### 6.4 방산 근거 집단 배정 (`analytics/defense.py`, research 3.5.1)

| 조직 마스터 `defense_drone_relation_class` | 기본 비교 집단 | 추가 배지 |
|---|---|---|
| 원문 직접확인 (4) | 원문 직접확인 | — |
| 교차출처 후보 (5) | 교차출처 후보 | — |
| 방산인접 탐색후보 (25) | 방산인접 탐색후보 | — |
| 방산근거만 확인 (8) | 원장 `evidence_strength`의 가장 강한 확인 가능 근거로 위 3집단 중 하나 | '드론 활동 근거 미확인' |
| 드론근거만 확인 (21) | 방산 근거 미확인 | '드론 활동 근거 있음'(원래 분류는 상세에 보존) |
| 미분류 (201) | 방산 근거 미확인 | — |
| (공고 차트 전용) 기업 미연결 | 기업 미연결 | — |

- '방산근거만 확인' 8개의 집단 매핑 규칙(원장 `evidence_strength` → 집단)은 구현 전 표로 확정한다(17장 Q2). `evidence_strength` 값은 6종(1.2절)이며 `보조`(2건)의 배정도 함께 정한다.
- 참고 표본(공고–기업 **정확 일치 초안** 52행 기준, 브리지 검토 전): 원문 직접확인 18건/3개사, 교차출처 후보 1/1, 방산인접 탐색후보 10/5, 방산근거만 확인 7/1, 드론근거만 확인 3/2, 미분류 13/10. 방산 표본이 작으므로 모든 방산 차트·카드에 n을 표기한다(DESIGN 'Defense vs General' 1.3). 화면의 n은 항상 빌드 산출값으로 계산하고 이 참고 수치를 하드코딩하지 않는다.
- 하이라이트: 직접확인=진한 주황 실선, 후보 2종=옅은 주황 점선, 항상 근거 텍스트 동반. '방산 관련만 보기' 기본 포함 집단 = 직접확인·교차출처·인접.

### 6.5 계약 검사 (`build_data.py`가 매 빌드 실행, `tests/test_data_contract.py`에서도 사용)

- 행 수: 직무 209, 사전 기술 645, 학습 연결 915, 과정 438(148+290), 회차 2,395(1,262+1,133), 공고 135, 조직 264, 프로필 239, DART 개요 22, NTIS 8,078(고신뢰 2,936), 원장 106, DART 표 128.
- 고유성: `job_id`, `course_id`(두 파일 합쳐도 중복 없음), `offering_id`, `posting_id`, `company_id`(264).
- 조인: 프로필 239 ⊂ 마스터 264, 모든 회차의 `course_id` ∈ 과정, 학습 연결 고용24 645행의 `offering_id` ∈ 회차, 사업 분야 검증본 ID ⊂ 마스터.
- DART: `CMP0003` 표는 `canonical_company_id=CMP0002`로만 매핑(전역 치환 금지).

---

## 7 사용자 상태 설계 (`core/state.py`)

### 7.1 session_state 스키마

```python
state = {
  "profile": {                       # 04 채용 현황 '내 조건' 칩(학력·경력·희망 지역, v0.13). regions는 03 교육 정렬에도 사용
    "purpose": None,                 # "find" | "learn" | "check" (9.6 지금 필요한 도움)
    "interest_areas": [],            # 탐색 관심 분야
    "education": None, "career_type": None, "career_years": None,
    "regions": [], "allow_remote": True,
  },
  # "skills"(기술 자기보고)·plan.projects(결과물)는 v0.12, plan.learning·compare_posting_id(계획 선택)는 v0.13에서 삭제
  "plan": {
    "goal_job_id": None,             # 탐색 경로 01 목표 직무(1개 — 이후 직무 기준 필터링용)
  },
  "scrap": {                         # 9.7, 키 = f"{entity_type}:{entity_id}"
    # course·posting·company는 종류별 최대 3개(탐색 경로 02~04, v0.13). 3개가 차면 막고 안내
    "<key>": {"entity_type":…, "entity_id":…, "saved_at":…, "saved_title":…, "source_ref":…}
  },
  "undo": None,                      # 직전 취소 1건(되돌리기)
  "page": {                          # 페이지별 복원 상태
    "industry": {...}, "jobs": {...}, "learning": {...},
    # 04 활성 하위 페이지는 page 안이 아니라 위젯 키 "sub"(session_state["sub"])가 담당 — 9.5.0 참조
    "postings": {"filters":…, "page_no":0},                                   # 하위 '채용 현황' 전용
    "companies": {"area":[], "keywords":[], "page_no":0, "sort":"auto"}       # 하위 '기업 탐색' 전용
  },
  "handoff": None,
  "context": {"module_id": None, "pinned": False},
  "ui": {"highlight_defense": False, "roadmap_open": True, "home_menu_open": False, "motion": True,
         "nav_open": {"recruit": False}},   # 사이드바 04 하위 메뉴 펼침(04에 들어오면 펼침, 04 안에서 상위 클릭 = 접기/펼치기, 저장 안 함 — v0.14)
  "dialog": {"kind": None, "id": None, "return_to": None},
}
```

- 모든 변경은 `state.py`의 함수(`select_goal`, `scrap`, `unscrap`, `toggle_scrap`)로만 한다. views에서 dict를 직접 수정하지 않는다.
- 규칙 구현:
  - '학습 계획에 선택'·'비교 공고로 선택'은 삭제(v0.13, 요청 E2·충돌 2). 카드의 대표 행동은 녹색 '스크랩' 하나.
  - 목표 직무 변경 → 스크랩은 그대로 둔다(v0.12, 요청 D4 충돌 ⑤). 탐색 경로 01에서 목표 직무 '해제'(v0.13).
  - 교육·공고·기업 스크랩은 종류별 최대 3개(v0.13, 요청 E5). 3개가 찬 종류는 스크랩하지 않고 안내 토스트(`state.toggle_scrap`), 탐색 경로에서 항목별 '해제'(`state.unscrap`).
  - 직무 스크랩 버튼은 삭제(목표 직무는 '목표로 선택'으로만, 충돌 ④).
  - 교육 스크랩 단위는 과정.

### 7.2 브라우저 저장 (`core/persistence.py` + `components/browser.py`) — 구현(2026-09-30, 테마 토글과 함께 앞당김)

- 저장 대상: `profile`, `plan`, `scrap`, `ui`(움직임·탐색 경로 열림·홈 메뉴. 04 하위 메뉴 펼침은 v0.14부터, 방산 강조는 v0.21 후속(요청 M11)부터 저장 안 함 — 열 때마다 꺼짐). (페이지 필터·dialog는 세션 한정) 복원은 세션당 한 번, 형식이 맞지 않는 값은 무시(`tests/test_persistence.py`).
- 방식: 정적 HTML 커스텀 컴포넌트가 `localStorage["drone-career-v1"]`를 읽어 첫 렌더에 값을 반환 → session_state 복원. 이후 상태가 바뀐 런에서만 직렬화 JSON을 컴포넌트 인자로 넘겨 저장.
- 저장 불가(사생활 모드 등) 시 상단에 '이번 이용 중에만 유지됨' 표시.
- 스키마 버전 키(`v1`)로 이후 구조 변경 시 마이그레이션.
- 자료 갱신으로 ID가 사라지면 저장된 `saved_title`·`source_ref`를 보여 주고 '현재 자료에서 미연결' 배지(9.5).

---

## 8 공통 컴포넌트 설계

### 8.1 `chart_card(meta_id, *, key, title, subtitle, table, n)` (컨텍스트 매니저, P4 구현)

- 상단: 모듈 제목 + '이 데이터는?' 버튼(좌측 안내 갱신).
- 차트: `charts.render(options, key, height, on_click)`(ECharts, 테마는 `theme.py`에서 생성) + `theme.plotly_template()` 적용.
- 하단 캡션(항상 표시): 단위 · 분모 · 기준시점 · 출처 · 필터 적용 여부 — `module_meta[meta_id]`에서 생성.
- '근거 자세히'(`st.expander`): 계산식, 제외 컬럼, 한계, 숫자 표(`table`) — 키보드·스크린리더 대안(15.2-11).

### 8.2 카드 (`components/cards.py`, research 3.4)

| 함수 | 앞면 | 본문 클릭 | 앞면 버튼 |
|---|---|---|---|
| `job_card(row)` | 직무명, 대·중분류, 업무 1~2줄, 근무처 요약, 기술 2~3개+N, 근거 유형 | 직무 상세 dialog | 스크랩, 목표로 선택/취소 |
| `course_card(course, offerings, reasons)` | 과정명, 기관, 지역/원격, 시간, 대표 회차, 후보 이유 | 원문 링크(새 탭, `st.link_button`) | 스크랩, 학습 계획에 선택/취소, 회차 선택(`st.selectbox`) |
| `posting_card(row)` | 제목, 기업, 지역, 경력·학력, 업무 요약, '수집 공고 · 현재 모집 상태 미확인' | 공고 상세 dialog | 스크랩, 비교 공고로 선택/취소 |
| `company_card(row)` | 이름, 조직 유형, 사업 1줄, 분야 2~3개, 방산 근거 배지 | 기업 상세 dialog | 스크랩 |

- Streamlit에는 '카드 전체 클릭' 개념이 없으므로 카드 제목을 버튼(또는 '상세 보기' 버튼)으로 만든다. 버튼마다 고유 key(`f"{kind}:{id}:{action}"`)로 중복 실행 방지.
- 이모티콘 장식 없음. 아이콘이 필요하면 Streamlit Material 아이콘(`:material/...:`) + 텍스트 병기.
- 방산 하이라이트 ON이면 카드 컨테이너에 주황 테두리 CSS 클래스 + 근거 텍스트 배지.

### 8.3 상세 팝업 (`components/dialogs.py`)

- `@st.dialog(title, width="large")` 함수 5종: `company_detail`, `job_detail`, `posting_detail`, `scrap_box`, `company_more`(더보기 10개 목록).
- `st.dialog`는 동시에 하나만 → '목록 → 상세'는 같은 dialog 안에서 `state.dialog`를 바꿔 내용 전환('목록으로' 버튼이 묶음 번호 복원).
- 기업 상세는 자료 상태 3분기(DART 있음 / DART 없음·기타 자료 / 자료 부족)를 research 8.2 표 그대로. DART 섹션은 `dart_metric_long`에서 `quality_status=pass`인 값만 차트, 나머지는 '원본표 확인 필요' + 원본 표 펼치기.

### 8.4 필터 칩 ↔ 차트 동기화 (`components/filters.py`)

- 하나의 상태 키(예: `page.companies.area`)를 칩(`st.pills(selection_mode="multi")`)과 막대 on_select가 공유.
- 막대 클릭 이벤트 처리: 선택 포인트의 카테고리를 토글 → 같은 막대 재클릭 시 해제. 변경 시 `page_no=0`.
- 기본은 단일 선택, '여러 분야 선택' 토글을 켜면 같은 분류 내 OR. 서로 다른 필터 간 AND.

---

## 9 화면별 구현 계획

각 화면 공통 순서: `page_intro(page_key)` → KPI/필터 한 줄 → 메인 차트 → 선택 → 카드 → 다음 행동 링크. 아래 '1차'는 첫 구현 범위, '확장'은 `st.expander('더 알아보기')` 안, '조건부'는 데이터 검증 후 활성화.

### 9.1 홈 `views/home.py` (M01~M04)

| 모듈 | 구현 |
|---|---|
| M01 | 제목 '드론 진로 탐색' + 한 줄 설명(문구 유지, 크기는 팀원 Home 기준 44px — 요청 P2) |
| M03 | 요약 카드 4개(직무 209 · 과정 438 · 공고 135 · 조직 264, 숫자 올라가기, 마우스를 올리면 출처 한 줄)를 드론 위에. `analytics/overview.py` 같은 함수로 산출. 기존 산업 KPI 묶음·'○○ 보기' 단추 5개·매출 캡션은 삭제(요청 P2, 2026-10-02) |
| M02 | `components/home_hero.py`(팀원 Home 반영, 요청 P1): 공역 배경 + Three.js 3D 드론(static/vendor/three) + 5개 패널. 드론 클릭 = 물러나며 패널 펼침/다시 클릭·Esc = 닫힘, 패널 hover = 드론이 바라봄, 패널 클릭 = 그 방향으로 날아간 뒤 `routing.go`(P4 → `sub="postings"`, P5 → `sub="companies"`). 홈에 다시 오면 마지막에 누른 패널 방향에서 복귀 비행, 첫 방문은 2시 방향 진입. 움직임 멈춤·동작 줄이기면 비행 생략. 3D 실패 시 SVG 드론 |
| M02 대체 | 삭제(요청 P2, 사용자 결정): 5개 패널이 키보드(Tab·Enter)로도 동작 |
| M04 | 로드맵 4단계(01 산업 → 02 목표 직무 → 03 학습 스크랩 → 04 공고·기업 스크랩 = 나의 탐색 경로 01~04, 요청 P3) + 자주 묻는 질문 `st.expander`(현재 기능 기준으로 다시 씀, 요청 P4, `content/usage_guide.py`) |

- 홈 메뉴 펼침 상태는 세션 동안 유지, 새 세션은 닫힘.

### 9.2 01 산업 이해 `views/p01_industry.py`

| 모듈 | 1차/확장 | 데이터 | 시각화·동작 |
|---|---|---|---|
| I01 | 1차(짧은 1행) | `industry_size` | 업체·매출·종사자 KPI 3개(아이콘 카드 A안: 마우스를 올리면 움직이는 아이콘, 초록 숫자, v0.17 요청 I1) + 추이 펼치기(소형 선 3개, 축 분리, 펼칠 때 선이 왼쪽→오른쪽으로 그려짐, 요청 I2), 제작/활용 구성 막대. 표본 변화 주석 |
| I02 | **1차 메인(약 2/3 폭)** | `org_area`, `org`, `public_use_cases`, `bridges/application_job_bridge` | 분야별 고유 기업·기관 가로막대 + 그중 방산 근거 기업 겹침(v0.16, 요청 H2)(상위 8 + 다음 2개 흐린 미리보기 + 바로 아래 '분야 더보기 ⌄' 단추, v0.17 요청 I3) = `analytics.companies.area_counts()` **기업 탐색 하위 페이지와 같은 함수**. 선택 시 같은 패널에 업무·활용 사례 2~3개 + '관련 직무 보기'(브리지 있을 때만) / '기업 N개 보기'(→ 04 기업 탐색 handoff) |
| ~~보조(약 1/3)~~ | 삭제(v0.14) | ~~공고 지역 지도·경력 전환~~ — 04 채용 현황과 중복이라 제거(요청 F1). I02가 전체 폭, '채용 현황에서 자세히'는 분야 상세 이동 버튼 옆 |
| I03 | 1차(**상시 표시**, v0.16) | `ntis_projects`, `ntis_topics` | '드론 분야에서 연구하는 기술': 기술별 전체 과제 막대 + 그중 방산 태그 과제 겹침(요청 H1, 옛 I04 기술 그래프와 합침), 탐색 범위 토글. 기술 선택 → 활용 분야 셀(칸 클릭 = 두 태그 과제). 아래 '연구 과제 탐색' 펼치기: 조건 전체/기술/기술×활용 분야, 10개씩 페이지, 기술·칸을 누르면 자동 펼침(요청 H6·H7) |
| I04 | 1차(상시 표시) | `ntis_projects.defense_flag` | 연도별 국가 R&D 과제 누적 막대(방산 태그 vs 그 외), I03 기술 그래프와 나란히 같은 높이. (방산 기술 분야 단독 그래프는 v0.16에서 I03에 합침) |
| I04b | 확장 | `defense_tech` | 12개 기술 선택 + 국방 활용/공통 기초 기술/연결 직무 후보 비교표 |
| I06·I07·I08·I10 | 확장 | 각 원본 | research 5장 명세대로 소형 패널. 합산 금지 규칙 준수 |
| I05·I09 | 조건부 | DAPA/PPS, export | 관련성 검토 완료 후 |

### 9.3 02 직무 탐색 `views/p02_jobs.py`

| 모듈 | 1차/확장 | 구현 |
|---|---|---|
| J01 | 1차 | **v0.21(요청 M)부터 3D 홀로그램 네트워크(components/job_graph3d.py)**: 끌어서 회전·자동 회전, 대분류·중분류 클릭 = 기존 필터, 직무 = 상세 팝업, 오른쪽 열(방산 관련 직무 ↔ 전체 보기, 대분류·중분류 칩 한 줄씩, 관련 직무 카드 보러가기). 아래는 이전 2D 설명(코드 삭제됨): ~~**직무 네트워크(v0.14, 요청 F3)**: 전체 → 대분류 8 → 중분류 → 직무 209 방사형(`charts.job_network`). 대분류·중분류 클릭 = 기존 필터(카드 목록), 직무 클릭 = 상세 팝업, 가운데 = 전체. 선택 시 선택·연결 노드만 크고 진하게, 나머지는 작고 옅게 가장자리로, 선택 가지를 확대(중분류는 직무를 부채꼴로 펼침). 방산기업 근무처 직무 = 빨강 노드. 칩(대분류·중분류)은 키보드 대안. 검색, 활동 태그·근거 유형 필터, '방산 강조' 토글~~ |
| J02 | 1차 | 직무 상세 dialog: 핵심 업무, 전체 기술 태그(클릭 → 03 handoff), 우대 자격 원문, 출처. '목표로 선택' |
| J03 | 1차 | 상세 dialog 탭: 근무처 유형, 기업 예시('현재 채용 아님' 표기), 실제 공고 사례 20행(URL) |
| J05 | 1차 | **직무 키워드 또는 보유 기술로 직무 찾기**(v0.12): 자주 나오는 키워드(직무 3개 이상) 칩 + 전체 키워드 464개 검색 중 1개 선택 → 그 키워드가 적힌 직무 카드(10개씩). 선택은 이 화면에서만(저장 안 함). 점수·순위 없음, 정확 일치 → 검토된 동의어 |
| J04·J06 | 확장 | 기술×직무군 행렬 / 최대 2개 직무 비교 |

### 9.4 03 준비 역량 `views/p03_learning.py`

| 모듈 | 1차/확장 | 구현 |
|---|---|---|
| ~~S01~~ | 삭제(v0.12) | ~~목표 직무의 사전 기술 체크 목록~~ — 요청 D4. 목표 없으면 '직무부터 둘러보기' 안내는 유지 |
| S02 | 1차 | 기술 선택 → `why_learn`·`prerequisite` → 관련성 4그룹(직접/일부 포함/선수/공식 자료) 리소스 |
| S03 | 1차 보조 | 전체 공고 키워드 빈도 가로막대(분류 선택), '직무·지역 필터 미적용' 고정 캡션. 막대 클릭 → 교육 찾기의 '선택한 기술' 칩 |
| S04 | 1차 | **v0.19(요청 K)**: 순서 = 지도·키워드 막대(맨 위) → '키워드로 교육 찾기' 탭 2개(교육 키워드: 수집 검색어 17개 / 채용 키워드: 공고 기술 중 관련 교육이 있는 42개, 지금 탭 선택만 적용, 지역 조건 공통) → 공고 기술 그래프 펼치기(막대 클릭 = 채용 키워드) → 교육 과정 펼치기. 0건 클릭 오류 수정, 영문 짧은 키워드 단어 경계. ~~v0.18(요청 J)~~: 맨 위 키워드 검색창(여러 개, 하나라도 해당) + 수집 검색어 칩 17개(개수 작은 회색 괄호, 수집 원본 관계표로 보완) → 지도(기본 = 전체 과정 수, 키워드를 고르면 그 과정) + 키워드별 과정 수 막대(지도에 마우스를 올리면 그 지역 값, 지도 클릭 = 지역 필터, 막대 클릭 = 키워드 필터) → '교육 과정 보기' 펼치기(기본 닫힘, 조건 선택 시 자동 펼침, 10개씩, 후보 그룹·목표 직무 강조). '선택한 기술' 칩 유지, 월별 그래프 삭제. ~~이전(v0.14): **교육 키워드 칩(요청 F4)**: 고용24 수집 CSV 2종의 검색 키워드 컬럼 값 9개(드론·CAD·CATIA·SolidWorks·C++·임베디드·ROS2·기구설계·VTOL, 칩 숫자 = 과정 수) 중 선택 → 그 검색어로 모인 과정 카드. 기술 선택(S02)·공고 기술(S03)·직무 팝업 기술 버튼에서 넘어온 기술은 지울 수 있는 '선택한 기술' 칩으로 계속 검색(연결표 과정 포함). 검색창 삭제. 차트 2개(시·도 지도 + 월별, 높이 맞춤), 교육 카드 10개 단위, '목표 직무 관련 강조' 토글. 7.2 그룹·정렬~~ |
| ~~S06~~ | 삭제(v0.12) | ~~결과물 편집 제안 → '결과물로 선택'(R04)~~ — 요청 D4 |
| S05·S07·S08 | 확장 | 과정 비교 3개 / 자격 통계 소형 차트 / 지역별 공고×비원격 과정 점도표 |

7.1 키워드 검색 구현(`analytics/learning.search_courses(keyword)`)
1. `skill_dictionary`로 정확 용어·검토 동의어 확장
2. 후보 이유 판정: 연결표에 있음(선택 직무·기술 관계만) / 과정명 일치 / 수집 검색어(`search_keywords`) 일치 / NCS명 일치
3. `course_id`로 묶어 이유 병합(중복 카드 없음)
4. 그룹 배정(7.2): 직접·일부 포함 → 1그룹, 선수만 → 기초 그룹, 검색 근거만 → 추가 그룹, 외부 자료 → 공식 참고자료(별도 영역)
5. 그룹 내 정렬: 학습 방식·지역 일치 → 시작 전/진행 중 회차 보유 → 가까운 시작일 → 과정명·ID

### 9.5 04 채용·기업 탐색 — 상위 페이지 1개 + 하위 페이지 2개 `views/p04_recruit.py`

04와 05를 별도 페이지로 두지 않는다. **상위 페이지 '04 채용·기업 탐색' 하나** 안에 하위 페이지 **'채용 현황'**과 **'기업 탐색'**을 둔다. 첨부 예시에서 가져오는 것은 **기능**뿐이며, 예시 이미지의 문구·수치·색·아이콘·기업 수(약 350곳 등)는 사용하지 않는다.

#### 9.5.0 구조와 파일

```
views/
├─ p04_recruit.py            # 상위 페이지(st.Page 1개). 소개 → 하위 탭 바 → 활성 하위 페이지 렌더
└─ recruit/
   ├─ __init__.py
   ├─ postings.py            # render() — 하위 페이지 '채용 현황' (H01~H06)
   └─ companies.py           # render() — 하위 페이지 '기업 탐색' (C01~C06)
```

- `st.Page("views/p04_recruit.py", title="채용·기업 탐색", url_path="recruit")` 하나만 등록한다. 하위 페이지는 `st.Page`가 아니라 상위 페이지 안에서 호출하는 `render()` 함수다.
- 활성 하위 페이지는 **위젯 키 하나**로 관리한다: `st.session_state["sub"] ∈ {"postings", "companies"}` (기본 `"postings"`). 사이드바 하위 메뉴와 중앙 탭(`st.segmented_control(key="sub", persist_state="session")`)이 같은 키를 쓴다. (P3 구현 시 확정: 별도 `state.page["recruit"]["sub"]`를 두면 위젯 값과 이중 관리가 되어 제외)
- URL 동기화: `routing.sync_sub()`가 매 실행 첫머리에 **이동 요청 → 외부에서 바뀐 `?sub=`(직접 링크·페이지 링크) → 기존 값 → 기본값** 순으로 정하고, 04 페이지가 `write_sub_to_url()`로 URL을 맞춘다. 허용되지 않은 값이면 기본값. `segmented_control(bind="query-params")`는 코드에서 URL을 설정할 수 없어(`switch_page`의 query_params 포함) 쓰지 않는다.
- 두 하위 페이지의 필터·10개 묶음·스크롤 위치는 따로 저장한다(`state.page["postings"]`, `state.page["companies"]`). 하위 페이지를 바꿔도 상대편 상태를 초기화하지 않는다.
- 기존 handoff 규칙(04→05, 05→04)은 **같은 페이지 안에서 하위 페이지를 바꾸는 동작**으로 처리한다: `routing.go("recruit", sub="companies", handoff={"company_id": …})`. 다른 화면에서 들어올 때도 `sub`를 함께 넘긴다(예: 01·02→기업 탐색은 `sub="companies"`, 03→채용 현황은 `sub="postings"`).

#### 9.5.1 왼쪽 사이드바 하위 메뉴 (예시 1의 기능)

| 기능 | 동작 | Streamlit 구현 |
|---|---|---|
| 상위 항목 | '채용·기업 탐색' 행 오른쪽에 펼침/접힘 표시(▾/▴). 누르면 하위 목록이 펼쳐지거나 접힌다 | 사이드바 메뉴를 직접 그림: `st.navigation(..., position="hidden")` + `components/shell.render_nav()`. 상위 행은 토글 버튼, 펼침 여부는 `state.ui.nav_open["recruit"]` |
| 하위 항목 | 상위 아래에 들여쓰기 + 세로 연결선(트리 선)으로 '채용 현황', '기업 탐색' 표시 | 하위 행은 버튼. 클릭 → `sub` 설정 후 `st.switch_page(recruit_page)`(이미 해당 페이지면 rerun만) |
| 활성 표시 | 현재 하위 항목은 배경 강조 + 오른쪽 `›` 표시, 부모 행도 활성 배경 | CSS 클래스(`.nav-item.active`, `.nav-parent.active`)를 `static/css/base.css`에 정의 |
| 자동 펼침 | 04 페이지에 있을 때는 상위 항목이 항상 펼쳐져 있다. 다른 페이지에서는 사용자가 마지막으로 둔 펼침 상태를 유지한다 | 렌더 시 현재 페이지가 recruit면 `nav_open=True` |
| 다른 메뉴 | 홈·01·02·03은 하위 없는 단일 항목. 활성 페이지 배경 강조 | 같은 `render_nav()`에서 `st.page_link`로 그림 |
| 접힌 사이드바 | 예시 1 오른쪽처럼 아이콘만 보이는 레일 + 하위 메뉴 떠 있는 패널 | **1차 구현 제외.** Streamlit 기본 사이드바 접기를 사용하고, 접힌 상태에서는 9.5.2의 중앙 탭으로 하위 페이지를 이동. 아이콘 레일은 17장 Q3과 함께 결정 |

- 좌측 하단 문맥 안내(5.4)는 메뉴 아래에 그대로 둔다. 하위 페이지가 바뀌면 해당 하위 페이지의 기본 안내(`module_meta["H01"]` 또는 `["C01"]`)로 갱신하고 고정은 해제한다.
- 키보드: 상위 토글·하위 항목 모두 버튼이라 Tab/Enter로 조작할 수 있다. 접힌 하위 항목은 렌더하지 않으므로 초점을 받지 않는다.

#### 9.5.2 중앙 상단 하위 페이지 탭 (예시 2·3의 기능)

| 기능 | 동작 | Streamlit 구현 |
|---|---|---|
| 위치 | 상위 페이지 소개(`page_intro("recruit")`) 바로 아래, KPI·차트 위에 가로 탭 바 | `p04_recruit.py`에서 소개 → 탭 바 → `recruit.<sub>.render()` 순서 |
| 탭 | '채용 현황' / '기업 탐색' 2개. 활성 탭은 밑줄 + 강조 글자 | `st.segmented_control`(또는 `st.radio(horizontal=True)`)을 `key="recruit_sub"`로 두고 CSS로 밑줄 탭 모양 적용 |
| 전환 | 탭을 누르면 페이지 이동 없이 중앙 내용만 바뀐다. 사이드바 하위 항목의 활성 표시도 같이 바뀐다 | 탭과 사이드바가 **같은 위젯 키**(`"sub"`)를 읽고 쓴다. URL은 9.5.0의 `sync_sub`/`write_sub_to_url`로 갱신 |
| 렌더 방식 | **활성 하위 페이지만** 계산·렌더한다 | `st.tabs`를 쓰지 않는다. `st.tabs`는 두 탭 내용을 모두 매번 실행하고, 코드에서 활성 탭을 알 수 없어 사이드바와 동기화할 수 없기 때문 |
| 상태 보존 | 탭을 오가도 각 하위 페이지의 필터·카드 묶음 번호가 유지된다 | 9.5.0의 하위 페이지별 상태 네임스페이스 |
| 소개 문구 | 상위 소개 1개 + 하위 페이지마다 짧은 한 줄 설명(research 3.9의 04·05 문구를 하위 설명으로 사용) | `content/page_intros.py`에 `recruit`(상위)와 `recruit.postings`·`recruit.companies`(하위) 항목 |

- 두 하위 페이지는 서로의 카드 목록을 함께 보여 주지 않는다(research 3.2·15.2-31 유지). 공고 카드는 '채용 현황'에만, 기업 카드는 '기업 탐색'에만 둔다.
- 기업 상세 팝업(`dialogs.company_detail`)은 두 하위 페이지에서 같은 구성으로 연다. 팝업 안의 '기업 탐색에서 보기'는 탭을 '기업 탐색'으로 바꾸고, '수집 공고 보기'는 검증된 연결 공고만 '채용 현황'에 넘긴다.

#### 9.5.3 하위 페이지 '채용 현황' `views/recruit/postings.py`

| 모듈 | 1차/조건부 | 구현 |
|---|---|---|
| H01 | 1차 | KPI(고유 공고 135 / 기업명 76 / 기업 연결 n), 15개 직무 가로막대, 시·도 지도(자기 지역 필터 제외 분포, 클릭 = 지역 필터, v0.13). 필터 영역에 '내 조건' 칩(학력·경력·희망 지역 — 조건과 차이가 확인된 공고만 제외) |
| H02 | 1차 | `career_type` 5범주·`education_normalized` 6범주 가로막대(불명 별도 범주), 직무군×경력 히트맵, 고용형태 다중값 태그 집계(중복 허용 명시). **연수 수치 차트 없음(6.3)** |
| H04 | 1차 | 공고 카드 10개 단위 → 상세 dialog(원문 항목·원문 URL·`verification_note`), 기업명 → 기업 상세 dialog |
| H06 | 1차 | **선택한 직무와 스크랩한 공고 비교**(v0.13, 충돌 3): 탐색 경로 01 목표 직무 vs 스크랩한 공고(최대 3개, 열). 항목 = 공고 분류, 직무 중분류↔공고 분류 관계(관계표 초안), 직무 기술 중 공고 본문(제목·담당 업무)에 언급된 것/안 된 것, 공고 본문의 공고 키워드, 경력·학력·지역 원문. 점수 없음(`analytics.postings.compare_to_job`). 공고 상세 팝업의 '내 조건과 비교' 표는 유지 |
| H03 | 조건부 | `posting_company_bridge` reviewed 비율 확보 후 근거 집단별 막대 |
| H05 | 조건부 | `salary_type` 구성 막대 + `salary_raw` 원문 표(수치 차트 없음) |

### 9.6 하위 페이지 '기업 탐색' `views/recruit/companies.py`

9.5의 상위 페이지 '04 채용·기업 탐색' 안의 두 번째 하위 페이지다. 사이드바 하위 항목 또는 중앙 탭으로 들어온다.

| 모듈 | 1차/조건부 | 구현 |
|---|---|---|
| C01 | 1차 | 분야 가로막대(자기 필터 제외, 상위 8 + 흐린 미리보기 2 + 더보기 단추, 01과 같음 — 요청 S1) + 칩 동기화 + 조직 유형(Q13 — 원천 미정)·'수집 공고 연결됨' 필터(근거 집단 그래프·칩은 삭제, 요청 S2). 기준 바꾸기(기업 수 / 공고 있는 기업 수 / 연결 공고 수, 요청 U1)·분야를 고르면 '함께 하는 분야' 막대(요청 U2). 옆(5:5)에 채용 공고 노출: '방산 강조' 꺼짐 = 공고 연결 기업 상위 10(방산 빨강), 켜짐 = 방산 관련 기업만(요청 S3) → 결과 수 '조건에 맞는 기업·기관 N개' → 카드 10개씩 '이전/다음 10개 · 현재/전체' 넘기기(순환, 요청 W2 — 기업 더보기 팝업 대신) |
| 정렬 | 1차 | 키워드/분야 미선택: 이름순. 선택 시 결과 집합 안에서 방산 우선(직접확인 → 교차출처 → 인접 → 미확인), 같은 단계는 검색 일치도 → 이름순. '이름순으로 보기' 전환 |
| C02 | 1차 | 기업 상세 dialog: 사업 요약·제품·드론 세부 분야·출처 날짜. 주소·규모·직원 수·매출은 결측 규칙으로 제외(6.3) |
| C03 | 1차 | 근거 원장 표(종류·원문·시점·해석 제한). 점수 합산 없음 |
| C04~C06 | 조건부 | `dart_metric_long` pass 값만 팝업 내 차트 |

집계 순서 강제: `filter_all()` → `sort()` → `paginate(10)`. 화면에 보이는 10개만 필터하지 않는다(테스트로 보장).

### 9.7 오른쪽 '나의 탐색 경로' (`components/shell._render_roadmap_panel`, v0.13 이름 변경)

- (계획) 위: '나의 조건' 접기 — 학력·경력·희망 지역은 v0.13에서 04 채용 현황 '내 조건' 칩으로 구현.
- 가운데: **4단계(v0.12, 요청 D6·D7)** — 01 목표 직무 / 02 학습 내용(교육 스크랩) / 03 채용 공고 스크랩 / 04 관심 기업 스크랩. 각 단계 = 번호 + 제목(스크랩은 n/3) + 담긴 항목별 이름·'해제' + '살펴보기'(`st.page_link`). 목표 직무 1개, 스크랩 종류별 최대 3개(v0.13). 상단바 '스크랩 N' 표시는 삭제.
- 스크롤해도 화면 위쪽에 붙어 따라온다(sticky, 요청 D5).
- 04 채용 현황 H06은 목표 직무와 스크랩한 공고를 비교한다(v0.13).
- 담긴 단계는 사이드바 활성 메뉴와 같은 표시(옅은 녹색 바탕 + 왼쪽 녹색 띠), 모두 해제하면 사라짐(v0.14, 요청 F9).

### 9.7.1 방산 하이라이트·목표 직무 관련 강조 (v0.14, 요청 F2·F5·F6)

| 대상 | 방산 표시(항상, 사용자 결정 3) | 목표 직무 관련 강조(토글, 필터 아님) |
|---|---|---|
| 기업 카드 | 방산 근거(직접확인·교차출처·인접 후보) = 빨강 테두리·띠 + '방산 관련 기업' | 사업 분야가 분야→직무 관계표에서 목표 직무와 연결 |
| 공고 카드 | 연결 기업이 방산 근거 기업 = 같은 표시 | 분류 직접·인접 연결, 제목·담당 업무에 목표 직무 기술 언급 |
| 직무 카드·네트워크 | 근무처 유형 '방산기업' = '방산기업 근무처' 배지·빨강 | — |
| 교육 카드 | 표시 없음(사용자 결정 2) | 연결표 과정, 과정명·검색 키워드에 목표 직무 기술 |

- 04 채용 현황: 직무별 공고 누적 막대(방산 관련 기업 / 그 외 연결 기업 / 기업 미연결), H07 방산 관련 기업 공고 vs 그 외의 직무 구성(그룹 안 비중 양쪽 막대).
- 04 기업 탐색: C04 방산 관련 기업의 수집 공고 노출 막대(0건 기업은 캡션).
- '방산 강조' 토글(02·04): 차트에서 일반 표시를 흐린 회색, 일반 카드 흐리게. 건수·순서 불변.
- 사이드바 04 하위 메뉴: 글꼴 = 상위의 70%, 04 안에서 상위를 누르면 접기/펼치기, 다른 화면에서 누르면 채용 현황으로 이동하며 펼침(요청 F7). 펼침 상태는 브라우저에 저장하지 않음.
- 아래: 다음 행동 최대 3개 (`analytics.roadmap.next_actions(state)` — research 9.3 표를 규칙 테이블로 구현), 9.6 이동 제안 버튼 1개 + 대안 1개.
- 취소 직후 '되돌리기' 버튼(`state.undo`).

### 9.8 팀 공유용 HTML 버전 저장 (사용자 지시, 2026-09-30)

- 목적: 팀원이 Python·Streamlit 없이 로컬에서 브라우저로 결과를 볼 수 있게 한다.
- 위치: `main/html/`. 버전마다 새 파일을 만들고 이전 파일은 덮어쓰지 않는다.
- 파일명: `v<번호>_<단계>_<YYYY-MM-DD>.html` — 단계는 `초안본` → `수정본` → `수정본2`(이후 `수정본3`…) → `최종본`. 예: `v1_초안본_2026-10-02.html`.
- 방식(2026-09-30 구현): 앱을 `?export=1`(내보내기 모드: 기본 상태, 애니메이션 끔, '근거 자세히' 표를 정적 HTML 표로)로 열고 브라우저에서 `scripts/export_capture.js`로 화면을 캡처(차트 canvas → 이미지, 격리 컴포넌트 풀기, 이동 대상 표시) → `scripts/export_html.py build`가 Pretendard(400/700/800)를 넣어 한 파일로 조립. 외부 요청 없음. 필터·팝업·툴팁·테마 전환은 동작하지 않으며 파일 상단에 적는다. 03은 기본 상태가 비어 있어 '예시(검색어 CAD)' 화면을 함께 담는다.
- 저장 기록: `v1_초안본_2026-09-30.html`(7개 화면, 다크, 7.2MB). 목록과 보는 법은 `html/README.md`.
- 저장 시점: 사용자 확인을 받은 결과물 단위(최초는 P4 기본 화면 완료 시 '초안본'). 저장할 때마다 report.md와 worklog.md에 파일명을 기록한다.

---

#### 9.8.1 v2 수정본 — 기능 공유본 (2026-10-01, 요청 G1)

- 사용자 결정: 보기용 캡처가 아니라 직접 조작할 수 있는 단일 HTML(예시 `drone_workforce_dashboard.html` 형태), 범위는 앱 기능 거의 전부, ECharts 파일 포함.
- 구조: `scripts/build_interactive.py`가 `analytics/` 함수로 데이터 묶음(JSON 약 1.8MB, NTIS는 미리 집계)을 만들고, `scripts/interactive/`의 JavaScript 앱(계산 규칙을 analytics/에서 그대로 옮김)·CSS(토큰만 사용)·ECharts 5.6.0·Pretendard 400/700/800과 함께 `html/v2_수정본_2026-10-01.html`(8.9MB) 한 파일로 묶는다.
- 저장: 스크랩·목표 직무·내 조건·테마·방산 강조·탐색 경로 열림은 localStorage(`drone-career-html-v2`).
- 검증: 화면 7개 오류 없음, 수치 11개 앱과 일치, 클릭 필터·스크랩 3개 제한·탐색 경로·상세 팝업 이동·네트워크 확대·라이트/다크 확인.
- 유지: 앱 화면 로직을 바꾸면 `scripts/interactive/*.js`도 함께 고쳐 다시 만든다.

## 10 analytics 핵심 함수 시그니처(초안)

```python
# analytics/common.py
def unique_count(df, id_col, by) -> pd.DataFrame
def counts_excluding_self(df, id_col, dim, filters: dict) -> pd.DataFrame   # 자기 필터 제외 분포
def apply_filters(df, filters: dict, exclude: str | None = None) -> pd.DataFrame
def paginate(df, page_no: int, size: int = 10) -> tuple[pd.DataFrame, int]  # (묶음, 전체 수)

# analytics/companies.py
def area_counts(org_area, org, filters) -> pd.DataFrame        # 01 I02와 05 C01이 공용
def filter_companies(org, org_area, filters) -> pd.DataFrame
def sort_companies(df, keyword_selected: bool, mode: str) -> pd.DataFrame

# analytics/defense.py
def assign_defense_group(org, ledger) -> pd.Series
def highlight_style(group) -> dict

# analytics/learning.py
def search_courses(keyword, courses, offerings, skill_resources, skill_dict, ctx) -> pd.DataFrame
def rank_courses(candidates, profile, today) -> pd.DataFrame
def date_status(offering, today) -> str

# analytics/postings.py
def job_counts(postings, filters); def region_counts(postings, filters)   # 지역은 자기 필터 제외
def career_edu_counts(postings, filters)
def compare_to_profile(posting, profile) -> pd.DataFrame

# analytics/jobs.py
def skill_overlap(job_skills, my_skills, skill_dict) -> pd.DataFrame

# analytics/roadmap.py
def next_actions(state) -> list[Action]
def purpose_suggestions(state) -> list[Suggestion]

# analytics/dart.py
def parse_table(path, meta) -> pd.DataFrame      # 복합 헤더 → (period, metric) long
def validate(long_df, meta) -> pd.DataFrame      # 10.3 규칙 1~12 → quality_status
```

---

## 11 content/module_meta.py 구조

```python
MODULE_META = {
  "I02": dict(
      title="어디에서 드론을 사용하는가",
      source_ref=["Company_Business_Area_Links_Verified.csv", "Company_Organization_Master_Normalized.csv"],
      reference_period="드론정보포털 사업 분야 2024-04-24",
      unit="고유 기업·기관 수", denominator="조직 264개 중 분야 수록 239개",
      filter_scope="분야 자기 필터 제외, 나머지 조건 적용",
      limitation="분야 간 중복 포함. 막대 합 ≠ 전체 기업 수. 일자리 수 아님.",
      context_lines=[…],   # 좌측 하단 3~5줄
  ),
  ...
}
```
- 모든 `chart_card`가 이 사전을 필수로 참조 → 캡션·좌측 안내·근거 상세가 같은 정의를 쓴다(3.7 '수작업 복사 금지').
- 제외 컬럼 목록은 `quality.py` 산출물을 자동 삽입.

---

## 12 디자인 연동 (design/DESIGN.md 도착 완료, 2026-09-30)

- `core/theme.py`는 DESIGN.md(Green Deck) §4의 토큰을 `BASE`(테마 공통)·`MODE`(dark/light)로 두고 CSS 변수로 주입한다. 차트·표(iframe)는 `theme.color(이름)`으로 실제 값을 받는다.
- 의미 색 매핑(이름 고정, 값은 theme.py 한 곳에서만 정의):
  - 분석 강조 = `--chart-primary`(녹색), 호버·선택 = `--chart-highlight`, 선택 외 = `--chart-dim`
  - 국방 직접확인 = `--defense-strong`(#D53B00), 국방 후보 = `--defense-candidate`(0.4 알파)
  - 사용자 선택 = `--select-bg`/`--select-fg`(반전) + ✓
  - 결측 '주의' = Badge `neutral`
- views/components/analytics에 hex·px·font-family 리터럴 금지(DESIGN §11.2).
- 카드 반경·간격·타이포는 `static/css/base.css`에서 `var(--…)`로만 참조(값 정의는 theme.py 주입).
- 폰트: 사용자가 `design/`에 OTF를 넣으면 P3에서 `static/fonts/`로 복사(DESIGN §9.2).
- 드론 이미지 자산은 DESIGN G8(어두운 밴드, 실사 이미지 우선)에 맞춰 준비(17장 Q5).

---

## 13 테스트·검증 계획

| 테스트 | 내용 | 대응 research 인수 기준 |
|---|---|---|
| `test_data_contract.py` | 6.5 행 수·고유성·조인 | 15.2-6, 8 |
| `test_quality.py` | 6.3 제외 컬럼이 processed에 없음, 주의 목록 일치 | 사용자 결측 규칙 |
| `test_analytics.py` | 01·05 분야 집계 동일 / 자기 필터 제외 / 다중 분야 기업이 총계에 1번만 / filter→sort→paginate 순서 / 하이라이트 시 건수 불변 / 키워드 결과에 무관 방산기업 미포함 / 과정 중복 카드 없음 / 교육 그룹·정렬 / 날짜 상태 | 15.2-13, 14, 18, 22, 23, 24 |
| `test_state.py` | 스크랩·계획 독립 / 목표 변경 시 스크랩·계획 유지 / 종류별 스크랩 1개(교체)·해제 / 되돌리기 / 회차 변경 시 스크랩 수 불변 | 15.2-4, 15, 25, 26 |
| `test_app_smoke.py` | AppTest로 5개 페이지 + 04 하위 2개(`?sub=postings`, `?sub=companies`) 예외 없이 렌더, 홈 대체 버튼으로 이동, 사이드바 하위 항목·중앙 탭 전환 시 같은 `sub` 상태와 각 하위 페이지 필터 보존 | 15.2-1, 29(대체 경로), 31 |
| 수동 점검 | 라이트/다크 전환, 1440/1280/태블릿/모바일 폭, 드론 링·클릭·ESC·reduced motion, dialog 닫기 후 상태 | 15.2-20, 21, 30, 35, 37 |

검증 명령(구현 후): `python scripts/build_data.py` → `pytest -q` → `streamlit run app.py`

---

## 14 구현 단계(순서)

각 단계는 '완료 기준'을 통과해야 다음 단계로 간다.

| 단계 | 작업 | 완료 기준 |
|---|---|---|
| **P0 환경·데이터 배치 — 완료(2026-09-30)** | (선행: Python 3.12 설치) `.venv`(3.12), `requirements.txt`, 폴더 골격, **3장 선별대로 `data/raw`·`data/reference` 배치**, DART 4묶음 압축 해제 | raw 39 + DART 128표·4목록, reference 4, 원본 바이트 동일(해시 비교), 설치된 streamlit에서 DESIGN §9.3 테마 키 확인 |
| **P1 데이터 계층 — 완료(2026-09-30)** | `build_data.py`(감사 리포트 포함), `quality.py`, `data_loader.py`, 계약·결측 테스트 | `pytest tests/test_data_contract.py tests/test_quality.py` 통과, `reports/data_audit.md` 생성 |
| **P2 브리지 초안 — 초안 생성 완료, 사용자 검토 대기(2026-09-30)** | `draft_bridges.py`: 공고–기업(정확 일치 52행 draft), CMP0003→CMP0002, 분야–직무·직무–공고분류·기술 사전 초안 | 브리지 CSV 생성, 사용자 검토 요청(17장 Q6) |
| **P3 셸 — 완료(2026-09-30)** | `app.py`, routing, state 스키마, shell(직접 그린 사이드바 메뉴·04 하위 메뉴, 상단바·좌측 하단 안내·오른쪽 경로 빈 상태), 04 중앙 하위 탭, page_intro, theme(토큰·CSS 주입). **chart_card·cards·dialogs·Plotly 템플릿은 처음 쓰는 P4로 이동**(쓰지 않는 뼈대를 미리 만들지 않음) | 6개 화면 이동·폭·테마 확인, 사이드바↔탭↔URL 동기화, smoke 테스트(`tests/test_app_smoke.py` 12개) |
| **P4 기본 화면 — 완료(2026-09-30)** | research 12장 '기본 탐색' 모듈: M01~M04, I01~I03, J01~J03·J05, S01~S04·S06, H01·H02·H04·H06, C01~C03 | analytics 테스트 통과, 화면별 수치가 홈 오버뷰와 일치 |
| P5 로드맵·스크랩·저장 — **저장(7.2)·state 변경 함수·경로 선택 요약은 완료, 편집·취소·되돌리기·다음 행동·스크랩 보관함 남음** | state 함수, persistence 컴포넌트, R01~R06, 9.6 이동 제안, 스크랩 보관함 | state 테스트, 새로고침 후 복원 수동 확인 |
| P6 확장 모듈 | I04·I06·I07·I08·I10, J04·J06, S05·S07·S08 | 모듈별 합산 금지 규칙 테스트 |
| P7 조건부 | DART 파싱·검증 → C04~C06, H03, H05, I05, I09 | 검증 통과 값만 차트, 실패 표는 사유 표시 |
| P8 인수 점검 | research 15.2의 37개 항목 체크리스트 실행 | 체크리스트 결과를 README에 기록 |
| P9 로컬 DB 전환 | 화면 확정 후. processed 테이블을 로컬 DB로 적재, `data_loader.load_table()`만 DB 조회로 교체(6.1) | 기존 테스트 전부 통과, 화면 수치 불변 |

HTML 버전 저장(9.8)은 단계와 별도로, 사용자 확인을 받은 결과물마다 수행한다.

---

## 15 위험과 대응

| 위험 | 영향 | 대응 |
|---|---|---|
| Streamlit에서 호버·스크롤 기반 좌측 안내 불가 | V17 일부 미충족 | 명시적 '이 데이터는?'·선택 이벤트로 대체, 툴팁 보강(5.4). 필요 시 이후 커스텀 컴포넌트 |
| 고정 폭 사이드 패널·아이콘 레일 | V18 세부 폭 불일치 | CSS 오버라이드를 `base.css`에 한정, 1280 구간 아이콘 레일은 생략 제안 |
| 앱 내 테마 토글 | V08 상단 토글 | 네이티브 설정 메뉴 사용 + `st.context.theme` 감지(Q4) |
| 카드 전체 클릭 불가 | 3.4 클릭 동작 | 제목 버튼/‘상세 보기’ 버튼으로 대체 |
| 브리지 미검토 | 분야→직무, 직무→공고, 공고→기업 연결이 약함 | draft는 '검토 전 후보' 배지, reviewed만 확정 표현 |
| 대용량 CSV | 첫 로딩 지연 | parquet + 필요한 열만 + `st.cache_data` |
| DART 표 구조 다양 | C04~C06 지연 | 조건부 단계로 분리, 원본 표 보기 먼저 |
| Python 3.12 미설치 | P0 시작 불가 | P0 전에 3.12 설치(사용자 결정: 호환성 우선) |
| Pretendard OTF 미제공 | P3 폰트 적용 불가 | 사용자가 `design/`에 추가. 없으면 P0~P2만 진행 |

---

## 16 하지 않을 것 (범위 밖)

- 원본 CSV 수정·덮어쓰기, 결측 대체, 서로 다른 단위·모집단 합산.
- 공고별 기술 충족률, 직무별 키워드 히트맵, 합격·적합도 점수, 연봉 평균, '모집 중' 필터(관계·상태 데이터 없음).
- 계정·로그인·서버 저장, 제작자용 검토 폼·HTML 저장 버튼 노출.
- DC 체계 키워드 파일의 기업 화면 사용(브리지 완성 전).
- 장식용 이모티콘.

---

## 17 결정 필요 항목 (다음 수정에서 확정)

| ID | 질문 | 계획의 기본안 |
|---|---|---|
| Q1 | H02에서 결측 52%인 `career_min_years`를 제외하는 것(결측 규칙 우선)으로 확정할까? | 제외. `career_type` 범주 + 원문으로 대체 |
| Q2 | '방산근거만 확인' 8개 기업의 집단 배정 규칙 | **확정(2026-09-30, 기본안):** 직접 → 원문 직접확인, 공식 보조근거·공식 드론운용 근거 → 교차출처 후보, 기술활동 보조근거·탐색후보·보조 → 방산인접 탐색후보. 여러 근거면 가장 강한 것. `analytics/defense.py` |
| Q3 | 1280~1439px 구간의 왼쪽 60px 아이콘 레일과, 사이드바를 접었을 때 04 하위 메뉴를 옆에 띄우는 플라이아웃을 1차에서 생략해도 될까? | 생략(사이드바 160px 유지 또는 접기). 접힌 상태에서도 04 하위 페이지는 중앙 탭으로 이동 가능 |
| Q4 | 테마 전환 방식 | **확정(2026-09-30):** 사이드바 하단 ☀/☾ 자체 토글(사용자 요청). 첫 방문 다크 |
| Q5 | 홈 드론 이미지 자산 | **임시 결정(P4):** SVG 일러스트(DESIGN G8의 의도적 예외). 실제 렌더 이미지가 생기면 컴포넌트 안에서 교체 |
| Q6 | 관계표(브리지) 검토를 누가, 언제 할까? 초안 자동 생성 후 사용자 검토 방식이면 될까? | **초안 생성 완료(2026-09-30).** 사용자가 `data/bridges/README.md` 순서대로 검토 → `build_data.py` 재실행. 검토 전에도 P3 진행 가능(draft는 '검토 전 후보'로 표시) |
| Q7 | Python 3.12 가상환경을 `main/.venv`에 만들어도 될까? | **확정(2026-09-30): 3.12.** 로컬 미설치 → P0 전 설치 |
| Q8 | `data/reference/`(검산 전용 4개)도 data 폴더에 둘까, 아니면 앱이 읽는 39개만 둘까? | 둔다(테스트용) |
| Q9 | `data/processed/`를 git 등 버전 관리에서 제외할까? (현재 저장소 아님) | 제외 권장 |
| Q10 | Pretendard OTF 9개 제공 | **완료: 사용자가 `design/`에 추가함(2026-09-30).** 5개 굵기를 `static/fonts/`로 복사 |
| Q11 | 사용자 선택·학습 색(DESIGN G2) | **확정: Claude 판단에 위임.** `--project-select` 새 토큰(청록, Proposed). 값은 DESIGN §12.1, 수정 시 theme.py 1곳 |
| Q12 | 로컬 DB 종류(SQLite/PostgreSQL/MySQL 등)와 접속 방식 | P9 시작 시 결정 |
| Q13 | C01 '조직 유형' 필터의 원천 | **확정(2026-09-30, 기본안):** 1차에서 필터 제외(원천 컬럼 없음) |

---

## 18 변경 이력

| 버전 | 날짜 | 변경 |
|---|---|---|
| v0.1 | 2026-09-30 | 최초 작성. research v0.5·기획서·datas.zip 실측 기반 폴더 구조, 데이터 선별(raw 39 / reference 4 / 제외 16), 결측 규칙 적용 결과, 앱 셸·상태·컴포넌트·화면별 구현·테스트·단계 계획 |
| v0.2 | 2026-09-30 | 04·05를 상위 페이지 '04 채용·기업 탐색' 1개 + 하위 페이지 '채용 현황'·'기업 탐색'으로 통합(9.5·9.6). 사이드바 하위 메뉴(펼침/접힘·활성 표시)와 중앙 하위 탭 추가, 관련 절(0·1·2·4·5.1·5.2·5.3·7.1·9.1·9.2·13·14·17 Q3) 일괄 정합 |
| v0.11 | 2026-09-30 | 9.8 HTML 공유본 구현·첫 저장(v1 초안본): 내보내기 모드(`core/export_mode.py`), 캡처·조립 스크립트, `html/README.md`. 트리맵 농도를 직접 계산(넓은 면 녹색 채움 방지) |
| v0.12 | 2026-09-30 | 3차 수정 요청(report/revision_requests.md D). S01 사전 기술 체크·S06 결과물·기술 자기보고 상태 삭제, 준비 경로 4단계(목표 직무·학습 내용·채용 공고 스크랩·관심 기업 스크랩, 종류별 스크랩 1개·교체·해제, 스크롤 따라옴), 목표 변경 시 스크랩 유지, 직무 스크랩 버튼 삭제, H06 비교 대상 = 스크랩 공고, J05 → 직무 키워드·보유 기술로 직무 찾기. 스크랩 버튼과 계획 선택 버튼의 통합은 보류 |
| v0.13 | 2026-09-30 | 4차 수정 요청(report/revision_requests.md E). 본문 글꼴 1.2배(사이드바·카드 유지), 계획 선택 버튼·상태 삭제, 카드 스크랩 버튼 녹색, 지역 타일 → 대한민국 시·도 지도, '나의 탐색 경로'(01 해제), 스크랩 종류별 최대 3개(초과 시 막고 안내), 녹색 그라데이션, H06 → 선택한 직무와 스크랩 공고 비교, 04 '내 조건' 칩. 방산 빨강은 DESIGN.md 제안만 |
| v0.14 | 2026-10-01 | 5차 수정 요청(report/revision_requests.md F). 01 보조 열 제거·I04 방산 R&D, 02 직무 네트워크, 03 교육 키워드 칩, 방산 하이라이트(빨강: 카드 항상, 04 누적·비교·노출 차트, 02 토글), 목표 직무 관련 강조(03·04), 사이드바 하위 메뉴 70%·접기, 차트 제목 24px·막대 굵게, 탐색 경로 담긴 단계 강조 |
| v0.15 | 2026-10-01 | 9.8.1 기능 공유본(v2 수정본, 단일 HTML) 구현·저장 |
| v0.16 | 2026-10-01 | 6차 수정(01 산업 이해만, 요청 H): 분야 막대 방산 겹침, 분야 더보기 단추, 기술 그래프 합침(방산 겹침), 국가 R&D 상시 표시, 활용 분야 셀 클릭 과제 목록, 연구 과제 탐색 펼치기, '드론 분야' 문구 |
| v0.17 | 2026-10-01 | 7차 수정(01 산업 이해만, 요청 I): KPI 카드 A안(GIF 아이콘·초록 숫자, 01만), 추이 선 그리기 효과, 분야 미리보기 흐림 + 더보기 단추 |
| v0.18 | 2026-10-01 | 8차 수정(03 준비 역량만, 요청 J): 수집 검색어 17개로 보완(관계표), 검색창 + 칩 여러 개 선택, 지도 + 키워드 막대(마우스 연동·클릭 필터), 교육 과정 펼치기(자동 펼침·10개씩), 월별 그래프 삭제 |
| v0.19 | 2026-10-01 | 9차 수정(03 수정2, 요청 K): 시각화 맨 위, 교육/채용 키워드 탭, 공고 기술 그래프 → 채용 키워드, 클릭 오류 수정. 기능 공유본 v3(01 H·I, 03 J·K 반영) |
| v0.20 | 2026-10-01 | 10차 수정(요청 L): 카드 단추 별(해당 직무 선택)·책갈피(스크랩) + 그라데이션, 선택 카드 강조(떠오름·초록 그림자), 02·04 카드 펼치기 + 방산 관련만 보기, 03 드론 관련만 보기·드론 교육 초록 표시, 03 공고 기술 그래프는 채용 탭에서만 |
| v0.21 | 2026-10-01 | 11차 수정(02, 요청 M): 네트워크 선 클릭 오류 수정, J01을 3D 홀로그램 네트워크로(끌어서 회전·마우스 올리면 정지·자동 회전·가지 강조 확대·층별 초록·방산 강조 시 나머지 흐림, 칩은 오른쪽 열). 2D 네트워크 코드 삭제 |
| v0.22 | 2026-10-02 | 12차 수정(04 채용 현황, 요청 N): KPI 아이콘 카드(수집 공고·공고의 기업 수·방산 관련 기업 비율), 희망 지역 펼치기·방산 토글 위치, 직무 그래프 공고 수/비율 토글(H07 합침), 비교 안내·이동 단추. 후속: 직무 막대 + 지역 지도 연동(03과 같은 방식), '비율(%)로 보기' 토글, 이 화면 전용 '방산 관련 기업만 보기', 방패 GIF 교체 |
| v0.10 | 2026-09-30 | 2차 수정: 브라우저 저장 컴포넌트의 무한 재실행 수정(7.2 동작 규칙: 저장값 전송은 세션당 1회), 차트 호버 흐림 제거, '근거 자세히' 표 지연 로드, 04 ?sub= 정리, 사이드바 메뉴 17px·항목 높이 통일·홈 ⌂ |
| v0.9 | 2026-09-30 | 디자인 시스템을 Green Deck으로 교체(DESIGN.md 재작성, 이전 문서 보관). 레이아웃 폭 240/260, 의미 색(녹색 분석·반전 칩 선택·주황 국방), 테마 토글(Q4 확정)과 브라우저 저장(7.2) 구현, 표는 streamlit-aggrid, 수정 요청 목록 report/revision_requests.md |
| v0.8 | 2026-09-30 | P4 완료. 차트 Plotly → ECharts, 드론·카운트업을 components.v2로(0·2·4·8.1장), Q2·Q13 기본안 확정·Q5 임시 결정, offerings `province_std` 생성(6.2), 카드 행동에 필요한 state 변경 함수와 오른쪽 경로 선택 요약을 P4에 포함(P5에는 저장·편집·되돌리기·다음 행동 남음) |
| v0.7 | 2026-09-30 | P3 완료. 04 하위 페이지 상태를 위젯 키 `sub` 하나로 확정(9.5.0·9.5.2·5.2·7.1), URL 동기화 방식(`sync_sub`), chart_card·cards·dialogs를 P4로 이동, 머리말 상태 갱신 |
| v0.6 | 2026-09-30 | P2 초안 생성: 브리지 5개(공고–기업 135, 기업 식별 22, 분야–직무 390, 직무–공고분류 362, 기술 사전 617), 빌드에 `bridge_*` 테이블과 계약 검사 추가, 검토 안내(data/bridges/README.md), Q6 갱신 |
| v0.5 | 2026-09-30 | P1 완료. 결측 판정에 '공개정보 확인 불가' 등 표시 문자열 포함(6.3), 기업 프로필 제외 컬럼 확대와 C02 영향, union 통일로 NCS 표준코드 제외, 6.2 산출 테이블 실제 반영 상태, audit_data.py를 build_data.py에 통합, Q13 추가 |
| v0.4 | 2026-09-30 | P0 완료 표시. ENVIRONMENT.md·requirements-lock·html/·place_raw_data.py·export_html.py 트리 추가, 6.1 로컬 DB 전환 대비 규칙, 9.8 HTML 버전 저장, 14장 P9 추가, 17장 Q12 추가 |
| v0.3 | 2026-09-30 | 구현 전 문서 정리: 머리말 상태 갱신, 1.2 실측 보강(Python·결측 재감사·evidence_strength 6종), 2장 트리에 design 폰트·report·static/fonts 추가, 4장 Python 3.12 확정·config.toml은 DESIGN §9.3 참조, 6.3 누락 컬럼 2개 추가, 6.4 참고 표본 n, 12장 DESIGN 연동 확정, 14·15장 선행 조건, 17장 Q2 보강·Q5·Q7 갱신·Q10·Q11 추가 |
