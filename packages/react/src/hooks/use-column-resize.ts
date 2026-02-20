import { useCallback, useRef, useState } from "react";

export type UseColumnResizeResult = Readonly<{
  /** Current width for each original column index (origIdx → px). */
  colWidths: Record<number, number>;
  /**
   * Call from a resize-handle's `onPointerDown` to start a live resize.
   * Pass the original column index and the pointer's clientX.
   * The caller is responsible for `e.stopPropagation()` and `e.preventDefault()`.
   */
  startResize: (origColIdx: number, clientX: number) => void;
  /** Reset a column to its initial width (removes the override). */
  resetWidth: (origColIdx: number) => void;
}>;

/**
 * Manages live column resize via pointer drag.
 *
 * Render a thin resize handle at the right edge of each header cell and wire it up:
 * ```tsx
 * <div
 *   style={{ position:"absolute", right:0, top:0, bottom:0, width:6, cursor:"col-resize" }}
 *   onPointerDown={(e) => {
 *     colResize.startResize(origColIdx, e.clientX);
 *     e.stopPropagation();
 *     e.preventDefault();
 *   }}
 * />
 * ```
 * Pass `colResize.colWidths` (remapped to visual indices) as `colSizes` to `<Grid>`.
 */
export const useColumnResize = (
  initialWidths: Record<number, number>,
  minWidth = 40,
): UseColumnResizeResult => {
  const [colWidths, setColWidths] = useState<Record<number, number>>(initialWidths);

  // Ref so startResize closure always reads the latest widths without re-creating.
  const colWidthsRef = useRef(colWidths);
  // eslint-disable-next-line react-hooks/refs
  colWidthsRef.current = colWidths;

  const startResize = useCallback(
    (origColIdx: number, clientX: number) => {
      const startWidth = colWidthsRef.current[origColIdx] ?? 120;
      const startX = clientX;

      const onMove = (e: PointerEvent) => {
        const newWidth = Math.max(minWidth, startWidth + (e.clientX - startX));
        setColWidths((prev) => ({ ...prev, [origColIdx]: newWidth }));
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    },
    [minWidth],
  );

  const resetWidth = useCallback((origColIdx: number) => {
    setColWidths((prev) => {
      const next = { ...prev };
      delete next[origColIdx];
      return next;
    });
  }, []);

  return { colWidths, startResize, resetWidth };
};
