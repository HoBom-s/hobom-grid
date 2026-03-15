import type { RowId, RowModel } from "./row-model";

export type PagedRowModelSpec<TRow> = Readonly<{
  /** Source row model to paginate. */
  source: RowModel<TRow>;
  /** Current page (0-based). Clamped to valid range. */
  page: number;
  /** Rows per page. Must be >= 1. */
  pageSize: number;
}>;

export type PagedRowModelResult<TRow> = Readonly<{
  /** Paginated RowModel (only the current page's rows). */
  rowModel: RowModel<TRow>;
  /** Actual page after clamping. */
  page: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total row count in the source (before paging). */
  totalRows: number;
}>;

/**
 * Slice a source RowModel into pages.
 *
 * - page/pageSize out of range is clamped (never throws).
 * - `findVirtualIndex` returns null if the row is on a different page.
 */
export const createPagedRowModel = <TRow>(
  spec: PagedRowModelSpec<TRow>,
): PagedRowModelResult<TRow> => {
  const { source, pageSize: rawPageSize } = spec;
  const pageSize = Math.max(1, Math.floor(rawPageSize));

  const totalRows = source.rowCount;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const page = Math.max(0, Math.min(Math.floor(spec.page), totalPages - 1));

  const start = page * pageSize;
  const end = Math.min(start + pageSize, totalRows);
  const rowCount = end - start;

  const getRow = (virtualIndex: number): TRow => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `PagedRowModel.getRow: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    return source.getRow(start + virtualIndex);
  };

  const getRowId = (virtualIndex: number): RowId => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `PagedRowModel.getRowId: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    return source.getRowId(start + virtualIndex);
  };

  const findVirtualIndex = (id: RowId): number | null => {
    const sourceIndex = source.findVirtualIndex(id);
    if (sourceIndex == null) return null;
    const pageIndex = sourceIndex - start;
    if (pageIndex < 0 || pageIndex >= rowCount) return null;
    return pageIndex;
  };

  return {
    rowModel: { rowCount, getRow, getRowId, findVirtualIndex },
    page,
    totalPages,
    totalRows,
  };
};
