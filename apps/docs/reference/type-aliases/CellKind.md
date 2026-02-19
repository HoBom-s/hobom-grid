[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / CellKind

# Type Alias: CellKind

> **CellKind** = `"body"` \| `"header"` \| `"pinnedStart"` \| `"pinnedEnd"` \| `"cornerStart"` \| `"cornerEnd"`

Defined in: [contracts/contracts-model.ts:34](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/contracts/contracts-model.ts#L34)

Renderable cell “layer” classification.
- body: scrollable content
- header: sticky top rows (computed only; DOM stickiness is adapter responsibility)
- pinnedStart/end: left/right pinned columns
- cornerStart/end: intersections of header rows and pinned columns
