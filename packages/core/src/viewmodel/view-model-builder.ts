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
    const rowBodyY = Number(vp.transforms.rowBodyY);

    const colPinnedStartX = Number(vp.transforms.colPinnedStartX);
    const colMainX = Number(vp.transforms.colMainX);
    const colPinnedEndX = Number(vp.transforms.colPinnedEndX);

    const scrollLeft = Number(vp.scrollLeftPx);
    const scrollTop = Number(vp.scrollTopPx);

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
    };

    // ---------------------------
    // Header rows (sticky)
    // - Y is not affected by scrollTop
    // - X depends on region:
    //    pinned start: fixed
    //    main: translated by scrollLeft
    //    pinned end: fixed on right
    // ---------------------------
    const iter = (r: { start: number; end: number }, fn: (i: number) => void) => {
      if (r.end < r.start) return;
      for (let i = r.start; i <= r.end; i++) fn(i);
    };

    // header (sticky)
    iter(headerRows, (ri) => {
      const rowOffset = Number(rows.getOffsetPx(ri));
      const y = rowHeaderY + rowOffset;

      iter(colStart, (ci) => {
        const x = colPinnedStartX + Number(cols.getOffsetPx(ci));
        pushCell(ri, ci, "cornerStart", x, y);
      });

      iter(colMain, (ci) => {
        const x = colMainX + (Number(cols.getOffsetPx(ci)) - scrollLeft);
        pushCell(ri, ci, "header", x, y);
      });

      iter(colEnd, (ci) => {
        const x =
          colPinnedEndX + (Number(cols.getOffsetPx(ci)) - Number(cols.getOffsetPx(colEnd.start)));
        pushCell(ri, ci, "cornerEnd", x, y);
      });
    });

    // ---------------------------
    // Body rows
    // - Y is translated by scrollTop and shifted under header
    // - X rules are the same as above
    // ---------------------------
    iter(bodyRows, (ri) => {
      const rowOffset = Number(rows.getOffsetPx(ri));
      const y = rowBodyY + (rowOffset - scrollTop);

      iter(colStart, (ci) => {
        const x = colPinnedStartX + Number(cols.getOffsetPx(ci));
        pushCell(ri, ci, "pinnedStart", x, y);
      });

      iter(colMain, (ci) => {
        const x = colMainX + (Number(cols.getOffsetPx(ci)) - scrollLeft);
        pushCell(ri, ci, "body", x, y);
      });

      iter(colEnd, (ci) => {
        const x =
          colPinnedEndX + (Number(cols.getOffsetPx(ci)) - Number(cols.getOffsetPx(colEnd.start)));
        pushCell(ri, ci, "pinnedEnd", x, y);
      });
    });

    // stats are useful for perf monitoring + testing
    const stats = {
      bodyCellCount: cells.filter((c) => c.kind === "body").length,
      headerCellCount: cells.filter((c) => c.kind === "header").length,
      pinnedStartCellCount: cells.filter(
        (c) => c.kind === "pinnedStart" || c.kind === "cornerStart",
      ).length,
      pinnedEndCellCount: cells.filter((c) => c.kind === "pinnedEnd" || c.kind === "cornerEnd")
        .length,
    };

    return { cells, stats };
  };

  return { build };
};
