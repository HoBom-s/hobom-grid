import type { AxisRange, Px, Anchor } from "../contracts/contracts-model";
import { px } from "../contracts/contracts-model";

export type AxisViewportSlice = Readonly<{
  range: AxisRange; // inclusive

  offsetPx: Px; // content offset of range.start
}>;

export type PinnedSlices = Readonly<{
  start: AxisViewportSlice;
  main: AxisViewportSlice;
  end: AxisViewportSlice;
}>;

export type ViewportModel = Readonly<{
  viewportWidthPx: Px;
  viewportHeightPx: Px;
  scrollLeftPx: Px;
  scrollTopPx: Px;

  totalWidthPx: Px;
  totalHeightPx: Px;

  rows: Readonly<{
    header: AxisViewportSlice;
    body: AxisViewportSlice;
  }>;

  cols: PinnedSlices;

  transforms: Readonly<{
    colPinnedStartX: Px;
    colMainX: Px;
    colPinnedEndX: Px;

    rowHeaderY: Px;
    rowBodyY: Px;
  }>;

  anchor: Anchor;
}>;

const emptyRange = (): AxisRange => ({ start: 0, end: -1 });

export const emptySlice = (): AxisViewportSlice => ({
  range: emptyRange(),
  offsetPx: px(0),
});
