import type { AxisKind, AxisRange, Px } from "../contracts/contracts-model";

export type VisibleSegment = Readonly<{
  /** inclusive index range [start..end] */
  range: AxisRange;

  /** content offset(px) of range.start */
  offsetPx: Px;
}>;

export interface VirtualAxis {
  readonly kind: AxisKind;

  getCount(): number;

  /** size(px) at index (>=0). If unknown -> estimate. */
  getSizePx(index: number): Px;

  /** prefix sum offset(px) from start to index */
  getOffsetPx(index: number): Px;

  /** total size(px) */
  getTotalSizePx(): Px;

  /** find index such that offset in [offset(i), offset(i+1)) */
  findIndexAtOffsetPx(offsetPx: Px): number;

  /**
   * visible range for [scroll..scroll+viewport) with overscan already applied
   * NOTE: range is inclusive [start..end]
   */
  getVisibleSegment(scrollOffsetPx: Px, viewportSizePx: Px, overscanPx: Px): VisibleSegment;
}
