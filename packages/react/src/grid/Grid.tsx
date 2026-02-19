import { useRef, useMemo } from "react";
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
  headerRowCount = 1,
  pinnedColStartCount = 0,
  pinnedColEndCount = 0,
  overscanPx = 150,
  renderCell,
  style,
  className,
}: GridProps) => {
  const { containerRef, rowAxis, colAxis, viewport, viewModel, handleScroll } = useGridKernel({
    rowCount,
    colCount,
    defaultRowHeight,
    defaultColWidth,
    headerRowCount,
    pinnedColStartCount,
    pinnedColEndCount,
    overscanPx,
  });

  // Stable refs so interaction handlers always see the latest values
  // without being recreated on every scroll
  const viewportRef = useRef(viewport);
  viewportRef.current = viewport;
  const rowAxisRef = useRef(rowAxis);
  rowAxisRef.current = rowAxis;
  const colAxisRef = useRef(colAxis);
  colAxisRef.current = colAxis;

  const {
    state: interactionState,
    pointerHandlers,
    keyboardHandlers,
  } = useInteraction({ rowCount, colCount, headerRowCount }, viewportRef, rowAxisRef, colAxisRef);

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
            }}
          >
            {renderCell(cell, renderState)}
          </div>
        ))}
      </div>
    </div>
  );
};
