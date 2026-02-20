# Data Pipeline

`useClientRowModel` provides client-side sorting and filtering over an in-memory array.
It is built on `createClientRowModel` from `@hobom-grid/core` and recalculates only when its dependencies change.

## Basic Usage

```tsx
import { useClientRowModel, Grid } from "@hobom-grid/react";
import { useMemo, useState } from "react";

type Employee = { id: number; name: string; salary: number; active: boolean };

const data: Employee[] = [
  { id: 1, name: "Alice", salary: 90000, active: true },
  { id: 2, name: "Bob", salary: 60000, active: false },
  { id: 3, name: "Carol", salary: 75000, active: true },
];

function App() {
  const rowModel = useClientRowModel(data, {
    getId: (row) => row.id,
  });

  return (
    <Grid
      rowCount={rowModel.rowCount + 1} // +1 for header
      colCount={3}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) return <HeaderCell col={cell.colIndex} />;
        const row = rowModel.getRow(cell.rowIndex - 1);
        return <div>{String(Object.values(row)[cell.colIndex])}</div>;
      }}
    />
  );
}
```

## Sorting

Pass a `sort` array — each entry is a `SortSpec` with a `key` accessor and a `direction`:

```tsx
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

const sort = useMemo(() => [{ key: (row: Employee) => row.name, direction: sortDir }], [sortDir]);

const rowModel = useClientRowModel(data, { sort });
```

Multiple sort keys are applied in order (primary → secondary → ...):

```tsx
const sort = useMemo(
  () => [
    { key: (r: Employee) => r.active, direction: "desc" as const }, // active first
    { key: (r: Employee) => r.name, direction: "asc" as const }, // then alpha
  ],
  [],
);
```

## Filtering

`filter` is a predicate `(row: TRow) => boolean`. Wrap it in `useCallback` to avoid
unnecessary recalculations:

```tsx
const [showActiveOnly, setShowActiveOnly] = useState(false);

const filter = useCallback((row: Employee) => !showActiveOnly || row.active, [showActiveOnly]);

const rowModel = useClientRowModel(data, { filter });
```

## Sort + Filter Together

Both can be combined — filtering is applied first, then sorting:

```tsx
const rowModel = useClientRowModel(data, { sort, filter, getId: (r) => r.id });
```

## RowModel API

| Method / Property         | Description                                                         |
| ------------------------- | ------------------------------------------------------------------- |
| `rowCount`                | Number of rows after filtering                                      |
| `getRow(index)`           | Returns the original row object at the given (post-filter) position |
| `getOriginalIndex(index)` | Original array index before filtering/sorting                       |
| `getId(index)`            | Stable row ID (from your `getId` option, or the original index)     |

## Options

| Option   | Type                            | Description                                               |
| -------- | ------------------------------- | --------------------------------------------------------- |
| `getId`  | `(row, originalIndex) => RowId` | Derive a stable row identity. Memoize with `useCallback`. |
| `sort`   | `SortSpec<TRow>[]`              | Sort specifications. Memoize with `useMemo`.              |
| `filter` | `(row: TRow) => boolean`        | Filter predicate. Memoize with `useCallback`.             |

> **Performance tip:** Always memoize `sort`, `filter`, and `getId` so `useClientRowModel`
> only recomputes when the data or your configuration actually changes.
