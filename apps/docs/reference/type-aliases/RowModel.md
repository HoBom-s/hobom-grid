[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / RowModel

# Type Alias: RowModel\<TRow\>

> **RowModel**\<`TRow`\> = `Readonly`\<\{ `rowCount`: `number`; `findVirtualIndex`: `number` \| `null`; `getRow`: `TRow`; `getRowId`: [`RowId`](RowId.md); \}\>

Defined in: [row-model/row-model.ts:16](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/row-model/row-model.ts#L16)

The central abstraction of the data pipeline.

A RowModel maps "virtual row indices" (0-based, contiguous, what the
grid kernel sees) to the underlying data items.

Pipeline stages (RawRows → Sorted → Filtered → ...) each produce a new
RowModel with a potentially different `rowCount` and mapping.

## Type Parameters

### TRow

`TRow` = `unknown`
