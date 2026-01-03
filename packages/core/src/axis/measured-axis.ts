import { px } from "../contracts/contracts-model";
import { assertFiniteNonNegative, assertNonNegativeInt, clamp } from "../contracts/contracts-math";
import { Fenwick } from "./fenwick.helper";
import type { AxisKind, Px } from "../contracts/contracts-model";
import type { VirtualAxis, VisibleSegment } from "./virtual-axis";

type MeasuredAxisSpec = Readonly<{
  kind: AxisKind;
  count: number;

  /**
   * Estimate used until the real measured size is reported.
   * - In real grids, most rows/cols are unknown initially.
   * - Estimate keeps scrolling smooth and allows early rendering.
   */
  estimateSizePx: number;

  /**
   * Optional initial known measurements (e.g., header row fixed height).
   * Keys are indices, values are sizes in px.
   */
  initialMeasured?: Readonly<Record<number, number>>;
}>;

export type MeasureReport = Readonly<{
  axis: AxisKind;
  index: number;
  sizePx: Px;
}>;

export type AnchorAdjustInput = Readonly<{
  /**
   * Which item should remain visually stable after measurement update.
   * Typically, the “anchor” picked from the current viewport (e.g., top-left visible).
   */
  anchorIndex: number;

  /**
   * Anchor’s position in viewport space (px from viewport start).
   * If we keep this constant, user perceives “no jump”.
   */
  anchorViewportPosPx: Px;

  /** Current scroll offset (px) along this axis. */
  scrollOffsetPx: Px;
}>;

export type AnchorAdjustResult = Readonly<{
  /** Recommended next scroll offset to keep anchor stable. */
  nextScrollOffsetPx: Px;

  /** delta = next - previous */
  deltaPx: Px;
}>;

export type MeasuredAxis = VirtualAxis &
  Readonly<{
    /**
     * Replace estimate with a measured size.
     * Implementation updates prefix sums (Fenwick) incrementally.
     */
    reportMeasuredSize(report: MeasureReport): Readonly<{
      changed: boolean;
      prevSizePx: Px;
      nextSizePx: Px;
    }>;

    /**
     * Compute scroll adjustment to keep anchor stable:
     * offset(anchorIndex) - scroll == anchorViewportPos
     */
    computeAnchorAdjust(input: AnchorAdjustInput): AnchorAdjustResult;
  }>;

