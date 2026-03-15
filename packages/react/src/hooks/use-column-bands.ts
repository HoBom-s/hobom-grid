import { useMemo } from "react";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type ColumnBandDef = Readonly<{
  /** Band header label. */
  label: string;
  /** Child columns or nested bands. string = column key by name (matched to visibleCols). */
  children: readonly (string | ColumnBandDef)[];
}>;

export type BandCellInfo = Readonly<{
  /** Label to render in the band header cell. */
  label: string;
  /** Whether this cell is the first (leftmost) cell of the band span. Only first renders content. */
  isFirst: boolean;
  /** Total width of the band span in px. */
  spanWidthPx: number;
  /** Depth of the band (0 = topmost band row). */
  depth: number;
}>;

export type UseColumnBandsResult = Readonly<{
  /** Total number of header rows needed (band rows + 1 for column headers). */
  headerRowCount: number;
  /** Get band cell info for a header cell. Returns null for non-band cells. */
  getBandCell: (headerRow: number, col: number) => BandCellInfo | null;
}>;

// ---------------------------------------------------------------------------
// Implementation
// ---------------------------------------------------------------------------

/**
 * Compute column band layout for multi-level header rows.
 *
 * Band definitions are a tree: each band spans over its leaf columns.
 * The hook flattens this tree into a lookup map keyed by `${row}-${col}`.
 *
 * ```tsx
 * const bands = useColumnBands(bandDefs, colWidths, 120, visibleCols);
 * <Grid headerRowCount={bands.headerRowCount} ... />
 * ```
 */
export const useColumnBands = (
  bands: readonly ColumnBandDef[] | undefined,
  colWidths: Readonly<Record<number, number>>,
  defaultColWidth: number,
  visibleCols: readonly string[],
): UseColumnBandsResult => {
  const colWidthsKey = JSON.stringify(colWidths);

  return useMemo(() => {
    if (!bands || bands.length === 0) {
      return {
        headerRowCount: 1,
        getBandCell: () => null,
      };
    }

    const maxDepth = getMaxDepth(bands);
    const headerRowCount = maxDepth + 1; // +1 for the column header row

    // Build lookup: Map<"row-col", BandCellInfo>
    const lookup = new Map<string, BandCellInfo>();

    for (const band of bands) {
      flattenBand(band, 0, maxDepth, visibleCols, colWidths, defaultColWidth, lookup);
    }

    const getBandCell = (headerRow: number, col: number): BandCellInfo | null => {
      return lookup.get(`${headerRow}-${col}`) ?? null;
    };

    return { headerRowCount, getBandCell };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- colWidthsKey is content key
  }, [bands, colWidthsKey, defaultColWidth, visibleCols]);
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getMaxDepth(bands: readonly (string | ColumnBandDef)[]): number {
  let max = 0;
  for (const item of bands) {
    if (typeof item === "string") continue;
    const childDepth = 1 + getMaxDepth(item.children);
    if (childDepth > max) max = childDepth;
  }
  return max;
}

function getLeafColumns(band: ColumnBandDef, visibleCols: readonly string[]): number[] {
  const result: number[] = [];
  for (const child of band.children) {
    if (typeof child === "string") {
      const idx = visibleCols.indexOf(child);
      if (idx >= 0) result.push(idx);
    } else {
      result.push(...getLeafColumns(child, visibleCols));
    }
  }
  return result;
}

function flattenBand(
  band: ColumnBandDef,
  depth: number,
  maxDepth: number,
  visibleCols: readonly string[],
  colWidths: Readonly<Record<number, number>>,
  defaultColWidth: number,
  lookup: Map<string, BandCellInfo>,
): void {
  const leafCols = getLeafColumns(band, visibleCols);
  if (leafCols.length === 0) return;

  const spanWidthPx = leafCols.reduce(
    (sum, colIdx) => sum + (colWidths[colIdx] ?? defaultColWidth),
    0,
  );

  const firstCol = Math.min(...leafCols);

  // Fill band cells for this row
  for (const colIdx of leafCols) {
    lookup.set(`${depth}-${colIdx}`, {
      label: band.label,
      isFirst: colIdx === firstCol,
      spanWidthPx,
      depth,
    });
  }

  // If this band has no sub-bands, fill remaining rows (depth+1 .. maxDepth-1)
  // so deeper band rows show empty cells for simple leaf columns
  const hasSubBands = band.children.some((c) => typeof c !== "string");
  if (!hasSubBands) {
    for (let row = depth + 1; row < maxDepth; row++) {
      for (const colIdx of leafCols) {
        if (!lookup.has(`${row}-${colIdx}`)) {
          lookup.set(`${row}-${colIdx}`, {
            label: "",
            isFirst: false,
            spanWidthPx: colWidths[colIdx] ?? defaultColWidth,
            depth: row,
          });
        }
      }
    }
  }

  // Recurse into child bands
  for (const child of band.children) {
    if (typeof child !== "string") {
      flattenBand(child, depth + 1, maxDepth, visibleCols, colWidths, defaultColWidth, lookup);
    }
  }
}
