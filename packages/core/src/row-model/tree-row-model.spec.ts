import { describe, it, expect } from "vitest";
import { createTreeRowModel } from "./tree-row-model";
import type { TreeNode } from "./tree-row-model";

type FileItem = { id: string; name: string };

const tree: TreeNode<FileItem>[] = [
  {
    row: { id: "src", name: "src" },
    children: [
      {
        row: { id: "src/index", name: "index.ts" },
        children: [],
      },
      {
        row: { id: "src/utils", name: "utils" },
        children: [
          { row: { id: "src/utils/math", name: "math.ts" } },
          { row: { id: "src/utils/string", name: "string.ts" } },
        ],
      },
    ],
  },
  {
    row: { id: "readme", name: "README.md" },
  },
  {
    row: { id: "package", name: "package.json" },
  },
];

describe("createTreeRowModel", () => {
  it("flattens roots only when nothing is expanded", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(),
    });
    expect(model.rowCount).toBe(3);
    expect(model.getRow(0).row.name).toBe("src");
    expect(model.getRow(0).hasChildren).toBe(true);
    expect(model.getRow(0).isExpanded).toBe(false);
    expect(model.getRow(0).depth).toBe(0);
    expect(model.getRow(1).row.name).toBe("README.md");
    expect(model.getRow(1).hasChildren).toBe(false);
  });

  it("expands a node to show its children", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(["src"]),
    });
    // src(expanded) > index.ts > utils > README.md > package.json
    expect(model.rowCount).toBe(5);
    expect(model.getRow(0).row.name).toBe("src");
    expect(model.getRow(0).isExpanded).toBe(true);
    expect(model.getRow(1).row.name).toBe("index.ts");
    expect(model.getRow(1).depth).toBe(1);
    expect(model.getRow(2).row.name).toBe("utils");
    expect(model.getRow(2).depth).toBe(1);
    expect(model.getRow(2).hasChildren).toBe(true);
    expect(model.getRow(2).isExpanded).toBe(false);
  });

  it("expands nested nodes (multi-level)", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(["src", "src/utils"]),
    });
    // src > index.ts > utils > math.ts > string.ts > README.md > package.json
    expect(model.rowCount).toBe(7);
    expect(model.getRow(3).row.name).toBe("math.ts");
    expect(model.getRow(3).depth).toBe(2);
    expect(model.getRow(4).row.name).toBe("string.ts");
    expect(model.getRow(4).depth).toBe(2);
  });

  it("getRowId returns the node ID", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(["src"]),
    });
    expect(model.getRowId(0)).toBe("src");
    expect(model.getRowId(1)).toBe("src/index");
    expect(model.getRowId(2)).toBe("src/utils");
  });

  it("findVirtualIndex locates nodes by ID", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(["src"]),
    });
    expect(model.findVirtualIndex("src")).toBe(0);
    expect(model.findVirtualIndex("src/utils")).toBe(2);
    expect(model.findVirtualIndex("readme")).toBe(3);
    expect(model.findVirtualIndex("nonexistent")).toBeNull();
  });

  it("findVirtualIndex returns null for collapsed children", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(),
    });
    // src/index is not visible since src is collapsed
    expect(model.findVirtualIndex("src/index")).toBeNull();
  });

  it("throws RangeError for out-of-bounds access", () => {
    const model = createTreeRowModel({
      roots: tree,
      getRowId: (r) => r.id,
      expandedNodes: new Set(),
    });
    expect(() => model.getRow(-1)).toThrow(RangeError);
    expect(() => model.getRow(3)).toThrow(RangeError);
    expect(() => model.getRowId(99)).toThrow(RangeError);
  });

  it("handles empty roots", () => {
    const model = createTreeRowModel({
      roots: [],
      getRowId: (r: FileItem) => r.id,
      expandedNodes: new Set(),
    });
    expect(model.rowCount).toBe(0);
  });
});
