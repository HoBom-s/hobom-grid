import { bench, describe } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { createViewportEngine } from "../viewport/viewport-engine";
import { px } from "../contracts/contracts-model";

const N = 1_000_000;

const rows = createMeasuredAxis({ kind: "row", count: N, estimateSizePx: 30 });
const cols = createMeasuredAxis({ kind: "col", count: 100, estimateSizePx: 120 });
const engine = createViewportEngine({
  rows,
  cols,
  headerRowCount: 1,
  pinnedColStartCount: 1,
  pinnedColEndCount: 1,
});
const totalH = Number(rows.getTotalSizePx());

describe("ViewportEngine (1M rows)", () => {
  bench("compute", () => {
    engine.compute({
      scrollLeftPx: px(0),
      scrollTopPx: px(Math.random() * Math.max(0, totalH - 600)),
      viewportWidthPx: px(1200),
      viewportHeightPx: px(600),
      overscan: { type: "px", value: px(200) },
    });
  });
});
