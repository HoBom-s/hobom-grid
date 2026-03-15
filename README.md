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

| Command             | Description                       |
| ------------------- | --------------------------------- |
| `pnpm install`      | Install dependencies              |
| `pnpm build`        | Build all packages                |
| `pnpm dev:examples` | Run example app (port 3000)       |
| `pnpm test`         | Run all tests                     |
| `pnpm coverage`     | Run tests with coverage report    |
| `pnpm lint`         | Lint all packages                 |
| `pnpm typecheck`    | Type-check all packages           |
| `pnpm docs:build`   | Build documentation site          |
| `pnpm docs:api`     | Generate API reference from types |

<br />

## Design Principles

- **Headless core** — UI adapters are optional; core has zero DOM dependencies
- **ViewModel-driven** — Renderer consumes flat `CellVM[]` array with pre-computed coordinates
- **Performance-first** — Fenwick tree virtualization, anchor-based scroll stabilization, CSS sticky overlay
- **Composable hooks** — Each feature is an independent hook; use only what you need

<br />

## License

[MIT](./LICENSE)
