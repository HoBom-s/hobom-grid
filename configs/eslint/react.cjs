const base = require("./base.cjs");

/** @type {import("eslint").Linter.Config} */
module.exports = {
  ...base,
  plugins: [...(base.plugins || []), "react", "react-hooks"],
  extends: [...(base.extends || []), "plugin:react/recommended", "plugin:react-hooks/recommended"],
  settings: {
    react: { version: "detect" },
  },
  rules: {
    ...base.rules,
    "react/react-in-jsx-scope": "off", // React 17+
  },
};
