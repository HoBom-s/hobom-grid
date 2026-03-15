import { useCallback, useEffect, useMemo, useRef } from "react";
import type { FilterState } from "@hobom-grid/core";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type StorageAdapter = Readonly<{
  save: (key: string, state: PersistedGridState) => void;
  load: (key: string) => PersistedGridState | null;
}>;

export type PersistedGridState = Readonly<{
  colWidths?: Record<number, number>;
  colOrder?: number[];
  hiddenCols?: number[];
  sort?: Array<{ key: string; direction: "asc" | "desc" }>;
  filterState?: FilterState;
  page?: number;
  pageSize?: number;
  scrollLeft?: number;
  scrollTop?: number;
}>;

export type UseGridStatePersistenceOpts = Readonly<{
  /** Storage key — must be unique per grid instance. */
  storageKey: string;
  /** Storage adapter. Defaults to localStorage. */
  adapter?: StorageAdapter;
  /** Debounce interval for autoSave in ms. Default: 500. */
  debounceMs?: number;
}>;

export type UseGridStatePersistenceResult = Readonly<{
  /** Restored state from storage (null if nothing was persisted). */
  restoredState: PersistedGridState | null;
  /** Manually save state. */
  save: (state: PersistedGridState) => void;
  /** Auto-save (debounced). Call on every state change. */
  autoSave: (state: PersistedGridState) => void;
  /** Clear persisted state. */
  clear: () => void;
}>;

// ---------------------------------------------------------------------------
// Built-in localStorage adapter
// ---------------------------------------------------------------------------

export const localStorageAdapter: StorageAdapter = {
  save: (key, state) => {
    try {
      localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // quota exceeded — silently ignore
    }
  },
  load: (key) => {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as PersistedGridState) : null;
    } catch {
      return null;
    }
  },
};

// ---------------------------------------------------------------------------
// Hook
// ---------------------------------------------------------------------------

/**
 * Persist and restore grid state (column widths, sort, filter, page, scroll).
 *
 * ```tsx
 * const persistence = useGridStatePersistence({ storageKey: "my-grid" });
 * // Apply persistence.restoredState to initial hook values on mount
 * // Call persistence.autoSave({ colWidths, sort, ... }) on changes
 * ```
 */
export const useGridStatePersistence = (
  opts: UseGridStatePersistenceOpts,
): UseGridStatePersistenceResult => {
  const { storageKey, debounceMs = 500 } = opts;
  const adapter = opts.adapter ?? localStorageAdapter;

  const adapterRef = useRef(adapter);
  adapterRef.current = adapter;

  const restoredState = useMemo(
    () => adapter.load(storageKey),
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Only load on mount
    [storageKey],
  );

  const save = useCallback(
    (state: PersistedGridState) => {
      adapterRef.current.save(storageKey, state);
    },
    [storageKey],
  );

  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingRef = useRef<PersistedGridState | null>(null);

  const autoSave = useCallback(
    (state: PersistedGridState) => {
      pendingRef.current = state;
      if (timerRef.current != null) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(() => {
        if (pendingRef.current) {
          adapterRef.current.save(storageKey, pendingRef.current);
          pendingRef.current = null;
        }
        timerRef.current = null;
      }, debounceMs);
    },
    [storageKey, debounceMs],
  );

  // Flush on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current != null) {
        clearTimeout(timerRef.current);
        if (pendingRef.current) {
          adapterRef.current.save(storageKey, pendingRef.current);
        }
      }
    };
  }, [storageKey]);

  const clear = useCallback(() => {
    try {
      localStorage.removeItem(storageKey);
    } catch {
      // ignore
    }
  }, [storageKey]);

  return { restoredState, save, autoSave, clear };
};
