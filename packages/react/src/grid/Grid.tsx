import { useRef, useMemo, useEffect, useCallback, memo } from "react";
import type { CellVM, InteractionKernelState, ViewportModel } from "@hobom-grid/core";
import { createSelectionBitmap } from "@hobom-grid/core";
import { useGridKernel } from "../hooks/use-grid-kernel";
import { useInteraction } from "../hooks/use-interaction";
import { hitTestGrid } from "../utils/hit-test";

/* eslint-disable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */
const __DEV__ =
  typeof globalThis !== "undefined" && (globalThis as any).process?.env?.NODE_ENV !== "production";
/* eslint-enable @typescript-eslint/no-explicit-any, @typescript-eslint/no-unsafe-member-access */

const safeRenderCell = (
  renderCell: (cell: CellVM, state: GridRenderState) => React.ReactNode,
  cell: CellVM,
  state: GridRenderState,
): React.ReactNode => {
  try {
    return renderCell(cell, state);
  } catch (err) {
    if (__DEV__) {
      console.error(
        `[hobom-grid] renderCell threw for cell (${cell.rowIndex}, ${cell.colIndex}):`,
        err,
      );
    }
    return null;
  }
};

export type GridRenderState = Readonly<{
  interactionState: InteractionKernelState;
  viewport: ViewportModel;
}>;

// ----- Memoized cell component -----
// Skips re-render when cell position/size, selection, and render state are unchanged.
// During pure scroll all cells move (x/y change) so memo doesn't help there,
// but for selection/focus changes only affected cells re-render.

type GridCellProps = Readonly<{
  cell: CellVM;
  isFocused: boolean;
  isSelected: boolean;
  renderCell: (cell: CellVM, state: GridRenderState) => React.ReactNode;
  renderState: GridRenderState;
}>;

/* eslint-disable react/prop-types -- TypeScript validates props */
const GridCell = memo<GridCellProps>(
  ({ cell, isFocused, isSelected, renderCell, renderState }) => {
    const isHeader =
      cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd";
    const isPinned = cell.kind === "pinnedStart" || cell.kind === "pinnedEnd";

    return (
      <div
        role={isHeader ? "columnheader" : "gridcell"}
        aria-rowindex={cell.rowIndex + 1}
        aria-colindex={cell.colIndex + 1}
        aria-selected={isSelected || undefined}
        data-focused={isFocused || undefined}
        style={{
          position: "absolute",
          transform: `translate(${cell.x}px, ${cell.y}px)`,
          width: cell.width,
          height: cell.height,
          overflow: "hidden",
          boxSizing: "border-box",
          pointerEvents: "auto",
          zIndex: isHeader ? 2 : isPinned ? 1 : 0,
        }}
      >
        {safeRenderCell(renderCell, cell, renderState)}
      </div>
    );
  },
  (prev, next) =>
    prev.cell.x === next.cell.x &&
    prev.cell.y === next.cell.y &&
    prev.cell.width === next.cell.width &&
    prev.cell.height === next.cell.height &&
    prev.cell.rowIndex === next.cell.rowIndex &&
    prev.cell.colIndex === next.cell.colIndex &&
    prev.cell.kind === next.cell.kind &&
    prev.isFocused === next.isFocused &&
    prev.isSelected === next.isSelected &&
    prev.renderCell === next.renderCell &&
    prev.renderState === next.renderState,
);
/* eslint-enable react/prop-types */
GridCell.displayName = "GridCell";

export type GridProps = Readonly<{
  // Data size
  /**
   * Number of **body (data) rows** — does NOT include header rows.
   * Wire directly to `useClientRowModel().rowCount`.
   */
  rowCount: number;
  colCount: number;

  // Default sizes (used as estimate until DOM measurement)
  defaultRowHeight?: number;
  defaultColWidth?: number;

  // Pre-set column sizes (px) keyed by column index
  colSizes?: Readonly<Record<number, number>>;

  // Pre-set row sizes (px) keyed by row index (body rows, 0-based)
  rowSizes?: Readonly<Record<number, number>>;

  // Grid structure
  headerRowCount?: number;
  pinnedColStartCount?: number;
  pinnedColEndCount?: number;

  // Overscan buffer in px
  overscanPx?: number;

  // Cell renderer
  renderCell: (cell: CellVM, state: GridRenderState) => React.ReactNode;

  // Editing / clipboard integration
  /** Called when a body cell receives a double-click. Wire to `useEditing.gridExtension`. */
  onCellDoubleClick?: (row: number, col: number) => void;
  /**
   * Additional keyboard handler, called before the built-in interaction handler.
   * If the extension calls `e.preventDefault()`, interaction navigation is suppressed.
   * Wire to `useEditing.gridExtension` and/or `useClipboard`.
   */
  keyboardExtension?: Readonly<{ onKeyDown: React.KeyboardEventHandler<HTMLDivElement> }>;

  // Accessibility
  /** ARIA label for the grid container. Defaults to "Data grid". */
  ariaLabel?: string;

  // Styling
  style?: React.CSSProperties;
  className?: string;
}>;

