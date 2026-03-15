import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnReorder } from "./use-column-reorder";

describe("useColumnReorder", () => {
  afterEach(() => {
    // Clean up any lingering window listeners
    vi.restoreAllMocks();
  });

  it("initial dragState is null", () => {
    const { result } = renderHook(() => useColumnReorder(vi.fn()));
    expect(result.current.dragState).toBeNull();
  });

  it("reportColBounds stores bounds silently", () => {
    const { result } = renderHook(() => useColumnReorder(vi.fn()));
    // Should not throw
    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.reportColBounds(1, 100, 120);
    });
    expect(result.current.dragState).toBeNull();
  });

  it("startReorder sets dragState with from and over equal", () => {
    const { result } = renderHook(() => useColumnReorder(vi.fn()));
    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.reportColBounds(1, 100, 100);
      result.current.reportColBounds(2, 200, 100);
    });

    act(() => {
      result.current.startReorder(1, 150, 0, 3);
    });

    expect(result.current.dragState).toEqual({
      fromVisual: 1,
      overVisual: 1,
    });
  });

  it("pointermove updates overVisual based on midpoint", () => {
    const { result } = renderHook(() => useColumnReorder(vi.fn()));
    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.reportColBounds(1, 100, 100);
      result.current.reportColBounds(2, 200, 100);
    });

    act(() => {
      // containerLeft = 0 for simplicity
      result.current.startReorder(0, 50, 0, 3);
    });

    // Move pointer to x=250 (past midpoint of col 2 at x=250)
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 260 }));
    });

    expect(result.current.dragState?.overVisual).toBe(2);
  });

  it("pointerup calls onReorder when from !== over", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useColumnReorder(onReorder));

    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.reportColBounds(1, 100, 100);
    });

    act(() => {
      result.current.startReorder(0, 50, 0, 2);
    });

    // Move past midpoint of col 1
    act(() => {
      window.dispatchEvent(new PointerEvent("pointermove", { clientX: 160 }));
    });

    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(onReorder).toHaveBeenCalledWith(0, 1);
    expect(result.current.dragState).toBeNull();
  });

  it("pointerup does NOT call onReorder when from === over", () => {
    const onReorder = vi.fn();
    const { result } = renderHook(() => useColumnReorder(onReorder));

    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.reportColBounds(1, 100, 100);
    });

    act(() => {
      result.current.startReorder(0, 50, 0, 2);
    });

    // Don't move — drop in place
    act(() => {
      window.dispatchEvent(new PointerEvent("pointerup"));
    });

    expect(onReorder).not.toHaveBeenCalled();
    expect(result.current.dragState).toBeNull();
  });

  it("unmount cleans up window listeners", () => {
    const removeSpy = vi.spyOn(window, "removeEventListener");
    const { result, unmount } = renderHook(() => useColumnReorder(vi.fn()));

    act(() => {
      result.current.reportColBounds(0, 0, 100);
      result.current.startReorder(0, 50, 0, 1);
    });

    unmount();

    const removedTypes = removeSpy.mock.calls.map((c) => c[0]);
    expect(removedTypes).toContain("pointermove");
    expect(removedTypes).toContain("pointerup");
  });
});
