export const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

export const assertNonNegativeInt = (n: number, label: string) => {
  if (!Number.isInteger(n) || n < 0) throw new Error(`${label} must be a non-negative integer`);
};

export const assertFiniteNonNegative = (n: number, label: string) => {
  if (!Number.isFinite(n) || n < 0)
    throw new Error(`${label} must be a finite non-negative number`);
};
