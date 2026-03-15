# Tree Grid

`useTreeGrid` renders hierarchical parent-child data with expand/collapse, depth indentation,
and built-in keyboard navigation (ArrowRight to expand, ArrowLeft to collapse).

## Basic Usage

```tsx
import { useTreeGrid, Grid } from "@hobom-grid/react";

type FileNode = { id: string; name: string; size?: number };

const roots: TreeNode<FileNode>[] = [
  {
    row: { id: "src", name: "src" },
    children: [
      { row: { id: "app", name: "App.tsx", size: 1200 } },
      {
        row: { id: "utils", name: "utils" },
        children: [{ row: { id: "fmt", name: "format.ts", size: 400 } }],
      },
    ],
  },
  { row: { id: "pkg", name: "package.json", size: 800 } },
];

function App() {
  const tree = useTreeGrid(roots, (r) => r.id);

  return (
    <Grid
      rowCount={tree.rowModel.rowCount + 1}
      colCount={2}
      keyboardExtension={tree.keyboardExtension}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) {
          return <div>{["Name", "Size"][cell.colIndex]}</div>;
        }

        const flat = tree.rowModel.getRow(cell.rowIndex - 1);

        if (cell.colIndex === 0) {
          return (
            <div style={{ paddingLeft: flat.depth * 20, display: "flex", gap: 4 }}>
              {flat.hasChildren ? (
                <span
                  style={{ cursor: "pointer", width: 16 }}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={() => tree.toggleNode(flat.nodeId)}
                >
                  {flat.isExpanded ? "\u25BC" : "\u25B6"}
                </span>
              ) : (
                <span style={{ width: 16 }} />
              )}
              {flat.row.name}
            </div>
          );
        }

        return <div>{flat.row.size ? `${flat.row.size} B` : ""}</div>;
      }}
    />
  );
}
```

## Types

```ts
interface TreeNode<TRow> {
  row: TRow;
  children?: TreeNode<TRow>[];
}

interface FlatTreeRow<TRow> {
  type: "tree-node";
  row: TRow;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  nodeId: string;
}
```

## Result

| Property            | Type                          | Description                                         |
| ------------------- | ----------------------------- | --------------------------------------------------- |
| `rowModel`          | `RowModel<FlatTreeRow<TRow>>` | Flattened row model of currently visible tree nodes |
| `toggleNode`        | `(nodeId: string) => void`    | Toggle a node's expanded/collapsed state            |
| `expandAll`         | `() => void`                  | Expand all nodes                                    |
| `collapseAll`       | `() => void`                  | Collapse all nodes                                  |
| `isExpanded`        | `(nodeId: string) => boolean` | Whether the given node is currently expanded        |
| `keyboardExtension` | `KeyboardExtension`           | Wire to `<Grid>` for arrow-key expand/collapse      |

## Keyboard Navigation

When `keyboardExtension` is wired to the Grid:

| Key          | Behaviour                                                         |
| ------------ | ----------------------------------------------------------------- |
| `ArrowRight` | Expand the focused node (if it has children and is collapsed)     |
| `ArrowLeft`  | Collapse the focused node (if expanded); otherwise move to parent |

Standard arrow-key cell navigation still works for all other cases.

## Clickable Elements in Cells

Clickable elements (buttons, links, toggle icons) inside `renderCell` must call
`e.stopPropagation()` on `onPointerDown` to prevent the grid's selection handler from
intercepting the click:

```tsx
<button onPointerDown={(e) => e.stopPropagation()} onClick={() => tree.toggleNode(flat.nodeId)}>
  Toggle
</button>
```

Without `stopPropagation`, the grid's pointer handler will capture the event before
your `onClick` fires.

> **Performance tip:** The tree is flattened on every expand/collapse toggle. Only visible
> (expanded) nodes are visited during flattening, so performance scales with the visible
> node count, not the total tree size.
