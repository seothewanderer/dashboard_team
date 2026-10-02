# Drone Career Navigator

드론 산업·직무·학습·채용·기업 정보를 연결하여 사용자가 진로 탐색 흐름을 따라갈 수 있도록 구성한 인터랙티브 드론 진로 탐색 대시보드입니다.

---

## 1. Current Dashboard

| 항목 | 내용 |
| --- | --- |
| 실행 파일 | [`v4_HOME_MERGED_2026-10-02.html`](v4_HOME_MERGED_2026-10-02.html) |
| 기준 버전 | 팀 V4 기능 공유본(2026-10-02) + 기능 모듈(`custom/`) |
| 데이터 생성일 | 2026-10-02 (HTML에 내장된 `dash-data`) |

`v4_HOME_MERGED_2026-10-02.html`이 현재 완성 Dashboard입니다. 구성은 두 부분입니다.

- **Dashboard Core:** 팀의 V4 기능 공유본입니다. 이 저장소의 Streamlit 앱을 `scripts/build_interactive.py`로 내보낸 단일 HTML이며, 화면·데이터·차트·상태 저장·라우팅을 담당합니다. Core 코드는 V4 공유본과 같습니다. 달라진 부분은 아래 세 가지뿐입니다.
  - `<head>`의 의존성·스타일 로더
  - 문서 끝의 모듈 스크립트 로더
  - `boot()` 호출 위치
- **기능 모듈:** `custom/` 폴더의 CSS·JS입니다. Home 3D 드론, 공역 배경, 방사형 메뉴, 탐색 경로 워크플로우, 레이아웃을 담당하며 HTML이 상대 경로(`./custom/...`)로 불러옵니다.

> HTML 파일과 `custom/` 폴더는 항상 같은 위치에 함께 두어야 합니다.

## 2. Main User Flow

```
산업 이해 → 직무 탐색 → 준비 역량 → 채용 공고 → 관심 기업
```

| 화면 | hash | 역할 |
| --- | --- | --- |
| Home | `#home` | 데이터 요약(KPI), 3D 드론 메뉴, 이용 방법, 자주 묻는 질문 |
| 01 산업 이해 | `#industry` | 드론 산업 규모, 활용 분야별 기업·기관, 국가 R&D 과제 |
| 02 직무 탐색 | `#jobs` | 직무 네트워크, 하는 일·필요 기술 비교, 목표 직무 선택 |
| 03 준비 역량 | `#learning` | 지역별 교육 과정, 교육·채용 키워드로 과정 찾기, 교육 스크랩 |
| 04 채용·기업 탐색 · 채용 현황 | `#recruit/postings` | 수집 공고 조건 비교, 공고 스크랩 |
| 04 채용·기업 탐색 · 기업 탐색 | `#recruit/companies` | 분야·키워드로 기업·기관 찾기, 기업 스크랩 |

**Home의 역할:** 진로 탐색의 출발점입니다. 3D 드론을 누르면 다섯 개 패널이 펼쳐집니다(산업 이해 · 직무 탐색 · 준비 역량 · 채용 공고 · 기업 탐색). 패널을 고르면 드론이 그 방향으로 날아가고 해당 화면으로 이동합니다.

## 3. Major Features

- **Interactive Home:** KPI 요약(직무 209 · 교육 과정 438 · 수집 공고 135 · 탐색 조직 264), 이용 방법 4단계, FAQ
- **3D Drone Hero:** Three.js로 코드에서 생성한 실버 폴더블 드론. 외부 3D 모델 파일은 쓰지 않습니다.
  - 첫 진입 비행, 호버(sway·roll·yaw·pitch), 패널 응시
  - 방향 비행과 화면 전환, Home 복귀 비행
- **Dark / Light Airspace:** 테마별 Canvas 2D 공역 배경.
  - 다크: 별
  - 라이트: 잔디 지면, 강, 교량, 수면 반사
- **Procedural point-cloud visualization:**
  - 고정 seed로 생성한 건물·산 점군이 나타났다 사라집니다.
  - 객체 높이에 따라 150m 이하는 green/teal, 초과는 muted red로 표시하고, 고도 라벨과 150m 기준선을 그립니다.
- **Radial Navigation:** 드론 주위 오각형 5개 패널. 3D로 펼쳐지는 애니메이션, 가이드 선, 키보드 포커스를 지원합니다.
- **Career Roadmap(나의 탐색 경로):** 4단계 세로 워크플로우입니다.
  - 현재 단계는 초록 원으로 표시합니다.
  - 작은 드론이 현재 위치까지 날아가며 초록 진행선을 그립니다.
- **Scrap-based progress:**
  - 목표 직무와 교육·공고·기업 스크랩(종류별 최대 3개)이 단계 완료를 결정합니다.
  - 저장 데이터가 있는 단계만 초록 카드로 표시됩니다.
