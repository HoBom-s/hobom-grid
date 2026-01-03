import { emptySlice, type ViewportModel } from "./viewport-model";
import { px, type Anchor, type Px, type ViewportQuery } from "../contracts/contracts-model";
import type { VirtualAxis } from "../axis/virtual-axis";
import { clamp } from "../contracts/contracts-math";

type ViewportEngineSpec = Readonly<{
  rows: VirtualAxis;
  cols: VirtualAxis;

  /**
   * Sticky header rows count (top).
   * - The kernel only computes layout.
   * - Adapter decides whether to use DOM sticky, separate layer, etc.
   */
  headerRowCount: number;

  /** Left pinned columns count. */
  pinnedColStartCount: number;

  /** Right pinned columns count. */
  pinnedColEndCount: number;
}>;

/**
 * Overscan conversion:
 * - px overscan is direct
 * - count overscan is approximated using a cheap sample size (index 0).
 *
 * In later phases, you may replace this with:
 * - average of measured sizes
 * - median sample in visible region
 */
const toOverscanPx = (overscan: ViewportQuery["overscan"], axis: VirtualAxis): Px => {
  if (overscan.type === "px") return overscan.value;
  const n = overscan.value;
  if (n <= 0) return px(0);
  const sample = axis.getCount() > 0 ? Number(axis.getSizePx(0)) : 0;
  return px(sample * n);
};

