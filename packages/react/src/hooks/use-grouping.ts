import { useCallback, useMemo, useState } from "react";
import { createGroupTree, flattenGroupTree } from "@hobom-grid/core";
import type { GroupBySpec, GroupedRow, GroupNode, RowId, RowModel } from "@hobom-grid/core";

export type UseGroupingOpts<TRow> = Readonly<{
  /** Group-by specifications (supports multi-level). */
  groupBy: readonly GroupBySpec<TRow>[];
  /** Derive a stable ID from each source row. */
  getId?: (row: TRow, sourceIndex: number) => RowId;
  /** Initially expanded group keys. */
  initialExpanded?: Iterable<string>;
}>;

export type UseGroupingResult<TRow> = Readonly<{
  /** Grouped RowModel with interleaved headers and data rows. */
  rowModel: RowModel<GroupedRow<TRow>>;
  /** Currently expanded group keys. */
  expandedGroups: ReadonlySet<string>;
  /** Toggle a group's expanded state. */
  toggleGroup: (groupKey: string) => void;
  /** Expand all groups. */
  expandAll: () => void;
  /** Collapse all groups. */
  collapseAll: () => void;
  /** Check if a group is expanded. */
  isExpanded: (groupKey: string) => boolean;
}>;

/**
 * Group a source RowModel by one or more keys.
 *
 * Uses two-phase computation for optimal performance:
 * - Phase 1: `createGroupTree` — O(N·D), only when source/groupBy changes
 * - Phase 2: `flattenGroupTree` — O(V), on every expand/collapse toggle
 *
 * ```tsx
 * const grouped = useGrouping(rowModel, {
 *   groupBy: [{ getGroupValue: (r) => r.department }],
 *   getId: (r) => r.id,
 * });
 * <Grid rowCount={grouped.rowModel.rowCount} ... />
 * ```
 */
export const useGrouping = <TRow>(
  source: RowModel<TRow>,
  opts: UseGroupingOpts<TRow>,
): UseGroupingResult<TRow> => {
  const { groupBy, getId, initialExpanded } = opts;
  const [expandedGroups, setExpandedGroups] = useState<ReadonlySet<string>>(
    () => new Set(initialExpanded),
  );

  // Phase 1: Build group tree — O(N·D), only recomputes when source/groupBy changes
  const groupTree = useMemo(
    () => createGroupTree({ source, groupBy, getId }),
    [source, groupBy, getId],
  );

  // Phase 2: Flatten — O(V), recomputes on expand/collapse toggle
  const rowModel = useMemo(
    () => flattenGroupTree(groupTree, expandedGroups),
    [groupTree, expandedGroups],
  );

  const toggleGroup = useCallback((groupKey: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(groupKey)) {
        next.delete(groupKey);
      } else {
        next.add(groupKey);
      }
      return next;
    });
  }, []);

  // O(G) tree traversal — no iterative re-grouping needed
  const expandAll = useCallback(() => {
    const allKeys = new Set<string>();
    const collect = (nodes: readonly GroupNode<TRow>[]) => {
      for (const node of nodes) {
        allKeys.add(node.key);
        if (node.subGroups) collect(node.subGroups);
      }
    };
    collect(groupTree.roots);
    setExpandedGroups(allKeys);
  }, [groupTree]);

  const collapseAll = useCallback(() => {
    setExpandedGroups(new Set());
  }, []);

  const isExpanded = useCallback(
    (groupKey: string) => expandedGroups.has(groupKey),
    [expandedGroups],
  );

  return { rowModel, expandedGroups, toggleGroup, expandAll, collapseAll, isExpanded };
};
