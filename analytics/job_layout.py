"""02 3D 직무 네트워크 배치 계산(요청 M2) — 화면 부품(components/job_graph3d.py)과 HTML 공유본이 같이 쓴다.
코어(0,0,0) → 대분류(구 R1) → 중분류(R2) → 직무(R3). 정해진 씨앗이라 매번 같은 모양."""
import math
import random

import pandas as pd

ROOT_ID = "R:root"
R1, R2, R3 = 0.46, 0.76, 1.0           # 대분류·중분류·직무 구 반지름(바깥 = 1)


def _spread(n: int, seed: int) -> list[tuple[float, float, float]]:
    """구 위에 고르게 퍼진 방향 n개(피보나치 구) — 가지 방향."""
    golden = math.pi * (3 - math.sqrt(5))
    out = []
    for i in range(n):
        y = 1 - 2 * (i + 0.5) / n
        r = math.sqrt(1 - y * y)
        a = golden * i + seed
        out.append((math.cos(a) * r, y * 0.85, math.sin(a) * r))
    return out


def _around(d: tuple[float, float, float], n: int, spread: float, rnd: random.Random) -> list[tuple]:
    """방향 d 주위 원뿔 안에 n개 방향(같은 가지가 모이게, 약간 흩뿌림)."""
    dx, dy, dz = d
    ux, uy, uz = (0, 1, 0) if abs(dy) < 0.9 else (1, 0, 0)       # d에 수직인 두 축
    ax, ay, az = dy * uz - dz * uy, dz * ux - dx * uz, dx * uy - dy * ux
    la = math.sqrt(ax * ax + ay * ay + az * az) or 1
    ax, ay, az = ax / la, ay / la, az / la
    bx, by, bz = dy * az - dz * ay, dz * ax - dx * az, dx * ay - dy * ax
    out = []
    for i in range(n):
        ang = 2 * math.pi * i / max(n, 1) + rnd.uniform(-0.3, 0.3)
        rad = spread * math.sqrt((i + 0.6) / max(n, 1)) * rnd.uniform(0.8, 1.15)
        v = (dx + rad * (math.cos(ang) * ax + math.sin(ang) * bx), dy + rad * (math.cos(ang) * ay + math.sin(ang) * by),
             dz + rad * (math.cos(ang) * az + math.sin(ang) * bz))
        lv = math.sqrt(sum(c * c for c in v)) or 1
        out.append(tuple(c / lv for c in v))
    return out


def layout(jobs: pd.DataFrame) -> tuple[list[dict], list[list[str]]]:
    """노드 좌표(정해진 씨앗이라 매번 같은 모양)와 선. 노드: id, label, level(0~3), x, y, z, tip, defense, major, middle."""
    rnd = random.Random(7)
    majors = jobs.groupby("major_category").size().sort_values(ascending=False)
    nodes = [{"id": ROOT_ID, "label": "드론 직무", "level": 0, "x": 0.0, "y": 0.0, "z": 0.0,
              "tip": f"전체 직무 {len(jobs)}개 · 누르면 전체 보기"}]
    links = []
    for (mj, n_mj), d in zip(majors.items(), _spread(len(majors), 0.4)):
        mid = f"M:{mj}"
        nodes.append({"id": mid, "label": mj, "level": 1, "x": d[0] * R1, "y": d[1] * R1, "z": d[2] * R1,
                      "tip": f"{mj} · 직무 {n_mj}개", "major": mj})
        links.append([ROOT_ID, mid])
        g = jobs[jobs.major_category.eq(mj)]
        mids = g.groupby("middle_category").size().sort_values(ascending=False)
        for (md, n_md), d2 in zip(mids.items(), _around(d, len(mids), 0.55, rnd)):
            did = f"D:{md}"
            nodes.append({"id": did, "label": md, "level": 2, "x": d2[0] * R2, "y": d2[1] * R2, "z": d2[2] * R2,
                          "tip": f"{md} · 직무 {n_md}개", "major": mj, "middle": md})
            links.append([mid, did])
            js = g[g.middle_category.eq(md)].sort_values("job_title_ko")
            for (_, j), d3 in zip(js.iterrows(), _around(d2, len(js), 0.32, rnd)):
                jr = R3 * rnd.uniform(0.92, 1.08)
                nodes.append({"id": f"J:{j.job_id}", "label": j.job_title_ko, "level": 3,
                              "x": d3[0] * jr, "y": d3[1] * jr, "z": d3[2] * jr,
                              "tip": f"{j.job_title_ko}" + (" · 방산기업 근무처" if j.defense_workplace else "") + " · 누르면 상세",
                              "defense": bool(j.defense_workplace), "major": mj, "middle": md})
                links.append([did, f"J:{j.job_id}"])
    return nodes, links
