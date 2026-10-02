"""방산 근거 집단 배정 (plan.md 6.4, research 3.5.1, Q2 기본안 확정 2026-09-30).

기업은 한 집단에만 배정한다. 원래 분류는 org.defense_drone_relation_class 에 그대로 남는다.
"""
import pandas as pd

DIRECT, CROSS, ADJACENT, UNCONFIRMED, UNLINKED = (
    "원문 직접확인", "교차출처 후보", "방산인접 탐색후보", "방산 관련 미확인", "기업 미연결")   # 화면 이름(요청 V1)
GROUP_ORDER = [DIRECT, CROSS, ADJACENT, UNCONFIRMED]          # 기업 차트·정렬 순서
POSTING_GROUP_ORDER = GROUP_ORDER + [UNLINKED]                # 공고 차트 전용
DEFENSE_GROUPS = [DIRECT, CROSS, ADJACENT]                    # '방산 관련만 보기' 기본 포함
TIER = {DIRECT: "direct", CROSS: "candidate", ADJACENT: "candidate"}  # 하이라이트 표현(진한/옅은 주황)

# 조직 마스터 분류 → 집단 ('방산근거만 확인'은 원장으로 따로 배정)
CLASS_TO_GROUP = {"원문 직접확인": DIRECT, "교차출처 후보": CROSS, "방산인접 탐색후보": ADJACENT,
                  "드론근거만 확인": UNCONFIRMED, "미분류": UNCONFIRMED}
# Q2: 원장 evidence_strength → 집단. 여러 근거면 가장 강한 것(GROUP_ORDER 앞쪽)
STRENGTH_TO_GROUP = {"직접": DIRECT, "공식 보조근거": CROSS, "공식 드론운용 근거": CROSS,
                     "기술활동 보조근거": ADJACENT, "탐색후보": ADJACENT, "보조": ADJACENT}
DEFENSE_ONLY_CLASS = "방산근거만 확인"


def assign_groups(org: pd.DataFrame, ledger: pd.DataFrame) -> pd.DataFrame:
    """company_id별 defense_group, drone_evidence_missing(방산근거만 → '드론 활동 근거 미확인' 배지)."""
    group = org["defense_drone_relation_class"].map(CLASS_TO_GROUP)
    rank = {g: i for i, g in enumerate(GROUP_ORDER)}
    strongest = (ledger.assign(g=ledger["evidence_strength"].map(STRENGTH_TO_GROUP))
                 .dropna(subset=["g"]).assign(r=lambda d: d["g"].map(rank))
                 .sort_values("r").drop_duplicates("company_id").set_index("company_id")["g"])
    defense_only = org["defense_drone_relation_class"].eq(DEFENSE_ONLY_CLASS)
    group = group.where(~defense_only, org["company_id"].map(strongest)).fillna(UNCONFIRMED)
    return pd.DataFrame({"company_id": org["company_id"], "defense_group": group,
                         "drone_evidence_missing": defense_only})
