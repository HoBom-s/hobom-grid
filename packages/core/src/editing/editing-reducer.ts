import type { EditingState } from "./editing-state";
import type { EditingAction } from "./editing-action";

export const editingReducer = (state: EditingState, action: EditingAction): EditingState => {
  switch (action.type) {
    case "StartEdit":
      return {
        activeEdit: {
          row: action.row,
          col: action.col,
          initialValue: action.initialValue,
          currentValue: action.initialValue,
          validationState: "idle",
          validationMessage: undefined,
        },
      };

    case "UpdateEditValue":
      if (!state.activeEdit) return state;
      return {
        activeEdit: {
          ...state.activeEdit,
          currentValue: action.value,
          validationState: "idle",
          validationMessage: undefined,
        },
      };

    case "SetValidating": {
      const e = state.activeEdit;
      if (!e || e.row !== action.row || e.col !== action.col) return state;
      return { activeEdit: { ...e, validationState: "validating" } };
    }

    case "SetValidationResult": {
      const e = state.activeEdit;
      if (!e || e.row !== action.row || e.col !== action.col) return state;
      return {
        activeEdit: {
          ...e,
          validationState: action.valid ? "valid" : "invalid",
          validationMessage: action.message,
        },
      };
    }

    case "CommitEdit":
    case "CancelEdit":
      return { activeEdit: null };

    default:
      return state;
  }
};

export const EditingKernel = {
  createInitialState: (): EditingState => ({ activeEdit: null }),
};
