# 대시보드 실행 (Python 3.12 가상환경). 추가 인자는 streamlit에 그대로 전달한다.
Set-Location $PSScriptRoot
& .\.venv\Scripts\streamlit.exe run app.py @args
