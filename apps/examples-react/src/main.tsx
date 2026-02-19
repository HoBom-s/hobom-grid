import React, { useCallback, useMemo, useState } from "react";
import ReactDOM from "react-dom/client";
import { Grid, useClientRowModel } from "@hobom-grid/react";
import type { SortSpec } from "@hobom-grid/core";
import type { CellVM, InteractionKernelState } from "@hobom-grid/core";

// ---------------------------------------------------------------------------
// Data
// ---------------------------------------------------------------------------

type Employee = {
  id: number;
  name: string;
  department: string;
  role: string;
  salary: number;
  age: number;
  active: boolean;
};

const DEPARTMENTS = ["Engineering", "Design", "Product", "Marketing", "Sales", "HR"];
const ROLES = ["Junior", "Mid", "Senior", "Lead", "Manager", "Director"];

const generateData = (count: number): Employee[] =>
  Array.from({ length: count }, (_, i) => ({
    id: i + 1,
    name: `Employee ${i + 1}`,
    department: DEPARTMENTS[i % DEPARTMENTS.length]!,
    role: ROLES[i % ROLES.length]!,
    salary: 40_000 + ((i * 1_337) % 120_000),
    age: 22 + (i % 43),
    active: i % 7 !== 0,
  }));

const RAW_DATA = generateData(100_000);

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColKey = keyof Employee;

type ColDef = {
  key: ColKey;
  label: string;
  width: number;
  align?: "left" | "right";
  format?: (v: unknown) => string;
};

const COLUMNS: ColDef[] = [
  { key: "id", label: "ID", width: 80, align: "right" },
  { key: "name", label: "Name", width: 160 },
  { key: "department", label: "Department", width: 140 },
  { key: "role", label: "Role", width: 110 },
  {
    key: "salary",
    label: "Salary",
    width: 110,
    align: "right",
    format: (v) => `$${(v as number).toLocaleString()}`,
  },
  { key: "age", label: "Age", width: 70, align: "right" },
  { key: "active", label: "Active", width: 80, format: (v) => (v ? "✓" : "—") },
];

// ---------------------------------------------------------------------------
// Selection helpers
// ---------------------------------------------------------------------------

const isCellSelected = (state: InteractionKernelState, row: number, col: number): boolean => {
  for (const range of state.selection.ranges) {
    if (
      row >= range.start.row &&
      row <= range.end.row &&
      col >= range.start.col &&
      col <= range.end.col
    )
      return true;
  }
  return false;
};

const isCellFocused = (state: InteractionKernelState, row: number, col: number): boolean => {
  const fc = state.focusCell;
  return fc != null && fc.row === row && fc.col === col;
};

// ---------------------------------------------------------------------------
// Cell styles
// ---------------------------------------------------------------------------

const HEADER_STYLE: React.CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  paddingInline: 8,
  background: "#f5f5f5",
  borderBottom: "2px solid #d1d5db",
  borderRight: "1px solid #e5e7eb",
  fontWeight: 600,
  fontSize: 13,
  color: "#374151",
  boxSizing: "border-box",
  userSelect: "none",
  cursor: "pointer",
  gap: 4,
};

const bodyCellStyle = (
  selected: boolean,
  focused: boolean,
  striped: boolean,
  align: "left" | "right",
): React.CSSProperties => ({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: align === "right" ? "flex-end" : "flex-start",
  paddingInline: 8,
  background: focused ? "#dbeafe" : selected ? "#eff6ff" : striped ? "#fafafa" : "#fff",
  borderBottom: "1px solid #f3f4f6",
  borderRight: "1px solid #f3f4f6",
  fontSize: 13,
  color: "#111827",
  boxSizing: "border-box",
  outline: focused ? "2px solid #3b82f6" : "none",
  outlineOffset: "-2px",
});

// ---------------------------------------------------------------------------
// App
// ---------------------------------------------------------------------------

