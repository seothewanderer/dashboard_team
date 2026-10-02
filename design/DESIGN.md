# DESIGN.md — Green Deck for the Drone Career Dashboard (Streamlit)

- Source system: **Green Deck** (`green-deck-DESIGN.md`, supplied by the user 2026-09-30) plus the user's reference screenshots (dark and light variants of the Green Deck dashboard).
- Replaces: the previous "Chapter" design system. The full previous document is kept at `design/archive/DESIGN_chapter_2026-09-30.md`.
- Kept from the previous document (user decision 2026-09-30): the **Pretendard** font (§3), the user's **Defense vs General** rules (§9), and the project decisions and motion rules recorded during implementation (§10, §12).
- Target: `C:\Projects\Dashboard\main` — Streamlit 1.64 + ECharts dashboard (see `../plan.md`).

Value labels used in this document:

| Label | Meaning |
|---|---|
| (source) | Value written in the Green Deck md |
| (derived) | Not in the md; measured from the user's reference screenshots or derived from source values. Treat as **Proposed (not in source)** |
| (changed) | Differs from the md on purpose (accessibility or a user request); the reason is given |
| (kept) | Carried over from the previous DESIGN.md |

When a value here and the code disagree, this document wins. Only `core/theme.py` holds the values in code.

---

## Table of contents

1. Overview and principles
2. Content fundamentals
3. Fonts (Pretendard)
4. Colour tokens (dark and light)
5. Typography
6. Elevation, spacing, radius, layout
7. Components
8. Data visualisation
9. Defense vs General distinction (user rules)
10. Motion and hover
11. Streamlit implementation
12. Decisions and deviations log

---

## 1 Overview and principles

Green Deck is a bold, dark-first system: a high-energy green accent on deep black and charcoal surfaces. The UI recedes into darkness so content stays in front. For this dashboard the "content" is charts, KPI numbers and cards.

Do's and don'ts (source, adapted where marked):

- Design **dark-first**. Dark is the default theme on first visit; light is secondary but fully supported (the user asked for a light/dark toggle).
- Use pure white (`#FFFFFF`) for primary text on dark surfaces.
- **Don't use the green for large surface fills.** Reserve it for interactive accents, active states and the data marks that carry the analysis.
- **Scale elements on hover (1.04×)** for responsive feedback (buttons, entry buttons, KPI tiles).
- **Don't use borders to define containers.** Use surface colour differences (elevation, §6.1). Borders are only for inputs and subtle dividers.
- Keep copy short, scannable and label-like.
- Use uppercase tracking (0.1em) sparingly, for overlines only (it has no effect on Hangul; the weight and size still apply).
- (changed) "Don't use light or white backgrounds anywhere" applies to the dark theme only. The light theme exists because the user asked for it, and follows the light reference screenshot (§4.2).

## 2 Content fundamentals

- Voice: short, concrete, label-like. Questions in page intros, facts in captions.
- Korean: Pretendard covers Hangul; `word-break: keep-all` everywhere.
- Emoji: never. Allowed symbols: `·` as a separator, and (changed, user requests 2026-09-30) `☀` / `☾` on the light/dark toggle and (user request D3) an animated house icon before '홈' in the sidebar menu (`static/img/home.gif`, see §7 Navigation; replaces `⌂`). Icons otherwise come from Material Symbols in native widgets.
- Numbers: counts with thousands separators plus a Korean unit (`135건`, `11,077.19억원`); no K/M/B abbreviations for Korean units (kept, former G9).

## 3 Fonts (Pretendard) — kept

