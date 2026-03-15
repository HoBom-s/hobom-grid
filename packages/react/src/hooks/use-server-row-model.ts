import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createServerRowModel } from "@hobom-grid/core";
import type {
  FilterSpec,
  RowId,
  RowModel,
  ServerQuery,
  ServerResponse,
  ServerRow,
  SortSpec,
} from "@hobom-grid/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type UseServerRowModelOpts<TRow> = Readonly<{
  /** Fetch a page of data from the server. */
  fetchRows: (query: ServerQuery<TRow>) => Promise<ServerResponse<TRow>>;
  /** Derive a stable ID from each row. */
  getId: (row: TRow) => RowId;
  /** Sort specs — when changed, cache is cleared and data re-fetched. */
  sort?: readonly SortSpec<TRow>[];
  /** Filter spec — when changed, cache is cleared and data re-fetched. */
  filter?: FilterSpec<TRow>;
  /** Rows to fetch per request. Default: 100. */
  pageSize?: number;
  /** Prefetch buffer rows beyond the visible range. Default: 50. */
  prefetchBuffer?: number;
}>;

export type UseServerRowModelResult<TRow> = Readonly<{
  /** RowModel backed by sparse server cache. */
  rowModel: RowModel<ServerRow<TRow>>;
  /** Whether any fetch is in progress. */
  isLoading: boolean;
  /** Last fetch error, if any. */
  error: Error | null;
  /** Force a full refresh (clears cache). */
  refresh: () => void;
  /** Total row count from server. */
  totalCount: number;
  /** Request rows in a visible range (called from scroll handler). */
  requestVisibleRange: (start: number, end: number) => void;
}>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Server-side data source with sparse caching and viewport-driven fetching.
 *
 * ```tsx
 * const server = useServerRowModel({
 *   fetchRows: async (query) => {
 *     const res = await fetch(`/api/data?offset=${query.offset}&limit=${query.limit}`);
 *     return res.json();
 *   },
 *   getId: (r) => r.id,
 * });
 * <Grid rowCount={server.totalCount} ... />
 * ```
 */
export const useServerRowModel = <TRow>(
  opts: UseServerRowModelOpts<TRow>,
): UseServerRowModelResult<TRow> => {
  const { fetchRows, getId, sort, filter, pageSize = 100, prefetchBuffer = 50 } = opts;

  const [totalCount, setTotalCount] = useState(0);
  const [cache, setCache] = useState<Map<number, TRow>>(() => new Map());
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [version, setVersion] = useState(0);

  // Track in-flight ranges to avoid duplicate requests
  const inflightRef = useRef<Set<string>>(new Set());
  const fetchRowsRef = useRef(fetchRows);
  // eslint-disable-next-line react-hooks/refs
  fetchRowsRef.current = fetchRows;

  const sortRef = useRef(sort);
  // eslint-disable-next-line react-hooks/refs
  sortRef.current = sort;
  const filterRef = useRef(filter);
  // eslint-disable-next-line react-hooks/refs
  filterRef.current = filter;

  // Clear cache when sort/filter changes
  const sortKey = JSON.stringify(sort ?? null);
  const prevSortKeyRef = useRef(sortKey);
  const prevFilterRef = useRef(filter);

  useEffect(() => {
    if (sortKey !== prevSortKeyRef.current || filter !== prevFilterRef.current) {
      prevSortKeyRef.current = sortKey;
      prevFilterRef.current = filter;
      setCache(new Map());
      inflightRef.current = new Set();
      setVersion((v) => v + 1);
    }
  }, [sortKey, filter]);

  const rowModel = useMemo(
    () => createServerRowModel({ totalCount, cache, getId }),
    [totalCount, cache, getId],
  );

  // Use refs for cache/totalCount so fetchRange doesn't re-create on every state change
  const cacheRef = useRef(cache);
  // eslint-disable-next-line react-hooks/refs
  cacheRef.current = cache;
  const totalCountRef = useRef(totalCount);
  // eslint-disable-next-line react-hooks/refs
  totalCountRef.current = totalCount;

  const fetchRange = useCallback(
    (offset: number, limit: number) => {
      const rangeKey = `${offset}:${limit}`;
      if (inflightRef.current.has(rangeKey)) return;

      const curTotalCount = totalCountRef.current;
      const curCache = cacheRef.current;

      // Only skip if we know the total count and all rows are cached
      if (curTotalCount > 0) {
        let allCached = true;
        for (let i = offset; i < offset + limit && i < curTotalCount; i++) {
          if (!curCache.has(i)) {
            allCached = false;
            break;
          }
        }
        if (allCached) return;
      }

      inflightRef.current.add(rangeKey);
      setIsLoading(true);

      fetchRowsRef
        .current({ offset, limit, sort: sortRef.current, filter: filterRef.current })
        .then((response) => {
          setTotalCount(response.totalCount);
          setCache((prev) => {
            const next = new Map(prev);
            for (let i = 0; i < response.rows.length; i++) {
              next.set(offset + i, response.rows[i]);
            }
            return next;
          });
          setError(null);
        })
        .catch((err: unknown) => {
          setError(err instanceof Error ? err : new Error(String(err)));
        })
        .finally(() => {
          inflightRef.current.delete(rangeKey);
          setIsLoading(inflightRef.current.size > 0);
        });
    },
    // Stable — uses refs for mutable state
    [],
  );

  const requestVisibleRange = useCallback(
    (start: number, end: number) => {
      const bufferedStart = Math.max(0, start - prefetchBuffer);
      const bufferedEnd = end + prefetchBuffer;

      const alignedStart = Math.floor(bufferedStart / pageSize) * pageSize;
      const alignedEnd = Math.ceil(bufferedEnd / pageSize) * pageSize;

      for (let offset = alignedStart; offset < alignedEnd; offset += pageSize) {
        fetchRange(offset, pageSize);
      }
    },
    [prefetchBuffer, pageSize, fetchRange],
  );

  const refresh = useCallback(() => {
    setCache(new Map());
    cacheRef.current = new Map();
    totalCountRef.current = 0;
    setTotalCount(0);
    inflightRef.current = new Set();
    setVersion((v) => v + 1);
  }, []);

  // Initial fetch + refetch on version change
  useEffect(() => {
    fetchRange(0, pageSize);
  }, [version, fetchRange, pageSize]);

  return { rowModel, isLoading, error, refresh, totalCount, requestVisibleRange };
};
