/**
 * ADRからパースしたモジュール定義を元に、dependency-cruiser設定を生成する。
 *
 * Usage: node generate-depcruise-config.js <modules.json>
 * Output: dependency-cruiser設定（JS）を stdout に出力
 *
 * modules.json の形式:
 * { "modules": [{ "name": "domain", "path": "src/domain/" }, ...] }
 */

const fs = require("fs");

const modulesFile = process.argv[2];
if (!modulesFile) {
  console.error("Usage: node generate-depcruise-config.js <modules.json>");
  process.exit(1);
}

const { modules } = JSON.parse(fs.readFileSync(modulesFile, "utf-8"));

// 各モジュールのパスパターンを生成
const forbidden = [];

// モジュール間の双方向依存を検出するルールを生成
// 全ペアについて A→B と B→A の両方を検出
for (let i = 0; i < modules.length; i++) {
  for (let j = i + 1; j < modules.length; j++) {
    const a = modules[i];
    const b = modules[j];
    // 個別のルールではなく、後で集計スクリプトで双方向を検出する
  }
}

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
