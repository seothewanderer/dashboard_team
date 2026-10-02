# Roadmap Modules

Two modules turn a vertical step list into a progress workflow. Both are stateless: the host passes the state on every update, and neither module reads host state, routing, or storage. Load the CSS and JS of both. Roadmap Drone builds on the nodes that Roadmap Workflow adds.

| Module | Files | Role |
| --- | --- | --- |
| Roadmap Workflow | `roadmap-workflow.js`, `roadmap-workflow.css` | step status rendering: nodes, neutral connectors, current / saved-data states |
| Roadmap Drone | `roadmap-drone.js`, `roadmap-drone.css` | progress positioning: drone beside the rail, green progress line, flight between positions, panel reaction |

## Status rules

- Node states:
  - not reached: hollow neutral node ○
  - reached by the progress line: green outline
  - saved data (selection or scrap): green filled node ●
  - current step: green filled node with an outer ring
- Card backgrounds are left to the host. V4 fills a card green only when the step has saved data (`.set`).
- Connectors are neutral. The green line is the Roadmap Drone progress line, which runs from the rail start to the current position.

## Roadmap Workflow — `updateRoadmapWorkflow(container, state, options)`

- **Required HTML:** a list container whose left padding is the rail gutter (`--rm-gutter`, default 16px), with steps matched by `stepSelector` (default `:scope > [data-rm-step]`).
- **State input:** `{ stages: ["01", …], currentStage: "02" | null, completedStages: ["01"] }`.
- **Output:** `.rm-flow` on the container; on each step `.rm-step`, `data-step`, `data-complete`, `data-rail`, `aria-current="step"` (current only), and an `aria-hidden` `.rm-node`.
- **Initialization:** `initRoadmapWorkflow({ container, stepSelector, ...state })` returns `{ update(state) }`. It is idempotent, so it can be called on freshly rendered markup or inside a `<template>` before insertion.

## Roadmap Drone — `createRoadmapDrone(options)`

- **Required HTML:** the container must be positioned (`relative` / `absolute` / `sticky`) and already decorated by Roadmap Workflow. The drone hovers about 20px left of the rail, so the host must leave a gutter of at least 24px outside the list.
- **Options:** `stepSelector`, `titleSelector` (the start anchor sits between the title and the first step), `offsetX` / `offsetY`, `baseMs` / `stepMs` / `maxMs` (flight duration = base + step × distance), `reducedMotion`.
- **API:**
  - `sync(container, { position, label })`: call after every host render.
    - `position`: `"start"` (before the first step), a step key, or `null` (no drone).
    - The flight continues across re-renders, because the tween lives in the module and is measured against the newest DOM.
  - `react(effect)`: plays an attitude reaction, for example `DroneReactions.impact()` from `../shared/drone-reactions.js`.
  - `position()`: the target position.
- **Motion:**
  - The drone flies with ease-in-out while the progress line grows or shrinks.
  - Nodes light up as the line reaches them, and the current node lights up and pops when the drone arrives.
  - The drone bobs ±1px at rest.
  - Reduced motion: the drone is placed instantly, with no bob and no reaction.

```js
const rail = initRoadmapWorkflow({ container: list, stepSelector: ":scope > .step", stages, currentStage: "02", completedStages: ["01"] });
const drone = createRoadmapDrone({ stepSelector: ":scope > .step", titleSelector: ":scope > .title" });
drone.sync(list, { position: "02", label: "현재 위치: 02 학습 내용" });
// later, after the host re-renders the list:
rail.update({ stages, currentStage: "03", completedStages: ["01", "02"] });
drone.sync(list, { position: "03", label: "현재 위치: 03 채용 공고" });   // flies 02 → 03
```

## Theming

Override these variables on the container:

- **Workflow:** `--rm-node`, `--rm-rail-w`, `--rm-gutter`, `--rm-y` (vertical center of the step title line), `--rm-on`, `--rm-off`, `--rm-bg`, `--rm-rail`.
- **Drone:** set the progress line width with `--rm-progress-w` on `.rm-track__progress`.

Defaults follow the host tokens (`--primary`, `--outline`, `--surface`, `--space-*`).
