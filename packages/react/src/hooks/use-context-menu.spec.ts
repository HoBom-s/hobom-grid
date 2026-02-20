import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useContextMenu } from "./use-context-menu";

const makeItems = () => [{ kind: "action" as const, label: "Copy", onSelect: () => {} }];

describe("useContextMenu", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useContextMenu());
    expect(result.current.menuState).toBeNull();
  });

  it("openMenu sets state with position and items", () => {
    const { result } = renderHook(() => useContextMenu());
    const items = makeItems();
    act(() => result.current.openMenu(100, 200, items));
    expect(result.current.menuState).not.toBeNull();
    expect(result.current.menuState?.x).toBe(100);
    expect(result.current.menuState?.y).toBe(200);
    expect(result.current.menuState?.items).toBe(items);
  });

  it("closeMenu sets state to null", () => {
    const { result } = renderHook(() => useContextMenu());
    act(() => result.current.openMenu(10, 20, makeItems()));
    act(() => result.current.closeMenu());
    expect(result.current.menuState).toBeNull();
  });

  it("Escape keydown closes an open menu", () => {
    const { result } = renderHook(() => useContextMenu());
    act(() => result.current.openMenu(10, 20, makeItems()));
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));
    });
    expect(result.current.menuState).toBeNull();
  });

  it("opening another menu replaces the first", () => {
    const { result } = renderHook(() => useContextMenu());
    const items1 = makeItems();
    const items2 = [{ kind: "action" as const, label: "Paste", onSelect: () => {} }];
    act(() => result.current.openMenu(10, 10, items1));
    act(() => result.current.openMenu(50, 60, items2));
    expect(result.current.menuState?.x).toBe(50);
    expect(result.current.menuState?.y).toBe(60);
    expect(result.current.menuState?.items).toBe(items2);
  });
});
