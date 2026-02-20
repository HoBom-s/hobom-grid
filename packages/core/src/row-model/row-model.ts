/**
 * Stable identifier for a data row.
 * Must be unique within a dataset and survive sort/filter operations.
 */
export type RowId = string | number;

/**
 * The central abstraction of the data pipeline.
 *
 * A RowModel maps "virtual row indices" (0-based, contiguous, what the
 * grid kernel sees) to the underlying data items.
 *
 * Pipeline stages (RawRows → Sorted → Filtered → ...) each produce a new
 * RowModel with a potentially different `rowCount` and mapping.
 */
export type RowModel<TRow = unknown> = Readonly<{
  /** Number of visible rows after all pipeline stages. */
  rowCount: number;

  /** Get the data item at a virtual (post-pipeline) index. */
  getRow(virtualIndex: number): TRow;

  /**
   * Get the stable ID for a virtual row.
   * Used to preserve selection / focus across sort/filter changes.
   */
  getRowId(virtualIndex: number): RowId;

  /**
   * Reverse lookup: virtual index for a given stable ID.
   * Returns null if the row is currently filtered out.
   */
  findVirtualIndex(id: RowId): number | null;
}>;

/** Sort direction. */
export type SortDirection = "asc" | "desc";

/**
 * Sort specification for a single column.
 * Multiple specs form a multi-column sort (first spec wins, tie-break by next).
 */
export type SortSpec<TRow> = Readonly<{
  /** Column key to sort by. */
  key: keyof TRow;

  /** Sort direction. */
  direction: SortDirection;

  /**
   * Optional custom comparator for the column values.
   * Defaults to numeric comparison for numbers, locale-aware string comparison otherwise.
   */
  compare?: (a: unknown, b: unknown) => number;
}>;

/**
 * Filter predicate.
 * Return true to keep the row, false to hide it.
 */
export type FilterSpec<TRow> = (row: TRow, originalIndex: number) => boolean;
