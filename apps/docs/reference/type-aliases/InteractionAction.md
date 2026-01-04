[**@hobom-grid/core**](../README.md)

***

[@hobom-grid/core](../README.md) / InteractionAction

# Type Alias: InteractionAction

> **InteractionAction** = \{ `hit`: [`HitTarget`](HitTarget.md); `mods`: `ModifierKeys`; `point`: `GridPoint`; `type`: `"PointerMoved"`; \} \| \{ `button`: `PointerButton`; `hit`: [`HitTarget`](HitTarget.md); `mods`: `ModifierKeys`; `point`: `GridPoint`; `type`: `"PointerDown"`; \} \| \{ `button`: `PointerButton`; `hit`: [`HitTarget`](HitTarget.md); `mods`: `ModifierKeys`; `point`: `GridPoint`; `type`: `"PointerUp"`; \} \| \{ `type`: `"PointerLeave"`; \} \| \{ `key`: `NavKey`; `mods`: `ModifierKeys`; `type`: `"KeyDown"`; \} \| \{ `type`: `"FocusGained"`; \} \| \{ `type`: `"FocusLost"`; \} \| \{ `cell`: [`GridCellRef`](GridCellRef.md) \| `null`; `type`: `"SetActiveCell"`; \} \| \{ `type`: `"ClearSelection"`; \}

Defined in: contracts/interaction-action.ts:26
