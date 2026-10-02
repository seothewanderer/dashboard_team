# Drone Career Navigator — User Custom Layer

## Purpose

This folder holds the user-built features of Drone Career Navigator as **feature modules** that teammates can reuse individually, separated from the teammate V4 Dashboard Core. The module catalog, contracts, and production load order are in [`CUSTOM_MODULES.md`](CUSTOM_MODULES.md).

## Source of truth

- Production entry: `v4_HOME_MERGED_2026-10-02.html` (V4 Dashboard Core + module loaders). `index.html` was retired on 2026-10-02.
- Validation: serve the repository root with any local static server, open `v4_HOME_MERGED_2026-10-02.html#home`, and check each hash route.

## Structure

```
custom/
  home/         drone-hero · airspace-core · airspace-dark · airspace-light · radial-navigation · home-layout (+ README)
  roadmap/      roadmap-workflow (+ README)
  layout/       dashboard-responsive · fixed-sidebar (+ README)
  integration/  v4-adapter.js · v4-adapter.css   — the only V4-aware code
  CUSTOM_MODULES.md · CUSTOM_CHANGES.md
```

## Integration With V4 Core

All V4 coupling lives in `integration/v4-adapter.js` and `integration/v4-adapter.css`:

- routing → V4 `go()` (panel key `"recruit.postings"` → `go("recruit", "postings")`)
- Home renderer → `PG.home = () => home.render()`; V4 `render()` is wrapped once to run the module mounts
- state → `S.ui.motion` and `S.ui.home_menu_open` exposed as the motion and menu inputs; persistence via V4 `save()`
- roadmap → V4 `roadmap()` markup decorated by Roadmap Workflow from `ROADMAP`, `stepItems()`, and `S.route`
- data → V4 `D.overview`, `C_.faq`, `ENTRIES`; text helpers `esc` / `fmt`
- boot → V4 `boot()` is called exactly once, by the adapter, after every hook is installed

No copies of `S`, `D`, `load()`, `save()`, `render()`, `go()`, hashing, scrap, dialogs, charts, or Non-Home pages exist in the custom layer. The teammate Core still contains its original `PG.home` and `act("hero" | "hero-go")` fallbacks. The adapter replaces `PG.home` at runtime, and the module markup uses its own `data-hm-*` hooks, so the Core Home actions are never triggered.

## Merge Guide For V5+

1. Use the new teammate V5/V6 file as the functional base. Its data, state, router, persistence, scrap, dialogs, charts, and Non-Home pages stay authoritative.
2. Keep or add the Three.js import map / module preloads for the Drone Hero.
3. Add the module stylesheets and scripts in the order listed in `CUSTOM_MODULES.md`. Make the Core script define its APIs without calling `boot()`.
4. Adapt only `integration/v4-adapter.*` to the new Core API (renderer hook, router call, state fields, roadmap markup selectors). The feature modules should not need changes.
5. Run Home pixel/motion parity and full Non-Home regression before replacing production.

## Change Log

### 2026-10-02 — Roadmap open-only drone reaction

- Date: 2026-10-02
- Request: Play the drone impact/roll reaction only when the roadmap panel opens; closing it must leave the drone in its normal hover
- Files changed: `integration/v4-adapter.js`, `CUSTOM_MODULES.md`, `CUSTOM_CHANGES.md`
- Reason:
  - The trigger moved from the toggle click to the actual state transition. After each render the adapter compares the previous `S.ui.roadmap_open` with the current value, and only `false → true` calls `triggerRoadmapOpenReaction()`.
  - On Home the reaction runs on the Drone Hero (`addEffect`, key `"roadmap-open"`). On other pages it runs on the roadmap drone (`react`).
  - The animation (`shared/drone-reactions.js` impact) is unchanged and exists in one place only.
  - The first render after load records the state without reacting.
- Validation:
  - Closed → open runs 1 reaction with a 26° peak; open → closed runs 0.
  - Reopening runs 1 again, and other UI while open runs 0.
  - 9 rapid toggles: 4 opens, 4 reactions, 0 overlapping frames.
  - Non-Home pages follow the same rule, and page load with the panel open runs 0.
  - 0 console errors.
- V4/V5 core impact: NO
- Reuse requirements: none beyond the existing module contracts

### 2026-10-02 — Roadmap status + drone progress animation

