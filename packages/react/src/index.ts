// Main component
export { Grid } from "./grid/Grid";
export type { GridProps, GridRenderState } from "./grid/Grid";

// Hooks (for power users who want to compose their own renderer)
export { useGridKernel } from "./hooks/use-grid-kernel";
export type { UseGridKernelResult } from "./hooks/use-grid-kernel";

export { useInteraction } from "./hooks/use-interaction";
export type { UseInteractionResult } from "./hooks/use-interaction";

// Data pipeline
export { useClientRowModel } from "./hooks/use-client-row-model";
export type { UseClientRowModelOpts } from "./hooks/use-client-row-model";

// Editing system (Phase 4)
export { useEditing } from "./hooks/use-editing";
export type { UseEditingOpts, UseEditingResult } from "./hooks/use-editing";

export { useClipboard } from "./hooks/use-clipboard";
export type { UseClipboardOpts, UseClipboardResult } from "./hooks/use-clipboard";

// Column features (Phase 5)
export { useColumnResize } from "./hooks/use-column-resize";
export type { UseColumnResizeResult } from "./hooks/use-column-resize";

export { useColumnReorder } from "./hooks/use-column-reorder";
export type { UseColumnReorderResult, DragReorderState } from "./hooks/use-column-reorder";

export { useColumnVisibility } from "./hooks/use-column-visibility";
export type { UseColumnVisibilityResult } from "./hooks/use-column-visibility";

// Row features
export { useRowSelection } from "./hooks/use-row-selection";
export type { UseRowSelectionResult } from "./hooks/use-row-selection";

export { useAggregateRow } from "./hooks/use-aggregate-row";
export type { UseAggregateRowResult, AggColumnDef, AggFn } from "./hooks/use-aggregate-row";

// Ecosystem (Phase 6)
export { useContextMenu } from "./hooks/use-context-menu";
export type {
  UseContextMenuResult,
  ContextMenuState,
  ContextMenuItem,
  ContextMenuAction,
  ContextMenuSeparator,
  ContextMenuLabel,
} from "./hooks/use-context-menu";

export { ContextMenu } from "./components/ContextMenu";
export type { ContextMenuProps } from "./components/ContextMenu";

export { useCsvExport } from "./hooks/use-csv-export";
export type { UseCsvExportOpts, UseCsvExportResult, CsvColumnDef } from "./hooks/use-csv-export";
