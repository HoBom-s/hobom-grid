import type { RowId, RowModel } from "./row-model";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GroupHeaderRow = Readonly<{
  type: "group";
  key: string;
  groupValue: unknown;
  depth: number;
  count: number;
  aggregates?: Readonly<Record<string, unknown>>;
  isExpanded: boolean;
}>;

export type DataRow<TRow> = Readonly<{
  type: "data";
  row: TRow;
  depth: number;
  groupKey: string;
}>;

export type GroupedRow<TRow> = GroupHeaderRow | DataRow<TRow>;

export type GroupBySpec<TRow> = Readonly<{
  /** Extract the group value from a row. */
  getGroupValue: (row: TRow) => unknown;
  /** Display label for the grouping column (optional). */
  label?: string;
  /** Aggregate functions to compute per group. */
  aggregates?: ReadonlyArray<{
    key: string;
    fn: (rows: readonly TRow[]) => unknown;
  }>;
}>;

export type GroupedRowModelSpec<TRow> = Readonly<{
  /** Source row model (flat, pre-sorted/filtered). */
  source: RowModel<TRow>;
  /** Group-by specifications (supports multi-level nesting). */
  groupBy: readonly GroupBySpec<TRow>[];
  /** Set of expanded group keys. */
  expandedGroups: ReadonlySet<string>;
  /** Derive a stable ID from the source row (used for DataRow IDs). */
  getId?: (row: TRow, sourceIndex: number) => RowId;
}>;

// ---------------------------------------------------------------------------
// GroupTree — O(N·D) pre-computation, reused across expand/collapse toggles
// ---------------------------------------------------------------------------

/**
 * A single node in the group tree.
 * Internal nodes have `subGroups`; leaf nodes have `dataRows`.
 */
export type GroupNode<TRow> = Readonly<{
  key: string;
  groupValue: string;
  depth: number;
  count: number;
  aggregates?: Readonly<Record<string, unknown>>;
  subGroups?: readonly GroupNode<TRow>[];
  dataRows?: ReadonlyArray<Readonly<{ row: TRow; sourceIndex: number }>>;
}>;

/** Pre-computed group tree. Pass to `flattenGroupTree` for O(V) flattening. */
export type GroupTree<TRow> = Readonly<{
  roots: readonly GroupNode<TRow>[];
  getId?: (row: TRow, sourceIndex: number) => RowId;
}>;

export type CreateGroupTreeSpec<TRow> = Readonly<{
  source: RowModel<TRow>;
  groupBy: readonly GroupBySpec<TRow>[];
  getId?: (row: TRow, sourceIndex: number) => RowId;
}>;

/**
 * Build a group tree from a flat source — O(N·D).
 *
 * This is the expensive step; call it only when `source` or `groupBy` changes.
 * The result is a stable tree that can be flattened cheaply with `flattenGroupTree`.
 */
export const createGroupTree = <TRow>(spec: CreateGroupTreeSpec<TRow>): GroupTree<TRow> => {
  const { source, groupBy, getId } = spec;

  const allRows: Array<{ row: TRow; sourceIndex: number }> = [];
  for (let i = 0; i < source.rowCount; i++) {
    allRows.push({ row: source.getRow(i), sourceIndex: i });
  }

  const roots = buildTreeLevel(allRows, groupBy, 0, "");
  return { roots, getId };
};

/**
 * Flatten a GroupTree into a RowModel — O(V) where V = visible rows.
 *
 * Only visits expanded groups, so cost is proportional to what's on screen.
 */
