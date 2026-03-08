# @hobom-grid/core

Headless, framework-agnostic data grid engine.

Handles virtualization, viewport querying, interaction state, editing, and data pipeline — with zero DOM or framework dependencies.

## Install

```bash
npm install @hobom-grid/core
```

## Quick Start

```ts
import { createGridKernel, createMeasuredAxis, px } from "@hobom-grid/core";

const rowAxis = createMeasuredAxis({ kind: "row", count: 10000, estimateSizePx: 32 });
const colAxis = createMeasuredAxis({ kind: "col", count: 20, estimateSizePx: 120 });

const kernel = createGridKernel({
  rowAxis,
  colAxis,
  headerRowCount: 1,
  pinnedColStartCount: 0,
  pinnedColEndCount: 0,
});

const { viewport, viewModel } = kernel.queryViewport({
  scrollLeftPx: px(0),
  scrollTopPx: px(0),
  viewportWidthPx: px(800),
  viewportHeightPx: px(600),
  overscan: { type: "px", value: px(150) },
});

// viewModel.cells — flat array of CellVM with viewport-space coordinates
viewModel.cells.forEach((cell) => {
  console.log(cell.rowIndex, cell.colIndex, cell.x, cell.y, cell.width, cell.height);
});
```

## Key Concepts

- **MeasuredAxis** — Fenwick-tree-backed variable-size virtualization primitive. O(log N) offset/index lookups.
- **GridKernel** — Stateless function: `queryViewport(query) → { viewport, viewModel }`. No side effects.
- **InteractionKernel** — Pure reducer for selection, focus, drag. `dispatch(action) → nextState`.
- **ClientRowModel** — Client-side sort/filter pipeline: `createClientRowModel({ rows, sort, filter }) → RowModel`.
- **EditingReducer** — Cell editing state machine: begin → validate → commit/cancel.

## Architecture

```
MeasuredAxis (row) ─┐
                    ├─ createGridKernel() ─ queryViewport() ─→ ViewportModel + ViewModel
MeasuredAxis (col) ─┘

InteractionKernelReducer ─ dispatch(action) ─→ InteractionKernelState

createClientRowModel({ rows, sort, filter }) ─→ RowModel { rowCount, getRow, getRowId }

editingReducer(state, action) ─→ EditingState
```

## License

MIT
