export type GridPoint = Readonly<{ x: number; y: number }>;

export type GridRect = Readonly<{
  x: number;
  y: number;
  width: number;
  height: number;
}>;

export type GridCellRef = Readonly<{
  row: number; // 0-based
  col: number; // 0-based
}>;

export type HitRegion =
  | "cell"
  | "row-header"
  | "col-header"
  | "corner"
  | "grid"
  | "outside"
  | "col-resize-handle"
  | "row-resize-handle";

export type HitTarget = Readonly<{
  region: HitRegion;

  /**
   * Present when region implies a cell / header cell
   */
  cell?: GridCellRef;

  /**
   * For col-resize-handle
   */
  col?: number;

  /**
   * For row-resize-handle
   */
  row?: number;

  /**
   * Point relative to the hit region (optional)
   */
  local?: GridPoint;
}>;

export type GridLayout = Readonly<{
  /** Full grid bounds (including headers) in local coords */
  bounds: GridRect;

  /** Header sizes */
  rowHeaderWidth: number;
  colHeaderHeight: number;

  /** Row/Col count */
  rowCount: number;
  colCount: number;

  /**
   * Row/Col measurements (local coords)
   * - offsets are cumulative start positions from grid content origin (0,0) not including headers
   * - sizes are widths/heights
   */
  colOffsets: readonly number[]; // length = colCount + 1 (last = totalWidth) OR colCount
  colWidths: readonly number[]; // length = colCount
  rowOffsets: readonly number[]; // length = rowCount + 1 OR rowCount
  rowHeights: readonly number[]; // length = rowCount

  /**
   * Resize handle hit slop in px.
   * Example: 4 => detect within ±4px of a boundary.
   */
  resizeHandleSlop: number;
}>;

type HitTest = (layout: GridLayout, p: GridPoint) => HitTarget;

const rectContainsPoint = (r: GridRect, p: GridPoint): boolean => {
  return p.x >= r.x && p.y >= r.y && p.x < r.x + r.width && p.y < r.y + r.height;
};

/**
 * Find index i such that offsets[i] <= value < offsets[i+1]
 * - offsets may be length n+1 (preferred) or n; if n, we derive end using widths/heights.
 */
const findSegmentIndex = (
  offsets: readonly number[],
  sizes: readonly number[],
  value: number,
): number | null => {
  const n = sizes.length;
  if (n === 0) return null;

  // Fast bounds check
  const start = offsets[0] ?? 0;
  const end = offsets.length >= n + 1 ? offsets[n]! : (offsets[n - 1] ?? 0) + sizes[n - 1]!;

  if (value < start || value >= end) return null;

  // Binary search
  let lo = 0;
  let hi = n - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    const s = offsets[mid] ?? 0;
    const e = offsets.length >= n + 1 ? offsets[mid + 1]! : s + sizes[mid]!;

    if (value < s) hi = mid - 1;
    else if (value >= e) lo = mid + 1;
    else return mid;
  }
  return null;
};

export const defaultHitTest: HitTest = (layout, p) => {
  if (!rectContainsPoint(layout.bounds, p)) {
    return { region: "outside" };
  }

  // Convert to grid-local (bounds origin)
  const x = p.x - layout.bounds.x;
  const y = p.y - layout.bounds.y;

  const inRowHeader = x < layout.rowHeaderWidth;
  const inColHeader = y < layout.colHeaderHeight;

  if (inRowHeader && inColHeader) return { region: "corner" };

  // Content origin (top-left of scrollable cell area)
  const contentX = x - layout.rowHeaderWidth;
  const contentY = y - layout.colHeaderHeight;

  // Header hits
  if (inColHeader && !inRowHeader) {
    // Column header area: hit a column by contentX
    const col = findSegmentIndex(layout.colOffsets, layout.colWidths, contentX);
    if (col == null) return { region: "col-header" };
    return { region: "col-header", cell: { row: -1, col }, local: { x: contentX, y } };
  }

  if (inRowHeader && !inColHeader) {
    const row = findSegmentIndex(layout.rowOffsets, layout.rowHeights, contentY);
    if (row == null) return { region: "row-header" };
    return { region: "row-header", cell: { row, col: -1 }, local: { x, y: contentY } };
  }

  // Grid content area
  const row = findSegmentIndex(layout.rowOffsets, layout.rowHeights, contentY);
  const col = findSegmentIndex(layout.colOffsets, layout.colWidths, contentX);

  if (row == null || col == null) return { region: "grid" };

  // Resize handles (within slop near boundaries)
  const slop = Math.max(0, layout.resizeHandleSlop);

  const colStart = layout.colOffsets[col] ?? 0;
  const colEnd =
    layout.colOffsets.length >= layout.colCount + 1
      ? layout.colOffsets[col + 1]!
      : colStart + layout.colWidths[col]!;

  const rowStart = layout.rowOffsets[row] ?? 0;
  const rowEnd =
    layout.rowOffsets.length >= layout.rowCount + 1
      ? layout.rowOffsets[row + 1]!
      : rowStart + layout.rowHeights[row]!;

  // Near either boundary => handle
  const nearColStart = col > 0 && Math.abs(contentX - colStart) <= slop;
  const nearColEnd = Math.abs(contentX - colEnd) <= slop;

  const nearRowStart = row > 0 && Math.abs(contentY - rowStart) <= slop;
  const nearRowEnd = Math.abs(contentY - rowEnd) <= slop;

  /**
   * Handle index semantics:
   * - If you're near colStart, you're on the boundary between (col-1) and col => handle belongs to col-1
   * - If you're near colEnd, boundary between col and (col+1) => handle belongs to col
   */
  if (nearColStart) return { region: "col-resize-handle", col: col - 1, cell: { row, col } };
  if (nearColEnd) return { region: "col-resize-handle", col, cell: { row, col } };

  if (nearRowStart) return { region: "row-resize-handle", row: row - 1, cell: { row, col } };
  if (nearRowEnd) return { region: "row-resize-handle", row, cell: { row, col } };

  return {
    region: "cell",
    cell: { row, col },
    local: { x: contentX - colStart, y: contentY - rowStart },
  };
};
