import { useEffect, useLayoutEffect, useRef } from "react";
import ReactDOM from "react-dom";
import type { PopoverState } from "../hooks/use-filter-ui";

export type FilterPopoverProps = {
  /** Popover state from useFilterUI. null = not shown. */
  state: PopoverState;
  /** Close the popover. */
  onClose: () => void;
  /** Content to render inside the popover. */
  children: React.ReactNode;
};

/**
 * Portal-based filter popover.
 *
 * Follows the same pattern as ContextMenu — renders into `document.body`
 * via a portal to escape `overflow: hidden` containers.
 *
 * ```tsx
 * <FilterPopover state={filterUI.popover} onClose={filterUI.closePopover}>
 *   <MyFilterContent ... />
 * </FilterPopover>
 * ```
 */
export const FilterPopover = ({ state, onClose, children }: FilterPopoverProps) => {
  if (!state) return null;
  return ReactDOM.createPortal(
    <FilterPopoverPanel state={state} onClose={onClose}>
      {children}
    </FilterPopoverPanel>,
    document.body,
  );
};

// ---------------------------------------------------------------------------
// Internal panel
// ---------------------------------------------------------------------------

type PanelProps = {
  state: NonNullable<PopoverState>;
  onClose: () => void;
  children: React.ReactNode;
};

const FilterPopoverPanel = ({ state, onClose, children }: PanelProps) => {
  const panelRef = useRef<HTMLDivElement>(null);

  // Adjust position so it doesn't overflow the viewport.
  useLayoutEffect(() => {
    const panel = panelRef.current;
    if (!panel) return;
    const { width, height } = panel.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let { x, y } = state;
    if (x + width > vw - 8) x = Math.max(8, vw - width - 8);
    if (y + height > vh - 8) y = Math.max(8, vh - height - 8);
    panel.style.left = `${x}px`;
    panel.style.top = `${y}px`;
  }, [state]);

  // Close on Escape and outside click.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };

    const onClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("mousedown", onClick);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("mousedown", onClick);
    };
  }, [onClose]);

  return (
    <div
      data-hobom-filter-popover="true"
      ref={panelRef}
      role="dialog"
      aria-label="Column filter"
      style={{
        position: "fixed",
        left: state.x,
        top: state.y,
        background: "var(--grid-popover-bg, #fff)",
        border: "1px solid var(--grid-popover-border, #e5e7eb)",
        borderRadius: 8,
        padding: 12,
        minWidth: 220,
        boxShadow:
          "var(--grid-popover-shadow, 0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06))",
        zIndex: 9999,
        fontFamily: "system-ui, sans-serif",
        fontSize: 13,
        color: "var(--grid-popover-text, #111827)",
      }}
    >
      {children}
    </div>
  );
};
