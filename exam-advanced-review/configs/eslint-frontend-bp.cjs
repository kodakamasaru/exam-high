const { FlatCompat } = require("@eslint/eslintrc");
const path = require("path");

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

module.exports = [
  ...compat.extends(
    "plugin:@next/next/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ),
  {
    settings: {
      react: {
        version: "detect",
      },
    },
    rules: {
      // React 17+ JSX transformではimport不要
      "react/react-in-jsx-scope": "off",
    },
  },
];
