[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / SortSpec

# Type Alias: SortSpec\<TRow\>

> **SortSpec**\<`TRow`\> = `Readonly`\<\{ `compare?`: (`a`, `b`) => `number`; `direction`: [`SortDirection`](SortDirection.md); `key`: keyof `TRow`; \}\>

Defined in: [row-model/row-model.ts:43](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/row-model/row-model.ts#L43)

Sort specification for a single column.
Multiple specs form a multi-column sort (first spec wins, tie-break by next).

## Type Parameters

### TRow

`TRow`