export const createMeasuredAxis = (spec: MeasuredAxisSpec): MeasuredAxis => {
  assertNonNegativeInt(spec.count, "count");
  assertFiniteNonNegative(spec.estimateSizePx, "estimateSizePx");

  const count = spec.count;
  const estimate = spec.estimateSizePx;

  /**
   * `sizes[i]` stores the current best-known size:
   * - starts as estimate
   * - overwritten with measured size later
   */
  const sizes = new Float64Array(count);
  for (let i = 0; i < count; i++) sizes[i] = estimate;

  if (spec.initialMeasured) {
    for (const [k, v] of Object.entries(spec.initialMeasured)) {
      const idx = Number(k);
      if (!Number.isInteger(idx) || idx < 0 || idx >= count) continue;
      if (!Number.isFinite(v) || v < 0) continue;
      sizes[idx] = v;
    }
  }

  /**
   * Fenwick tree enables:
   * - getOffsetPx(i) in O(logN)
   * - update size at i in O(logN)
   * - findIndexAtOffsetPx in O(logN) via lowerBound
   *
   * This is what makes “variable size + frequent measurement updates” practical.
   */
  const fenwick = new Fenwick(count);
  fenwick.buildFrom(sizes);

  const getCount = () => count;

  const getSizePx = (index: number): Px => {
    if (count === 0) return px(0);
    if (index < 0 || index >= count) throw new Error(`index out of range: ${index}`);
    return px(sizes[index]);
  };

  /**
   * Offset is prefix sum of sizes[0..index-1]
   * - index == 0 => 0
   * - index == count => total size
   */
  const getOffsetPx = (index: number): Px => {
    if (count === 0) return px(0);
    if (index < 0 || index > count) throw new Error(`index out of range: ${index}`);
    return px(fenwick.sumPrefixExclusive(index));
  };

  const getTotalSizePx = (): Px => px(fenwick.sumAll());

  /**
   * Find i such that:
   * offset(i) <= x < offset(i+1)
   * This powers virtualization: “which row/col is at this scroll offset?”
   */
  const findIndexAtOffsetPx = (offsetPx: Px): number => {
    if (count === 0) return -1;
    const off = Number(offsetPx);
    if (off <= 0) return 0;
    const total = fenwick.sumAll();
    if (off >= total) return count - 1;
    return fenwick.lowerBound(off);
  };

  /**
   * Compute visible inclusive range [start..end] for the given viewport
   * after applying overscan in px.
   */
  const getVisibleSegment = (
    scrollOffsetPx: Px,
    viewportSizePx: Px,
    overscanPx: Px,
  ): VisibleSegment => {
    if (count === 0) return { range: { start: 0, end: -1 }, offsetPx: px(0) };

    const scroll = Math.max(0, Number(scrollOffsetPx));
    const view = Math.max(0, Number(viewportSizePx));
    const over = Math.max(0, Number(overscanPx));

    const startOffset = Math.max(0, scroll - over);

    // -1 makes the endOffset inclusive coverage intent (avoid missing last partially visible item)
    const endOffset = scroll + view + over - 1;

    const start = clamp(findIndexAtOffsetPx(px(startOffset)), 0, count - 1);
    const end = clamp(findIndexAtOffsetPx(px(Math.max(0, endOffset))), start, count - 1);

    return { range: { start, end }, offsetPx: getOffsetPx(start) };
  };

  /**
   * Apply measurement update:
   * - compute delta = next - prev
   * - update sizes[i]
   * - fenwick.add(i, delta)
   */
  const reportMeasuredSize = (report: MeasureReport) => {
    if (report.axis !== spec.kind) throw new Error(`axis mismatch: got ${report.axis}`);

    const idx = report.index;
    if (!Number.isInteger(idx) || idx < 0 || idx >= count)
      throw new Error(`index out of range: ${idx}`);

    const next = Number(report.sizePx);
    assertFiniteNonNegative(next, "sizePx");

    const prev = sizes[idx];
    if (prev === next) return { changed: false, prevSizePx: px(prev), nextSizePx: px(next) };

    sizes[idx] = next;
    fenwick.add(idx, next - prev);

    return { changed: true, prevSizePx: px(prev), nextSizePx: px(next) };
  };

  /**
   * Anchor-based scroll stabilization:
   * We want the anchor to appear at the same viewport position after sizes change.
   *
   * Condition:
   *   offset(anchorIndex) - nextScroll = anchorViewportPos
   * => nextScroll = offset(anchorIndex) - anchorViewportPos
   */
  const computeAnchorAdjust = (input: AnchorAdjustInput): AnchorAdjustResult => {
    const anchorIndex = input.anchorIndex;
    if (count === 0) return { nextScrollOffsetPx: px(0), deltaPx: px(0) };
    if (!Number.isInteger(anchorIndex) || anchorIndex < 0 || anchorIndex >= count)
      throw new Error(`anchorIndex out of range: ${anchorIndex}`);

    const anchorOffset = Number(getOffsetPx(anchorIndex));
    const anchorViewport = Number(input.anchorViewportPosPx);

    const nextScroll = Math.max(0, anchorOffset - anchorViewport);
    const prevScroll = Math.max(0, Number(input.scrollOffsetPx));
    const delta = nextScroll - prevScroll;

    return { nextScrollOffsetPx: px(nextScroll), deltaPx: px(delta) };
  };

  return {
    kind: spec.kind,
    getCount,
    getSizePx,
    getOffsetPx,
    getTotalSizePx,
    findIndexAtOffsetPx,
    getVisibleSegment,
    reportMeasuredSize,
    computeAnchorAdjust,
  };
};
