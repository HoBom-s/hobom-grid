# Editing System

`useEditing` provides a full in-place cell editing lifecycle: open → change → validate → commit or cancel.

## Basic Wiring

```tsx
import { Grid, useEditing } from "@hobom-grid/react";
import { useState } from "react";

function App() {
  const [data, setData] = useState([
    { name: "Alice", salary: 90000 },
    { name: "Bob", salary: 60000 },
  ]);

  const editing = useEditing(
    {
      getValue: (row, col) => {
        const key = col === 0 ? "name" : "salary";
        return data[row - 1]?.[key] ?? "";
      },
      onCommit: ({ row, col, newValue }) => {
        const key = col === 0 ? "name" : "salary";
        setData((prev) => prev.map((r, i) => (i === row - 1 ? { ...r, [key]: newValue } : r)));
      },
    },
    interactionState, // from useInteraction or from Grid's GridRenderState
  );

  return (
    <Grid
      rowCount={data.length + 1}
      colCount={2}
      onCellDoubleClick={editing.gridExtension.onCellDoubleClick}
      keyboardExtension={editing.gridExtension.keyboardExtension}
      renderCell={(cell, { interactionState }) => {
        if (cell.rowIndex === 0) return <th>{col === 0 ? "Name" : "Salary"}</th>;

        if (editing.isEditing(cell.rowIndex, cell.colIndex)) {
          return (
            <input
              autoFocus
              value={String(editing.editValue ?? "")}
              onChange={(e) => editing.setEditValue(e.target.value)}
              onBlur={() => editing.commit()}
            />
          );
        }

        const key = cell.colIndex === 0 ? "name" : "salary";
        return <div>{String(data[cell.rowIndex - 1]?.[key] ?? "")}</div>;
      }}
    />
  );
}
```

## Keyboard Shortcuts

When `keyboardExtension` is wired to the Grid:

| Key                    | Behaviour                                         |
| ---------------------- | ------------------------------------------------- |
| `F2`                   | Open editor on focused cell                       |
| `Enter` (in editor)    | Commit and keep position                          |
| `Escape` (in editor)   | Cancel without committing                         |
| `Tab` (in editor)      | Commit, then move focus naturally                 |
| Arrow keys (in editor) | Suppressed at grid level (native cursor movement) |

## Validation

Provide a `validate` function to block invalid commits:

```tsx
const editing = useEditing(
  {
    getValue,
    onCommit,
    validate: (value, { row, col }) => {
      if (col === 1 && (isNaN(Number(value)) || Number(value) < 0)) {
        return { valid: false, message: "Salary must be a positive number" };
      }
      return { valid: true };
    },
  },
  interactionState,
);
```

When validation fails:

- `editingState.activeEdit.validationState` is `"invalid"`
- `editingState.activeEdit.validationMessage` holds your message
- `onCommit` is NOT called

Validation can also be async (return a `Promise<ValidationResult>`):

```tsx
validate: async (value) => {
  const exists = await checkNameUnique(String(value));
  return exists ? { valid: true } : { valid: false, message: "Name already taken" };
},
```

## Restricting Editable Cells

Use `isEditable` to make only certain cells editable:

```tsx
const editing = useEditing(
  {
    getValue,
    isEditable: (row, col) => row > 0 && col !== 2, // col 2 is read-only
  },
  interactionState,
);
```

## Hook API

### `useEditing(opts, interactionState)`

**Options (`UseEditingOpts`):**

| Option       | Type                                                              | Description                                                              |
| ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------ |
| `getValue`   | `(row, col) => TValue`                                            | Returns the committed value for a cell (seeds the editor)                |
| `onCommit`   | `(change: CellChange) => void \| Promise<void>`                   | Called after a successful commit when the value changed                  |
| `validate`   | `(value, coord) => ValidationResult \| Promise<ValidationResult>` | Validate before committing. Return `{ valid: false, message }` to block. |
| `isEditable` | `(row, col) => boolean`                                           | Return `false` to prevent a cell from opening an editor                  |

**Result (`UseEditingResult`):**

| Property        | Type                    | Description                                                         |
| --------------- | ----------------------- | ------------------------------------------------------------------- |
| `editingState`  | `EditingState`          | Current editing state (activeEdit, validationState, etc.)           |
| `editValue`     | `TValue \| undefined`   | Current editor value. `undefined` when not editing.                 |
| `startEdit`     | `(row, col) => void`    | Programmatically open an editor                                     |
| `setEditValue`  | `(value) => void`       | Update the in-progress editor value                                 |
| `commit`        | `() => Promise<void>`   | Commit the current edit                                             |
| `cancel`        | `() => void`            | Cancel without committing                                           |
| `isEditing`     | `(row, col) => boolean` | Whether the given cell is currently in edit mode                    |
| `gridExtension` | `object`                | Spread onto `<Grid>` to wire up double-click and keyboard shortcuts |

## Optimistic Updates

`onCommit` is fire-and-forget — the editor closes immediately after a successful commit,
before the promise resolves. This allows your UI to update optimistically while the
server-side save completes in the background.

```tsx
onCommit: async ({ row, col, newValue }) => {
  // Optimistic update already applied by the time this runs.
  await api.saveCell(row, col, newValue);
},
```
