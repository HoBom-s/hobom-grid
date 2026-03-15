import { describe, it, expect } from "vitest";
import { createPagedRowModel } from "./paged-row-model";
import { createClientRowModel } from "./client-row-model";

type Item = { id: number; name: string };

const items: Item[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
}));

const source = createClientRowModel({ rows: items, getId: (r) => r.id });

describe("createPagedRowModel", () => {
  it("returns the correct page slice", () => {
    const { rowModel, page, totalPages } = createPagedRowModel({
      source,
      page: 0,
      pageSize: 10,
    });
    expect(rowModel.rowCount).toBe(10);
    expect(rowModel.getRow(0).name).toBe("Item 1");
    expect(rowModel.getRow(9).name).toBe("Item 10");
    expect(page).toBe(0);
    expect(totalPages).toBe(3);
  });

  it("returns the last (partial) page", () => {
    const { rowModel, page, totalPages } = createPagedRowModel({
      source,
      page: 2,
      pageSize: 10,
    });
    expect(rowModel.rowCount).toBe(5);
    expect(rowModel.getRow(0).name).toBe("Item 21");
    expect(rowModel.getRow(4).name).toBe("Item 25");
    expect(page).toBe(2);
    expect(totalPages).toBe(3);
  });

  it("clamps page to valid range", () => {
    const overPage = createPagedRowModel({ source, page: 99, pageSize: 10 });
    expect(overPage.page).toBe(2);
    expect(overPage.rowModel.rowCount).toBe(5);

    const underPage = createPagedRowModel({ source, page: -5, pageSize: 10 });
    expect(underPage.page).toBe(0);
    expect(underPage.rowModel.rowCount).toBe(10);
  });

  it("clamps pageSize to at least 1", () => {
    const result = createPagedRowModel({ source, page: 0, pageSize: 0 });
    expect(result.rowModel.rowCount).toBe(1);
    expect(result.totalPages).toBe(25);
  });

  it("findVirtualIndex returns null for rows on other pages", () => {
    const { rowModel } = createPagedRowModel({ source, page: 0, pageSize: 10 });
    expect(rowModel.findVirtualIndex(1)).toBe(0); // id:1 on page 0
    expect(rowModel.findVirtualIndex(5)).toBe(4); // id:5 on page 0
    expect(rowModel.findVirtualIndex(11)).toBeNull(); // id:11 on page 1
    expect(rowModel.findVirtualIndex(999)).toBeNull(); // not in source
  });

  it("getRowId delegates to source correctly", () => {
    const { rowModel } = createPagedRowModel({ source, page: 1, pageSize: 10 });
    expect(rowModel.getRowId(0)).toBe(11); // items[10].id
    expect(rowModel.getRowId(9)).toBe(20); // items[19].id
  });

  it("throws RangeError for out-of-bounds access", () => {
    const { rowModel } = createPagedRowModel({ source, page: 0, pageSize: 10 });
    expect(() => rowModel.getRow(-1)).toThrow(RangeError);
    expect(() => rowModel.getRow(10)).toThrow(RangeError);
    expect(() => rowModel.getRowId(10)).toThrow(RangeError);
  });

  it("handles empty source", () => {
    const empty = createClientRowModel({ rows: [] });
    const result = createPagedRowModel({ source: empty, page: 0, pageSize: 10 });
    expect(result.rowModel.rowCount).toBe(0);
    expect(result.totalPages).toBe(1);
    expect(result.totalRows).toBe(0);
    expect(result.page).toBe(0);
  });
});
