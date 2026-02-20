import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnResize } from "./use-column-resize";

describe("useColumnResize", () => {
  it("initialises with provided widths", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100, 1: 200, 2: 50 }));
    expect(result.current.colWidths[0]).toBe(100);
    expect(result.current.colWidths[1]).toBe(200);
    expect(result.current.colWidths[2]).toBe(50);
  });

  it("startResize updates width on pointer move", () => {
    const listeners: Record<string, EventListener> = {};
    vi.spyOn(window, "addEventListener").mockImplementation((type, fn) => {
      listeners[type] = fn as EventListener;
    });
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});

    const { result } = renderHook(() => useColumnResize({ 0: 100 }));

    act(() => result.current.startResize(0, 500));
    // Simulate pointer move 50px to the right → new width = 100 + 50 = 150
    act(() => {
      listeners["pointermove"]?.(new PointerEvent("pointermove", { clientX: 550 }));
    });
    expect(result.current.colWidths[0]).toBe(150);

    // Simulate pointer up to clean up
    act(() => {
      listeners["pointerup"]?.(new PointerEvent("pointerup"));
    });

    vi.restoreAllMocks();
  });

  it("enforces minWidth", () => {
    const listeners: Record<string, EventListener> = {};
    vi.spyOn(window, "addEventListener").mockImplementation((type, fn) => {
      listeners[type] = fn as EventListener;
    });
    vi.spyOn(window, "removeEventListener").mockImplementation(() => {});

    const { result } = renderHook(() => useColumnResize({ 0: 100 }, 60));

    act(() => result.current.startResize(0, 500));
    // Move 200px to the left → would be -100px but clamped to minWidth=60
    act(() => {
      listeners["pointermove"]?.(new PointerEvent("pointermove", { clientX: 300 }));
    });
    expect(result.current.colWidths[0]).toBe(60);

    act(() => {
      listeners["pointerup"]?.(new PointerEvent("pointerup"));
    });
    vi.restoreAllMocks();
  });

  it("resetWidth removes the override for that column", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100, 1: 200 }));
    act(() => result.current.resetWidth(0));
    expect(result.current.colWidths[0]).toBeUndefined();
    expect(result.current.colWidths[1]).toBe(200);
  });
});
