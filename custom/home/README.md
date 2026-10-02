# Home Feature Modules

Reusable pieces of the Drone Career Navigator Home. Each module owns one feature, reads no host state, and talks to the host only through options and callbacks. The V4 Dashboard connects them in `../integration/v4-adapter.js`; any other dashboard can do the same with its own adapter.

| Module | Files | Depends on |
| --- | --- | --- |
| Drone Hero | `drone-hero.js`, `drone-hero.css` | Three.js import map |
| Airspace Core | `airspace-core.js`, `airspace-core.css` | — |
| Dark Airspace | `airspace-dark.js`, `airspace-dark.css` | Airspace Core |
| Light Airspace | `airspace-light.js`, `airspace-light.css` | Airspace Core |
| Radial Navigation | `radial-navigation.js`, `radial-navigation.css` | a stage with a center element |
| Home Layout | `home-layout.js`, `home-layout.css` | Drone Hero, Radial Navigation; Airspace optional |

All CSS uses the host design tokens (`--surface`, `--text`, `--text-2`, `--text-3`, `--primary`, `--accent-soft`, `--outline`, `--border`, `--space-*`, `--radius-*`, `--ease-standard`, `--duration-fast`, `--indicator-w`, `--border-w`, `--focus-w`, `--hover-scale`, `--font-sans`, …). Theme switching follows `<html data-theme="dark|light">`.

## Load order

```html
<!-- head: Three.js for the Drone Hero -->
<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.169.0/build/three.module.js","three/addons/":"https://cdn.jsdelivr.net/npm/three@0.169.0/examples/jsm/"}}</script>
<link rel="stylesheet" href="./custom/home/home-layout.css">
<link rel="stylesheet" href="./custom/home/drone-hero.css">
<link rel="stylesheet" href="./custom/home/airspace-core.css">
<link rel="stylesheet" href="./custom/home/airspace-dark.css">
<link rel="stylesheet" href="./custom/home/airspace-light.css">
<link rel="stylesheet" href="./custom/home/radial-navigation.css">

<!-- body end -->
<script src="./custom/home/airspace-core.js"></script>
<script src="./custom/home/airspace-dark.js"></script>
<script src="./custom/home/airspace-light.js"></script>
<script src="./custom/home/drone-hero.js"></script>
<script src="./custom/home/radial-navigation.js"></script>
<script src="./custom/home/home-layout.js"></script>
```

Airspace layers register themselves with Airspace Core, so load them after it and before the first `create()`. Leaving a layer's files out disables that layer.

## Home Layout — `initHomeLayout(options)`

Composes the page (header, KPI, hero stage, How To Use, FAQ, note) and wires the other modules together: menu open/close choreography, panel gaze, directional flight, and airspace obstacles/focus.

- **Required HTML:** a stable container that the host re-renders the page into (for example `#main`).
- **Required state input:** `menu: { get(), set(open) }`, `motion: { get(), set(on) }` (persist inside `set`), `isActive()` (Home is the current route).
- **Required callbacks:** `onNavigate(key)` (host router), `escapeHtml(text)`, `formatNumber(n)`.
- **Content:** `content()` returns `{ title, subtitle, kpiLabel, kpis: [{ label, value, unit, sub }], guideTitle, steps: [[no, title, body]], faqTitle, faq: [[q, a]], note }`; `entries()` returns five panels `[{ key, label, desc }]`.
- **Optional:** `overlayHost()` (element covered by the handoff wipe), `revealTarget()` (element revealed after navigation), `reducedMotion` (MediaQueryList).
- **Returns:** `{ render(), afterRender(onHome), openMenu(), closeMenu(), hero, radial, airspace }`.

```js
const home = initHomeLayout({
  container: document.getElementById("main"),
  escapeHtml, formatNumber,
  content: () => ({ title: "…", subtitle: "…", kpiLabel: "…", kpis: [...], guideTitle: "…", steps: [...], faqTitle: "…", faq: [...], note: "…" }),
  entries: () => [{ key: "jobs", label: "직무 탐색", desc: "…" } /* ×5 */],
  menu: { get: () => state.menuOpen, set: (v) => { state.menuOpen = v; } },
  motion: { get: () => state.motion, set: (v) => { state.motion = v; persist(); } },
  isActive: () => router.page === "home",
  onNavigate: (key) => router.go(key),
});
// in the host render: container.innerHTML = home.render(); then:
home.afterRender(router.page === "home");
```

`afterRender(false)` pauses the drone loop and observers when another page is shown. The KPI value spans carry `data-countup` for an optional host count-up.

## Drone Hero — `initDroneHero(options)`

