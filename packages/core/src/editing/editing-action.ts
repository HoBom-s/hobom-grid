export type EditingAction =
  /** Open edit mode on a cell. `initialValue` seeds the editor. */
  | Readonly<{ type: "StartEdit"; row: number; col: number; initialValue: unknown }>
  /** Editor value changed by user input. */
  | Readonly<{ type: "UpdateEditValue"; value: unknown }>
  /** Async validation started. */
  | Readonly<{ type: "SetValidating"; row: number; col: number }>
  /** Async validation resolved. */
  | Readonly<{
      type: "SetValidationResult";
      row: number;
      col: number;
      valid: boolean;
      message: string | undefined;
    }>
  /** Value accepted — close editor. Caller is responsible for persisting. */
  | Readonly<{ type: "CommitEdit" }>
  /** Discard changes — close editor. */
  | Readonly<{ type: "CancelEdit" }>;
