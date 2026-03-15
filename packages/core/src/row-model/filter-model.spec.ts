import { describe, it, expect } from "vitest";
import { composeFilterSpec } from "./filter-model";
import type { FilterColumnDef, FilterState } from "./filter-model";

type Product = { name: string; category: string; price: number };

const products: Product[] = [
  { name: "Apple", category: "Fruit", price: 1.5 },
  { name: "Banana", category: "Fruit", price: 0.8 },
  { name: "Carrot", category: "Vegetable", price: 2.0 },
  { name: "Donut", category: "Snack", price: 3.5 },
  { name: "Eggplant", category: "Vegetable", price: 4.0 },
];

const defs: FilterColumnDef<Product>[] = [
  { key: "name", type: "text" },
  { key: "category", type: "select", options: ["Fruit", "Vegetable", "Snack"] },
  { key: "price", type: "range" },
];

describe("composeFilterSpec", () => {
  it("returns undefined when no filters are active", () => {
    const state: FilterState = {};
    expect(composeFilterSpec(defs, state)).toBeUndefined();
  });

  it("returns undefined when all filters are inactive", () => {
    const state: FilterState = {
      name: { type: "text", value: "app", active: false },
    };
    expect(composeFilterSpec(defs, state)).toBeUndefined();
  });

  it("filters by text (case-insensitive substring)", () => {
    const state: FilterState = {
      name: { type: "text", value: "an", active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Banana", "Eggplant"]);
  });

  it("filters by select (inclusion)", () => {
    const state: FilterState = {
      category: { type: "select", value: ["Fruit"], active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Apple", "Banana"]);
  });

  it("filters by range (min/max)", () => {
    const state: FilterState = {
      price: { type: "range", value: [1.0, 3.0], active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Apple", "Carrot"]);
  });

  it("range with null min (unbounded lower)", () => {
    const state: FilterState = {
      price: { type: "range", value: [null, 2.0], active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Apple", "Banana", "Carrot"]);
  });

  it("combines multiple filters (AND logic)", () => {
    const state: FilterState = {
      category: { type: "select", value: ["Vegetable"], active: true },
      price: { type: "range", value: [null, 3.0], active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Carrot"]);
  });

  it("supports custom filter type", () => {
    const customDefs: FilterColumnDef<Product>[] = [
      {
        key: "name",
        type: "custom",
        match: (row, value) => row.name.length > (value as number),
      },
    ];
    const state: FilterState = {
      name: { type: "custom", value: 5, active: true },
    };
    const spec = composeFilterSpec(customDefs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result.map((p) => p.name)).toEqual(["Banana", "Carrot", "Eggplant"]);
  });

  it("text filter with empty string matches all", () => {
    const state: FilterState = {
      name: { type: "text", value: "", active: true },
    };
    const spec = composeFilterSpec(defs, state)!;
    const result = products.filter((p) => spec(p, 0));
    expect(result).toHaveLength(5);
  });
});
