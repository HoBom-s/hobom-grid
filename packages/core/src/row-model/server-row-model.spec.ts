import { describe, it, expect } from "vitest";
import { createServerRowModel } from "./server-row-model";

type User = { id: number; name: string };

const users: User[] = [
  { id: 1, name: "Alice" },
  { id: 2, name: "Bob" },
  { id: 3, name: "Charlie" },
];

describe("createServerRowModel", () => {
  it("returns data rows for cached entries", () => {
    const cache = new Map<number, User>([
      [0, users[0]],
      [1, users[1]],
    ]);
    const model = createServerRowModel({
      totalCount: 100,
      cache,
      getId: (r) => r.id,
    });

    expect(model.rowCount).toBe(100);
    const row0 = model.getRow(0);
    expect(row0.type).toBe("data");
    if (row0.type === "data") expect(row0.row.name).toBe("Alice");
  });

  it("returns loading sentinel for cache misses", () => {
    const cache = new Map<number, User>([[0, users[0]]]);
    const model = createServerRowModel({
      totalCount: 100,
      cache,
      getId: (r) => r.id,
    });

    const row5 = model.getRow(5);
    expect(row5.type).toBe("loading");
    if (row5.type === "loading") expect(row5.index).toBe(5);
  });

  it("getRowId returns real ID for cached rows", () => {
    const cache = new Map<number, User>([
      [0, users[0]],
      [2, users[2]],
    ]);
    const model = createServerRowModel({
      totalCount: 10,
      cache,
      getId: (r) => r.id,
    });
    expect(model.getRowId(0)).toBe(1);
    expect(model.getRowId(2)).toBe(3);
  });

  it("getRowId returns synthetic ID for loading rows", () => {
    const cache = new Map<number, User>();
    const model = createServerRowModel({
      totalCount: 10,
      cache,
      getId: (r) => r.id,
    });
    expect(model.getRowId(5)).toBe("__loading__5");
  });

  it("findVirtualIndex locates cached rows by ID", () => {
    const cache = new Map<number, User>([
      [3, users[0]],
      [7, users[1]],
    ]);
    const model = createServerRowModel({
      totalCount: 100,
      cache,
      getId: (r) => r.id,
    });
    expect(model.findVirtualIndex(1)).toBe(3); // users[0].id = 1
    expect(model.findVirtualIndex(2)).toBe(7); // users[1].id = 2
    expect(model.findVirtualIndex(99)).toBeNull();
  });

  it("throws RangeError for out-of-bounds access", () => {
    const model = createServerRowModel({
      totalCount: 10,
      cache: new Map(),
      getId: (r: User) => r.id,
    });
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(10)).toThrow(RangeError);
    expect(() => model.getRowId(10)).toThrow(RangeError);
  });

  it("handles totalCount = 0", () => {
    const model = createServerRowModel({
      totalCount: 0,
      cache: new Map(),
      getId: (r: User) => r.id,
    });
    expect(model.rowCount).toBe(0);
  });
});
