# DB에서 끌어온 원본 (scripts/pull_db.py)

- 실행: 2026-10-06 10:34 · DB: drone-workforce-rds.c7kyqs602w8m.ap-northeast-2.rds.amazonaws.com / drone_workforce_db (표 63개)
- 저장한 표: 39개 (원본 CSV와 이름이 맞는 표만)

## 원본 CSV에서 가져온 열 (DB 표에 없음)

- `learning\Training_Course_drone.csv` ← DB `Training_Course_Master` + CSV 열 search_keywords
- `learning\Training_Session_Analysis_drone.csv` ← DB `Training_Session_Analysis` + CSV 열 search_keywords

## 저장하지 않은 표 (DB 열이 모자라고 맞출 기본키가 없음 → 빌드가 원본 CSV 사용)

- 없음

## 저장한 표

| 원본 경로 | DB 표 | 행 수 |
|---|---|---|
| certification\2024_Cumulative_Certifications.csv | 2024_Cumulative_Certifications | 12 |
| certification\Annual_Certification_Issuance.csv | Annual_Certification_Issuance | 80 |
| certification\Pilot_Certifications_By_Period.csv | Pilot_Certifications_By_Period | 6 |
| certification\Private_Certification_Status.csv | Private_Certification_Status | 9 |
| companies\Company_Business_Area_Links_Verified.csv | Company_Business_Area_Links_Verified | 1322 |
| companies\Company_Organization_Master_Normalized.csv | Company_Organization_Master | 264 |
| companies\Company_Overview_Normalized.csv | Company_Overview_Normalized | 22 |
| companies\Drone_Company_Jobseeker_Database.csv | Drone_Company_Jobseeker_Database | 239 |
| defense\Business_Area_Defense_Relations.csv | Business_Area_Defense_Relations | 18 |
| defense\Company_Defense_Evidence_Ledger.csv | Company_Defense_Evidence_Ledger | 106 |
| defense\Defense_Cost_Certified_Companies.csv | Defense_Cost_Certified_Companies | 13 |
| defense\Defense_Drone_Tech_Standard.csv | Defense_Drone_Tech_Standard | 12 |
| defense\Swarm_Drone_Registered_Companies.csv | Swarm_Drone_Registered_Companies | 12 |
| defense\Technology_Job_Mapping.csv | Technology_Job_Mapping | 12 |
| industry\Employment_Outlook.csv | Employment_Outlook | 10 |
| industry\Export_Competitiveness_Trade.csv | Export_Competitiveness_Trade | 291 |
| industry\Industry_Size_Annual_Trends.csv | Industry_Size_Annual_Trends | 4 |
| industry\Patent_Statistics_Ranking.csv | Patent_Statistics_Ranking | 238 |
| industry\Public_Agency_Drone_Use_Cases.csv | Public_Agency_Drone_Use_Cases | 30 |
| industry\Registered_Operator_Activities.csv | Registered_Operator_Activities | 15 |
| jobs\Actual_Job_Posting_Evidence.csv | Actual_Job_Posting_Evidence | 20 |
| jobs\Company_Examples_By_Job_Long.csv | Company_Examples_By_Job_Long | 668 |
| jobs\Drone_Job_Classification.csv | Drone_Job_Classification | 209 |
| jobs\Required_Skills_By_Job_Long.csv | Required_Skills_By_Job_Long | 645 |
| jobs\Workplace_Type_By_Job_Long.csv | Workplace_Type_By_Job_Long | 769 |
| learning\selected_skill_learning_courses.csv | selected_skill_learning_courses | 915 |
| learning\Training_Course_drone.csv | Training_Course_Master | 148 |
| learning\Training_Course_Master_keywords.csv | Training_Course_Master_keywords | 290 |
| learning\Training_Session_Analysis_drone.csv | Training_Session_Analysis | 1262 |
| learning\Training_Session_Analysis_keywords.csv | Training_Session_Analysis_keywords | 1133 |
| policy\2024_2026_Budget_By_Project.csv | 2024_2026_Budget_By_Project | 14 |
| policy\2027_Defense_Budget_Drone.csv | 2027_Defense_Budget_Drone | 22 |
| postings\Job_Posting_Analysis_Data.csv | Job_Posting_Analysis_Data | 135 |
| postings\Job_Posting_Keyword_Frequency.csv | Job_Posting_Keyword_Frequency | 189 |
| procurement\DAPA_Drone_Contracts.csv | DAPA_Drone_Contracts | 416 |
| procurement\PPS_Drone_Bids.csv | PPS_Drone_Bids | 5226 |
| rnd\NTIS_Joint_Research_Relations.csv | NTIS_Joint_Research_Relations | 5160 |
| rnd\NTIS_National_RnD_Project_Master.csv | NTIS_National_RnD_Project_Master | 8078 |
| rnd\NTIS_Project_Topic_Relations_Long.csv | NTIS_Project_Topic_Relations_Long | 37523 |
