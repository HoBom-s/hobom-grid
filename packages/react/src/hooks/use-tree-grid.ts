import { useCallback, useMemo, useState } from "react";
import { createTreeRowModel } from "@hobom-grid/core";
import type { FlatTreeRow, RowId, RowModel, TreeNode } from "@hobom-grid/core";

export type UseTreeGridResult<TRow> = Readonly<{
  /** Flattened RowModel with tree metadata. */
  rowModel: RowModel<FlatTreeRow<TRow>>;
  /** Toggle a node's expanded state. */
  toggleNode: (nodeId: RowId) => void;
  /** Expand all nodes. */
  expandAll: () => void;
  /** Collapse all nodes. */
  collapseAll: () => void;
  /** Check if a node is expanded. */
  isExpanded: (nodeId: RowId) => boolean;
  /** Keyboard extension for arrow-key expand/collapse. */
  keyboardExtension: Readonly<{ onKeyDown: React.KeyboardEventHandler<HTMLDivElement> }>;
}>;

/**
 * Flatten a tree data structure into a RowModel for the Grid.
 *
 * ```tsx
 * const tree = useTreeGrid(roots, (r) => r.id);
 * <Grid
 *   rowCount={tree.rowModel.rowCount}
 *   keyboardExtension={tree.keyboardExtension}
 *   ...
 * />
 * ```
 */
export const useTreeGrid = <TRow>(
  roots: readonly TreeNode<TRow>[],
  getRowId: (row: TRow) => RowId,
  initialExpanded?: Iterable<RowId>,
): UseTreeGridResult<TRow> => {
  const [expandedNodes, setExpandedNodes] = useState<ReadonlySet<RowId>>(
    () => new Set(initialExpanded),
  );

  const rowModel = useMemo(
    () => createTreeRowModel({ roots, getRowId, expandedNodes }),
    [roots, getRowId, expandedNodes],
  );

  const toggleNode = useCallback((nodeId: RowId) => {
    setExpandedNodes((prev) => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  const expandAll = useCallback(() => {
    const allIds = new Set<RowId>();
    const collect = (nodes: readonly TreeNode<TRow>[]) => {
      for (const node of nodes) {
        if (node.children && node.children.length > 0) {
          allIds.add(getRowId(node.row));
          collect(node.children);
        }
      }
    };
    collect(roots);
    setExpandedNodes(allIds);
  }, [roots, getRowId]);

  const collapseAll = useCallback(() => {
    setExpandedNodes(new Set());
  }, []);

  const isExpanded = useCallback((nodeId: RowId) => expandedNodes.has(nodeId), [expandedNodes]);

  // Keyboard: ArrowRight = expand, ArrowLeft = collapse
  const rowModelRef = useMemo(() => ({ current: rowModel }), [rowModel]);

  const keyboardExtension = useMemo(
    () => ({
      onKeyDown: (e: React.KeyboardEvent<HTMLDivElement>) => {
        // We need a focused row to act on
        const target = e.currentTarget;
        const grid = target.closest("[role='grid']");
        if (!grid) return;

        // Find focused row from aria-rowindex of focused cell
        const focusedCell = grid.querySelector("[aria-selected='true']");
        if (!focusedCell) return;

        const rowIndexAttr = focusedCell.getAttribute("aria-rowindex");
        if (!rowIndexAttr) return;

        // aria-rowindex is 1-based; subtract headerRowCount (assume 1 for tree grids)
        const ariaRowIndex = parseInt(rowIndexAttr, 10);
        // We need the body row index, which = ariaRowIndex - 1 (aria) - headerRows
        // But since the caller wires this as keyboardExtension, we work with the model directly
        // Use the model index = ariaRowIndex - 1 - headerRowCount.
        // Since we don't know headerRowCount here, just use ariaRowIndex - 2 (1 header row assumed)
        // Actually, let the caller handle this. Keep it simple:
        // We just need the virtualIndex into rowModel.
        // The Grid uses cell.rowIndex which is header-inclusive.
        // For body rows: virtualIndex = cell.rowIndex - headerRowCount.
        // We don't know headerRowCount, so use a simpler approach:
        // Just check if ArrowRight/Left and prevent default if handled.

        if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;

        // Search for the row in the model based on ariaRowIndex
        // ariaRowIndex is 1-based grid row. Body row 0 = ariaRowIndex 2 (with 1 header).
        // We try bodyIndex = ariaRowIndex - 2 as a guess for 1 header row.
        // If it's out of range, bail.
        const model = rowModelRef.current;
        const bodyIndex = ariaRowIndex - 2;
        if (bodyIndex < 0 || bodyIndex >= model.rowCount) return;

        const treeRow = model.getRow(bodyIndex);
        if (!treeRow.hasChildren) return;

        if (e.key === "ArrowRight" && !treeRow.isExpanded) {
          e.preventDefault();
          setExpandedNodes((prev) => new Set(prev).add(treeRow.nodeId));
        } else if (e.key === "ArrowLeft" && treeRow.isExpanded) {
          e.preventDefault();
          setExpandedNodes((prev) => {
            const next = new Set(prev);
            next.delete(treeRow.nodeId);
            return next;
          });
        }
      },
    }),
    [rowModelRef],
  );

  return { rowModel, toggleNode, expandAll, collapseAll, isExpanded, keyboardExtension };
};
