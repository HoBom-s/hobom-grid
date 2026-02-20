import { useCallback, useEffect, useState } from "react";

// ---------------------------------------------------------------------------
// Item types
// ---------------------------------------------------------------------------

export type ContextMenuSeparator = { readonly kind: "separator" };

export type ContextMenuLabel = {
  readonly kind: "label";
  readonly text: string;
};

export type ContextMenuAction = {
  readonly kind: "action";
  readonly label: string;
  /** Optional short description shown on the right side (e.g. "Ctrl+C"). */
  readonly shortcut?: string;
  /** Optional emoji or single-character icon. */
  readonly icon?: string;
  readonly disabled?: boolean;
  readonly onSelect: () => void;
};

export type ContextMenuItem = ContextMenuSeparator | ContextMenuLabel | ContextMenuAction;

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export type ContextMenuState = Readonly<{
  /** Absolute x position in client coordinates. */
  x: number;
  /** Absolute y position in client coordinates. */
  y: number;
  items: ReadonlyArray<ContextMenuItem>;
}> | null;

// ---------------------------------------------------------------------------
// Hook result
// ---------------------------------------------------------------------------

export type UseContextMenuResult = Readonly<{
  menuState: ContextMenuState;
  /**
   * Open the context menu at the given client coordinates with the given items.
   * Typically called from an `onContextMenu` event handler:
   * ```tsx
   * onContextMenu={(e) => {
   *   e.preventDefault();
   *   contextMenu.openMenu(e.clientX, e.clientY, [ ... ]);
   * }}
   * ```
   */
  openMenu: (x: number, y: number, items: ReadonlyArray<ContextMenuItem>) => void;
  closeMenu: () => void;
}>;

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Manages context menu open/close state.
 *
 * Pair with the `<ContextMenu>` component to render the actual menu UI.
 * The hook auto-closes the menu on Escape or a click outside the menu element.
 */
export const useContextMenu = (): UseContextMenuResult => {
  const [menuState, setMenuState] = useState<ContextMenuState>(null);

  const openMenu = useCallback((x: number, y: number, items: ReadonlyArray<ContextMenuItem>) => {
    setMenuState({ x, y, items });
  }, []);

  const closeMenu = useCallback(() => setMenuState(null), []);

  // Auto-close on Escape or click outside the menu.
  useEffect(() => {
    if (!menuState) return;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuState(null);
    };

    const onPointerDown = (e: PointerEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target?.closest("[data-hobom-context-menu]")) {
        setMenuState(null);
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("pointerdown", onPointerDown);
    };
  }, [menuState]);

  return { menuState, openMenu, closeMenu };
};
