# Advanced Features

## Filter UI

`useFilterUI` manages filter state and popover positioning for column header filter dropdowns.
It pairs with `<FilterPopover>` (a portal-based component) to render the actual filter controls.

### Basic Usage

```tsx
import { useFilterUI, FilterPopover, useClientRowModel, Grid } from "@hobom-grid/react";
import { useCallback } from "react";

type Employee = { id: number; name: string; department: string; salary: number };

const filterColumns: FilterColumnDef<Employee>[] = [
  { key: "name", type: "text" },
  { key: "department", type: "select", options: ["Engineering", "Sales", "HR"] },
  { key: "salary", type: "range" },
];

function App({ data }: { data: Employee[] }) {
  const filterUI = useFilterUI(filterColumns);

  const filter = useCallback((row: Employee) => filterUI.filterSpec(row), [filterUI.filterSpec]);

  const rowModel = useClientRowModel(data, { filter, getId: (r) => r.id });

  return (
    <>
      <div>{filterUI.activeFilterCount} active filters</div>
      <button onClick={filterUI.clearAllFilters}>Clear All</button>

      <Grid
        rowCount={rowModel.rowCount + 1}
        colCount={3}
        renderCell={(cell) => {
          if (cell.rowIndex === 0) {
            const keys = ["name", "department", "salary"];
            return (
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <span>{keys[cell.colIndex]}</span>
                <button onClick={(e) => filterUI.openPopover(keys[cell.colIndex], e.currentTarget)}>
                  {"\u25BC"}
                </button>
              </div>
            );
          }

          const row = rowModel.getRow(cell.rowIndex - 1);
          return <div>{String(Object.values(row)[cell.colIndex + 1])}</div>;
        }}
      />

      {filterUI.popover && (
        <FilterPopover
          state={filterUI.popover}
          onClose={filterUI.closePopover}
          onApply={(key, value) => filterUI.setFilter(key, value)}
          onClear={(key) => filterUI.clearFilter(key)}
        />
      )}
    </>
  );
}
```

### `FilterColumnDef<TRow>`

| Property  | Type                                           | Required | Description                                 |
| --------- | ---------------------------------------------- | -------- | ------------------------------------------- |
| `key`     | `string`                                       | yes      | Column identifier (matches your data key)   |
| `type`    | `"text" \| "select" \| "range" \| "custom"`    | yes      | Filter control type rendered in the popover |
| `options` | `string[]`                                     | --       | Options list for `"select"` type            |
| `match`   | `(row: TRow, filterValue: unknown) => boolean` | --       | Custom match function for `"custom"` type   |

### `useFilterUI` Result

| Property            | Type                                         | Description                                    |
| ------------------- | -------------------------------------------- | ---------------------------------------------- |
| `filterSpec`        | `(row: TRow) => boolean`                     | Predicate combining all active filters         |
| `filterState`       | `Record<string, unknown>`                    | Current filter values keyed by column key      |
| `setFilter`         | `(key: string, value: unknown) => void`      | Set a filter value for a column                |
| `clearFilter`       | `(key: string) => void`                      | Clear the filter for a column                  |
| `clearAllFilters`   | `() => void`                                 | Clear all active filters                       |
| `activeFilterCount` | `number`                                     | Number of columns with active filters          |
| `popover`           | `FilterPopoverState \| null`                 | Current popover state, or `null` when closed   |
| `openPopover`       | `(key: string, anchor: HTMLElement) => void` | Open the filter popover anchored to an element |
| `closePopover`      | `() => void`                                 | Close the filter popover                       |

### `<FilterPopover>` Props

| Prop      | Type                                    | Description                            |
| --------- | --------------------------------------- | -------------------------------------- |
| `state`   | `FilterPopoverState`                    | Popover state from `useFilterUI`       |
| `onClose` | `() => void`                            | Called when the popover should close   |
| `onApply` | `(key: string, value: unknown) => void` | Called when the user applies a filter  |
| `onClear` | `(key: string) => void`                 | Called when the user clears the filter |

`<FilterPopover>` renders via a React portal and positions itself relative to the anchor element.

---

## Column Bands

`useColumnBands` computes multi-row header spans for grouped column headers (bands).
Bands can be nested to create multiple header levels.

### Basic Usage