Three.js silver foldable drone: generated geometry, polished silver and carbon materials, rotors, navigation lights, hover, sway, roll, yaw, pitch, entry flight, step back for the menu, panel gaze, directional flight with a surface-wipe handoff, Home return flight, SVG fallback, motion toggle, and reduced motion. One canvas, one renderer and one rAF loop per page.

- **Required HTML:** a stage (`.hm-stage`) containing the markup from `ringsMarkup()`, `coreMarkup(engaged)` and `toggleMarkup()`. Stage classes come from `stageClasses(engaged)`.
- **Required JS dependency:** the Three.js import map (`three`, `three/addons/`). Without it the SVG fallback drone is shown.
- **Required callbacks:** `container`, `onNavigate(key)`, `onCoreClick()`.
- **State input:** `isMotionOn()` / `setMotionOn(on)`, `isActive()`, `theme()` (defaults to `<html data-theme>`).
- **Optional hooks:** `onFrame(now, dt)`, `onFocus(k, x, s)`, `onDroneRect(rect)`, `onFlightStart(ux, uy)`, `overlayHost()`, `revealTarget()`, `resolveReturnTarget(ref)`, `labels`, `reducedMotion`.
- **API:** `mount(stage, { engaged })`, `unmount()`, `measure()`, `engage()`, `release()`, `markExpanded()`, `gaze(dir | null)`, `fly(targetEl, key, { onSelect, returnRef })`, `canFly()`, `syncMotion()`, `finishEntry()`, `addEffect(fn, key)`, `isIdle()`, `isEngaged()`, `inEntry()`, `ready`, `failed`.
- **Pose effects:** `addEffect(fn, key)` adds an attitude reaction `(now) → { roll, rpm } | null` on top of the hover pose, for example `DroneReactions.impact()` from `../shared/drone-reactions.js`.
  - It never changes position or height.
  - Adding an effect with the same `key` replaces the previous one.
  - Nothing is added while motion is off, and reduced motion scales the reaction to 35%.

While a flight is running, the hero blocks click, change and Enter/Space/Esc input on `window`, so navigation happens exactly once.

## Radial Navigation — `initRadialNavigation(options)`

Five panels arranged as a pentagon around the drone: staged 3D unfold, keyboard focusability, guide lines from the center to each panel, hover direction (gaze), and selection.

- **Required HTML:** inside the stage, `guidesMarkup()` and `menuMarkup(open)`, plus a center element (default `.hm-core`, set with `centerSelector`).
- **Required callbacks:** `container`, `entries()`, `escapeHtml`, `onSelect(key, el)`.
- **Optional:** `onGaze(dir | null)`, `canInteract()`, `onLayout(rects)` (panel obstacle rects for the airspace).
- **API:** `open({ reduced, onRevealed })`, `close()`, `sync(open)`, `cancel()`, `layout()`, `markSelected(el)`, `mount(stage)`, `unmount()`, `indexOf(el)`, `panel(i)`, `isOpen()`, `stageClasses()`.

The module has no routing. What a selection does (flight, route change, anything else) is up to the host.

## Airspace — `DroneAirspace.create(options)`

Canvas 2D geo-airspace behind the drone.

- **Core:** seeded procedural buildings and terrain, slot lifecycle (appear, rise, hold, fade, regenerate), far ridges, ground grid and point cloud, drone hover zone with ripple, the 150 m reference, altitude labels, and scan.
- **Dark layer:** stars.
- **Light layer:** grass/ground gradient, river with reflections and glints, arch and cable-stayed bridges, river-aware placement, and slower transitions.

- **Options:** `isMotionOn()`, `reducedMotion`.
- **API:** `mount(stage)`, `resize()`, `tick(now, dt)` (call from a rAF loop, for example the Drone Hero `onFrame`), `setDrone(rect)`, `setPanels(rects)`, `setFocus(k, x, s)`, `flightReact(ux, uy)`, `setLayerEnabled("dark" | "light", on)`, `markDirty()`.
- **Palette:** `--hm-air-*` variables on the stage (`airspace-dark.css`, `airspace-light.css`). A layer draws when its palette is active: dark when `--hm-air-star-a > 0`, light when `--hm-air-mode: day`.
- **Custom layers:** `DroneAirspace.registerLayer({ name, create(api) { return hooks; } })`. Available hooks are `slot`, `sky`, `ground`, `skipGroundPoint`, `water`, `skipSlot`, `items`, and `placeBuilding`. `api` exposes the shared seeded `rnd`, `lr`, `sm`, `band`, and `LIMIT`. Layers draw from the shared seed in registration order, so the same set of layers always produces the same scene.
