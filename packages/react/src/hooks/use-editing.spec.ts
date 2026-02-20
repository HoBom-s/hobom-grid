import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useEditing } from "./use-editing";
import type { InteractionKernelState } from "@hobom-grid/core";

// Minimal stub for InteractionKernelState
const makeInteractionState = (focusCell?: { row: number; col: number }): InteractionKernelState =>
  ({
    isFocused: true,
    focusCell: focusCell ?? null,
    hover: null,
    selection: { ranges: [] },
    drag: null,
  }) as unknown as InteractionKernelState;

const DATA: Record<string, Record<number, unknown>> = {
  "1,0": "Alice",
  "1,1": 90000,
};

const getValue = (row: number, col: number): unknown => DATA[`${row},${col}`] ?? "";

describe("useEditing", () => {
  it("starts with no active edit", () => {
    const { result } = renderHook(() => useEditing({ getValue }, makeInteractionState()));
    expect(result.current.editingState.activeEdit).toBeNull();
    expect(result.current.editValue).toBeUndefined();
  });

  it("startEdit opens an edit session", () => {
    const { result } = renderHook(() => useEditing({ getValue }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    expect(result.current.editingState.activeEdit?.row).toBe(1);
    expect(result.current.editingState.activeEdit?.col).toBe(0);
    expect(result.current.editValue).toBe("Alice");
  });

  it("setEditValue updates the current edit value", () => {
    const { result } = renderHook(() => useEditing({ getValue }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    act(() => result.current.setEditValue("Bob"));
    expect(result.current.editValue).toBe("Bob");
  });

  it("cancel closes the edit session without committing", () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEditing({ getValue, onCommit }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    act(() => result.current.cancel());
    expect(result.current.editingState.activeEdit).toBeNull();
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("commit closes the edit and calls onCommit when value changed", async () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEditing({ getValue, onCommit }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    act(() => result.current.setEditValue("Charlie"));
    await act(() => result.current.commit());
    expect(result.current.editingState.activeEdit).toBeNull();
    expect(onCommit).toHaveBeenCalledWith({
      row: 1,
      col: 0,
      previousValue: "Alice",
      newValue: "Charlie",
    });
  });

  it("commit does NOT call onCommit when value unchanged", async () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() => useEditing({ getValue, onCommit }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    // Don't change the value
    await act(() => result.current.commit());
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("validate blocks commit on invalid value", async () => {
    const onCommit = vi.fn();
    const { result } = renderHook(() =>
      useEditing(
        {
          getValue,
          onCommit,
          validate: (v) =>
            String(v).trim() === "" ? { valid: false, message: "Required" } : { valid: true },
        },
        makeInteractionState(),
      ),
    );
    act(() => result.current.startEdit(1, 0));
    act(() => result.current.setEditValue(""));
    await act(() => result.current.commit());
    expect(result.current.editingState.activeEdit?.validationState).toBe("invalid");
    expect(result.current.editingState.activeEdit?.validationMessage).toBe("Required");
    expect(onCommit).not.toHaveBeenCalled();
  });

  it("isEditable guards startEdit", () => {
    const { result } = renderHook(() =>
      useEditing(
        { getValue, isEditable: (row, col) => row > 0 && col > 0 },
        makeInteractionState(),
      ),
    );
    act(() => result.current.startEdit(0, 0)); // header row — not editable
    expect(result.current.editingState.activeEdit).toBeNull();
    act(() => result.current.startEdit(1, 1)); // body cell — editable
    expect(result.current.editingState.activeEdit).not.toBeNull();
  });

  it("isEditing returns true only for the active cell", () => {
    const { result } = renderHook(() => useEditing({ getValue }, makeInteractionState()));
    act(() => result.current.startEdit(1, 0));
    expect(result.current.isEditing(1, 0)).toBe(true);
    expect(result.current.isEditing(1, 1)).toBe(false);
    expect(result.current.isEditing(2, 0)).toBe(false);
  });
});
