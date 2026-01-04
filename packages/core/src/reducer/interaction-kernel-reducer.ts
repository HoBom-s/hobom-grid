import {
  createInitialInteractionKernelState,
  isCellEqual,
  normalizeRange,
  type CellRange,
  type InteractionKernelState,
} from "../state/interaction-kernel-state";
import type { InteractionAction } from "../contracts/interaction-action";
import type { GridCellRef, HitTarget } from "../contracts/hit-test-model";

type InteractionKernelReducer = (
  state: InteractionKernelState,
  action: InteractionAction,
) => InteractionKernelState;

const toCellFromHit = (hit: HitTarget): GridCellRef | null => {
  if (hit.region === "cell" && hit.cell) return hit.cell;
  // Treat header click as focusing first cell in that row/col? Phase2 minimal: ignore.
  return null;
};

const setSingleSelection = (
  state: InteractionKernelState,
  cell: GridCellRef,
): InteractionKernelState => {
  const range: CellRange = normalizeRange({ start: cell, end: cell });
  return {
    ...state,
    focusCell: cell,
    selection: {
      active: cell,
      anchor: cell,
      ranges: [range],
    },
  };
};

const setRangeSelectionFromAnchor = (
  state: InteractionKernelState,
  cell: GridCellRef,
): InteractionKernelState => {
  const anchor = state.selection.anchor ?? state.selection.active ?? cell;
  const range: CellRange = normalizeRange({ start: anchor, end: cell });
  return {
    ...state,
    focusCell: cell,
    selection: {
      active: cell,
      anchor,
      ranges: [range],
    },
  };
};

const toggleCellSelection = (
  state: InteractionKernelState,
  cell: GridCellRef,
): InteractionKernelState => {
  // Phase2 minimal: toggle single-cell ranges list (no merge). Big-tech style later can normalize/merge.
  const key = `${cell.row}:${cell.col}`;
  const existingIdx = state.selection.ranges.findIndex((r) => {
    const nr = normalizeRange(r);
    return (
      nr.start.row === nr.end.row &&
      nr.start.col === nr.end.col &&
      `${nr.start.row}:${nr.start.col}` === key
    );
  });

  const nextRanges =
    existingIdx >= 0
      ? state.selection.ranges.filter((_, i) => i !== existingIdx)
      : [...state.selection.ranges, normalizeRange({ start: cell, end: cell })];

  return {
    ...state,
    focusCell: cell,
    selection: {
      active: cell,
      anchor: cell,
      ranges: nextRanges,
    },
  };
};

const moveCell = (
  cell: GridCellRef,
  dir: "up" | "down" | "left" | "right",
  bounds: { rowCount: number; colCount: number },
): GridCellRef => {
  const r = cell.row;
  const c = cell.col;
  const next =
    dir === "up"
      ? { row: r - 1, col: c }
      : dir === "down"
        ? { row: r + 1, col: c }
        : dir === "left"
          ? { row: r, col: c - 1 }
          : { row: r, col: c + 1 };

  return {
    row: Math.max(0, Math.min(bounds.rowCount - 1, next.row)),
    col: Math.max(0, Math.min(bounds.colCount - 1, next.col)),
  };
};

type InteractionKernelConfig = Readonly<{
  rowCount: number;
  colCount: number;
  /** If true, Ctrl/Cmd+A selects all */
  enableSelectAll: boolean;
}>;

export const createInteractionKernelReducer = (
  config: InteractionKernelConfig,
): InteractionKernelReducer => {
  return (state, action) => {
    switch (action.type) {
      case "PointerMoved": {
        if (state.hover === action.hit) return state; // referential, fast-path
        return { ...state, hover: action.hit };
      }

      case "PointerLeave": {
        if (state.hover == null) return state;
        return { ...state, hover: null };
      }

      case "PointerDown": {
        if (action.button !== 0) return state; // left only for now
        const cell = toCellFromHit(action.hit);
        if (!cell) return state;

        // When pointer down, grid is effectively focused (UI layer may also dispatch FocusGained)
        const base: InteractionKernelState = state.isFocused
          ? state
          : { ...state, isFocused: true };

        if (action.mods.shift) return setRangeSelectionFromAnchor(base, cell);

        // Ctrl/Cmd for multi-select toggle
        if (action.mods.ctrl || action.mods.meta) return toggleCellSelection(base, cell);

        return setSingleSelection(base, cell);
      }

      case "PointerUp": {
        return state;
      }

      case "KeyDown": {
        const active = state.selection.active ?? state.focusCell;
        if (!active) return state;

        const isSelectAll =
          config.enableSelectAll && action.key === "a" && (action.mods.ctrl || action.mods.meta);
        if (isSelectAll) {
          const range: CellRange = normalizeRange({
            start: { row: 0, col: 0 },
            end: { row: config.rowCount - 1, col: config.colCount - 1 },
          });
          return {
            ...state,
            selection: {
              active,
              anchor: { row: 0, col: 0 },
              ranges: [range],
            },
          };
        }

        const nav =
          action.key === "ArrowUp"
            ? "up"
            : action.key === "ArrowDown"
              ? "down"
              : action.key === "ArrowLeft"
                ? "left"
                : action.key === "ArrowRight"
                  ? "right"
                  : null;

        if (!nav) {
          if (action.key === "Escape") {
            return {
              ...state,
              selection: {
                active: state.selection.active,
                anchor: state.selection.anchor,
                ranges: [],
              },
            };
          }
          return state;
        }

        const next = moveCell(active, nav, {
          rowCount: config.rowCount,
          colCount: config.colCount,
        });

        // shift => range expand
        if (action.mods.shift) return setRangeSelectionFromAnchor(state, next);

        // plain nav => move active single selection
        return setSingleSelection(state, next);
      }

      case "FocusGained": {
        if (state.isFocused) return state;
        return { ...state, isFocused: true };
      }

      case "FocusLost": {
        if (!state.isFocused) return state;
        return { ...state, isFocused: false, hover: null };
      }

      case "SetActiveCell": {
        if (action.cell == null) {
          if (state.selection.active == null && state.focusCell == null) return state;
          return {
            ...state,
            focusCell: null,
            selection: { ...state.selection, active: null, anchor: null },
          };
        }
        if (
          isCellEqual(state.selection.active, action.cell) &&
          isCellEqual(state.focusCell, action.cell)
        ) {
          return state;
        }
        return setSingleSelection(state, action.cell);
      }

      case "ClearSelection": {
        if (state.selection.ranges.length === 0) return state;
        return { ...state, selection: { ...state.selection, ranges: [] } };
      }

      default: {
        return state;
      }
    }
  };
};

export const InteractionKernel = {
  createInitialState: createInitialInteractionKernelState,
};
