# Changelog

## @hobom-grid/react

### 0.1.1 (2026-03-08)

**Bug Fixes**

- `Grid.rowCount` now expects **body row count only** (excluding headers). Previously it expected the total row count including headers, which conflicted with the value returned by `useClientRowModel().rowCount`. Now `<Grid rowCount={rowModel.rowCount} />` works correctly without manual `+ 1`.
- `useColumnResize.startResize` now accepts a `React.PointerEvent` instead of a raw `clientX` number. Internally calls `setPointerCapture` so column resize drag continues reliably even when the pointer leaves the element or browser window.

**Breaking Changes**

- `Grid.rowCount` semantics changed: pass data row count, not total. If you were doing `rowCount={dataRows + headerRowCount}`, change to `rowCount={dataRows}`.
- `startResize(origColIdx, clientX)` → `startResize(origColIdx, e)` where `e` is the pointer event from `onPointerDown`.

### 0.1.0 (2025-12-01)

Initial release.

- `Grid` component with virtualized rendering (CSS sticky overlay trick)
- `useGridKernel` — viewport state, ResizeObserver, scroll management
- `useInteraction` — selection, focus, keyboard/pointer handling
- `useClientRowModel` — client-side sort/filter/ID mapping
- `useEditing` — cell editing state machine with validation
- `useClipboard` — copy/paste with TSV support
- `useColumnResize` — live column resize via pointer drag
- `useColumnReorder` — drag-and-drop column reorder
- `useColumnVisibility` — show/hide columns
- `useRowSelection` — checkbox-style row selection
- `useAggregateRow` — sum/avg/min/max/count aggregate row
- `useContextMenu` + `ContextMenu` — right-click context menu
- `useCsvExport` — export data to CSV file

## @hobom-grid/core

### 0.1.0 (2025-12-01)

Initial release.

- `createMeasuredAxis` — Fenwick-tree variable-size virtualization
- `createGridKernel` — stateless viewport query engine
- `createInteractionKernelReducer` — pure interaction state machine
- `createClientRowModel` — client-side sort/filter data pipeline
- `editingReducer` — cell editing state machine
- Anchor-based scroll stabilization
