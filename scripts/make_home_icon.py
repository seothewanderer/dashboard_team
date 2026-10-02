"""사이드바 홈 아이콘 만들기 (요청 D3, 2026-09-30).

원본 static/img/home.gif(24px, 흰 바탕 검은 선, 23프레임: 평면 → 입체 → 평면)를
색을 뺀 알파 마스크 WebP 두 개로 바꾼다. 색은 CSS(mask-image + 글자색)가 입혀 라이트/다크에 모두 맞는다.
- home_rest.webp : 첫 프레임(기본 상태)
- home_hover.webp: 평면 → 입체(가장 진한 프레임)까지 한 번 재생 후 멈춤(마우스를 올린 동안 입체 유지)
실행: .venv\\Scripts\\python.exe scripts\\make_home_icon.py
"""
from PIL import Image, ImageSequence

from core.config import ROOT

SRC = ROOT / "static" / "img" / "home.gif"
SCALE = 4        # 24px → 96px로 키워 두어 작게 줄여 그릴 때 선이 흐려지지 않게


def to_mask(frame: Image.Image) -> Image.Image:
    gray = frame.convert("L").resize((frame.width * SCALE, frame.height * SCALE), Image.NEAREST)
    out = Image.new("RGBA", gray.size, (0, 0, 0, 0))
    out.putalpha(gray.point(lambda v: 255 - v))     # 검은 선 = 불투명
    return out


def main() -> None:
    src = Image.open(SRC)
    frames = [(to_mask(f), f.info.get("duration", 40)) for f in ImageSequence.Iterator(src)]
    ink = [sum(v * n for v, n in enumerate(f.getchannel("A").histogram())) for f, _ in frames]
    peak = ink.index(max(ink))                      # 입체 면이 가장 진한 프레임
    out = ROOT / "static" / "img"
    frames[0][0].save(out / "home_rest.webp", lossless=True)
    play = frames[:peak + 1]
    play[0][0].save(out / "home_hover.webp", save_all=True, append_images=[f for f, _ in play[1:]],
                    duration=[d for _, d in play], loop=1, lossless=True)
    print(f"frames={len(frames)} peak={peak}")


if __name__ == "__main__":
    main()
