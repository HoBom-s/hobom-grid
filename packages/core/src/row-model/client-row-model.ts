import type { FilterSpec, RowId, RowModel, SortSpec } from "./row-model";

type ClientRowModelSpec<TRow> = Readonly<{
  rows: readonly TRow[];

  /**
   * Derive a stable ID from a row.
   * Defaults to the row's original (pre-filter/sort) array index.
   */
  getId?: (row: TRow, originalIndex: number) => RowId;

  /** Sort specifications (applied after filter). */
  sort?: readonly SortSpec<TRow>[];

  /** Filter predicate (applied before sort). */
  filter?: FilterSpec<TRow>;
}>;

/** Default comparator: numeric for numbers, localeCompare otherwise. */
const defaultCompare = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a == null) return -1;
  if (b == null) return 1;
  if (typeof a === "number" && typeof b === "number") return a - b;
  return String(a).localeCompare(String(b));
};

/**
 * Build a client-side RowModel from an in-memory array.
 *
 * Processing order: filter → sort → index mapping
 *
 * @example
 * const model = createClientRowModel({
 *   rows: data,
 *   getId: (row) => row.id,
 *   filter: (row) => row.active,
 *   sort: [{ key: 'name', direction: 'asc' }],
 * });
 *
 * model.rowCount     // filtered + sorted count
 * model.getRow(0)    // first visible row
 * model.getRowId(0)  // stable ID of first visible row
 */
export const createClientRowModel = <TRow>(spec: ClientRowModelSpec<TRow>): RowModel<TRow> => {
  const { rows, getId, sort, filter } = spec;

  // ---- 1. Filter ----
  type Indexed = { originalIndex: number; row: TRow };

  let pipeline: Indexed[];

  if (filter) {
    pipeline = [];
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i] as TRow;
      if (filter(row, i)) pipeline.push({ originalIndex: i, row });
    }
  } else {
    pipeline = Array.from({ length: rows.length }, (_, i) => ({
      originalIndex: i,
      row: rows[i] as TRow,
    }));
  }

  // ---- 2. Sort ----
  if (sort && sort.length > 0) {
    pipeline = pipeline.slice().sort((a, b) => {
      for (const s of sort) {
        const av = a.row[s.key];
        const bv = b.row[s.key];
        const cmp = (s.compare ?? defaultCompare)(av, bv);
        if (cmp !== 0) return s.direction === "asc" ? cmp : -cmp;
      }
      return 0;
    });
  }

  // ---- 3. Build ID index ----
  const rowIds: RowId[] = new Array(pipeline.length);
  const idToVirtual = new Map<RowId, number>();

  for (let vi = 0; vi < pipeline.length; vi++) {
    const { row, originalIndex } = pipeline[vi]!;
    const id: RowId = getId ? getId(row, originalIndex) : originalIndex;
    rowIds[vi] = id;
    idToVirtual.set(id, vi);
  }

  const rowCount = pipeline.length;

  const getRow = (virtualIndex: number): TRow => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(`RowModel.getRow: index ${virtualIndex} out of range [0, ${rowCount})`);
    }
    return pipeline[virtualIndex]!.row;
  };

  const getRowId = (virtualIndex: number): RowId => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `RowModel.getRowId: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    return rowIds[virtualIndex]!;
  };

  const findVirtualIndex = (id: RowId): number | null => {
    const vi = idToVirtual.get(id);
    return vi !== undefined ? vi : null;
  };

  return { rowCount, getRow, getRowId, findVirtualIndex };
};
