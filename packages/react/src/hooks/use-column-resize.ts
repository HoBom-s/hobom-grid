import { useCallback, useRef, useState } from "react";

export type UseColumnResizeResult = Readonly<{
  /** Current width for each original column index (origIdx → px). */
  colWidths: Record<number, number>;
  /**
   * Call from a resize-handle's `onPointerDown` to start a live resize.
   * Pass the original column index and the React pointer event.
   * The caller is responsible for `e.stopPropagation()` and `e.preventDefault()`.
   *
   * Uses `setPointerCapture` so the drag continues even when the pointer
   * leaves the element or the browser window.
   */
  startResize: (origColIdx: number, e: React.PointerEvent<HTMLElement>) => void;
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
 *     colResize.startResize(origColIdx, e);
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
    (origColIdx: number, e: React.PointerEvent<HTMLElement>) => {
      const el = e.currentTarget;
      el.setPointerCapture(e.pointerId);

      const startWidth = colWidthsRef.current[origColIdx] ?? 120;
      const startX = e.clientX;

      const onMove = (ev: PointerEvent) => {
        const newWidth = Math.max(minWidth, startWidth + (ev.clientX - startX));
        setColWidths((prev) => ({ ...prev, [origColIdx]: newWidth }));
      };

      const onUp = () => {
        el.removeEventListener("pointermove", onMove);
        el.removeEventListener("pointerup", onUp);
      };

      el.addEventListener("pointermove", onMove);
      el.addEventListener("pointerup", onUp);
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
