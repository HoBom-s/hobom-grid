# @hobom-grid/react

React adapter for [`@hobom-grid/core`](https://www.npmjs.com/package/@hobom-grid/core).

Virtualized data grid component and composable hooks — handles 100k+ rows with sub-frame rendering.

## Install

```bash
npm install @hobom-grid/react @hobom-grid/core
```

## Quick Start

```tsx
import { Grid, useClientRowModel } from "@hobom-grid/react";

const columns = ["name", "age", "email"];

function MyGrid({ data }: { data: readonly { name: string; age: number; email: string }[] }) {
  const rowModel = useClientRowModel(data);

  return (
    <Grid
      rowCount={rowModel.rowCount}
      colCount={columns.length}
      headerRowCount={1}
      style={{ height: 400 }}
      renderCell={(cell) => {
        // Header row
        if (cell.rowIndex === 0) {
          return <div style={{ fontWeight: 600, padding: 8 }}>{columns[cell.colIndex]}</div>;
        }
        // Body row
        const row = rowModel.getRow(cell.rowIndex - 1);
        const key = columns[cell.colIndex] as keyof typeof row;
        return <div style={{ padding: 8 }}>{String(row[key])}</div>;
      }}
    />
  );
}
```

## Features

### Data Pipeline

```tsx
import { useClientRowModel } from "@hobom-grid/react";

const sort = useMemo(() => [{ key: "name" as const, direction: "asc" as const }], []);
const filter = useCallback((row: Employee) => row.active, []);
const rowModel = useClientRowModel(data, { sort, filter, getId: (r) => r.id });
```

### Cell Editing

```tsx
import { useEditing, useClipboard } from "@hobom-grid/react";

const editing = useEditing({
  getValue: (row, col) => /* ... */,
  isEditable: (row, col) => row > 0,
  onCommit: ({ row, col, newValue }) => /* ... */,
}, interactionState);

const clipboard = useClipboard({
  getValue,
  onPaste: (changes) => /* ... */,
}, interactionState);
```

### Column Features

```tsx
import { useColumnResize, useColumnReorder, useColumnVisibility } from "@hobom-grid/react";

const colResize = useColumnResize(initialWidths);
const colReorder = useColumnReorder(onReorder);
const colVis = useColumnVisibility(columnCount);
```

### Row Features

```tsx
import { useRowSelection, useAggregateRow } from "@hobom-grid/react";

const selection = useRowSelection({ rowCount, getId: (i) => data[i].id });
const aggregates = useAggregateRow(data, columnDefs);
```

### Ecosystem

```tsx
import { useContextMenu, ContextMenu, useCsvExport } from "@hobom-grid/react";

const contextMenu = useContextMenu();
const csvExport = useCsvExport({ columns: csvColumnDefs });
```

## API Overview

| Export                | Type      | Description                                    |
| --------------------- | --------- | ---------------------------------------------- |
| `Grid`                | Component | Main grid component with virtualized rendering |
| `useGridKernel`       | Hook      | Low-level viewport state + scroll management   |
| `useInteraction`      | Hook      | Selection, focus, keyboard/pointer handling    |
| `useClientRowModel`   | Hook      | Client-side sort/filter/ID mapping             |
| `useEditing`          | Hook      | Cell editing state machine                     |
| `useClipboard`        | Hook      | Copy/paste with TSV support                    |
| `useColumnResize`     | Hook      | Live column resize via pointer drag            |
| `useColumnReorder`    | Hook      | Drag-and-drop column reorder                   |
| `useColumnVisibility` | Hook      | Show/hide columns                              |
| `useRowSelection`     | Hook      | Checkbox-style row selection                   |
| `useAggregateRow`     | Hook      | Sum/avg/min/max/count footer row               |
| `useContextMenu`      | Hook      | Right-click context menu state                 |
| `ContextMenu`         | Component | Portal-rendered context menu                   |
| `useCsvExport`        | Hook      | Export data to CSV file                        |

## License

MIT
