import type { CellKind, Px } from "../contracts/contracts-model";

/**
 * Flat render instruction for a single cell-like rectangle.
 * UI adapters should treat this as “draw this box”.
 */
export type CellVM = Readonly<{
  rowIndex: number;
  colIndex: number;
  kind: CellKind;

  // viewport-space coordinates (adapter can translate directly)
  x: Px;
  y: Px;
  width: Px;
  height: Px;
}>;

export type ViewModel = Readonly<{
  cells: ReadonlyArray<CellVM>;

  stats: Readonly<{
    bodyCellCount: number;
    headerCellCount: number;
    pinnedStartCellCount: number;
    pinnedEndCellCount: number;
  }>;
}>;
