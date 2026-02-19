import { useMemo } from "react";
import { createClientRowModel } from "@hobom-grid/core";
import type { FilterSpec, RowId, RowModel, SortSpec } from "@hobom-grid/core";

export type UseClientRowModelOpts<TRow> = Readonly<{
  /**
   * Derive a stable row ID.
   * Defaults to the original array index if omitted.
   * Memoize this function (e.g. with useCallback) to avoid unnecessary recalculation.
   */
  getId?: (row: TRow, originalIndex: number) => RowId;

  /**
   * Sort specifications. Applied after filter.
   * Memoize the array (e.g. with useMemo) to avoid unnecessary recalculation.
   */
  sort?: readonly SortSpec<TRow>[];

  /**
   * Filter predicate. Applied before sort.
   * Memoize with useCallback to avoid unnecessary recalculation.
   */
  filter?: FilterSpec<TRow>;
}>;

/**
 * React wrapper around `createClientRowModel`.
 *
 * Recalculates only when `rows`, `opts.sort`, `opts.filter`, or `opts.getId` changes.
 * Consumers should memoize those values to avoid unnecessary work.
 *
 * @example
 * const sort = useMemo(() => [{ key: 'name', direction: 'asc' }], [sortDir]);
 * const filter = useCallback((row) => row.active, []);
 * const rowModel = useClientRowModel(data, { sort, filter, getId: (r) => r.id });
 *
 * <Grid
 *   rowCount={rowModel.rowCount}
 *   colCount={columns.length}
 *   renderCell={(cell) => {
 *     const row = rowModel.getRow(cell.rowIndex);
 *     return <div>{row[columns[cell.colIndex].key]}</div>;
 *   }}
 * />
 */
export const useClientRowModel = <TRow>(
  rows: readonly TRow[],
  opts?: UseClientRowModelOpts<TRow>,
): RowModel<TRow> => {
  const { getId, sort, filter } = opts ?? {};

  return useMemo(
    () => createClientRowModel({ rows, getId, sort, filter }),

    [rows, getId, sort, filter],
  );
};
