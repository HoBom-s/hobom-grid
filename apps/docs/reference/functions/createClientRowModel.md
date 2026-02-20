[**@hobom-grid/core**](../README.md)

---

[@hobom-grid/core](../README.md) / createClientRowModel

# Function: createClientRowModel()

> **createClientRowModel**\<`TRow`\>(`spec`): [`RowModel`](../type-aliases/RowModel.md)\<`TRow`\>

Defined in: [row-model/client-row-model.ts:45](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/row-model/client-row-model.ts#L45)

Build a client-side RowModel from an in-memory array.

Processing order: filter → sort → index mapping

## Type Parameters

### TRow

`TRow`

## Parameters

### spec

`ClientRowModelSpec`\<`TRow`\>

## Returns

[`RowModel`](../type-aliases/RowModel.md)\<`TRow`\>

## Example

```ts
const model = createClientRowModel({
  rows: data,
  getId: (row) => row.id,
  filter: (row) => row.active,
  sort: [{ key: "name", direction: "asc" }],
});

model.rowCount; // filtered + sorted count
model.getRow(0); // first visible row
model.getRowId(0); // stable ID of first visible row
```
