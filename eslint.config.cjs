const js = require("@eslint/js");
const tseslint = require("typescript-eslint");
const react = require("eslint-plugin-react");
const reactHooks = require("eslint-plugin-react-hooks");

module.exports = [
  // ----- Global ignores -----
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.turbo/**",
      "**/coverage/**",
      "**/reference/**",
      "**/tsup.config.ts",
      "**/vitest.config.ts",
      "apps/docs/.vitepress/**",
      "configs/tsup/**",
    ],
  },

  // ----- Base JS recommended -----
  js.configs.recommended,

  // ----- TS strictTypeChecked (type-aware) -----
  ...tseslint.configs.strictTypeChecked,

  // ----- TS common: parserOptions + custom rules -----
  {
    files: ["**/*.{ts,tsx}"],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: __dirname,
      },
    },
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": ["error", { prefer: "type-imports" }],
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/restrict-template-expressions": ["error", { allowNumber: true }],
      "@typescript-eslint/explicit-function-return-type": "off",
    },
  },

  // ----- Spec / config file relaxation -----
  {
    files: ["**/*.spec.{ts,tsx}", "**/*.test.{ts,tsx}", "**/*.config.{ts,tsx}"],
    rules: {
      "@typescript-eslint/no-explicit-any": "off",
      "@typescript-eslint/restrict-template-expressions": "off",
      "@typescript-eslint/no-unsafe-assignment": "off",
      "@typescript-eslint/no-unsafe-member-access": "off",
      "@typescript-eslint/no-unsafe-call": "off",
      "@typescript-eslint/no-unsafe-argument": "off",
      "@typescript-eslint/no-unsafe-return": "off",
      "@typescript-eslint/no-confusing-void-expression": "off",
      "@typescript-eslint/unbound-method": "off",
      "@typescript-eslint/no-non-null-assertion": "off",
    },
  },

  // ----- React + Hooks (react package only) -----
  {
    files: ["packages/react/**/*.{ts,tsx}"],
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
      "react/react-in-jsx-scope": "off",
    },
  },

  // ----- CJS files: disable TS parsing -----
  {
    files: ["**/*.cjs"],
    ...tseslint.configs.disableTypeChecked,
  },
];
