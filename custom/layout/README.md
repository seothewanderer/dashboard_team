# Layout Modules

Both modules are CSS-only and opt-in. Load only the ones a dashboard needs, after its core stylesheet. Neither uses global `zoom` or `transform: scale()`.

## Fixed Sidebar — `fixed-sidebar.css`

Keeps the left navigation permanently visible at a fixed width and hides the collapse control, which gives a stable desktop layout.

- **Required classes:** `.sidebar` (the navigation column, a flex child of the app row) and `.sidebar-btn` (the collapse toggle, hidden by this module).
- **Required token:** `--sidebar-w`.
- **JS / state:** none. If the host keeps a "sidebar closed" state, it is overridden visually (`margin-left: 0 !important`).

## Dashboard Responsive — `dashboard-responsive.css`

Makes the right-side roadmap a collapsible overlay that never pushes content sideways:

- The roadmap toggle sits at the right end of the topbar.
- The open roadmap is anchored below the topbar (`position: absolute`, no reflow).
- While it is open, non-wide frames reserve the roadmap width, so the main content keeps the docked two-column width:
  - 1440 px and wider: `--roadmap-w + --gutter`
  - 1180–1439 px: `--roadmap-w-compact + --gutter`
  - below 1180 px: the host layout applies without a reserve

Verified at 1920, 1600, 1440 and 1366 with the roadmap open and closed, with no horizontal overflow.

- **Required HTML:** `#main > .topbar` (position context) containing the toggle `[data-act="roadmap"]` and, while open, the `.roadmap` element; content in `#main > .frame`, which gets `.frame--wide` while the roadmap is closed.
- **Required tokens:** `--space-xs`, `--gutter`, `--roadmap-w`, `--roadmap-w-compact`.
- **Required JS:** the host must move the rendered `.roadmap` into `.topbar` after each render. In V4 this is `mountRoadmapOverlay()` in `../integration/v4-adapter.js`.
