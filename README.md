# 드론 진로 탐색 대시보드

드론 산업·직무·교육·채용 데이터를 한 화면에서 살펴보는 Streamlit 대시보드입니다.

## 1. 준비

- Windows 10/11
- Python **3.12** (다른 버전은 확인하지 않음)

  ```powershell
  winget install --id Python.Python.3.12 -e --scope user
  ```

## 2. 설치

압축은 `C:\dashboard`처럼 **짧은 경로**에 풉니다. 경로가 길면 Windows 경로 길이 제한(260자)에 걸려 패키지 설치가 실패할 수 있습니다.

이 폴더에서 PowerShell을 열고 차례로 실행합니다.

```powershell
py -3.12 -m venv .venv
.venv\Scripts\python.exe -m pip install -r requirements-lock.txt
.venv\Scripts\python.exe scripts\build_data.py
```

- 두 번째 줄: 패키지를 고정된 버전으로 설치합니다.
- 세 번째 줄: DB에서 받아 둔 원본(`data/raw_db`)으로 앱용 데이터(`data/processed`)를 다시 만듭니다.

## 3. 실행

```powershell
.\run.ps1
```

브라우저에서 http://localhost:8501 이 열립니다.

스크립트 실행이 막히면 아래처럼 실행합니다.

```powershell
powershell -ExecutionPolicy Bypass -File run.ps1
```

## 4. 테스트(선택)

```powershell
.venv\Scripts\python.exe -m pytest -q
```

## 5. 데이터 원본: DB(MySQL)와 CSV

```
DB(MySQL) ─ scripts\pull_db.py ─▶ data\raw_db ─┐
                                               ├─ scripts\build_data.py ─▶ data\processed ─▶ 앱
원본 CSV  ──────────────────────▶ data\raw ────┘   (--source db 기본 / --source csv)
```

- 앱은 DB에 직접 접속하지 않습니다. DB에서 받아 둔 사본으로 동작하므로 DB 접속 없이도 실행됩니다.
- **DB에서 다시 받기**(프로젝트 DB 접속이 되는 네트워크에서만):
  1. `.streamlit\secrets.toml` 파일을 만듭니다. 이 파일은 git과 제출본에 넣지 않습니다.

     ```toml
     [mysql]
     host = "DB 주소"
     port = 3306
     database = "drone_workforce_db"
     user = "계정"
     password = "비밀번호"
     ```

  2. 받기 → 다시 빌드:

     ```powershell
     .venv\Scripts\python.exe scripts\pull_db.py
     .venv\Scripts\python.exe scripts\build_data.py
     ```

- DB에 없는 열·표는 원본 CSV에서 채웁니다. 무엇을 CSV에서 썼는지는 `data\raw_db\_pull_report.md`(열)와 빌드 출력(표)에 나옵니다.
- **CSV로 되돌리기:** `.venv\Scripts\python.exe scripts\build_data.py --source csv`

## 참고

- 패키지 버전과 환경 정보: `ENVIRONMENT.md`
- 화면·데이터 설계: `plan.md`, 디자인 규칙: `design/DESIGN.md`
