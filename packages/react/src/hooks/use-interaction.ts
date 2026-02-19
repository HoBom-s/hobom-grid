import { useCallback, useMemo, useReducer, useRef } from "react";
import { createInteractionKernelReducer, InteractionKernel } from "@hobom-grid/core";
import type { InteractionKernelState, MeasuredAxis, ViewportModel } from "@hobom-grid/core";
import { hitTestGrid } from "../utils/hit-test";
import { getModifierKeys } from "../utils/dom-mods";

type UseInteractionSpec = Readonly<{
  rowCount: number;
  colCount: number;
  enableSelectAll?: boolean;
  headerRowCount: number;
  rowHeaderWidth?: number;
  resizeHandleSlop?: number;
}>;

/** Minimum pointer movement in px before a drag is detected. */
const DRAG_THRESHOLD_PX = 4;

type DragTrack = {
  startX: number;
  startY: number;
  started: boolean;
};

export type UseInteractionResult = {
  state: InteractionKernelState;
  pointerHandlers: {
    onPointerMove: React.PointerEventHandler<HTMLDivElement>;
    onPointerDown: React.PointerEventHandler<HTMLDivElement>;
    onPointerUp: React.PointerEventHandler<HTMLDivElement>;
    onPointerLeave: React.PointerEventHandler<HTMLDivElement>;
  };
  keyboardHandlers: {
    onKeyDown: React.KeyboardEventHandler<HTMLDivElement>;
    onFocus: React.FocusEventHandler<HTMLDivElement>;
    onBlur: React.FocusEventHandler<HTMLDivElement>;
  };
};

/**
 * Manages interaction state for the grid.
 *
 * Uses refs for the latest viewport and axes so that pointer handlers
 * always see the current values without needing to be recreated on every scroll.
 */
export const useInteraction = (
  spec: UseInteractionSpec,
  viewportRef: React.MutableRefObject<ViewportModel>,
  rowAxisRef: React.MutableRefObject<MeasuredAxis>,
  colAxisRef: React.MutableRefObject<MeasuredAxis>,
): UseInteractionResult => {
  const reducer = useMemo(
    () =>
      createInteractionKernelReducer({
        rowCount: spec.rowCount,
        colCount: spec.colCount,
        enableSelectAll: spec.enableSelectAll ?? true,
      }),
     
    [spec.rowCount, spec.colCount, spec.enableSelectAll],
  );

  const [state, dispatch] = useReducer(reducer, undefined, InteractionKernel.createInitialState);

  const dragRef = useRef<DragTrack | null>(null);

  const hitTest = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      return hitTestGrid(
        e.clientX - rect.left,
        e.clientY - rect.top,
        viewportRef.current,
        rowAxisRef.current,
        colAxisRef.current,
        {
          headerRowCount: spec.headerRowCount,
          rowHeaderWidth: spec.rowHeaderWidth ?? 0,
          resizeHandleSlop: spec.resizeHandleSlop ?? 4,
        },
      );
    },
    // viewportRef / rowAxisRef / colAxisRef are stable refs — intentionally excluded from deps
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [spec.headerRowCount, spec.rowHeaderWidth, spec.resizeHandleSlop],
  );

  const onPointerDown = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      if (e.button !== 0) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const localX = e.clientX - rect.left;
      const localY = e.clientY - rect.top;

      dragRef.current = { startX: localX, startY: localY, started: false };

      e.currentTarget.setPointerCapture(e.pointerId);

      const hit = hitTest(e);
      const mods = getModifierKeys(e.nativeEvent);
      const point = { x: e.clientX, y: e.clientY };

      dispatch({ type: "PointerDown", point, button: 0, hit, mods });
    },
    [hitTest],
  );

  const onPointerMove = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const hit = hitTest(e);
      const mods = getModifierKeys(e.nativeEvent);
      const point = { x: e.clientX, y: e.clientY };

      const drag = dragRef.current;
      if (drag) {
        const rect = e.currentTarget.getBoundingClientRect();
        const localX = e.clientX - rect.left;
        const localY = e.clientY - rect.top;
        const dx = localX - drag.startX;
        const dy = localY - drag.startY;

        if (!drag.started && Math.hypot(dx, dy) > DRAG_THRESHOLD_PX) {
          drag.started = true;
          dispatch({ type: "PointerDragStart", point, hit, mods });
        } else if (drag.started) {
          dispatch({ type: "PointerDragMove", point, hit, mods });
        }
      } else {
        dispatch({ type: "PointerMoved", point, hit, mods });
      }
    },
    [hitTest],
  );

  const onPointerUp = useCallback(
    (e: React.PointerEvent<HTMLDivElement>) => {
      const hit = hitTest(e);
      const mods = getModifierKeys(e.nativeEvent);
      const point = { x: e.clientX, y: e.clientY };

      const drag = dragRef.current;
      if (drag?.started) {
        dispatch({ type: "PointerDragEnd", point, hit, mods });
      }

      dispatch({ type: "PointerUp", point, button: e.button as 0 | 1 | 2, hit, mods });
      dragRef.current = null;
    },
    [hitTest],
  );

  const onPointerLeave = useCallback((_e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) {
      dispatch({ type: "PointerLeave" });
    }
  }, []);

  const NAV_KEYS = new Set([
    "ArrowUp",
    "ArrowDown",
    "ArrowLeft",
    "ArrowRight",
    "Home",
    "End",
    "PageUp",
    "PageDown",
    "Enter",
    "Escape",
    "Tab",
  ]);

  const onKeyDown = useCallback((e: React.KeyboardEvent<HTMLDivElement>) => {
    const key = e.key;
    const isSelectAll = key === "a" && (e.ctrlKey || e.metaKey);

    if (!NAV_KEYS.has(key) && !isSelectAll) return;

    e.preventDefault();
    dispatch({
      type: "KeyDown",
      key: key as "ArrowUp" | "ArrowDown" | "ArrowLeft" | "ArrowRight" | "Escape" | "a",
      mods: getModifierKeys(e.nativeEvent),
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onFocus = useCallback(() => {
    dispatch({ type: "FocusGained" });
  }, []);

  const onBlur = useCallback(() => {
    dispatch({ type: "FocusLost" });
  }, []);

  return {
    state,
    pointerHandlers: { onPointerMove, onPointerDown, onPointerUp, onPointerLeave },
    keyboardHandlers: { onKeyDown, onFocus, onBlur },
  };
};
