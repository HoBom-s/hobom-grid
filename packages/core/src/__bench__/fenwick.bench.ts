import { bench, describe } from "vitest";
import { Fenwick } from "../axis/fenwick.helper";

const N = 1_000_000;

const fw = new Fenwick(N);
fw.buildFrom(new Float64Array(N).fill(30));
const total = fw.sumAll();

describe("Fenwick (1M)", () => {
  bench("add", () => {
    fw.add(Math.floor(Math.random() * N), 1);
  });

  bench("sumPrefixExclusive", () => {
    fw.sumPrefixExclusive(Math.floor(Math.random() * N));
  });

  bench("lowerBound", () => {
    fw.lowerBound(Math.random() * total);
  });

  bench("buildFrom (1M)", () => {
    const fw2 = new Fenwick(N);
    fw2.buildFrom(new Float64Array(N).fill(30));
  });
});