export const createViewportEngine = (spec: ViewportEngineSpec) => {
  const rows = spec.rows;
  const cols = spec.cols;

  const headerCount = Math.max(0, spec.headerRowCount);
  const pinnedStartCount = Math.max(0, spec.pinnedColStartCount);
  const pinnedEndCount = Math.max(0, spec.pinnedColEndCount);

  /**
   * The pure function of virtualization.
   * Given query (scroll + viewport size + overscan),
   * compute the ViewportModel (slices + transforms + anchor).
   */
  const compute = (q: ViewportQuery): ViewportModel => {
    // total content sizes
    const totalW = Number(cols.getTotalSizePx());
    const totalH = Number(rows.getTotalSizePx());

    // viewport sizes
    const vw = Math.max(0, Number(q.viewportWidthPx));
    const vh = Math.max(0, Number(q.viewportHeightPx));

    // clamp scroll to avoid invalid regions
    const maxScrollLeft = Math.max(0, totalW - vw);
    const maxScrollTop = Math.max(0, totalH - vh);

    const scrollLeft = clamp(Number(q.scrollLeftPx), 0, maxScrollLeft);
    const scrollTop = clamp(Number(q.scrollTopPx), 0, maxScrollTop);

    // ---------------------------
    // ROWS: header + body slices
    // ---------------------------

    // header rows (sticky, in content coordinates)
    const headerEnd = Math.min(rows.getCount() - 1, headerCount - 1);
    const headerSlice =
      headerCount === 0 || rows.getCount() === 0
        ? emptySlice()
        : { range: { start: 0, end: headerEnd }, offsetPx: px(0) };

    // header height is sum of header row sizes
    const headerHeightPx =
      headerSlice.range.end >= headerSlice.range.start
        ? Number(rows.getOffsetPx(headerSlice.range.end + 1)) -
          Number(rows.getOffsetPx(headerSlice.range.start))
        : 0;

    // body rows begin after header
    const bodyRowStart = Math.min(rows.getCount(), headerCount);
    const bodyRowCount = Math.max(0, rows.getCount() - bodyRowStart);

    const rowOverscanPx = toOverscanPx(q.overscan, rows);

    // virtualize visible body rows only
    const bodySlice =
      bodyRowCount === 0
        ? emptySlice()
        : (() => {
            const seg = rows.getVisibleSegment(
              px(scrollTop),
              px(vh - headerHeightPx),
              rowOverscanPx,
            );
            // clamp to [bodyRowStart..end]
            const start = clamp(seg.range.start, bodyRowStart, rows.getCount() - 1);
            const end = clamp(seg.range.end, start, rows.getCount() - 1);
            return { range: { start, end }, offsetPx: rows.getOffsetPx(start) };
          })();

    // ---------------------------
    // COLS: pinned start / main / pinned end
    // ---------------------------
    const colCount = cols.getCount();
    const startPinnedEnd = Math.min(colCount - 1, pinnedStartCount - 1);
    const endPinnedStart = Math.max(0, colCount - pinnedEndCount);

    // pinned widths determine how much space remains for the main scrollable region
    const pinnedStartSlice =
      pinnedStartCount === 0 || colCount === 0
        ? emptySlice()
        : { range: { start: 0, end: startPinnedEnd }, offsetPx: px(0) };

    const pinnedEndSlice =
      pinnedEndCount === 0 || colCount === 0
        ? emptySlice()
        : {
            range: { start: endPinnedStart, end: colCount - 1 },
            offsetPx: cols.getOffsetPx(endPinnedStart),
          };

    const pinnedStartWidthPx =
      pinnedStartSlice.range.end >= pinnedStartSlice.range.start
        ? Number(cols.getOffsetPx(pinnedStartSlice.range.end + 1)) -
          Number(cols.getOffsetPx(pinnedStartSlice.range.start))
        : 0;

    const pinnedEndWidthPx =
      pinnedEndSlice.range.end >= pinnedEndSlice.range.start
        ? Number(cols.getOffsetPx(pinnedEndSlice.range.end + 1)) -
          Number(cols.getOffsetPx(pinnedEndSlice.range.start))
        : 0;

    const mainViewportWidth = Math.max(0, vw - pinnedStartWidthPx - pinnedEndWidthPx);
    const colOverscanPx = toOverscanPx(q.overscan, cols);

    const mainSlice =
      colCount === 0
        ? emptySlice()
        : (() => {
            const seg = cols.getVisibleSegment(
              px(scrollLeft),
              px(mainViewportWidth),
              colOverscanPx,
            );

            // exclude pinned start/end from the main slice
            const minMain = pinnedStartCount;
            const maxMain = Math.max(minMain - 1, colCount - pinnedEndCount - 1);
            if (maxMain < minMain) return emptySlice();

            const start = clamp(seg.range.start, minMain, maxMain);
            const end = clamp(seg.range.end, start, maxMain);
            return { range: { start, end }, offsetPx: cols.getOffsetPx(start) };
          })();

    // ---------------------------
    // Anchor (default): pick top-left visible body cell
    // ---------------------------

    const anchorRow = bodySlice.range.end >= bodySlice.range.start ? bodySlice.range.start : 0;
    const anchorCol =
      mainSlice.range.end >= mainSlice.range.start
        ? mainSlice.range.start
        : pinnedStartSlice.range.end >= pinnedStartSlice.range.start
          ? pinnedStartSlice.range.start
          : pinnedEndSlice.range.end >= pinnedEndSlice.range.start
            ? pinnedEndSlice.range.start
            : 0;

    // anchor coordinates in viewport space:
    // - pinned start: content offset is directly in viewport (no scroll)
    // - pinned end: content offset is relative to pinned end start, placed at the right side
    // - main: translated by scrollLeft and shifted by pinnedStartWidth
    const anchorOffsetX = Number(cols.getOffsetPx(anchorCol));
    let anchorViewportX = 0;

    if (
      pinnedStartSlice.range.end >= pinnedStartSlice.range.start &&
      anchorCol <= pinnedStartSlice.range.end
    ) {
      anchorViewportX = anchorOffsetX;
    } else if (
      pinnedEndSlice.range.end >= pinnedEndSlice.range.start &&
      anchorCol >= pinnedEndSlice.range.start
    ) {
      const base = vw - pinnedEndWidthPx;
      const rel = anchorOffsetX - Number(pinnedEndSlice.offsetPx);
      anchorViewportX = base + rel;
    } else {
      anchorViewportX = pinnedStartWidthPx + (anchorOffsetX - scrollLeft);
    }

    // For Y:
    // - header: sticky, placed at y = offset(row)
    // - body: placed at y = headerHeight + (offset(row) - scrollTop)
    const anchorOffsetY = Number(rows.getOffsetPx(anchorRow));
    const inHeader =
      headerSlice.range.end >= headerSlice.range.start && anchorRow <= headerSlice.range.end;
    const anchorViewportY = inHeader ? anchorOffsetY : headerHeightPx + (anchorOffsetY - scrollTop);

    const anchor: Anchor = {
      rowIndex: anchorRow,
      colIndex: anchorCol,
      viewportX: px(anchorViewportX),
      viewportY: px(anchorViewportY),
    };

    return {
      viewportWidthPx: px(vw),
      viewportHeightPx: px(vh),
      scrollLeftPx: px(scrollLeft),
      scrollTopPx: px(scrollTop),

      totalWidthPx: px(totalW),
      totalHeightPx: px(totalH),

      rows: { header: headerSlice, body: bodySlice },
      cols: { start: pinnedStartSlice, main: mainSlice, end: pinnedEndSlice },

      transforms: {
        colPinnedStartX: px(0),
        colMainX: px(pinnedStartWidthPx),
        colPinnedEndX: px(Math.max(0, vw - pinnedEndWidthPx)),
        rowHeaderY: px(0),
        rowBodyY: px(headerHeightPx),
      },

      anchor,
    };
  };

  return { compute };
};
