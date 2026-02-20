import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useColumnResize } from "./use-column-resize";
import type React from "react";

/** Build a minimal mock that satisfies the PointerEvent + currentTarget contract. */
function makeMockEvent(clientX: number): React.PointerEvent<HTMLElement> {
  const listeners: Record<string, EventListener[]> = {};
  const el = {
    setPointerCapture: vi.fn(),
    addEventListener: (type: string, fn: EventListener) => {
      (listeners[type] ??= []).push(fn);
    },
    removeEventListener: (type: string, fn: EventListener) => {
      listeners[type] = (listeners[type] ?? []).filter((f) => f !== fn);
    },
    _fire: (type: string, event: PointerEvent) => {
      (listeners[type] ?? []).forEach((fn) => fn(event));
    },
  };
  return { currentTarget: el, pointerId: 1, clientX } as unknown as React.PointerEvent<HTMLElement>;
}

describe("useColumnResize", () => {
  it("initialises with provided widths", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100, 1: 200, 2: 50 }));
    expect(result.current.colWidths[0]).toBe(100);
    expect(result.current.colWidths[1]).toBe(200);
    expect(result.current.colWidths[2]).toBe(50);
  });

  it("startResize updates width on pointer move", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100 }));
    const e = makeMockEvent(500);
    const el = e.currentTarget as unknown as ReturnType<typeof makeMockEvent>["currentTarget"] & {
      _fire: (type: string, event: PointerEvent) => void;
    };

    act(() => result.current.startResize(0, e));
    expect(el.setPointerCapture).toHaveBeenCalledWith(1);

    // Simulate pointer move 50px to the right → new width = 100 + 50 = 150
    act(() => {
      el._fire("pointermove", new PointerEvent("pointermove", { clientX: 550 }));
    });
    expect(result.current.colWidths[0]).toBe(150);

    // Simulate pointer up to clean up
    act(() => {
      el._fire("pointerup", new PointerEvent("pointerup"));
    });
  });

  it("enforces minWidth", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100 }, 60));
    const e = makeMockEvent(500);
    const el = e.currentTarget as unknown as { _fire: (type: string, event: PointerEvent) => void };

    act(() => result.current.startResize(0, e));
    // Move 200px to the left → would be -100px but clamped to minWidth=60
    act(() => {
      el._fire("pointermove", new PointerEvent("pointermove", { clientX: 300 }));
    });
    expect(result.current.colWidths[0]).toBe(60);

    act(() => {
      el._fire("pointerup", new PointerEvent("pointerup"));
    });
  });

  it("resetWidth removes the override for that column", () => {
    const { result } = renderHook(() => useColumnResize({ 0: 100, 1: 200 }));
    act(() => result.current.resetWidth(0));
    expect(result.current.colWidths[0]).toBeUndefined();
    expect(result.current.colWidths[1]).toBe(200);
  });
});
