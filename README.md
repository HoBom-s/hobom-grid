# hobom-grid

Framework-agnostic, headless-first data grid engine with thin UI adapters.

<br />

## Packages

- `@hobom-grid/core`
  - Headless grid engine (state, virtualization, view model)
  - No DOM / no framework dependency
- `@hobom-grid/react`
  - React adapter + renderer for demos
- `apps/examples-react`
  - React demo app (virtualized 100k rows)
- `apps/docs`
  - Documentation site + generated API reference

<br />

## Command

### Install
```bash
pnpm install
```

### Build
```bash
pnpm build
```

### Dev
Run only the example:
```bash
pnpm dev:examples
```

### Testing
```bash
pnpm test
```

### Coverage
Coverage output: Console summary

coverage/ directory (HTML report)
```bash
pnpm coverage
```

### Documentation
Documentation (Automated)

### Build docs
```bash
pnpm docs:build
```

### Generate API reference (from TypeScript types)
```bash
pnpm docs:api
```

<br />

## Design Principles

Headless core, UI adapters are optional

ViewModel-driven rendering (renderer consumes VM only)

Performance-first virtualization

Feature/plugin extensibility (later phases)
