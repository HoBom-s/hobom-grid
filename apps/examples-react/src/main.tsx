import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
  Grid,
  useClientRowModel,
  useEditing,
  useClipboard,
  useColumnResize,
  useColumnReorder,
  useColumnVisibility,
  useContextMenu,
  ContextMenu,
  useCsvExport,
  usePagination,
  useFilterUI,
  FilterPopover,
  useColumnBands,
  useGrouping,
  useTreeGrid,
  useServerRowModel,
  useGridStatePersistence,
} from "@hobom-grid/react";
import type { ColumnBandDef, ContextMenuItem } from "@hobom-grid/react";
import type {
  SortSpec,
  CellVM,
  InteractionKernelState,
  FilterColumnDef,
  ColumnFilterState,
  FlatTreeRow,
  TreeNode,
} from "@hobom-grid/core";

// ============================================================================
// Shared data model
// ============================================================================

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
    department: DEPARTMENTS[i % DEPARTMENTS.length],
    role: ROLES[i % ROLES.length],
    salary: 40_000 + ((i * 1_337) % 120_000),
    age: 22 + (i % 43),
    active: i % 7 !== 0,
  }));

const BASE_DATA = generateData(100_000);

// ============================================================================
// Column definitions
// ============================================================================

type ColKey = keyof Employee;

type ColDef = {
  key: ColKey;
  label: string;
  width: number;
  align?: "left" | "right";
  editable?: boolean;
  sortable?: boolean;
  format?: (v: unknown) => string;
  parse?: (raw: string, prev: unknown) => unknown;
};

const COLUMNS: ColDef[] = [
  { key: "id", label: "ID", width: 70, align: "right", sortable: true },
  { key: "name", label: "Name", width: 180, editable: true, sortable: true },
  { key: "department", label: "Department", width: 140, editable: true, sortable: true },
  { key: "role", label: "Role", width: 110, editable: true, sortable: true },
  {
    key: "salary",
    label: "Salary",
    width: 120,
    align: "right",
    editable: true,
    sortable: true,
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
    sortable: true,
    parse: (raw) => Number(raw),
  },
  {
    key: "active",
    label: "Active",
    width: 80,
    format: (v) => (v ? "✓" : "—"),
  },
];

// ============================================================================
// Shared styles + helpers
// ============================================================================

const btnStyle: React.CSSProperties = {
  padding: "5px 10px",
  border: "1px solid #d1d5db",
  borderRadius: 6,
  fontSize: 13,
  cursor: "pointer",
  background: "#fff",
  color: "#374151",
};

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

const bodyCellStyle = (
  col: ColDef,
  dataIndex: number,
  focused: boolean,
  selected: boolean,
): React.CSSProperties => ({
  width: "100%",
  height: "100%",
  display: "flex",
  alignItems: "center",
  paddingInline: 8,
  background: focused ? "#dbeafe" : selected ? "#eff6ff" : dataIndex % 2 !== 0 ? "#fafafa" : "#fff",
  borderBottom: "1px solid #f3f4f6",
  borderRight: "1px solid #f3f4f6",
  fontSize: 13,
  boxSizing: "border-box",
  outline: focused ? "2px solid #3b82f6" : "none",
  outlineOffset: "-2px",
  cursor: col.editable ? "text" : "default",
});

const tabBtnStyle = (active: boolean): React.CSSProperties => ({
  padding: "8px 16px",
  border: "none",
  borderBottom: active ? "2px solid #3b82f6" : "2px solid transparent",
  background: "transparent",
  fontSize: 13,
  fontWeight: active ? 600 : 400,
  color: active ? "#1d4ed8" : "#6b7280",
  cursor: "pointer",
});

// ============================================================================
// Tab 1: Full Demo (기존 기능 + Pagination + Filter UI + Column Bands + Persistence)
// ============================================================================

type SortState = { key: ColKey; direction: "asc" | "desc" } | null;

