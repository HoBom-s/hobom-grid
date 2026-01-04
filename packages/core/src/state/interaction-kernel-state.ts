import type { GridCellRef, HitTarget } from "../contracts/hit-test-model";

export type CellRange = Readonly<{
  start: GridCellRef;
  end: GridCellRef;
}>;

export type SelectionModel = Readonly<{
  /** "active" cell (like Excel current) */
  active: GridCellRef | null;

  /** anchor for shift-range */
  anchor: GridCellRef | null;

  /** selected ranges (Phase 2 minimal: keep 0..N, but we can start with 1 range) */
  ranges: readonly CellRange[];
}>;

export type InteractionKernelState = Readonly<{
  isFocused: boolean;

  /** hover target (usually cell/header/handle). null when pointer leaves */
  hover: HitTarget | null;

  /** focus target distinct from selection: e.g. focused cell when grid focused */
  focusCell: GridCellRef | null;

  selection: SelectionModel;
}>;

export const createInitialInteractionKernelState = (): InteractionKernelState => ({
  isFocused: false,
  hover: null,
  focusCell: null,
  selection: {
    active: null,
    anchor: null,
    ranges: [],
  },
});

export const normalizeRange = (r: CellRange): CellRange => {
  const top = Math.min(r.start.row, r.end.row);
  const left = Math.min(r.start.col, r.end.col);
  const bottom = Math.max(r.start.row, r.end.row);
  const right = Math.max(r.start.col, r.end.col);
  return {
    start: { row: top, col: left },
    end: { row: bottom, col: right },
  };
};

export const isCellEqual = (a: GridCellRef | null, b: GridCellRef | null): boolean => {
  if (a == null || b == null) return a === b;
  return a.row === b.row && a.col === b.col;
};
