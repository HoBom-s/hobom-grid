import type { FilterSpec } from "./row-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FilterColumnType = "text" | "select" | "range" | "custom";

export type FilterColumnDef<TRow> = Readonly<{
  /** Column key — must match a property of TRow. */
  key: string;
  /** Filter UI type. */
  type: FilterColumnType;
  /** For "select" type: available options. */
  options?: readonly string[];
  /** For "custom" type: match predicate. */
  match?: (row: TRow, value: unknown) => boolean;
}>;

export type ColumnFilterState = Readonly<{
  type: FilterColumnType;
  value: unknown;
  active: boolean;
}>;

export type FilterState = Readonly<Record<string, ColumnFilterState>>;

// ---------------------------------------------------------------------------
// Compose
// ---------------------------------------------------------------------------

/**
 * Build a FilterSpec from column definitions and their current filter state.
 *
 * Returns `undefined` when no filters are active (so the pipeline can skip filtering entirely).
 *
 * Filter logic per type:
 * - **text**: case-insensitive substring match
 * - **select**: inclusion in selected values (string[])
 * - **range**: `[min, max]` — either may be `null`/`undefined` to leave one side unbounded
 * - **custom**: delegates to `FilterColumnDef.match(row, value)`
 */
export const composeFilterSpec = <TRow>(
  columnDefs: readonly FilterColumnDef<TRow>[],
  filterState: FilterState,
): FilterSpec<TRow> | undefined => {
  const activeEntries: Array<{
    def: FilterColumnDef<TRow>;
    state: ColumnFilterState;
  }> = [];

  for (const def of columnDefs) {
    const st = filterState[def.key] as ColumnFilterState | undefined;
    if (st?.active) activeEntries.push({ def, state: st });
  }

  if (activeEntries.length === 0) return undefined;

  return (row: TRow) => {
    for (const { def, state } of activeEntries) {
      if (!matchColumn(row, def, state.value)) return false;
    }
    return true;
  };
};

// ---------------------------------------------------------------------------
// Internal matchers
// ---------------------------------------------------------------------------

const matchColumn = <TRow>(row: TRow, def: FilterColumnDef<TRow>, value: unknown): boolean => {
  switch (def.type) {
    case "text":
      return matchText(row as Record<string, unknown>, def.key, value);
    case "select":
      return matchSelect(row as Record<string, unknown>, def.key, value);
    case "range":
      return matchRange(row as Record<string, unknown>, def.key, value);
    case "custom":
      return def.match ? def.match(row, value) : true;
  }
};

const matchText = (row: Record<string, unknown>, key: string, value: unknown): boolean => {
  if (typeof value !== "string" || value === "") return true;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const cellValue = String(row[key] ?? "");
  return cellValue.toLowerCase().includes(value.toLowerCase());
};

const matchSelect = (row: Record<string, unknown>, key: string, value: unknown): boolean => {
  if (!Array.isArray(value) || value.length === 0) return true;
  // eslint-disable-next-line @typescript-eslint/no-base-to-string
  const cellValue = String(row[key] ?? "");
  return (value as string[]).includes(cellValue);
};

const matchRange = (row: Record<string, unknown>, key: string, value: unknown): boolean => {
  if (!Array.isArray(value)) return true;
  const [min, max] = value as [unknown, unknown];
  const cellValue = Number(row[key]);
  if (isNaN(cellValue)) return false;
  if (min != null && cellValue < Number(min)) return false;
  if (max != null && cellValue > Number(max)) return false;
  return true;
};
