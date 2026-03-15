# Performance

hobom-grid is designed with performance as a first-class concern. The core engine guarantees
sub-logarithmic complexity for all hot-path operations that run every scroll frame.

## Architecture

### Fenwick Tree Virtualization

Unlike flat prefix-sum arrays (used by most virtualizers), hobom-grid uses a
**Fenwick tree (Binary Indexed Tree)** backed by `Float64Array`. This gives:

| Operation                                   | Complexity |
| ------------------------------------------- | ---------- |
| Point size update (`reportMeasuredSize`)    | O(log N)   |
| Prefix sum query (`getOffsetPx`)            | O(log N)   |
| Index lookup (`findIndexAtOffsetPx`)        | O(log N)   |
| Visible segment query (`getVisibleSegment`) | O(log N)   |

The critical advantage over flat arrays: when a row's measured height changes,
only O(log N) tree nodes are updated — not all subsequent offsets.

### Anchor-based Scroll Stabilization

When dynamic measurements update row/column sizes, the scroll position is
recalculated to keep the anchor cell visually stable. This prevents the
"scroll jump" artifact common in virtualizers that use post-hoc scrollTop adjustment.

### Per-frame Cost

For a 1M-row grid with 100 columns and a 30×15 visible viewport:

| Phase                        | Cost                                       |
| ---------------------------- | ------------------------------------------ |
| Viewport computation         | ~1 μs                                      |
| View model build (450 cells) | ~3-5 μs                                    |
| React reconciliation         | ~100-200 μs                                |
| **Total JS per frame**       | **~100-300 μs** (well under 16.6ms budget) |

## Benchmarks

Run benchmarks locally:

```bash
pnpm bench:core
```

Latest results (Apple Silicon, 1M items):

```
Fenwick.add:              ~20M ops/sec
Fenwick.sumPrefix:        ~21M ops/sec
Fenwick.lowerBound:       ~5M ops/sec
MeasuredAxis.getOffsetPx: ~17M ops/sec
MeasuredAxis.findIndex:   ~4.5M ops/sec
ViewportEngine.compute:   ~1M ops/sec
ClientRowModel.getRow:    ~7M ops/sec
```

## Complexity Regression Detection

hobom-grid includes automated complexity regression tests that run in CI.

### How It Works

Each `*.perf.spec.ts` file tests a hot-path operation at two scales:

1. **Small N** (10,000 items) — measures median execution time
2. **Large N** (1,000,000 items) — measures median execution time
3. **Ratio check** — `t_large / t_small` must stay below `maxRatio`

```
O(log N): expected ratio ≈ log(1M)/log(10K) ≈ 1.5 → maxRatio = 5
O(1):     expected ratio ≈ 1.0                     → maxRatio = 8
O(N):     expected ratio ≈ 100                      → FAILS!
```

This approach is **machine-independent**: CI can be 10x slower than your laptop,
but the ratio stays the same.

### Measurement Details

- 50 warmup iterations (JIT stabilization)
- 500 measurement iterations, batched by 100
- Median used (naturally filters GC outliers)

### Tested Operations

| Module         | Operation               | Expected | maxRatio |
| -------------- | ----------------------- | -------- | -------- |
| Fenwick        | `add()`                 | O(log N) | 5        |
| Fenwick        | `sumPrefixExclusive()`  | O(log N) | 5        |
| Fenwick        | `lowerBound()`          | O(log N) | 5        |
| MeasuredAxis   | `getOffsetPx()`         | O(log N) | 5        |
| MeasuredAxis   | `findIndexAtOffsetPx()` | O(log N) | 5        |
| MeasuredAxis   | `getVisibleSegment()`   | O(log N) | 5        |
| MeasuredAxis   | `reportMeasuredSize()`  | O(log N) | 5        |
| ViewportEngine | `compute()`             | O(log N) | 5        |
| ClientRowModel | `getRow()`              | O(1)     | 8        |
| ClientRowModel | `findVirtualIndex()`    | O(1)     | 8        |

## Coverage Thresholds

CI enforces minimum test coverage for `@hobom-grid/core`:

| Metric     | Threshold |
| ---------- | --------- |
| Statements | 80%       |
| Branches   | 65%       |
| Functions  | 90%       |
| Lines      | 85%       |
