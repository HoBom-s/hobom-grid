# Pagination

`usePagination` slices a source `RowModel` into pages, providing navigation controls and page metadata.
It is built on `createPagedRowModel` from `@hobom-grid/core` which performs O(1) slicing.

## Basic Usage

```tsx
import { usePagination, useClientRowModel, Grid } from "@hobom-grid/react";

type Employee = { id: number; name: string; salary: number };

function App({ data }: { data: Employee[] }) {
  const sourceRowModel = useClientRowModel(data, { getId: (r) => r.id });
  const paged = usePagination(sourceRowModel, { pageSize: 50 });

  return (
    <>
      <Grid
        rowCount={paged.rowModel.rowCount + 1}
        colCount={2}
        renderCell={(cell) => {
          if (cell.rowIndex === 0) {
            return <div>{["Name", "Salary"][cell.colIndex]}</div>;
          }
          const row = paged.rowModel.getRow(cell.rowIndex - 1);
          return <div>{cell.colIndex === 0 ? row.name : `$${row.salary}`}</div>;
        }}
      />

      <div>
        Page {paged.currentPage + 1} of {paged.totalPages}({paged.totalRows} total rows)
      </div>

      <button disabled={!paged.canGoPrev} onClick={paged.goPrev}>
        Prev
      </button>
      <button disabled={!paged.canGoNext} onClick={paged.goNext}>
        Next
      </button>
    </>
  );
}
```

## Page Size Control

The page size can be changed at runtime:

```tsx
<select value={paged.pageSize} onChange={(e) => paged.setPageSize(Number(e.target.value))}>
  <option value={25}>25</option>
  <option value={50}>50</option>
  <option value={100}>100</option>
</select>
```

When the page size changes, `currentPage` resets to 0 to avoid an out-of-range page index.

## Options

| Option        | Type     | Default | Description                   |
| ------------- | -------- | ------- | ----------------------------- |
| `pageSize`    | `number` | `50`    | Number of rows per page       |
| `initialPage` | `number` | `0`     | Zero-based initial page index |

## Result

| Property      | Type                     | Description                                      |
| ------------- | ------------------------ | ------------------------------------------------ |
| `rowModel`    | `RowModel<TRow>`         | Paged subset of the source row model             |
| `currentPage` | `number`                 | Current zero-based page index                    |
| `pageSize`    | `number`                 | Active page size                                 |
| `totalPages`  | `number`                 | Total number of pages                            |
| `totalRows`   | `number`                 | Total row count from the source row model        |
| `setPage`     | `(page: number) => void` | Jump to a specific page (clamped to valid range) |
| `setPageSize` | `(size: number) => void` | Change page size and reset to page 0             |
| `goFirst`     | `() => void`             | Navigate to the first page                       |
| `goLast`      | `() => void`             | Navigate to the last page                        |
| `goPrev`      | `() => void`             | Navigate to the previous page                    |
| `goNext`      | `() => void`             | Navigate to the next page                        |
| `canGoPrev`   | `boolean`                | `true` when `currentPage > 0`                    |
| `canGoNext`   | `boolean`                | `true` when `currentPage < totalPages - 1`       |

## Core Function

`createPagedRowModel(sourceRowModel, page, pageSize)` from `@hobom-grid/core` returns a
new `RowModel` that wraps the source with O(1) index offsetting -- no array copying occurs.

> **Performance tip:** The paged row model is a thin view over the source. Sorting and filtering
> happen in the source `RowModel`; pagination only adjusts which slice is visible. Keep the
> source row model memoized to avoid unnecessary recalculations.
