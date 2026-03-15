import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useColumnBands } from "./use-column-bands";
import type { ColumnBandDef } from "./use-column-bands";

const visibleCols = ["name", "age", "dept", "team", "salary", "bonus"];
const colWidths: Record<number, number> = { 0: 150, 1: 80, 2: 120, 3: 120, 4: 100, 5: 100 };
const defaultColWidth = 120;

describe("useColumnBands", () => {
  it("returns headerRowCount=1 when no bands defined", () => {
    const { result } = renderHook(() =>
      useColumnBands(undefined, colWidths, defaultColWidth, visibleCols),
    );
    expect(result.current.headerRowCount).toBe(1);
    expect(result.current.getBandCell(0, 0)).toBeNull();
  });

  it("returns headerRowCount=1 for empty bands array", () => {
    const { result } = renderHook(() =>
      useColumnBands([], colWidths, defaultColWidth, visibleCols),
    );
    expect(result.current.headerRowCount).toBe(1);
  });

  it("computes single-level bands", () => {
    const bands: ColumnBandDef[] = [
      { label: "Personal", children: ["name", "age"] },
      { label: "Work", children: ["dept", "team"] },
    ];
    const { result } = renderHook(() =>
      useColumnBands(bands, colWidths, defaultColWidth, visibleCols),
    );
    // 1 band row + 1 column header row
    expect(result.current.headerRowCount).toBe(2);

    // Personal band: col 0 is first
    const cell0 = result.current.getBandCell(0, 0)!;
    expect(cell0.label).toBe("Personal");
    expect(cell0.isFirst).toBe(true);
    expect(cell0.spanWidthPx).toBe(230); // 150 + 80

    // Personal band: col 1 is not first
    const cell1 = result.current.getBandCell(0, 1)!;
    expect(cell1.label).toBe("Personal");
    expect(cell1.isFirst).toBe(false);

    // Work band: col 2 is first
    const cell2 = result.current.getBandCell(0, 2)!;
    expect(cell2.label).toBe("Work");
    expect(cell2.isFirst).toBe(true);
    expect(cell2.spanWidthPx).toBe(240); // 120 + 120
  });

  it("computes nested bands", () => {
    const bands: ColumnBandDef[] = [
      {
        label: "Compensation",
        children: [
          { label: "Base", children: ["salary"] },
          { label: "Extra", children: ["bonus"] },
        ],
      },
    ];
    const { result } = renderHook(() =>
      useColumnBands(bands, colWidths, defaultColWidth, visibleCols),
    );
    // 2 band rows + 1 column header row
    expect(result.current.headerRowCount).toBe(3);

    // Row 0: Compensation spans salary+bonus
    const comp = result.current.getBandCell(0, 4)!;
    expect(comp.label).toBe("Compensation");
    expect(comp.isFirst).toBe(true);
    expect(comp.spanWidthPx).toBe(200); // 100 + 100

    // Row 1: Base is col 4, Extra is col 5
    const base = result.current.getBandCell(1, 4)!;
    expect(base.label).toBe("Base");
    expect(base.isFirst).toBe(true);

    const extra = result.current.getBandCell(1, 5)!;
    expect(extra.label).toBe("Extra");
    expect(extra.isFirst).toBe(true);
  });

  it("returns null for cells not covered by any band", () => {
    const bands: ColumnBandDef[] = [{ label: "Personal", children: ["name", "age"] }];
    const { result } = renderHook(() =>
      useColumnBands(bands, colWidths, defaultColWidth, visibleCols),
    );
    // Column 3 (team) is not in any band
    expect(result.current.getBandCell(0, 3)).toBeNull();
  });

  it("ignores columns not in visibleCols", () => {
    const bands: ColumnBandDef[] = [{ label: "Test", children: ["name", "nonexistent"] }];
    const { result } = renderHook(() =>
      useColumnBands(bands, colWidths, defaultColWidth, visibleCols),
    );
    const cell = result.current.getBandCell(0, 0)!;
    expect(cell.label).toBe("Test");
    expect(cell.spanWidthPx).toBe(150); // only "name" col width
  });
});
