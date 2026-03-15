import { describe, it } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { createViewportEngine } from "./viewport-engine";
import { px } from "../contracts/contracts-model";
import { assertScaling } from "../__perf__/measure";

const SMALL_N = 10_000;
const LARGE_N = 1_000_000;
const MAX_RATIO = 5;

describe("ViewportEngine complexity", () => {
  it("compute() scales O(log N)", () => {
    assertScaling({
      label: "ViewportEngine.compute",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const rows = createMeasuredAxis({ kind: "row", count: n, estimateSizePx: 30 });
        const cols = createMeasuredAxis({ kind: "col", count: 100, estimateSizePx: 120 });
        const engine = createViewportEngine({
          rows,
          cols,
          headerRowCount: 1,
          pinnedColStartCount: 1,
          pinnedColEndCount: 1,
        });
        const totalH = Number(rows.getTotalSizePx());
        return () => {
          engine.compute({
            scrollLeftPx: px(0),
            scrollTopPx: px(Math.random() * Math.max(0, totalH - 600)),
            viewportWidthPx: px(1200),
            viewportHeightPx: px(600),
            overscan: { type: "px", value: px(200) },
          });
        };
      },
    });
  });
});
