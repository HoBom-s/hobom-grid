import { useCallback, useRef } from "react";
import type { InteractionKernelState } from "@hobom-grid/core";

export type UseClipboardOpts<TValue = unknown> = Readonly<{
  /** Return the committed value for a cell (used during copy). */
  getValue: (row: number, col: number) => TValue;

  /** Serialise a cell value to a string for TSV export. Default: String(value ?? ""). */
  formatValue?: (value: TValue, row: number, col: number) => string;

  /**
   * Called after a successful paste.
   * `changes` contains one entry per pasted cell; the caller applies them to its data model.
   */
  onPaste?: (changes: ReadonlyArray<Readonly<{ row: number; col: number; value: string }>>) => void;
}>;

export type UseClipboardResult = Readonly<{
  /** Copy the current selection to the system clipboard as TSV. */
  copy: () => void;
  /** Paste TSV from the system clipboard starting at the focused cell. */
  paste: () => Promise<void>;
  /**
   * Keyboard handler — wire to `keyboardExtension` on `<Grid>` (or merge with the editing handler).
   *
   *   Ctrl/⌘ + C → copy
   *   Ctrl/⌘ + V → paste
   */
  onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
}>;

export const useClipboard = <TValue = unknown>(
  opts: UseClipboardOpts<TValue>,
  interactionState: InteractionKernelState,
): UseClipboardResult => {
  const optsRef = useRef(opts);
  // eslint-disable-next-line react-hooks/refs
  optsRef.current = opts;

  const interactionRef = useRef(interactionState);
  // eslint-disable-next-line react-hooks/refs
  interactionRef.current = interactionState;

  // ── copy ──────────────────────────────────────────────────────────────────

  const copy = useCallback(() => {
    const { selection } = interactionRef.current;
    if (selection.ranges.length === 0) return;

    const range = selection.ranges[0]!;
    const { getValue, formatValue } = optsRef.current;

    const lines: string[] = [];
    for (let r = range.start.row; r <= range.end.row; r++) {
      const cells: string[] = [];
      for (let c = range.start.col; c <= range.end.col; c++) {
        const value = getValue(r, c);
        cells.push(formatValue ? formatValue(value, r, c) : String(value ?? ""));
      }
      lines.push(cells.join("\t"));
    }

    void navigator.clipboard.writeText(lines.join("\n"));
  }, []);

  // ── paste ─────────────────────────────────────────────────────────────────

  const paste = useCallback(async () => {
    const { onPaste } = optsRef.current;
    if (!onPaste) return;

    const { focusCell } = interactionRef.current;
    if (!focusCell) return;

    let text: string;
    try {
      text = await navigator.clipboard.readText();
    } catch {
      return; // Clipboard access denied
    }

    const rows = text.split("\n").map((row) => row.split("\t"));
    const changes: Array<{ row: number; col: number; value: string }> = [];

    rows.forEach((rowValues, ri) => {
      rowValues.forEach((value, ci) => {
        changes.push({ row: focusCell.row + ri, col: focusCell.col + ci, value });
      });
    });

    onPaste(changes);
  }, []);

  // ── keyboard shortcut handler ─────────────────────────────────────────────

  const pasteRef = useRef(paste);
  // eslint-disable-next-line react-hooks/refs
  pasteRef.current = paste;

  const onKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      if (e.key === "c" || e.key === "C") {
        copy();
        e.preventDefault();
      } else if (e.key === "v" || e.key === "V") {
        void pasteRef.current();
        e.preventDefault();
      }
    },
    [copy],
  );

  return { copy, paste, onKeyDown };
};