- Date: 2026-10-02
- Request: Separate the current-position marker from the green card background, turn the 01 산업 이해 drone into a progress drone that flies along the rail and draws the green progress line, and make the drone react to the roadmap panel toggle (big left roll → recovery → stable hover)
- Files changed:
  - New: `roadmap/roadmap-drone.js`, `roadmap/roadmap-drone.css`, `shared/drone-reactions.js`
  - Modified: `roadmap/roadmap-workflow.js`, `roadmap/roadmap-workflow.css`, `home/drone-hero.js` (generic `addEffect` pose hook), `integration/v4-adapter.js`, `integration/v4-adapter.css`, `v4_HOME_MERGED_2026-10-02.html` (3 loader lines), `roadmap/README.md`, `home/README.md`, `CUSTOM_MODULES.md`
- Status logic:
  - Current step: green filled node with a ring. It no longer gets a green card surface.
  - Green card background: only when the step has saved data (V4 `.set`).
  - Reached steps: green node outline.
  - Connectors: neutral. Green comes only from the drone's progress line (rail start → current position).
- Drone:
  - Position mapping: 산업 이해 = rail start (before roadmap 01); 직무 탐색 / 준비 역량 / 채용 현황 / 기업 탐색 = roadmap 01–04; Home = no drone.
  - Placement: hovers about 20 px left of the rail, outside the panel and inside the layout gutter, so it never covers text, cards, or the current node.
  - Flight: ease-in-out, 560 ms + 240 ms per step (max 1.3 s). It continues across V4's double render.
  - Toggle reaction: `DroneReactions.impact` (26° left roll, counter-swing, settles in 1.4 s; attitude only).
    - Home 3D drone: on every panel toggle, at the moment the layout changes.
    - Roadmap drone: when the panel opens on other pages.
- Validation:
  - Home: 22/22 pixel-identical with motion off.
  - Roadmap text: 0 position, size, or font diffs across 3,360 text elements (6 routes × 4 widths × 3 data states); no overflow.
  - Home motion trace: unchanged apart from the new `has-progress` class.
  - Flight: 산업 이해 → 직무 탐색 sampled per frame; monotonic ease-in-out over about 800 ms.
  - Green cards appear only on steps with saved data.
  - Toggle roll frames confirmed (peak at about 130 ms, settled by 1.4 s).
  - Reduced motion: instant placement, no bob.
  - 0 console errors.
- V4/V5 core impact: NO
- Reuse requirements: see `roadmap/README.md` and `CUSTOM_MODULES.md`. The roadmap drone needs a positioned list container and a gutter of at least 24 px to its left.

### 2026-10-02 — Reorganize custom code by feature module

- Date: 2026-10-02
- Request: Split the user-built features into reusable feature modules (Drone Hero, Dark/Light Airspace, Radial Navigation, Roadmap Workflow, Responsive Layout, Fixed Sidebar) connected to V4 through a thin adapter; retire `index.html` and the legacy custom files once `v4_HOME_MERGED_2026-10-02.html` passes full validation on the new modules
- Files changed:
  - New: `home/drone-hero.*`, `home/airspace-core.*`, `home/airspace-dark.*`, `home/airspace-light.*`, `home/radial-navigation.*`, `home/home-layout.*`, `roadmap/roadmap-workflow.*`, `roadmap/README.md`, `layout/dashboard-responsive.css`, `layout/fixed-sidebar.css`, `layout/README.md`, `integration/v4-adapter.js`, `integration/v4-adapter.css`, `CUSTOM_MODULES.md`
  - Rewritten: `home/README.md`, `CUSTOM_CHANGES.md` (header)
  - Modified: `v4_HOME_MERGED_2026-10-02.html` (loader lines and the boot comment only), `CLAUDE.md`, `AGENTS.md`
  - Deleted: `index.html`, `dashboard-custom.css`, `dashboard-custom.js`, `home-custom.css`, `home-custom.js`, `home/home.css`, `home/home.js`
- Reason: Teammates should be able to take only the features they need into their own dashboard. Modules are split by feature rather than by host file. Each module takes host state and routing through options and callbacks, and every V4 dependency sits in `integration/v4-adapter.*`.
- Implementation notes:
  - Airspace: one shared engine, `airspace-core`. Theme layers register hooks at the original pipeline points (`sky`, `ground`, `skipGroundPoint`, `water`, `skipSlot`, `items`, `placeBuilding`, `slot`) and draw from the shared seeded RNG in the original order, so procedural output is unchanged.
  - Dark/Light: the night palette is scoped to `html:not([data-theme="light"])` so each palette is independent.
  - Home interactions: the modules use their own `data-hm-*` attributes and delegated listeners instead of V4 `act()` names.
  - Roadmap Workflow: stateless. The adapter supplies `currentStage`, `completedStages` and `preWorkflow` and passes the V4 roadmap selectors.
  - CSS: later same-selector overrides were merged where the final computed values are provably identical (`.hm-canvas`, `.hm-ring`, `.hm-go`, `.hm-menu`, `.hm-p1–5`, Home topbar padding).
  - Removed:
    - no-op Home roadmap overlay overrides;
    - the unused `.hm-kpi-note` rule;
    - the inert Home roadmap scroll-follow (it applied only to a `position: sticky` roadmap, and the roadmap is always an absolute topbar overlay);
    - the `index.html`-only `.roadmap-status-node` rules.
