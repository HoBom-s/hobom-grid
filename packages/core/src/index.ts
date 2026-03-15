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
export type { InteractionAction, ModifierKeys, NavKey } from "./contracts/interaction-action";
export type { InteractionKernelState } from "./state/interaction-kernel-state";
export type { SelectionBitmap } from "./state/selection-bitmap";
export { createSelectionBitmap } from "./state/selection-bitmap";

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

// Paging
export type { PagedRowModelSpec, PagedRowModelResult } from "./row-model/paged-row-model";
export { createPagedRowModel } from "./row-model/paged-row-model";

// Filter model
export type {
  FilterColumnType,
  FilterColumnDef,
  ColumnFilterState,
  FilterState,
} from "./row-model/filter-model";
export { composeFilterSpec } from "./row-model/filter-model";

// Grouping
export type {
  GroupHeaderRow,
  DataRow,
  GroupedRow,
  GroupBySpec,
  GroupedRowModelSpec,
  GroupNode,
  GroupTree,
  CreateGroupTreeSpec,
} from "./row-model/grouped-row-model";
export {
  createGroupedRowModel,
  createGroupTree,
  flattenGroupTree,
} from "./row-model/grouped-row-model";

// Tree
export type { TreeNode, FlatTreeRow, TreeRowModelSpec } from "./row-model/tree-row-model";
export { createTreeRowModel } from "./row-model/tree-row-model";

// Server-side
export type {
  ServerRow,
  ServerQuery,
  ServerResponse,
  ServerRowModelSpec,
} from "./row-model/server-row-model";
export { createServerRowModel } from "./row-model/server-row-model";

// -----------------------------
// Editing System (Phase 4)
// -----------------------------
export type {
  CellChange,
  ValidationResult,
  ActiveEdit,
  EditingState,
} from "./editing/editing-state";
export type { EditingAction } from "./editing/editing-action";
export { editingReducer, EditingKernel } from "./editing/editing-reducer";
