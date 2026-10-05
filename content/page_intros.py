"""분석 화면 중앙 상단 소개 (research 3.9, plan.md 9.5.2).

04는 상위 페이지 하나이므로 소개도 하나만 둔다: 작은 표시는 '04 채용·기업 탐색 · 활성 하위 페이지',
제목·설명은 활성 하위 페이지의 문구(research 3.9의 04·05)를 쓴다. 같은 크기 제목을 두 번 두지 않기 위함.
"""
EYEBROW_SUFFIX = "이 화면에서 알아볼 내용"

PAGE_INTROS = {
    "industry": ("01 산업 이해", "드론은 어디에 쓰이고, 어떤 일을 할 수 있을까?",
                 "드론이 활용되는 분야와 산업 규모를 살펴보세요. 관심 분야를 선택하면 관련 업무와 직무, "
                 "기업을 이어서 알아볼 수 있어요."),
    "jobs": ("02 직무 탐색", "내 관심과 기술에 맞는 드론 직무는 무엇일까?",
             "직무별로 하는 일과 필요한 기술을 비교해 보세요. 관심 직무를 목표로 선택하고, 더 배울 기술과 "
             "교육을 찾아볼 수 있어요."),
    "learning": ("03 준비 역량", "목표 직무를 위해 무엇을 배우고 준비할까?",
                 "목표 직무에 필요한 기술을 왜 배우는지 알아보고, 관련 교육을 찾아 "
                 "나의 학습 계획을 만들 수 있어요."),
    "recruit.postings": ("04 채용·기업 탐색 · 채용 현황", "드론 관련 공고에서는 어떤 사람을 찾고 있을까?",
                         "수집된 공고의 직무·지역·경력·학력 조건을 비교해 보세요. 관심 공고에서 요구 기술을 "
                         "확인하고 관련 교육과 기업으로 이어갈 수 있어요."),
    "recruit.companies": ("04 채용·기업 탐색 · 기업 탐색", "관심 분야의 드론 기업은 어떤 사업을 할까?",
                          "분야와 키워드로 기업을 찾고 주요 사업과 제품을 살펴보세요. 기업별로 확보된 정보와 "
                          "공시 자료를 확인하고 관심 기업을 모아둘 수 있어요."),
}

# 소개 카드 목차(요청 AB5): 화면의 대표 부분으로 바로 이동. (짧은 이름, 이동할 곳의 CSS 선택자, 접힌 펼치기면 펼칠지 — 요청 AD3)
# 늘 그려지는 부분만 넣는다(03 '기술을 왜 배우고 어디서 배우나'는 직무를 골랐을 때만 있어 제외)
PAGE_TOC = {
    "industry": [("산업 규모", ".st-key-i01_tiles", False), ("활용 분야", ".st-key-chart-card-I02", False),
                 ("연구 기술", "#sec-rnd", False), ("연구 과제", ".st-key-i03_explore", True)],
    "jobs": [("직무 네트워크", ".st-key-chart-card-J01", False), ("직무 카드", ".st-key-jobs-cards", True),
             ("키워드로 찾기", "#sec-j05", False)],
    "learning": [("지역별 교육", ".st-key-chart-card-s04_region", False), ("키워드로 찾기", "#sec-learn-kw", False),
                 ("교육 과정", ".st-key-learn_explore", True)],
    "recruit.postings": [("직무·지역", ".st-key-chart-card-h-job-region", False), ("경력·학력", ".st-key-post_cond_open", True),
                         ("공고 카드", ".st-key-post-cards", True), ("직무와 공고 비교", "#sec-h06", False)],
    "recruit.companies": [("분야별 기업", '[class*="st-key-chart-card-C01"]', False),
                          ("공고 노출", ".st-key-chart-card-c04-exposure", False), ("기업 카드", ".st-key-co_cards_open", True)],
}

HOME_TITLE = "드론 진로 탐색"
HOME_SUBTITLE = "산업을 이해하고, 직무와 배움을 연결해 나의 탐색 경로를 만드세요."
