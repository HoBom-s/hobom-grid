# hobom-grid

Framework-agnostic, headless-first data grid engine with thin UI adapters.

[![CI](https://github.com/HoBom-s/hobom-grid/actions/workflows/ci.yml/badge.svg)](https://github.com/HoBom-s/hobom-grid/actions/workflows/ci.yml)
[![npm @hobom-grid/core](https://img.shields.io/npm/v/@hobom-grid/core)](https://www.npmjs.com/package/@hobom-grid/core)
[![npm @hobom-grid/react](https://img.shields.io/npm/v/@hobom-grid/react)](https://www.npmjs.com/package/@hobom-grid/react)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)

**[Documentation](https://hobom-s.github.io/hobom-grid/)**

<br />

## Packages

| Package                                 | Description                                                                                          |
| --------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| [`@hobom-grid/core`](./packages/core)   | Headless grid engine — virtualization, interaction, editing, data pipeline. Zero DOM/framework deps. |
| [`@hobom-grid/react`](./packages/react) | React adapter — `<Grid>` component + 12 composable hooks                                             |
| `apps/examples-react`                   | Demo app — virtualized 100k rows with all features                                                   |
| `apps/docs`                             | [Documentation site](https://hobom-s.github.io/hobom-grid/) + API reference                          |

<br />

## Features

- **Virtualization** — Fenwick-tree O(log N) variable-size rows/columns, 100k+ rows
- **Selection & Focus** — Single cell, range, multi-range (Shift/Ctrl+Click)
- **Cell Editing** — F2/Enter/double-click to edit, async validation, commit/cancel
- **Clipboard** — Copy/paste with TSV format (Ctrl+C/V)
- **Column Resize** — Pointer drag with `setPointerCapture`
- **Column Reorder** — Drag-and-drop with visual feedback
- **Column Visibility** — Show/hide columns
- **Row Selection** — Checkbox-style multi-row selection
- **Aggregate Row** — Sum/avg/min/max/count footer
- **Sort & Filter** — Client-side data pipeline with ID mapping
- **Context Menu** — Right-click menus with portal rendering
- **CSV Export** — Export filtered data to CSV

<br />

## Quick Start

```bash
pnpm install
pnpm build
pnpm dev:examples   # http://localhost:3000
```

<br />

## Commands

| Command             | Description                            |
| ------------------- | -------------------------------------- |
| `pnpm install`      | Install dependencies                   |
| `pnpm build`        | Build all packages                     |
| `pnpm dev:examples` | Run example app (port 3000)            |
| `pnpm test`         | Run all tests                          |
| `pnpm coverage`     | Run tests with coverage report         |
| `pnpm lint`         | Lint all packages                      |
| `pnpm typecheck`    | Type-check all packages                |
| `pnpm docs:build`   | Build documentation site               |
| `pnpm docs:api`     | Generate API reference from types      |
| `pnpm bench:core`   | Run performance benchmarks (ops/sec)   |
| `pnpm coverage`     | Run tests with coverage threshold gate |

<br />

## Performance

hobom-grid is built for performance. The core engine uses Fenwick tree (BIT) based O(log N)
virtualization with anchor-based scroll stabilization.

### Complexity Guarantees

| Operation                | Complexity | 1M rows bench  |
| ------------------------ | ---------- | -------------- |
| Fenwick add / prefix sum | O(log N)   | ~20M ops/sec   |
| Offset lookup            | O(log N)   | ~17M ops/sec   |
| Visible segment query    | O(log N)   | ~2.2M ops/sec  |
| Viewport compute         | O(log N)   | ~1M ops/sec    |
| Row lookup / ID reverse  | O(1)       | ~7-42M ops/sec |

### Automated Regression Detection

Every PR is automatically tested for complexity regressions via ratio-based scaling tests:

- Same operation at N=10K and N=1M, median time ratio must stay within threshold
- O(log N) ops: ratio < 5, O(1) ops: ratio < 8
- If someone accidentally degrades O(log N) to O(N), the ratio jumps to ~100 and CI fails

<br />

## Design Principles

- **Headless core** — UI adapters are optional; core has zero DOM dependencies
- **ViewModel-driven** — Renderer consumes flat `CellVM[]` array with pre-computed coordinates
- **Performance-first** — Fenwick tree virtualization, anchor-based scroll stabilization, CSS sticky overlay
- **Composable hooks** — Each feature is an independent hook; use only what you need

<br />

## License

[MIT](./LICENSE)