Only one family is used: **Pretendard** (the md's DM Sans and JetBrains Mono are replaced by Pretendard, user decision). The nine OTF files live in `design/` (source of record); the weights used are copied to `static/fonts/` and registered in `.streamlit/config.toml` with `[[theme.fontFaces]]`.

| Weight | File | Used for |
|---|---|---|
| 400 Regular | `Pretendard-Regular.otf` | body, captions |
| 500 Medium | `Pretendard-Medium.otf` | emphasised body |
| 600 SemiBold | `Pretendard-SemiBold.otf` | tooltip titles, table headers |
| 700 Bold | `Pretendard-Bold.otf` | titles, nav, buttons, labels, KPI numbers |
| 800 ExtraBold | `Pretendard-ExtraBold.otf` | hero title |

Weights 100/200/300/900 ship in `design/` but are not registered. Fallback stack: `"Pretendard", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Malgun Gothic", Arial, Helvetica, sans-serif`.

## 4 Colour tokens

Token names are the CSS custom properties injected by `core/theme.py`. The same names exist in both themes; only the values switch.

### 4.1 Dark theme (default)

| Token | Value | Role |
|---|---|---|
| `--bg` | `#121212` (source Background) | Level 0: main content area |
| `--sidebar-bg` | `#181818` (source Surface, "sidebar") | Left navigation. Measured `#1C1B1B` in the dark screenshot |
| `--surface` | `#181818` (source Surface) | Level 1: cards, chart cards, KPI tiles, right panel |
| `--surface-2` | `#282828` (source Level 2 / Border) | Hover state of Level 1, inputs, chips, tooltips, menus |
| `--surface-3` | `#333333` (source Level 3) | Dialogs |
| `--border` | `#282828` (source) | Subtle dividers only |
| `--text` | `#FFFFFF` (source Text Primary) | Titles, values |
| `--text-2` | `#A7A7A7` (source Text Secondary) | Metadata, captions, axis labels |
| `--text-3` | `#B3B3B3` (source Neutral) | Body copy, inactive nav |
| `--control` | `#535353` (source Secondary) | Inactive controls |
| `--outline` | `#727272` (source) | Secondary button border, checkbox border |
| `--primary` | `#1DB954` (source) | Interactive accents, active states, primary data marks |
| `--primary-hover` | `#1ED760` (source) | Hover on green elements |
| `--on-primary` | `#000000` (changed) | Text on green. The md says white, but white on `#1DB954` is 2.59:1; black is 8.12:1 |
| `--accent-soft` | `rgba(29,185,84,0.16)` (derived) | Active nav background, soft highlight rows |
| `--select-bg` / `--select-fg` | `#FFFFFF` / `#000000` (source, selected chip) | Selected chips and "selected" states (replaces the former teal) |
| `--warning` | `#F59B23` (source) | Warnings only (never data) |
| `--error` | `#E22134` (source) | Errors only |

### 4.2 Light theme (derived from the light reference screenshot)

| Token | Value | Note |
|---|---|---|
| `--bg` | `#F9F6F5` (derived) | Main area, measured |
| `--sidebar-bg` | `#F3F0EF` (derived) | Measured; one step darker than the main area so the sidebar reads as a separate zone |
| `--surface` | `#FFFFFF` (derived) | Cards and panels, measured |
| `--surface-2` | `#F3F4F5` (derived) | Hover, inputs, chips |
| `--surface-3` | `#FFFFFF` (derived) | Dialogs (with a shadow, since white-on-light cannot use brightness) |
| `--border` | `#E5E2E1` (derived) | Measured |
| `--text` | `#121212` (derived) | |
| `--text-2` | `#6B6B6B` (changed) | The md's `#A7A7A7` is 2.41:1 on white; `#6B6B6B` is 5.33:1 |
| `--text-3` | `#3A3A3A` (derived) | Body copy |
| `--control` | `#D1D1D1` (derived) | Measured chip grey |
| `--outline` | `#C0C0BE` (derived) | Measured input outline |
| `--primary` | `#0A873A` (derived) | Measured highlight bar. `#1DB954` is only 2.59:1 on white, so the light theme uses this darker green for marks and buttons (4.63:1) |
| `--primary-hover` | `#0B7A35` (derived) | One step darker (brighter would lose contrast on light) |
| `--on-primary` | `#FFFFFF` | 4.63:1 on `#0A873A` |
| `--accent-soft` | `#E0EDE2` (derived) | Measured pale-green tint |
| `--select-bg` / `--select-fg` | `#121212` / `#FFFFFF` (derived) | Inverse of the dark rule |
| `--warning` / `--error` | `#F59B23` / `#E22134` (source) | |

### 4.3 Chart and tooltip tokens

| Token | Dark | Light | Role |
|---|---|---|---|
| `--chart-primary` | `#1DB954` | `#0A873A` | Default data mark |
| `--chart-highlight` | `#53E076` (derived, measured "current" bar) | `#0A873A` | Hovered or selected mark |
| `--chart-dim` | `#2C5636` (derived, measured) | `#C2DAC9` (derived, measured) | Non-selected marks while a selection exists |
| `--chart-track` | `#282828` | `#F3F0EF` | Bar track, empty heat cells |
| `--chart-grid` | `rgba(255,255,255,0.06)` (derived) | `#EFEBEA` (derived) | Grid lines |
| `--chart-axis` | `#A7A7A7` | `#6B6B6B` | Axis and tick labels |
| `--chart-muted` | `#535353` | `#D1D1D1` | General marks when the defense highlight is on (§9) |
| `--tip-bg` / `--tip-fg` | `#282828` / `#FFFFFF` (source) | same | Tooltips in both themes |

## 5 Typography

Green Deck's scale, set in Pretendard (sizes and weights: source unless marked).

| Role | Size / line | Weight | Tracking | Use |
|---|---|---|---|---|
| hero | 64 / 72 | 800 | -0.03em | Home title |
| page-title | 32 / 40 | 700 | -0.02em | Page intro question |
| section-title | 24 / 32 | 700 | -0.01em | Section headings |
| card-title | 16 / 22 | 700 | 0 | Card and chart titles |
| body | 14 / 22 | 400 | 0 | Body copy, widget text (Streamlit `baseFontSize = 14`) |
| body-small | 12 / 18 | 400 | 0 | Card lines, table cells |
| label | 11 / 16 | 700 | 0.1em | Overlines, eyebrows |
| caption | 12 / 18 (changed) | 400 | 0 | Source lines, metadata. The md says 11px; Hangul at 11px is hard to read, so +1px |
| nav | 17 / 24 (changed, user request) | 700 | 0 | Sidebar menu. The md says 14px; the user asked twice for a larger menu font |
| data | 28 / 34 (derived) | 700 | -0.02em | KPI numbers, measured from the screenshot |

## 6 Elevation, spacing, radius, layout

### 6.1 Elevation (surface brightness, no shadows on dark)

Level 0 `--bg` → Level 1 `--surface` (cards, sidebar, panels) → Level 2 `--surface-2` (hover, menus) → Level 3 `--surface-3` (dialogs). **Hover lightens a surface by one level.** In the light theme, Level 1 is white on the off-white `--bg`, and Level 3 adds the shadow `0 4px 12px rgba(0,0,0,0.12)` (derived) because brightness alone cannot lift white.

### 6.2 Spacing (source)

Base 8px. Scale 4, 8, 12, 16, 24, 32, 48, 64. Component padding 16 (24 for section headers). Section spacing 40 between major sections, 16 between related groups. Container max width 1600 with 32px side margins. Card grid gap 24.

### 6.3 Radius (source)

2px small badges · 4px inputs, tooltips, menus · 8px cards, dialogs, chart cards · 12px large panels (home hero, right panel) · 9999px buttons, chips, search, toggles.

### 6.4 Layout

| Area | Value | Note |
|---|---|---|
| Left sidebar | 240px (source), `--sidebar-bg` | Menu font 17/700 fits "04 채용·기업 탐색" on one line (measured 123px text in a 176px item). Every menu item (홈 ~ 04) is 44px high with a 48px pitch (user request) |
| Top bar | 56px, on `--bg` (derived) | Service name · current screen · scrap count · roadmap toggle. No black band |
| Centre | fluid; container max 1600 incl. panel | 32px side margins |
| Right roadmap panel | 260px, `--surface`, 12px radius (derived from the screenshot's right column; 240 below 1440px) | |
| Grid gap | 24px | |

## 7 Components

- **Buttons**: primary = `--primary` fill, `--on-primary` text, 32px high, 32px horizontal padding, pill, 14/700, +0.05em (uppercase has no effect on Hangul). Hover: scale 1.04 and `--primary-hover`. Secondary: 1px `--outline` border, transparent, `--text`. Ghost (tertiary): `--text-3`, hover `--text`.
- **Cards**: `--surface`, 8px radius, no border, 16px padding. Title 16/700 `--text`, subtitle 14 `--text-2`. **Hover: background → `--surface-2` over 200ms, lifts 2px** (derived).
- **Inputs**: 40px high, `--surface-2` background, 4px radius, 12px horizontal padding, `--text-3` placeholder, no border; focus = 1px `--text` border.
- **Chips / pills**: pill, `--surface-2` background, `--text`, 14/400, 4px 12px padding. Selected: `--select-bg` / `--select-fg`.
- **Checkboxes / toggles**: unchecked 1px `--outline` border; checked `--primary` fill.
- **Tooltips**: `--tip-bg`, `--tip-fg`, 4px radius, 8px 12px padding, 12px, shadow `0 4px 12px rgba(0,0,0,0.4)`.
- **Navigation**: sidebar links `--text-3` 17/700, all items 44px high (`--nav-item-h`). *Proposed (not in source), user requests D1–D3:* the service name at the top is 22/800 (`--font-brand`) with a 12px `--primary` dot ringed in `--accent-soft` and a 1px `--border` rule below it; menu numbers sit in a fixed 36px column (`--nav-no-w`) at 19/800 with tabular figures so every name starts at the same x; the home item puts a 22px house icon (`--nav-icon`) in that column, drawn as a mask in the text colour — at rest the first frame, on hover it plays flat → 3D once and holds the 3D frame. Hover `--text` on `--surface-2`; active `--text` on `--accent-soft` with a 3px `--primary` left bar (derived from the screenshot's active pill).
- **Badges**: 2px radius (source "small badges"), 11/700. Neutral = `--surface-2`/`--text`; defense = §9.
- **Search** (text inputs used as search): pill, `--surface-2`.

## 8 Data visualisation

Charts are drawn with ECharts (§11.3). Rules:

- **One data hue**: marks use `--chart-primary`. Categories are identified by axis labels, not by colour (the dashboard's charts are single-series).
- **Hover** (A2): the hovered mark turns `--chart-highlight` and gets a soft glow (`shadowBlur` 12). **Other marks do not fade on hover** (removed 2026-09-30 at the user's request). The tooltip shows value, share of the shown total and rank.
- **Selection** (click or chip): selected marks `--chart-highlight`, the rest `--chart-dim`; the selected category label is bold (selection is never colour-only).
- **Sequential** (heatmaps, tile maps): single hue from `--chart-track` to `--chart-primary`.
- Bars: 14px bar on a full-width track, pill ends; vertical bars 4px top radius. Lines 2px.
- Warning and error colours are never data colours.

Palette validation (dataviz validator, 2026-09-30):

| Pair | Result |
|---|---|
| dark `#1DB954` vs defense `#D53B00` | CVD ΔE 10.2 pass, normal ΔE 33.9 pass, contrast pass; `#1DB954` sits slightly above the dark lightness band (L 0.689) — brand value kept, value labels always shown |
| dark `#53E076` (highlight) vs `#D53B00` | CVD ΔE 21.5 pass |
| light `#0A873A` vs `#D53B00` | CVD ΔE 7.4 = **floor**: legal only with secondary encoding → hatch, dashed outline and the `방산` text label are mandatory (§9) |
| Green vs `#F59B23` (source warning) as a defense colour | dark CVD ΔE 3.7 **fail** → the warning amber is never used for defense |

## 9 Defense vs General distinction — user rules (kept, recoloured)

These rules apply to every chart, legend, tooltip, KPI tile, table and card that shows defense-related data next to (or instead of) general data. They only assign tokens to a defense/general meaning.

Terminology: **Defense** = records classified by `plan.md` §6.4 as *direct* (원문 직접확인) or *candidate* (교차출처 후보, 방산인접 탐색후보). **General** = everything else, including 미분류. **Highlight toggle** = the "방산 강조" control; it is not the "방산 관련만 보기" filter and not the "방산 우선" sort.

### 9.1 Visual encoding

| Role | Dark | Light | Token |
|---|---|---|---|
| Defense – direct (fill/stroke) | `#D53B00` | `#D53B00` | `--defense-strong` (kept; theme-independent) |
| Defense – candidate (fill) | `rgba(213,59,0,0.4)` | same | `--defense-candidate` (Proposed) |
| Defense – candidate (outline) | `#D53B00` dashed | same | |
| Defense badge | `#D53B00` bg / `#FFFFFF` text (4.71:1) | same | |
| General – single series | `--chart-primary` `#1DB954` | `#0A873A` | |
| Muted mark (toggle ON) | `--chart-muted` `#535353` | `#D1D1D1` | |

- Orange is reserved for defense. General never uses orange; red (`--error`) never appears as a fill in a chart with defense marks.
- Contrast of `#D53B00`: on `#FFFFFF` 4.71, `#F9F6F5` 4.38, `#121212` 3.97, `#181818` 3.77, `#282828` 3.13 (all ≥ 3:1 for graphics). Defense **text** is never orange; use the badge.
- **Secondary cues are mandatory** (§8 validation): direct = solid orange + 45° hatch (canvas-coloured 1px line every 6px); candidate = 0.4-alpha orange + hatch + dashed outline; lines/points use diamond markers; direct labels read `방산` / `방산 후보`.
- Labels: `방산` for defense, `일반` for general; defense listed first in legends and tooltips; defense subsets state their n (e.g. `방산 n=18`), computed from data.
- Mixed chart: defense orange group on top, general in `--chart-primary`; totals include both. Defense-only chart: orange plus neutral context marks only. Side-by-side: same axis range, defense left/top, each card states its n.

### 9.2 Highlight toggle

- **Dim, don't hide**: ON keeps defense marks at full colour and turns general marks `--chart-muted`. Counts, axes and order never change.
- Control: pill toggle. OFF = chip style (`--surface-2`, `--text`); ON = `--defense-strong` fill, white text, label `방산 강조 켜짐`. A status line `방산 강조 중 · 건수는 바뀌지 않습니다` shows while ON.
- Scope: charts (above), KPI tiles and cards (defense = 2px orange border, solid/dashed by tier, + badge; general = muted text), tables (defense rows marked with the badge). Tooltips and dialogs stay unchanged. Controls, counts and sort order are never affected.
- Transition: colour only, `--duration-base`; instant under reduced motion.

## 10 Motion and hover

| Effect | Where | Value |
|---|---|---|
| Hover scale 1.04 (source) | buttons, home entry buttons, KPI tiles | 150ms `--ease-standard` |
| Card hover | cards, chart cards | surface one level up + 2px lift, 200ms (source 200ms ease) |
| Nav hover / active | sidebar | colour and background 150ms |
| Sidebar show/hide (user request) | sidebar | slides in/out from the left, 300ms `--ease-standard` (width stays fixed) |
| Chart entry / update | ECharts | 500ms / 300ms `cubicOut` (kept) |
| Chart hover emphasis | ECharts | highlight colour + glow on the hovered mark only (§8) |
| Number count-up | KPI tiles | 900ms cubic ease-out (kept) |
| Tile/card rise-in | KPI tiles, cards | 400ms / 200ms (kept) |
| Home drone | M01/M02 | Replaced on 2026-10-02 by the teammate-based 3D hero (§12.11, `components/home_hero`). The old SVG drone (ring pulse, float, D9 large/small sizes) was removed from the app |
| Home icon hover | sidebar '홈' | flat → 3D once (~0.6s), holds while hovered (user request D3) |

No bounces, no parallax. Everything above is disabled by `prefers-reduced-motion: reduce`; the drone also has a '움직임 멈추기' button (`ui.motion`). `--ease-standard` = `cubic-bezier(0.2,0,0,1)`, `--duration-fast` 150ms, `--duration-base` 200ms.

## 11 Streamlit implementation

### 11.1 Themes and the light/dark toggle

- `.streamlit/config.toml` defines `[theme.dark]`, `[theme.light]` and their `.sidebar` sections with §4 values, `baseFontSize = 14`, `baseRadius = "4px"`, `buttonRadius = "full"`, Pretendard `fontFaces` (400/500/600/700/800).
- `core/theme.py` injects the §4 tokens as CSS custom properties for the mode reported by `st.context.theme.type` and builds the ECharts theme.
- **Toggle** (user request A5): a `☀ 라이트` / `☾ 다크` switch at the bottom of the sidebar. Streamlit cannot change the theme from Python, so the toggle (a `components.v2` component) writes Streamlit's own saved theme (`localStorage["stActiveTheme-<path>-v2"] = "Light" | "Dark"` for every page path) and reloads. Because a reload starts a new session, the user's selections are saved in the browser first (plan.md §7.2) and restored after the reload.
- **Dark-first**: on the first visit (no saved theme) the app stores `"Dark"` and reloads once.

### 11.2 Layout and CSS

Global CSS lives in `static/css/base.css` and uses only `var(--…)`. Streamlit DOM selectors are confined to that file. The sidebar width is fixed at 240px and only its position is animated, so show/hide slides. The right roadmap panel's column is `position: sticky` (top `--space-md`) so the panel follows the scroll (user request D5); the centre column takes the remaining width (no wrapping) above 767px. *Proposed, user request D7:* each roadmap step shows '살펴보기' (`--primary` caption link) and, when something is scrapped, a caption-size '해제' text button in `--text-2` (`--text` on hover) on the same line.

### 11.3 ECharts mapping (`components/charts.py`)

| Rule | ECharts setting |
|---|---|
| Theme | `color` = `--chart-primary`; transparent background; Pretendard; axis labels `--chart-axis` 12px; grid `--chart-grid`; no axis lines/ticks |
| Tooltip | `--tip-bg`/`--tip-fg`, 4px radius, 8px 12px padding, 12px text, shadow `0 4px 12px rgba(0,0,0,0.4)`; value + share + rank |
| Hover emphasis | `emphasis.itemStyle`: highlight colour + `shadowBlur` glow. No `focus`/`blur` (other marks unchanged) |
| Horizontal bar | 32px rows, 14px bar, full-width `--chart-track` background, pill ends, value label right |
| Selection | selected `--chart-highlight`, others `--chart-dim`, selected axis label bold |
| Heatmap / tiles | `visualMap` `--chart-track` → `--chart-primary`, `--bg` gaps, hover border `--text` + glow |
| Treemap | one hue (`--chart-primary`) at varying alpha; hover border |
| Defense marks | §9 (decal hatch, dashed border, muted general marks when highlight ON) |
| Click → filter | `events.click` → the same session key as the chip row |

### 11.4 Interactive tables (streamlit-aggrid)

Evidence tables ('근거 자세히'), comparison tables and the company evidence ledger use AgGrid: row hover `--surface-2`, sortable columns, quick filter. The grid lives in an iframe, so `core/theme.py` passes resolved token values (not `var()`) to its custom CSS.

### 11.5 Component mapping

| Design | Streamlit |
|---|---|
| Buttons | `st.button(type="primary" / "secondary" / "tertiary")` + CSS (§7) |
| Chips | `st.pills`, `st.segmented_control` + CSS |
| Cards | keyed `st.container` (`st-key-card-*`) + HTML body |
| Chart card | keyed container `st-key-chart-card-*`, `--surface`, 8px radius, 24px padding |
| KPI tiles, drone, theme toggle, browser store | `components.v2` (`components/effects.py`, `components/browser.py`) |
| Dialogs | `st.dialog` + CSS (`--surface-3`, 8px radius) |

## 12 Decisions and deviations log

| # | Topic | Decision |
|---|---|---|
| D1 | Design system | Chapter → Green Deck (user, 2026-09-30). Chapter archived in `design/archive/` |
| D2 | Font | Pretendard kept instead of DM Sans / JetBrains Mono (user) |
| D3 | Light theme | Values derived from the user's light screenshot (§4.2); dark stays the default (source "dark-first") |
| D4 | Text on green | Dark: black on `#1DB954` (white fails, 2.59:1). Light: white on `#0A873A` |
| D5 | Selection colour | The former teal `--project-select` is dropped (too close to green). Selection uses the source "selected chip" inverse (`--select-bg`/`--select-fg`) plus a check icon or text |
| D6 | Analysis emphasis colour | Green (`--chart-primary`) replaces the former blue ("파랑 = 분석" in plan.md §5.5) |
| D7 | Defense colour | `#D53B00` kept; source warning `#F59B23` fails CVD against green |
| D8 | Nav font | 17px, items 44px high (user requests; source 14px) |
| D9 | Caption size | 12px (source 11px) for Hangul legibility |
| D10 | Symbols | `☀` / `☾` on the theme toggle (user request). Home menu item: `⌂` replaced by the user's animated house icon (D3, 2026-09-30) |
| D11 | Sidebar colour | `#181818` / `#F3F0EF` per the md's Colors list and the screenshots (the md's Navigation line says `#000000`) |
| D12 | Home drone | SVG illustration on a `--surface` panel (plan Q5 interim) |
| D13 | Motion additions | §10 (user request for more visual effects) |
| D14 | Hover visuals | ECharts emphasis + CSS hover + streamlit-aggrid tables (user request A2) |
| D15 | Hover fade | Removed: hovering a chart no longer fades the other marks (user request 2026-09-30). Selection (click/chip) still dims the unselected marks |
| D16 | Sidebar brand and numbers | Brand 22/800 above the menu, menu numbers 19/800 in a fixed column (user requests D1–D2, 2026-09-30) |

### 12.1 E-round additions (user requests 2026-09-30)

- **Type scale ×1.2 (E1, Proposed):** every text role in the main area and dialogs is 1.2× the §5 value (`core/theme.FONT_SCALE`), including chart text and Streamlit widget text (`--native-text`). The sidebar and cards (job/course/posting/company cards, KPI tiles) keep the §5 sizes; card titles are 1.2×.
- **Green gradient (E6, Proposed):** strong greens use a gradient. The colors were sampled from the Green Deck example screenshot.
  - Buttons: `linear-gradient(135deg, --grad-start, --grad-end)`. Light `#04762F → #0A873A` (white text ≥ 4.63:1); dark `#15A448 → #1ED760` (black text ≥ 6.44:1). The example's bright end `#1AB050` is not used on buttons because white text on it is only 2.85:1.
  - Chart bars: `--chart-grad-start → --chart-grad-end`. Light `#04762F → #1AB050`, dark `#15A448 → #1ED760`. Horizontal bars run dark (left) → bright (right); vertical bars run dark (top) → bright (bottom).
  - Sequential maps and heatmaps keep a single-hue ramp.
- **Scrap button (E2):** the card's main action is the green primary button. The scrapped state keeps the green and adds a filled bookmark icon plus the text '스크랩됨'.
- **Korea map (E3):** province map (KOSTAT 2013, simplified). Areas use the sequential green ramp. Metro cities and 세종 are labelled outside their boundary, joined by dashed `--chart-axis` leader lines. Hover and selection behave as §8.
- **Defense contrast color — red (E7, Proposed, not implemented; replaces §9 orange when the defense update lands):**

| Role | Value | Note |
|---|---|---|
| Defense strong | `#E22134` | Green Deck source red |
| Defense deep (gradient start) | `#8E1B26` | deep red sampled from the example (`#7C1420`–`#9A4F58`) |
| Defense gradient | `#8E1B26 → #E22134` | same direction rules as the green gradient |
| Defense candidate | `rgba(226,33,52,0.4)` + dashed `#E22134` outline | |
| Defense soft background (chips, badges) | light `#FFE5E5`, dark `rgba(226,33,52,0.16)` | example badge background |
| Badge text | white on `#8E1B26` (8.99:1) | white on `#E22134` is only 4.67:1 |

Validation (Machado CVD simulation, OKLab ΔE×100):
- **Dark:** `#1DB954` vs `#E22134` deutan 8.8 → pass.
- **Light:** `#0A873A` vs `#E22134` deutan 6.9, and `#1AB050` vs `#E22134` deutan 6.5 → both at the **floor**. Red–green is the hardest pair for colour-blind readers.

So when red is used for defense:
- The §9 secondary cues (45° hatch, dashed candidate outline, `방산` text label) remain mandatory.
- `--error` (also `#E22134`) must always carry an icon and text so it is never confused with defense.

### 12.2 F-round (user requests 2026-10-01) — applied

- **Defense colour applied (F2, replaces the §9 orange):** the §12.1 red values are now live tokens. `--defense-strong` `#E22134`, `--defense-deep` `#8E1B26`, `--defense-grad-start/end` `#8E1B26 → #E22134`, `--defense-soft` (light `#FFE5E5`, dark `rgba(226,33,52,0.16)`), `--defense-candidate` `rgba(226,33,52,0.4)`.
  - Chart marks: red gradient plus 45° hatch. Candidate marks: alpha red plus hatch, with a solid outline (no dashes).
  - Stacked and diverging bars always have a legend. The "other" series is `--chart-muted`.
  - §9's orange values are superseded. The §9 rules otherwise stand: secondary cues, dim-don't-hide, and counts never change.
- **Defense cards (F6):** always shown, not only when the toggle is on.
  - 2px `--defense-strong` solid border.
  - 5px left bar with a vertical red gradient.
  - Background runs from `--defense-soft` into `--surface` (to 45%).
  - Badge text: '방산 관련 기업' (companies and postings) or '방산기업 근무처' (jobs), white on a deep-red gradient (8.99:1). Tier names appear only in dialogs.
  - The '방산 강조' toggle now only mutes general marks and cards.
- **Goal-job highlight (F5):** toggle pill; ON uses the green gradient with `--on-primary` text.
  - Related cards: green inset left bar. When a card also has the defense bar, the green bar sits inside it.
  - Related cards also get a badge '목표 직무 관련 · reason' (`--accent-soft` plus green indicator).
  - Unrelated cards: `--faded-opacity` 0.45, back to 1 on hover.
- **Chart titles and bars (F8):**
  - Chart-card title role `chart-title`: 20/26/700, ×1.2 = 24px.
  - Horizontal bars 22px on 42px rows; vertical bars up to 32px wide.
  - Category axis labels use `body-small` (14px after the scale) so the thicker bars dominate.
- **Job network (F3, J01):**
  - Radial fixed layout: root → major → middle → job, rings 1.6 / 2.6 / 3.5.
  - Overview shows major labels only.
  - Selecting a node: selected and connected nodes grow ×1.4 at full opacity; the rest shrink ×0.55 at 0.18 opacity and move to the outer ring. The selected branch is scaled to fill the view, with the width/height ratio 1.35 used. The chosen middle category's jobs fan out over 170°. The root becomes a small '전체 보기' node.
  - Movement animates at 600ms `cubicInOut`. Hover emphasises only the hovered node (no fading, per C1).
- **Sidebar sub-menu (F7):** '채용 현황' / '기업 탐색' at 70% of the nav size (`--nav-sub-ratio` 0.7, 11.9px).
- **Roadmap steps (F9):** a step holding items uses the sidebar active style (`--accent-soft` plus a 3px `--primary` inset bar).
- **Side-by-side chart cards:** fill the row height, so neighbouring cards line up.

### 12.11 P-round (user requests 2026-10-02, home from teammate + sidebar icons) — Proposed (not in source)

Source: the teammate's home-only build (`home-only.html`). Values are copied from it into `core/theme.py` as `--hm-*` tokens (BASE for sizes/fonts, MODE for stage and airspace colours). They replace the D9 home drone in §10 for the home page.

- **Home layout:** title → subtitle → summary card → drone stage → '이렇게 이용해 보세요' roadmap → FAQ → note.
  - The title text stays ours ('드론 진로 탐색'). Its size follows the teammate's: 44/52, weight 800, -0.025em (`--hm-font-title`). The 64px `hero` type is no longer used on home.
  - The old overview tiles ('이 대시보드에서 볼 수 있는 것'), the five '… 보기' buttons and the button-menu expander are removed (user decision).
- **Summary card** (`components/home_hero`): one `--surface` panel, `--radius-lg`, a 1px inner line (`--text` at 7%), 4 columns split by 1px `--surface-3` rules.
  - Label 600 13/18 `--text-2`. Value 700 clamp(26–34px)/40 `--text`, tabular figures. Unit 600 clamp(14–17px).
  - Numbers count up over `countup_ms`. Columns drop to 2 below 1024px and to 1 below 560px.
- **Drone stage:** 540px high, `--radius-lg`, background `--hm-stage-bg` (night gradient in dark, day mist in light).
  - **Airspace canvas.** A seeded point-cloud of buildings, hills and ridges rises and fades in 15 slots.
    - Object colour by height: ≤150m is teal/green, >150m is muted red.
    - There is a dashed 150m limit line, up to 6 altitude labels, and a hover zone under the drone.
    - Dark adds stars. Light adds a river, two bridges and atmospheric haze.
    - Colours come from the `--hm-air-*` tokens as 'r,g,b'.
  - **3D drone.** A silver foldable drone generated in code with Three.js 0.169.0 (`static/vendor/three`, served offline). Its motor lights are `--hm-motor-cw/ccw`. If 3D fails to load, an SVG drone (`--hm-sv-*`) takes its place.
  - **Motion:**
    - **First visit:** the drone flies in from 2 o'clock, outside the viewport, on a curve (2.4s), settles briefly, then moves closer.
    - **Click the drone:** it steps back (smaller) and five panels unfold in a pentagon with 3D depth and a stagger. Click again or press Esc to close (the drone returns, bigger).
    - **Hover a panel:** the drone turns toward it (yaw, pitch, bank) and dashed guide lines show.
    - **Click a panel** (new; the teammate's version stayed in place):
      - The panels fold, the drone turns and accelerates toward that panel and off-screen (~1.4s), then the page changes.
      - Coming back to home, the drone returns from that panel's direction. Leaving through the sidebar means it returns from 2 o'clock.
    - The pause/play icon (32px, top right) is the existing 'motion' setting.
    - When motion is off or reduced motion is set, all flights are skipped.
- **Roadmap guide:** 4 steps in one `--surface` panel.
  - Each step has a 32px numbered circle (1px `--primary` ring, `--primary` 700 14px figure), and 1px `--surface-3` connectors run on the circles' centre line.
  - Step titles are 700 16/24; bodies use `--font-body` in `--text-2`.
  - Steps follow the page order 01→04, which is also the order of 나의 탐색 경로 01–04. A caption below says so.
  - Layout: 2 columns below 1024px; a vertical rail below 767px.
- **FAQ:** a section title, then the existing expanders. The content was rewritten for the current features (red defense colour, card expanders, search box, star/bookmark, 내 조건, motion button).
- **Sidebar icons:** the 01–04 numbers are replaced by icons drawn as masks in the text colour, the same way as the home icon: question mark, magnifier, book and people.
  - At rest each shows its first frame; on hover its GIF motion plays once. The column stays 22px (`--nav-icon`) inside 36px (`--nav-no-w`).
  - Stroke weight matches the home icon (user decision). The 24px people icon is redrawn as clean circles and arcs with the same per-part motion as the GIF (`scripts/make_nav_icons.py`).

- **Q-round follow-up (2026-10-02):**
  - **Sidebar icons** (not home): on hover the GIF motion now loops for as long as the pointer stays, like the 01 KPI card icons. The home icon still plays once and holds.
  - **Menu panels:**
    - The 'P1–P5' prefixes are removed. Each title starts with a 20px static icon (`--hm-panel-icon`) in `--primary`, drawn as a mask from the first frame:
      - 산업 이해 = question mark
      - 직무 탐색 = magnifier
      - 준비 역량 = book
      - 채용 공고 = people
      - 기업 탐색 = the 01 KPI building
    - Title 700 16/22 and description 400 13/20 (were 14/20 and 12/18).
    - Padding 12px top and bottom (`--hm-panel-pad-y`); width 216px so the larger text fits.
  - **Drone gaze:** before and after the menu opens, the drone looks toward the pointer anywhere on the stage, with the same yaw/pitch/bank/offset as a panel hover.
    - The gaze is weaker near the drone itself.
    - Over a panel it looks at the panel's centre.
    - Leaving the stage, or moving over the summary card, returns it to facing forward.

- **R-round — home summary card (2026-10-02), user chose option C:**
  - Still one `--surface` panel with 1px `--surface-3` dividers.
  - **Each cell is a button.** Layout, left to right: a 34px icon (`--hm-kpi-icon`, `--primary` mask), then the label and value, then an 8px chevron (`--hm-kpi-go`).
  - **Icons:** 직무 = hand-raised person, 학습 = diploma, 공고 = two sheets, 기업 = building.
    - The icons are made the same way as the 01 KPI icons (`make_kpi_icons.py`).
    - At rest they show the first frame. On hover the motion loops, unless motion is off.
  - **Hover:** the same style as the drone menu panels — `--accent-soft` background, a 3px `--primary` inset bar on the left, and a green chevron that moves 4px.
  - **Click** goes straight to the page, with no drone flight:
    - 직무 → 02
    - 학습 → 03
    - 공고 → 04 채용 현황
    - 기업 → 04 기업 탐색
  - The label '탐색 조직 · 개 조직' is renamed '관련 기업 · 개 기업'.

- **S-round (2026-10-02):**
  - **Home job icon:** the 24px hand-and-person GIF is redrawn as clean circles and curves, with the same stroke as the other KPI icons.
    - The motion is read from the source: the person dips into the palm and comes back, and the hand bobs 1px.
    - The person is clipped above the palm line, so it looks as if it sinks into the hand.
  - **'More' buttons under bar charts** (01 I02, 04 C01): no border. Only the label and chevron show.
  - **04 C01** uses the 01 collapse: top 8 plus 2 preview rows that fade and blur, then a centred more button.
  - **04 company page:**
    - The defense-group chart (C01G) and its chips are removed.
    - C01 and C04 sit side by side, 1:1.
    - **C04 when 방산 강조 is off:** C04A, '기업의 채용 공고 노출'. It shows the top 10 companies with linked postings. Defense companies stay red (tier fill/decal) whatever the toggle state; the others use the green gradient.
    - **C04 when 방산 강조 is on:** the defense-only chart, with the 0-posting names listed in a caption.

- **T-round (2026-10-02):**
  - **One defense bar style everywhere:** dark red → red gradient plus 45° decal, for both evidence tiers. This changes §9.1: the tier difference (direct vs candidate) is no longer drawn on bars.
  - **Hovering a defense bar** keeps it red, adds a red (`--defense-strong`) glow and turns its value label red. Defense bars no longer switch to the green highlight.
  - **04 C01** uses the same overlay bars as 01 I02 (total green plus the defense part).
  - **Collapsed field charts** (01 and 04): picking a field from the blurred last row or below, by chip or bar, expands the list automatically.
  - **Sidebar 04 parent:**
    - The label navigates to 채용 현황.
    - A separate 24px chevron (`--space-lg`) overlaid at the right edge only folds or unfolds the submenu.
    - The active background sits on the row, so both read as one item.

- **U-round, 04 C01 (2026-10-02):**
  - **Basis switch:** a segmented control at the top of the card with three options — 기업 수, 공고 있는 기업 수, 연결 공고 수.
    - Bar order, the collapse and the red defense part all follow the chosen basis.
    - The footer meta switches between C01, C01P and C01N.
  - **Co-occurrence:** when a field is picked, the same card shows a second overlay chart below it, titled '‘X’ 기업들이 함께 하는 분야' (`.chart-card__subhead`, card-title font).
    - It lists the top 8 other fields, with their defense part in red.
    - Clicking a bar switches the selection to that field.
    - Under a posting basis, only companies with linked postings are counted.

- **V-round (2026-10-02):**
  - **Wording:** on screen, '방산 근거' becomes '방산 관련' (legends, subtitles, table headers, sort label, help text, group name '방산 관련 미확인'). Plain '방산 기업' is avoided so it does not read as an official designation.
  - **C01 basis control:** one rounded track (`--surface-2`, `--radius-full`, 4px padding) holding three pill buttons — 전체 기업 수, 채용 기업 수, 채용 공고 수.
    - Only the chosen pill is inverted: `--select-bg` / `--select-fg` (white in dark mode, black in light). This is the same pattern as the sidebar theme switch.
    - The default is 전체 기업 수.

- **W-round (2026-10-02):**
  - **Single-choice button groups** (segmented controls, e.g. 정렬, 03 분류 and 후보 그룹, 04 C01 기준) all use the rounded track with only the chosen pill inverted (§V).
    - Underline tabs (04 하위 탭, 03 찾는 방식) keep their tab style.
    - Multi-select chips keep their own style.
  - **Card lists** use one pager: '전체 N개 중 a~b  ‹ 이전 10개  현재 / 전체  다음 10개 ›'.
    - The pager wraps around: 'previous' on the first page goes to the last page, and 'next' on the last page goes to the first.
    - It replaces the company-list '기업 더보기' popup.

### 12.10 O-round (user requests 2026-10-02, global + 02) — Proposed (not in source)

- **Card base border:** every card has a `--card-border-w` border in `--control` (dark #535353, light #D1D1D1). Defense, drone, goal and picked styles override it as before.
- **Search box** (`components/search_box.py`): one search pattern everywhere. It is a selectbox with type-ahead suggestions (like a portal search bar). Opening it shows the full list, and free text is accepted (Streamlit shows 'Add: …').
  - Used for: 02 job/skill search (job titles + skills; picking a value opens the job cards below), 04 company keyword (company names, areas, drone subfields).
- **02 filters:** the evidence-type pills are removed.

### 12.9 N-round (user requests 2026-10-02, 04 채용 현황) — Proposed (not in source)

- **KPI icon cards** (same as 01 §12.4): paper (postings), buildings (companies) and shield (defense share).
  - The defense card uses `tone: defense`: circle `--defense-soft`, glyph and number `--defense-strong`.
- **Posting-conditions box** (was my-conditions, request N12): the top chips and region dropdown share state with the career/education bars and the map. Selecting or clearing in either place updates both, and the chips under the bar charts are removed. It is a single row. Each label (`--font-label`) sits left of its pills: education, career, '희망 지역' with a dropdown multiselect (overlay list, the row height does not change), and the defense toggle right-aligned. About half the previous height.
- **'어느 직무·지역의 공고인가'** (component `linked_chart_map`): job bars on the left and the province map on the right. Except for the mirrored layout it is identical to the 03 map + keyword bars:
  - Same sizing: map height = `map_h`; the bar area is map height minus the two title lines.
  - The defense part is drawn over the green total bar from 0 (`barGap -100%`), so both ends of the red bar are rounded.
  - Same thin bars: width = `bar_w` × 2/3, `chart-track` background, rounded ends, caption-size axis labels, bold values (`charts.thin_split_hbar`, `charts.thin_diverging_hbar`).
  - No pills in the card, only a one-line hint caption; filters are cleared with '필터 모두 해제'.
  - Hovering a province switches the bars to that province with no rerun. Clicking the map filters by region; clicking a bar filters by job. Job and region pills sit below.
  - A '비율(%)로 보기' toggle switches between the two views below. It is disabled while '방산 관련 기업만 보기' is on.
  - The page-only red pill toggle '방산 관련 기업만 보기', inside the conditions box, filters everything below to defense-company postings. It is separate from the shared defense highlight.
  - (Earlier N3 note follows.) Two series only (defense red / '그 외 공고' green). The views are:
  - '공고 수': stacked bar; clicking filters by job
  - '비율': the former H07 diverging share chart; ignores the job filter
  The card meta, subtitle and table follow the active view.
- **Roadmap '내 조건' block** (N14): at the bottom of '나의 탐색 경로', below a `--outline` divider. It holds education and career single-select pills and a regions multiselect, with widget labels in `--font-label`. It is input only (saved) and feeds the posting dialog comparison and the 03 course ordering; it does not filter.
- **Goal highlight toggle** (04 채용 현황): moved inside the posting card expander, at the top.
- **Comparison empty state:** each missing item is a blue note box (`--note-bg`, text `--note-fg`; Streamlit info colors, Proposed) with an outlined blue button of fixed width `--note-btn-w` (200px): '직무 선택하러 가기' (to 02) or '공고 스크랩하러 가기' (opens the card expander and scrolls to it).

### 12.8 M-round (user request 2026-10-01, page 02) — Proposed (not in source)

- **3D job network (J01):** canvas 2D with perspective projection; no new library.
  - Layout: a core at the center; majors on a sphere r 0.46, middles on r 0.76, jobs on r 1.0 (jittered). Each branch clusters around its major's direction, using Fibonacci directions and cones.
  - Colors: by level, using tokens `--net-core`, `--net-major`, `--net-middle`, `--net-job` (green, from strongest to softest per mode). Defense-workplace jobs are `defense-strong` and 1.35× larger. With defense highlight on, only defense jobs and their middle, major and the core stay lit; all other nodes and links dim (same colors, low alpha, no gray).
  - Depth cue: farther nodes and links are smaller and fainter. Core, majors, focused middles and the hovered node get a glow.
  - Hologram: three orbit rings (`chart-primary`, low alpha), a radial `--holo-core` glow and faint horizontal scanlines (`--holo-scan`).
  - Motion:
    - Hovering the graph stops rotation; dragging rotates it.
    - Idle: a slow auto-rotation (max about 0.0032 rad/frame) whose speed and axis drift.
    - A focused branch turns to face the viewer and sways; zoom is 1.45 for a major and 1.9 for a middle.
    - Layout: the right column is only as wide as its content (max-content); the graph column fills the rest. The column is right-aligned and stretches to the graph height. From top to bottom it contains:
      - a '방산 관련 직무' button (red outline when off, red gradient fill with glow when on; same state as the defense highlight toggle elsewhere) and a '전체 보기' button (green outline; filled when no major is selected and defense is off). They are mutually exclusive: '전체 보기' clears the selection and turns defense off; '방산 관련 직무' clears the selection and turns defense on
      - the label '대분류' with a divider line (`--outline`) under it, then major pills one per line. While defense is on, majors and middles without defense-workplace jobs are dimmed (`--faded-opacity`). Each label block has `--space-lg` + `--space-md` (40px) of space above it
      - the label '중분류' with a divider line under it, then middle pills one per line, or the hint '대분류를 먼저 선택하세요'
      - at the bottom (no divider above it), a green '관련 직무 카드 보러가기' button (height `--button-h` × 1.2), pinned to the column bottom. It is the only control that scrolls: it opens the card expander and scrolls to it, smooth first and then an instant fallback. The card's footer divider also uses `--outline` 1px, matching the column dividers.
    - Card expander below: fixed label '직무 카드 보기' and fixed key, so it is never re-created and does not shift the page; only the user and the button above open it. The page 02 status line '방산 강조 중' is removed to avoid layout shift.
      Height = width × 0.9, clamped to 420–720px.
    - Focused sway: amplitude and period 0.16 / 420 frames for a major, 0.08 / 600 for a middle.
    - Labels while focused or defense-highlighted: only the highlighted branch is labelled; others show a label on hover only.
    - Motion off or reduced motion: no auto-rotation.
  - Labels: the core and front-facing majors are always labelled; middles when their major is focused; jobs when their middle is focused; otherwise on hover. The tooltip shows the name and count, or '누르면 상세'.

### 12.7 L-round (user requests 2026-10-01, cards) — Proposed (not in source)

- **Card action buttons** (label weight = `--type-button-weight` 700): green gradient (`--grad-start → --grad-end`, hover `--grad-hover-*`) on cards and dialogs.
  - Job: star + '해당 직무 선택' / '선택됨'. Course, posting, company: bookmark + '스크랩' / '스크랩됨'.
  - The icon is an alpha mask (`--card-icon` 18px, color `--on-primary`) from the user's GIFs:
    - unselected: outline; on hover it fills (plays once)
    - selected: filled; on hover it empties (plays once), hinting that a click cancels
- **Selected / scrapped card (option C):** `scale(--picked-scale 1.02)`, `--primary` border, `0 0 0 1px --primary` plus a soft green glow (`--picked-glow` 18px, `--picked-shadow` per mode).
  - Removing the selection restores the card.
  - Reduced motion: no scale.
  - Combines with the goal-related inset bar.
- **Drone course (always on):** like the defense card but green: left `--grad` strip, `--accent-soft` → surface background, and a '드론 교육' gradient badge.
- **Card list filter toggles:** pill toggles '방산 관련만 보기' (red gradient when on) and '드론 관련만 보기' (green gradient when on). They filter only the cards in the expander; charts are unchanged.
- **02/04 card lists** now sit in expanders: closed by default, and opened when the result is narrowed or a filter toggle is on.

### 12.6 K-round (user requests 2026-10-01, page 03 only) — Proposed (not in source)

- **Page 03 order:** linked map + keyword bars first (visible on entry) → section '키워드로 교육 찾기' → S03 posting-skill chart expander → course explorer expander.
- **Search modes:** two underline tabs (the existing `subtabs` style: transparent, `--indicator-w` green underline on the active tab): '교육 키워드로 찾기' / '채용 키워드로 찾기'.
  - Each tab has its own search box and pills, and only the active tab's selection filters.
  - The pill count is the related course count in both tabs, styled the same way (small muted parentheses).
  - The 채용 options in the search box show '교육 n · 공고 m'.
- **S03 bar click:** adds the skill to the 채용 tab selection and highlights the selected bars. A skill with no related course shows an info line instead of filtering.

### 12.5 J-round (user requests 2026-10-01, page 03 only) — Proposed (not in source)

- **Keyword search:**
  - Top row: a multiselect search box (type-ahead, multiple, removable tags; options show 'keyword (n)').
  - Below it, all keyword pills, wrapping onto multiple lines.
  - The pill count is rendered `keyword :small[:gray[(n)]]`: in parentheses, muted, smaller than the keyword.
  - The search box, pills and bar clicks share one selection.
- **Linked map + bars** (`components/linked_map.py`): one component with two equal columns (stacked under 767px). Left: the province map (same style as `charts.korea_map`). Right: a title '<region> · 키워드별 교육 과정', a caption, and horizontal bars.
  - Hovering a province switches the bars to that province with a 300ms update and no rerun. Leaving the map returns to the selected province or '전국'.
  - Selected keywords keep the green gradient, while the others use `chart-dim` with bold axis labels.
  - Tooltips are confined to the chart.
- **Filter chips:** '선택한 기술: X ✕' and '지역: X ✕' are secondary buttons in one row under the keywords.
- **Course explorer:** the expander '교육 과정 보기 · <condition> N개', closed by default. It opens automatically when a keyword or region is chosen. Inside are the goal toggle, group tabs (only if more than one group), a pager of 10 and course cards.

### 12.4 I-round (user requests 2026-10-01, page 01 only) — Proposed (not in source)

- **KPI icon card** (`stat_tiles` items with `icon`; 01 only, home tiles unchanged):
  - Layout: a circle of `--kpi-icon` (64px) on `--accent-soft` at the left, holding the icon at `--kpi-glyph` (40px). The title (`--font-card-title`), number and sub line sit to its right.
  - Padding is `--space-md` vertical and `--space-lg` horizontal, with a `--space-md` gap.
  - The number uses the new type role `kpi` (34px/40px, 800) in `--primary`. The unit and sub line are unchanged.
  - Icons are alpha-mask WebPs made from the user's GIFs (`scripts/make_kpi_icons.py`), painted `--primary`. A still rest frame is shown; on hover the looping animation plays. With motion off or reduced motion, it shows the rest frame only.
- **Line draw on open** (01 trend expander): the charts mount when the expander opens; lines draw left→right over `MOTION.line_draw_ms` (1400ms) with linear easing.
- **Fade preview** (01 business areas, collapsed): 2 extra rows are shown under the top 8. An overlay of `--preview-fade-h` (110px) fades to `--surface` with `--preview-blur` (3px), and the '분야 더보기' button sits directly below, centered.

### 12.3 H-round (user requests 2026-10-01, page 01 only)

- **Overlay bar** (`charts.overlay_hbar`, used on 01 for business areas and R&D techs): the total bar (green gradient on the track) with the defense subset drawn over it from 0 (red gradient plus 45° hatch, `barGap -100%`).
  - A legend names both series. The value at the end is the total.
  - The defense count appears inside the red segment only when that segment is at least 12% of the longest bar; otherwise it shows in the tooltip.
  - The tooltip gives total, defense count and defense share.
  - Selecting an item dims the others (opacity 0.35) and bolds its axis label.
- **"More" control:** a tertiary button with a down chevron ('분야 더보기 ⌄') or up chevron ('접기 ⌃'), replacing the toggle (01 only).
- **Clickable heatmap cells** (01 application areas): pointer cursor; the selected cell gets a `--text` border (stroke + 1); column labels rotate 30° to avoid overlap.
- **Project explorer:** the expander '연구 과제 탐색 · <condition> N개', evidence rows with a '방산 태그' defense badge, and a pager of 10. It opens automatically when a tech or cell is chosen.

