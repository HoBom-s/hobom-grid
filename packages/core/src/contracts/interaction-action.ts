import type { GridCellRef, GridPoint, HitTarget } from "./hit-test-model";

export type PointerButton = 0 | 1 | 2;

export type ModifierKeys = Readonly<{
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}>;

export type NavKey =
  | "ArrowUp"
  | "ArrowDown"
  | "ArrowLeft"
  | "ArrowRight"
  | "Home"
  | "End"
  | "PageUp"
  | "PageDown"
  | "Enter"
  | "Escape"
  | "Tab"
  | "a"; // for Ctrl/Cmd+A selection all (core uses it symbolically)

export type InteractionAction =
  | {
      type: "PointerMoved";
      point: GridPoint;
      hit: HitTarget;
      mods: ModifierKeys;
    }
  | {
      type: "PointerDown";
      point: GridPoint;
      button: PointerButton;
      hit: HitTarget;
      mods: ModifierKeys;
    }
  | {
      type: "PointerUp";
      point: GridPoint;
      button: PointerButton;
      hit: HitTarget;
      mods: ModifierKeys;
    }
  | {
      type: "PointerLeave";
    }
  | {
      type: "KeyDown";
      key: NavKey;
      mods: ModifierKeys;
    }
  | {
      type: "FocusGained";
    }
  | {
      type: "FocusLost";
    }
  | {
      type: "SetActiveCell";
      cell: GridCellRef | null;
    }
  | {
      type: "ClearSelection";
    };
