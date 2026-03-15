import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { TreeNode } from "@hobom-grid/core";
import { useTreeGrid } from "./use-tree-grid";

type FileItem = { id: string; name: string };

const tree: TreeNode<FileItem>[] = [
  {
    row: { id: "src", name: "src" },
    children: [
      { row: { id: "src/index", name: "index.ts" } },
      {
        row: { id: "src/utils", name: "utils" },
        children: [{ row: { id: "src/utils/math", name: "math.ts" } }],
      },
    ],
  },
  { row: { id: "readme", name: "README.md" } },
];

describe("useTreeGrid", () => {
  it("starts with only root nodes visible", () => {
    const { result } = renderHook(() => useTreeGrid(tree, (r) => r.id));
    expect(result.current.rowModel.rowCount).toBe(2);
    expect(result.current.rowModel.getRow(0).row.name).toBe("src");
    expect(result.current.rowModel.getRow(1).row.name).toBe("README.md");
  });

  it("toggleNode expands/collapses a node", () => {
    const { result } = renderHook(() => useTreeGrid(tree, (r) => r.id));

    act(() => result.current.toggleNode("src"));
    expect(result.current.isExpanded("src")).toBe(true);
    // src > index.ts > utils > README.md
    expect(result.current.rowModel.rowCount).toBe(4);

    act(() => result.current.toggleNode("src"));
    expect(result.current.isExpanded("src")).toBe(false);
    expect(result.current.rowModel.rowCount).toBe(2);
  });

  it("expandAll shows all nodes", () => {
    const { result } = renderHook(() => useTreeGrid(tree, (r) => r.id));

    act(() => result.current.expandAll());
    // src > index.ts > utils > math.ts > README.md
    expect(result.current.rowModel.rowCount).toBe(5);
    expect(result.current.isExpanded("src")).toBe(true);
    expect(result.current.isExpanded("src/utils")).toBe(true);
  });

  it("collapseAll hides all children", () => {
    const { result } = renderHook(() => useTreeGrid(tree, (r) => r.id, ["src", "src/utils"]));
    expect(result.current.rowModel.rowCount).toBe(5);

    act(() => result.current.collapseAll());
    expect(result.current.rowModel.rowCount).toBe(2);
  });
});