// Helper: extract min/max from a range, treating empty (end < start) as no contribution
const rMin = (r: { start: number; end: number }) => (r.end >= r.start ? r.start : Infinity);
const rMax = (r: { start: number; end: number }) => (r.end >= r.start ? r.end : -Infinity);

export const Grid = ({
  rowCount: rawRowCount,
  colCount: rawColCount,
  defaultRowHeight = 32,
  defaultColWidth = 120,
  colSizes,
  rowSizes,
  headerRowCount: rawHeaderRowCount = 1,
  pinnedColStartCount = 0,
  pinnedColEndCount = 0,
  overscanPx = 150,
  renderCell,
  onCellDoubleClick,
  keyboardExtension,
  ariaLabel = "Data grid",
  style,
  className,
}: GridProps) => {
  if (__DEV__) {
    if (rawRowCount < 0) console.warn("[hobom-grid] rowCount is negative:", rawRowCount);
    if (rawColCount < 0) console.warn("[hobom-grid] colCount is negative:", rawColCount);
    if (rawHeaderRowCount < 0)
      console.warn("[hobom-grid] headerRowCount is negative:", rawHeaderRowCount);
  }

  const rowCount = Math.max(0, rawRowCount);
  const colCount = Math.max(0, rawColCount);
  const headerRowCount = Math.max(0, rawHeaderRowCount);

  // rowCount prop = body rows only; kernel needs total (header + body).
  const totalRowCount = rowCount + headerRowCount;

  const { containerRef, rowAxis, colAxis, viewport, viewModel, handleScroll, scrollToCell } =
    useGridKernel({
      rowCount: totalRowCount,
      colCount,
      defaultRowHeight,
      defaultColWidth,
      colSizes,
      rowSizes,
      headerRowCount,
      pinnedColStartCount,
      pinnedColEndCount,
      overscanPx,
    });

  // Stable refs so interaction handlers always see the latest values
  // without being recreated on every scroll
  const viewportRef = useRef(viewport);

  // eslint-disable-next-line react-hooks/refs
  viewportRef.current = viewport;
  const rowAxisRef = useRef(rowAxis);

  // eslint-disable-next-line react-hooks/refs
  rowAxisRef.current = rowAxis;
  const colAxisRef = useRef(colAxis);

  // eslint-disable-next-line react-hooks/refs
  colAxisRef.current = colAxis;

  const {
    state: interactionState,
    pointerHandlers,
    keyboardHandlers,
  } = useInteraction(
    { rowCount: totalRowCount, colCount, headerRowCount },
    viewportRef,
    rowAxisRef,
    colAxisRef,
  );

  // Scroll to keep the focused cell visible after keyboard navigation.
  // Only fires when focusCell identity actually changes.
  const focusCell = interactionState.focusCell;
  useEffect(() => {
    if (focusCell == null) return;
    scrollToCell(focusCell.row, focusCell.col);
  }, [focusCell, scrollToCell]);

  const renderState = useMemo<GridRenderState>(
    () => ({ interactionState, viewport }),
    [interactionState, viewport],
  );

  // ----- Selection bitmap: O(R * area) build, O(1) per-cell lookup -----
  const selectionBitmap = useMemo(() => {
    const rowLo = Math.min(rMin(viewport.rows.header.range), rMin(viewport.rows.body.range));
    const rowHi = Math.max(rMax(viewport.rows.header.range), rMax(viewport.rows.body.range));
    const colLo = Math.min(
      rMin(viewport.cols.start.range),
      rMin(viewport.cols.main.range),
      rMin(viewport.cols.end.range),
    );
    const colHi = Math.max(
      rMax(viewport.cols.start.range),
      rMax(viewport.cols.main.range),
      rMax(viewport.cols.end.range),
    );

    return createSelectionBitmap(
      interactionState.selection.ranges,
      interactionState.focusCell,
      Number.isFinite(rowLo) ? rowLo : 0,
      Number.isFinite(rowHi) ? rowHi : -1,
      Number.isFinite(colLo) ? colLo : 0,
      Number.isFinite(colHi) ? colHi : -1,
    );
  }, [interactionState.selection.ranges, interactionState.focusCell, viewport]);

  // ----- Double-click → onCellDoubleClick -----
  const onCellDoubleClickRef = useRef(onCellDoubleClick);

  // eslint-disable-next-line react-hooks/refs
  onCellDoubleClickRef.current = onCellDoubleClick;

  const handleDoubleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      const cb = onCellDoubleClickRef.current;
      if (!cb) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const hit = hitTestGrid(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewportRef.current,
        rowAxisRef.current,
        colAxisRef.current,
        { headerRowCount, resizeHandleSlop: 0 },
      );
      if (hit.region === "cell" && hit.cell) {
        cb(hit.cell.row, hit.cell.col);
      }
    },
    // headerRowCount rarely changes; refs are stable
    [headerRowCount],
  );

  // ----- Keyboard: extension first, then interaction -----
  const keyboardExtensionRef = useRef(keyboardExtension);

  // eslint-disable-next-line react-hooks/refs
  keyboardExtensionRef.current = keyboardExtension;

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      keyboardExtensionRef.current?.onKeyDown(e);
      keyboardHandlers.onKeyDown(e); // bails if e.defaultPrevented
    },
    [keyboardHandlers],
  );

  const totalWidth = Number(viewport.totalWidthPx);
  const totalHeight = Number(viewport.totalHeightPx);
  const viewportWidth = Number(viewport.viewportWidthPx);
  const viewportHeight = Number(viewport.viewportHeightPx);

  // rowCount prop is already the body row count.
  const bodyRowCount = Math.max(0, rowCount);

  return (
    <div
      ref={containerRef}
      role="grid"
      aria-label={ariaLabel}
      aria-rowcount={bodyRowCount}
      aria-colcount={colCount}
      aria-multiselectable={true}
      style={{
        position: "relative",
        overflow: "auto",
        outline: "none",
        // Shrink-wrap to content width so the scrollbar sits right next to the last column.
        // When totalWidth > container width the max-width has no effect and horizontal scroll kicks in.
        maxWidth: totalWidth,
        ...style,
      }}
      className={className}
      tabIndex={0}
      onScroll={handleScroll}
      onDoubleClick={handleDoubleClick}
      {...pointerHandlers}
      onKeyDown={handleKeyDown}
      onFocus={keyboardHandlers.onFocus}
      onBlur={keyboardHandlers.onBlur}
    >
      {/* Scroll area sizer — creates the scrollable content dimensions */}
      <div
        aria-hidden="true"
        style={{
          width: totalWidth,
          height: totalHeight,
          pointerEvents: "none",
          flexShrink: 0,
        }}
      />

      {/*
       * Cell overlay — sticky to the top-left of the visible viewport.
       *
       * Layout trick:
       *   1. The sizer above pushes the scroll container to totalWidth × totalHeight.
       *   2. marginTop: -totalHeight pulls the sticky overlay back to y=0 of the container.
       *   3. position: sticky; top: 0; left: 0 locks it to the visible top-left corner
       *      even when the user scrolls.
       */}
      <div
        aria-hidden="true"
        style={{
          position: "sticky",
          top: 0,
          left: 0,
          marginTop: -totalHeight,
          width: viewportWidth,
          height: viewportHeight,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        {viewModel.cells.map((cell) => {
          const isFocused = focusCell?.row === cell.rowIndex && focusCell.col === cell.colIndex;

          return (
            <GridCell
              key={`${cell.kind}-${cell.rowIndex}-${cell.colIndex}`}
              cell={cell}
              isFocused={isFocused}
              isSelected={selectionBitmap.isSelected(cell.rowIndex, cell.colIndex)}
              renderCell={renderCell}
              renderState={renderState}
            />
          );
        })}
      </div>
    </div>
  );
};
