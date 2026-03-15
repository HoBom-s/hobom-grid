# @hobom-grid/react

## 0.2.0

### Minor Changes

- Performance regression detection system and rendering optimizations
  - Ratio-based complexity regression tests for CI (Fenwick, MeasuredAxis, ViewportEngine, ClientRowModel)
  - Vitest bench files for developer visibility (ops/sec)
  - SelectionBitmap helper for O(1) per-cell selection lookup
  - Column offset pre-computation in view-model-builder
  - React.memo GridCell with custom areEqual comparator
  - Coverage thresholds enforced in CI
  - New data pipeline: grouping, paging, tree-grid, server-side, filter model
  - New React hooks: useGrouping, usePagination, useTreeGrid, useServerRowModel, useFilterUI, useColumnBands, useGridStatePersistence

### Patch Changes

- Updated dependencies
  - @hobom-grid/core@0.2.0
