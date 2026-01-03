import { describe, it, expect } from "vitest";
import { createMeasuredAxis } from "../axis/measured-axis";
import { createGridKernel } from "./create-grid";
import { px } from "../contracts/contracts-model";

describe("createGridKernel (query + measurement + anchor stabilization)", () => {
  it("queryViewport returns stable ViewportModel + flat ViewModel", () => {
    const rowAxis = createMeasuredAxis({ kind: "row", count: 100, estimateSizePx: 10 });
    const colAxis = createMeasuredAxis({ kind: "col", count: 50, estimateSizePx: 10 });

    const grid = createGridKernel({
      rowAxis,
      colAxis,
      headerRowCount: 1,
      pinnedColStartCount: 2,
      pinnedColEndCount: 2,
    });

    const q = {
      scrollLeftPx: px(0),
      scrollTopPx: px(200),
      viewportWidthPx: px(200),
      viewportHeightPx: px(100),
      overscan: { type: "px", value: px(0) },
    } as const;

    const { viewport, viewModel } = grid.queryViewport(q);

    expect(Number(viewport.totalHeightPx)).toBe(1000);
    expect(viewModel.cells.length).toBeGreaterThan(0);
  });

  it("reportMeasuredSize returns adjusted scroll to prevent jump", () => {
    const rowAxis = createMeasuredAxis({ kind: "row", count: 100, estimateSizePx: 10 });
    const colAxis = createMeasuredAxis({ kind: "col", count: 10, estimateSizePx: 10 });

    const grid = createGridKernel({
      rowAxis,
      colAxis,
      headerRowCount: 1,
      pinnedColStartCount: 0,
      pinnedColEndCount: 0,
    });

    const q0 = {
      scrollLeftPx: px(0),
      scrollTopPx: px(50),
      viewportWidthPx: px(100),
      viewportHeightPx: px(60),
      overscan: { type: "px", value: px(0) },
    } as const;

    const beforeAnchor = grid.queryViewport(q0).viewport.anchor;

    const report = { axis: "row" as const, index: 0, sizePx: px(40) };
    const { changed, nextQuery } = grid.reportMeasuredSize(report, q0);

    expect(changed).toBe(true);
    expect(Number(nextQuery.scrollTopPx)).toBeGreaterThanOrEqual(Number(q0.scrollTopPx));

    const afterAnchor = grid.queryViewport(nextQuery).viewport.anchor;
    expect(afterAnchor.rowIndex).toBe(beforeAnchor.rowIndex);
  });
});
