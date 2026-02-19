import { describe, it, expect } from "vitest";
import { createClientRowModel } from "./client-row-model";

type Person = { id: number; name: string; age: number; active: boolean };

const people: Person[] = [
  { id: 1, name: "Charlie", age: 30, active: true },
  { id: 2, name: "Alice", age: 25, active: true },
  { id: 3, name: "Bob", age: 35, active: false },
  { id: 4, name: "Diana", age: 28, active: true },
];

describe("createClientRowModel", () => {
  describe("no transforms", () => {
    it("returns all rows in original order", () => {
      const m = createClientRowModel({ rows: people });
      expect(m.rowCount).toBe(4);
      expect(m.getRow(0).name).toBe("Charlie");
      expect(m.getRow(3).name).toBe("Diana");
    });

    it("uses original index as default rowId", () => {
      const m = createClientRowModel({ rows: people });
      expect(m.getRowId(0)).toBe(0);
      expect(m.getRowId(3)).toBe(3);
    });

    it("findVirtualIndex returns the virtual index", () => {
      const m = createClientRowModel({ rows: people });
      expect(m.findVirtualIndex(2)).toBe(2);
      expect(m.findVirtualIndex(99)).toBeNull();
    });
  });

  describe("custom getId", () => {
    it("uses provided getId for stable IDs", () => {
      const m = createClientRowModel({ rows: people, getId: (r) => r.id });
      expect(m.getRowId(0)).toBe(1); // people[0].id === 1
      expect(m.getRowId(1)).toBe(2);
    });

    it("findVirtualIndex works with custom IDs", () => {
      const m = createClientRowModel({ rows: people, getId: (r) => r.id });
      expect(m.findVirtualIndex(3)).toBe(2); // id:3 is index 2 (Bob)
      expect(m.findVirtualIndex(99)).toBeNull();
    });
  });

  describe("filter", () => {
    it("hides rows that fail the predicate", () => {
      const m = createClientRowModel({ rows: people, filter: (r) => r.active });
      expect(m.rowCount).toBe(3);
      expect(m.getRow(0).name).toBe("Charlie");
      expect(m.getRow(1).name).toBe("Alice");
      expect(m.getRow(2).name).toBe("Diana");
    });

    it("empty result when all rows filtered", () => {
      const m = createClientRowModel({ rows: people, filter: () => false });
      expect(m.rowCount).toBe(0);
    });

    it("stable IDs still use original index after filter", () => {
      const m = createClientRowModel({ rows: people, filter: (r) => r.active });
      // Charlie (orig 0), Alice (orig 1), Diana (orig 3)
      expect(m.getRowId(0)).toBe(0);
      expect(m.getRowId(1)).toBe(1);
      expect(m.getRowId(2)).toBe(3);
    });

    it("findVirtualIndex returns null for filtered-out rows", () => {
      const m = createClientRowModel({
        rows: people,
        getId: (r) => r.id,
        filter: (r) => r.active,
      });
      expect(m.findVirtualIndex(3)).toBeNull(); // Bob (id:3) is filtered out
      expect(m.findVirtualIndex(2)).toBe(1); // Alice (id:2) is at virtual index 1
    });
  });

  describe("sort", () => {
    it("sorts ascending by key", () => {
      const m = createClientRowModel({
        rows: people,
        sort: [{ key: "name", direction: "asc" }],
      });
      expect(m.rowCount).toBe(4);
      expect(m.getRow(0).name).toBe("Alice");
      expect(m.getRow(1).name).toBe("Bob");
      expect(m.getRow(2).name).toBe("Charlie");
      expect(m.getRow(3).name).toBe("Diana");
    });

    it("sorts descending by key", () => {
      const m = createClientRowModel({
        rows: people,
        sort: [{ key: "age", direction: "desc" }],
      });
      expect(m.getRow(0).age).toBe(35); // Bob
      expect(m.getRow(3).age).toBe(25); // Alice
    });

    it("preserves stable IDs after sort", () => {
      const m = createClientRowModel({
        rows: people,
        getId: (r) => r.id,
        sort: [{ key: "name", direction: "asc" }],
      });
      // Sorted: Alice(id:2), Bob(id:3), Charlie(id:1), Diana(id:4)
      expect(m.getRowId(0)).toBe(2);
      expect(m.getRowId(1)).toBe(3);
      expect(m.getRowId(2)).toBe(1);
      expect(m.getRowId(3)).toBe(4);
    });

    it("multi-column sort: tie-break by second key", () => {
      const rows = [
        { id: 1, group: "A", name: "Zara" },
        { id: 2, group: "B", name: "Anna" },
        { id: 3, group: "A", name: "Alan" },
      ];
      const m = createClientRowModel({
        rows,
        sort: [
          { key: "group", direction: "asc" },
          { key: "name", direction: "asc" },
        ],
      });
      expect(m.getRow(0).name).toBe("Alan"); // A, Alan
      expect(m.getRow(1).name).toBe("Zara"); // A, Zara
      expect(m.getRow(2).name).toBe("Anna"); // B, Anna
    });
  });

  describe("filter + sort combined", () => {
    it("filters first then sorts", () => {
      const m = createClientRowModel({
        rows: people,
        filter: (r) => r.active,
        sort: [{ key: "age", direction: "asc" }],
      });
      // Active: Charlie(30), Alice(25), Diana(28)
      // Sorted by age asc: Alice(25), Diana(28), Charlie(30)
      expect(m.rowCount).toBe(3);
      expect(m.getRow(0).name).toBe("Alice");
      expect(m.getRow(1).name).toBe("Diana");
      expect(m.getRow(2).name).toBe("Charlie");
    });
  });

  describe("edge cases", () => {
    it("empty rows array", () => {
      const m = createClientRowModel({ rows: [] });
      expect(m.rowCount).toBe(0);
    });

    it("getRow throws on out-of-range index", () => {
      const m = createClientRowModel({ rows: people });
      expect(() => m.getRow(-1)).toThrow(RangeError);
      expect(() => m.getRow(4)).toThrow(RangeError);
    });

    it("does not mutate the original array when sorting", () => {
      const original = [...people];
      createClientRowModel({ rows: people, sort: [{ key: "name", direction: "asc" }] });
      expect(people[0]!.name).toBe(original[0]!.name);
    });
  });
});
