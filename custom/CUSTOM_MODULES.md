# Custom Feature Modules

The user-built features of Drone Career Navigator, packaged so a teammate can take only the modules they need into their own dashboard.

Every reusable module has the same structure:

```
Reusable Module  +  Host Adapter  +  Host Dashboard
(no host code)      (V4: integration/v4-adapter.*)   (V4 Core: v4_HOME_MERGED_2026-10-02.html)
```

Modules never copy or read V4 `S`, `D`, `go()`, `render()`, `save()`, `scrap()`, charts, dialogs, `localStorage`, or Non-Home business logic. All of that is reached only through the adapter.

## Summary

| Module | Files | Reusable | V4 dependency | Status |
| --- | --- | --- | --- | --- |
| Drone Hero | `home/drone-hero.js`, `home/drone-hero.css` | YES | adapter only | Production |
| Airspace Core | `home/airspace-core.js`, `home/airspace-core.css` | YES | none | Production |
| Dark Airspace | `home/airspace-dark.js`, `home/airspace-dark.css` | YES | none | Production |
| Light Airspace | `home/airspace-light.js`, `home/airspace-light.css` | YES | none | Production |
| Radial Navigation | `home/radial-navigation.js`, `home/radial-navigation.css` | YES | adapter only | Production |
| Home Layout | `home/home-layout.js`, `home/home-layout.css` | YES | adapter only | Production |
| Roadmap Workflow | `roadmap/roadmap-workflow.js`, `roadmap/roadmap-workflow.css` | YES | adapter only | Production |
| Roadmap Drone | `roadmap/roadmap-drone.js`, `roadmap/roadmap-drone.css` | YES | adapter only | Production |
| Drone Reactions | `shared/drone-reactions.js` | YES | none | Production |
| Responsive Layout | `layout/dashboard-responsive.css` | YES | host classes only | Production |
| Fixed Sidebar | `layout/fixed-sidebar.css` | YES | host classes only | Production |
| V4 Adapter | `integration/v4-adapter.js`, `integration/v4-adapter.css` | NO (V4-specific by design) | is the V4 integration | Production |

Detailed contracts: [`home/README.md`](home/README.md), [`roadmap/README.md`](roadmap/README.md) (Workflow + Drone), [`layout/README.md`](layout/README.md).

## Drone Hero

- **Purpose:** 3D Home hero drone.
  - Model and look: Three.js scene, generated silver foldable drone, polished silver and carbon materials, rotors, navigation lights.
  - Idle motion: hover, sway, roll, yaw, pitch.
  - Flights: entry, step back (retreat) for the menu, panel gaze, directional flight with surface-wipe handoff, return flight.
  - Fallbacks and controls: SVG fallback, motion toggle, reduced motion.
- **Files:** `home/drone-hero.js`, `home/drone-hero.css`
- **Dependencies:** Three.js import map (`three`, `three/addons/`); host design tokens
- **Input:** `container`, `isMotionOn()` / `setMotionOn()`, `isActive()`, `theme()`, `reducedMotion`
- **Output:** `onNavigate(key)`, `onCoreClick()`, `onFrame(now, dt)`, `onFocus(k, x, s)`, `onDroneRect(rect)`, `onFlightStart(ux, uy)`
- **How to use:** `const hero = initDroneHero({ container, onNavigate, theme, … })`, put its markup in the stage, then `hero.mount(stage)` after each render
- **V4 dependency:** none in the module; the V4 adapter connects routing, motion state, and persistence
- **Reusable:** YES
- **Status:** Production; pixel and motion-timeline parity verified against the pre-module build

## Dark Airspace / Light Airspace (with Airspace Core)

- **Purpose:**
  - Core: seeded procedural buildings and terrain with an appear/rise/hold/fade/regenerate lifecycle, far ridges, ground grid and point cloud, hover zone with ripple, 150 m reference, altitude labels, scan.
  - Dark: stars and the night palette.
  - Light: ground gradient, river with reflections and glints, bridges, river-aware placement, the daylight palette.
