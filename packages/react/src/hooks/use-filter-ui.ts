import { useCallback, useMemo, useState } from "react";
import { composeFilterSpec } from "@hobom-grid/core";
import type { FilterColumnDef, FilterState, FilterSpec, ColumnFilterState } from "@hobom-grid/core";

export type PopoverState = Readonly<{
  columnKey: string;
  x: number;
  y: number;
}> | null;

export type UseFilterUIResult<TRow> = Readonly<{
  /** Composed FilterSpec — pass to useClientRowModel. undefined = no active filters. */
  filterSpec: FilterSpec<TRow> | undefined;
  /** Current filter state per column. */
  filterState: FilterState;
  /** Set/update a column's filter. */
  setFilter: (columnKey: string, value: unknown) => void;
  /** Clear a single column's filter. */
  clearFilter: (columnKey: string) => void;
  /** Clear all filters. */
  clearAllFilters: () => void;
  /** Number of currently active filters. */
  activeFilterCount: number;
  /** Popover state (position + column key). null = closed. */
  popover: PopoverState;
  /** Open the filter popover for a column at given coordinates. */
  openPopover: (columnKey: string, x: number, y: number) => void;
  /** Close the popover. */
  closePopover: () => void;
}>;

/**
 * Manage column filter state and compose a FilterSpec for the data pipeline.
 *
 * ```tsx
 * const filterUI = useFilterUI<MyRow>(filterColumnDefs);
 * const rowModel = useClientRowModel(data, { filter: filterUI.filterSpec });
 * ```
 */
export const useFilterUI = <TRow>(
  columnDefs: readonly FilterColumnDef<TRow>[],
): UseFilterUIResult<TRow> => {
  const [filterState, setFilterState] = useState<FilterState>({});
  const [popover, setPopover] = useState<PopoverState>(null);

  const filterSpec = useMemo(
    () => composeFilterSpec(columnDefs, filterState),
    [columnDefs, filterState],
  );

  const setFilter = useCallback(
    (columnKey: string, value: unknown) => {
      setFilterState((prev) => {
        const def = columnDefs.find((d) => d.key === columnKey);
        if (!def) return prev;
        const entry: ColumnFilterState = { type: def.type, value, active: true };
        return { ...prev, [columnKey]: entry };
      });
    },
    [columnDefs],
  );

  const clearFilter = useCallback((columnKey: string) => {
    setFilterState((prev) => {
      const { [columnKey]: _, ...rest } = prev;
      return rest;
    });
  }, []);

  const clearAllFilters = useCallback(() => {
    setFilterState({});
  }, []);

  const activeFilterCount = useMemo(
    () => Object.values(filterState).filter((s) => s.active).length,
    [filterState],
  );

  const openPopover = useCallback((columnKey: string, x: number, y: number) => {
    setPopover({ columnKey, x, y });
  }, []);

  const closePopover = useCallback(() => {
    setPopover(null);
  }, []);

  return {
    filterSpec,
    filterState,
    setFilter,
    clearFilter,
    clearAllFilters,
    activeFilterCount,
    popover,
    openPopover,
    closePopover,
  };
};
