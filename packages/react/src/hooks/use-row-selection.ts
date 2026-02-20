import { useCallback, useMemo, useState } from "react";

export type UseRowSelectionResult<TId> = Readonly<{
  /** The set of currently selected row IDs. */
  selectedRows: ReadonlySet<TId>;
  /** Returns true if the row with the given ID is selected. */
  isSelected: (id: TId) => boolean;
  /** Toggle the selection state of a single row. */
  toggleRow: (id: TId) => void;
  /**
   * If every ID in `allIds` is currently selected, clears all selections.
   * Otherwise, selects every ID in `allIds`.
   * Useful for a "select all" checkbox that acts as a toggle.
   */
  toggleAll: (allIds: ReadonlyArray<TId>) => void;
  /** Mark every ID in `allIds` as selected (replaces current selection). */
  selectAll: (allIds: ReadonlyArray<TId>) => void;
  /** Clear all selections. */
  clearAll: () => void;
  /** Number of currently selected rows. */
  selectedCount: number;
  /** Returns true if every ID in `allIds` is selected. */
  isAllSelected: (allIds: ReadonlyArray<TId>) => boolean;
}>;

/**
 * Manages row-level checkbox selection independently from the cell range selection
 * handled by the interaction kernel.
 *
 * ```tsx
 * const rowSel = useRowSelection<number>();
 *
 * // In your header cell — "select all" checkbox:
 * <input
 *   type="checkbox"
 *   checked={rowSel.isAllSelected(allRowIds)}
 *   onChange={() => rowSel.toggleAll(allRowIds)}
 * />
 *
 * // In each body row — per-row checkbox:
 * <input
 *   type="checkbox"
 *   checked={rowSel.isSelected(rowId)}
 *   onChange={() => rowSel.toggleRow(rowId)}
 * />
 * ```
 */
export const useRowSelection = <TId>(): UseRowSelectionResult<TId> => {
  const [selectedRows, setSelectedRows] = useState<ReadonlySet<TId>>(new Set());

  const isSelected = useCallback((id: TId) => selectedRows.has(id), [selectedRows]);

  const toggleRow = useCallback((id: TId) => {
    setSelectedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback((allIds: ReadonlyArray<TId>) => {
    setSelectedRows(new Set(allIds));
  }, []);

  const clearAll = useCallback(() => setSelectedRows(new Set()), []);

  const toggleAll = useCallback((allIds: ReadonlyArray<TId>) => {
    setSelectedRows((prev) => {
      const allSelected = allIds.length > 0 && allIds.every((id) => prev.has(id));
      return allSelected ? new Set() : new Set(allIds);
    });
  }, []);

  const isAllSelected = useCallback(
    (allIds: ReadonlyArray<TId>) => allIds.length > 0 && allIds.every((id) => selectedRows.has(id)),
    [selectedRows],
  );

  return useMemo(
    () => ({
      selectedRows,
      isSelected,
      toggleRow,
      selectAll,
      clearAll,
      toggleAll,
      isAllSelected,
      selectedCount: selectedRows.size,
    }),
    [selectedRows, isSelected, toggleRow, selectAll, clearAll, toggleAll, isAllSelected],
  );
};
