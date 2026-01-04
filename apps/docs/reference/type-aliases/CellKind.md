[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / CellKind

# Type Alias: CellKind

> **CellKind** = `"body"` \| `"header"` \| `"pinnedStart"` \| `"pinnedEnd"` \| `"cornerStart"` \| `"cornerEnd"`

Defined in: [contracts/contracts-model.ts:34](https://github.com/HoBom-s/hobom-grid/blob/3a81d4b967ca72af9ed09e7c634c357f2d0b00fa/packages/core/src/contracts/contracts-model.ts#L34)

Renderable cell “layer” classification.
- body: scrollable content
- header: sticky top rows (computed only; DOM stickiness is adapter responsibility)
- pinnedStart/end: left/right pinned columns
- cornerStart/end: intersections of header rows and pinned columns
