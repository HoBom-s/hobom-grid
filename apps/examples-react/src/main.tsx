import React, { useMemo } from "react";
import ReactDOM from "react-dom/client";
import { Grid } from "@hobom-grid/react";
import type { CellVM, InteractionKernelState } from "@hobom-grid/core";

// ---------------------------------------------------------------------------
// Demo data
// ---------------------------------------------------------------------------

const ROW_COUNT = 100_000;
const COL_COUNT = 30;
const HEADER_ROW_COUNT = 1;

const COL_NAMES = Array.from({ length: COL_COUNT }, (_, i) =>
  String.fromCharCode(65 + (i % 26)).repeat(Math.floor(i / 26) + 1),
);

// ---------------------------------------------------------------------------
// Cell renderer helpers
// ---------------------------------------------------------------------------

const isCellSelected = (state: InteractionKernelState, row: number, col: number): boolean => {
  for (const range of state.selection.ranges) {
    if (
      row >= range.start.row &&
      row <= range.end.row &&
      col >= range.start.col &&
      col <= range.end.col
    ) {
      return true;
    }
  }
  return false;
};

const isCellFocused = (state: InteractionKernelState, row: number, col: number): boolean => {
  const fc = state.focusCell;
  return fc != null && fc.row === row && fc.col === col;
};

// ---------------------------------------------------------------------------
// Cell components
// ---------------------------------------------------------------------------

const HeaderCell = React.memo(({ col }: { col: number }) => (
  <div
    style={{
      width: "100%",
      height: "100%",
      display: "flex",
      alignItems: "center",
      paddingInline: 8,
      background: "#f0f0f0",
      borderBottom: "2px solid #ccc",
      borderRight: "1px solid #ddd",
      fontWeight: 600,
      fontSize: 13,
      color: "#333",
      boxSizing: "border-box",
      userSelect: "none",
    }}
  >
    {COL_NAMES[col]}
  </div>
));

const BodyCell = React.memo(
  ({
    row,
    col,
    selected,
    focused,
  }: {
    row: number;
    col: number;
    selected: boolean;
    focused: boolean;
  }) => (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingInline: 8,
        background: focused ? "#dbeafe" : selected ? "#eff6ff" : row % 2 === 0 ? "#fff" : "#fafafa",
        borderBottom: "1px solid #eee",
        borderRight: "1px solid #eee",
        fontSize: 13,
        color: "#111",
        boxSizing: "border-box",
        outline: focused ? "2px solid #3b82f6" : "none",
        outlineOffset: "-2px",
      }}
    >
      {`R${row} C${col}`}
    </div>
  ),
);

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

function App() {
  const renderCell = useMemo(
    () =>
      (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
        const { rowIndex, colIndex, kind } = cell;

        if (kind === "header" || kind === "cornerStart" || kind === "cornerEnd") {
          return <HeaderCell col={colIndex} />;
        }

        const selected = isCellSelected(interactionState, rowIndex, colIndex);
        const focused = isCellFocused(interactionState, rowIndex, colIndex);

        return <BodyCell row={rowIndex} col={colIndex} selected={selected} focused={focused} />;
      },
    [],
  );

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#f8f8f8",
      }}
    >
      <header
        style={{
          padding: "12px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: 16 }}>hobom-grid</strong>
        <span style={{ fontSize: 13, color: "#6b7280" }}>
          {ROW_COUNT.toLocaleString()} rows × {COL_COUNT} cols
        </span>
      </header>

      <div style={{ flex: 1, overflow: "hidden", padding: 16 }}>
        <Grid
          rowCount={ROW_COUNT}
          colCount={COL_COUNT}
          headerRowCount={HEADER_ROW_COUNT}
          defaultRowHeight={32}
          defaultColWidth={120}
          overscanPx={200}
          renderCell={renderCell}
          style={{
            width: "100%",
            height: "100%",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#fff",
          }}
        />
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
