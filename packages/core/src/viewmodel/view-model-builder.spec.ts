import { describe, it, expect } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { createViewportEngine } from "../viewport/viewport-engine";
import { createViewModelBuilder } from "./view-model-builder";
import { px } from "../contracts/contracts-model";

describe("ViewModelBuilder (flat cells)", () => {
  it("produces body/header/pinned/corner kinds", () => {
    const rows = createMeasuredAxis({ kind: "row", count: 5, estimateSizePx: 10 });
    const cols = createMeasuredAxis({ kind: "col", count: 6, estimateSizePx: 10 });

    const engine = createViewportEngine({
      rows,
      cols,
      headerRowCount: 1,
      pinnedColStartCount: 1,
      pinnedColEndCount: 1,
    });

    const vp = engine.compute({
      scrollLeftPx: px(10),
      scrollTopPx: px(10),
      viewportWidthPx: px(40),
      viewportHeightPx: px(40),
      overscan: { type: "px", value: px(0) },
    });

    const builder = createViewModelBuilder({ rows, cols });
    const vm = builder.build(vp);

    expect(vm.cells.some((c) => c.kind === "body")).toBe(true);
    expect(vm.cells.some((c) => c.kind === "header")).toBe(true);
    expect(vm.cells.some((c) => c.kind === "pinnedStart")).toBe(true);
    expect(vm.cells.some((c) => c.kind === "pinnedEnd")).toBe(true);
    expect(vm.cells.some((c) => c.kind === "cornerStart")).toBe(true);
    expect(vm.cells.some((c) => c.kind === "cornerEnd")).toBe(true);
  });
});
