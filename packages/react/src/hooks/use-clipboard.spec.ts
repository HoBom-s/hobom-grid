import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useClipboard } from "./use-clipboard";
import type { InteractionKernelState } from "@hobom-grid/core";
import type React from "react";

const makeState = (override?: Partial<InteractionKernelState>): InteractionKernelState => ({
  isFocused: true,
  hover: null,
  focusCell: null,
  selection: { active: null, anchor: null, ranges: [] },
  drag: null,
  ...override,
});

const mockClipboard = () => {
  let stored = "";
  Object.assign(navigator, {
    clipboard: {
      writeText: vi.fn((text: string) => {
        stored = text;
        return Promise.resolve();
      }),
      readText: vi.fn(() => Promise.resolve(stored)),
    },
  });
  return navigator.clipboard;
};

describe("useClipboard", () => {
  beforeEach(() => {
    mockClipboard();
  });

  it("copy does nothing when selection is empty", () => {
    const state = makeState();
    const { result } = renderHook(() => useClipboard({ getValue: () => "" }, state));
    act(() => result.current.copy());
    expect(navigator.clipboard.writeText).not.toHaveBeenCalled();
  });

  it("copy writes TSV to clipboard for single-cell selection", () => {
    const state = makeState({
      selection: {
        active: { row: 0, col: 0 },
        anchor: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
      },
    });
    const { result } = renderHook(() => useClipboard({ getValue: () => "hello" }, state));
    act(() => result.current.copy());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello");
  });

  it("copy builds TSV for multi-cell range", () => {
    const state = makeState({
      selection: {
        active: { row: 0, col: 0 },
        anchor: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 1, col: 1 } }],
      },
    });
    const getValue = (r: number, c: number) => `${r}-${c}`;
    const { result } = renderHook(() => useClipboard({ getValue }, state));
    act(() => result.current.copy());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("0-0\t0-1\n1-0\t1-1");
  });

  it("copy uses formatValue when provided", () => {
    const state = makeState({
      selection: {
        active: { row: 0, col: 0 },
        anchor: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
      },
    });
    const { result } = renderHook(() =>
      useClipboard({ getValue: () => 42, formatValue: (v) => `$${v}` }, state),
    );
    act(() => result.current.copy());
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("$42");
  });

  it("paste does nothing when no onPaste callback", async () => {
    const state = makeState({ focusCell: { row: 0, col: 0 } });
    const { result } = renderHook(() => useClipboard({ getValue: () => "" }, state));
    await act(() => result.current.paste());
    // No error thrown — just returns
  });

  it("paste parses TSV and calls onPaste", async () => {
    const cb = mockClipboard();
    (cb.readText as ReturnType<typeof vi.fn>).mockResolvedValue("a\tb\nc\td");
    const onPaste = vi.fn();
    const state = makeState({ focusCell: { row: 1, col: 2 } });
    const { result } = renderHook(() => useClipboard({ getValue: () => "", onPaste }, state));
    await act(() => result.current.paste());
    expect(onPaste).toHaveBeenCalledWith([
      { row: 1, col: 2, value: "a" },
      { row: 1, col: 3, value: "b" },
      { row: 2, col: 2, value: "c" },
      { row: 2, col: 3, value: "d" },
    ]);
  });

  it("paste filters out-of-bounds cells", async () => {
    const cb = mockClipboard();
    (cb.readText as ReturnType<typeof vi.fn>).mockResolvedValue("a\tb\nc\td");
    const onPaste = vi.fn();
    const state = makeState({ focusCell: { row: 0, col: 0 } });
    const { result } = renderHook(() =>
      useClipboard({ getValue: () => "", onPaste, rowCount: 1, colCount: 1 }, state),
    );
    await act(() => result.current.paste());
    expect(onPaste).toHaveBeenCalledWith([{ row: 0, col: 0, value: "a" }]);
  });

  it("paste handles clipboard error gracefully", async () => {
    const cb = mockClipboard();
    (cb.readText as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("denied"));
    const onPaste = vi.fn();
    const state = makeState({ focusCell: { row: 0, col: 0 } });
    const { result } = renderHook(() => useClipboard({ getValue: () => "", onPaste }, state));
    await act(() => result.current.paste());
    expect(onPaste).not.toHaveBeenCalled();
  });

  it("onKeyDown triggers copy on Ctrl+C", () => {
    const state = makeState({
      selection: {
        active: { row: 0, col: 0 },
        anchor: { row: 0, col: 0 },
        ranges: [{ start: { row: 0, col: 0 }, end: { row: 0, col: 0 } }],
      },
    });
    const { result } = renderHook(() => useClipboard({ getValue: () => "val" }, state));
    const event = {
      key: "c",
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    act(() => result.current.onKeyDown(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(navigator.clipboard.writeText).toHaveBeenCalledWith("val");
  });

  it("onKeyDown triggers paste on Ctrl+V", () => {
    const onPaste = vi.fn();
    const state = makeState({ focusCell: { row: 0, col: 0 } });
    const { result } = renderHook(() => useClipboard({ getValue: () => "", onPaste }, state));
    const event = {
      key: "v",
      ctrlKey: true,
      metaKey: false,
      preventDefault: vi.fn(),
    } as unknown as React.KeyboardEvent<HTMLDivElement>;

    act(() => result.current.onKeyDown(event));
    expect(event.preventDefault).toHaveBeenCalled();
  });

  it("paste does nothing when focusCell is null", async () => {
    const onPaste = vi.fn();
    const state = makeState({ focusCell: null });
    const { result } = renderHook(() => useClipboard({ getValue: () => "", onPaste }, state));
    await act(() => result.current.paste());
    expect(onPaste).not.toHaveBeenCalled();
  });
});
