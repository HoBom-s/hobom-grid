# Column Features

Three hooks cover interactive column management: resize, reorder, and visibility.
Each is independent — use as many or as few as you need.

## Column Resize

`useColumnResize` tracks per-column widths and handles pointer-based drag resizing.

```tsx
import { useColumnResize, Grid } from "@hobom-grid/react";

const initialWidths = { 0: 200, 1: 120, 2: 90 };

function App() {
  const colResize = useColumnResize(initialWidths, /* minWidth */ 40);

  return (
    <Grid
      colSizes={colResize.colWidths}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) {
          return (
            <div style={{ position: "relative" }}>
              <span>Column {cell.colIndex}</span>
              {/* Resize handle */}
              <div
                style={{
                  position: "absolute",
                  right: 0,
                  top: 0,
                  bottom: 0,
                  width: 6,
                  cursor: "col-resize",
                }}
                onPointerDown={(e) => {
                  colResize.startResize(cell.colIndex, e.clientX);
                  e.stopPropagation();
                  e.preventDefault();
                }}
              />
            </div>
          );
        }
        return <div>data</div>;
      }}
    />
  );
}
```

### API

| Property                           | Type                     | Description                                      |
| ---------------------------------- | ------------------------ | ------------------------------------------------ |
| `colWidths`                        | `Record<number, number>` | Current width per original column index          |
| `startResize(origColIdx, clientX)` | function                 | Start a pointer-drag resize for the given column |
| `resetWidth(origColIdx)`           | function                 | Reset a column to its initial width              |

### Constructor

```ts
useColumnResize(
  initialWidths: Record<number, number>,
  minWidth?: number,   // default: 40
)
```

---

## Column Reorder

`useColumnReorder` manages drag-to-reorder with visual drop-target feedback.
The hook is stateless about the actual column order — you provide an `onReorder` callback
and manage the order array yourself.

```tsx
import { useColumnReorder, Grid } from "@hobom-grid/react";
import { useState, useCallback } from "react";

const COLUMNS = ["Name", "Age", "Salary", "Department"];

function App() {
  const [colOrder, setColOrder] = useState(COLUMNS.map((_, i) => i));

  const handleReorder = useCallback((fromVisual: number, toVisual: number) => {
    setColOrder((prev) => {
      const next = [...prev];
      const [moved] = next.splice(fromVisual, 1);
      next.splice(toVisual, 0, moved);
      return next;
    });
  }, []);

  const colReorder = useColumnReorder(handleReorder);

  return (
    <Grid
      colCount={colOrder.length}
      renderCell={(cell) => {
        if (cell.rowIndex === 0) {
          const origIdx = colOrder[cell.colIndex];
          colReorder.reportColBounds(cell.colIndex, cell.x, cell.width);

          const isDragOver =
            colReorder.dragState?.overVisual === cell.colIndex &&
            colReorder.dragState.fromVisual !== cell.colIndex;

          return (
            <div
              style={{
                outline: isDragOver ? "2px dashed blue" : undefined,
                cursor: "grab",
              }}
              onPointerDown={(e) => {
                const containerLeft = e.currentTarget.getBoundingClientRect().left - cell.x;
                colReorder.startReorder(cell.colIndex, e.clientX, containerLeft, colOrder.length);
                e.stopPropagation();
              }}
            >
              {COLUMNS[origIdx]}
            </div>
          );
        }
        const origIdx = colOrder[cell.colIndex];
        return <div>{/* render data[cell.rowIndex][origIdx] */}</div>;
      }}
    />
  );
}
```

### API

| Property                                                    | Type                       | Description                                                       |
| ----------------------------------------------------------- | -------------------------- | ----------------------------------------------------------------- |
| `dragState`                                                 | `DragReorderState \| null` | `{ fromVisual, overVisual }` while dragging, otherwise `null`     |
| `reportColBounds(visualIdx, x, width)`                      | function                   | Call from each header cell on every render to register its bounds |
| `startReorder(visualIdx, clientX, containerLeft, colCount)` | function                   | Start a drag from the given header cell                           |

> **Important:** Call `reportColBounds` on every render of header cells — not just once.
> The bounds need to stay current as columns are resized or the viewport scrolls.

---

## Column Visibility

`useColumnVisibility` tracks which columns are hidden.

```tsx
import { useColumnVisibility } from "@hobom-grid/react";

const COLUMNS = ["Name", "Age", "Salary"];

function App() {
  const colVis = useColumnVisibility(COLUMNS.length);

  // Compute the visual order array, filtering out hidden columns
  const visibleCols = COLUMNS.map((_, i) => i).filter((origIdx) => colVis.isVisible(origIdx));
  // visibleCols[visualIdx] = originalIdx

  return (
    <>
      {/* Toggle buttons */}
      {COLUMNS.map((label, i) => (
        <button key={i} onClick={() => colVis.toggleVisibility(i)}>
          {colVis.isVisible(i) ? "Hide" : "Show"} {label}
        </button>
      ))}
      {colVis.hiddenCount > 0 && <button onClick={colVis.showAll}>Show all</button>}

      <Grid
        colCount={visibleCols.length}
        renderCell={(cell) => {
          const origIdx = visibleCols[cell.colIndex];
          if (cell.rowIndex === 0) return <div>{COLUMNS[origIdx]}</div>;
          return <div>{/* data[cell.rowIndex - 1][origIdx] */}</div>;
        }}
      />
    </>
  );
}
```

### API

| Property                    | Type                  | Description                             |
| --------------------------- | --------------------- | --------------------------------------- |
| `isVisible(origIdx)`        | `(number) => boolean` | Whether the column is currently visible |
| `toggleVisibility(origIdx)` | `(number) => void`    | Toggle visibility for a column          |
| `showAll()`                 | `() => void`          | Make all columns visible                |
| `hiddenCount`               | `number`              | Number of currently hidden columns      |

---

## Combining All Three

All three hooks compose naturally. Keep a single column order + visibility state:

```tsx
const colVis   = useColumnVisibility(COLUMNS.length);
const colReorder = useColumnReorder(handleReorder);
const colResize  = useColumnResize(initialWidths);

// Visible columns in current visual order
const visibleCols = colOrder.filter((origIdx) => colVis.isVisible(origIdx));

<Grid
  colCount={visibleCols.length}
  colSizes={/* remap colResize.colWidths by visual index */}
  ...
/>
```
