"""01 산업 이해 KPI 카드 아이콘 만들기 (요청 I1, 2026-10-01).

원본 static/img/kpi_{company,revenue,employee}.gif(흰 바탕 검은 선)를 홈 아이콘(make_home_icon.py)과 같은 방식으로
색을 뺀 알파 마스크 WebP로 바꾼다. 색은 CSS(mask-image + 테마 초록)가 입혀 라이트/다크에 모두 맞는다.
- kpi_<이름>_rest.webp : 기본 상태 한 프레임(모양이 가장 다 보이는 프레임)
- kpi_<이름>_hover.webp: 그 프레임에서 시작해 한 바퀴 도는 움직임, 마우스를 올린 동안 반복
실행: .venv\\Scripts\\python.exe scripts\\make_kpi_icons.py
"""
import math

from PIL import Image, ImageChops, ImageDraw, ImageSequence

from core.config import ROOT
from make_nav_icons import WORK, ink, out, stroke   # 선 다듬기 도구(사이드바 아이콘과 같음)

IMG = ROOT / "static" / "img"
SCALE = 4
# 이름: 기본 프레임 고르는 법 — max = 선이 가장 진한 프레임(매출 막대가 다 오른 때, 종사자 눈 뜬 때), 0 = 첫 프레임(창 불 모두 켜짐)
ICONS = {"company": 0, "revenue": "max", "employee": "max",
         "posting": 0, "shield": 0,
         "job": 0, "learning": 0}   # 홈 요약 카드(요청 R): 손바닥 사람(직무)·디플로마(학습), 첫 프레임   # 04 채용 현황 KPI(요청 N1): 종이 = 겹친 두 장, 방패 = 체크 방패 첫 프레임(요청 N8에서 GIF 교체)


def to_mask(frame: Image.Image) -> Image.Image:
    gray = frame.convert("L").resize((frame.width * SCALE, frame.height * SCALE), Image.NEAREST)
    out = Image.new("RGBA", gray.size, (0, 0, 0, 0))
    out.putalpha(gray.point(lambda v: 255 - v))     # 검은 선 = 불투명
    return out


# ---- 직무 아이콘(kpi_job, 요청 R2 후속): 24px 원본은 키우면 계단이 보여서 선을 다시 그린다 ----
# 원본에서 읽은 움직임: 사람이 살짝 올라갔다가 손바닥 안으로 내려가 숨고(5~19프레임, 숨은 동안은 충분히 아래 16) 다시 올라옴,
# 손은 3~6프레임에 1px 내려감.
JOB_PERSON = [0, 0, -1, 1, 6, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 16, 6, 1, -1, 0]   # 원본 px(아래 +)
JOB_HAND = [0, 0, 0, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]


def _smooth(seq: list[float], sigma: float = 0.8) -> list[float]:
    n = len(seq)
    return [sum(seq[j] * math.exp(-((i - j) / sigma) ** 2) for j in range(n)) /
            sum(math.exp(-((i - j) / sigma) ** 2) for j in range(n)) for i in range(n)]