```tsx
import { useColumnBands, Grid } from "@hobom-grid/react";

const bands: ColumnBandDef[] = [
  {
    label: "Personal",
    children: ["name", "age"],
  },
  {
    label: "Employment",
    children: [
      "department",
      {
        label: "Compensation",
        children: ["salary", "bonus"],
      },
    ],
  },
];

const colKeys = ["name", "age", "department", "salary", "bonus"];

function App() {
  const bandInfo = useColumnBands(bands, colWidths, 120, visibleCols);

  return (
    <Grid
      rowCount={dataRowCount + bandInfo.headerRowCount}
      colCount={colKeys.length}
      renderCell={(cell) => {
        if (cell.rowIndex < bandInfo.headerRowCount) {
          const band = bandInfo.getBandCell(cell.rowIndex, cell.colIndex);
          if (!band) return null; // spanned by another cell
          return (
            <div style={{ gridColumn: `span ${band.span}`, textAlign: "center" }}>{band.label}</div>
          );
        }
        // ... render body cells
      }}
    />
  );
}
```

### `ColumnBandDef`

```ts
interface ColumnBandDef {
  label: string;
  children: (string | ColumnBandDef)[];
}
```

Leaf children are column key strings. Nested `ColumnBandDef` entries create additional
header rows.

### `useColumnBands` Signature

```ts
useColumnBands(
  bands: ColumnBandDef[],
  colWidths: number[],
  defaultColWidth: number,
  visibleCols: number[],
)
```

### Result

| Property         | Type                                             | Description                                          |
| ---------------- | ------------------------------------------------ | ---------------------------------------------------- |
| `headerRowCount` | `number`                                         | Number of header rows needed (max nesting depth + 1) |
| `getBandCell`    | `(row: number, col: number) => BandCell \| null` | Returns band info for the cell, or `null` if spanned |

`BandCell` contains `{ label: string; span: number; depth: number }`.

---

## State Persistence

`useGridStatePersistence` saves and restores grid state (column widths, sort order,
filters, scroll position, etc.) to a pluggable storage backend. A `localStorageAdapter`
is provided out of the box.

### Basic Usage

```tsx
import {
  useGridStatePersistence,
  localStorageAdapter,
  useClientRowModel,
  Grid,
} from "@hobom-grid/react";

function App({ data }: { data: Employee[] }) {
  const persistence = useGridStatePersistence({
    key: "my-grid-v1",
    adapter: localStorageAdapter,
  });

  // Apply restored state to your hooks
  const rowModel = useClientRowModel(data, {
    sort: persistence.restoredState?.sort,
    filter: persistence.restoredState?.filter,
  });

  return (
    <>
      <button onClick={() => persistence.save(currentState)}>Save Layout</button>
      <button onClick={persistence.clear}>Reset Layout</button>
      <Grid ... />
    </>
  );
}
```

### Auto-Save

`autoSave` is a debounced save function. Pass it grid state on every change and it will
persist after the debounce delay (default 500ms):

```tsx
useEffect(() => {
  persistence.autoSave({ colWidths, sortSpec, filterState, scrollTop });
}, [colWidths, sortSpec, filterState, scrollTop]);
```

### `StorageAdapter` Interface

```ts
interface StorageAdapter {
  getItem(key: string): string | null | Promise<string | null>;
  setItem(key: string, value: string): void | Promise<void>;
  removeItem(key: string): void | Promise<void>;
}
```

`localStorageAdapter` implements this using `window.localStorage`. For session storage,
IndexedDB, or a remote backend, provide your own adapter.

### `PersistedGridState`

```ts
interface PersistedGridState {
  colWidths?: number[];
  colOrder?: number[];
  hiddenCols?: number[];
  sort?: SortSpec[];
  filter?: Record<string, unknown>;
  scrollTop?: number;
  scrollLeft?: number;
  pageSize?: number;
  currentPage?: number;
}
```

All fields are optional. Only the fields you include will be persisted and restored.

### Options

| Option     | Type             | Required | Description                                  |
| ---------- | ---------------- | -------- | -------------------------------------------- |
| `key`      | `string`         | yes      | Storage key to namespace this grid's state   |
| `adapter`  | `StorageAdapter` | yes      | Storage backend (e.g. `localStorageAdapter`) |
| `debounce` | `number`         | --       | Auto-save debounce delay in ms (default 500) |

### Result

| Property        | Type                                  | Description                                           |
| --------------- | ------------------------------------- | ----------------------------------------------------- |
| `restoredState` | `PersistedGridState \| null`          | State loaded from storage on mount, or `null` if none |
| `save`          | `(state: PersistedGridState) => void` | Persist state immediately                             |
| `autoSave`      | `(state: PersistedGridState) => void` | Persist state after debounce delay                    |
| `clear`         | `() => void`                          | Remove persisted state from storage                   |

> **Performance tip:** Use `autoSave` instead of `save` for state that changes frequently
> (column resizing, scrolling). The debounce prevents excessive writes to storage.
