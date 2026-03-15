import { useCallback, useMemo, useState } from "react";
import { createPagedRowModel } from "@hobom-grid/core";
import type { RowModel } from "@hobom-grid/core";

export type UsePaginationOpts = Readonly<{
  /** Initial page (0-based). Default: 0. */
  initialPage?: number;
  /** Initial page size. Default: 20. */
  initialPageSize?: number;
}>;

export type UsePaginationResult<TRow> = Readonly<{
  /** Paginated RowModel (current page only). */
  rowModel: RowModel<TRow>;
  /** Current page (0-based, clamped). */
  currentPage: number;
  /** Current page size. */
  pageSize: number;
  /** Total number of pages. */
  totalPages: number;
  /** Total rows in source. */
  totalRows: number;
  /** Navigate to a specific page. */
  setPage: (page: number) => void;
  /** Change page size (resets to page 0). */
  setPageSize: (size: number) => void;
  /** Go to first page. */
  goFirst: () => void;
  /** Go to last page. */
  goLast: () => void;
  /** Go to previous page. */
  goPrev: () => void;
  /** Go to next page. */
  goNext: () => void;
  /** Whether previous page exists. */
  canGoPrev: boolean;
  /** Whether next page exists. */
  canGoNext: boolean;
}>;

/**
 * Paginate a source RowModel.
 *
 * ```tsx
 * const rowModel = useClientRowModel(data, { sort, filter });
 * const paged = usePagination(rowModel, { initialPageSize: 50 });
 * <Grid rowCount={paged.rowModel.rowCount} ... />
 * ```
 */
export const usePagination = <TRow>(
  source: RowModel<TRow>,
  opts?: UsePaginationOpts,
): UsePaginationResult<TRow> => {
  const [page, setPageRaw] = useState(opts?.initialPage ?? 0);
  const [pageSize, setPageSizeRaw] = useState(opts?.initialPageSize ?? 20);

  const result = useMemo(
    () => createPagedRowModel({ source, page, pageSize }),
    [source, page, pageSize],
  );

  const setPage = useCallback((p: number) => {
    setPageRaw(p);
  }, []);
  const setPageSize = useCallback((s: number) => {
    setPageSizeRaw(s);
    setPageRaw(0);
  }, []);
  const goFirst = useCallback(() => {
    setPageRaw(0);
  }, []);
  const goLast = useCallback(() => {
    setPageRaw(result.totalPages - 1);
  }, [result.totalPages]);
  const goPrev = useCallback(() => {
    setPageRaw((p) => Math.max(0, p - 1));
  }, []);
  const goNext = useCallback(() => {
    setPageRaw((p) => p + 1);
  }, []);

  return {
    rowModel: result.rowModel,
    currentPage: result.page,
    pageSize,
    totalPages: result.totalPages,
    totalRows: result.totalRows,
    setPage,
    setPageSize,
    goFirst,
    goLast,
    goPrev,
    goNext,
    canGoPrev: result.page > 0,
    canGoNext: result.page < result.totalPages - 1,
  };
};
