import { useLayoutEffect, useRef } from "react";
import ReactDOM from "react-dom";
import type { ContextMenuItem, ContextMenuState } from "../hooks/use-context-menu";

export type ContextMenuProps = {
  state: ContextMenuState;
  onClose: () => void;
};

/**
 * Portal-based context menu renderer.
 *
 * Renders into `document.body` via a portal so it's never clipped by
 * `overflow: hidden` containers. Place it once near the root of your app:
 *
 * ```tsx
 * const ctx = useContextMenu();
 * // ...
 * return (
 *   <>
 *     <App />
 *     <ContextMenu state={ctx.menuState} onClose={ctx.closeMenu} />
 *   </>
 * );
 * ```
 */
export const ContextMenu = ({ state, onClose }: ContextMenuProps) => {
  if (!state) return null;
  return ReactDOM.createPortal(<ContextMenuPanel state={state} onClose={onClose} />, document.body);
};

// ---------------------------------------------------------------------------
// Internal panel
// ---------------------------------------------------------------------------

type PanelProps = {
  state: NonNullable<ContextMenuState>;
  onClose: () => void;
};

const ContextMenuPanel = ({ state, onClose }: PanelProps) => {
  const menuRef = useRef<HTMLDivElement>(null);
  const activeIndexRef = useRef(-1);

  // Adjust position so the menu never overflows the viewport.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;
    const { width, height } = menu.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = state;
    if (x + width > vw - 8) x = Math.max(8, vw - width - 8);
    if (y + height > vh - 8) y = Math.max(8, vh - height - 8);
    menu.style.left = `${x}px`;
    menu.style.top = `${y}px`;
  }, [state]);

  // Keyboard navigation within the menu.
  useLayoutEffect(() => {
    const menu = menuRef.current;
    if (!menu) return;

    const actions = Array.from(menu.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    activeIndexRef.current = -1;

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        activeIndexRef.current = Math.min(activeIndexRef.current + 1, actions.length - 1);
        actions[activeIndexRef.current]?.focus();
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        activeIndexRef.current = Math.max(activeIndexRef.current - 1, 0);
        actions[activeIndexRef.current]?.focus();
      } else if (e.key === "Enter" || e.key === " ") {
        actions[activeIndexRef.current]?.click();
      }
    };

    menu.addEventListener("keydown", onKeyDown);
    return () => menu.removeEventListener("keydown", onKeyDown);
  }, [state]);

  return (
    <div
      data-hobom-context-menu="true"
      ref={menuRef}
      role="menu"
      style={{
        position: "fixed",
        left: state.x,
        top: state.y,
        background: "#fff",
        border: "1px solid #e5e7eb",
        borderRadius: 8,
        padding: "4px 0",
        minWidth: 188,
        boxShadow: "0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)",
        zIndex: 9999,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        outline: "none",
      }}
      tabIndex={-1}
    >
      {state.items.map((item, i) => (
        <ContextMenuItemView key={i} item={item} onClose={onClose} />
      ))}
    </div>
  );
};

// ---------------------------------------------------------------------------
// Individual item renderer
// ---------------------------------------------------------------------------

const ContextMenuItemView = ({ item, onClose }: { item: ContextMenuItem; onClose: () => void }) => {
  if (item.kind === "separator") {
    return <div role="separator" style={{ height: 1, background: "#f3f4f6", margin: "4px 0" }} />;
  }

  if (item.kind === "label") {
    return (
      <div
        style={{
          padding: "3px 14px",
          fontSize: 11,
          color: "#9ca3af",
          fontWeight: 600,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          userSelect: "none",
        }}
      >
        {item.text}
      </div>
    );
  }

  // action
  return (
    <button
      role="menuitem"
      disabled={item.disabled}
      onClick={() => {
        if (!item.disabled) {
          item.onSelect();
          onClose();
        }
      }}
      style={{
        display: "flex",
        width: "100%",
        alignItems: "center",
        padding: "6px 14px",
        background: "transparent",
        border: "none",
        cursor: item.disabled ? "not-allowed" : "pointer",
        textAlign: "left",
        color: item.disabled ? "#d1d5db" : "#111827",
        gap: 8,
        outline: "none",
        boxSizing: "border-box",
      }}
      onMouseEnter={(e) => {
        if (!item.disabled) {
          (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
        }
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
      onFocus={(e) => {
        (e.currentTarget as HTMLElement).style.background = "#f5f5f5";
      }}
      onBlur={(e) => {
        (e.currentTarget as HTMLElement).style.background = "transparent";
      }}
    >
      {item.icon != null && (
        <span
          style={{ width: 18, textAlign: "center", fontSize: 14, flexShrink: 0 }}
          aria-hidden="true"
        >
          {item.icon}
        </span>
      )}
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.shortcut != null && (
        <span style={{ fontSize: 11, color: "#9ca3af", flexShrink: 0, marginLeft: 12 }}>
          {item.shortcut}
        </span>
      )}
    </button>
  );
};
