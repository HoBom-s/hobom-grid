/**
 * A single committed or in-flight change to a cell value.
 */
export type CellChange<TValue = unknown> = Readonly<{
  row: number;
  col: number;
  previousValue: TValue;
  newValue: TValue;
}>;

/**
 * Sync or async validator return type.
 * valid:true  → no error
 * valid:false → `message` is shown to the user
 */
export type ValidationResult =
  | Readonly<{ valid: true }>
  | Readonly<{ valid: false; message: string }>;

/**
 * The currently active cell-edit session.
 */
export type ActiveEdit = Readonly<{
  row: number;
  col: number;
  /** Value at the time StartEdit was dispatched — used for rollback and dirty-check. */
  initialValue: unknown;
  /** Latest value from UpdateEditValue. */
  currentValue: unknown;
  validationState: "idle" | "validating" | "valid" | "invalid";
  /** Populated when validationState === "invalid". */
  validationMessage: string | undefined;
}>;

export type EditingState = Readonly<{
  activeEdit: ActiveEdit | null;
}>;