- **Responsive layout:** 1920 · 1600 · 1440 · 1366 폭에서 가로 넘침 없이 동작합니다.
- **Fixed left sidebar:** 접히지 않는 고정 폭(240px) 왼쪽 메뉴
- **Collapsible right roadmap:** 상단 버튼으로 탐색 경로를 열고 닫습니다. 패널이 열릴 때 드론이 짧게 휘청이는 반응을 합니다.
- **Browser localStorage state:** 테마, 목표 직무, 스크랩, 내 조건, 화면 설정을 브라우저에 저장합니다.

## 4. Feature Modules

| Module | Purpose | Location |
| --- | --- | --- |
| Drone Hero | 3D 드론 장면·모델·재질·조명, 호버·진입·응시·방향 비행·복귀, SVG 대체 드론 | `custom/home/drone-hero.js`, `custom/home/drone-hero.css` |
| Airspace Core | 공역 배경 엔진: 절차적 건물·지형, 점군, 고도 라벨, 150m 기준선, 리플 | `custom/home/airspace-core.js`, `custom/home/airspace-core.css` |
| Dark Airspace | 야간 레이어(별)와 야간 팔레트 | `custom/home/airspace-dark.js`, `custom/home/airspace-dark.css` |
| Light Airspace | 주간 레이어(지면·강·교량)와 주간 팔레트 | `custom/home/airspace-light.js`, `custom/home/airspace-light.css` |
| Radial Navigation | 5개 패널, 열기·닫기, 응시 방향, 선택 | `custom/home/radial-navigation.js`, `custom/home/radial-navigation.css` |
| Home Layout | Home 화면 구성(헤더·KPI·가이드·FAQ)과 위 모듈 연결 | `custom/home/home-layout.js`, `custom/home/home-layout.css` |
| Roadmap Workflow | 탐색 경로 단계 상태(노드·연결선·현재 단계) | `custom/roadmap/roadmap-workflow.js`, `custom/roadmap/roadmap-workflow.css` |
| Roadmap Drone | 탐색 경로 드론 위치 이동과 초록 진행선 | `custom/roadmap/roadmap-drone.js`, `custom/roadmap/roadmap-drone.css` |
| Drone Reactions | 드론 자세 반응(탐색 경로 열림 시 roll) | `custom/shared/drone-reactions.js` |
| Responsive Layout | 오른쪽 탐색 경로 overlay와 본문 폭 확보 | `custom/layout/dashboard-responsive.css` |
| Fixed Sidebar | 고정 폭 왼쪽 사이드바 | `custom/layout/fixed-sidebar.css` |
| V4 Adapter | V4 Core와 기능 모듈 연결(유일하게 V4 전역을 읽는 코드) | `custom/integration/v4-adapter.js`, `custom/integration/v4-adapter.css` |

모듈 전체 목록과 입력·출력 계약은 [`custom/CUSTOM_MODULES.md`](custom/CUSTOM_MODULES.md), 변경 이력은 [`custom/CUSTOM_CHANGES.md`](custom/CUSTOM_CHANGES.md)에 있습니다.

## 5. Project Structure

```
dashboard_team/
├─ README.md
├─ v4_HOME_MERGED_2026-10-02.html   # 현재 완성 Dashboard (실행 파일)
├─ custom/                          # Dashboard 기능 모듈
│  ├─ CUSTOM_MODULES.md             # 모듈 목록·계약·로드 순서
│  ├─ CUSTOM_CHANGES.md             # 변경 이력
│  ├─ home/                         # drone-hero · airspace-core/dark/light · radial-navigation · home-layout (+ README)
│  ├─ roadmap/                      # roadmap-workflow · roadmap-drone (+ README)
│  ├─ layout/                       # dashboard-responsive · fixed-sidebar (+ README)
│  ├─ shared/                       # drone-reactions
│  └─ integration/                  # v4-adapter.js · v4-adapter.css
│
│  # 팀 Streamlit 원본 프로젝트 (Dashboard Core의 원본·데이터 파이프라인)
├─ app.py · views/ · components/ · core/ · analytics/ · content/ · static/
├─ data/ · scripts/ · tests/ · reports/ · design/
├─ html/README.md                   # 기능 공유본 HTML 버전 기록
└─ ENVIRONMENT.md · requirements*.txt · run.ps1 · plan.md
```

Streamlit 앱의 설치·실행 방법은 [`ENVIRONMENT.md`](ENVIRONMENT.md)를 참고하세요.

## 6. Running the Dashboard

설치나 빌드는 필요 없습니다. 다음 방법 중 하나로 `v4_HOME_MERGED_2026-10-02.html`을 엽니다.

**VS Code Live Preview**

