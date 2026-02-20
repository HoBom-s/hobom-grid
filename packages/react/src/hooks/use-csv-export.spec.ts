import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCsvExport } from "./use-csv-export";

type Row = { name: string; age: number; salary: number };

const ROWS: Row[] = [
  { name: "Alice", age: 30, salary: 90000 },
  { name: "Bob, Jr.", age: 25, salary: 55000 },
  { name: 'Car"a', age: 28, salary: 70000 },
];

const COLUMNS = [
  { label: "Name", getValue: (r: Row) => r.name },
  { label: "Age", getValue: (r: Row) => r.age },
  { label: "Salary", getValue: (r: Row) => r.salary, formatValue: (v: unknown) => `$${v}` },
];

describe("useCsvExport", () => {
  let createdUrl: string;
  let capturedBlob: Blob | undefined;
  let capturedFilename: string | undefined;

  beforeEach(() => {
    createdUrl = "blob:mock";
    capturedBlob = undefined;
    capturedFilename = undefined;

    vi.spyOn(URL, "createObjectURL").mockImplementation((blob) => {
      capturedBlob = blob as Blob;
      return createdUrl;
    });
    vi.spyOn(URL, "revokeObjectURL").mockImplementation(() => {});

    const anchor = document.createElement("a");
    vi.spyOn(document, "createElement").mockReturnValue(anchor);
    vi.spyOn(document.body, "appendChild").mockImplementation(() => anchor);
    vi.spyOn(document.body, "removeChild").mockImplementation(() => anchor);
    vi.spyOn(anchor, "click").mockImplementation(() => {
      capturedFilename = anchor.download;
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("creates a Blob and triggers download", () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS));
    expect(capturedBlob).toBeDefined();
    expect(capturedFilename).toBe("export.csv");
  });

  it("generates correct header row", async () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS));
    const text = await capturedBlob!.text();
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    expect(lines[0]).toBe("Name,Age,Salary");
  });

  it("generates correct data rows", async () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS));
    const text = await capturedBlob!.text();
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    expect(lines[1]).toBe("Alice,30,$90000");
  });

  it("escapes commas in cell values", async () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS));
    const text = await capturedBlob!.text();
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    // "Bob, Jr." contains a comma → should be quoted
    expect(lines[2]).toBe('"Bob, Jr.",25,$55000');
  });

  it("escapes double quotes in cell values", async () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS));
    const text = await capturedBlob!.text();
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    // 'Car"a' → "Car""a"
    expect(lines[3]).toBe('"Car""a",28,$70000');
  });

  it("uses custom filename", () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv(ROWS, "report-2024.csv"));
    expect(capturedFilename).toBe("report-2024.csv");
  });

  it("handles empty rows", async () => {
    const { result } = renderHook(() => useCsvExport({ columns: COLUMNS }));
    act(() => result.current.exportCsv([]));
    const text = await capturedBlob!.text();
    const lines = text.replace(/^\uFEFF/, "").split("\r\n");
    expect(lines).toHaveLength(1); // only header
    expect(lines[0]).toBe("Name,Age,Salary");
  });
});
