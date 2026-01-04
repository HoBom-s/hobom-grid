[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / AxisRange

# Type Alias: AxisRange

> **AxisRange** = `Readonly`\<\{ `end`: `number`; `start`: `number`; \}\>

Defined in: [contracts/contracts-model.ts:25](https://github.com/HoBom-s/hobom-grid/blob/53c72674a9d36d64339f8bb1ffa7235127726f1f/packages/core/src/contracts/contracts-model.ts#L25)

Inclusive index range [start..end].
- If end < start, the range is considered empty.
- IMPORTANT: inclusive end is a frequent source of off-by-one bugs. Keep it consistent.
