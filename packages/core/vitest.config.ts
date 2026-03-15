import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.spec.ts"],
    coverage: {
      provider: "v8",
      reporter: ["text", "html", "lcov"],
      reportsDirectory: "coverage",
      include: ["src/**/*.ts"],
      exclude: ["src/**/*.spec.ts", "src/**/index.ts", "src/**/*.bench.ts", "src/__perf__/**"],
      thresholds: {
        statements: 80,
        branches: 65,
        functions: 90,
        lines: 85,
      },
    },
    benchmark: {
      include: ["src/**/*.bench.ts"],
    },
  },
});
