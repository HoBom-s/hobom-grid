[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / AxisRange

# Type Alias: AxisRange

> **AxisRange** = `Readonly`\<\{ `end`: `number`; `start`: `number`; \}\>

Defined in: contracts/contracts-model.ts:25

Inclusive index range [start..end].
- If end < start, the range is considered empty.
- IMPORTANT: inclusive end is a frequent source of off-by-one bugs. Keep it consistent.
