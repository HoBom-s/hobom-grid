import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { createClientRowModel } from "@hobom-grid/core";
import { usePagination } from "./use-pagination";

type Item = { id: number; name: string };

const items: Item[] = Array.from({ length: 35 }, (_, i) => ({
  id: i + 1,
  name: `Item ${i + 1}`,
}));
const source = createClientRowModel({ rows: items, getId: (r) => r.id });

describe("usePagination", () => {
  it("returns first page by default", () => {
    const { result } = renderHook(() => usePagination(source, { initialPageSize: 10 }));
    expect(result.current.rowModel.rowCount).toBe(10);
    expect(result.current.currentPage).toBe(0);
    expect(result.current.totalPages).toBe(4);
    expect(result.current.totalRows).toBe(35);
  });

  it("setPage navigates to a different page", () => {
    const { result } = renderHook(() => usePagination(source, { initialPageSize: 10 }));
    act(() => result.current.setPage(2));
    expect(result.current.currentPage).toBe(2);
    expect(result.current.rowModel.rowCount).toBe(10);
    expect(result.current.rowModel.getRow(0).name).toBe("Item 21");
  });

  it("setPageSize resets to page 0", () => {
    const { result } = renderHook(() => usePagination(source, { initialPageSize: 10 }));
    act(() => result.current.setPage(2));
    act(() => result.current.setPageSize(20));
    expect(result.current.currentPage).toBe(0);
    expect(result.current.pageSize).toBe(20);
    expect(result.current.totalPages).toBe(2);
  });

  it("canGoPrev/canGoNext reflect boundaries", () => {
    const { result } = renderHook(() => usePagination(source, { initialPageSize: 10 }));
    expect(result.current.canGoPrev).toBe(false);
    expect(result.current.canGoNext).toBe(true);

    act(() => result.current.goLast());
    expect(result.current.canGoPrev).toBe(true);
    expect(result.current.canGoNext).toBe(false);
  });

  it("goFirst/goLast/goPrev/goNext navigate correctly", () => {
    const { result } = renderHook(() => usePagination(source, { initialPageSize: 10 }));

    act(() => result.current.goLast());
    expect(result.current.currentPage).toBe(3);

    act(() => result.current.goFirst());
    expect(result.current.currentPage).toBe(0);

    act(() => result.current.goNext());
    expect(result.current.currentPage).toBe(1);

    act(() => result.current.goPrev());
    expect(result.current.currentPage).toBe(0);
  });

  it("clamps page when source shrinks", () => {
    const smallSource = createClientRowModel({ rows: items.slice(0, 5), getId: (r) => r.id });
    const { result } = renderHook(() =>
      usePagination(smallSource, { initialPage: 99, initialPageSize: 10 }),
    );
    // Page 99 gets clamped to 0 (only 1 page)
    expect(result.current.currentPage).toBe(0);
    expect(result.current.rowModel.rowCount).toBe(5);
  });
});
