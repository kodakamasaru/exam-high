/**
 * sonarjsをsubmission上で実行するラッパー。
 * ESLint 9+のベースディレクトリ制約を回避するため、
 * 一時configを生成してsubmissionディレクトリ内で実行する。
 *
 * cognitive-complexity（閾値0）+ コード臭ルールを1回で実行。
 *
 * Usage: node run-sonarjs.js <target-dir> <output-json>
 */

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

const targetDir = process.argv[2];
const outputFile = process.argv[3];

if (!targetDir || !outputFile) {
  console.error("Usage: node run-sonarjs.js <target-dir> <output-json>");
  process.exit(1);
}

const sonarjsPath = require.resolve("eslint-plugin-sonarjs");
const tsParserPath = require.resolve("@typescript-eslint/parser");

const configContent = `
const sonarjs = require("${sonarjsPath.replace(/\\/g, "/")}");
const tsParser = require("${tsParserPath.replace(/\\/g, "/")}");

module.exports = [{
  files: ["**/*.ts", "**/*.tsx"],
  languageOptions: { parser: tsParser },
  plugins: { sonarjs },
  rules: {
    "sonarjs/cognitive-complexity": ["error", 0],
    "sonarjs/no-duplicated-branches": "error",
    "sonarjs/no-identical-functions": "error",
    "sonarjs/no-identical-expressions": "error",
    "sonarjs/no-redundant-boolean": "error",
    "sonarjs/no-collapsible-if": "error",
    "sonarjs/prefer-single-boolean-return": "error",
  }
}];
`;

const tmpConfig = path.join(targetDir, ".eslint-sonarjs-tmp.cjs");
fs.writeFileSync(tmpConfig, configContent);

try {
  const result = execSync(
    `npx eslint . -c .eslint-sonarjs-tmp.cjs -f json || true`,
    { cwd: targetDir, maxBuffer: 10 * 1024 * 1024, stdio: ["pipe", "pipe", "pipe"] }
  );

  const output = result.toString().trim();
  const jsonStart = output.indexOf("[");
  if (jsonStart >= 0) {
    fs.writeFileSync(outputFile, output.slice(jsonStart));
  } else {
    fs.writeFileSync(outputFile, "[]");
  }
} catch (e) {
  // eslintがexit code 1で終了してもstdoutにJSONが出力される
  const stdout = e.stdout?.toString().trim() || "";
  const jsonStart = stdout.indexOf("[");
  if (jsonStart >= 0) {
    fs.writeFileSync(outputFile, stdout.slice(jsonStart));
  } else {
    fs.writeFileSync(outputFile, "[]");
  }
} finally {
  try { fs.unlinkSync(tmpConfig); } catch {}
}
