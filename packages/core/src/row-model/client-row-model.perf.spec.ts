import { describe, it } from "vitest";
import { createClientRowModel } from "./client-row-model";
import { assertScaling } from "../__perf__/measure";

const SMALL_N = 10_000;
const LARGE_N = 1_000_000;
// O(1) array/Map access still shows ~5-6x slowdown at 1M vs 10K due to
// CPU cache hierarchy (1M items exceed L2 cache). maxRatio=8 tolerates
// cache effects while catching any real O(N) regression (ratio ≈ 100).
const MAX_RATIO = 8;

describe("ClientRowModel complexity", () => {
  it("getRow() scales O(1)", () => {
    assertScaling({
      label: "ClientRowModel.getRow",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const rows = Array.from({ length: n }, (_, i) => ({ id: i, value: `row-${i}` }));
        const model = createClientRowModel({ rows, getId: (r) => r.id });
        return () => model.getRow(Math.floor(Math.random() * n));
      },
    });
  });

  it("findVirtualIndex() scales O(1)", () => {
    assertScaling({
      label: "ClientRowModel.findVirtualIndex",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const rows = Array.from({ length: n }, (_, i) => ({ id: i, value: `row-${i}` }));
        const model = createClientRowModel({ rows, getId: (r) => r.id });
        return () => model.findVirtualIndex(Math.floor(Math.random() * n));
      },
    });
  });
});
