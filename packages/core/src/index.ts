// -----------------------------
// Public contracts (types)
// -----------------------------
export type {
  Px,
  AxisKind,
  AxisRange,
  CellKind,
  Anchor,
  ViewportQuery,
} from "./contracts/contracts-model";

export { px } from "./contracts/contracts-model";

// -----------------------------
// Axis (variable-size virtualization primitive)
// -----------------------------
export type { MeasureReport, MeasuredAxis } from "./axis/measured-axis";

export { createMeasuredAxis } from "./axis/measured-axis.js";

// -----------------------------
// Grid Kernel (Phase 1 main API)
// -----------------------------
export { createGridKernel } from "./grid/create-grid";

// -----------------------------
// Outputs (render models)
// -----------------------------
export type { ViewportModel } from "./viewport/viewport-model";
export type { ViewModel, CellVM } from "./viewmodel/view-model";