function FullDemo() {
  const persistence = useGridStatePersistence({ storageKey: "hobom-grid-demo" });

  const [filterText, setFilterText] = useState("");
  const [sortState, setSortState] = useState<SortState>(
    persistence.restoredState?.sort?.[0]
      ? {
          key: persistence.restoredState.sort[0].key as ColKey,
          direction: persistence.restoredState.sort[0].direction,
        }
      : null,
  );
  const [showActiveOnly, setShowActiveOnly] = useState(false);
  const [overrides, setOverrides] = useState<Map<number, Partial<Employee>>>(new Map());
  const [usePaging, setUsePaging] = useState(false);

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

  // ----- Filter UI (column-level) -----
  const filterColumnDefs = useMemo<FilterColumnDef<Employee>[]>(
    () => [
      { key: "name", type: "text" },
      { key: "department", type: "select", options: DEPARTMENTS },
      { key: "role", type: "select", options: ROLES },
      { key: "salary", type: "range" },
      { key: "age", type: "range" },
    ],
    [],
  );
  const filterUI = useFilterUI<Employee>(filterColumnDefs);

  // ----- Data pipeline -----
  const sort = useMemo<SortSpec<Employee>[] | undefined>(
    () => (sortState ? [{ key: sortState.key, direction: sortState.direction }] : undefined),
    [sortState],
  );

  const combinedFilter = useCallback(
    (row: Employee, idx: number) => {
      if (showActiveOnly && !row.active) return false;
      if (filterText.trim() !== "") {
        const q = filterText.toLowerCase();
        if (
          !row.name.toLowerCase().includes(q) &&
          !row.department.toLowerCase().includes(q) &&
          !row.role.toLowerCase().includes(q)
        )
          return false;
      }
      if (filterUI.filterSpec) return filterUI.filterSpec(row, idx);
      return true;
    },
    [filterText, showActiveOnly, filterUI.filterSpec],
  );

  const baseRowModel = useClientRowModel(rows, {
    getId: useCallback((r: Employee) => r.id, []),
    sort,
    filter: combinedFilter,
  });

  // ----- Pagination -----
  const paged = usePagination(baseRowModel, {
    initialPageSize: persistence.restoredState?.pageSize ?? 100,
    initialPage: persistence.restoredState?.page ?? 0,
  });
  const rowModel = usePaging ? paged.rowModel : baseRowModel;

  // ----- Column features -----
  const initialWidths = useMemo(
    () => Object.fromEntries(COLUMNS.map((col, i) => [i, col.width])),
    [],
  );
  const colResize = useColumnResize(
    persistence.restoredState?.colWidths
      ? { ...initialWidths, ...persistence.restoredState.colWidths }
      : initialWidths,
  );
  const colVis = useColumnVisibility(COLUMNS.length);
  const [allColOrder, setAllColOrder] = useState<number[]>(
    () => persistence.restoredState?.colOrder ?? COLUMNS.map((_, i) => i),
  );

  const isVisibleRef = useRef(colVis.isVisible);
  isVisibleRef.current = colVis.isVisible;

  const onReorder = useCallback((fromVisual: number, toVisual: number) => {
    setAllColOrder((prev) => {
      const visCols = prev.filter((i) => isVisibleRef.current(i));
      const fromOrig = visCols[fromVisual];
      const toOrig = visCols[toVisual];
      const fromPos = prev.indexOf(fromOrig);
      const toPos = prev.indexOf(toOrig);
      if (fromPos === -1 || toPos === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromPos, 1);
      next.splice(toPos, 0, moved);
      return next;
    });
  }, []);

  const colReorder = useColumnReorder(onReorder);

  const visibleCols = useMemo(
    () => allColOrder.filter((i) => colVis.isVisible(i)),
    [allColOrder, colVis.isVisible],
  );

  const visibleColsRef = useRef(visibleCols);
  visibleColsRef.current = visibleCols;

  const colSizes = useMemo(
    () =>
      Object.fromEntries(
        visibleCols.map((origIdx, visIdx) => [visIdx, colResize.colWidths[origIdx]]),
      ),
    [visibleCols, colResize.colWidths],
  );

  // ----- Column Bands -----
  const [showBands, setShowBands] = useState(false);
  const bandDefs = useMemo<ColumnBandDef[]>(
    () => [
      { label: "Personal", children: ["Name", "Age"] },
      { label: "Work", children: ["Department", "Role"] },
      { label: "Compensation", children: ["Salary"] },
    ],
    [],
  );
  const visibleColNames = useMemo(() => visibleCols.map((i) => COLUMNS[i].label), [visibleCols]);
  const bands = useColumnBands(showBands ? bandDefs : undefined, colSizes, 120, visibleColNames);

  // ----- Auto-save state -----
  useEffect(() => {
    persistence.autoSave({
      colWidths: colResize.colWidths,
      colOrder: allColOrder,
      sort: sortState ? [{ key: sortState.key, direction: sortState.direction }] : undefined,
      page: paged.currentPage,
      pageSize: paged.pageSize,
    });
  }, [colResize.colWidths, allColOrder, sortState, paged.currentPage, paged.pageSize, persistence]);

  // ----- Column chooser -----
  const [colChooserOpen, setColChooserOpen] = useState(false);
  const colChooserRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!colChooserOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (colChooserRef.current && !colChooserRef.current.contains(e.target as Node)) {
        setColChooserOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [colChooserOpen]);

  // ----- Ecosystem -----
  const contextMenu = useContextMenu();
  const csvExport = useCsvExport<Employee>({
    columns: useMemo(
      () =>
        visibleCols.map((origIdx) => {
          const col = COLUMNS[origIdx];
          const fmt = col.format;
          return {
            label: col.label,
            getValue: (row: Employee) => row[col.key],
            formatValue: fmt ? (v: unknown) => fmt(v) : undefined,
          };
        }),
      [visibleCols],
    ),
  });

  // ----- Value access -----
  const interactionStateRef = useRef<InteractionKernelState | null>(null);

  const getValue = useCallback(
    (row: number, col: number): unknown => {
      const origIdx = visibleColsRef.current[col];
      const headerRows = bands.headerRowCount;
      if (row < headerRows) return COLUMNS[origIdx].label;
      const dataIndex = row - headerRows;
      const employee = rowModel.getRow(dataIndex);
      return employee[COLUMNS[origIdx].key];
    },
    [rowModel, bands.headerRowCount],
  );

  // ----- Editing -----
  const stableInteractionState = useMemo(
    () =>
      new Proxy({} as InteractionKernelState, {
        get(_t, prop) {
          return interactionStateRef.current?.[prop as keyof InteractionKernelState];
        },
      }),
    [],
  );

  const editing = useEditing(
    {
      getValue,
      isEditable: (row, col) => {
        const origIdx = visibleColsRef.current[col];
        return row >= bands.headerRowCount && COLUMNS[origIdx].editable === true;
      },
      validate: (value, { col }) => {
        const origIdx = visibleColsRef.current[col];
        const colDef = COLUMNS[origIdx];
        if (!colDef.editable) return { valid: true };
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
        const origIdx = visibleColsRef.current[col];
        const dataIndex = row - bands.headerRowCount;
        const employee = rowModel.getRow(dataIndex);
        const colDef = COLUMNS[origIdx];
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

  // ----- Clipboard -----
  const clipboard = useClipboard(
    {
      getValue,
      formatValue: (v, _r, col) => {
        const origIdx = visibleColsRef.current[col];
        const colDef = COLUMNS[origIdx];
        // eslint-disable-next-line @typescript-eslint/no-base-to-string
        return colDef.format ? colDef.format(v) : String(v ?? "");
      },
      onPaste: (changes) => {
        const updates = new Map<number, Partial<Employee>>();
        for (const { row, col, value } of changes) {
          if (row < bands.headerRowCount) continue;
          const dataIndex = row - bands.headerRowCount;
          if (dataIndex >= rowModel.rowCount) continue;
          const employee = rowModel.getRow(dataIndex);
          const origIdx = visibleColsRef.current[col];
          const colDef = COLUMNS[origIdx];
          if (!colDef.editable) continue;
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

  const keyboardExtension = useMemo(
    () => ({
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        editing.gridExtension.keyboardExtension.onKeyDown(e);
        clipboard.onKeyDown(e);
      },
    }),
    [editing.gridExtension.keyboardExtension.onKeyDown, clipboard.onKeyDown],
  );

  // ----- Stable refs -----
  const sortStateRef = useRef(sortState);
  sortStateRef.current = sortState;
  const rowModelRef = useRef(rowModel);
  rowModelRef.current = rowModel;
  const clipboardRef = useRef(clipboard);
  clipboardRef.current = clipboard;
  const colVisRef = useRef(colVis);
  colVisRef.current = colVis;
  const colResizeRef = useRef(colResize);
  colResizeRef.current = colResize;

  // ----- Cell renderer -----
  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      interactionStateRef.current = interactionState;
      const origIdx = visibleColsRef.current[cell.colIndex];
      const col = COLUMNS[origIdx];
      const isDragging = colReorder.dragState?.fromVisual === cell.colIndex;
      const isDropTarget = colReorder.dragState?.overVisual === cell.colIndex;

      // ----- Band header rows -----
      if (bands.headerRowCount > 1 && cell.rowIndex < bands.headerRowCount - 1) {
        const bandCell = bands.getBandCell(cell.rowIndex, cell.colIndex);
        if (bandCell && bandCell.isFirst) {
          return (
            <div
              style={{
                width: bandCell.spanWidthPx,
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#e8edf3",
                borderBottom: "1px solid #d1d5db",
                borderRight: "1px solid #d1d5db",
                fontWeight: 600,
                fontSize: 12,
                color: "#475569",
                letterSpacing: "0.05em",
                textTransform: "uppercase",
                boxSizing: "border-box",
              }}
            >
              {bandCell.label}
            </div>
          );
        }
        // Non-first band cells render empty (spanned over by the first cell)
        return null;
      }

      // ----- Column header row -----
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        colReorder.reportColBounds(cell.colIndex, cell.x, cell.width);
        const isSorted = sortState != null && sortState.key === col.key;
        const nextDir = isSorted && sortState.direction === "asc" ? "desc" : "asc";

        const handleHeaderContextMenu = (e: React.MouseEvent) => {
          e.preventDefault();
          e.stopPropagation();
          const ss = sortStateRef.current;
          const cv = colVisRef.current;
          const cr = colResizeRef.current;
          const items: ContextMenuItem[] = [
            { kind: "label", text: "Sort" },
            {
              kind: "action",
              label: "Sort A → Z",
              icon: "↑",
              disabled: ss?.key === col.key && ss.direction === "asc",
              onSelect: () => {
                setSortState({ key: col.key, direction: "asc" });
              },
            },
            {
              kind: "action",
              label: "Sort Z → A",
              icon: "↓",
              disabled: ss?.key === col.key && ss.direction === "desc",
              onSelect: () => {
                setSortState({ key: col.key, direction: "desc" });
              },
            },
            {
              kind: "action",
              label: "Clear Sort",
              icon: "✕",
              disabled: ss?.key !== col.key,
              onSelect: () => {
                setSortState(null);
              },
            },
            { kind: "separator" },
            { kind: "label", text: "Filter" },
            {
              kind: "action",
              label: "Filter Column…",
              icon: "🔍",
              onSelect: () => {
                filterUI.openPopover(col.key, e.clientX, e.clientY);
              },
            },
            { kind: "separator" },
            { kind: "label", text: "Column" },
            {
              kind: "action",
              label: "Hide Column",
              icon: "🙈",
              onSelect: () => {
                cv.toggleVisibility(origIdx);
              },
            },
            {
              kind: "action",
              label: "Show All Columns",
              icon: "👁",
              disabled: cv.hiddenCount === 0,
              onSelect: () => {
                cv.showAll();
              },
            },
            { kind: "separator" },
            {
              kind: "action",
              label: "Reset Width",
              icon: "↔",
              onSelect: () => {
                cr.resetWidth(origIdx);
              },
            },
          ];
          contextMenu.openMenu(e.clientX, e.clientY, items);
        };

        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              position: "relative",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              paddingRight: 14,
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
              transition: "background 0.1s",
            }}
            onPointerDown={(e) => {
              const containerLeft = e.currentTarget.getBoundingClientRect().left - cell.x;
              colReorder.startReorder(
                cell.colIndex,
                e.clientX,
                containerLeft,
                visibleColsRef.current.length,
              );
              e.stopPropagation();
            }}
            onClick={() => {
              setSortState({ key: col.key, direction: nextDir });
            }}
            onContextMenu={handleHeaderContextMenu}
          >
            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {col.label}
            </span>
            {isSorted && (
              <span style={{ fontSize: 10, color: "#6b7280", flexShrink: 0 }}>
                {sortState.direction === "asc" ? "▲" : "▼"}
              </span>
            )}
            {col.key in filterUI.filterState && (
              <span style={{ fontSize: 10, color: "#3b82f6", flexShrink: 0 }}>●</span>
            )}
            <div
              style={{
                position: "absolute",
                right: 0,
                top: 0,
                bottom: 0,
                width: 6,
                cursor: "col-resize",
                zIndex: 1,
              }}
              onPointerDown={(e) => {
                colResize.startResize(origIdx, e);
                e.stopPropagation();
                e.preventDefault();
              }}
              onClick={(e) => {
                e.stopPropagation();
              }}
              onContextMenu={(e) => {
                e.stopPropagation();
                handleHeaderContextMenu(e);
              }}
            />
          </div>
        );
      }

      // ----- Body -----
      const dataIndex = cell.rowIndex - bands.headerRowCount;
      if (dataIndex < 0 || dataIndex >= rowModel.rowCount) return null;

      const row = rowModel.getRow(dataIndex);
      const selected = isCellSelected(interactionState, cell.rowIndex, cell.colIndex);
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const isEditingCell = editing.isEditing(cell.rowIndex, cell.colIndex);
      const hasError =
        isEditingCell && editing.editingState.activeEdit?.validationState === "invalid";
      const errMsg = isEditingCell ? editing.editingState.activeEdit?.validationMessage : undefined;

      const rawValue = row[col.key];
      const display = col.format ? col.format(rawValue) : String(rawValue);

      if (isEditingCell && col.editable) {
        return (
          <div style={{ width: "100%", height: "100%", position: "relative" }}>
            <input
              autoFocus
              // eslint-disable-next-line @typescript-eslint/no-base-to-string
              defaultValue={String(editing.editValue ?? rawValue)}
              onChange={(e) => {
                editing.setEditValue(e.target.value);
              }}
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

      const cellBase = bodyCellStyle(col, dataIndex, focused, selected);

      if (col.key === "department") {
        const icon = DEPT_ICON[row.department] ?? "🏢";
        return (
          <div style={{ ...cellBase, gap: 6 }}>
            <span style={{ fontSize: 15, lineHeight: 1 }}>{icon}</span>
            <span style={{ color: "#111827" }}>{row.department}</span>
          </div>
        );
      }
      if (col.key === "role") {
        const roleStyle = ROLE_STYLE[row.role] ?? {};
        return (
          <div style={cellBase}>
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
      if (col.key === "active") {
        return (
          <div style={{ ...cellBase, justifyContent: "center" }}>
            <button
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
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
    [
      rowModel,
      sortState,
      editing,
      setOverrides,
      colReorder,
      colResize,
      contextMenu.openMenu,
      bands,
      filterUI,
    ],
  );

  const handleExportCsv = useCallback(() => {
    const exportRows = Array.from({ length: rowModel.rowCount }, (_, i) => rowModel.getRow(i));
    csvExport.exportCsv(exportRows, "employees.csv");
  }, [rowModel, csvExport]);

  // ----- Filter popover content -----
  const renderFilterPopoverContent = () => {
    if (!filterUI.popover) return null;
    const colKey = filterUI.popover.columnKey;
    const def = filterColumnDefs.find((d) => d.key === colKey);
    if (!def) return null;
    const currentState = (filterUI.filterState as Partial<Record<string, ColumnFilterState>>)[
      colKey
    ];

    if (def.type === "text") {
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Filter: {colKey}
          </label>
          <input
            autoFocus
            placeholder="Type to filter…"
            defaultValue={currentState ? String(currentState.value) : ""}
            onChange={(e) => {
              if (e.target.value) filterUI.setFilter(colKey, e.target.value);
              else filterUI.clearFilter(colKey);
            }}
            style={{
              padding: "4px 8px",
              border: "1px solid #d1d5db",
              borderRadius: 4,
              fontSize: 13,
            }}
          />
          <button
            onClick={() => {
              filterUI.clearFilter(colKey);
              filterUI.closePopover();
            }}
            style={{ ...btnStyle, fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      );
    }

    if (def.type === "select" && def.options) {
      const selected = currentState ? (currentState.value as string[]) : [];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Filter: {colKey}
          </label>
          {def.options.map((opt) => (
            <label
              key={opt}
              style={{
                fontSize: 13,
                display: "flex",
                gap: 6,
                alignItems: "center",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={selected.includes(opt)}
                onChange={() => {
                  const next = selected.includes(opt)
                    ? selected.filter((s) => s !== opt)
                    : [...selected, opt];
                  if (next.length > 0) filterUI.setFilter(colKey, next);
                  else filterUI.clearFilter(colKey);
                }}
              />
              {opt}
            </label>
          ))}
          <button
            onClick={() => {
              filterUI.clearFilter(colKey);
              filterUI.closePopover();
            }}
            style={{ ...btnStyle, fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      );
    }

    if (def.type === "range") {
      const [min, max] = currentState
        ? (currentState.value as [number | null, number | null])
        : [null, null];
      return (
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <label style={{ fontSize: 12, fontWeight: 600, color: "#374151" }}>
            Filter: {colKey}
          </label>
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              placeholder="Min"
              defaultValue={min ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                filterUI.setFilter(colKey, [v, max]);
              }}
              style={{
                width: 80,
                padding: "4px 6px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
              }}
            />
            <span>–</span>
            <input
              type="number"
              placeholder="Max"
              defaultValue={max ?? ""}
              onChange={(e) => {
                const v = e.target.value ? Number(e.target.value) : null;
                filterUI.setFilter(colKey, [min, v]);
              }}
              style={{
                width: 80,
                padding: "4px 6px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
              }}
            />
          </div>
          <button
            onClick={() => {
              filterUI.clearFilter(colKey);
              filterUI.closePopover();
            }}
            style={{ ...btnStyle, fontSize: 12 }}
          >
            Clear
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      {/* Toolbar */}
      <header
        style={{
          padding: "10px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 10,
          flexShrink: 0,
          flexWrap: "wrap",
        }}
      >
        <input
          type="text"
          placeholder="Search name / dept / role…"
          value={filterText}
          onChange={(e) => {
            setFilterText(e.target.value);
          }}
          style={{
            padding: "5px 10px",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            fontSize: 13,
            width: 220,
            outline: "none",
          }}
        />
        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={showActiveOnly}
            onChange={(e) => {
              setShowActiveOnly(e.target.checked);
            }}
          />
          Active only
        </label>

        {filterUI.activeFilterCount > 0 && (
          <button
            onClick={() => {
              filterUI.clearAllFilters();
            }}
            style={{ ...btnStyle, color: "#3b82f6", borderColor: "#93c5fd" }}
          >
            Clear {filterUI.activeFilterCount} filter{filterUI.activeFilterCount > 1 ? "s" : ""} ✕
          </button>
        )}

        {sortState && (
          <button
            onClick={() => {
              setSortState(null);
            }}
            style={btnStyle}
          >
            Clear sort ×
          </button>
        )}
        {overrides.size > 0 && (
          <button
            onClick={() => {
              setOverrides(new Map());
            }}
            style={{ ...btnStyle, borderColor: "#f87171", color: "#dc2626" }}
          >
            Reset edits ({overrides.size})
          </button>
        )}

        {/* Pagination toggle */}
        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={usePaging}
            onChange={(e) => {
              setUsePaging(e.target.checked);
            }}
          />
          Paging
        </label>

        {/* Band toggle */}
        <label
          style={{ fontSize: 13, display: "flex", alignItems: "center", gap: 6, cursor: "pointer" }}
        >
          <input
            type="checkbox"
            checked={showBands}
            onChange={(e) => {
              setShowBands(e.target.checked);
            }}
          />
          Bands
        </label>

        {/* Column chooser */}
        <div ref={colChooserRef} style={{ position: "relative" }}>
          <button
            onClick={() => {
              setColChooserOpen((v) => !v);
            }}
            style={{ ...btnStyle, display: "flex", alignItems: "center", gap: 4 }}
          >
            <span>Columns</span>
            <span style={{ fontSize: 11, color: "#6b7280" }}>
              {visibleCols.length}/{COLUMNS.length}
            </span>
          </button>
          {colChooserOpen && (
            <div
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                background: "#fff",
                border: "1px solid #e5e7eb",
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
                    onChange={() => {
                      colVis.toggleVisibility(i);
                    }}
                    style={{ accentColor: "#3b82f6" }}
                  />
                  {col.label}
                </label>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleExportCsv} style={btnStyle}>
          Export CSV ↓
        </button>
        <button
          onClick={() => {
            persistence.clear();
          }}
          style={{ ...btnStyle, fontSize: 12, color: "#6b7280" }}
        >
          Clear saved state
        </button>

        <span style={{ marginLeft: "auto", fontSize: 12, color: "#6b7280" }}>
          {(usePaging ? paged.rowModel.rowCount : rowModel.rowCount).toLocaleString()} /{" "}
          {BASE_DATA.length.toLocaleString()} rows
        </span>
      </header>

      {/* Grid */}
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }}>
        <Grid
          rowCount={rowModel.rowCount}
          colCount={visibleCols.length}
          headerRowCount={bands.headerRowCount}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={colSizes}
          overscanPx={200}
          renderCell={renderCell}
          onCellDoubleClick={editing.gridExtension.onCellDoubleClick}
          keyboardExtension={keyboardExtension}
          style={{
            height: usePaging ? "calc(100% - 44px)" : "100%",
            border: "1px solid #d1d5db",
            borderRadius: 6,
            background: "#fff",
          }}
        />

        {/* Pagination bar */}
        {usePaging && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "8px 0",
              fontSize: 13,
              color: "#374151",
            }}
          >
            <button onClick={paged.goFirst} disabled={!paged.canGoPrev} style={btnStyle}>
              «
            </button>
            <button onClick={paged.goPrev} disabled={!paged.canGoPrev} style={btnStyle}>
              ‹
            </button>
            <span>
              Page {paged.currentPage + 1} / {paged.totalPages}
            </span>
            <button onClick={paged.goNext} disabled={!paged.canGoNext} style={btnStyle}>
              ›
            </button>
            <button onClick={paged.goLast} disabled={!paged.canGoNext} style={btnStyle}>
              »
            </button>
            <select
              value={paged.pageSize}
              onChange={(e) => {
                paged.setPageSize(Number(e.target.value));
              }}
              style={{
                padding: "4px 8px",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                fontSize: 13,
              }}
            >
              {[20, 50, 100, 200, 500].map((s) => (
                <option key={s} value={s}>
                  {s} rows/page
                </option>
              ))}
            </select>
            <span style={{ color: "#6b7280" }}>({paged.totalRows.toLocaleString()} total)</span>
          </div>
        )}
      </div>

      <ContextMenu state={contextMenu.menuState} onClose={contextMenu.closeMenu} />
      <FilterPopover state={filterUI.popover} onClose={filterUI.closePopover}>
        {renderFilterPopoverContent()}
      </FilterPopover>
    </div>
  );
}

// ============================================================================
// Tab 2: Grouping Demo
// ============================================================================

const SMALL_DATA = generateData(500);

function GroupingDemo() {
  const source = useClientRowModel(SMALL_DATA, {
    getId: useCallback((r: Employee) => r.id, []),
  });

  const grouping = useGrouping(source, {
    groupBy: useMemo(
      () => [
        {
          getGroupValue: (r: Employee) => r.department,
          aggregates: [
            { key: "count", fn: (rows: readonly Employee[]) => rows.length },
            {
              key: "avgSalary",
              fn: (rows: readonly Employee[]) =>
                Math.round(rows.reduce((s, r) => s + r.salary, 0) / rows.length),
            },
          ],
        },
        { getGroupValue: (r: Employee) => r.role },
      ],
      [],
    ),
    getId: useCallback((r: Employee) => r.id, []),
  });

  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        const labels = ["", "Name", "Department", "Role", "Salary", "Count"];
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              background: "#f5f5f5",
              borderBottom: "2px solid #d1d5db",
              fontWeight: 600,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          >
            {labels[cell.colIndex] ?? ""}
          </div>
        );
      }

      const dataIndex = cell.rowIndex - 1;
      if (dataIndex < 0 || dataIndex >= grouping.rowModel.rowCount) return null;

      const row = grouping.rowModel.getRow(dataIndex);
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const bg = focused ? "#dbeafe" : dataIndex % 2 !== 0 ? "#fafafa" : "#fff";

      if (row.type === "group") {
        if (cell.colIndex === 0) {
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                paddingLeft: 8 + row.depth * 20,
                background: "#f0f9ff",
                borderBottom: "1px solid #e0e7ff",
                fontWeight: 600,
                fontSize: 13,
                cursor: "pointer",
                boxSizing: "border-box",
                gap: 6,
              }}
              onPointerDown={(e) => {
                e.stopPropagation();
              }}
              onClick={() => {
                grouping.toggleGroup(row.key);
              }}
            >
              <span style={{ fontSize: 10, color: "#6b7280" }}>{row.isExpanded ? "▼" : "▶"}</span>
              <span>{String(row.groupValue)}</span>
              <span style={{ fontSize: 11, color: "#6b7280", fontWeight: 400 }}>({row.count})</span>
            </div>
          );
        }
        if (cell.colIndex === 4 && row.aggregates) {
          return (
            <div
              style={{
                width: "100%",
                height: "100%",
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                paddingInline: 8,
                background: "#f0f9ff",
                borderBottom: "1px solid #e0e7ff",
                fontSize: 12,
                color: "#6b7280",
                boxSizing: "border-box",
              }}
            >
              avg ${(row.aggregates.avgSalary as number).toLocaleString()}
            </div>
          );
        }
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#f0f9ff",
              borderBottom: "1px solid #e0e7ff",
              boxSizing: "border-box",
            }}
          />
        );
      }

      // data row
      const emp = row.row;
      const values = [
        emp.id,
        emp.name,
        emp.department,
        emp.role,
        `$${emp.salary.toLocaleString()}`,
        "",
      ];
      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            paddingLeft: cell.colIndex === 0 ? 8 + row.depth * 20 : 8,
            paddingRight: 8,
            background: bg,
            borderBottom: "1px solid #f3f4f6",
            fontSize: 13,
            boxSizing: "border-box",
            justifyContent: cell.colIndex === 4 ? "flex-end" : "flex-start",
          }}
        >
          {values[cell.colIndex] ?? ""}
        </div>
      );
    },
    [grouping],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header
        style={{
          padding: "10px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: 14 }}>Grouping Demo</strong>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          500 employees grouped by Department → Role
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              grouping.expandAll();
            }}
            style={btnStyle}
          >
            Expand All
          </button>
          <button
            onClick={() => {
              grouping.collapseAll();
            }}
            style={btnStyle}
          >
            Collapse All
          </button>
        </div>
      </header>
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }}>
        <Grid
          rowCount={grouping.rowModel.rowCount}
          colCount={6}
          headerRowCount={1}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={{ 0: 250, 1: 150, 2: 130, 3: 100, 4: 120, 5: 60 }}
          renderCell={renderCell}
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

