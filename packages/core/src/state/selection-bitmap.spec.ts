import { describe, it, expect } from "vitest";
import { createSelectionBitmap } from "./selection-bitmap";

describe("createSelectionBitmap", () => {
  it("returns false for empty ranges and no focus", () => {
    const bm = createSelectionBitmap([], null, 0, 10, 0, 10);
    expect(bm.isSelected(5, 5)).toBe(false);
  });

  it("marks single range correctly", () => {
    const bm = createSelectionBitmap(
      [{ start: { row: 2, col: 3 }, end: { row: 5, col: 7 } }],
      null,
      0,
      10,
      0,
      10,
    );
    expect(bm.isSelected(2, 3)).toBe(true);
    expect(bm.isSelected(5, 7)).toBe(true);
    expect(bm.isSelected(3, 5)).toBe(true);
    expect(bm.isSelected(1, 3)).toBe(false);
    expect(bm.isSelected(2, 2)).toBe(false);
    expect(bm.isSelected(6, 3)).toBe(false);
  });

  it("marks focus cell as selected", () => {
    const bm = createSelectionBitmap([], { row: 5, col: 5 }, 0, 10, 0, 10);
    expect(bm.isSelected(5, 5)).toBe(true);
    expect(bm.isSelected(5, 6)).toBe(false);
  });

  it("handles out-of-bounds queries", () => {
    const bm = createSelectionBitmap(
      [{ start: { row: 0, col: 0 }, end: { row: 2, col: 2 } }],
      null,
      0,
      5,
      0,
      5,
    );
    expect(bm.isSelected(-1, 0)).toBe(false);
    expect(bm.isSelected(6, 0)).toBe(false);
    expect(bm.isSelected(0, -1)).toBe(false);
    expect(bm.isSelected(0, 6)).toBe(false);
  });

  it("handles multiple overlapping ranges", () => {
    const bm = createSelectionBitmap(
      [
        { start: { row: 0, col: 0 }, end: { row: 2, col: 2 } },
        { start: { row: 1, col: 1 }, end: { row: 3, col: 3 } },
      ],
      null,
      0,
      5,
      0,
      5,
    );
    expect(bm.isSelected(0, 0)).toBe(true);
    expect(bm.isSelected(1, 1)).toBe(true);
    expect(bm.isSelected(3, 3)).toBe(true);
    expect(bm.isSelected(4, 4)).toBe(false);
  });

  it("handles empty viewport gracefully", () => {
    const bm = createSelectionBitmap(
      [{ start: { row: 0, col: 0 }, end: { row: 5, col: 5 } }],
      null,
      5,
      0,
      0,
      5,
    );
    expect(bm.isSelected(3, 3)).toBe(false);
  });

  it("clips range to viewport bounds", () => {
    const bm = createSelectionBitmap(
      [{ start: { row: 0, col: 0 }, end: { row: 100, col: 100 } }],
      null,
      5,
      10,
      5,
      10,
    );
    expect(bm.isSelected(5, 5)).toBe(true);
    expect(bm.isSelected(10, 10)).toBe(true);
    expect(bm.isSelected(4, 5)).toBe(false);
    expect(bm.isSelected(11, 5)).toBe(false);
  });
});
