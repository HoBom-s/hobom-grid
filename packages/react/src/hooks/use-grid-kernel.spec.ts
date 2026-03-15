import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridKernel } from "./use-grid-kernel";

// Mock ResizeObserver
const mockRO = {
  observe: vi.fn(),
  disconnect: vi.fn(),
  unobserve: vi.fn(),
};
vi.stubGlobal(
  "ResizeObserver",
  vi.fn(() => mockRO),
);

const baseSpec = {
  rowCount: 5,
  colCount: 3,
  defaultRowHeight: 32,
  defaultColWidth: 120,
  headerRowCount: 1,
  pinnedColStartCount: 0,
  pinnedColEndCount: 0,
  overscanPx: 150,
};

describe("useGridKernel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns initial viewport and viewModel", () => {
    const { result } = renderHook(() => useGridKernel(baseSpec));
    expect(result.current.viewport).toBeDefined();
    expect(result.current.viewModel).toBeDefined();
    expect(result.current.rowAxis).toBeDefined();
    expect(result.current.colAxis).toBeDefined();
  });

  it("does not recreate colAxis when colSizes content is identical", () => {
    const { result, rerender } = renderHook((props) => useGridKernel(props), {
      initialProps: {
        ...baseSpec,
        colSizes: { 0: 100, 1: 200 } as Readonly<Record<number, number>>,
      },
    });

    const firstColAxis = result.current.colAxis;

    // Rerender with a new object reference but same content
    rerender({ ...baseSpec, colSizes: { 0: 100, 1: 200 } as Readonly<Record<number, number>> });

    expect(result.current.colAxis).toBe(firstColAxis);
  });

  it("recreates colAxis when colSizes content changes", () => {
    const { result, rerender } = renderHook((props) => useGridKernel(props), {
      initialProps: { ...baseSpec, colSizes: { 0: 100 } as Readonly<Record<number, number>> },
    });

    const firstColAxis = result.current.colAxis;

    rerender({ ...baseSpec, colSizes: { 0: 200 } as Readonly<Record<number, number>> });

    expect(result.current.colAxis).not.toBe(firstColAxis);
  });

  it("scrollToCell returns a stable function reference", () => {
    const { result, rerender } = renderHook((props) => useGridKernel(props), {
      initialProps: baseSpec,
    });

    const first = result.current.scrollToCell;
    rerender(baseSpec);
    expect(result.current.scrollToCell).toBe(first);
  });

  it("handleScroll updates query from scroll event", () => {
    const { result } = renderHook(() => useGridKernel(baseSpec));

    const initialViewport = result.current.viewport;

    // Simulate scroll
    act(() => {
      result.current.handleScroll({
        currentTarget: { scrollLeft: 50, scrollTop: 100 },
      } as unknown as React.UIEvent<HTMLDivElement>);
    });

    // Viewport should have changed because query changed
    expect(result.current.viewport).not.toBe(initialViewport);
  });
});
