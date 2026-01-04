[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / CellVM

# Type Alias: CellVM

> **CellVM** = `Readonly`\<\{ `colIndex`: `number`; `height`: [`Px`](Px.md); `kind`: [`CellKind`](CellKind.md); `rowIndex`: `number`; `width`: [`Px`](Px.md); `x`: [`Px`](Px.md); `y`: [`Px`](Px.md); \}\>

Defined in: [viewmodel/view-model.ts:7](https://github.com/HoBom-s/hobom-grid/blob/3a81d4b967ca72af9ed09e7c634c357f2d0b00fa/packages/core/src/viewmodel/view-model.ts#L7)

Flat render instruction for a single cell-like rectangle.
UI adapters should treat this as “draw this box”.
