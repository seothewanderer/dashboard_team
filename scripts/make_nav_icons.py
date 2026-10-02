"""사이드바 01~04 메뉴 아이콘 만들기 (요청 P7, 2026-10-02).

원본 static/img/nav_<key>.gif (물음표·돋보기·책 50px, 사람 24px, 흰 바탕 검은 선)를
홈 아이콘(home_rest/hover.webp)과 같은 방식(알파 마스크 WebP, 색은 CSS mask + 글자색)으로 바꾼다.
- 선 굵기: 홈 아이콘 선 굵기에 맞춘다(사용자 결정). 크기 대비 굵기를 재서 굵게/가늘게 맞춤.
- 가장자리: 크게 키워 다듬은 뒤 줄여 계단이 보이지 않게.
- 사람 아이콘: 24px 원본은 다듬어도 울퉁불퉁해서, 프레임마다 여섯 부분(머리 3·몸 3)의 위아래 이동을 원본에서 읽고
  같은 움직임으로 원·호를 다시 그린다(모양·움직임은 원본 그대로, 선만 깔끔하게).
- nav_<key>_rest.webp: 첫 프레임 / nav_<key>_hover.webp: 마우스를 올린 동안 계속 반복(01 KPI 카드 아이콘처럼, 요청 Q1).
실행: .venv\\Scripts\\python.exe scripts\\make_nav_icons.py
"""
import math

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageSequence

from core.config import ROOT

IMG = ROOT / "static" / "img"
KEYS = ("industry", "jobs", "learning", "recruit")   # 물음표 · 돋보기 · 책 · 사람
OUT = 96          # 홈 아이콘과 같은 출력 크기(24px × 4)
WORK = 384        # 다듬는 작업 크기


def ink(frame: Image.Image, smooth: float) -> Image.Image:
    """흰 바탕 검은 선 → 작업 크기의 선 마스크(255 = 선). smooth = 계단을 지우는 흐림 정도(원본 1px 기준)."""
    g = ImageChops.invert(frame.convert("L")).resize((WORK, WORK), Image.BICUBIC)
    if smooth:
        g = g.filter(ImageFilter.GaussianBlur(WORK / frame.width * smooth))
    return g.point(lambda v: 255 if v >= 128 else 0)


def stroke(mask: Image.Image) -> float:
    """선 굵기(작업 크기 px) ≈ 넓이 / 중심선 길이. 중심선 길이는 1px 깎을 때 줄어드는 넓이로 어림."""
    area = mask.histogram()[255]
    eroded = mask.filter(ImageFilter.MinFilter(3))
    return 2 * area / max(1, area - eroded.histogram()[255])


def out(mask: Image.Image) -> Image.Image:
    a = mask.filter(ImageFilter.GaussianBlur(1.2)).resize((OUT, OUT), Image.LANCZOS)
    im = Image.new("RGBA", (OUT, OUT), (0, 0, 0, 0))
    im.putalpha(a)
    return im


# ---- 사람 아이콘: 원본 24px 좌표(선 중심)로 다시 그리기 ----
PEOPLE_PARTS = {  # 원본 첫 프레임에서 잰 자리(x0, y0, x1, y1) — 움직임 추적용
    "Lhead": (3, 4, 9, 9), "Rhead": (14, 4, 20, 9), "Chead": (9, 8, 14, 13),
    "Cbody": (7, 15, 16, 21), "Lbody": (2, 11, 7, 16), "Rbody": (16, 11, 21, 16)}


