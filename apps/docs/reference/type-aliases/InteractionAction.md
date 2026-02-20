[**@hobom-grid/core**](../README.md)

---

[@hobom-grid/core](../README.md) / InteractionAction

# Type Alias: InteractionAction

> **InteractionAction** = \{ `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerMoved"`; \} \| \{ `button`: `PointerButton`; `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerDown"`; \} \| \{ `button`: `PointerButton`; `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerUp"`; \} \| \{ `type`: `"PointerLeave"`; \} \| \{ `key`: `NavKey`; `mods`: [`ModifierKeys`](ModifierKeys.md); `type`: `"KeyDown"`; \} \| \{ `type`: `"FocusGained"`; \} \| \{ `type`: `"FocusLost"`; \} \| \{ `cell`: [`GridCellRef`](GridCellRef.md) \| `null`; `type`: `"SetActiveCell"`; \} \| \{ `type`: `"ClearSelection"`; \} \| \{ `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerDragStart"`; \} \| \{ `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerDragMove"`; \} \| \{ `hit`: [`HitTarget`](HitTarget.md); `mods`: [`ModifierKeys`](ModifierKeys.md); `point`: `GridPoint`; `type`: `"PointerDragEnd"`; \}

Defined in: [contracts/interaction-action.ts:26](https://github.com/HoBom-s/hobom-grid/blob/main/packages/core/src/contracts/interaction-action.ts#L26)
