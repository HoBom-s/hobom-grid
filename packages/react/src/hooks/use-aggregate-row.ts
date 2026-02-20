import { useCallback, useMemo, useRef } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Built-in aggregation functions. */
export type AggFn = "sum" | "avg" | "count" | "min" | "max";

export type AggColumnDef<TRow> = Readonly<{
  /** Identifier for this aggregation (used to retrieve the result). */
  key: string;
  /** Built-in aggregation function or a custom reducer. */
  fn: AggFn | ((values: unknown[]) => unknown);
  /** Extract the numeric (or arbitrary) value from each row. */
  getValue: (row: TRow) => unknown;
  /** Format the aggregated result for display. */
  format?: (v: unknown) => string;
  /** Label shown in non-numeric columns (e.g. "Total", "Avg"). */
  label?: string;
}>;

export type UseAggregateRowResult = Readonly<{
  /** Get the raw aggregated value for the column identified by `key`. */
  getValue: (key: string) => unknown;
  /**
   * Get the display string for the column identified by `key`.
   * Falls back to `label` if defined, then `String(value ?? "")`.
   */
  getFormatted: (key: string) => string;
}>;

// ---------------------------------------------------------------------------
// Built-in reducers
// ---------------------------------------------------------------------------

const applyAggFn = (fn: AggFn, values: unknown[]): unknown => {
  const nums = values.map((v) => Number(v)).filter((n) => !isNaN(n));
  switch (fn) {
    case "sum":
      return nums.reduce((acc, n) => acc + n, 0);
    case "avg":
      return nums.length > 0 ? nums.reduce((acc, n) => acc + n, 0) / nums.length : 0;
    case "count":
      return values.filter((v) => v != null && v !== "").length;
    case "min":
      return nums.length > 0 ? Math.min(...nums) : undefined;
    case "max":
      return nums.length > 0 ? Math.max(...nums) : undefined;
  }
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Computes aggregate (summary) values over a dataset — suitable for a footer row.
 *
 * ```tsx
 * const agg = useAggregateRow(visibleRows, [
 *   { key: "salary", fn: "sum", getValue: (r) => r.salary, format: (v) => `$${(v as number).toLocaleString()}` },
 *   { key: "age",    fn: "avg", getValue: (r) => r.age,    format: (v) => `Avg ${(v as number).toFixed(1)}` },
 *   { key: "name",   fn: "count", getValue: (r) => r.name, label: "Total" },
 * ]);
 *
 * // In renderCell for the last body row (footer):
 * if (isFooterRow) {
 *   const v = agg.getFormatted(col.key);
 *   return <div style={footerStyle}>{v}</div>;
 * }
 * ```
 */
export const useAggregateRow = <TRow>(
  rows: ReadonlyArray<TRow>,
  columns: ReadonlyArray<AggColumnDef<TRow>>,
): UseAggregateRowResult => {
  // Stable ref so callbacks don't recreate when columns identity changes.
  const columnsRef = useRef(columns);
  // eslint-disable-next-line react-hooks/refs
  columnsRef.current = columns;

  const aggregated = useMemo(() => {
    const result: Record<string, unknown> = {};
    for (const col of columns) {
      const values = rows.map((row) => col.getValue(row));
      result[col.key] = typeof col.fn === "function" ? col.fn(values) : applyAggFn(col.fn, values);
    }
    return result;
  }, [rows, columns]);

  const getValue = useCallback((key: string) => aggregated[key], [aggregated]);

  const getFormatted = useCallback(
    (key: string): string => {
      const col = columnsRef.current.find((c) => c.key === key);
      const v = aggregated[key];
      if (col?.format) return col.format(v);
      if (col?.label != null && (v == null || v === 0)) return col.label;
      return String(v ?? "");
    },
    [aggregated],
  );

  return { getValue, getFormatted };
};
