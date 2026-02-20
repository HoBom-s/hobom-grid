import React, { useCallback, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Grid,
  useClientRowModel,
  useEditing,
  useClipboard,
  useColumnResize,
  useColumnReorder,
  useColumnVisibility,
} from "@hobom-grid/react";
import type { SortSpec } from "@hobom-grid/core";
import type { CellVM, InteractionKernelState } from "@hobom-grid/core";

// ---------------------------------------------------------------------------
// Data model
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

const BASE_DATA = generateData(100_000);

// ---------------------------------------------------------------------------
// Column definitions
// ---------------------------------------------------------------------------

type ColKey = keyof Employee;

type ColDef = {
  key: ColKey;
  label: string;
  width: number;
  align?: "left" | "right";
  editable?: boolean;
  format?: (v: unknown) => string;
  parse?: (raw: string, prev: unknown) => unknown;
};

const COLUMNS: ColDef[] = [
  { key: "id", label: "ID", width: 70, align: "right" },
  { key: "name", label: "Name", width: 180, editable: true },
  { key: "department", label: "Department", width: 140, editable: true },
  { key: "role", label: "Role", width: 110, editable: true },
  {
    key: "salary",
    label: "Salary",
    width: 120,
    align: "right",
    editable: true,
    format: (v) => `$${(v as number).toLocaleString()}`,
    parse: (raw) => {
      const n = Number(raw.replace(/[^0-9.-]/g, ""));
      return isNaN(n) ? undefined : n;
    },
  },
  {
    key: "age",
    label: "Age",
    width: 70,
    align: "right",
    editable: true,
    parse: (raw) => Number(raw),
  },
  {
    key: "active",
    label: "Active",
    width: 80,
    format: (v) => (v ? "✓" : "—"),
  },
];

// ---------------------------------------------------------------------------
// JSX cell renderers
// ---------------------------------------------------------------------------

const DEPT_ICON: Record<string, string> = {
  Engineering: "⚙️",
  Design: "🎨",
  Product: "📦",
  Marketing: "📣",
  Sales: "💼",
  HR: "🧑‍🤝‍🧑",
};

const ROLE_STYLE: Record<string, React.CSSProperties> = {
  Junior: { background: "#eff6ff", color: "#1d4ed8" },
  Mid: { background: "#f0fdf4", color: "#15803d" },
  Senior: { background: "#fefce8", color: "#a16207" },
  Lead: { background: "#fdf4ff", color: "#7e22ce" },
  Manager: { background: "#fff1f2", color: "#be123c" },
  Director: { background: "#0f172a", color: "#f8fafc" },
};

const salaryColor = (salary: number): string => {
  if (salary >= 120_000) return "#15803d";
  if (salary >= 80_000) return "#a16207";
  return "#374151";
};

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
// App
// ---------------------------------------------------------------------------

type SortState = { key: ColKey; direction: "asc" | "desc" } | null;

