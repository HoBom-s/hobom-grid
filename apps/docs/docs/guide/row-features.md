# Row Features

## Row Selection

`useRowSelection` manages checkbox-style row selection independently from the cell range
selection handled by the interaction kernel.

```tsx
import { useRowSelection, useClientRowModel, Grid } from "@hobom-grid/react";

type Employee = { id: number; name: string; salary: number };

function App({ data }: { data: Employee[] }) {
  const rowSel = useRowSelection<number>();
  const rowModel = useClientRowModel(data, { getId: (r) => r.id });

  const allIds = data.map((r) => r.id);

  return (
    <>
      <div>{rowSel.selectedCount} rows selected</div>

      <Grid
        rowCount={rowModel.rowCount + 1}
        colCount={3} // checkbox + name + salary
        renderCell={(cell) => {
          // Header row
          if (cell.rowIndex === 0) {
            if (cell.colIndex === 0) {
              return (
                <input
                  type="checkbox"
                  checked={rowSel.isAllSelected(allIds)}
                  onChange={() => rowSel.toggleAll(allIds)}
                />
              );
            }
            return <div>{["Name", "Salary"][cell.colIndex - 1]}</div>;
          }

          // Body rows
          const row = rowModel.getRow(cell.rowIndex - 1);
          if (cell.colIndex === 0) {
            return (
              <input
                type="checkbox"
                checked={rowSel.isSelected(row.id)}
                onChange={() => rowSel.toggleRow(row.id)}
              />
            );
          }
          return (
            <div style={{ background: rowSel.isSelected(row.id) ? "#e8f0fe" : undefined }}>
              {cell.colIndex === 1 ? row.name : `$${row.salary}`}
            </div>
          );
        }}
      />
    </>
  );
}
```

### API

```ts
const rowSel = useRowSelection<TId>();
```

`TId` can be any value usable as a `Set` member (string, number, object reference, etc.).

| Property             | Type                 | Description                                                     |
| -------------------- | -------------------- | --------------------------------------------------------------- |
| `selectedRows`       | `ReadonlySet<TId>`   | The set of currently selected IDs                               |
| `selectedCount`      | `number`             | Number of selected rows                                         |
| `isSelected(id)`     | `(TId) => boolean`   | Whether the given ID is selected                                |
| `toggleRow(id)`      | `(TId) => void`      | Toggle selection of one row                                     |
| `selectAll(ids)`     | `(TId[]) => void`    | Select exactly these rows (replaces current selection)          |
| `clearAll()`         | `() => void`         | Clear all selections                                            |
| `toggleAll(ids)`     | `(TId[]) => void`    | Select all if any are unselected; clear all if all are selected |
| `isAllSelected(ids)` | `(TId[]) => boolean` | Returns `true` only if every ID in the list is selected         |

### Indeterminate Checkbox

For a proper "select all" checkbox with indeterminate state:

```tsx
const isAll = rowSel.isAllSelected(allIds);
const isSome = rowSel.selectedCount > 0 && !isAll;

<input
  type="checkbox"
  ref={(el) => {
    if (el) el.indeterminate = isSome;
  }}
  checked={isAll}
  onChange={() => rowSel.toggleAll(allIds)}
/>;
```

---

## Aggregate Row (Footer)

`useAggregateRow` computes summary values (sum, average, count, min, max, or custom)
over a dataset. Use it to render a sticky footer row in the grid.

```tsx
import { useAggregateRow, Grid } from "@hobom-grid/react";

const FOOTER_ROW = -1; // Sentinel value to identify the footer row

type Employee = { name: string; salary: number; age: number };

function App({ data }: { data: Employee[] }) {
  const agg = useAggregateRow(data, [
    {
      key: "name",
      fn: "count",
      getValue: (r) => r.name,
      label: "Total",
    },
    {
      key: "salary",
      fn: "sum",
      getValue: (r) => r.salary,
      format: (v) => `$${(v as number).toLocaleString()}`,
    },
    {
      key: "age",
      fn: "avg",
      getValue: (r) => r.age,
      format: (v) => `Avg ${(v as number).toFixed(1)}`,
    },
  ]);

  const KEYS: (keyof Employee)[] = ["name", "salary", "age"];
  const TOTAL_ROWS = data.length + 2; // +1 header, +1 footer

  return (
    <Grid
      rowCount={TOTAL_ROWS}
      colCount={3}
      renderCell={(cell) => {
        // Header
        if (cell.rowIndex === 0) {
          return <div style={{ fontWeight: "bold" }}>{KEYS[cell.colIndex]}</div>;
        }
        // Footer (last row)
        if (cell.rowIndex === TOTAL_ROWS - 1) {
          return (
            <div style={{ fontWeight: "bold", background: "#f5f5f5" }}>
              {agg.getFormatted(KEYS[cell.colIndex])}
            </div>
          );
        }
        // Body
        const row = data[cell.rowIndex - 1];
        return <div>{String(row[KEYS[cell.colIndex]])}</div>;
      }}
    />
  );
}
```

### Built-in Aggregation Functions

| `fn`      | Behaviour                               |
| --------- | --------------------------------------- |
| `"sum"`   | Numeric sum of all values               |
| `"avg"`   | Numeric average; returns `0` if no rows |
| `"count"` | Count of non-null, non-empty values     |
| `"min"`   | Minimum numeric value                   |
| `"max"`   | Maximum numeric value                   |

### Custom Aggregation

Pass a function `(values: unknown[]) => unknown` for any custom logic:

```tsx
{
  key: "activeCount",
  fn: (values) => values.filter(Boolean).length,
  getValue: (r) => r.active,
  format: (v) => `${v} active`,
}
```

### `AggColumnDef` Options

| Option     | Type                     | Required | Description                             |
| ---------- | ------------------------ | -------- | --------------------------------------- |
| `key`      | `string`                 | ✅       | Identifier used to retrieve the result  |
| `fn`       | `AggFn \| function`      | ✅       | Aggregation function or built-in name   |
| `getValue` | `(row: TRow) => unknown` | ✅       | Extract the value from each row         |
| `format`   | `(v: unknown) => string` | —        | Format the result for display           |
| `label`    | `string`                 | —        | Fallback label when result is null/zero |

### Result API

| Method              | Type                  | Description                                                                               |
| ------------------- | --------------------- | ----------------------------------------------------------------------------------------- |
| `getValue(key)`     | `(string) => unknown` | Raw aggregated value                                                                      |
| `getFormatted(key)` | `(string) => string`  | Formatted display string (applies `format` or falls back to `label` then `String(value)`) |

### Performance

The aggregation only recalculates when `rows` or `columns` change identity.
If `columns` is a constant array defined outside the component, you don't need to memoize it.
If it's computed dynamically, wrap it in `useMemo`.
