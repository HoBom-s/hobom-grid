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

// -----------------------------
// Interaction Kernel (Phase 2)
// -----------------------------
export type { GridLayout, HitTarget, GridCellRef } from "./contracts/hit-test-model";
export type { InteractionAction, ModifierKeys } from "./contracts/interaction-action";
export type { InteractionKernelState } from "./state/interaction-kernel-state";

export { defaultHitTest } from "./contracts/hit-test-model";
export {
  InteractionKernel,
  createInteractionKernelReducer,
} from "./reducer/interaction-kernel-reducer";

// -----------------------------
// Data Pipeline (Phase 3)
// -----------------------------
export type { RowId, RowModel, SortDirection, SortSpec, FilterSpec } from "./row-model/row-model";
export { createClientRowModel } from "./row-model/client-row-model";