def _job(person: float, hand: float, width: float) -> Image.Image:
    """손 위의 사람(원본 24px 좌표, 선 중심). 사람은 손바닥 윗선 위쪽만 보인다(손 안으로 숨는 움직임)."""
    s = WORK / 24
    hand_m, person_m = Image.new("L", (WORK, WORK), 0), Image.new("L", (WORK, WORK), 0)

    def path(d, pts):
        for (xa, ya), (xb, yb) in zip(pts, pts[1:]):
            n = max(1, int(math.hypot(xb - xa, yb - ya) * s / 1.5))
            for i in range(n + 1):
                x, y = (xa + (xb - xa) * i / n) * s, (ya + (yb - ya) * i / n) * s
                d.ellipse((x - width / 2, y - width / 2, x + width / 2, y + width / 2), fill=255)

    arc = lambda cx, cy, r, a0, a1, n=32: [(cx + r * math.cos(math.radians(a0 + (a1 - a0) * i / n)),
                                           cy + r * math.sin(math.radians(a0 + (a1 - a0) * i / n))) for i in range(n + 1)]
    h = hand
    d = ImageDraw.Draw(hand_m)
    path(d, [(x, y + h) for x, y in [(1.3, 17.3), (2.3, 16.1), (3.4, 14.9), (4.7, 13.6), (6.0, 13.1), (16.8, 13.1), (17.5, 12.2),
                                     (18.5, 11.3), (19.8, 11.0), (20.9, 11.7), (21.1, 13.0), (20.2, 14.2), (17.4, 17.1),
                                     (15.4, 19.1), (14.3, 19.9), (13.0, 20.1), (6.4, 20.1), (5.4, 20.7), (5.0, 21.8)]])   # 손 바깥선·엄지
    path(d, [(x, y + h) for x, y in [(13.2, 12.9), (14.8, 12.9), (15.8, 13.8), (15.2, 14.9), (13.2, 15.7), (10.0, 16.1)]])   # 손가락 선
    d = ImageDraw.Draw(person_m)
    y = person
    path(d, arc(11.5, 3.1 + y, 1.8, 0, 360, 48))                                     # 머리
    x0, x1, y0, y1, r = 8.6, 14.4, 8.0 + y, 10.4 + y, 1.1                             # 몸(둥근 사각형)
    path(d, [(x0 + r, y0), (x1 - r, y0)] + arc(x1 - r, y0 + r, r, 270, 360, 8) + [(x1, y1 - r)] + arc(x1 - r, y1 - r, r, 0, 90, 8)
         + [(x0 + r, y1)] + arc(x0 + r, y1 - r, r, 90, 180, 8) + [(x0, y0 + r)] + arc(x0 + r, y0 + r, r, 180, 270, 8))
    clip = Image.new("L", (WORK, WORK), 0)                                           # 손바닥 윗선보다 위만
    ImageDraw.Draw(clip).rectangle((0, 0, WORK, (13.1 + h) * s - width * 1.1), fill=255)
    return ImageChops.lighter(hand_m, ImageChops.multiply(person_m, clip))


def make_job() -> None:
    src = Image.open(IMG / "kpi_job.gif")
    durs = [f.info.get("duration", 40) for f in ImageSequence.Iterator(src)]
    width = stroke(ink(Image.open(IMG / "kpi_posting.gif"), 0.4))                 # 다른 KPI 아이콘(종이 두 장)과 같은 굵기
    person, hand = _smooth(JOB_PERSON), _smooth(JOB_HAND)
    frames = [out(_job(p, h, width)) for p, h in zip(person, hand)]
    frames[0].save(IMG / "kpi_job_rest.webp", lossless=True)
    frames[0].save(IMG / "kpi_job_hover.webp", save_all=True, append_images=frames[1:], duration=durs, loop=0, lossless=True)
    print(f"job: frames={len(frames)} redrawn")


def main() -> None:
    for name, rest in ICONS.items():
        if name == "job":
            make_job()
            continue
        frames = [(to_mask(f), f.info.get("duration", 40)) for f in ImageSequence.Iterator(Image.open(IMG / f"kpi_{name}.gif"))]
        ink = [sum(v * n for v, n in enumerate(f.getchannel("A").histogram())) for f, _ in frames]
        i = ink.index(max(ink)) if rest == "max" else rest
        frames[i][0].save(IMG / f"kpi_{name}_rest.webp", lossless=True)
        loop = frames[i:] + frames[:i]              # 기본 프레임에서 시작해 끊김 없이 이어지게
        loop[0][0].save(IMG / f"kpi_{name}_hover.webp", save_all=True, append_images=[f for f, _ in loop[1:]],
                        duration=[d for _, d in loop], loop=0, lossless=True)
        print(f"{name}: frames={len(frames)} rest={i}")


if __name__ == "__main__":
    main()