- Validation (headless Chrome, seeded `Math.random`, motion off for pixel runs). Every result compares the pre-module build with the module build:
  - Home: 22 cases, pixel-identical. Covers dark/light; 1920, 1600, 1440, 1366, 767; menu open/closed; roadmap closed. Computed styles are identical except the removed legacy `position: relative` on `.roadmap-step__head`.
  - Non-Home: 22 cases, pixel-identical. Covers `#industry`, `#jobs`, `#learning`, `#recruit/postings`, `#recruit/companies` × dark/light × 1440/1366, plus 1920 and roadmap closed.
  - Motion timeline: 156 events identical in order and timing (±90 ms). Covers entry flight, open/reveal, gaze, Esc, close, flights to `#jobs` and `#recruit/companies`, return flights, motion toggle, roadmap slide in/out, and theme switch.
  - Edge paths: reduced-motion trace identical (105 events); SVG-fallback trace (Three.js blocked) identical (114 events), with fallback snapshots pixel-identical.
  - Roadmap behavior: functional test passes (current by route, completion by goal/scrap, release, reload).
  - Integrity: 1 listener per `#app` event; 1 drone canvas and 1 airspace canvas; 0 console errors; 0 failed requests; 18 module loaders with no duplicates or missing paths; `boot()` called once.
  - Standalone reuse: the modules run without V4 Core loaded (3D drone, airspace, radial open, flight → `onNavigate`, roadmap updates).
- V4/V5 core impact: NO. The teammate Core is unchanged apart from loader lines.
- Reuse requirements: see `CUSTOM_MODULES.md` and each module README. Write a host adapter equivalent to `integration/v4-adapter.js` for other dashboards.

### 2026-10-02 — Roadmap vertical workflow + current location indicator

- Date: 2026-10-02
- Request: Add a vertical ○-○-○-○ workflow rail to every "나의 탐색 경로" panel (Home, 산업 이해, 직무 탐색, 준비 역량, 채용 현황, 기업 탐색), show the user's current roadmap step, completed steps, and a small pre-workflow drone for 01 산업 이해, without changing the approved roadmap design
- Files changed: `custom/dashboard-custom.js` (new), `custom/dashboard-custom.css`, `v4_HOME_MERGED_2026-10-02.html` (one loader line), `custom/CUSTOM_CHANGES.md`
- Reason: Dashboard menu numbers and roadmap numbers differ; the rail makes the user's position explicit. Mapping comes from Core `ROADMAP` page/sub metadata: `#jobs`→01, `#learning`→02, `#recruit/postings`→03, `#recruit/companies`→04; `#industry` is pre-workflow (no current step, drone beside the title); `#home` shows completion only
- Implementation: `dashboard-custom.js` wraps the Core `roadmap()` markup function (same integration pattern as the Home `render` hook) and adds `.rm-flow`, `data-step`, `data-complete`, `data-rail`, `aria-current="step"`, an `aria-hidden` `.rm-node` per step, and a `role="img"` drone label on pre-workflow pages. Completion uses Core `stepItems()` — the same rule as Core `.set` (goal job / course / posting / company scrap count > 0). Nodes and connectors are absolute overlays centered in the roadmap's 16px left padding gutter; no text, width, padding, or typography changes (verified: 3,360 roadmap text rects identical to baseline across 6 routes × 4 widths × 3 data states)
- V4/V5 core impact: NO — Core `roadmap()`, `ROADMAP`, `stepItems()`, `S`, `go()`, `render()`, `save()`, scrap/release actions, routing, and persistence are reused unchanged; no new state or storage. `index.html` was not modified
- Reuse requirements: Load `custom/dashboard-custom.js` after the Core script and before `custom/home-custom.js` / `custom/home/home.js` (i.e. before `boot()`). A new core must still expose a global `roadmap()` returning `<aside class="roadmap">` with one `.roadmap-step` per `ROADMAP` row, plus `ROADMAP` rows shaped `[no, title, empty, kind, page, sub]` and `stepItems(kind)`; otherwise the module exits and the Core roadmap renders unchanged. To add another pre-workflow page, extend `PRE_WORKFLOW` in `dashboard-custom.js`
- Legacy note: the earlier "Roadmap status nodes" variant (`.roadmap-status-node` span inside Core `roadmap()`) exists only in `index.html`; its CSS stays in `dashboard-custom.css` for that file. When `index.html` is next synced from `v4_HOME_MERGED_2026-10-02.html`, drop that span and its CSS in favor of this workflow rail

