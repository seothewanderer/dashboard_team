# data_audit.md — 결측 감사 결과

- 생성: 2026-10-06 10:35 (`scripts/build_data.py`)
- 규칙: 결측 50% 이상 제외 / 30~50% 주의(표본 n 표기) / 채우지 않음 (plan.md 6.3)
- 결측으로 세는 표시 문자열: 공개 채용공고 확인 불가, 공개정보 확인 불가, 직무별 공개 급여 근거 없음
- `exclude_union`: 자기 파일은 50% 미만이지만 union 상대 파일에서 제외되어 함께 제외

## 제외 (72개 컬럼)

| 원본 파일 | 컬럼 | 결측 | 결측률 | 판정 |
|---|---|---|---|---|
| `defense/Company_Defense_Evidence_Ledger.csv` | `source_page` | 100/106 | 94% | exclude |
| `jobs/Drone_Job_Classification.csv` | `actual_employer` | 189/209 | 90% | exclude |
| `jobs/Drone_Job_Classification.csv` | `actual_posting_title` | 189/209 | 90% | exclude |
| `jobs/Drone_Job_Classification.csv` | `actual_posting_url` | 189/209 | 90% | exclude |
| `jobs/Drone_Job_Classification.csv` | `salary_min_10k_krw` | 203/209 | 97% | exclude |
| `jobs/Drone_Job_Classification.csv` | `salary_max_10k_krw` | 207/209 | 99% | exclude |
| `jobs/Drone_Job_Classification.csv` | `salary_original_text` | 189/209 | 90% | exclude |
| `jobs/Drone_Job_Classification.csv` | `salary_midpoint_10k_krw` | 207/209 | 99% | exclude |
| `jobs/Actual_Job_Posting_Evidence.csv` | `salary_min_10k_krw` | 14/20 | 70% | exclude |
| `jobs/Actual_Job_Posting_Evidence.csv` | `salary_max_10k_krw` | 18/20 | 90% | exclude |
| `industry/Export_Competitiveness_Trade.csv` | `subcategory` | 251/291 | 86% | exclude |
| `rnd/NTIS_National_RnD_Project_Master.csv` | `prior_data_source` | 8052/8078 | 100% | exclude |
| `rnd/NTIS_Joint_Research_Relations.csv` | `subcontract_project_title` | 4233/5160 | 82% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `채용_직무` | 152/239 | 64% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `담당_업무` | 221/239 | 92% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `신입_경력_구분` | 138/239 | 58% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `사업장_주소` | 179/239 | 75% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `출퇴근_정보` | 239/239 | 100% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `원격근무_가능여부` | 216/239 | 90% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `요구_경력` | 138/239 | 58% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `요구_학력` | 185/239 | 77% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `관련_전공` | 235/239 | 98% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `요구_자격증` | 229/239 | 96% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `필수_기술` | 220/239 | 92% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `현재_채용_여부` | 198/239 | 83% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `현재_채용공고_수` | 210/239 | 88% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `채용공고_제목` | 152/239 | 64% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `채용_마감일` | 174/239 | 73% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `최소_연봉_만원` | 238/239 | 100% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `최대_연봉_만원` | 239/239 | 100% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `급여_원문` | 186/239 | 78% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `고용_형태` | 180/239 | 75% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `수습기간` | 237/239 | 99% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `기업_규모` | 148/239 | 62% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `직원_수` | 208/239 | 87% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `설립일_설립연도` | 199/239 | 83% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `매출액` | 168/239 | 70% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `최근_성장_여부` | 225/239 | 94% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `근무시간` | 228/239 | 95% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `유연근무제` | 231/239 | 97% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `교육비_자격증_지원` | 218/239 | 91% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `기숙사_식사_교통_지원` | 223/239 | 93% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `조직문화_복지제도` | 150/239 | 63% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `개발_드론_시스템` | 222/239 | 93% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `특허_인증` | 228/239 | 95% | exclude |
| `companies/Drone_Company_Jobseeker_Database.csv` | `방산_연계_근거` | 201/239 | 84% | exclude |
| `defense/Defense_Cost_Certified_Companies.csv` | `4차 갱신일` | 12/13 | 92% | exclude |
| `defense/Defense_Cost_Certified_Companies.csv` | `5차 갱신일` | 12/13 | 92% | exclude |
| `learning/selected_skill_learning_courses.csv` | `recruitment_period` | 645/915 | 70% | exclude |
| `learning/selected_skill_learning_courses.csv` | `alternative_resource` | 675/915 | 74% | exclude |
| `learning/Training_Course_drone.csv` | `ncs_code_standard` | 6/148 | 4% | exclude_union |
| `learning/Training_Course_drone.csv` | `standard_confirmed_flag` | 0/148 | 0% | exclude_union |
| `learning/Training_Course_drone.csv` | `certificate_course_flag` | 50/148 | 34% | exclude_union |
| `learning/Training_Course_drone.csv` | `estimated_certificate_type` | 50/148 | 34% | exclude_union |
| `learning/Training_Course_drone.csv` | `related_certificate_raw` | 133/148 | 90% | exclude |
| `learning/Training_Course_Master_keywords.csv` | `ncs_code_standard` | 278/290 | 96% | exclude |
| `learning/Training_Course_Master_keywords.csv` | `standard_confirmed_flag` | 278/290 | 96% | exclude |
| `learning/Training_Course_Master_keywords.csv` | `certificate_course_flag` | 224/290 | 77% | exclude |
| `learning/Training_Course_Master_keywords.csv` | `estimated_certificate_type` | 224/290 | 77% | exclude |
| `learning/Training_Course_Master_keywords.csv` | `related_certificate_raw` | 275/290 | 95% | exclude |
| `learning/Training_Session_Analysis_drone.csv` | `ncs_code_standard` | 10/1262 | 1% | exclude_union |
| `learning/Training_Session_Analysis_drone.csv` | `enrolled` | 677/1262 | 54% | exclude |
| `learning/Training_Session_Analysis_drone.csv` | `completion_rate` | 771/1262 | 61% | exclude |
| `learning/Training_Session_Analysis_keywords.csv` | `ncs_code_standard` | 1100/1133 | 97% | exclude |
| `learning/Training_Session_Analysis_keywords.csv` | `enrolled` | 563/1133 | 50% | exclude_union |
| `learning/Training_Session_Analysis_keywords.csv` | `completion_rate` | 719/1133 | 63% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `career_min_years` | 70/135 | 52% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `career_max_years` | 114/135 | 84% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `annual_salary_min_10k_krw` | 126/135 | 93% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `annual_salary_max_10k_krw` | 135/135 | 100% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `duplicate_candidate_type` | 131/135 | 97% | exclude |
| `postings/Job_Posting_Analysis_Data.csv` | `major_requirement_raw` | 124/135 | 92% | exclude |

## 주의 (11개 컬럼)

| 원본 파일 | 컬럼 | 결측 | 결측률 | 판정 |
|---|---|---|---|---|
| `procurement/PPS_Drone_Bids.csv` | `awarded_company` | 2579/5226 | 49% | caution |
| `procurement/PPS_Drone_Bids.csv` | `winning_bid_krw` | 2579/5226 | 49% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `근무_지역` | 115/239 | 48% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `주요_사업_연구_납품_실적` | 85/239 | 36% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `공식_홈페이지` | 82/239 | 34% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `채용정보_출처명` | 118/239 | 49% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `프로젝트_출처명` | 85/239 | 36% | caution |
| `companies/Drone_Company_Jobseeker_Database.csv` | `프로젝트_출처링크` | 85/239 | 36% | caution |
| `defense/Defense_Cost_Certified_Companies.csv` | `3차 갱신일` | 4/13 | 31% | caution |
| `learning/Training_Session_Analysis_drone.csv` | `satisfaction_score_100` | 444/1262 | 35% | caution |
| `postings/Job_Posting_Analysis_Data.csv` | `salary_raw` | 50/135 | 37% | caution |