function App() {
  const [filterText, setFilterText] = useState("");
  const [sortState, setSortState] = useState<SortState>(null);
  const [showActiveOnly, setShowActiveOnly] = useState(false);

  // Mutable overrides on top of the immutable base data (row id → partial update).
  const [overrides, setOverrides] = useState<Map<number, Partial<Employee>>>(new Map());

  // Merge base data with overrides.
  const rows = useMemo<Employee[]>(
    () =>
      overrides.size === 0
        ? BASE_DATA
        : BASE_DATA.map((row) => {
            const patch = overrides.get(row.id);
            return patch ? { ...row, ...patch } : row;
          }),
    [overrides],
  );

  // ── Data pipeline ──────────────────────────────────────────────────────────

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

  const rowModel = useClientRowModel(rows, {
    getId: useCallback((r: Employee) => r.id, []),
    sort,
    filter,
  });

  const totalRows = 1 + rowModel.rowCount;

  // ── Phase 5: Column features ───────────────────────────────────────────────

  // Column resize — tracks per-original-index widths.
  const initialWidths = useMemo(
    () => Object.fromEntries(COLUMNS.map((col, i) => [i, col.width])),
    [],
  );
  const colResize = useColumnResize(initialWidths);

  // Column visibility — tracks which original indices are hidden.
  const colVis = useColumnVisibility(COLUMNS.length);

  // Column order — ordered list of ALL original col indices (including hidden).
  // Reorder moves items within this array; the visible subset is filtered separately.
  const [allColOrder, setAllColOrder] = useState<number[]>(() => COLUMNS.map((_, i) => i));

  // isVisible ref so the onReorder callback can read it without stale closure.
  const isVisibleRef = useRef(colVis.isVisible);
  // eslint-disable-next-line react-hooks/refs
  isVisibleRef.current = colVis.isVisible;

  // Column reorder — called with visual indices in the *visible* list.
  const onReorder = useCallback((fromVisual: number, toVisual: number) => {
    setAllColOrder((prev) => {
      // Map visual indices (in visible cols) back to positions in allColOrder.
      const visCols = prev.filter((i) => isVisibleRef.current(i));
      const fromOrig = visCols[fromVisual];
      const toOrig = visCols[toVisual];
      if (fromOrig === undefined || toOrig === undefined) return prev;
      const fromPos = prev.indexOf(fromOrig);
      const toPos = prev.indexOf(toOrig);
      if (fromPos === -1 || toPos === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromPos, 1);
      next.splice(toPos, 0, moved!);
      return next;
    });
  }, []);

  const colReorder = useColumnReorder(onReorder);

  // Final list: ordered visible original indices.  visibleCols[visualIdx] = origIdx.
  const visibleCols = useMemo(
    () => allColOrder.filter((i) => colVis.isVisible(i)),
    [allColOrder, colVis.isVisible],
  );

  // Ref so renderCell / getValue don't become stale.
  const visibleColsRef = useRef(visibleCols);
  // eslint-disable-next-line react-hooks/refs
  visibleColsRef.current = visibleCols;

  // colSizes for Grid: maps visual index → width of the original column.
  const colSizes = useMemo(
    () =>
      Object.fromEntries(
        visibleCols.map((origIdx, visIdx) => [
          visIdx,
          colResize.colWidths[origIdx] ?? COLUMNS[origIdx]?.width ?? 120,
        ]),
      ),
    [visibleCols, colResize.colWidths],
  );

  // ── Column chooser UI state ────────────────────────────────────────────────

  const [colChooserOpen, setColChooserOpen] = useState(false);
  const colChooserRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside.
  const handleColChooserToggle = useCallback(() => setColChooserOpen((v) => !v), []);

  // ── Value access (used by editing + clipboard) ─────────────────────────────

  const interactionStateRef = useRef<InteractionKernelState | null>(null);

  const getValue = useCallback(
    (row: number, col: number): unknown => {
      const origIdx = visibleColsRef.current[col] ?? col;
      if (row === 0) return COLUMNS[origIdx]?.label ?? "";
      const dataIndex = row - 1;
      if (dataIndex < 0 || dataIndex >= rowModel.rowCount) return "";
      const employee = rowModel.getRow(dataIndex);
      const colDef = COLUMNS[origIdx];
      if (!colDef) return "";
      return employee[colDef.key];
    },
    [rowModel],
  );

  // ── Editing ────────────────────────────────────────────────────────────────

  const stableInteractionState = useMemo(
    () =>
      new Proxy({} as InteractionKernelState, {
        get(_t, prop) {
          return interactionStateRef.current?.[prop as keyof InteractionKernelState];
        },
      }),
    [],
  );

  const editing = useEditing<unknown>(
    {
      getValue,
      isEditable: (row, col) => {
        const origIdx = visibleColsRef.current[col] ?? col;
        return row > 0 && (COLUMNS[origIdx]?.editable ?? false);
      },
      validate: (value, { col }) => {
        const origIdx = visibleColsRef.current[col] ?? col;
        const colDef = COLUMNS[origIdx];
        if (!colDef?.editable) return { valid: true };
        if (colDef.key === "salary" || colDef.key === "age") {
          const n = Number(value);
          if (isNaN(n) || n < 0) return { valid: false, message: "Must be a positive number" };
        }
        if (typeof value === "string" && value.trim() === "") {
          return { valid: false, message: "Value cannot be empty" };
        }
        return { valid: true };
      },
      onCommit: ({ row, col, newValue }) => {
        const origIdx = visibleColsRef.current[col] ?? col;
        const dataIndex = row - 1;
        const employee = rowModel.getRow(dataIndex);
        const colDef = COLUMNS[origIdx];
        if (!colDef || !employee) return;
        const parsed = colDef.parse
          ? colDef.parse(String(newValue), employee[colDef.key])
          : newValue;
        setOverrides((prev) => {
          const next = new Map(prev);
          next.set(employee.id, { ...next.get(employee.id), [colDef.key]: parsed });
          return next;
        });
      },
    },
    stableInteractionState,
  );

  // ── Clipboard ──────────────────────────────────────────────────────────────

  const clipboard = useClipboard<unknown>(
    {
      getValue,
      formatValue: (v, _r, col) => {
        const origIdx = visibleColsRef.current[col] ?? col;
        const colDef = COLUMNS[origIdx];
        if (!colDef) return String(v ?? "");
        return colDef.format ? colDef.format(v) : String(v ?? "");
      },
      onPaste: (changes) => {
        const updates = new Map<number, Partial<Employee>>();
        for (const { row, col, value } of changes) {
          if (row === 0) continue;
          const dataIndex = row - 1;
          if (dataIndex < 0 || dataIndex >= rowModel.rowCount) continue;
          const employee = rowModel.getRow(dataIndex);
          const origIdx = visibleColsRef.current[col] ?? col;
          const colDef = COLUMNS[origIdx];
          if (!colDef?.editable) continue;
          const parsed = colDef.parse ? colDef.parse(value, employee[colDef.key]) : value;
          const existing = updates.get(employee.id) ?? {};
          updates.set(employee.id, { ...existing, [colDef.key]: parsed });
        }
        if (updates.size === 0) return;
        setOverrides((prev) => {
          const next = new Map(prev);
          for (const [id, patch] of updates) {
            next.set(id, { ...next.get(id), ...patch });
          }
          return next;
        });
      },
    },
    stableInteractionState,
  );

  // ── Merge keyboard extensions (editing + clipboard) ────────────────────────

  const keyboardExtension = useMemo(
    () => ({
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        editing.gridExtension.keyboardExtension.onKeyDown(e);
        clipboard.onKeyDown(e);
      },
    }),
    [editing.gridExtension.keyboardExtension.onKeyDown, clipboard.onKeyDown],
  );

  // ── Cell renderer ──────────────────────────────────────────────────────────

  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      interactionStateRef.current = interactionState;

      const origIdx = visibleColsRef.current[cell.colIndex] ?? cell.colIndex;
      const col = COLUMNS[origIdx];
      if (!col) return null;

      const isDragging = colReorder.dragState?.fromVisual === cell.colIndex;
      const isDropTarget = colReorder.dragState?.overVisual === cell.colIndex;

      // ── Header row ─────────────────────────────────────────────────────────
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        // Report bounds so the reorder hook can compute drop targets.
        colReorder.reportColBounds(cell.colIndex, cell.x, cell.width);

        const isSorted = sortState?.key === col.key;
        const nextDir = isSorted && sortState?.direction === "asc" ? "desc" : "asc";

        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              paddingRight: 14, // room for resize handle
              background: isDragging ? "#dbeafe" : isDropTarget ? "#eff6ff" : "#f5f5f5",
              borderBottom: "2px solid #d1d5db",
              borderRight: isDropTarget ? "2px solid #3b82f6" : "1px solid #e5e7eb",
              fontWeight: 600,
              fontSize: 13,
              color: "#374151",
              boxSizing: "border-box",
              userSelect: "none",
              cursor: colReorder.dragState ? "grabbing" : "grab",
              opacity: isDragging ? 0.6 : 1,
              gap: 4,
              transition: "background 0.1s, border-color 0.1s",
            }}
            onPointerDown={(e) => {
              // Compute container left: cell.x is viewport-relative,
              // so containerLeft = absLeft - cell.x (invariant with scroll).
              const containerLeft = e.currentTarget.getBoundingClientRect().left - cell.x;
              colReorder.startReorder(
                cell.colIndex,
                e.clientX,
                containerLeft,
                visibleColsRef.current.length,
              );
              e.stopPropagation();
            }}
            onClick={() => setSortState({ key: col.key, direction: nextDir })}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {col.label}
            </span>
            {isSorted && (
              <span style={{ fontSize: 10, color: "#6b7280", flexShrink: 0 }}>
                {sortState!.direction === "asc" ? "▲" : "▼"}
              </span>
            )}

            {/* Resize handle — right edge of header cell */}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 6,
                cursor: "col-resize",
                zIndex: 1,
                background: "transparent",
              }}
              onPointerDown={(e) => {
                colResize.startResize(origIdx, e.clientX);
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        );
      }

      // ── Body rows ──────────────────────────────────────────────────────────
      const dataIndex = cell.rowIndex - 1;
      if (dataIndex < 0 || dataIndex >= rowModel.rowCount) return null;

      const row = rowModel.getRow(dataIndex);
      const selected = isCellSelected(interactionState, cell.rowIndex, cell.colIndex);
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const isEditing = editing.isEditing(cell.rowIndex, cell.colIndex);
      const hasError = isEditing && editing.editingState.activeEdit?.validationState === "invalid";
      const errMsg = isEditing ? editing.editingState.activeEdit?.validationMessage : undefined;

      const rawValue = row[col.key];
      const display = col.format ? col.format(rawValue) : String(rawValue ?? "");

      // Edit mode
      if (isEditing && col.editable) {
        return (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <input
              autoFocus
              defaultValue={String(editing.editValue ?? rawValue ?? "")}
              onChange={(e) => editing.setEditValue(e.target.value)}
              onBlur={() => void editing.commit()}
              style={{
                width: "100%",
                height: "100%",
                border: hasError ? "2px solid #ef4444" : "2px solid #3b82f6",
                outline: "none",
                paddingInline: 6,
                fontSize: 13,
                boxSizing: "border-box",
                background: "#fff",
              }}
            />
            {hasError && errMsg && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  left: 0,
                  background: "#ef4444",
                  color: "#fff",
                  fontSize: 11,
                  padding: "2px 6px",
                  borderRadius: 3,
                  whiteSpace: "nowrap",
                  zIndex: 10,
                  pointerEvents: "none",
                }}
              >
                {errMsg}
              </div>
            )}
          </div>
        );
      }

      // Display mode
      const cellBg = focused
        ? "#dbeafe"
        : selected
          ? "#eff6ff"
          : dataIndex % 2 !== 0
            ? "#fafafa"
            : "#fff";
      const cellBase: React.CSSProperties = {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        paddingInline: 8,
        background: cellBg,
        borderBottom: "1px solid #f3f4f6",
        borderRight: "1px solid #f3f4f6",
        fontSize: 13,
        boxSizing: "border-box",
        outline: focused ? "2px solid #3b82f6" : "none",
        outlineOffset: "-2px",
        cursor: col.editable ? "text" : "default",
      };

      // Department — emoji icon prefix
      if (col.key === "department") {
        const icon = DEPT_ICON[row.department] ?? "🏢";
        return (
          <div style={{ ...cellBase, gap: 6 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
            <span style={{ color: "#111827" }}>{row.department}</span>
          </div>
        );
      }

      // Role — colored badge chip
      if (col.key === "role") {
        const roleStyle = ROLE_STYLE[row.role] ?? {};
        return (
          <div style={{ ...cellBase }}>
            <span
              style={{
                ...roleStyle,
                borderRadius: 10,
                padding: "2px 9px",
                fontSize: 12,
                fontWeight: 500,
                whiteSpace: "nowrap",
              }}
            >
              {row.role}
            </span>
          </div>
        );
      }

      // Salary — color-coded text + mini bar
      if (col.key === "salary") {
        const pct = Math.round(((row.salary - 40_000) / 120_000) * 100);
        return (
          <div
            style={{
              ...cellBase,
              flexDirection: "column",
              alignItems: "flex-end",
              gap: 2,
              paddingBlock: 4,
            }}
          >
            <span style={{ color: salaryColor(row.salary), fontWeight: 500, fontSize: 12 }}>
              ${row.salary.toLocaleString()}
            </span>
            <div style={{ width: "80%", height: 3, background: "#e5e7eb", borderRadius: 2 }}>
              <div
                style={{
                  width: `${pct}%`,
                  height: "100%",
                  background: salaryColor(row.salary),
                  borderRadius: 2,
                }}
              />
            </div>
          </div>
        );
      }

      // Active — clickable toggle pill
      if (col.key === "active") {
        return (
          <div style={{ ...cellBase, justifyContent: "center" }}>
            <button
              onPointerDown={(e) => e.stopPropagation()}
              onClick={() => {
                setOverrides((prev) => {
                  const next = new Map(prev);
                  next.set(row.id, { ...next.get(row.id), active: !row.active });
                  return next;
                });
              }}
              style={{
                background: row.active ? "#dcfce7" : "#f3f4f6",
                color: row.active ? "#15803d" : "#6b7280",
                border: "none",
                borderRadius: 10,
                padding: "2px 10px",
                fontSize: 12,
                fontWeight: 500,
                cursor: "pointer",
              }}
            >
              {row.active ? "Active" : "Inactive"}
            </button>
          </div>
        );
      }

      // Default — plain text (id, name, age)
      return (
        <div
          style={{
            ...cellBase,
            justifyContent: col.align === "right" ? "flex-end" : "flex-start",
            color: "#111827",
          }}
        >
          {display}
        </div>
      );
    },
    [rowModel, sortState, editing, setOverrides, colReorder, colResize],
  );

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

        {overrides.size > 0 && (
          <button
            onClick={() => setOverrides(new Map())}
            style={{
              padding: "4px 10px",
              border: "1px solid #f87171",
              borderRadius: 6,
              fontSize: 12,
              cursor: "pointer",
              background: "#fff",
              color: "#dc2626",
            }}
          >
            Reset edits ({overrides.size})
          </button>
        )}

        {/* ── Column chooser ────────────────────────────────────────────── */}
        <div ref={colChooserRef} style={{ position: "relative" }}>
          <button
            onClick={handleColChooserToggle}
            style={{
              padding: "5px 10px",
              border: "1px solid #d1d5db",
              borderRadius: 6,
              fontSize: 13,
              cursor: "pointer",
              background: colChooserOpen ? "#f5f5f5" : "#fff",
              display: "flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <span>Columns</span>
            <span style={{ fontSize: 10, color: "#6b7280" }}>
              {visibleCols.length}/{COLUMNS.length}
            </span>
            <span style={{ fontSize: 10 }}>{colChooserOpen ? "▲" : "▼"}</span>
          </button>

          {colChooserOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "#fff",
                border: "1px solid #d1d5db",
                borderRadius: 8,
                padding: "6px 0",
                minWidth: 170,
                boxShadow: "0 4px 16px rgba(0,0,0,0.12)",
                zIndex: 200,
              }}
            >
              {COLUMNS.map((col, i) => (
                <label
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "5px 14px",
                    cursor: "pointer",
                    fontSize: 13,
                    color: colVis.isVisible(i) ? "#111827" : "#9ca3af",
                    background: "transparent",
                  }}
                  onMouseEnter={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "#f9fafb")
                  }
                  onMouseLeave={(e) =>
                    ((e.currentTarget as HTMLElement).style.background = "transparent")
                  }
                >
                  <input
                    type="checkbox"
                    checked={colVis.isVisible(i)}
                    onChange={() => colVis.toggleVisibility(i)}
                    style={{ accentColor: "#3b82f6" }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          {rowModel.rowCount.toLocaleString()} / {BASE_DATA.length.toLocaleString()} rows
          &nbsp;·&nbsp;drag header to reorder&nbsp;·&nbsp;drag right edge to resize
          &nbsp;·&nbsp;double-click or F2 to edit
        </span>
      </header>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }}>
        <Grid
          rowCount={totalRows}
          colCount={visibleCols.length}
          headerRowCount={1}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={colSizes}
          overscanPx={200}
          renderCell={renderCell}
          onCellDoubleClick={editing.gridExtension.onCellDoubleClick}
          keyboardExtension={keyboardExtension}
          style={{
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
