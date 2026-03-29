const sonarjs = require("eslint-plugin-sonarjs");

module.exports = [
  {
    files: ["**/*.ts", "**/*.tsx"],
    plugins: {
      sonarjs,
    },
    rules: {
      // 認知的複雑度（デフォルト15、厳しめに10）
      "sonarjs/cognitive-complexity": ["error", 10],
      // 重複コードブロック
      "sonarjs/no-duplicated-branches": "error",
      "sonarjs/no-identical-functions": "error",
      "sonarjs/no-identical-expressions": "error",
      // コード臭
      "sonarjs/no-redundant-boolean": "error",
      "sonarjs/no-collapsible-if": "error",
      "sonarjs/prefer-single-boolean-return": "error",
    },
  },
];
