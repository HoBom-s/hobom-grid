/**
 * Ratio-based complexity regression detection.
 *
 * Runs the same operation at two data sizes (smallN, largeN) and
 * compares median execution times. Machine-independent: only the
 * ratio matters.
 *
 * Expected ratios:
 *   O(1):     ~1.0  → maxRatio = 3
 *   O(log N): ~1.5  → maxRatio = 5  (log(1M)/log(10K) ≈ 1.5)
 *   O(N):     ~100  → exceeds any maxRatio ≤ 5 → FAIL
 */

const WARMUP = 50;
const ITERATIONS = 500;
const BATCH_SIZE = 100;

/**
 * Measure median execution time (ns per op).
 *
 * - Warmup runs stabilize JIT compilation.
 * - Batching amortizes timer resolution overhead.
 * - Median naturally filters GC outliers.
 */
function measureMedianNs(fn: () => void): number {
  // warmup
  for (let i = 0; i < WARMUP * BATCH_SIZE; i++) fn();

  // measure
  const times = new Float64Array(ITERATIONS);
  for (let i = 0; i < ITERATIONS; i++) {
    const start = performance.now();
    for (let j = 0; j < BATCH_SIZE; j++) fn();
    times[i] = ((performance.now() - start) * 1e6) / BATCH_SIZE; // ms → ns per op
  }

  // median
  times.sort();
  return times[Math.floor(ITERATIONS / 2)];
}

/**
 * Assert that an operation's time ratio between two data sizes
 * stays within the expected complexity class.
 *
 * @param opts.setup - Given N, returns a zero-arg closure that
 *   performs one operation on a data structure of size N.
 *   Constant overhead (e.g. Math.random()) is identical for both
 *   sizes and cancels out in the ratio.
 */
export function assertScaling(opts: {
  label: string;
  smallN: number;
  largeN: number;
  setup: (n: number) => () => void;
  maxRatio: number;
}): void {
  const { label, smallN, largeN, setup, maxRatio } = opts;

  const smallOp = setup(smallN);
  const largeOp = setup(largeN);

  const tSmall = measureMedianNs(smallOp);
  const tLarge = measureMedianNs(largeOp);

  const ratio = tSmall > 0 ? tLarge / tSmall : 0;

  if (ratio > maxRatio) {
    throw new Error(
      `[${label}] complexity regression: ` +
        `ratio=${ratio.toFixed(2)} exceeds maxRatio=${maxRatio} ` +
        `(small=${tSmall.toFixed(0)}ns @ N=${smallN}, ` +
        `large=${tLarge.toFixed(0)}ns @ N=${largeN})`,
    );
  }
}
