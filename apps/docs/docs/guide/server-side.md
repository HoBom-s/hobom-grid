# Server-Side Data

`useServerRowModel` provides a virtualized row model backed by server-side data fetching
with a sparse cache, in-flight request deduplication, and configurable prefetch buffer.

## Basic Usage

```tsx
import { useServerRowModel, Grid } from "@hobom-grid/react";

type Employee = { id: number; name: string; salary: number };

function App() {
  const server = useServerRowModel<Employee>({
    fetchRows: async (query) => {
      const res = await fetch(
        `/api/employees?offset=${query.offset}&limit=${query.limit}` +
          `&sort=${query.sort ?? ""}&filter=${query.filter ?? ""}`,
      );
      const json = await res.json();
      return { rows: json.data, totalCount: json.total };
    },
    getId: (r) => r.id,
    pageSize: 100,
    prefetchBuffer: 50,
  });

  return (
    <>
      {server.error && <div style={{ color: "red" }}>{server.error.message}</div>}

      <Grid
        rowCount={(server.totalCount ?? 0) + 1}
        colCount={2}
        onViewportChange={({ rowStart, rowEnd }) => {
          server.requestVisibleRange(rowStart - 1, rowEnd - 1); // -1 for header offset
        }}
        renderCell={(cell) => {
          if (cell.rowIndex === 0) {
            return <div>{["Name", "Salary"][cell.colIndex]}</div>;
          }

          const entry = server.rowModel.getRow(cell.rowIndex - 1);

          if (entry.type === "loading") {
            return <div style={{ opacity: 0.4 }}>Loading...</div>;
          }

          const row = entry.row;
          return <div>{cell.colIndex === 0 ? row.name : `$${row.salary}`}</div>;
        }}
      />
    </>
  );
}
```

## How It Works

1. Call `requestVisibleRange(start, end)` whenever the viewport scrolls (typically via `onViewportChange`).
2. The hook checks its sparse cache for the requested range.
3. Missing pages are fetched via `fetchRows`. In-flight requests for the same page are deduplicated.
4. The `prefetchBuffer` extends the fetch range beyond the visible window to reduce loading flicker during fast scrolling.

```
visible range: [200, 300]
prefetchBuffer: 50
actual fetch range: [150, 350]  (if not already cached)
```

## Server-Side Sort and Filter

Pass `sort` and `filter` to the hook options. When these change, the cache is invalidated
and data is re-fetched:

```tsx
const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

const server = useServerRowModel<Employee>({
  fetchRows,
  getId: (r) => r.id,
  sort: sortDir,
  filter: searchText,
});
```

The `sort` and `filter` values are passed through to `fetchRows` in the `query` parameter.
Their types are intentionally generic -- use whatever your API expects.

## Types

```ts
type ServerRow<TRow> = { type: "data"; row: TRow } | { type: "loading"; index: number };
```

The `rowModel` returned by the hook is `RowModel<ServerRow<TRow>>`. Each row is either
loaded data or a loading placeholder. Use `row.type` to discriminate in `renderCell`.

## Options

| Option           | Type                                                                    | Default  | Description                                                          |
| ---------------- | ----------------------------------------------------------------------- | -------- | -------------------------------------------------------------------- |
| `fetchRows`      | `(query: ServerQuery) => Promise<{ rows: TRow[]; totalCount: number }>` | required | Fetch a page of rows from the server                                 |
| `getId`          | `(row: TRow) => RowId`                                                  | required | Stable row identity                                                  |
| `pageSize`       | `number`                                                                | `100`    | Number of rows per fetch request                                     |
| `prefetchBuffer` | `number`                                                                | `50`     | Extra rows to fetch beyond the visible range                         |
| `sort`           | `unknown`                                                               | --       | Sort descriptor passed to `fetchRows`; cache invalidates on change   |
| `filter`         | `unknown`                                                               | --       | Filter descriptor passed to `fetchRows`; cache invalidates on change |

## Result

| Property              | Type                                   | Description                                                 |
| --------------------- | -------------------------------------- | ----------------------------------------------------------- |
| `rowModel`            | `RowModel<ServerRow<TRow>>`            | Row model with data or loading placeholders                 |
| `isLoading`           | `boolean`                              | `true` while any fetch is in flight                         |
| `error`               | `Error \| null`                        | Most recent fetch error, or `null`                          |
| `refresh`             | `() => void`                           | Clear cache and re-fetch the current visible range          |
| `totalCount`          | `number \| null`                       | Total row count from the server (null until first response) |
| `requestVisibleRange` | `(start: number, end: number) => void` | Notify the hook of the currently visible row range          |

> **Performance tip:** Keep `pageSize` large enough to cover typical viewport heights
> (e.g. 100 rows) and set `prefetchBuffer` to roughly half a viewport. This minimizes
> fetch frequency while keeping memory usage bounded. Avoid calling `requestVisibleRange`
> on every pixel of scroll -- debounce or throttle if needed.
