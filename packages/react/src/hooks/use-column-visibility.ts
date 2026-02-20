import { useCallback, useState } from "react";

export type UseColumnVisibilityResult = Readonly<{
  /** Returns true if the column with the given original index is currently visible. */
  isVisible: (origIdx: number) => boolean;
  /** Toggle the visibility of the column with the given original index. */
  toggleVisibility: (origIdx: number) => void;
  /** Make all columns visible. */
  showAll: () => void;
  /** Number of currently hidden columns. */
  hiddenCount: number;
}>;

/**
 * Manages column show/hide state.
 *
 * The hook is intentionally minimal — it tracks which original column indices
 * are hidden. The caller computes the visible column list:
 *
 * ```tsx
 * const colVis = useColumnVisibility(COLUMNS.length);
 * const visibleCols = allColOrder.filter(i => colVis.isVisible(i));
 * // visibleCols[visualIdx] = originalIdx
 * ```
 */
export const useColumnVisibility = (_colCount: number): UseColumnVisibilityResult => {
  const [hiddenCols, setHiddenCols] = useState<ReadonlySet<number>>(new Set());

  const isVisible = useCallback((origIdx: number) => !hiddenCols.has(origIdx), [hiddenCols]);

  const toggleVisibility = useCallback((origIdx: number) => {
    setHiddenCols((prev) => {
      const next = new Set(prev);
      if (next.has(origIdx)) {
        next.delete(origIdx);
      } else {
        next.add(origIdx);
      }
      return next;
    });
  }, []);

  const showAll = useCallback(() => setHiddenCols(new Set()), []);

  return { isVisible, toggleVisibility, showAll, hiddenCount: hiddenCols.size };
};
