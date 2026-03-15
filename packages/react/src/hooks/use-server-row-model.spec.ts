import { describe, it, expect, vi } from "vitest";
import { renderHook, act, waitFor } from "@testing-library/react";
import { useServerRowModel } from "./use-server-row-model";
import type { ServerQuery, ServerResponse } from "@hobom-grid/core";

type User = { id: number; name: string };

const allUsers: User[] = Array.from({ length: 200 }, (_, i) => ({
  id: i + 1,
  name: `User ${i + 1}`,
}));

const createMockFetch = () => {
  return vi.fn((query: ServerQuery<User>): Promise<ServerResponse<User>> => {
    const rows = allUsers.slice(query.offset, query.offset + query.limit);
    return Promise.resolve({ rows, totalCount: allUsers.length });
  });
};

describe("useServerRowModel", () => {
  it("fetches initial data on mount", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 50,
      }),
    );

    await waitFor(() => {
      expect(result.current.totalCount).toBe(200);
    });
    expect(fetchRows).toHaveBeenCalledTimes(1);
  });

  it("returns data rows for cached entries", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 50,
      }),
    );

    await waitFor(() => {
      expect(result.current.totalCount).toBe(200);
    });

    const row = result.current.rowModel.getRow(0);
    expect(row.type).toBe("data");
    if (row.type === "data") expect(row.row.name).toBe("User 1");
  });

  it("returns loading sentinel for cache misses", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 10,
      }),
    );

    await waitFor(() => {
      expect(result.current.totalCount).toBe(200);
    });

    // Row 50 should be loading (only first 10 were fetched)
    const row50 = result.current.rowModel.getRow(50);
    expect(row50.type).toBe("loading");
  });

  it("requestVisibleRange fetches missing data", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 50,
        prefetchBuffer: 0,
      }),
    );

    await waitFor(() => {
      expect(result.current.totalCount).toBe(200);
    });

    const initialCalls = fetchRows.mock.calls.length;

    act(() => {
      result.current.requestVisibleRange(100, 120);
    });

    await waitFor(() => {
      expect(fetchRows.mock.calls.length).toBeGreaterThan(initialCalls);
    });
  });

  it("refresh clears cache and re-fetches", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 50,
      }),
    );

    await waitFor(() => {
      expect(result.current.totalCount).toBe(200);
    });

    const callsBeforeRefresh = fetchRows.mock.calls.length;

    act(() => result.current.refresh());

    await waitFor(() => {
      expect(fetchRows.mock.calls.length).toBeGreaterThan(callsBeforeRefresh);
    });
  });

  it("handles fetch errors", async () => {
    const fetchRows = vi.fn().mockRejectedValue(new Error("Network error"));
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r: User) => r.id,
        pageSize: 50,
      }),
    );

    await waitFor(() => {
      expect(result.current.error).toBeTruthy();
    });
    expect(result.current.error?.message).toBe("Network error");
  });

  it("rowModel.rowCount reflects totalCount", async () => {
    const fetchRows = createMockFetch();
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
        pageSize: 50,
      }),
    );

    await waitFor(() => {
      expect(result.current.rowModel.rowCount).toBe(200);
    });
  });

  it("defaults to empty model before first fetch completes", () => {
    const fetchRows = vi.fn(
      () =>
        new Promise<ServerResponse<User>>(() => {
          /* never resolves */
        }),
    );
    const { result } = renderHook(() =>
      useServerRowModel({
        fetchRows,
        getId: (r) => r.id,
      }),
    );
    expect(result.current.rowModel.rowCount).toBe(0);
    expect(result.current.totalCount).toBe(0);
  });
});
