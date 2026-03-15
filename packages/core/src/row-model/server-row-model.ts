import type { RowId, RowModel, SortSpec, FilterSpec } from "./row-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ServerRow<TRow> =
  | Readonly<{ type: "data"; row: TRow }>
  | Readonly<{ type: "loading"; index: number }>;

export type ServerQuery<TRow> = Readonly<{
  offset: number;
  limit: number;
  sort?: readonly SortSpec<TRow>[];
  filter?: FilterSpec<TRow>;
}>;

export type ServerResponse<TRow> = Readonly<{
  rows: readonly TRow[];
  totalCount: number;
}>;

export type ServerRowModelSpec<TRow> = Readonly<{
  /** Total number of rows (from server metadata). */
  totalCount: number;
  /** Sparse cache: index → row data. */
  cache: ReadonlyMap<number, TRow>;
  /** Derive a stable ID from each row. */
  getId: (row: TRow) => RowId;
}>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Build a RowModel backed by a sparse server cache.
 *
 * Cache hits return `{ type: "data", row }`. Cache misses return `{ type: "loading", index }`.
 * The consumer (React hook) is responsible for fetching missing ranges.
 */
export const createServerRowModel = <TRow>(
  spec: ServerRowModelSpec<TRow>,
): RowModel<ServerRow<TRow>> => {
  const { totalCount, cache, getId } = spec;
  const rowCount = Math.max(0, totalCount);

  // Reverse map: id → index for O(1) findVirtualIndex
  const idToIndex = new Map<RowId, number>();
  for (const [index, row] of cache) {
    idToIndex.set(getId(row), index);
  }

  const getRow = (virtualIndex: number): ServerRow<TRow> => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `ServerRowModel.getRow: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    const cached = cache.get(virtualIndex);
    if (cached !== undefined) {
      return { type: "data", row: cached };
    }
    return { type: "loading", index: virtualIndex };
  };

  const getRowId = (virtualIndex: number): RowId => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `ServerRowModel.getRowId: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    const cached = cache.get(virtualIndex);
    if (cached !== undefined) {
      return getId(cached);
    }
    return `__loading__${virtualIndex}`;
  };

  const findVirtualIndex = (id: RowId): number | null => {
    return idToIndex.get(id) ?? null;
  };

  return { rowCount, getRow, getRowId, findVirtualIndex };
};
