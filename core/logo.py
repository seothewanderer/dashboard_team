"""서비스 로고(요청 AH, 사용자 제공 그림을 벡터로 다시 그림): 높아지는 막대 3개 + 가장 높은 막대 위 드론(옆모습 T자).
사용자 그림의 파란 막대 = 초록(--primary), 흰 막대·드론 = 글자색(--text). 테마마다 색을 넣어 SVG data URI로 쓴다
(st.html은 인라인 SVG를 지우므로 CSS background-image로 그림). 공유본(scripts/build_interactive.py)도 같은 함수를 쓴다."""
import base64


def svg(ink: str, green: str) -> str:
    return ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">'
            f'<rect x="5.5" y="32" width="9" height="12" rx="2" fill="{ink}"/>'
            f'<rect x="17.5" y="23" width="9" height="21" rx="2" fill="{ink}"/>'
            f'<rect x="29.5" y="14" width="10" height="30" rx="2" fill="{green}"/>'
            f'<rect x="26.5" y="4" width="16" height="3" rx="1.5" fill="{ink}"/>'      # 드론 프로펠러 줄
            f'<rect x="33.25" y="4" width="2.5" height="7" rx="1" fill="{ink}"/>'       # 드론 몸통
            '</svg>')


def bars_uri(ink: str, green: str) -> str:
    """막대 3개만(드론 없이, 막대에 맞춰 자름) — 페이지 이동 로딩 화면에서 드론 자리는 홈 3D 드론 그림(요청 AW)."""
    s = ('<svg xmlns="http://www.w3.org/2000/svg" viewBox="5.5 14 34 30">'
         f'<rect x="5.5" y="32" width="9" height="12" rx="2" fill="{ink}"/>'
         f'<rect x="17.5" y="23" width="9" height="21" rx="2" fill="{ink}"/>'
         f'<rect x="29.5" y="14" width="10" height="30" rx="2" fill="{green}"/></svg>')
    return f"url(data:image/svg+xml;base64,{base64.b64encode(s.encode()).decode()})"


def uri(ink: str, green: str) -> str:
    return f"url(data:image/svg+xml;base64,{base64.b64encode(svg(ink, green).encode()).decode()})"
