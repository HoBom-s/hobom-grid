import { createViewportEngine } from "../viewport/viewport-engine";
import { createViewModelBuilder } from "../viewmodel/view-model-builder";
import { px, type Anchor, type ViewportQuery } from "../contracts/contracts-model";
import type { MeasuredAxis, MeasureReport } from "../axis/measured-axis";
import type { ViewportModel } from "../viewport/viewport-model";
import type { ViewModel } from "../viewmodel/view-model";

type GridKernelSpec = Readonly<{
  rowAxis: MeasuredAxis;
  colAxis: MeasuredAxis;

  headerRowCount: number;
  pinnedColStartCount: number;
  pinnedColEndCount: number;
}>;

type GridKernel = Readonly<{
  /**
   * Main entrypoint:
   * - compute viewport slices and transforms
   * - build flat render model (cells[])
   */
  queryViewport(query: ViewportQuery): Readonly<{
    viewport: ViewportModel;
    viewModel: ViewModel;
  }>;

  /**
   * Measurement entrypoint:
   * - apply measured size
   * - compute scroll adjustment to prevent jump
   * - return nextQuery to be used by the adapter
   */
  reportMeasuredSize(
    report: MeasureReport,
    currentQuery: ViewportQuery,
  ): Readonly<{
    changed: boolean;
    nextQuery: ViewportQuery;
  }>;
}>;

/**
 * Recompute anchor coordinates for a fixed anchor identity.
 *
 * Why?
 * - The viewport engine’s default anchor is “top-left visible”.
 * - After measurements, visible start may shift by 1 item.
 * - For scroll stabilization we must keep the *same anchor identity* for one cycle.
 */
const computeAnchorCoords = (
  vp: ViewportModel,
  rows: MeasuredAxis,
  cols: MeasuredAxis,
  a: Anchor,
): Anchor => {
  const vw = Number(vp.viewportWidthPx);
  const scrollLeft = Number(vp.scrollLeftPx);
  const scrollTop = Number(vp.scrollTopPx);

  const rowOffset = Number(rows.getOffsetPx(a.rowIndex));
  const colOffset = Number(cols.getOffsetPx(a.colIndex));

  // Y: header is sticky, body is translated under it
  const headerRange = vp.rows.header.range;
  const inHeader =
    headerRange.end >= headerRange.start &&
    a.rowIndex >= headerRange.start &&
    a.rowIndex <= headerRange.end;
  const viewportY = inHeader ? rowOffset : Number(vp.transforms.rowBodyY) + (rowOffset - scrollTop);

  // X: pinned start/end regions do not translate with scrollLeft
  const startRange = vp.cols.start.range;
  const endRange = vp.cols.end.range;

  let viewportX = 0;

  const inPinnedStart =
    startRange.end >= startRange.start &&
    a.colIndex >= startRange.start &&
    a.colIndex <= startRange.end;

  const inPinnedEnd =
    endRange.end >= endRange.start && a.colIndex >= endRange.start && a.colIndex <= endRange.end;

  if (inPinnedStart) {
    viewportX = colOffset;
  } else if (inPinnedEnd) {
    const pinnedEndWidthPx =
      endRange.end >= endRange.start
        ? Number(cols.getOffsetPx(endRange.end + 1)) - Number(cols.getOffsetPx(endRange.start))
        : 0;

    const base = vw - pinnedEndWidthPx;
    const rel = colOffset - Number(vp.cols.end.offsetPx);
    viewportX = base + rel;
  } else {
    viewportX = Number(vp.transforms.colMainX) + (colOffset - scrollLeft);
  }

  return {
    rowIndex: a.rowIndex,
    colIndex: a.colIndex,
    viewportX: px(viewportX),
    viewportY: px(viewportY),
  };
};

export const createGridKernel = (spec: GridKernelSpec): GridKernel => {
  const rows = spec.rowAxis;
  const cols = spec.colAxis;

  const viewportEngine = createViewportEngine({
    rows,
    cols,
    headerRowCount: spec.headerRowCount,
    pinnedColStartCount: spec.pinnedColStartCount,
    pinnedColEndCount: spec.pinnedColEndCount,
  });

  const builder = createViewModelBuilder({ rows, cols });

  /**
   * One-shot preferred anchor:
   * - Set during `reportMeasuredSize`
   * - Applied during the next `queryViewport`
   * This prevents the “anchor identity changes” issue you just hit in tests.
   */
  let preferredAnchor: Anchor | null = null;

  const queryViewport = (query: ViewportQuery) => {
    let viewport = viewportEngine.compute(query);

    // Stabilization hook:
    // apply the previous anchor identity once, so consumers see continuity.
    if (preferredAnchor) {
      viewport = {
        ...viewport,
        anchor: computeAnchorCoords(viewport, rows, cols, preferredAnchor),
      };
      // one-shot hint: clear after applying once
      preferredAnchor = null;
    }

    const viewModel = builder.build(viewport);
    return { viewport, viewModel };
  };

  const reportMeasuredSize = (report: MeasureReport, currentQuery: ViewportQuery) => {
    // 1) snapshot current anchor BEFORE any size changes
    const before = viewportEngine.compute(currentQuery);
    const anchor = before.anchor;

    // 2) apply measurement to the relevant axis
    const changed =
      report.axis === "row"
        ? rows.reportMeasuredSize(report).changed
        : cols.reportMeasuredSize(report).changed;

    if (!changed) return { changed: false, nextQuery: currentQuery };

    // 3) ensure next query maintains same anchor identity (one cycle)
    preferredAnchor = anchor;

    // 4) compute scroll adjustments per axis
    const nextScrollTop =
      report.axis === "row"
        ? rows.computeAnchorAdjust({
            anchorIndex: anchor.rowIndex,
            anchorViewportPosPx: anchor.viewportY,
            scrollOffsetPx: currentQuery.scrollTopPx,
          }).nextScrollOffsetPx
        : currentQuery.scrollTopPx;

    const nextScrollLeft =
      report.axis === "col"
        ? cols.computeAnchorAdjust({
            anchorIndex: anchor.colIndex,
            anchorViewportPosPx: anchor.viewportX,
            scrollOffsetPx: currentQuery.scrollLeftPx,
          }).nextScrollOffsetPx
        : currentQuery.scrollLeftPx;

    return {
      changed: true,
      nextQuery: { ...currentQuery, scrollLeftPx: nextScrollLeft, scrollTopPx: nextScrollTop },
    };
  };

  return { queryViewport, reportMeasuredSize };
};
