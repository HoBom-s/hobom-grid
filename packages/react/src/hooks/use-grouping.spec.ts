import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createClientRowModel } from "@hobom-grid/core";
import { useGrouping } from "./use-grouping";

type Employee = { id: number; name: string; dept: string };

const employees: Employee[] = [
  { id: 1, name: "Alice", dept: "Eng" },
  { id: 2, name: "Bob", dept: "Eng" },
  { id: 3, name: "Charlie", dept: "Sales" },
  { id: 4, name: "Diana", dept: "Sales" },
];

const source = createClientRowModel({ rows: employees, getId: (r) => r.id });

describe("useGrouping", () => {
  it("starts with all groups collapsed", () => {
    const { result } = renderHook(() =>
      useGrouping(source, {
        groupBy: [{ getGroupValue: (r) => r.dept }],
      }),
    );
    expect(result.current.rowModel.rowCount).toBe(2); // 2 group headers
    expect(result.current.expandedGroups.size).toBe(0);
  });

  it("toggleGroup expands and collapses", () => {
    const { result } = renderHook(() =>
      useGrouping(source, {
        groupBy: [{ getGroupValue: (r) => r.dept }],
      }),
    );

    act(() => result.current.toggleGroup("Eng"));
    expect(result.current.isExpanded("Eng")).toBe(true);
    // Eng header + 2 data + Sales header = 4
    expect(result.current.rowModel.rowCount).toBe(4);

    act(() => result.current.toggleGroup("Eng"));
    expect(result.current.isExpanded("Eng")).toBe(false);
    expect(result.current.rowModel.rowCount).toBe(2);
  });

  it("collapseAll collapses everything", () => {
    const { result } = renderHook(() =>
      useGrouping(source, {
        groupBy: [{ getGroupValue: (r) => r.dept }],
        initialExpanded: ["Eng", "Sales"],
      }),
    );
    expect(result.current.rowModel.rowCount).toBe(6); // 2 headers + 4 data

    act(() => result.current.collapseAll());
    expect(result.current.rowModel.rowCount).toBe(2);
  });

  it("expandAll expands everything", () => {
    const { result } = renderHook(() =>
      useGrouping(source, {
        groupBy: [{ getGroupValue: (r) => r.dept }],
      }),
    );
    act(() => result.current.expandAll());
    expect(result.current.rowModel.rowCount).toBe(6); // 2 headers + 4 data
  });
});
