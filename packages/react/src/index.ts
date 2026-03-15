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

// Pagination
export { usePagination } from "./hooks/use-pagination";
export type { UsePaginationOpts, UsePaginationResult } from "./hooks/use-pagination";

// Filter UI
export { useFilterUI } from "./hooks/use-filter-ui";
export type { UseFilterUIResult, PopoverState } from "./hooks/use-filter-ui";

export { FilterPopover } from "./components/FilterPopover";
export type { FilterPopoverProps } from "./components/FilterPopover";

// State persistence
export { useGridStatePersistence, localStorageAdapter } from "./hooks/use-grid-state-persistence";
export type {
  StorageAdapter,
  PersistedGridState,
  UseGridStatePersistenceOpts,
  UseGridStatePersistenceResult,
} from "./hooks/use-grid-state-persistence";

// Column bands
export { useColumnBands } from "./hooks/use-column-bands";
export type { ColumnBandDef, BandCellInfo, UseColumnBandsResult } from "./hooks/use-column-bands";

// Grouping
export { useGrouping } from "./hooks/use-grouping";
export type { UseGroupingOpts, UseGroupingResult } from "./hooks/use-grouping";

// Tree grid
export { useTreeGrid } from "./hooks/use-tree-grid";
export type { UseTreeGridResult } from "./hooks/use-tree-grid";

// Server-side row model
export { useServerRowModel } from "./hooks/use-server-row-model";
export type { UseServerRowModelOpts, UseServerRowModelResult } from "./hooks/use-server-row-model";
