import { px } from "@hobom-grid/core";
import type { HitTarget, MeasuredAxis, ViewportModel } from "@hobom-grid/core";

type HitTestOpts = Readonly<{
  /**
   * Number of sticky header rows.
   * Header area height is derived from rowAxis offsets.
   */
  headerRowCount: number;

  /**
   * Width of a row header column (e.g., row numbers).
   * Phase 2 does not have row headers, so defaults to 0.
   */
  rowHeaderWidth?: number;

  /** Slop in px for resize handle detection. Defaults to 4. */
  resizeHandleSlop?: number;
}>;

/**
 * Hit-test a pointer position against the grid.
 *
 * Coordinate convention:
 * - pointerX/Y are relative to the grid container's top-left (viewport space)
 * - Absolute content offsets are derived by reversing the viewport transforms
 *
 * Transform formulas (from viewport-engine.ts):
 *   pinned start: viewportX = absContentX
 *   main:         viewportX = pinnedStartWidthPx + absContentX - scrollLeft  (colMainX = pinnedStartWidthPx)
 *   pinned end:   viewportX = (vw - pinnedEndWidthPx) + (absContentX - pinnedEndOffsetPx)
 *   header row:   viewportY = absContentY
 *   body row:     viewportY = headerHeightPx + absContentY - scrollTop        (rowBodyY = headerHeightPx)
 */
export const hitTestGrid = (
  pointerX: number,
  pointerY: number,
  viewport: ViewportModel,
  rowAxis: MeasuredAxis,
  colAxis: MeasuredAxis,
  opts: HitTestOpts,
): HitTarget => {
  const vw = Number(viewport.viewportWidthPx);
  const vh = Number(viewport.viewportHeightPx);

  if (pointerX < 0 || pointerY < 0 || pointerX >= vw || pointerY >= vh) {
    return { region: "outside" };
  }

  const rowHeaderWidth = opts.rowHeaderWidth ?? 0;
  const resizeHandleSlop = opts.resizeHandleSlop ?? 4;

  // rowBodyY = headerHeightPx (px from top where body rows start)
  const headerHeightPx = Number(viewport.transforms.rowBodyY);
  const colMainX = Number(viewport.transforms.colMainX); // = pinnedStartWidthPx
  const colPinnedEndX = Number(viewport.transforms.colPinnedEndX);

  const scrollLeft = Number(viewport.scrollLeftPx);
  const scrollTop = Number(viewport.scrollTopPx);

  const inRowHeader = rowHeaderWidth > 0 && pointerX < rowHeaderWidth;
  const inColHeader = pointerY < headerHeightPx;

  if (inRowHeader && inColHeader) return { region: "corner" };

  // ---- resolve column (absolute content index) ----
  const col = resolveCol(
    pointerX,
    viewport,
    colAxis,
    rowHeaderWidth,
    colMainX,
    colPinnedEndX,
    scrollLeft,
  );

  if (inColHeader) {
    if (col == null) return { region: "col-header" };
    return { region: "col-header", cell: { row: -1, col } };
  }

  if (inRowHeader) {
    // inverse of y = rowOffset - scrollTop  →  rowOffset = y + scrollTop
    const absContentY = pointerY + scrollTop;
    if (absContentY < 0) return { region: "row-header" };
    const row = rowAxis.findIndexAtOffsetPx(px(absContentY));
    return { region: "row-header", cell: { row, col: -1 } };
  }

  // ---- body area ----
  if (col == null) return { region: "grid" };

  // inverse of y = rowOffset - scrollTop  →  rowOffset = y + scrollTop
  const absContentY = pointerY + scrollTop;
  if (absContentY < 0) return { region: "grid" };

  const row = rowAxis.findIndexAtOffsetPx(px(absContentY));
  if (row < 0 || row >= rowAxis.getCount()) return { region: "grid" };

  // ---- resize handle detection ----
  if (resizeHandleSlop > 0) {
    const absContentX = resolveAbsContentX(
      pointerX,
      viewport,
      rowHeaderWidth,
      colMainX,
      colPinnedEndX,
      scrollLeft,
    );

    if (absContentX != null) {
      const colStart = Number(colAxis.getOffsetPx(col));
      const colEnd = colStart + Number(colAxis.getSizePx(col));
      const rowStart = Number(rowAxis.getOffsetPx(row));
      const rowEnd = rowStart + Number(rowAxis.getSizePx(row));

      const nearColStart = col > 0 && Math.abs(absContentX - colStart) <= resizeHandleSlop;
      const nearColEnd = Math.abs(absContentX - colEnd) <= resizeHandleSlop;
      const nearRowStart = row > 0 && Math.abs(absContentY - rowStart) <= resizeHandleSlop;
      const nearRowEnd = Math.abs(absContentY - rowEnd) <= resizeHandleSlop;

      if (nearColStart) return { region: "col-resize-handle", col: col - 1, cell: { row, col } };
      if (nearColEnd) return { region: "col-resize-handle", col, cell: { row, col } };
      if (nearRowStart) return { region: "row-resize-handle", row: row - 1, cell: { row, col } };
      if (nearRowEnd) return { region: "row-resize-handle", row, cell: { row, col } };
    }
  }

  const colStartVp = Number(colAxis.getOffsetPx(col));
  const rowStartVp = Number(rowAxis.getOffsetPx(row));

  return {
    region: "cell",
    cell: { row, col },
    local: {
      x: pointerX - colStartVp,
      y: pointerY - rowStartVp,
    },
  };
};

