import { bench, describe } from "vitest";
import { createClientRowModel } from "../row-model/client-row-model";

const N = 1_000_000;

const rows = Array.from({ length: N }, (_, i) => ({ id: i, value: `row-${i}` }));
const model = createClientRowModel({ rows, getId: (r) => r.id });

describe("ClientRowModel (1M)", () => {
  bench("getRow", () => {
    model.getRow(Math.floor(Math.random() * N));
  });

  bench("getRowId", () => {
    model.getRowId(Math.floor(Math.random() * N));
  });

  bench("findVirtualIndex", () => {
    model.findVirtualIndex(Math.floor(Math.random() * N));
  });

  bench("createClientRowModel (10K construction)", () => {
    createClientRowModel({ rows: rows.slice(0, 10_000), getId: (r) => r.id });
  });
});