// ============================================================================
// Tab 3: Tree Grid Demo
// ============================================================================

type FileNode = { id: string; name: string; type: "folder" | "file"; size?: number };

const FILE_TREE: TreeNode<FileNode>[] = [
  {
    row: { id: "src", name: "src", type: "folder" },
    children: [
      {
        row: { id: "src/components", name: "components", type: "folder" },
        children: [
          { row: { id: "src/components/Grid.tsx", name: "Grid.tsx", type: "file", size: 12400 } },
          { row: { id: "src/components/Cell.tsx", name: "Cell.tsx", type: "file", size: 3200 } },
          {
            row: { id: "src/components/Header.tsx", name: "Header.tsx", type: "file", size: 2800 },
          },
        ],
      },
      {
        row: { id: "src/hooks", name: "hooks", type: "folder" },
        children: [
          { row: { id: "src/hooks/useGrid.ts", name: "useGrid.ts", type: "file", size: 8900 } },
          { row: { id: "src/hooks/useSort.ts", name: "useSort.ts", type: "file", size: 2100 } },
          { row: { id: "src/hooks/useFilter.ts", name: "useFilter.ts", type: "file", size: 3400 } },
        ],
      },
      { row: { id: "src/index.ts", name: "index.ts", type: "file", size: 450 } },
      { row: { id: "src/types.ts", name: "types.ts", type: "file", size: 1200 } },
    ],
  },
  {
    row: { id: "tests", name: "tests", type: "folder" },
    children: [
      { row: { id: "tests/grid.spec.ts", name: "grid.spec.ts", type: "file", size: 5600 } },
      { row: { id: "tests/hooks.spec.ts", name: "hooks.spec.ts", type: "file", size: 4200 } },
    ],
  },
  { row: { id: "package.json", name: "package.json", type: "file", size: 890 } },
  { row: { id: "tsconfig.json", name: "tsconfig.json", type: "file", size: 320 } },
  { row: { id: "README.md", name: "README.md", type: "file", size: 2400 } },
];

