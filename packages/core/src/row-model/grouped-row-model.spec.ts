import { describe, it, expect } from "vitest";
import { createGroupedRowModel, createGroupTree, flattenGroupTree } from "./grouped-row-model";
import type { GroupedRow, GroupHeaderRow, DataRow } from "./grouped-row-model";
import { createClientRowModel } from "./client-row-model";

type Employee = { id: number; name: string; dept: string; team: string; salary: number };

const employees: Employee[] = [
  { id: 1, name: "Alice", dept: "Eng", team: "Frontend", salary: 100 },
  { id: 2, name: "Bob", dept: "Eng", team: "Backend", salary: 120 },
  { id: 3, name: "Charlie", dept: "Sales", team: "Enterprise", salary: 90 },
  { id: 4, name: "Diana", dept: "Eng", team: "Frontend", salary: 110 },
  { id: 5, name: "Eve", dept: "Sales", team: "SMB", salary: 80 },
];

const source = createClientRowModel({ rows: employees, getId: (r) => r.id });

const isGroup = <T>(row: GroupedRow<T>): row is GroupHeaderRow => row.type === "group";
const isData = <T>(row: GroupedRow<T>): row is DataRow<T> => row.type === "data";

describe("createGroupedRowModel", () => {
  it("produces group headers when all collapsed", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(),
    });
    // Should only have 2 group headers (Eng, Sales)
    expect(model.rowCount).toBe(2);
    const g0 = model.getRow(0);
    expect(isGroup(g0) && g0.groupValue).toBe("Eng");
    expect(isGroup(g0) && g0.count).toBe(3);
    expect(isGroup(g0) && g0.isExpanded).toBe(false);

    const g1 = model.getRow(1);
    expect(isGroup(g1) && g1.groupValue).toBe("Sales");
    expect(isGroup(g1) && g1.count).toBe(2);
  });

  it("expands a group to show data rows", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(["Eng"]),
    });
    // Eng header + 3 data + Sales header = 5
    expect(model.rowCount).toBe(5);

    const g0 = model.getRow(0);
    expect(isGroup(g0) && g0.isExpanded).toBe(true);

    const d1 = model.getRow(1);
    expect(isData(d1) && d1.row.name).toBe("Alice");
    expect(isData(d1) && d1.depth).toBe(1);
  });

  it("supports multi-level grouping", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }, { getGroupValue: (r) => r.team }],
      expandedGroups: new Set(["Eng", "Eng/Frontend"]),
    });
    // Eng(header) > Frontend(header) > Alice, Diana > Backend(header) > Sales(header)
    expect(model.rowCount).toBe(6);

    const eng = model.getRow(0);
    expect(isGroup(eng) && eng.key).toBe("Eng");

    const frontend = model.getRow(1);
    expect(isGroup(frontend) && frontend.key).toBe("Eng/Frontend");
    expect(isGroup(frontend) && frontend.count).toBe(2);

    const alice = model.getRow(2);
    expect(isData(alice) && alice.row.name).toBe("Alice");
    expect(isData(alice) && alice.depth).toBe(2);

    const diana = model.getRow(3);
    expect(isData(diana) && diana.row.name).toBe("Diana");

    const backend = model.getRow(4);
    expect(isGroup(backend) && backend.key).toBe("Eng/Backend");

    const sales = model.getRow(5);
    expect(isGroup(sales) && sales.key).toBe("Sales");
  });

  it("computes aggregates per group", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [
        {
          getGroupValue: (r) => r.dept,
          aggregates: [
            {
              key: "totalSalary",
              fn: (rows) => rows.reduce((acc, r) => acc + r.salary, 0),
            },
          ],
        },
      ],
      expandedGroups: new Set(),
    });
    const eng = model.getRow(0) as GroupHeaderRow;
    expect(eng.aggregates?.totalSalary).toBe(330); // 100+120+110

    const sales = model.getRow(1) as GroupHeaderRow;
    expect(sales.aggregates?.totalSalary).toBe(170); // 90+80
  });

  it("getRowId returns group key for headers", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(),
    });
    expect(model.getRowId(0)).toBe("Eng");
    expect(model.getRowId(1)).toBe("Sales");
  });

  it("findVirtualIndex locates group headers by key", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(),
    });
    expect(model.findVirtualIndex("Eng")).toBe(0);
    expect(model.findVirtualIndex("Sales")).toBe(1);
    expect(model.findVirtualIndex("Missing")).toBeNull();
  });

  it("throws RangeError for out-of-bounds access", () => {
    const model = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(),
    });
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(2)).toThrow(RangeError);
    expect(() => model.getRowId(99)).toThrow(RangeError);
  });

  it("handles empty source", () => {
    const empty = createClientRowModel({ rows: [] as Employee[] });
    const model = createGroupedRowModel({
      source: empty,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(),
    });
    expect(model.rowCount).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Two-phase API: createGroupTree + flattenGroupTree
// ---------------------------------------------------------------------------

describe("createGroupTree + flattenGroupTree", () => {
  it("produces same result as createGroupedRowModel", () => {
    const tree = createGroupTree({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      getId: (r) => r.id,
    });
    const model = flattenGroupTree(tree, new Set(["Eng"]));
    const legacy = createGroupedRowModel({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      expandedGroups: new Set(["Eng"]),
      getId: (r) => r.id,
    });

    expect(model.rowCount).toBe(legacy.rowCount);
    for (let i = 0; i < model.rowCount; i++) {
      expect(model.getRow(i)).toEqual(legacy.getRow(i));
      expect(model.getRowId(i)).toBe(legacy.getRowId(i));
    }
  });

  it("tree is reusable across different expand states", () => {
    const tree = createGroupTree({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
    });

    const collapsed = flattenGroupTree(tree, new Set());
    expect(collapsed.rowCount).toBe(2); // Eng, Sales

    const expanded = flattenGroupTree(tree, new Set(["Eng"]));
    expect(expanded.rowCount).toBe(5); // Eng + 3 data + Sales

    const allExpanded = flattenGroupTree(tree, new Set(["Eng", "Sales"]));
    expect(allExpanded.rowCount).toBe(7); // Eng + 3 + Sales + 2
  });

  it("multi-level tree works correctly", () => {
    const tree = createGroupTree({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }, { getGroupValue: (r) => r.team }],
    });

    // All collapsed — only top-level groups
    const collapsed = flattenGroupTree(tree, new Set());
    expect(collapsed.rowCount).toBe(2); // Eng, Sales

    // Expand Eng — shows sub-group headers
    const engExpanded = flattenGroupTree(tree, new Set(["Eng"]));
    expect(engExpanded.rowCount).toBe(4); // Eng, Frontend, Backend, Sales

    // Expand Eng + Frontend — shows data rows
    const leafExpanded = flattenGroupTree(tree, new Set(["Eng", "Eng/Frontend"]));
    expect(leafExpanded.rowCount).toBe(6); // Eng, Frontend, Alice, Diana, Backend, Sales
  });

  it("findVirtualIndex is O(1) via Map lookup", () => {
    const tree = createGroupTree({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }],
      getId: (r) => r.id,
    });
    const model = flattenGroupTree(tree, new Set(["Eng"]));

    // Group header lookup
    expect(model.findVirtualIndex("Eng")).toBe(0);
    expect(model.findVirtualIndex("Sales")).toBe(4);
    expect(model.findVirtualIndex("Missing")).toBeNull();

    // Data row lookup by getId
    expect(model.findVirtualIndex(1)).toBe(1); // Alice
    expect(model.findVirtualIndex(2)).toBe(2); // Bob
  });

  it("tree roots expose all group keys for expandAll", () => {
    const tree = createGroupTree({
      source,
      groupBy: [{ getGroupValue: (r) => r.dept }, { getGroupValue: (r) => r.team }],
    });

    // Collect all keys from tree
    const allKeys = new Set<string>();
    const collect = (nodes: typeof tree.roots) => {
      for (const node of nodes) {
        allKeys.add(node.key);
        if (node.subGroups) collect(node.subGroups);
      }
    };
    collect(tree.roots);

    expect(allKeys).toEqual(
      new Set(["Eng", "Eng/Frontend", "Eng/Backend", "Sales", "Sales/Enterprise", "Sales/SMB"]),
    );

    // All expanded model
    const model = flattenGroupTree(tree, allKeys);
    // 6 group headers + 5 data rows = 11
    expect(model.rowCount).toBe(11);
  });
});
