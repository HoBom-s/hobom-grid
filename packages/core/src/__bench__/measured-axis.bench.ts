import { bench, describe } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { px } from "../contracts/contracts-model";

const N = 1_000_000;

const axis = createMeasuredAxis({ kind: "row", count: N, estimateSizePx: 30 });
const total = Number(axis.getTotalSizePx());

describe("MeasuredAxis (1M)", () => {
  bench("getOffsetPx", () => {
    axis.getOffsetPx(Math.floor(Math.random() * N));
  });

  bench("findIndexAtOffsetPx", () => {
    axis.findIndexAtOffsetPx(px(Math.random() * total));
  });

  bench("getVisibleSegment", () => {
    const scroll = Math.random() * Math.max(0, total - 600);
    axis.getVisibleSegment(px(scroll), px(600), px(100));
  });

  bench("reportMeasuredSize", () => {
    const idx = Math.floor(Math.random() * N);
    axis.reportMeasuredSize({ axis: "row", index: idx, sizePx: px(25 + Math.random() * 10) });
  });
});
