"""그래프 해설의 '눈에 띄는 점'(요청 AE2): 그래프에 실제로 그려진 표(chart_card의 table)에서 지금 조건 기준으로 계산한
짧은 문장들. 해석(좋다·나쁘다)은 하지 않고 순위·비중만 말한다. spec은 content.chart_explain.EXPLAIN[...]['insight']."""
import pandas as pd

MIN_BASE = 5   # 방산 비중 비교는 전체가 이 값 이상인 항목만(한두 개짜리 100% 방지)


def _pct(a: float, b: float) -> str:
    p = a / b * 100 if b else 0
    return f"{p:.0f}%" if p >= 10 or p == 0 else f"{p:.1f}%"


def _rank(df: pd.DataFrame, name: str, val: str, spec: dict, n: int | None) -> list[str]:
    unit, label = spec.get("unit", ""), spec.get("label", "항목")
    d = df[[name, val]].sort_values(val, ascending=False, kind="stable")
    d = d[d[val] > 0]
    if d.empty:
        return []
    v = d.iloc[0][val]
    tops = d[d[val] == v][name].astype(str).tolist()   # 같은 값이면 함께(공동 1위)
    out = [f"가장 많은 {label}: {' · '.join(tops)} {'각 ' if len(tops) > 1 else ''}{v:,}{unit}"]
    if spec.get("overlap"):            # 한 대상이 여러 항목에 들어감 → 합계 대신 표본 기준
        if n:
            out[0] += f" (표본 {n:,}{unit} 중 {_pct(v, n)})"
    elif len(d) >= 3:
        top3 = d.head(3)
        out.append(f"상위 3개({' · '.join(map(str, top3[name]))}): 전체의 {_pct(top3[val].sum(), d[val].sum())}")
    rest = d[d[val] < v]
    if len(rest):
        out.append(f"{label} {len(d)}개 중 그다음: {rest.iloc[0][name]} {rest.iloc[0][val]:,}{unit}")
    return out


def _best_share(df: pd.DataFrame, name: str, part: str, total: str, spec: dict, what: str) -> str | None:
    d = df[df[total] >= MIN_BASE]
    if d.empty or not d[part].sum():
        return None
    r = (d[part] / d[total]).idxmax()
    row = d.loc[r]
    return (f"{what} 비중이 가장 높은 {spec.get('label', '항목')}: {row[name]} "
            f"({row[part]:,}/{row[total]:,}{spec.get('unit', '')}, {_pct(row[part], row[total])})")


def insights(table: pd.DataFrame | None, spec: dict | None, n: int | None = None) -> list[str]:
    if table is None or spec is None or table.empty:
        return []
    c = list(table.columns)
    kind = spec["kind"]
    if kind == "rank":
        i, j = spec.get("cols", (0, 1))
        return _rank(table, c[i], c[j], spec, n)
    if kind == "overlay":                # [이름, 전체, 그중 방산]
        out = _rank(table, c[0], c[1], spec, n)
        best = _best_share(table, c[0], c[2], c[1], spec, spec.get("part", "방산 관련"))
        return out + ([best] if best else [])
    if kind == "split":                  # [이름, 방산, 그 외, 합계]
        out = _rank(table, c[0], c[3], spec, n)
        if out:
            tot, part = table[c[3]].sum(), table[c[1]].sum()
            out[0] += f" (전체의 {_pct(table[c[3]].max(), tot)})"
            out.append(f"방산 관련 기업 공고: 전체 {tot:,}{spec['unit']} 중 {part:,}{spec['unit']}({_pct(part, tot)})")
            best = _best_share(table, c[0], c[1], c[3], spec, "방산 관련 기업 공고")
            if best:
                out.append(best)
        return out
    if kind == "years":                  # cols = (연도, 방산, 합계) 열 위치
        y, dp, tt = (c[i] for i in spec.get("cols", (0, 1, 3)))
        d = table.sort_values(y)
        if d[tt].sum() == 0:
            return []
        peak = d.loc[d[tt].idxmax()]
        u = spec.get("unit", "")
        out = [f"과제 시작이 가장 많은 해: {peak[y]}년 {peak[tt]:,}{u}",
               f"전체 {d[tt].sum():,}{u} 중 방산 태그 {d[dp].sum():,}{u}({_pct(d[dp].sum(), d[tt].sum())})"]
        busy = d[d[tt] >= MIN_BASE]
        if len(busy) and busy[dp].sum():
            hi = busy.loc[(busy[dp] / busy[tt]).idxmax()]
            out.append(f"방산 태그 비중이 가장 높은 해: {hi[y]}년 ({_pct(hi[dp], hi[tt])})")
        return out
    if kind == "network":                # [대분류, 중분류, 직무 수]
        majors = table.groupby(c[0])[c[2]].sum().sort_values(ascending=False)
        if majors.empty:
            return []
        total = int(majors.sum())
        return [f"현재 조건 직무 {total:,}개 · 대분류 {len(majors)}개 · 중분류 {table[c[1]].nunique()}개",
                f"직무가 가장 많은 대분류: {majors.index[0]} {majors.iloc[0]:,}개({_pct(majors.iloc[0], total)})",
                f"가장 적은 대분류: {majors.index[-1]} {majors.iloc[-1]:,}개"]
    return []
