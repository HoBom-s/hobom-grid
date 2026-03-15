import type { CellRange } from "./interaction-kernel-state";
import type { GridCellRef } from "../contracts/hit-test-model";

/**
 * Pre-computed bitmap for O(1) per-cell selection lookup.
 *
 * Replaces `ranges.some(r => inRange(cell, r))` which is O(V * R)
 * with a single Uint8Array lookup: O(R * area) build + O(1) per query.
 */
export type SelectionBitmap = Readonly<{
  isSelected(row: number, col: number): boolean;
}>;

const EMPTY_BITMAP: SelectionBitmap = { isSelected: () => false };

/**
 * Build a bitmap covering [rowStart..rowEnd] x [colStart..colEnd].
 * All ranges and the focusCell are OR-ed into the bitmap.
 */
export function createSelectionBitmap(
  ranges: readonly CellRange[],
  focusCell: GridCellRef | null,
  rowStart: number,
  rowEnd: number,
  colStart: number,
  colEnd: number,
): SelectionBitmap {
  const rowSpan = rowEnd - rowStart + 1;
  const colSpan = colEnd - colStart + 1;

  if (rowSpan <= 0 || colSpan <= 0) return EMPTY_BITMAP;
  if (ranges.length === 0 && focusCell == null) return EMPTY_BITMAP;

  const bits = new Uint8Array(rowSpan * colSpan);

  for (const range of ranges) {
    const rS = Math.max(range.start.row, rowStart);
    const rE = Math.min(range.end.row, rowEnd);
    const cS = Math.max(range.start.col, colStart);
    const cE = Math.min(range.end.col, colEnd);

    for (let r = rS; r <= rE; r++) {
      const offset = (r - rowStart) * colSpan;
      for (let c = cS; c <= cE; c++) {
        bits[offset + (c - colStart)] = 1;
      }
    }
  }

  if (
    focusCell != null &&
    focusCell.row >= rowStart &&
    focusCell.row <= rowEnd &&
    focusCell.col >= colStart &&
    focusCell.col <= colEnd
  ) {
    bits[(focusCell.row - rowStart) * colSpan + (focusCell.col - colStart)] = 1;
  }

  return {
    isSelected(row: number, col: number): boolean {
      const r = row - rowStart;
      const c = col - colStart;
      if (r < 0 || r >= rowSpan || c < 0 || c >= colSpan) return false;
      return bits[r * colSpan + c] === 1;
    },
  };
}
