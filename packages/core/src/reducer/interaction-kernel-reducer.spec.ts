import { describe, it, expect } from "vitest";
import { createInteractionKernelReducer } from "./interaction-kernel-reducer";
import { createInitialInteractionKernelState } from "../state/interaction-kernel-state";
import type { HitTarget } from "../contracts/hit-test-model";

const mods = (over?: Partial<{ shift: boolean; alt: boolean; ctrl: boolean; meta: boolean }>) => ({
  shift: false,
  alt: false,
  ctrl: false,
  meta: false,
  ...over,
});

describe("InteractionKernel reducer", () => {
  const reducer = createInteractionKernelReducer({
    rowCount: 10,
    colCount: 10,
    enableSelectAll: true,
  });

  it("pointer move sets hover", () => {
    const s0 = createInitialInteractionKernelState();
    const s1 = reducer(s0, {
      type: "PointerMoved",
      point: { x: 0, y: 0 },
      hit: { region: "cell", cell: { row: 1, col: 2 } },
      mods: mods(),
    });

    expect(s1.hover?.region).toBe("cell");
    expect(s1.hover?.cell).toEqual({ row: 1, col: 2 });
  });

  it("pointer leave clears hover", () => {
    const s0 = {
      ...createInitialInteractionKernelState(),
      hover: { region: "cell", cell: { row: 1, col: 2 } } satisfies HitTarget,
    };
    const s1 = reducer(s0, { type: "PointerLeave" });
    expect(s1.hover).toBeNull();
  });

  it("pointer down selects single cell and focuses", () => {
    const s0 = createInitialInteractionKernelState();
    const s1 = reducer(s0, {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 3, col: 4 } },
      mods: mods(),
    });

    expect(s1.isFocused).toBe(true);
    expect(s1.selection.active).toEqual({ row: 3, col: 4 });
    expect(s1.selection.ranges).toHaveLength(1);
    expect(s1.focusCell).toEqual({ row: 3, col: 4 });
  });

  it("shift+pointer down creates range from anchor", () => {
    const s0 = reducer(createInitialInteractionKernelState(), {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 1, col: 1 } },
      mods: mods(),
    });

    const s1 = reducer(s0, {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 3, col: 4 } },
      mods: mods({ shift: true }),
    });

    expect(s1.selection.ranges).toHaveLength(1);
    expect(s1.selection.ranges[0]).toEqual({
      start: { row: 1, col: 1 },
      end: { row: 3, col: 4 },
    });
  });

  it("ctrl+pointer down toggles cell selection", () => {
    const s0 = createInitialInteractionKernelState();

    const s1 = reducer(s0, {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 2, col: 2 } },
      mods: mods({ ctrl: true }),
    });

    expect(s1.selection.ranges).toHaveLength(1);

    const s2 = reducer(s1, {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 2, col: 2 } },
      mods: mods({ ctrl: true }),
    });

    expect(s2.selection.ranges).toHaveLength(0);
  });

  it("arrow keys move active cell with single selection", () => {
    const s0 = reducer(createInitialInteractionKernelState(), {
      type: "SetActiveCell",
      cell: { row: 5, col: 5 },
    });

    const s1 = reducer(s0, { type: "KeyDown", key: "ArrowRight", mods: mods() });
    expect(s1.selection.active).toEqual({ row: 5, col: 6 });
    expect(s1.selection.ranges[0]).toEqual({ start: { row: 5, col: 6 }, end: { row: 5, col: 6 } });
  });

  it("shift+arrow expands range from anchor", () => {
    const s0 = reducer(createInitialInteractionKernelState(), {
      type: "SetActiveCell",
      cell: { row: 1, col: 1 },
    });

    const s1 = reducer(s0, { type: "KeyDown", key: "ArrowDown", mods: mods({ shift: true }) });
    expect(s1.selection.ranges[0]).toEqual({
      start: { row: 1, col: 1 },
      end: { row: 2, col: 1 },
    });
  });

  it("ctrl/cmd+a selects all when enabled", () => {
    const s0 = reducer(createInitialInteractionKernelState(), {
      type: "SetActiveCell",
      cell: { row: 2, col: 3 },
    });

    const s1 = reducer(s0, { type: "KeyDown", key: "a", mods: mods({ ctrl: true }) });
    expect(s1.selection.ranges[0]).toEqual({
      start: { row: 0, col: 0 },
      end: { row: 9, col: 9 },
    });
  });

  it("escape clears selection ranges only", () => {
    const s0 = reducer(createInitialInteractionKernelState(), {
      type: "PointerDown",
      point: { x: 0, y: 0 },
      button: 0,
      hit: { region: "cell", cell: { row: 3, col: 4 } },
      mods: mods(),
    });

    const s1 = reducer(s0, { type: "KeyDown", key: "Escape", mods: mods() });
    expect(s1.selection.ranges).toHaveLength(0);
    expect(s1.selection.active).toEqual({ row: 3, col: 4 }); // active stays (design choice)
  });
});
