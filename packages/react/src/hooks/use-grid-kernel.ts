import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGridKernel, createMeasuredAxis, px } from "@hobom-grid/core";
import type { MeasuredAxis, ViewportQuery } from "@hobom-grid/core";

type UseGridKernelSpec = Readonly<{
  rowCount: number;
  colCount: number;
  defaultRowHeight: number;
  defaultColWidth: number;
  /** Pre-set column sizes (px) keyed by column index. Applied as initialMeasured to the col axis. */
  colSizes?: Readonly<Record<number, number>>;
  headerRowCount: number;
  pinnedColStartCount: number;
  pinnedColEndCount: number;
  overscanPx: number;
}>;

export type UseGridKernelResult = ReturnType<typeof useGridKernel>;

export const useGridKernel = (spec: UseGridKernelSpec) => {
  const rowAxis: MeasuredAxis = useMemo(
    () =>
      createMeasuredAxis({
        kind: "row",
        count: spec.rowCount,
        estimateSizePx: spec.defaultRowHeight,
      }),

    [spec.rowCount, spec.defaultRowHeight],
  );

  const colAxis: MeasuredAxis = useMemo(
    () =>
      createMeasuredAxis({
        kind: "col",
        count: spec.colCount,
        estimateSizePx: spec.defaultColWidth,
        initialMeasured: spec.colSizes,
      }),

    [spec.colCount, spec.defaultColWidth, spec.colSizes],
  );

  const kernel = useMemo(
    () =>
      createGridKernel({
        rowAxis,
        colAxis,
        headerRowCount: spec.headerRowCount,
        pinnedColStartCount: spec.pinnedColStartCount,
        pinnedColEndCount: spec.pinnedColEndCount,
      }),

    [rowAxis, colAxis, spec.headerRowCount, spec.pinnedColStartCount, spec.pinnedColEndCount],
  );

  const [query, setQuery] = useState<ViewportQuery>(() => ({
    scrollLeftPx: px(0),
    scrollTopPx: px(0),
    viewportWidthPx: px(0),
    viewportHeightPx: px(0),
    overscan: { type: "px", value: px(spec.overscanPx) },
  }));

  const { viewport, viewModel } = useMemo(() => kernel.queryViewport(query), [kernel, query]);

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      if (!entry) return;
      const { width, height } = entry.contentRect;
      setQuery((q) => ({
        ...q,
        viewportWidthPx: px(width),
        viewportHeightPx: px(height),
      }));
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    setQuery((q) => ({
      ...q,
      scrollLeftPx: px(el.scrollLeft),
      scrollTopPx: px(el.scrollTop),
    }));
  }, []);

  /**
   * Scroll the minimum amount to bring cell (row, col) into the visible area.
   *
   * - Header rows are sticky — vertical scroll is skipped for them.
   * - Pinned columns are always visible — horizontal scroll is skipped for them.
   * - Uses "minimal scroll" strategy: only moves if the cell is out of view,
   *   and moves the smallest amount needed (not center-on-cell).
   */
  const scrollToCell = useCallback(
    (row: number, col: number) => {
      const el = containerRef.current;
      if (!el) return;

      const totalRowCount = rowAxis.getCount();
      const totalColCount = colAxis.getCount();
      if (row < 0 || row >= totalRowCount || col < 0 || col >= totalColCount) return;

      const vw = el.clientWidth;
      const vh = el.clientHeight;

      // Header height = content offset of first body row
      const headerHeight =
        spec.headerRowCount > 0 ? Number(rowAxis.getOffsetPx(spec.headerRowCount)) : 0;

      // Pinned column widths
      const pinnedStartCount = spec.pinnedColStartCount;
      const pinnedEndCount = spec.pinnedColEndCount;
      const pinnedStartWidth =
        pinnedStartCount > 0 ? Number(colAxis.getOffsetPx(pinnedStartCount)) : 0;
      const pinnedEndWidth =
        pinnedEndCount > 0
          ? Number(colAxis.getTotalSizePx()) -
            Number(colAxis.getOffsetPx(totalColCount - pinnedEndCount))
          : 0;

      // Cell bounds in content space
      const cellTop = Number(rowAxis.getOffsetPx(row));
      const cellBottom = cellTop + Number(rowAxis.getSizePx(row));
      const cellLeft = Number(colAxis.getOffsetPx(col));
      const cellRight = cellLeft + Number(colAxis.getSizePx(col));

      const curScrollTop = el.scrollTop;
      const curScrollLeft = el.scrollLeft;

      // ---- Vertical (skip for header rows) ----
      // With cell formula y = rowOffset - scrollTop:
      //   visible when: headerHeight <= rowOffset - scrollTop < viewportHeight
      //   scroll-to-top:    scrollTop = cellTop - headerHeight
      //   scroll-to-bottom: scrollTop = cellBottom - vh
      let nextScrollTop = curScrollTop;
      const isHeaderRow = row < spec.headerRowCount;

      if (!isHeaderRow) {
        if (cellTop - headerHeight < curScrollTop) {
          nextScrollTop = cellTop - headerHeight;
        } else if (cellBottom > curScrollTop + vh) {
          nextScrollTop = cellBottom - vh;
        }
      }

      // ---- Horizontal (skip for pinned columns) ----
      let nextScrollLeft = curScrollLeft;
      const isPinnedStart = col < pinnedStartCount;
      const isPinnedEnd = pinnedEndCount > 0 && col >= totalColCount - pinnedEndCount;

      if (!isPinnedStart && !isPinnedEnd) {
        const mainWidth = Math.max(0, vw - pinnedStartWidth - pinnedEndWidth);
        if (cellLeft < curScrollLeft) {
          nextScrollLeft = cellLeft;
        } else if (cellRight > curScrollLeft + mainWidth) {
          nextScrollLeft = cellRight - mainWidth;
        }
      }

      if (nextScrollTop === curScrollTop && nextScrollLeft === curScrollLeft) return;

      // Set DOM scroll immediately (fires async scroll event)
      el.scrollTop = nextScrollTop;
      el.scrollLeft = nextScrollLeft;

      // Also update React state synchronously so the viewport renders
      // in the same pass without waiting for the scroll event.
      setQuery((q) => ({
        ...q,
        scrollTopPx: px(nextScrollTop),
        scrollLeftPx: px(nextScrollLeft),
      }));
    },
    // rowAxis / colAxis are stable objects (only recreated when count/size changes)
    [rowAxis, colAxis, spec.headerRowCount, spec.pinnedColStartCount, spec.pinnedColEndCount],
  );

  return {
    containerRef,
    rowAxis,
    colAxis,
    viewport,
    viewModel,
    handleScroll,
    scrollToCell,
  };
};
