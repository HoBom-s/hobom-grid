import { px } from "../contracts/contracts-model";
import type { VirtualAxis } from "../axis/virtual-axis";
import type { CellVM, ViewModel } from "./view-model";
import type { ViewportModel } from "../viewport/viewport-model";

type ViewModelBuilderSpec = Readonly<{
  rows: VirtualAxis;
  cols: VirtualAxis;
}>;

export const createViewModelBuilder = (spec: ViewModelBuilderSpec) => {
  const rows = spec.rows;
  const cols = spec.cols;

  /**
   * Build a flat render model.
   * Output is intentionally “UI-ready”:
   * - coordinates are in viewport space
   * - adapter can render by mapping over `cells[]`
   */
  const build = (vp: ViewportModel): ViewModel => {
    const cells: CellVM[] = [];

    const headerRows = vp.rows.header.range;
    const bodyRows = vp.rows.body.range;

    const colStart = vp.cols.start.range;
    const colMain = vp.cols.main.range;
    const colEnd = vp.cols.end.range;

    const rowHeaderY = Number(vp.transforms.rowHeaderY);

    const colPinnedStartX = Number(vp.transforms.colPinnedStartX);
    const colMainX = Number(vp.transforms.colMainX);
    const colPinnedEndX = Number(vp.transforms.colPinnedEndX);

    const scrollLeft = Number(vp.scrollLeftPx);
    const scrollTop = Number(vp.scrollTopPx);

    // Counters for O(1) stats (avoid 4× filter passes over cells array)
    let bodyCellCount = 0;
    let headerCellCount = 0;
    let pinnedStartCellCount = 0;
    let pinnedEndCellCount = 0;

    /**
     * Push a single renderable cell.
     * width/height are resolved from axes (variable sizes supported).
     */
    const pushCell = (
      rowIndex: number,
      colIndex: number,
      kind: CellVM["kind"],
      x: number,
      y: number,
    ) => {
      const width = Number(cols.getSizePx(colIndex));
      const height = Number(rows.getSizePx(rowIndex));
      cells.push({
        rowIndex,
        colIndex,
        kind,
        x: px(x),
        y: px(y),
        width: px(width),
        height: px(height),
      });
      switch (kind) {
        case "body":
          bodyCellCount++;
          break;
        case "header":
          headerCellCount++;
          break;
        case "pinnedStart":
        case "cornerStart":
          pinnedStartCellCount++;
          break;
        case "pinnedEnd":
        case "cornerEnd":
          pinnedEndCellCount++;
          break;
      }
    };

    const iter = (r: { start: number; end: number }, fn: (i: number) => void) => {
      if (r.end < r.start) return;
      for (let i = r.start; i <= r.end; i++) fn(i);
    };

    // ---------------------------
    // Pre-compute column X positions once per build.
    // Eliminates redundant Fenwick queries from per-row inner loops.
    // Savings: ~(headerRows + bodyRows) * totalCols Fenwick queries.
    // ---------------------------
    const colStartCount = colStart.end >= colStart.start ? colStart.end - colStart.start + 1 : 0;
    const colMainCount = colMain.end >= colMain.start ? colMain.end - colMain.start + 1 : 0;
    const colEndCount = colEnd.end >= colEnd.start ? colEnd.end - colEnd.start + 1 : 0;

    const colStartXs = new Float64Array(colStartCount);
    for (let i = 0; i < colStartCount; i++) {
      colStartXs[i] = colPinnedStartX + Number(cols.getOffsetPx(colStart.start + i));
    }

    const colMainXs = new Float64Array(colMainCount);
    for (let i = 0; i < colMainCount; i++) {
      colMainXs[i] = colMainX + Number(cols.getOffsetPx(colMain.start + i)) - scrollLeft;
    }

    const colEndBase = colEndCount > 0 ? Number(cols.getOffsetPx(colEnd.start)) : 0;
    const colEndXs = new Float64Array(colEndCount);
    for (let i = 0; i < colEndCount; i++) {
      colEndXs[i] = colPinnedEndX + Number(cols.getOffsetPx(colEnd.start + i)) - colEndBase;
    }

    // ---------------------------
    // Header rows (sticky) — Y not affected by scrollTop
    // ---------------------------
    iter(headerRows, (ri) => {
      const rowOffset = Number(rows.getOffsetPx(ri));
      const y = rowHeaderY + rowOffset;

      iter(colStart, (ci) => {
        pushCell(ri, ci, "cornerStart", colStartXs[ci - colStart.start], y);
      });
      iter(colMain, (ci) => {
        pushCell(ri, ci, "header", colMainXs[ci - colMain.start], y);
      });
      iter(colEnd, (ci) => {
        pushCell(ri, ci, "cornerEnd", colEndXs[ci - colEnd.start], y);
      });
    });

    // ---------------------------
    // Body rows — Y: rowOffset - scrollTop
    // ---------------------------
    iter(bodyRows, (ri) => {
      const rowOffset = Number(rows.getOffsetPx(ri));
      const y = rowOffset - scrollTop;

      iter(colStart, (ci) => {
        pushCell(ri, ci, "pinnedStart", colStartXs[ci - colStart.start], y);
      });
      iter(colMain, (ci) => {
        pushCell(ri, ci, "body", colMainXs[ci - colMain.start], y);
      });
      iter(colEnd, (ci) => {
        pushCell(ri, ci, "pinnedEnd", colEndXs[ci - colEnd.start], y);
      });
    });

    const stats = {
      bodyCellCount,
      headerCellCount,
      pinnedStartCellCount,
      pinnedEndCellCount,
    };

    return { cells, stats };
  };

  return { build };
};