### 2026-10-02 — Permanent Home customization entrypoints

- Date: 2026-10-02
- Request: Use `custom/home-custom.css` and `custom/home-custom.js` automatically for all future user-requested Home changes
- Files changed: `AGENTS.md`, `CLAUDE.md`, `index.html`, `v4_HOME_MERGED_2026-10-02.html`, `custom/home-custom.css`, `custom/home-custom.js`, `custom/home/home.js`, `custom/home/README.md`, `custom/CUSTOM_CHANGES.md`
- Reason: Preserve the extracted reusable Home module as a stable base while providing explicit project-level CSS and JavaScript extension points with deterministic load order
- V4/V5 core impact: NO — only module loaders and the single Home lifecycle integration point changed; core state, data, routing, scrap, charts, dialogs, and Non-Home implementations remain authoritative
- Reuse requirements: Load dashboard CSS, Home base CSS, and Home custom CSS in order; register `DroneCareerHomeCustom` before loading the Home base runtime; keep `boot()` owned by `custom/home/home.js` and called exactly once

### 2026-10-02 — Permanent modular development rules

- Date: 2026-10-02
- Request: Make the current modular architecture the default for all future user-requested UI and feature work
- Files changed: `AGENTS.md`, `CLAUDE.md`, `custom/CUSTOM_CHANGES.md`
- Reason: Keep Home customization, dashboard-wide presentation, and teammate core responsibilities separated without requiring the user to repeat modularization instructions
- V4/V5 core impact: NO — documentation and agent operating rules only
- Reuse requirements: Treat `custom/home/home.css` and `custom/home/home.js` as the reusable Home base, `custom/home-custom.css` and `custom/home-custom.js` as the permanent user customization layer, and `custom/dashboard-custom.css` as the shared layout layer; reconnect all three layers through minimal loaders/hooks

### 2026-10-02 — Home 100% viewport optimization and module packaging

- Target: Desktop Home layout at 1920×1080, 1600×900, 1440×900, and 1366×768
- Reason: Keep the left sidebar permanently visible, reserve roadmap width only while open, and package the approved Home for reuse
- Files: `index.html`, `custom/dashboard-custom.css`, `custom/home/home.css`, `custom/home/home.js`, `custom/home/README.md`, Home customization entrypoints
- V4 core affected: YES — the sidebar collapse control/state application is disabled; data, routing, charts, dialogs, scrap, roadmap state, theme, and Non-Home renderers are unchanged
- Layout method: responsive width/padding only; no `zoom` or global `transform: scale()`

### 2026-10-02 — Full Home custom extraction

- Target: Embedded user-authored Home style and runtime blocks
- Reason: Separate the approved Home experience from the teammate V4 Core without redesign or behavior changes
- Files: `custom/home-custom.css`, `custom/home-custom.js`, `index.html`, `v4_HOME_MERGED_2026-10-02.html`
- V4 core affected: NO

### 2026-10-02 — Home Hero width

- Target: Home center column and 3D Hero width
- Reason: Restore the approved width after roadmap overlay work without changing drone scale, camera, renderer, or animation
- Files: `custom/home-custom.css`
- V4 core affected: NO

### 2026-10-02 — Roadmap overlay and typography

- Target: Shared roadmap placement and Home roadmap text rendering
- Reason: Anchor the roadmap below the topbar toggle without content reflow or transformed-parent text rasterization
- Files: `custom/home-custom.css`, `custom/home-custom.js`
- V4 core affected: NO

### 2026-10-02 — Home roadmap links

- Target: Four Home roadmap stages
- Reason: Expose the existing V4 `→ 살펴보기` links with existing route mappings
- Files: `custom/home-custom.css`
- V4 core affected: NO

### 2026-10-02 — Roadmap status nodes

- Target: Shared roadmap steps 01–04 on Home and Non-Home routes
- Reason: Show neutral circular progress nodes and activate each node from the existing V4 goal/scrap state
- Files: `index.html`, `custom/home-custom.css`
- V4 core affected: YES — one presentation-only status span was added to the existing `roadmap()` markup; state and routing are unchanged

### 2026-10-02 — Roadmap open responsive layout

- Target: Available content width while the shared roadmap overlay is open
- Reason: Preserve the content width calculated by the V4 two-column layout after the roadmap is moved into the topbar overlay
- Files: `custom/home-custom.css`
- V4 core affected: NO
- No global `scale()` or `zoom` is used
