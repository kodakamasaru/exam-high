/**
 * ADRからパースした責務定義を元に、dependency-cruiser設定を生成する。
 *
 * Usage: node generate-depcruise-config.js <modules.json>
 * Output: dependency-cruiser設定（JS）を stdout に出力
 *
 * modules.json の形式:
 * { "modules": [{ "name": "controller", "path": "src/controller/" }, ...] }
 */

const fs = require("fs");

const modulesFile = process.argv[2];
if (!modulesFile) {
  console.error("Usage: node generate-depcruise-config.js <modules.json>");
  process.exit(1);
}

const { modules } = JSON.parse(fs.readFileSync(modulesFile, "utf-8"));

const forbidden = [];

// 循環依存の検出
forbidden.push({
  name: "no-circular",
  severity: "error",
  from: {},
  to: { circular: true },
});

const config = {
  forbidden,
  options: {
    doNotFollow: {
      path: "node_modules",
    },
    tsPreCompilationDeps: true,
  },
};

console.log(`module.exports = ${JSON.stringify(config, null, 2)};`);
