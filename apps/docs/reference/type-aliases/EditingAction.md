[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / EditingAction

# Type Alias: EditingAction

> **EditingAction** = `Readonly`\<\{ `col`: `number`; `initialValue`: `unknown`; `row`: `number`; `type`: `"StartEdit"`; \}\> \| `Readonly`\<\{ `type`: `"UpdateEditValue"`; `value`: `unknown`; \}\> \| `Readonly`\<\{ `col`: `number`; `row`: `number`; `type`: `"SetValidating"`; \}\> \| `Readonly`\<\{ `col`: `number`; `message`: `string` \| `undefined`; `row`: `number`; `type`: `"SetValidationResult"`; `valid`: `boolean`; \}\> \| `Readonly`\<\{ `type`: `"CommitEdit"`; \}\> \| `Readonly`\<\{ `type`: `"CancelEdit"`; \}\>

Defined in: [editing/editing-action.ts:1](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/editing/editing-action.ts#L1)