1. 저장소를 clone하고 VS Code로 폴더를 엽니다.
2. `v4_HOME_MERGED_2026-10-02.html`을 열고 Live Preview를 실행합니다.

**로컬 정적 서버**

```bash
python -m http.server 8000
# 브라우저에서 http://localhost:8000/v4_HOME_MERGED_2026-10-02.html 열기
```

**파일 직접 열기:** Chrome에서 `file://`로 열었을 때도 모든 화면과 저장 기능이 동작하는 것을 확인했습니다.

**외부 의존성**

| 항목 | 위치 | 비고 |
| --- | --- | --- |
| Three.js 0.169.0 | jsDelivr CDN (`<script type="importmap">`) | Home 3D 드론에만 사용. **인터넷 연결 필요** |
| Apache ECharts 5.6.0 | HTML에 내장 | 차트 |
| Pretendard 폰트 | HTML에 내장 | |
| 데이터 | HTML에 내장(`dash-data`) | |
| 기능 모듈 | `./custom/` 상대 경로 | HTML과 함께 있어야 함 |

Three.js CDN에 접속할 수 없으면 Home 드론이 SVG 드론으로 대체됩니다. 이 경우에도 메뉴, 화면 이동, 차트, 스크랩, 탐색 경로는 그대로 동작합니다. 3D 드론에는 WebGL이 필요합니다.

## 7. Module Reuse

다른 Dashboard에서 특정 기능만 쓰려면 필요한 모듈 폴더만 가져가면 됩니다.

- `custom/home/`: 3D 드론 Hero, 공역 배경(다크·라이트 레이어를 각각 켜고 끌 수 있음), 방사형 메뉴, Home 구성
- `custom/roadmap/`: 세로 워크플로우 단계 표시, 진행 드론·진행선
- `custom/layout/`: 고정 사이드바, 접히는 오른쪽 패널 레이아웃(CSS만)
- `custom/shared/`: 드론 자세 반응(롤 효과)

모듈은 Dashboard 상태나 라우터를 직접 읽지 않습니다. 필요한 값은 옵션으로 받고, 결과는 콜백으로 알립니다(예: `onNavigate(key)`, `onSelect(routeKey)`, `updateRoadmapWorkflow(container, { currentStage, completedStages })`). 각 모듈의 필요 HTML, 클래스, 콜백, 초기화 예시는 아래 README에 있습니다.

- [`custom/home/README.md`](custom/home/README.md)
- [`custom/roadmap/README.md`](custom/roadmap/README.md)
- [`custom/layout/README.md`](custom/layout/README.md)

## 8. Integration Architecture

```
Dashboard Core (V4: 상태 S · 데이터 D · 라우터 go() · render() · save() · 차트 · 대화상자)
        ↕
V4 Adapter (custom/integration/v4-adapter.js)
        ↕
Reusable Feature Modules (custom/home · custom/roadmap · custom/layout · custom/shared)
```

- 기능 모듈은 V4의 전역 상태(`S`, `D`)나 라우터를 복제하지 않습니다.
- V4 Adapter가 V4 값을 모듈 입력으로 바꿔 전달합니다.
  - `S.ui.motion`, `S.ui.home_menu_open`
  - 현재 화면 → 탐색 경로 단계
  - 목표 직무·스크랩 → 완료 단계
- 모듈의 콜백은 V4 동작으로 연결됩니다(예: 패널 선택 → `go(page, sub)`).
- HTML은 Core 스크립트 다음에 모듈 스크립트를 불러오고, 마지막의 `v4-adapter.js`가 V4 `boot()`를 **한 번만** 호출합니다.
- 그래서 V4 Core를 새 버전으로 바꿀 때는 `custom/integration/v4-adapter.*`만 새 Core API에 맞추면 됩니다.

## 9. Roadmap State

| Dashboard 화면 | 탐색 경로 상태 |
| --- | --- |
| Home | 워크플로우 밖(현재 단계·드론 없음) |
| 01 산업 이해 (`#industry`) | pre-workflow: 드론이 경로 시작점(01 위)에 있음 |
| 02 직무 탐색 (`#jobs`) | Step 01 목표 직무 |
| 03 준비 역량 (`#learning`) | Step 02 학습 내용 |
| 04 채용 현황 (`#recruit/postings`) | Step 03 채용 공고 스크랩 |
| 04 기업 탐색 (`#recruit/companies`) | Step 04 관심 기업 스크랩 |

완료 상태는 기존 Dashboard 상태에서 계산합니다. 별도 진행 상태는 만들지 않습니다.

| 단계 | 완료 조건 |
| --- | --- |
| 01 | 목표 직무 선택(`S.plan.goal_job_id`) |
| 02 | 교육 스크랩 1개 이상 |
| 03 | 공고 스크랩 1개 이상 |
| 04 | 기업 스크랩 1개 이상 |

