# Ecosystem

## Context Menu

`useContextMenu` manages open/close state for a right-click context menu.
Pair it with the `<ContextMenu>` component (or your own UI) to render the actual menu.

### Basic Usage

```tsx
import { useContextMenu, ContextMenu, Grid } from "@hobom-grid/react";

function App() {
  const contextMenu = useContextMenu();

  return (
    <div style={{ position: "relative" }}>
      <Grid
        ...
        renderCell={(cell, { interactionState }) => (
          <div
            style={{ width: "100%", height: "100%" }}
            onContextMenu={(e) => {
              e.preventDefault();
              contextMenu.openMenu(e.clientX, e.clientY, [
                {
                  kind: "label",
                  text: `Cell (${cell.rowIndex}, ${cell.colIndex})`,
                },
                { kind: "separator" },
                {
                  kind: "action",
                  label: "Copy",
                  shortcut: "Ctrl+C",
                  icon: "📋",
                  onSelect: () => navigator.clipboard.writeText("..."),
                },
                {
                  kind: "action",
                  label: "Edit",
                  icon: "✏️",
                  onSelect: () => editing.startEdit(cell.rowIndex, cell.colIndex),
                },
              ]);
            }}
          />
        )}
      />

      {/* Renders the menu at the stored position */}
      {contextMenu.menuState && (
        <ContextMenu
          state={contextMenu.menuState}
          onClose={contextMenu.closeMenu}
        />
      )}
    </div>
  );
}
```

### Auto-close Behaviour

The hook automatically closes the menu when:

- The user presses `Escape`
- The user clicks anywhere outside an element marked with `data-hobom-context-menu`

### Item Types

```ts
// Section label (non-interactive)
{ kind: "label"; text: string }

// Horizontal separator
{ kind: "separator" }

// Clickable action
{
  kind: "action";
  label: string;
  shortcut?: string;   // displayed on the right (e.g. "Ctrl+C")
  icon?: string;       // emoji or short text shown before label
  disabled?: boolean;
  onSelect: () => void;
}
```

### `useContextMenu` API

| Property                | Type                       | Description                                            |
| ----------------------- | -------------------------- | ------------------------------------------------------ |
| `menuState`             | `ContextMenuState \| null` | Current menu position and items, or `null` when closed |
| `openMenu(x, y, items)` | function                   | Open the menu at the given client coordinates          |
| `closeMenu()`           | function                   | Close the menu                                         |

### `<ContextMenu>` Props

| Prop      | Type               | Description                                            |
| --------- | ------------------ | ------------------------------------------------------ |
| `state`   | `ContextMenuState` | The menu state from `useContextMenu`                   |
| `onClose` | `() => void`       | Called when the user selects an item or clicks outside |

---

## CSV Export

`useCsvExport` generates an RFC 4180-compliant CSV and triggers a browser download.

### Basic Usage

```tsx
import { useCsvExport, useClientRowModel } from "@hobom-grid/react";

type Employee = { name: string; age: number; salary: number };

const COLUMNS = [
  { label: "Name", getValue: (r: Employee) => r.name },
  { label: "Age", getValue: (r: Employee) => r.age },
  {
    label: "Salary",
    getValue: (r: Employee) => r.salary,
    formatValue: (v: unknown) => `$${(v as number).toLocaleString()}`,
  },
];

function App({ data }: { data: Employee[] }) {
  const rowModel = useClientRowModel(data);
  const csvExport = useCsvExport({ columns: COLUMNS });

  return (
    <button
      onClick={() => {
        const rows = Array.from({ length: rowModel.rowCount }, (_, i) => rowModel.getRow(i));
        csvExport.exportCsv(rows, "employees.csv");
      }}
    >
      Export CSV
    </button>
  );
}
```

### CSV Formatting

- The output is UTF-8 with a BOM prefix (`\uFEFF`) for correct Excel compatibility.
- Lines are separated by `\r\n` (CRLF) per RFC 4180.
- Values containing commas, double-quotes, or newlines are automatically quoted.
- Double-quotes inside values are escaped as `""`.

### `CsvColumnDef` Options

| Option        | Type                     | Required | Description                                     |
| ------------- | ------------------------ | -------- | ----------------------------------------------- |
| `label`       | `string`                 | ✅       | Column header written to the first CSV row      |
| `getValue`    | `(row: TRow) => unknown` | ✅       | Extract the raw value from a row                |
| `formatValue` | `(v: unknown) => string` | —        | Serialise the value. Default: `String(v ?? "")` |

### `exportCsv` Signature

```ts
exportCsv(rows: ReadonlyArray<TRow>, filename?: string): void
// filename defaults to "export.csv"
```

### Exporting a Subset

You can export filtered or selected rows only:

```tsx
// Only selected rows
const selectedRowData = data.filter((r) => rowSel.isSelected(r.id));
csvExport.exportCsv(selectedRowData, "selected.csv");

// Only filtered rows (from useClientRowModel)
const filteredRows = Array.from({ length: rowModel.rowCount }, (_, i) => rowModel.getRow(i));
csvExport.exportCsv(filteredRows);
```
