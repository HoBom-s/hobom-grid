// Main component
export { Grid } from "./grid/Grid";
export type { GridProps, GridRenderState } from "./grid/Grid";

// Hooks (for power users who want to compose their own renderer)
export { useGridKernel } from "./hooks/use-grid-kernel";
export type { UseGridKernelResult } from "./hooks/use-grid-kernel";

export { useInteraction } from "./hooks/use-interaction";
export type { UseInteractionResult } from "./hooks/use-interaction";
