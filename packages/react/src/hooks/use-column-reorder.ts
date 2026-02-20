import { useCallback, useRef, useState } from "react";

export type DragReorderState = Readonly<{
  /** Visual index of the column being dragged. */
  fromVisual: number;
  /** Visual index of the current drop target. */
  overVisual: number;
}>;

export type UseColumnReorderResult = Readonly<{
  /** Drag state while a reorder is in progress, otherwise null. */
  dragState: DragReorderState | null;
  /**
   * Call from each header cell's `renderCell` on every render to keep column
   * position data fresh for drop-target computation.
   *
   * `x` is the viewport-relative x coordinate of the column (i.e. `cell.x`).
   */
  reportColBounds: (visualIdx: number, x: number, width: number) => void;
  /**
   * Call from a header cell's `onPointerDown` to start a reorder drag.
   *
   * `containerLeft` = the grid container's absolute left edge.
   * Compute it as: `e.currentTarget.getBoundingClientRect().left - cell.x`
   * (works correctly regardless of horizontal scroll).
   *
   * `visibleColCount` = number of currently visible columns (used to clamp drop target).
   *
   * The caller is responsible for `e.stopPropagation()`.
   */
  startReorder: (
    visualColIdx: number,
    clientX: number,
    containerLeft: number,
    visibleColCount: number,
  ) => void;
}>;

/**
 * Manages column drag-to-reorder.
 *
 * The hook is stateless about *which* columns exist — it only tracks
 * `fromVisual` → `toVisual` and calls `onReorder(from, to)` on drop.
 * The caller manages the actual column-order array.
 *
 * Usage in renderCell (header):
 * ```tsx
 * colReorder.reportColBounds(cell.colIndex, cell.x, cell.width);
 *
 * <div
 *   onPointerDown={(e) => {
 *     const containerLeft = e.currentTarget.getBoundingClientRect().left - cell.x;
 *     colReorder.startReorder(cell.colIndex, e.clientX, containerLeft, visibleCols.length);
 *     e.stopPropagation();
 *   }}
 * >
 * ```
 */
export const useColumnReorder = (
  onReorder: (fromVisual: number, toVisual: number) => void,
): UseColumnReorderResult => {
  const [dragState, setDragState] = useState<DragReorderState | null>(null);

  // Viewport-relative bounds for each visual column.
  // Updated from reportColBounds every render so onMove always has fresh positions.
  const colBoundsRef = useRef<Array<{ x: number; width: number } | undefined>>([]);

  const onReorderRef = useRef(onReorder);
  // eslint-disable-next-line react-hooks/refs
  onReorderRef.current = onReorder;

  const reportColBounds = useCallback((visualIdx: number, x: number, width: number) => {
    colBoundsRef.current[visualIdx] = { x, width };
  }, []);

  const startReorder = useCallback(
    (
      visualColIdx: number,
      _startClientX: number,
      containerLeft: number,
      visibleColCount: number,
    ) => {
      let currentOver = visualColIdx;
      setDragState({ fromVisual: visualColIdx, overVisual: visualColIdx });

      const onMove = (e: PointerEvent) => {
        // relX is the pointer position in viewport-cell space (same coord as cell.x).
        const relX = e.clientX - containerLeft;
        const bounds = colBoundsRef.current;

        // Find the rightmost column whose midpoint is to the left of the pointer.
        let newOver = 0;
        for (let i = 0; i < visibleColCount; i++) {
          const b = bounds[i];
          if (!b) continue;
          if (relX >= b.x + b.width / 2) newOver = i;
        }
        newOver = Math.max(0, Math.min(visibleColCount - 1, newOver));

        if (newOver !== currentOver) {
          currentOver = newOver;
          setDragState((prev) => (prev ? { ...prev, overVisual: newOver } : null));
        }
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        setDragState((prev) => {
          if (!prev || prev.fromVisual === prev.overVisual) return null;
          onReorderRef.current(prev.fromVisual, prev.overVisual);
          return null;
        });
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [],
  );

  return { dragState, reportColBounds, startReorder };
};
