/* =========================================================
   Roadmap Workflow — step status rendering for a vertical rail
   Adds a circular node per step on one x-axis, neutral connectors
   between node centers, and the step states:
     not reached ○ · has saved data ● · current (green filled + ring)
   Position/progress (drone, green progress line, reached nodes) is
   drawn by roadmap-drone.js; this module only renders status.

   Stateless: callers pass the state on every update. No host
   state, routing, or storage is read. Idempotent — safe to call
   on freshly rendered markup or on an already decorated list.
   ========================================================= */
(function (global) {
  "use strict";

  const DEFAULTS = { stepSelector: ":scope > [data-rm-step]" };   // host markup hook; override with the host's own selector

  /* container: list root · state: { stages, currentStage, completedStages }
   * options: { stepSelector } — CSS selector relative to the container */
  function updateRoadmapWorkflow(container, state = {}, options = {}) {
    if (!container) return null;
    const o = { ...DEFAULTS, ...options };
    const steps = [...container.querySelectorAll(o.stepSelector)];
    const keys = state.stages || steps.map((_, i) => String(i + 1).padStart(2, "0"));
    const done = new Set(state.completedStages || []), current = state.currentStage ?? null;
    const doc = container.ownerDocument || document;

    container.classList.add("rm-flow");
    steps.forEach((step, i) => {
      const key = keys[i];
      step.classList.add("rm-step");
      step.dataset.step = key;
      step.dataset.complete = String(done.has(key));            // 실제 저장 데이터(선택·스크랩) 유무
      if (key === current) step.setAttribute("aria-current", "step"); else step.removeAttribute("aria-current");
      if (i < steps.length - 1) step.dataset.rail = ""; else delete step.dataset.rail;   // 다음 노드까지 이어지는 연결선
      if (!step.querySelector(":scope > .rm-node")) {
        const node = doc.createElement("span"); node.className = "rm-node"; node.setAttribute("aria-hidden", "true"); step.prepend(node);
      }
    });
    return container;
  }

  // initRoadmapWorkflow({ container, stages, currentStage, completedStages, stepSelector })
  function initRoadmapWorkflow(config = {}) {
    const { container, stepSelector, ...state } = config;
    const options = stepSelector ? { stepSelector } : {};
    updateRoadmapWorkflow(container, state, options);
    return { update: (next) => updateRoadmapWorkflow(container, next, options) };
  }

  global.initRoadmapWorkflow = initRoadmapWorkflow;
  global.updateRoadmapWorkflow = updateRoadmapWorkflow;
})(window);
