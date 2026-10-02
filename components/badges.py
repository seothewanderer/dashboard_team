"""Badge (DESIGN §6.7) HTML 조각. 방산은 defense(빨강) 배지 하나만, 결측 주의는 neutral (G11)."""
from html import escape

from analytics.defense import TIER


def badge(text: str, variant: str = "neutral") -> str:
    return f'<span class="ds-badge ds-badge--{variant}">{escape(text)}</span>'


def defense_badge(group: str | None) -> str:
    """방산 근거가 있는 기업(직접확인·교차출처·인접 후보)은 모두 '방산 관련 기업'(요청 F6). 등급은 상세 팝업에서."""
    return badge("방산 관련 기업", "defense") if TIER.get(group or "") else ""


def defense_job_badge(is_defense: bool) -> str:
    """직무: 근무처 유형에 '방산기업'이 있는 직무(요청 F2)."""
    return badge("방산기업 근무처", "defense") if is_defense else ""


def draft_badge(status: str | None) -> str:
    return badge("검토 전 후보", "neutral") if status == "draft" else ""
