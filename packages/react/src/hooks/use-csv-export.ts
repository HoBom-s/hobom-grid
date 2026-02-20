import { useCallback, useRef } from "react";

export type CsvColumnDef<TRow> = Readonly<{
  /** Column header label written to the first row of the CSV. */
  label: string;
  /** Return the raw value for a given row. */
  getValue: (row: TRow) => unknown;
  /** Serialise the value to a CSV-cell string. Default: `String(v ?? "")`. */
  formatValue?: (v: unknown) => string;
}>;

export type UseCsvExportOpts<TRow> = Readonly<{
  columns: ReadonlyArray<CsvColumnDef<TRow>>;
}>;

export type UseCsvExportResult<TRow> = Readonly<{
  /**
   * Generate a CSV from `rows` and trigger a browser download.
   *
   * ```tsx
   * <button onClick={() => {
   *   const rows = Array.from({ length: rowModel.rowCount }, (_, i) => rowModel.getRow(i));
   *   csvExport.exportCsv(rows);
   * }}>
   *   Export CSV
   * </button>
   * ```
   */
  exportCsv: (rows: ReadonlyArray<TRow>, filename?: string) => void;
}>;

// Wrap a CSV cell value in quotes if it contains a comma, quote, or newline.
const escapeCsv = (s: string): string => {
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
};

/**
 * Generates and downloads CSV files from arbitrary row data.
 *
 * ```tsx
 * const csvExport = useCsvExport({
 *   columns: COLUMNS.map((col) => ({
 *     label: col.label,
 *     getValue: (row) => row[col.key],
 *     formatValue: col.format,
 *   })),
 * });
 *
 * <button onClick={() => csvExport.exportCsv(visibleRows, "report.csv")}>
 *   Export CSV
 * </button>
 * ```
 */
export const useCsvExport = <TRow>(opts: UseCsvExportOpts<TRow>): UseCsvExportResult<TRow> => {
  const optsRef = useRef(opts);
  // eslint-disable-next-line react-hooks/refs
  optsRef.current = opts;

  const exportCsv = useCallback((rows: ReadonlyArray<TRow>, filename = "export.csv") => {
    const { columns } = optsRef.current;

    const lines: string[] = [];

    // Header row
    lines.push(columns.map((c) => escapeCsv(c.label)).join(","));

    // Data rows
    for (const row of rows) {
      const cells = columns.map((c) => {
        const v = c.getValue(row);
        const s = c.formatValue ? c.formatValue(v) : String(v ?? "");
        return escapeCsv(s);
      });
      lines.push(cells.join(","));
    }

    const blob = new Blob(["\uFEFF" + lines.join("\r\n")], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.style.display = "none";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
  }, []);

  return { exportCsv };
};