- **Files:** `home/airspace-core.js/.css`, `home/airspace-dark.js/.css`, `home/airspace-light.js/.css`
- **Dependencies:** Canvas 2D only. The dark and light layers require Airspace Core and share its helpers and seed, so no code is duplicated.
- **Input:** `isMotionOn()`, `reducedMotion`, `--hm-air-*` palette variables, `setDrone`/`setPanels`/`setFocus`/`flightReact`
- **Output:** canvas drawing inside the stage
- **How to use:** load core, then the layers; `const air = DroneAirspace.create({ isMotionOn })`; `air.mount(stage)`; call `air.tick(now, dt)` from a rAF loop. Each layer can be enabled or disabled independently by loading or omitting its files, or with `air.setLayerEnabled("dark" | "light", on)`.
- **V4 dependency:** none
- **Reusable:** YES
- **Status:** Production; procedural output is identical to the pre-module build (same seed sequence)

## Radial Navigation

- **Purpose:** Five panels around the drone (산업 이해 · 직무 탐색 · 준비 역량 · 채용 공고 · 기업 탐색).
  - Opening: staged 3D unfold, open/close, keyboard focus.
  - Feedback: guide lines, hover direction (gaze), selection.
- **Files:** `home/radial-navigation.js`, `home/radial-navigation.css`
- **Dependencies:** a stage with a center element (default `.hm-core`); host design tokens
- **Input:** `container`, `entries()`, `escapeHtml`, `canInteract()`
- **Output:** `onSelect(routeKey, el)`, `onGaze(dir | null)`, `onLayout(rects)`
- **How to use:** `const radial = initRadialNavigation({ container, entries, onSelect, … })`, put `guidesMarkup()` and `menuMarkup(open)` in the stage, then `radial.mount(stage)`; call `open()` / `close()`
- **V4 dependency:** none in the module; routing is never hard-coded (the adapter maps `routeKey` to `go()`)
- **Reusable:** YES
- **Status:** Production

## Home Layout

- **Purpose:**
  - Page content: header, KPI summary, How To Use, FAQ, data note, Home panel system.
  - Wiring: composes Drone Hero, Radial Navigation and Airspace into one hero stage, including the open/close choreography.
- **Files:** `home/home-layout.js`, `home/home-layout.css`
- **Dependencies:** Drone Hero, Radial Navigation; Airspace optional
- **Input:** `content()`, `entries()`, `menu {get,set}`, `motion {get,set}`, `isActive()`, `escapeHtml`, `formatNumber`
- **Output:** `render()` markup string, `onNavigate(key)`
- **How to use:** `const home = initHomeLayout({...})`; the host renders `home.render()`, then calls `home.afterRender(onHome)`
- **V4 dependency:** none in the module; content and state come from the adapter
- **Reusable:** YES
- **Status:** Production

## Roadmap Workflow

- **Purpose:** status rendering for a career progress step list.
  - Rail: circle nodes and neutral connectors.
  - States: not reached, saved data (filled node), and current (green filled node + ring).
- **Files:** `roadmap/roadmap-workflow.js`, `roadmap/roadmap-workflow.css`
- **Dependencies:** CSS only, plus the optional JS state API
- **Input:** `{ stages, currentStage, completedStages }`, `stepSelector`
- **Output:** decorated DOM with `aria-current="step"` and `data-complete`
- **How to use:** `initRoadmapWorkflow({ container, ...state })` or `updateRoadmapWorkflow(container, state, options)`
- **V4 dependency:** adapter only. Route-to-stage mapping and completion from goal/scrap state live in `v4-adapter.js`.
- **Reusable:** YES
- **Status:** Production

## Roadmap Drone

- **Purpose:** progress positioning.
  - A small drone hovers beside the rail at the current position.
  - A green progress line runs from the rail start to that position.
  - The drone flies along the rail (ease-in-out) when the position changes; nodes light up as the line reaches them, and the current node lights up when the drone arrives.
  - The drone can play a panel reaction.
- **Files:** `roadmap/roadmap-drone.js`, `roadmap/roadmap-drone.css`
- **Dependencies:** Roadmap Workflow nodes; optional Drone Reactions
- **Input:** `sync(container, { position: "start" | stepKey | null, label })`, `react(effect)`
- **Output:** drone, progress line, and `data-lit` on reached steps
- **How to use:** `const d = createRoadmapDrone({ stepSelector, titleSelector })`, then call `d.sync(list, state)` after every render
- **V4 dependency:** adapter only. The adapter maps 01 산업 이해 to `"start"`, the other workflow routes to their step, and Home to `null`.
- **Reusable:** YES
- **Status:** Production

## Drone Reactions