function TreeDemo() {
  const tree = useTreeGrid(
    FILE_TREE,
    useCallback((r: FileNode) => r.id, []),
  );

  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        const labels = ["Name", "Type", "Size"];
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              background: "#f5f5f5",
              borderBottom: "2px solid #d1d5db",
              fontWeight: 600,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          >
            {labels[cell.colIndex] ?? ""}
          </div>
        );
      }

      const dataIndex = cell.rowIndex - 1;
      if (dataIndex < 0 || dataIndex >= tree.rowModel.rowCount) return null;

      const row = tree.rowModel.getRow(dataIndex) as FlatTreeRow<FileNode>;
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const bg = focused ? "#dbeafe" : dataIndex % 2 !== 0 ? "#fafafa" : "#fff";

      if (cell.colIndex === 0) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingLeft: 8 + row.depth * 20,
              background: bg,
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13,
              cursor: row.hasChildren ? "pointer" : "default",
              boxSizing: "border-box",
              gap: 6,
              outline: focused ? "2px solid #3b82f6" : "none",
              outlineOffset: "-2px",
            }}
            onPointerDown={(e) => {
              e.stopPropagation();
            }}
            onClick={() => {
              if (row.hasChildren) tree.toggleNode(row.nodeId);
            }}
          >
            {row.hasChildren && (
              <span style={{ fontSize: 10, color: "#6b7280", width: 12 }}>
                {row.isExpanded ? "▼" : "▶"}
              </span>
            )}
            {!row.hasChildren && <span style={{ width: 12 }} />}
            <span style={{ fontSize: 14 }}>{row.row.type === "folder" ? "📁" : "📄"}</span>
            <span>{row.row.name}</span>
          </div>
        );
      }
      if (cell.colIndex === 1) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              background: bg,
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13,
              boxSizing: "border-box",
              color: "#6b7280",
            }}
          >
            {row.row.type}
          </div>
        );
      }
      if (cell.colIndex === 2) {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              paddingInline: 8,
              background: bg,
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13,
              boxSizing: "border-box",
              color: "#6b7280",
            }}
          >
            {row.row.size ? `${(row.row.size / 1024).toFixed(1)} KB` : "—"}
          </div>
        );
      }
      return null;
    },
    [tree],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header
        style={{
          padding: "10px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: 14 }}>Tree Grid Demo</strong>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          File browser — click folders to expand/collapse
        </span>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <button
            onClick={() => {
              tree.expandAll();
            }}
            style={btnStyle}
          >
            Expand All
          </button>
          <button
            onClick={() => {
              tree.collapseAll();
            }}
            style={btnStyle}
          >
            Collapse All
          </button>
        </div>
      </header>
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }}>
        <Grid
          rowCount={tree.rowModel.rowCount}
          colCount={3}
          headerRowCount={1}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={{ 0: 350, 1: 80, 2: 100 }}
          renderCell={renderCell}
          keyboardExtension={tree.keyboardExtension}
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

