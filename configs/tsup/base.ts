import type { Options } from "tsup";

export const baseConfig: Options = {
  entry: ["src/index.ts"],
  outDir: "dist",
  format: ["esm", "cjs"],
  dts: true,
  sourcemap: true,
  clean: true,
  target: "es2022",
  outExtension({ format }) {
    return format === "cjs" ? { js: ".cjs" } : { js: ".js" };
  },
};