def _track(frames: list[Image.Image]) -> dict[str, list[float]]:
    """부분마다 프레임별 위아래 이동(원본 px). 정수로 읽고 앞뒤 프레임과 부드럽게 이어 끊김 없이."""
    W = frames[0].width
    data = [[255 - v for v in f.convert("L").tobytes()] for f in frames]
    at = lambda fr, x, y: fr[y * W + x] if 0 <= x < W and 0 <= y < W else 0
    moves = {}
    for name, (x0, y0, x1, y1) in PEOPLE_PARTS.items():
        tpl = [(x, y, at(data[0], x, y)) for x in range(x0, x1 + 1) for y in range(y0, y1 + 1)]
        raw = [max(range(-3, 4), key=lambda dy: sum(v * at(fr, x, y + dy) for x, y, v in tpl)) for fr in data]
        n = len(raw)
        moves[name] = [sum(raw[j] * math.exp(-((i - j) / 1.4) ** 2) for j in range(n)) /
                       sum(math.exp(-((i - j) / 1.4) ** 2) for j in range(n)) for i in range(n)]
        moves[name][0] = moves[name][-1] = 0.0                    # 처음·끝 = 멈춘 그림
    return moves


def _people(off: dict[str, float], width: float) -> Image.Image:
    s = WORK / 24
    m = Image.new("L", (WORK, WORK), 0)
    d = ImageDraw.Draw(m)

    def path(points):  # 굵은 선(둥근 끝·이음): 점을 촘촘히 찍는다
        for (xa, ya), (xb, yb) in zip(points, points[1:]):
            n = max(1, int(math.hypot(xb - xa, yb - ya) * s / 1.5))
            for i in range(n + 1):
                x, y = (xa + (xb - xa) * i / n) * s, (ya + (yb - ya) * i / n) * s
                d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)

    arc = lambda cx, cy, rx, ry, a0, a1, n=24: [(cx + rx * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
                                                 cy + ry * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    for name, cx in (("Lhead", 6.0), ("Rhead", 17.0)):
        path(arc(cx, 6.9 + off[name], 2.15, 2.15, 0, 360, 48))
    path(arc(11.5, 10.75 + off["Chead"], 1.8, 1.8, 0, 360, 40))
    y = off["Cbody"]                                               # 가운데 몸: 평평한 위 + 둥근 아래
    path([(15.1, 18.0 + y), (15.1, 15.9 + y), (7.9, 15.9 + y), (7.9, 18.0 + y)] + arc(11.5, 18.0 + y, 3.6, 2.1, 180, 0))
    for name, sx in (("Lbody", 1), ("Rbody", -1)):                 # 양옆 어깨: '[' 모양(오른쪽은 좌우 대칭)
        y = off[name]
        X = (lambda x: x) if sx > 0 else (lambda x: 23 - x)
        pts = [(7.2, 11.2)] + arc(3.7, 12.6, 1.4, 1.4, 270, 180, 8) + arc(3.7, 14.2, 1.4, 1.4, 180, 90, 8) + [(6.6, 15.6)]
        path([(X(px), py + y) for px, py in pts])
    return m


def main() -> None:
    home = Image.open(IMG / "home.gif")
    target = stroke(ink(home, smooth=0.9))                       # 홈 아이콘 굵기(같은 방식으로 잼)
    for key in KEYS:
        src = Image.open(IMG / f"nav_{key}.gif")
        frames = [(f.copy(), f.info.get("duration", 40)) for f in ImageSequence.Iterator(src)]
        if key == "recruit":
            moves = _track([f for f, _ in frames])
            masks = [(out(_people({k: v[i] for k, v in moves.items()}, target)), d) for i, (_, d) in enumerate(frames)]
            note = "redrawn"
        else:
            first = ink(frames[0][0], 0.4)
            step = round((target - stroke(first)) / 2)           # 모든 프레임에 같은 보정(움직이는 동안 굵기 고정)
            flt = ImageFilter.MaxFilter(3) if step > 0 else ImageFilter.MinFilter(3)
            masks = []
            for f, d in frames:
                m = ink(f, 0.4)
                for _ in range(abs(step)):
                    m = m.filter(flt)
                masks.append((out(m), d))
            note = f"stroke {stroke(first):.1f} → {target:.1f}"
        masks[0][0].save(IMG / f"nav_{key}_rest.webp", lossless=True)
        masks[0][0].save(IMG / f"nav_{key}_hover.webp", save_all=True, append_images=[m for m, _ in masks[1:]],
                         duration=[d for _, d in masks], loop=0, lossless=True)
        print(f"{key}: frames={len(frames)} {note}")


if __name__ == "__main__":
    main()