// ============================================================================
// Tab 4: Server-side Demo
// ============================================================================

const SERVER_DATA = generateData(10_000);

function ServerDemo() {
  const mockFetch = useCallback(
    (query: {
      offset: number;
      limit: number;
    }): Promise<{ rows: Employee[]; totalCount: number }> => {
      return new Promise((resolve) => {
        setTimeout(
          () => {
            const rows = SERVER_DATA.slice(query.offset, query.offset + query.limit);
            resolve({ rows, totalCount: SERVER_DATA.length });
          },
          200 + Math.random() * 300,
        ); // simulate network latency
      });
    },
    [],
  );

  const server = useServerRowModel<Employee>({
    fetchRows: mockFetch,
    getId: useCallback((r: Employee) => r.id, []),
    pageSize: 100,
    prefetchBuffer: 50,
  });

  const renderCell = useCallback(
    (cell: CellVM, { interactionState }: { interactionState: InteractionKernelState }) => {
      if (cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd") {
        const labels = ["ID", "Name", "Department", "Role", "Salary"];
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              background: "#f5f5f5",
              borderBottom: "2px solid #d1d5db",
              fontWeight: 600,
              fontSize: 13,
              boxSizing: "border-box",
            }}
          >
            {labels[cell.colIndex] ?? ""}
          </div>
        );
      }

      const dataIndex = cell.rowIndex - 1;
      if (dataIndex < 0 || dataIndex >= server.rowModel.rowCount) return null;

      const serverRow = server.rowModel.getRow(dataIndex);
      const focused = isCellFocused(interactionState, cell.rowIndex, cell.colIndex);
      const bg = focused ? "#dbeafe" : dataIndex % 2 !== 0 ? "#fafafa" : "#fff";

      if (serverRow.type === "loading") {
        return (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              paddingInline: 8,
              background: bg,
              borderBottom: "1px solid #f3f4f6",
              fontSize: 13,
              color: "#9ca3af",
              boxSizing: "border-box",
            }}
          >
            {cell.colIndex === 0 ? "Loading…" : ""}
          </div>
        );
      }

      const emp = serverRow.row;
      const values = [
        String(emp.id),
        emp.name,
        emp.department,
        emp.role,
        `$${emp.salary.toLocaleString()}`,
      ];

      return (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            paddingInline: 8,
            background: bg,
            borderBottom: "1px solid #f3f4f6",
            fontSize: 13,
            boxSizing: "border-box",
            justifyContent: cell.colIndex === 0 || cell.colIndex === 4 ? "flex-end" : "flex-start",
          }}
        >
          {values[cell.colIndex] ?? ""}
        </div>
      );
    },
    [server.rowModel],
  );

  // Request visible range on scroll
  const handleScroll = useCallback(
    (e: React.UIEvent<HTMLDivElement>) => {
      const el = e.currentTarget;
      const scrollTop = el.scrollTop;
      const viewHeight = el.clientHeight;
      const rowHeight = 32;
      const startRow = Math.floor(scrollTop / rowHeight);
      const endRow = Math.ceil((scrollTop + viewHeight) / rowHeight);
      server.requestVisibleRange(startRow, endRow);
    },
    [server],
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <header
        style={{
          padding: "10px 16px",
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          display: "flex",
          alignItems: "center",
          gap: 12,
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: 14 }}>Server-side Demo</strong>
        <span style={{ fontSize: 12, color: "#6b7280" }}>
          {server.totalCount.toLocaleString()} rows from mock server (200-500ms latency)
        </span>
        {server.isLoading && <span style={{ fontSize: 12, color: "#f59e0b" }}>Loading…</span>}
        {server.error && (
          <span style={{ fontSize: 12, color: "#ef4444" }}>Error: {server.error.message}</span>
        )}
        <button
          onClick={() => {
            server.refresh();
          }}
          style={{ ...btnStyle, marginLeft: "auto" }}
        >
          Refresh
        </button>
      </header>
      <div style={{ flex: 1, overflow: "hidden", padding: 12 }} onScroll={handleScroll}>
        <Grid
          rowCount={server.totalCount}
          colCount={5}
          headerRowCount={1}
          defaultRowHeight={32}
          defaultColWidth={120}
          colSizes={{ 0: 70, 1: 180, 2: 140, 3: 110, 4: 120 }}
          renderCell={renderCell}
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

// ============================================================================
// App — Tab Container
// ============================================================================

type TabId = "full" | "grouping" | "tree" | "server";

function App() {
  const [activeTab, setActiveTab] = useState<TabId>("full");

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
      {/* Tab bar */}
      <nav
        style={{
          display: "flex",
          alignItems: "center",
          gap: 0,
          background: "#fff",
          borderBottom: "1px solid #e5e7eb",
          paddingInline: 16,
          flexShrink: 0,
        }}
      >
        <strong style={{ fontSize: 15, marginRight: 16, color: "#111827" }}>hobom-grid</strong>
        <button
          style={tabBtnStyle(activeTab === "full")}
          onClick={() => {
            setActiveTab("full");
          }}
        >
          Data Grid
        </button>
        <button
          style={tabBtnStyle(activeTab === "grouping")}
          onClick={() => {
            setActiveTab("grouping");
          }}
        >
          Grouping
        </button>
        <button
          style={tabBtnStyle(activeTab === "tree")}
          onClick={() => {
            setActiveTab("tree");
          }}
        >
          Tree Grid
        </button>
        <button
          style={tabBtnStyle(activeTab === "server")}
          onClick={() => {
            setActiveTab("server");
          }}
        >
          Server-side
        </button>
      </nav>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: "hidden" }}>
        {activeTab === "full" && <FullDemo />}
        {activeTab === "grouping" && <GroupingDemo />}
        {activeTab === "tree" && <TreeDemo />}
        {activeTab === "server" && <ServerDemo />}
      </div>
    </div>
  );
}

const root = document.getElementById("root");
if (root) {
  ReactDOM.createRoot(root).render(
    <React.StrictMode>
      <App />
    </React.StrictMode>,
  );
}
