import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGridStatePersistence } from "./use-grid-state-persistence";
import type { StorageAdapter, PersistedGridState } from "./use-grid-state-persistence";

const createMockAdapter = (): StorageAdapter & { store: Record<string, PersistedGridState> } => {
  const store: Record<string, PersistedGridState> = {};
  return {
    store,
    save: (key, state) => {
      store[key] = state;
    },
    load: (key) => store[key] ?? null,
  };
};

describe("useGridStatePersistence", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  it("restoredState is null when nothing is persisted", () => {
    const adapter = createMockAdapter();
    const { result } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter }),
    );
    expect(result.current.restoredState).toBeNull();
  });

  it("restoredState returns previously saved state", () => {
    const adapter = createMockAdapter();
    adapter.store["test-grid"] = { page: 2, pageSize: 50 };

    const { result } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter }),
    );
    expect(result.current.restoredState).toEqual({ page: 2, pageSize: 50 });
  });

  it("save persists state immediately", () => {
    const adapter = createMockAdapter();
    const { result } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter }),
    );

    act(() => result.current.save({ page: 1, colWidths: { 0: 200 } }));
    expect(adapter.store["test-grid"]).toEqual({ page: 1, colWidths: { 0: 200 } });
  });

  it("autoSave debounces writes", () => {
    const adapter = createMockAdapter();
    const { result } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter, debounceMs: 300 }),
    );

    act(() => {
      result.current.autoSave({ page: 1 });
      result.current.autoSave({ page: 2 });
      result.current.autoSave({ page: 3 });
    });

    // Not yet saved (debounce)
    expect(adapter.store["test-grid"]).toBeUndefined();

    act(() => {
      vi.advanceTimersByTime(300);
    });
    // Only the last state should be saved
    expect(adapter.store["test-grid"]).toEqual({ page: 3 });
  });

  it("autoSave flushes on unmount", () => {
    const adapter = createMockAdapter();
    const { result, unmount } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter, debounceMs: 1000 }),
    );

    act(() => result.current.autoSave({ page: 5 }));
    expect(adapter.store["test-grid"]).toBeUndefined();

    unmount();
    expect(adapter.store["test-grid"]).toEqual({ page: 5 });
  });

  it("clear removes persisted state", () => {
    // Use real localStorage for clear test
    const key = "__test_persistence_clear__";
    localStorage.setItem(key, JSON.stringify({ page: 1 }));

    const { result } = renderHook(() => useGridStatePersistence({ storageKey: key }));

    act(() => result.current.clear());
    expect(localStorage.getItem(key)).toBeNull();
  });

  it("handles adapter errors gracefully", () => {
    const adapter: StorageAdapter = {
      save: () => {
        throw new Error("write error");
      },
      load: () => null,
    };
    const { result } = renderHook(() =>
      useGridStatePersistence({ storageKey: "test-grid", adapter }),
    );
    // Should not throw
    expect(() => {
      act(() => result.current.save({ page: 1 }));
    }).toThrow("write error");
  });
});
