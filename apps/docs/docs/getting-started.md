# Getting Started

## Installation

```bash
# Core engine (required)
pnpm add @hobom-grid/core

# React adapter
pnpm add @hobom-grid/react
```

## Minimal Example

The simplest possible grid — static data, no sorting or editing:

```tsx
import { Grid } from "@hobom-grid/react";

const COLUMNS = ["Name", "Age", "Department"];
const ROWS = [
  ["Alice", 30, "Engineering"],
  ["Bob", 25, "Design"],
  ["Carol", 35, "Product"],
];

export function App() {
  return (
    <Grid
      rowCount={ROWS.length}
      colCount={COLUMNS.length}
      defaultRowHeight={36}
      defaultColWidth={120}
      headerRowCount={1}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) {
          // Header row
          return (
            <div style={{ fontWeight: "bold", padding: "0 8px" }}>{COLUMNS[cell.colIndex]}</div>
          );
        }
        const row = ROWS[cell.rowIndex - 1];
        return <div style={{ padding: "0 8px" }}>{String(row[cell.colIndex])}</div>;
      }}
    />
  );
}
```

## Architecture Overview

HoBom Grid is split into two packages:

| Package             | Role                                                                                        |
| ------------------- | ------------------------------------------------------------------------------------------- |
| `@hobom-grid/core`  | Headless engine — computes viewport, handles virtualization, runs interaction state machine |
| `@hobom-grid/react` | React adapter — `<Grid>` component + hooks that wire core to the DOM                        |

The rendering pipeline looks like this:

```
Data → useClientRowModel (sort/filter)
     → Grid (renders visible cells via kernel query)
     → renderCell (your function, receives CellVM)
```

Everything outside of `<Grid>` rendering is a **standalone hook** you compose:

- `useClientRowModel` — client-side sort + filter
- `useEditing` — cell editing state machine
- `useColumnResize` — drag-to-resize columns
- `useColumnReorder` — drag-to-reorder columns
- `useColumnVisibility` — show/hide columns
- `useRowSelection` — checkbox row selection
- `useAggregateRow` — footer row aggregations (sum, avg, count…)
- `useContextMenu` — right-click context menus
- `useCsvExport` — one-click CSV download

## Next Steps

- [Grid Component](./guide/grid) — props, `renderCell`, keyboard navigation
- [Data Pipeline](./guide/data-pipeline) — sorting and filtering
- [Editing System](./guide/editing) — in-place cell editing
- [Column Features](./guide/column-features) — resize, reorder, visibility
- [Row Features](./guide/row-features) — row selection and aggregate rows
- [Ecosystem](./guide/ecosystem) — context menus and CSV export
