import { describe, it } from "vitest";
import { createMeasuredAxis } from "./measured-axis";
import { px } from "../contracts/contracts-model";
import { assertScaling } from "../__perf__/measure";

const SMALL_N = 10_000;
const LARGE_N = 1_000_000;
const MAX_RATIO = 5;

describe("MeasuredAxis complexity", () => {
  it("getOffsetPx() scales O(log N)", () => {
    assertScaling({
      label: "MeasuredAxis.getOffsetPx",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const axis = createMeasuredAxis({ kind: "row", count: n, estimateSizePx: 30 });
        return () => axis.getOffsetPx(Math.floor(Math.random() * n));
      },
    });
  });

  it("findIndexAtOffsetPx() scales O(log N)", () => {
    // lowerBound traversal on Fenwick tree has higher cache-miss variance at 1M;
    // ratio ~5-6 is normal, O(N) regression would show ratio ≈ 100.
    assertScaling({
      label: "MeasuredAxis.findIndexAtOffsetPx",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: 7,
      setup: (n) => {
        const axis = createMeasuredAxis({ kind: "row", count: n, estimateSizePx: 30 });
        const total = Number(axis.getTotalSizePx());
        return () => axis.findIndexAtOffsetPx(px(Math.random() * total));
      },
    });
  });

  it("getVisibleSegment() scales O(log N)", () => {
    assertScaling({
      label: "MeasuredAxis.getVisibleSegment",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const axis = createMeasuredAxis({ kind: "row", count: n, estimateSizePx: 30 });
        const total = Number(axis.getTotalSizePx());
        return () => {
          const scroll = Math.random() * Math.max(0, total - 600);
          axis.getVisibleSegment(px(scroll), px(600), px(100));
        };
      },
    });
  });

  it("reportMeasuredSize() scales O(log N)", () => {
    assertScaling({
      label: "MeasuredAxis.reportMeasuredSize",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const axis = createMeasuredAxis({ kind: "row", count: n, estimateSizePx: 30 });
        return () => {
          const idx = Math.floor(Math.random() * n);
          axis.reportMeasuredSize({ axis: "row", index: idx, sizePx: px(25 + Math.random() * 10) });
        };
      },
    });
  });
});