type SortState = { key: ColKey; direction: "asc" | "desc" } | null;

function App() {
  const [filterText, setFilterText] = useState("");
  const [sortState, setSortState] = useState<SortState>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // ---- Data pipeline ----

  const sort = useMemo<SortSpec<Employee>[] | undefined>(
    () => (sortState ? [{ key: sortState.key, direction: sortState.direction }] : undefined),
    [sortState],
  );

  const filter = useCallback(
    (row: Employee) => {
      if (showActiveOnly && !row.active) return false;
      if (filterText.trim() === "") return true;
      const q = filterText.toLowerCase();
      return (
        row.name.toLowerCase().includes(q) ||
        row.department.toLowerCase().includes(q) ||
        row.role.toLowerCase().includes(q)
      );
    },
    [filterText, showActiveOnly],
  );

  const rowModel = useClientRowModel(RAW_DATA, {
    getId: useCallback((r: Employee) => r.id, []),
    sort,
    filter,
  });

  // ---- Column widths (passed to Grid as defaultColWidth is per-axis estimate;
  //      for heterogeneous widths users would report sizes via reportMeasuredSize.
  //      For this demo we render all cols at uniform 120px and rely on cell padding.) ----

  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      const col = COLUMNS[cell.colIndex];
      if (!col) return null;

      // Header row (rowIndex 0)
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        const isSorted = sortState?.key === col.key;
        const nextDir = isSorted && sortState?.direction === "asc" ? "desc" : "asc";

        return (
          <div
            style={HEADER_STYLE}
            onClick={() => setSortState({ key: col.key, direction: nextDir })}
          >
            <span>{col.label}</span>
            {isSorted && (
              <span style={{ fontSize: 10, color: "#6b7280" }}>
                {sortState!.direction === "asc" ? "▲" : "▼"}
              </span>
            )}
          </div>
        );
      }

      // Body rows start at rowIndex 1 (rowIndex 0 = header row in grid terms)
      // Virtual data row index = rowIndex - 1 (subtract header row count = 1)
      const dataVirtualIndex = cell.rowIndex - 1;
      if (dataVirtualIndex < 0 || dataVirtualIndex >= rowModel.rowCount) return null;

      const row = rowModel.getRow(dataVirtualIndex);
      const selected = isCellSelected(interactionState, cell.rowIndex, cell.colIndex);
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const value = row[col.key];
      const display = col.format ? col.format(value) : String(value);

      return (
        <div
          style={bodyCellStyle(selected, focused, dataVirtualIndex % 2 !== 0, col.align ?? "left")}
        >
          {display}
        </div>
      );
    },
    [rowModel, sortState],
  );

  const totalRows = 1 + rowModel.rowCount; // 1 header row + data rows

  const colSizes = useMemo(() => Object.fromEntries(COLUMNS.map((col, i) => [i, col.width])), []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        fontFamily: "system-ui, sans-serif",
        background: "#f9fafb",
      }}
    >
      {/* Toolbar */}
      <header
        style={{
          padding: "10px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <strong style={{ fontSize: 15, marginRight: 4 }}>hobom-grid</strong>

        <input
          type="text"
          placeholder="Filter by name / department / role…"
          value={filterText}
          onChange={(e) => setFilterText(e.target.value)}
          style={{
            padding: "5px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 13,
            width: 260,
            outline: "none",
          }}
        />

        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => setShowActiveOnly(e.target.checked)}
          />
          Active only
        </label>

        {sortState && (
          <button
            onClick={() => setSortState(null)}
            style={{
              padding: "4px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              background: "#fff",
            }}
          >
            Clear sort ×
          </button>
        )}

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          {rowModel.rowCount.toLocaleString()} / {RAW_DATA.length.toLocaleString()} rows
        </span>
      </header>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }}>
        <Grid
          rowCount={totalRows}
          colCount={COLUMNS.length}
          headerRowCount={1}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={colSizes}
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
