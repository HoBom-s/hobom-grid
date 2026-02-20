import type { ModifierKeys } from "@hobom-grid/core";

export const getModifierKeys = (e: MouseEvent | KeyboardEvent | PointerEvent): ModifierKeys => ({
  shift: e.shiftKey,
  alt: e.altKey,
  ctrl: e.ctrlKey,
  meta: e.metaKey,
});