스크랩을 해제하면 해당 단계는 바로 미완료로 돌아갑니다.

## 10. Data / State Notice

**데이터**

- 모든 수치는 **수집 데이터 기준**이며, 현재 실제 채용·모집 상태와 같다는 뜻이 아닙니다.
- 수치마다 출처가 다릅니다. 직무 사전 209개(직무–기술 관계 645), 고용24 교육 과정 438개(회차 2,395), 수집 채용 공고 135건, 기업·기관 264개(DART 보강 22)는 서로 더하지 않습니다.
- 각 차트의 **근거 자세히**에서 출처·단위·한계를 확인할 수 있습니다.

**상태 저장**

- 브라우저 `localStorage`의 `drone-career-html-v3` 키 하나에 저장합니다.
- 저장 항목: 테마, 내 조건(학력·경력·희망 지역·원격 허용), 목표 직무, 교육·공고·기업 스크랩, 움직임 설정, 탐색 경로 열림 여부.
- 서버나 DB에는 저장하지 않습니다. 저장 내용은 사용 중인 브라우저에만 남고 다른 기기와 공유되지 않습니다.

## 11. Development Notes

| 항목 | 내용 |
| --- | --- |
| Source HTML | `v4_HOME_MERGED_2026-10-02.html` (V4 Core + 기능 모듈 로더). Core 스크립트는 `boot()`를 직접 호출하지 않고 `v4-adapter.js`가 호출 |
| Module architecture | 기능 단위 모듈(`custom/*`) + V4 Adapter. 모듈 간 연결은 옵션·콜백, V4 연결은 adapter에서만 |
| External dependencies | Three.js 0.169.0(jsDelivr CDN). ECharts·폰트·데이터는 HTML에 내장 |
| Responsive widths | 1920 · 1600 · 1440 · 1366에서 가로 넘침 없음 확인. 탐색 경로 폭 기준점 1440 / 1180, 모바일 기준점 767 |
| Browser support | Chrome에서 검증. 최신 CSS(`:has`, `color-mix`, `@property`, container query)와 WebGL을 사용하므로 최신 Chromium 계열 브라우저 권장. 다른 브라우저는 검증하지 않음 |
| Motion | `prefers-reduced-motion` 환경과 Home의 '움직임 멈추기'에서 비행·배경 움직임이 멈추거나 줄어듦 |

## 12. Contribution Workflow

```
git pull → 관련 모듈 수정 → 브라우저에서 테스트 → commit → push
```

- 수정은 해당 기능의 모듈에서 합니다(아래 표).
- 테스트할 때는 정적 서버로 Dashboard를 열어 다음을 확인합니다.
  - 각 화면(`#home`, `#industry`, `#jobs`, `#learning`, `#recruit/postings`, `#recruit/companies`)
  - 다크·라이트
  - 브라우저 콘솔 오류 0건

| 수정하려는 기능 | 파일 |
| --- | --- |
| 3D 드론 모양·움직임·비행 | `custom/home/drone-hero.*` |
| 공역 배경(공통 / 야간 / 주간) | `custom/home/airspace-core.*` / `airspace-dark.*` / `airspace-light.*` |
| Home 다섯 패널 메뉴 | `custom/home/radial-navigation.*` |
| Home 제목·KPI·가이드·FAQ 배치 | `custom/home/home-layout.*` (문구·수치는 `custom/integration/v4-adapter.js`) |
| 탐색 경로 단계 표시 | `custom/roadmap/roadmap-workflow.*` |
| 탐색 경로 드론·진행선 | `custom/roadmap/roadmap-drone.*` |
| 드론 반응 효과 | `custom/shared/drone-reactions.js` |
| 사이드바·오른쪽 패널 레이아웃 | `custom/layout/*.css` |
| V4 화면·데이터와의 연결 | `custom/integration/v4-adapter.*` |
| 화면 데이터·차트·상태(Core) | Streamlit 원본(`views/`, `core/`, `analytics/` 등)에서 수정 후 `scripts/build_interactive.py`로 다시 내보냄 |

- Core HTML을 새로 내보냈다면 `v4_HOME_MERGED_2026-10-02.html`에서 다음 줄을 새 HTML로 옮깁니다.
  - `<head>`의 favicon, Three.js importmap·modulepreload, `./custom/` 스타일시트
  - 문서 끝 Core 스크립트의 `boot();` 호출을 지우고, 그 자리 뒤에 `./custom/` 스크립트 로더를 둡니다.
  - 필요하면 `custom/integration/v4-adapter.js`만 새 Core에 맞춥니다.
- 모듈을 바꾸면 [`custom/CUSTOM_CHANGES.md`](custom/CUSTOM_CHANGES.md)에 변경 이력을 남깁니다.
