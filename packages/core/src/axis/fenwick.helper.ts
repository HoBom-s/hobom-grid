import { assertNonNegativeInt } from "../contracts/contracts-math";

/**
 * Fenwick Tree (Binary Indexed Tree)
 * - point updates + prefix sum queries in O(log N)
 * - lowerBound to find first index where prefix sum crosses target
 *
 * Used to support variable-size virtualization with frequent measurements.
 */
export class Fenwick {
  private readonly n: number;
  private readonly bit: Float64Array;

  constructor(n: number) {
    assertNonNegativeInt(n, "n");
    this.n = n;
    this.bit = new Float64Array(n + 1);
  }

  buildFrom(values: Float64Array) {
    if (values.length !== this.n) throw new Error("Fenwick.buildFrom length mismatch");
    this.bit.fill(0);
    for (let i = 0; i < this.n; i++) this.add(i, values[i]);
  }

  add(index: number, delta: number) {
    for (let i = index + 1; i <= this.n; i += i & -i) this.bit[i] += delta;
  }

  /** sum of [0..endIndex-1] */
  sumPrefixExclusive(endIndex: number): number {
    let res = 0;
    for (let i = endIndex; i > 0; i -= i & -i) res += this.bit[i];
    return res;
  }

  sumAll(): number {
    return this.sumPrefixExclusive(this.n);
  }

  /**
   * Return smallest item index i such that prefix(i+1) > target.
   * - target <= 0 => 0
   * - target >= total => n-1 (caller may clamp)
   */
  lowerBound(target: number): number {
    if (this.n === 0) return -1;
    if (target <= 0) return 0;

    let idx = 0;
    let bitMask = 1;
    while (bitMask << 1 <= this.n) bitMask <<= 1;

    let curr = 0;
    for (let step = bitMask; step !== 0; step >>= 1) {
      const next = idx + step;
      if (next <= this.n && curr + this.bit[next] <= target) {
        idx = next;
        curr += this.bit[next];
      }
    }

    return Math.min(idx, this.n - 1);
  }
}
