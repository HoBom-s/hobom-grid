import { describe, it } from "vitest";
import { Fenwick } from "./fenwick.helper";
import { assertScaling } from "../__perf__/measure";

const SMALL_N = 10_000;
const LARGE_N = 1_000_000;
const MAX_RATIO = 5;

describe("Fenwick complexity", () => {
  it("add() scales O(log N)", () => {
    assertScaling({
      label: "Fenwick.add",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const fw = new Fenwick(n);
        fw.buildFrom(new Float64Array(n).fill(30));
        return () => fw.add(Math.floor(Math.random() * n), 1);
      },
    });
  });

  it("sumPrefixExclusive() scales O(log N)", () => {
    assertScaling({
      label: "Fenwick.sumPrefixExclusive",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const fw = new Fenwick(n);
        fw.buildFrom(new Float64Array(n).fill(30));
        return () => fw.sumPrefixExclusive(Math.floor(Math.random() * n));
      },
    });
  });

  it("lowerBound() scales O(log N)", () => {
    assertScaling({
      label: "Fenwick.lowerBound",
      smallN: SMALL_N,
      largeN: LARGE_N,
      maxRatio: MAX_RATIO,
      setup: (n) => {
        const fw = new Fenwick(n);
        fw.buildFrom(new Float64Array(n).fill(30));
        const total = fw.sumAll();
        return () => fw.lowerBound(Math.random() * total);
      },
    });
  });
});
