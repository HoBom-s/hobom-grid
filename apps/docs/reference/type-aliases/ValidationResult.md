[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / ValidationResult

# Type Alias: ValidationResult

> **ValidationResult** = `Readonly`\<\{ `valid`: `true`; \}\> \| `Readonly`\<\{ `message`: `string`; `valid`: `false`; \}\>

Defined in: [editing/editing-state.ts:16](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/editing/editing-state.ts#L16)

Sync or async validator return type.
valid:true  → no error
valid:false → `message` is shown to the user
