# Grid Component

The `<Grid>` component is the main entry point for `@hobom-grid/react`. It handles rendering, virtualization, keyboard navigation, and accessibility automatically.

## Basic Usage

```tsx
import { Grid } from "@hobom-grid/react";

<Grid
  rowCount={1000}
  colCount={10}
  defaultRowHeight={36}
  defaultColWidth={120}
  headerRowCount={1}
  renderCell={(cell, state) => <div>{`${cell.rowIndex},${cell.colIndex}`}</div>}
/>;
```

## Props

| Prop                  | Type                         | Default       | Description                                                                                   |
| --------------------- | ---------------------------- | ------------- | --------------------------------------------------------------------------------------------- |
| `rowCount`            | `number`                     | required      | Total number of rows (including header rows)                                                  |
| `colCount`            | `number`                     | required      | Total number of columns                                                                       |
| `defaultRowHeight`    | `number`                     | `32`          | Row height estimate used before DOM measurement                                               |
| `defaultColWidth`     | `number`                     | `120`         | Column width estimate used before DOM measurement                                             |
| `colSizes`            | `Record<number, number>`     | —             | Pre-set column widths in px, keyed by column index                                            |
| `headerRowCount`      | `number`                     | `1`           | Number of rows treated as header (sticky, not scrolled)                                       |
| `pinnedColStartCount` | `number`                     | `0`           | Number of columns pinned to the left                                                          |
| `pinnedColEndCount`   | `number`                     | `0`           | Number of columns pinned to the right                                                         |
| `overscanPx`          | `number`                     | `150`         | Extra pixels rendered beyond the visible area (reduces blank-flash on fast scroll)            |
| `renderCell`          | `(cell, state) => ReactNode` | required      | Cell renderer function                                                                        |
| `onCellDoubleClick`   | `(row, col) => void`         | —             | Called on body cell double-click. Wire to `useEditing.gridExtension.onCellDoubleClick`        |
| `keyboardExtension`   | `{ onKeyDown }`              | —             | Called before built-in keyboard handler. Wire to `useEditing.gridExtension.keyboardExtension` |
| `ariaLabel`           | `string`                     | `"Data grid"` | ARIA label for screen readers                                                                 |
| `style`               | `CSSProperties`              | —             | Passed to the root container                                                                  |
| `className`           | `string`                     | —             | CSS class on the root container                                                               |

## renderCell

The `renderCell` function receives two arguments:

### `cell: CellVM`

| Field      | Type                                                                                 | Description                               |
| ---------- | ------------------------------------------------------------------------------------ | ----------------------------------------- |
| `rowIndex` | `number`                                                                             | Row index (0-based, 0 = first header row) |
| `colIndex` | `number`                                                                             | Column index (0-based)                    |
| `x`        | `number`                                                                             | Left offset in px within the viewport     |
| `y`        | `number`                                                                             | Top offset in px within the viewport      |
| `width`    | `number`                                                                             | Cell width in px                          |
| `height`   | `number`                                                                             | Cell height in px                         |
| `kind`     | `"header" \| "body" \| "pinnedStart" \| "pinnedEnd" \| "cornerStart" \| "cornerEnd"` | Cell region                               |

### `state: GridRenderState`

| Field              | Type                     | Description                                |
| ------------------ | ------------------------ | ------------------------------------------ |
| `interactionState` | `InteractionKernelState` | Current hover/focus/selection/drag state   |
| `viewport`         | `ViewportModel`          | Current viewport dimensions and transforms |

## Keyboard Navigation

When the grid has focus, the following keys are active:

| Key                      | Action                                 |
| ------------------------ | -------------------------------------- |
| `Arrow keys`             | Move focus one cell in that direction  |
| `Home` / `End`           | Move to first / last column in the row |
| `Ctrl+Home` / `Ctrl+End` | Move to first / last cell in the grid  |
| `PageUp` / `PageDown`    | Move focus by one viewport height      |
| `Escape`                 | Clear selection                        |

## Pinned Columns

```tsx
<Grid
  pinnedColStartCount={1}  // first column stays left
  pinnedColEndCount={1}    // last column stays right
  ...
/>
```

In `renderCell`, use `cell.kind` to style pinned vs body columns differently:

```tsx
renderCell={(cell) => {
  const isPinned = cell.kind === "pinnedStart" || cell.kind === "pinnedEnd";
  return (
    <div style={{ background: isPinned ? "#f5f5f5" : "white" }}>
      {data[cell.rowIndex][cell.colIndex]}
    </div>
  );
}}
```

## Column Sizing

Pass measured widths via `colSizes` to control exact column widths. This pairs naturally with `useColumnResize`:

```tsx
const { colWidths, resizeHandlers } = useColumnResize({
  count: columns.length,
  defaultWidth: 120,
});

<Grid colSizes={colWidths} ... />
```

## Accessibility

The grid outputs ARIA attributes automatically:

- `role="grid"` on the container
- `role="columnheader"` on header cells
- `role="gridcell"` on body cells
- `aria-rowindex` / `aria-colindex` on every cell
- `aria-selected` on the focused cell
- `aria-rowcount` / `aria-colcount` on the container
- `aria-multiselectable={true}` on the container

Use `ariaLabel` to set a meaningful label for screen readers:

```tsx
<Grid ariaLabel="Employee roster" ... />
```
