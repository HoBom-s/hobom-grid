import { useCallback, useMemo, useReducer, useRef } from "react";
import {
  editingReducer,
  EditingKernel,
  type CellChange,
  type EditingState,
  type ValidationResult,
} from "@hobom-grid/core";
import type { InteractionKernelState } from "@hobom-grid/core";

export type UseEditingOpts<TValue = unknown> = Readonly<{
  /** Return the current (committed) value for a cell. Used to seed the editor. */
  getValue: (row: number, col: number) => TValue;

  /**
   * Called after a successful commit when the value actually changed.
   * May be async — the editing session stays closed regardless of the promise result
   * (optimistic update pattern).
   */
  onCommit?: (change: CellChange<TValue>) => void | Promise<void>;

  /**
   * Sync or async validator.
   * Return `{ valid: false, message }` to block commit.
   */
  validate?: (
    value: TValue,
    coord: Readonly<{ row: number; col: number }>,
  ) => ValidationResult | Promise<ValidationResult>;

  /** Return false to prevent a cell from entering edit mode. */
  isEditable?: (row: number, col: number) => boolean;
}>;

export type UseEditingResult<TValue = unknown> = Readonly<{
  editingState: EditingState;
  /** Current editor value (undefined when not editing). */
  editValue: TValue | undefined;
  startEdit: (row: number, col: number) => void;
  setEditValue: (value: TValue) => void;
  commit: () => Promise<void>;
  cancel: () => void;
  isEditing: (row: number, col: number) => boolean;
  /**
   * Spread onto `<Grid>` to wire up double-click and keyboard shortcuts.
   *
   * Keyboard behaviour while editing:
   *   Enter  → commit + keep position
   *   Escape → cancel
   *   Tab    → commit (then browser moves focus naturally)
   *   Arrows → suppressed at Grid level (handled by the editor input natively)
   *
   * While not editing:
   *   F2 → start edit on the currently focused cell
   */
  gridExtension: Readonly<{
    onCellDoubleClick: (row: number, col: number) => void;
    keyboardExtension: Readonly<{
      onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
    }>;
  }>;
}>;

const GRID_NAV_KEYS = new Set([
  "ArrowUp",
  "ArrowDown",
  "ArrowLeft",
  "ArrowRight",
  "Home",
  "End",
  "PageUp",
  "PageDown",
]);

export const useEditing = <TValue = unknown>(
  opts: UseEditingOpts<TValue>,
  interactionState: InteractionKernelState,
): UseEditingResult<TValue> => {
  const [state, dispatch] = useReducer(editingReducer, undefined, EditingKernel.createInitialState);

  // Stable refs so callbacks don't recreate on every render.
  const stateRef = useRef(state);
  // eslint-disable-next-line react-hooks/refs
  stateRef.current = state;

  const interactionRef = useRef(interactionState);
  // eslint-disable-next-line react-hooks/refs
  interactionRef.current = interactionState;

  const optsRef = useRef(opts);
  // eslint-disable-next-line react-hooks/refs
  optsRef.current = opts;

  // ── startEdit ─────────────────────────────────────────────────────────────

  const startEdit = useCallback((row: number, col: number) => {
    const { isEditable, getValue } = optsRef.current;
    if (isEditable && !isEditable(row, col)) return;
    const initialValue = getValue(row, col);
    dispatch({ type: "StartEdit", row, col, initialValue });
  }, []);

  // ── setEditValue ──────────────────────────────────────────────────────────

  const setEditValue = useCallback((value: TValue) => {
    dispatch({ type: "UpdateEditValue", value });
  }, []);

  // ── commit ────────────────────────────────────────────────────────────────
  // Stable — uses refs for current state/opts.

  const commit = useCallback(async () => {
    const edit = stateRef.current.activeEdit;
    if (!edit) return;

    const { row, col, initialValue, currentValue } = edit;
    const { validate, onCommit } = optsRef.current;

    if (validate) {
      dispatch({ type: "SetValidating", row, col });
      const result = await validate(currentValue as TValue, { row, col });
      dispatch({
        type: "SetValidationResult",
        row,
        col,
        valid: result.valid,
        message: result.valid ? undefined : result.message,
      });
      if (!result.valid) return;
    }

    dispatch({ type: "CommitEdit" });

    if (currentValue !== initialValue && onCommit) {
      // Fire-and-forget: optimistic — editor is already closed.
      void onCommit({
        row,
        col,
        previousValue: initialValue as TValue,
        newValue: currentValue as TValue,
      });
    }
  }, []); // stable — no deps, uses refs

  // ── cancel ────────────────────────────────────────────────────────────────

  const cancel = useCallback(() => {
    dispatch({ type: "CancelEdit" });
  }, []);

  // ── isEditing ─────────────────────────────────────────────────────────────

  const isEditing = useCallback(
    (row: number, col: number) => {
      const e = state.activeEdit;
      return e !== null && e.row === row && e.col === col;
    },
    [state.activeEdit],
  );

  // ── keyboard extension ────────────────────────────────────────────────────
  // Stable ref to commit so the handler never goes stale.
  const commitRef = useRef(commit);
  // eslint-disable-next-line react-hooks/refs
  commitRef.current = commit;

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const currentState = stateRef.current;
    const isInputFocused =
      e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement;

    if (currentState.activeEdit && isInputFocused) {
      // Inside an editor input — handle commit/cancel, suppress grid navigation.
      if (e.key === "Escape") {
        cancel();
        e.preventDefault();
        return;
      }
      if (e.key === "Enter") {
        void commitRef.current();
        e.preventDefault();
        return;
      }
      if (e.key === "Tab") {
        // Commit; let default tab focus movement happen.
        void commitRef.current();
        return;
      }
      if (GRID_NAV_KEYS.has(e.key)) {
        // Block grid navigation — editor's own cursor movement is fine.
        e.preventDefault();
      }
      return;
    }

    // Not in an editor — F2 opens edit on the focused cell.
    if (e.key === "F2" && !currentState.activeEdit) {
      const focusCell = interactionRef.current.focusCell;
      if (focusCell) {
        startEdit(focusCell.row, focusCell.col);
        e.preventDefault();
      }
    }
  }, []); // stable — uses refs only

  // ── gridExtension ─────────────────────────────────────────────────────────
  // Memoised so Grid doesn't re-render when unrelated state changes.
  const gridExtension = useMemo(
    () => ({
      onCellDoubleClick: startEdit,
      keyboardExtension: { onKeyDown },
    }),
    [startEdit, onKeyDown],
  );

  return {
    editingState: state,
    editValue: state.activeEdit?.currentValue as TValue | undefined,
    startEdit,
    setEditValue,
    commit,
    cancel,
    isEditing,
    gridExtension,
  };
};
