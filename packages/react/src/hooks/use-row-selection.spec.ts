import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRowSelection } from "./use-row-selection";

describe("useRowSelection", () => {
  it("starts with empty selection", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    expect(result.current.selectedCount).toBe(0);
    expect(result.current.isSelected(1)).toBe(false);
  });

  it("toggleRow selects a row", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.toggleRow(5));
    expect(result.current.isSelected(5)).toBe(true);
    expect(result.current.selectedCount).toBe(1);
  });

  it("toggleRow deselects an already-selected row", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => {
      result.current.toggleRow(5);
      result.current.toggleRow(5);
    });
    expect(result.current.isSelected(5)).toBe(false);
    expect(result.current.selectedCount).toBe(0);
  });

  it("selectAll selects all given ids", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.selectAll([1, 2, 3]));
    expect(result.current.isSelected(1)).toBe(true);
    expect(result.current.isSelected(2)).toBe(true);
    expect(result.current.isSelected(3)).toBe(true);
    expect(result.current.selectedCount).toBe(3);
  });

  it("clearAll empties the selection", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.selectAll([1, 2, 3]));
    act(() => result.current.clearAll());
    expect(result.current.selectedCount).toBe(0);
  });

  it("toggleAll selects all when none selected", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.toggleAll([1, 2, 3]));
    expect(result.current.isAllSelected([1, 2, 3])).toBe(true);
  });

  it("toggleAll clears all when all selected", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.selectAll([1, 2, 3]));
    act(() => result.current.toggleAll([1, 2, 3]));
    expect(result.current.selectedCount).toBe(0);
  });

  it("isAllSelected returns false when only some are selected", () => {
    const { result } = renderHook(() => useRowSelection<number>());
    act(() => result.current.toggleRow(1));
    expect(result.current.isAllSelected([1, 2, 3])).toBe(false);
  });

  it("works with string IDs", () => {
    const { result } = renderHook(() => useRowSelection<string>());
    act(() => result.current.toggleRow("abc"));
    expect(result.current.isSelected("abc")).toBe(true);
    expect(result.current.isSelected("xyz")).toBe(false);
  });
});
