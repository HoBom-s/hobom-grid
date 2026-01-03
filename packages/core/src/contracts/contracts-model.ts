/**
 * Nominal typing helper.
 * Prevents accidentally mixing semantically different primitives (e.g., Px vs RowIndex).
 */
type Brand<K, T extends string> = K & { readonly __brand: T };

/**
 * Pixel unit in grid kernel coordinate space.
 * - Always interpreted as CSS pixels at the adapter layer, but the kernel is DOM-agnostic.
 */
export type Px = Brand<number, "Px">;

/**
 * Axis identifier for 2D virtualization.
 * - "row" => vertical axis (Y)
 * - "col" => horizontal axis (X)
 */
export type AxisKind = "row" | "col";

/**
 * Inclusive index range [start..end].
 * - If end < start, the range is considered empty.
 * - IMPORTANT: inclusive end is a frequent source of off-by-one bugs. Keep it consistent.
 */
export type AxisRange = Readonly<{ start: number; end: number }>;

/**
 * Renderable cell “layer” classification.
 * - body: scrollable content
 * - header: sticky top rows (computed only; DOM stickiness is adapter responsibility)
 * - pinnedStart/end: left/right pinned columns
 * - cornerStart/end: intersections of header rows and pinned columns
 */
export type CellKind =
  | "body"
  | "header"
  | "pinnedStart"
  | "pinnedEnd"
  | "cornerStart"
  | "cornerEnd";

/**
 * Viewport anchor.
 * Used to stabilize scroll when measurements update (prevent scroll jump).
 * - rowIndex/colIndex: the anchor cell identity
 * - viewportX/viewportY: anchor position within viewport space (not content space)
 */
interface ViewportAnchor {
  rowIndex: number;
  colIndex: number;
  viewportX: Px;
  viewportY: Px;
}

/**
 * Alias for external API readability.
 * Keep as an alias so we can swap representation later without rewriting call sites.
 */
export type Anchor = Readonly<ViewportAnchor>;

/**
 * Overscan policy.
 * - px: overscan by pixels
 * - count: overscan by item count (converted internally using estimate/sample)
 */
type Overscan = Readonly<{ type: "px"; value: Px }> | Readonly<{ type: "count"; value: number }>;

/**
 * Viewport query input (single source of truth for virtualization).
 * - scrollLeft/Top: content scroll offsets
 * - viewportWidth/Height: viewport size
 * - overscan: buffer strategy
 */
interface ViewportQueryInput {
  scrollLeftPx: Px;
  scrollTopPx: Px;
  viewportWidthPx: Px;
  viewportHeightPx: Px;
  overscan: Overscan;
}

/**
 * Alias: public API expects `ViewportQuery` rather than generic `Query`.
 */
export type ViewportQuery = Readonly<ViewportQueryInput>;

/**
 * Brand constructor for pixels.
 * NOTE: This is intentionally a simple cast; validation happens at boundaries.
 */
export const px = (n: number): Px => n as Px;
