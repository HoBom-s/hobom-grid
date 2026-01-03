import { describe, it, expect } from "vitest";
import { createMeasuredAxis } from "./measured-axis";
import { px } from "../contracts/contracts-model";

describe("MeasuredAxis (estimate + measured + anchor adjust)", () => {
  it("uses estimate until measured then updates prefix sums", () => {
    const axis = createMeasuredAxis({ kind: "row", count: 4, estimateSizePx: 10 });

    expect(Number(axis.getTotalSizePx())).toBe(40);
    expect(Number(axis.getOffsetPx(3))).toBe(30);

    axis.reportMeasuredSize({ axis: "row", index: 1, sizePx: px(50) });
    expect(Number(axis.getTotalSizePx())).toBe(80);
    expect(Number(axis.getOffsetPx(2))).toBe(60);
  });

  it("anchor adjust keeps anchor position stable", () => {
    const axis = createMeasuredAxis({ kind: "row", count: 5, estimateSizePx: 10 });

    const scrollTop = px(15);
    const adjust0 = axis.computeAnchorAdjust({
      anchorIndex: 2,
      anchorViewportPosPx: px(5),
      scrollOffsetPx: scrollTop,
    });
    expect(Number(adjust0.nextScrollOffsetPx)).toBe(15);
    expect(Number(adjust0.deltaPx)).toBe(0);

    axis.reportMeasuredSize({ axis: "row", index: 0, sizePx: px(30) });

    const adjust1 = axis.computeAnchorAdjust({
      anchorIndex: 2,
      anchorViewportPosPx: px(5),
      scrollOffsetPx: scrollTop,
    });

    expect(Number(adjust1.nextScrollOffsetPx)).toBe(35);
    expect(Number(adjust1.deltaPx)).toBe(20);
  });
});
