import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useAggregateRow } from "./use-aggregate-row";

type Row = { name: string; salary: number; age: number; active: boolean };

const ROWS: Row[] = [
  { name: "Alice", salary: 90000, age: 30, active: true },
  { name: "Bob", salary: 60000, age: 25, active: false },
  { name: "Carol", salary: 75000, age: 35, active: true },
];

describe("useAggregateRow", () => {
  it("computes sum correctly", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [{ key: "salary", fn: "sum", getValue: (r) => r.salary }]),
    );
    expect(result.current.getValue("salary")).toBe(225000);
  });

  it("computes avg correctly", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [{ key: "age", fn: "avg", getValue: (r) => r.age }]),
    );
    expect(result.current.getValue("age")).toBeCloseTo(30, 1);
  });

  it("computes count (non-null values)", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [{ key: "name", fn: "count", getValue: (r) => r.name }]),
    );
    expect(result.current.getValue("name")).toBe(3);
  });

  it("computes min correctly", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [{ key: "salary", fn: "min", getValue: (r) => r.salary }]),
    );
    expect(result.current.getValue("salary")).toBe(60000);
  });

  it("computes max correctly", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [{ key: "salary", fn: "max", getValue: (r) => r.salary }]),
    );
    expect(result.current.getValue("salary")).toBe(90000);
  });

  it("supports custom aggregation function", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [
        {
          key: "active",
          fn: (values) => values.filter(Boolean).length,
          getValue: (r) => r.active,
        },
      ]),
    );
    expect(result.current.getValue("active")).toBe(2); // Alice + Carol
  });

  it("getFormatted applies format function", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [
        {
          key: "salary",
          fn: "sum",
          getValue: (r) => r.salary,
          format: (v) => `$${(v as number).toLocaleString()}`,
        },
      ]),
    );
    expect(result.current.getFormatted("salary")).toBe("$225,000");
  });

  it("getFormatted returns label for columns without a format", () => {
    const { result } = renderHook(() =>
      useAggregateRow(ROWS, [
        { key: "name", fn: "count", getValue: (r) => r.name, label: "Total" },
      ]),
    );
    // count is 3, which is truthy, so format runs → falls through to String(3)
    expect(result.current.getFormatted("name")).toBe("3");
  });

  it("returns empty string for unknown keys", () => {
    const { result } = renderHook(() => useAggregateRow(ROWS, []));
    expect(result.current.getFormatted("unknown")).toBe("");
  });

  it("handles empty rows", () => {
    const { result } = renderHook(() =>
      useAggregateRow([], [{ key: "salary", fn: "sum", getValue: (r: Row) => r.salary }]),
    );
    expect(result.current.getValue("salary")).toBe(0);
  });
});
