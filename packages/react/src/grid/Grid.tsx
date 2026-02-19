import { useRef, useMemo, useEffect } from "react";
import type { CellVM, InteractionKernelState, ViewportModel } from "@hobom-grid/core";
import { useGridKernel } from "../hooks/use-grid-kernel";
import { useInteraction } from "../hooks/use-interaction";

export type GridRenderState = Readonly<{
  interactionState: InteractionKernelState;
  viewport: ViewportModel;
}>;

export type GridProps = Readonly<{
  // Data size
  rowCount: number;
  colCount: number;

  // Default sizes (used as estimate until DOM measurement)
  defaultRowHeight?: number;
  defaultColWidth?: number;

  // Pre-set column sizes (px) keyed by column index
  colSizes?: Readonly<Record<number, number>>;

  // Grid structure
  headerRowCount?: number;
  pinnedColStartCount?: number;
  pinnedColEndCount?: number;

  // Overscan buffer in px
  overscanPx?: number;

  // Cell renderer
  renderCell: (cell: CellVM, state: GridRenderState) => React.ReactNode;

  // Styling
  style?: React.CSSProperties;
  className?: string;
}>;

export const Grid = ({
  rowCount,
  colCount,
  defaultRowHeight = 32,
  defaultColWidth = 120,
  colSizes,
  headerRowCount = 1,
  pinnedColStartCount = 0,
  pinnedColEndCount = 0,
  overscanPx = 150,
  renderCell,
  style,
  className,
}: GridProps) => {
  const { containerRef, rowAxis, colAxis, viewport, viewModel, handleScroll, scrollToCell } =
    useGridKernel({
      rowCount,
      colCount,
      defaultRowHeight,
      defaultColWidth,
      colSizes,
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
  } = useInteraction({ rowCount, colCount, headerRowCount }, viewportRef, rowAxisRef, colAxisRef);

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

  const totalWidth = Number(viewport.totalWidthPx);
  const totalHeight = Number(viewport.totalHeightPx);
  const viewportWidth = Number(viewport.viewportWidthPx);
  const viewportHeight = Number(viewport.viewportHeightPx);

  return (
    <div
      ref={containerRef}
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
      {...pointerHandlers}
      {...keyboardHandlers}
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
        {viewModel.cells.map((cell) => (
          <div
            key={`${cell.kind}-${cell.rowIndex}-${cell.colIndex}`}
            style={{
              position: "absolute",
              transform: `translate(${cell.x}px, ${cell.y}px)`,
              width: cell.width,
              height: cell.height,
              overflow: "hidden",
              boxSizing: "border-box",
              pointerEvents: "auto",
              // Header and pinned cells must stay on top of scrolling body cells.
              zIndex:
                cell.kind === "header" || cell.kind === "cornerStart" || cell.kind === "cornerEnd"
                  ? 2
                  : cell.kind === "pinnedStart" || cell.kind === "pinnedEnd"
                    ? 1
                    : 0,
            }}
          >
            {renderCell(cell, renderState)}
          </div>
        ))}
      </div>
    </div>
  );
};
