import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createGridKernel, createMeasuredAxis, px } from "@hobom-grid/core";
import type { MeasuredAxis, ViewportQuery } from "@hobom-grid/core";

type UseGridKernelSpec = Readonly<{
  rowCount: number;
  colCount: number;
  defaultRowHeight: number;
  defaultColWidth: number;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.rowCount, spec.defaultRowHeight],
  );

  const colAxis: MeasuredAxis = useMemo(
    () =>
      createMeasuredAxis({
        kind: "col",
        count: spec.colCount,
        estimateSizePx: spec.defaultColWidth,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.colCount, spec.defaultColWidth],
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  return {
    containerRef,
    rowAxis,
    colAxis,
    viewport,
    viewModel,
    handleScroll,
  };
};
