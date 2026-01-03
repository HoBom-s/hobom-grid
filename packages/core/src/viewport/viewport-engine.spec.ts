import { describe, it, expect } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { createViewportEngine } from "./viewport-engine";
import { px } from "../contracts/contracts-model";

describe("ViewportEngine (2D + pinned + header)", () => {
  it("computes pinned slices and transforms", () => {
    const rows = createMeasuredAxis({ kind: "row", count: 100, estimateSizePx: 10 });
    const cols = createMeasuredAxis({ kind: "col", count: 20, estimateSizePx: 10 });

    const engine = createViewportEngine({
      rows,
      cols,
      headerRowCount: 1,
      pinnedColStartCount: 2,
      pinnedColEndCount: 3,
    });

    const vm = engine.compute({
      scrollLeftPx: px(50),
      scrollTopPx: px(120),
      viewportWidthPx: px(100),
      viewportHeightPx: px(60),
      overscan: { type: "px", value: px(0) },
    });

    expect(vm.cols.start.range).toEqual({ start: 0, end: 1 });
    expect(Number(vm.transforms.colMainX)).toBe(20);

    expect(vm.cols.end.range).toEqual({ start: 17, end: 19 });

    expect(vm.rows.header.range).toEqual({ start: 0, end: 0 });
    expect(Number(vm.transforms.rowBodyY)).toBe(10);
  });

  it("main col range excludes pinned start/end", () => {
    const rows = createMeasuredAxis({ kind: "row", count: 10, estimateSizePx: 10 });
    const cols = createMeasuredAxis({ kind: "col", count: 10, estimateSizePx: 10 });

    const engine = createViewportEngine({
      rows,
      cols,
      headerRowCount: 0,
      pinnedColStartCount: 2,
      pinnedColEndCount: 2,
    });

    const vm = engine.compute({
      scrollLeftPx: px(0),
      scrollTopPx: px(0),
      viewportWidthPx: px(30),
      viewportHeightPx: px(30),
      overscan: { type: "px", value: px(0) },
    });

    expect(vm.cols.main.range.start).toBeGreaterThanOrEqual(2);
    expect(vm.cols.main.range.end).toBeLessThanOrEqual(7);
  });
});
