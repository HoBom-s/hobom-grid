import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnVisibility } from "./use-column-visibility";

describe("useColumnVisibility", () => {
  it("all columns visible by default", () => {
    const { result } = renderHook(() => useColumnVisibility(3));
    expect(result.current.isVisible(0)).toBe(true);
    expect(result.current.isVisible(1)).toBe(true);
    expect(result.current.isVisible(2)).toBe(true);
    expect(result.current.hiddenCount).toBe(0);
  });

  it("toggleVisibility hides a visible column", () => {
    const { result } = renderHook(() => useColumnVisibility(3));
    act(() => result.current.toggleVisibility(1));
    expect(result.current.isVisible(1)).toBe(false);
    expect(result.current.hiddenCount).toBe(1);
  });

  it("toggleVisibility shows a hidden column", () => {
    const { result } = renderHook(() => useColumnVisibility(3));
    act(() => result.current.toggleVisibility(1));
    act(() => result.current.toggleVisibility(1));
    expect(result.current.isVisible(1)).toBe(true);
    expect(result.current.hiddenCount).toBe(0);
  });

  it("showAll makes all columns visible", () => {
    const { result } = renderHook(() => useColumnVisibility(4));
    act(() => {
      result.current.toggleVisibility(0);
      result.current.toggleVisibility(2);
    });
    expect(result.current.hiddenCount).toBe(2);
    act(() => result.current.showAll());
    expect(result.current.hiddenCount).toBe(0);
    expect(result.current.isVisible(0)).toBe(true);
    expect(result.current.isVisible(2)).toBe(true);
  });

  it("multiple columns can be hidden independently", () => {
    const { result } = renderHook(() => useColumnVisibility(5));
    act(() => {
      result.current.toggleVisibility(0);
      result.current.toggleVisibility(3);
      result.current.toggleVisibility(4);
    });
    expect(result.current.isVisible(0)).toBe(false);
    expect(result.current.isVisible(1)).toBe(true);
    expect(result.current.isVisible(2)).toBe(true);
    expect(result.current.isVisible(3)).toBe(false);
    expect(result.current.isVisible(4)).toBe(false);
    expect(result.current.hiddenCount).toBe(3);
  });
});