export const flattenGroupTree = <TRow>(
  tree: GroupTree<TRow>,
  expandedGroups: ReadonlySet<string>,
): RowModel<GroupedRow<TRow>> => {
  const flatRows: GroupedRow<TRow>[] = [];
  const dataIdMap = new Map<RowId, number>();
  const groupKeyMap = new Map<string, number>();

  const visit = (nodes: readonly GroupNode<TRow>[]): void => {
    for (const node of nodes) {
      const isExpanded = expandedGroups.has(node.key);

      groupKeyMap.set(node.key, flatRows.length);
      flatRows.push({
        type: "group",
        key: node.key,
        groupValue: node.groupValue,
        depth: node.depth,
        count: node.count,
        aggregates: node.aggregates,
        isExpanded,
      });

      if (isExpanded) {
        if (node.subGroups) {
          visit(node.subGroups);
        } else if (node.dataRows) {
          for (const { row, sourceIndex } of node.dataRows) {
            const idx = flatRows.length;
            flatRows.push({
              type: "data",
              row,
              depth: node.depth + 1,
              groupKey: node.key,
            });
            if (tree.getId) {
              dataIdMap.set(tree.getId(row, sourceIndex), idx);
            }
          }
        }
      }
    }
  };

  visit(tree.roots);

  const rowCount = flatRows.length;

  return {
    rowCount,
    getRow: (virtualIndex: number): GroupedRow<TRow> => {
      if (virtualIndex < 0 || virtualIndex >= rowCount) {
        throw new RangeError(
          `GroupedRowModel.getRow: index ${virtualIndex} out of range [0, ${rowCount})`,
        );
      }
      return flatRows[virtualIndex];
    },
    getRowId: (virtualIndex: number): RowId => {
      if (virtualIndex < 0 || virtualIndex >= rowCount) {
        throw new RangeError(
          `GroupedRowModel.getRowId: index ${virtualIndex} out of range [0, ${rowCount})`,
        );
      }
      const row = flatRows[virtualIndex];
      return row.type === "group" ? row.key : `data:${row.groupKey}:${virtualIndex}`;
    },
    findVirtualIndex: (id: RowId): number | null => {
      // O(1) lookup via Maps
      return groupKeyMap.get(id as string) ?? dataIdMap.get(id) ?? null;
    },
  };
};

// ---------------------------------------------------------------------------
// Legacy one-shot API (delegates to tree + flatten)
// ---------------------------------------------------------------------------

/**
 * Build a grouped RowModel from a flat source — O(N·D).
 *
 * For better performance on expand/collapse, prefer `createGroupTree` + `flattenGroupTree`.
 */
export const createGroupedRowModel = <TRow>(
  spec: GroupedRowModelSpec<TRow>,
): RowModel<GroupedRow<TRow>> => {
  const tree = createGroupTree({
    source: spec.source,
    groupBy: spec.groupBy,
    getId: spec.getId,
  });
  return flattenGroupTree(tree, spec.expandedGroups);
};

// ---------------------------------------------------------------------------
// Tree builder — recursive O(N·D)
// ---------------------------------------------------------------------------

function buildTreeLevel<TRow>(
  rows: Array<{ row: TRow; sourceIndex: number }>,
  groupBy: readonly GroupBySpec<TRow>[],
  depth: number,
  parentKey: string,
): GroupNode<TRow>[] {
  if (groupBy.length === 0 || depth >= groupBy.length) {
    // Should not be called at leaf level — callers store dataRows directly
    return [];
  }

  const spec = groupBy[depth];
  const groups = new Map<string, Array<{ row: TRow; sourceIndex: number }>>();
  const groupOrder: string[] = [];

  for (const entry of rows) {
    const value = spec.getGroupValue(entry.row);
    // eslint-disable-next-line @typescript-eslint/no-base-to-string
    const key = String(value ?? "");
    let group = groups.get(key);
    if (!group) {
      group = [];
      groups.set(key, group);
      groupOrder.push(key);
    }
    group.push(entry);
  }

  const nodes: GroupNode<TRow>[] = [];

  for (const groupValue of groupOrder) {
    const groupRows = groups.get(groupValue) ?? [];
    const groupKey = parentKey ? `${parentKey}/${groupValue}` : groupValue;

    // Compute aggregates
    let aggregates: Record<string, unknown> | undefined;
    if (spec.aggregates) {
      aggregates = {};
      const rawRows = groupRows.map((e) => e.row);
      for (const agg of spec.aggregates) {
        aggregates[agg.key] = agg.fn(rawRows);
      }
    }

    const isLeaf = depth + 1 >= groupBy.length;

    if (isLeaf) {
      nodes.push({
        key: groupKey,
        groupValue,
        depth,
        count: groupRows.length,
        aggregates,
        dataRows: groupRows,
      });
    } else {
      nodes.push({
        key: groupKey,
        groupValue,
        depth,
        count: groupRows.length,
        aggregates,
        subGroups: buildTreeLevel(groupRows, groupBy, depth + 1, groupKey),
      });
    }
  }

  return nodes;
}
