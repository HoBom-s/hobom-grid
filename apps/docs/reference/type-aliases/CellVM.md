[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / CellVM

# Type Alias: CellVM

> **CellVM** = `Readonly`\<\{ `colIndex`: `number`; `height`: [`Px`](Px.md); `kind`: [`CellKind`](CellKind.md); `rowIndex`: `number`; `width`: [`Px`](Px.md); `x`: [`Px`](Px.md); `y`: [`Px`](Px.md); \}\>

Defined in: [viewmodel/view-model.ts:7](https://github.com/HoBom-s/hobom-grid/blob/53c72674a9d36d64339f8bb1ffa7235127726f1f/packages/core/src/viewmodel/view-model.ts#L7)

Flat render instruction for a single cell-like rectangle.
UI adapters should treat this as “draw this box”.
