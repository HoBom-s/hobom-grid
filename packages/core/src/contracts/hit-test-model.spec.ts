import { describe, it, expect } from "vitest";
import { defaultHitTest, type GridLayout } from "./hit-test-model";

const layout: GridLayout = {
  bounds: { x: 0, y: 0, width: 400, height: 300 },
  rowHeaderWidth: 40,
  colHeaderHeight: 24,
  rowCount: 3,
  colCount: 4,
  colOffsets: [0, 50, 120, 200, 300],
  colWidths: [50, 70, 80, 100],
  rowOffsets: [0, 30, 70, 120],
  rowHeights: [30, 40, 50],
  resizeHandleSlop: 4,
};

describe("defaultHitTest", () => {
  it("returns outside when point is out of bounds", () => {
    expect(defaultHitTest(layout, { x: -1, y: 10 }).region).toBe("outside");
    expect(defaultHitTest(layout, { x: 401, y: 10 }).region).toBe("outside");
  });

  it("hits corner", () => {
    const hit = defaultHitTest(layout, { x: 10, y: 10 });
    expect(hit.region).toBe("corner");
  });

  it("hits column header", () => {
    const hit = defaultHitTest(layout, { x: 40 + 60, y: 10 }); // in col header, col 1 area
    expect(hit.region).toBe("col-header");
    expect(hit.cell?.col).toBe(1);
  });

  it("hits row header", () => {
    const hit = defaultHitTest(layout, { x: 10, y: 24 + 35 }); // in row header, row 1 area
    expect(hit.region).toBe("row-header");
    expect(hit.cell?.row).toBe(1);
  });

  it("hits cell", () => {
    const hit = defaultHitTest(layout, { x: 40 + 10, y: 24 + 10 }); // row0 col0
    expect(hit.region).toBe("cell");
    expect(hit.cell).toEqual({ row: 0, col: 0 });
  });

  it("hits col-resize-handle near column boundary", () => {
    // boundary after col0 => contentX ~= 50 => x ~= rowHeaderWidth + 50
    const hit = defaultHitTest(layout, { x: 40 + 50 + 2, y: 24 + 10 });
    expect(hit.region).toBe("col-resize-handle");
    expect(hit.col).toBe(0);
  });

  it("hits row-resize-handle near row boundary", () => {
    // boundary after row0 => contentY ~= 30 => y ~= colHeaderHeight + 30
    const hit = defaultHitTest(layout, { x: 40 + 10, y: 24 + 30 + 1 });
    expect(hit.region).toBe("row-resize-handle");
    expect(hit.row).toBe(0);
  });
});
