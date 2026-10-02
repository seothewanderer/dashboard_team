"""카드 버튼 아이콘 만들기 (요청 L2·L3, 2026-10-01): 별(직무 선택)·책갈피(스크랩).

원본 static/img/card_{star,bookmark}.gif(흰 바탕 검은 선, 빈 모양 → 채운 모양 → 빈 모양)를 홈·KPI 아이콘과 같은 방식으로
색을 뺀 알파 마스크 WebP로 바꾼다. 색은 CSS(mask-image + 버튼 글자색)가 입힌다.
- card_<이름>_rest.webp : 빈 모양(선택 전)
- card_<이름>_hover.webp: 빈 모양 → 채운 모양까지 한 번 재생 후 멈춤(선택 전 카드에 마우스)
- card_<이름>_on.webp   : 채운 모양(선택·스크랩됨)
- card_<이름>_off.webp  : 채운 모양 → 빈 모양까지 한 번(선택된 카드에 마우스 = 누르면 취소됨을 암시)
실행: .venv\\Scripts\\python.exe scripts\\make_card_icons.py
"""
from PIL import Image, ImageSequence

from core.config import ROOT

IMG = ROOT / "static" / "img"
SCALE = 4
ICONS = {"star": 8, "bookmark": 7}     # 채운 모양 프레임(원본 프레임 확인: 별은 커졌다 줄어드는 중간, 책갈피는 다 채워진 첫 프레임 — 2026-10-01 새 책갈피 GIF로 교체)


def to_mask(frame: Image.Image) -> Image.Image:
    gray = frame.convert("L").resize((frame.width * SCALE, frame.height * SCALE), Image.NEAREST)
    out = Image.new("RGBA", gray.size, (0, 0, 0, 0))
    out.putalpha(gray.point(lambda v: 255 - v))     # 검은 선 = 불투명
    return out


def save_anim(frames, name: str) -> None:
    frames[0][0].save(IMG / name, save_all=True, append_images=[f for f, _ in frames[1:]],
                      duration=[d for _, d in frames], loop=1, lossless=True)


def main() -> None:
    for name, full in ICONS.items():
        frames = [(to_mask(f), f.info.get("duration", 40)) for f in ImageSequence.Iterator(Image.open(IMG / f"card_{name}.gif"))]
        frames[0][0].save(IMG / f"card_{name}_rest.webp", lossless=True)
        frames[full][0].save(IMG / f"card_{name}_on.webp", lossless=True)
        save_anim(frames[:full + 1], f"card_{name}_hover.webp")
        save_anim(frames[full:], f"card_{name}_off.webp")
        print(f"{name}: frames={len(frames)} full={full}")


if __name__ == "__main__":
    main()
