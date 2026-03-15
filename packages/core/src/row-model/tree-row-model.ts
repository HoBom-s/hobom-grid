import type { RowId, RowModel } from "./row-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type TreeNode<TRow> = Readonly<{
  row: TRow;
  children?: readonly TreeNode<TRow>[];
}>;

export type FlatTreeRow<TRow> = Readonly<{
  type: "tree-node";
  row: TRow;
  depth: number;
  hasChildren: boolean;
  isExpanded: boolean;
  nodeId: RowId;
}>;

export type TreeRowModelSpec<TRow> = Readonly<{
  /** Root tree nodes. */
  roots: readonly TreeNode<TRow>[];
  /** Derive a stable ID from each row. */
  getRowId: (row: TRow) => RowId;
  /** Set of expanded node IDs. */
  expandedNodes: ReadonlySet<RowId>;
}>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Flatten a tree structure into a RowModel via DFS.
 *
 * Collapsed nodes hide their children. Depth tracks nesting level (0 = root).
 */
export const createTreeRowModel = <TRow>(
  spec: TreeRowModelSpec<TRow>,
): RowModel<FlatTreeRow<TRow>> => {
  const { roots, getRowId: getId, expandedNodes } = spec;

  const flatRows: FlatTreeRow<TRow>[] = [];
  const idToIndex = new Map<RowId, number>();

  const traverse = (nodes: readonly TreeNode<TRow>[], depth: number): void => {
    for (const node of nodes) {
      const nodeId = getId(node.row);
      const hasChildren = (node.children?.length ?? 0) > 0;
      const isExpanded = hasChildren && expandedNodes.has(nodeId);

      const idx = flatRows.length;
      flatRows.push({ type: "tree-node", row: node.row, depth, hasChildren, isExpanded, nodeId });
      idToIndex.set(nodeId, idx);

      if (isExpanded && node.children) {
        traverse(node.children, depth + 1);
      }
    }
  };

  traverse(roots, 0);

  const rowCount = flatRows.length;

  const getRow = (virtualIndex: number): FlatTreeRow<TRow> => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `TreeRowModel.getRow: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    return flatRows[virtualIndex];
  };

  const getRowId = (virtualIndex: number): RowId => {
    if (virtualIndex < 0 || virtualIndex >= rowCount) {
      throw new RangeError(
        `TreeRowModel.getRowId: index ${virtualIndex} out of range [0, ${rowCount})`,
      );
    }
    return flatRows[virtualIndex].nodeId;
  };

  const findVirtualIndex = (id: RowId): number | null => {
    return idToIndex.get(id) ?? null;
  };

  return { rowCount, getRow, getRowId, findVirtualIndex };
};