/** Returns the absolute column index at the given pointer X, or null if out of any region. */
const resolveCol = (
  pointerX: number,
  viewport: ViewportModel,
  colAxis: MeasuredAxis,
  rowHeaderWidth: number,
  colMainX: number,
  colPinnedEndX: number,
  scrollLeft: number,
): number | null => {
  const absX = resolveAbsContentX(
    pointerX,
    viewport,
    rowHeaderWidth,
    colMainX,
    colPinnedEndX,
    scrollLeft,
  );
  if (absX == null) return null;
  const col = colAxis.findIndexAtOffsetPx(px(absX));
  if (col < 0 || col >= colAxis.getCount()) return null;
  return col;
};

/** Returns the absolute content X for the given pointerX, or null if the pointer is in row-header or out-of-col. */
const resolveAbsContentX = (
  pointerX: number,
  viewport: ViewportModel,
  rowHeaderWidth: number,
  colMainX: number,
  colPinnedEndX: number,
  scrollLeft: number,
): number | null => {
  if (rowHeaderWidth > 0 && pointerX < rowHeaderWidth) return null;

  const pinnedStartRange = viewport.cols.start.range;
  const pinnedEndRange = viewport.cols.end.range;
  const mainRange = viewport.cols.main.range;

  const hasPinnedStart = pinnedStartRange.end >= pinnedStartRange.start;
  const hasPinnedEnd = pinnedEndRange.end >= pinnedEndRange.start;
  const hasMain = mainRange.end >= mainRange.start;

  // Pinned start: viewportX = absContentX (colPinnedStartX = 0)
  if (hasPinnedStart && pointerX < colMainX) {
    return pointerX; // absContentX = viewportX directly
  }

  // Pinned end: viewportX = colPinnedEndX + (absContentX - pinnedEndOffsetPx)
  //             => absContentX = pinnedEndOffsetPx + (pointerX - colPinnedEndX)
  if (hasPinnedEnd && pointerX >= colPinnedEndX) {
    const absX = Number(viewport.cols.end.offsetPx) + (pointerX - colPinnedEndX);
    return absX;
  }

  // Main: viewportX = colMainX + absContentX - scrollLeft
  //       => absContentX = pointerX - colMainX + scrollLeft
  if (hasMain) {
    const absX = pointerX - colMainX + scrollLeft;
    if (absX >= 0) return absX;
  }

  return null;
};
