# Grouping

`useGrouping` transforms a flat `RowModel` into a hierarchical grouped structure with
expandable/collapsible group headers. It uses a two-phase optimization internally to
minimize recomputation.

## Basic Usage

```tsx
import { useGrouping, useClientRowModel, Grid } from "@hobom-grid/react";

type Employee = { id: number; name: string; department: string; salary: number };

function App({ data }: { data: Employee[] }) {
  const sourceRowModel = useClientRowModel(data, { getId: (r) => r.id });

  const grouped = useGrouping(sourceRowModel, {
    groupBy: [{ getGroupValue: (r) => r.department }],
    getId: (r) => r.id,
  });

  return (
    <Grid
      rowCount={grouped.rowModel.rowCount + 1}
      colCount={3}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) {
          return <div>{["Name", "Department", "Salary"][cell.colIndex]}</div>;
        }

        const row = grouped.rowModel.getRow(cell.rowIndex - 1);

        if (row.type === "group-header") {
          if (cell.colIndex === 0) {
            return (
              <div
                style={{ paddingLeft: row.depth * 20, cursor: "pointer" }}
                onClick={() => grouped.toggleGroup(row.groupKey)}
              >
                {grouped.isExpanded(row.groupKey) ? "\u25BC" : "\u25B6"} {String(row.groupValue)} (
                {row.childCount})
              </div>
            );
          }
          return null;
        }

        // row.type === "data"
        const r = row.row;
        return <div>{[r.name, r.department, `$${r.salary}`][cell.colIndex]}</div>;
      }}
    />
  );
}
```

## Two-Phase Optimization

Grouping is split into two core functions so that expensive work is only repeated when necessary:

### Phase 1: `createGroupTree(spec)`

Builds the group tree from the source data. Complexity is **O(N\*D)** where N is the row count
and D is the grouping depth. This phase only re-runs when the source data or `groupBy`
specification changes.

### Phase 2: `flattenGroupTree(tree, expandedGroups)`

Flattens the tree into a linear `RowModel` based on which groups are expanded. Complexity is
**O(V)** where V is the number of visible rows. This phase re-runs on every expand/collapse
toggle -- but since it only visits visible nodes, it is very fast.

```
data changes  -->  [createGroupTree]  -->  tree (cached)
                                              |
toggle event  -->  [flattenGroupTree] -->  RowModel<GroupedRow<TRow>>
```

## Multi-Level Grouping

Pass multiple entries in `groupBy` to create nested groups:

```tsx
const grouped = useGrouping(sourceRowModel, {
  groupBy: [{ getGroupValue: (r) => r.department }, { getGroupValue: (r) => r.role }],
  getId: (r) => r.id,
});
```

## Group Aggregates

Each `GroupBySpec` can include an `aggregates` map to compute summary values per group:

```tsx
const grouped = useGrouping(sourceRowModel, {
  groupBy: [
    {
      getGroupValue: (r) => r.department,
      aggregates: {
        totalSalary: { fn: "sum", getValue: (r) => r.salary },
        headcount: { fn: "count", getValue: (r) => r.id },
      },
    },
  ],
  getId: (r) => r.id,
});
```

Aggregate values are available on group header rows via `row.aggregates`.

## Options

| Option            | Type                   | Default     | Description                                             |
| ----------------- | ---------------------- | ----------- | ------------------------------------------------------- |
| `groupBy`         | `GroupBySpec<TRow>[]`  | required    | Array of grouping specifications (one per level)        |
| `getId`           | `(row: TRow) => RowId` | required    | Stable row identity for data rows                       |
| `initialExpanded` | `Set<string> \| "all"` | empty `Set` | Initially expanded group keys, or `"all"` to expand all |

### `GroupBySpec<TRow>`

| Property        | Type                                  | Description                               |
| --------------- | ------------------------------------- | ----------------------------------------- |
| `getGroupValue` | `(row: TRow) => string \| number`     | Extract the group key from a row          |
| `aggregates`    | `Record<string, AggregateSpec<TRow>>` | Optional per-group aggregate calculations |

## Result

| Property         | Type                            | Description                                          |
| ---------------- | ------------------------------- | ---------------------------------------------------- |
| `rowModel`       | `RowModel<GroupedRow<TRow>>`    | Flattened row model with group headers and data rows |
| `expandedGroups` | `ReadonlySet<string>`           | Set of currently expanded group keys                 |
| `toggleGroup`    | `(groupKey: string) => void`    | Toggle a group's expanded/collapsed state            |
| `expandAll`      | `() => void`                    | Expand all groups at all levels                      |
| `collapseAll`    | `() => void`                    | Collapse all groups                                  |
| `isExpanded`     | `(groupKey: string) => boolean` | Whether the given group key is currently expanded    |

## Types

```ts
type GroupedRow<TRow> = GroupHeaderRow | DataRow<TRow>;

interface GroupHeaderRow {
  type: "group-header";
  groupKey: string;
  groupValue: string | number;
  depth: number;
  childCount: number;
  aggregates?: Record<string, unknown>;
}

interface DataRow<TRow> {
  type: "data";
  row: TRow;
  depth: number;
}
```

> **Performance tip:** Memoize the `groupBy` array with `useMemo` and the `getId` function
> with `useCallback`. The group tree is only rebuilt when these references change.
