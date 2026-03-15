import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { FilterColumnDef } from "@hobom-grid/core";
import { useFilterUI } from "./use-filter-ui";

type Product = { name: string; category: string; price: number };

const defs: FilterColumnDef<Product>[] = [
  { key: "name", type: "text" },
  { key: "category", type: "select", options: ["Fruit", "Snack"] },
  { key: "price", type: "range" },
];

describe("useFilterUI", () => {
  it("starts with no active filters", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    expect(result.current.filterSpec).toBeUndefined();
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("setFilter activates a column filter", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    act(() => result.current.setFilter("name", "apple"));
    expect(result.current.activeFilterCount).toBe(1);
    expect(result.current.filterSpec).toBeDefined();
    expect(result.current.filterState["name"].active).toBe(true);
  });

  it("clearFilter removes a single filter", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    act(() => {
      result.current.setFilter("name", "apple");
      result.current.setFilter("category", ["Fruit"]);
    });
    expect(result.current.activeFilterCount).toBe(2);

    act(() => result.current.clearFilter("name"));
    expect(result.current.activeFilterCount).toBe(1);
    expect(result.current.filterState["name"]).toBeUndefined();
  });

  it("clearAllFilters removes all filters", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    act(() => {
      result.current.setFilter("name", "test");
      result.current.setFilter("price", [0, 100]);
    });
    expect(result.current.activeFilterCount).toBe(2);

    act(() => result.current.clearAllFilters());
    expect(result.current.activeFilterCount).toBe(0);
    expect(result.current.filterSpec).toBeUndefined();
  });

  it("popover opens and closes", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    expect(result.current.popover).toBeNull();

    act(() => result.current.openPopover("name", 100, 200));
    expect(result.current.popover).toEqual({ columnKey: "name", x: 100, y: 200 });

    act(() => result.current.closePopover());
    expect(result.current.popover).toBeNull();
  });

  it("ignores setFilter for unknown column key", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    act(() => result.current.setFilter("nonexistent", "val"));
    expect(result.current.activeFilterCount).toBe(0);
  });

  it("filterSpec filters rows correctly", () => {
    const { result } = renderHook(() => useFilterUI(defs));
    act(() => result.current.setFilter("name", "ban"));

    const spec = result.current.filterSpec!;
    const products: Product[] = [
      { name: "Banana", category: "Fruit", price: 1 },
      { name: "Apple", category: "Fruit", price: 2 },
    ];
    const filtered = products.filter((p) => spec(p, 0));
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe("Banana");
  });
});