- **Purpose:** shared attitude reactions that work with any drone renderer. `impact()` gives a big roll to one side, a short counter-swing, recovery, and a stable hover, with no change to position or height.
- **Files:** `shared/drone-reactions.js`
- **Input / Output:** `DroneReactions.impact({ direction, angle, duration, rpmBoost })` returns an effect `(now) → { roll, rpm } | null`
- **How to use:** `hero.addEffect(DroneReactions.impact(), "panel-toggle")` (3D Drone Hero) or `roadmapDrone.react(DroneReactions.impact())` (2D roadmap drone)
- **V4 dependency:** none. The adapter triggers it only when the roadmap panel opens: it watches the actual `S.ui.roadmap_open` change from closed to open after each render. Closing the panel, page load, and other UI do not trigger it.
- **Reusable:** YES
- **Status:** Production

## Responsive Layout

- **Purpose:** collapsible right roadmap overlay that keeps the main width stable at 1920, 1600, 1440 and 1366 with no horizontal overflow
- **Files:** `layout/dashboard-responsive.css`
- **Dependencies:** host classes `#main`, `.topbar`, `.roadmap`, `.frame`, `.frame--wide`; tokens `--roadmap-w`, `--roadmap-w-compact`, `--gutter`
- **Input / Output:** CSS only
- **How to use:** load after the core stylesheet; the host moves `.roadmap` into `.topbar` after each render
- **V4 dependency:** host classes only
- **Reusable:** YES
- **Status:** Production

## Fixed Sidebar

- **Purpose:** fixed-width left sidebar with no collapse, for a stable desktop layout
- **Files:** `layout/fixed-sidebar.css`
- **Dependencies:** `.sidebar`, `.sidebar-btn`, `--sidebar-w`
- **Input / Output:** CSS only
- **How to use:** load it only in dashboards that want a permanent sidebar
- **V4 dependency:** host classes only
- **Reusable:** YES
- **Status:** Production

## V4 Adapter

- **Purpose:** the only custom code that reads V4 globals (`S`, `D`, `C_`, `PG`, `ENTRIES`, `ROADMAP`, `stepItems`, `act`, `ACTIONS`, `render`, `go`, `save`, `esc`, `fmt`, `boot`).
  - Home: replaces `PG.home`; maps `S.ui.motion` and `S.ui.home_menu_open` to the motion/menu inputs and panel keys to `go(page, sub)`.
  - Roadmap Workflow: maps the V4 route to `currentStage`, goal/scrap state to `completedStages`, and `#industry` to the pre-workflow drone.
  - V4 chrome: hooks `render()`, mounts the roadmap overlay, animates the Home roadmap toggle, shows the Home-only sidebar brand, and calls `boot()` exactly once.
- **Files:** `integration/v4-adapter.js`, `integration/v4-adapter.css` (V4 chrome adjustments while Home is shown)
- **Reusable:** NO. It is the V4 integration. For another dashboard, write an equivalent adapter against its APIs.
- **Status:** Production

## Production load order (`v4_HOME_MERGED_2026-10-02.html`)

```html
<link rel="stylesheet" href="./custom/layout/dashboard-responsive.css">
<link rel="stylesheet" href="./custom/layout/fixed-sidebar.css">
<link rel="stylesheet" href="./custom/roadmap/roadmap-workflow.css">
<link rel="stylesheet" href="./custom/roadmap/roadmap-drone.css">
<link rel="stylesheet" href="./custom/home/home-layout.css">
<link rel="stylesheet" href="./custom/home/drone-hero.css">
<link rel="stylesheet" href="./custom/home/airspace-core.css">
<link rel="stylesheet" href="./custom/home/airspace-dark.css">
<link rel="stylesheet" href="./custom/home/airspace-light.css">
<link rel="stylesheet" href="./custom/home/radial-navigation.css">
<link rel="stylesheet" href="./custom/integration/v4-adapter.css">
…V4 Core <script> (defines everything, does not call boot())…
<script src="./custom/roadmap/roadmap-workflow.js"></script>
<script src="./custom/roadmap/roadmap-drone.js"></script>
<script src="./custom/shared/drone-reactions.js"></script>
<script src="./custom/home/airspace-core.js"></script>
<script src="./custom/home/airspace-dark.js"></script>
<script src="./custom/home/airspace-light.js"></script>
<script src="./custom/home/drone-hero.js"></script>
<script src="./custom/home/radial-navigation.js"></script>
<script src="./custom/home/home-layout.js"></script>
<script src="./custom/integration/v4-adapter.js"></script>   <!-- calls boot() once -->
```
