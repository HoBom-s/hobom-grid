const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  // -----------------------------
  // Global ignores
  // -----------------------------
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/reference/**", // typedoc output
    ],
  },

  // -----------------------------
  // Base JS recommended
  // -----------------------------
  js.configs.recommended,

  // -----------------------------
  // TS recommended (non type-aware)
  // -----------------------------
  ...tseslint.configs.recommended,

  // -----------------------------
  // Common project rules (JS/TS)
  // -----------------------------
  {
    rules: {
      "no-console": "off",
    },
  },

  // -----------------------------
  // TS rule overrides
  // -----------------------------
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // -----------------------------
  // React + Hooks (apply to react package only)
  // -----------------------------
  {
    files: ["packages/react/**/*.{ts,tsx,js,jsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
    },
    settings: {
      react: { version: "detect" },
    },
    rules: {
      ...(react.configs.recommended?.rules ?? {}),
      ...(reactHooks.configs.recommended?.rules ?? {}),

      "react/react-in-jsx-scope": "off", // React 17+
    },
  },
];
