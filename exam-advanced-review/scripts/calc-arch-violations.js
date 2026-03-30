/**
 * dependency-cruiserの出力とADRのモジュール定義を使って、アーキテクチャ違反を集計する。
 *
 * Usage: node calc-arch-violations.js <depcruise-output.json> <modules.json>
 * Output: JSON to stdout
 *
 * 検出する違反:
 * 1. モジュール間の双方向依存（A→B かつ B→A）
 * 2. 外部パッケージ（node_modules）のimportがモジュールをまたいで分散しているか
 */

const fs = require("fs");

const depcruiseFile = process.argv[2];
const modulesFile = process.argv[3];

if (!depcruiseFile || !modulesFile) {
  console.error("Usage: node calc-arch-violations.js <depcruise-output.json> <modules.json>");
  process.exit(1);
}

const depcruise = JSON.parse(fs.readFileSync(depcruiseFile, "utf-8"));
const { modules } = JSON.parse(fs.readFileSync(modulesFile, "utf-8"));

// モジュール名を解決する関数
// ディレクトリベース（src/domain/）とサフィックスベース（**/*.controller.ts）の両方に対応
function resolveModule(filePath) {
  for (const mod of modules) {
    const modPath = mod.path.replace(/\/$/, "");
    if (modPath.includes("*")) {
      // glob: **/*.controller.ts → .controller.ts で endsWith
      const suffix = modPath.replace(/^\*+\/?\*?/, "");
      if (filePath.endsWith(suffix)) return mod.name;
    } else {
      // ディレクトリ前方一致
      if (filePath.startsWith(modPath)) return mod.name;
    }
  }
  return null;
}

// モジュール間の依存マップを構築
const depMap = new Map(); // "modA→modB" => count

for (const mod of depcruise.modules || []) {
  const fromModule = resolveModule(mod.source);
  if (!fromModule) continue;

  for (const dep of mod.dependencies || []) {
    // node_modulesへの依存はスキップ（外部依存は別指標）
    if (dep.resolved && dep.resolved.startsWith("node_modules")) continue;

    const toModule = resolveModule(dep.resolved || dep.module);
    if (!toModule || toModule === fromModule) continue;

    const key = `${fromModule}→${toModule}`;
    depMap.set(key, (depMap.get(key) || 0) + 1);
  }
}

// 双方向依存の検出
const bidirectionalPairs = [];
const checked = new Set();

for (const key of depMap.keys()) {
  const [a, b] = key.split("→");
  const pairKey = [a, b].sort().join(",");
  if (checked.has(pairKey)) continue;
  checked.add(pairKey);

  const reverse = `${b}→${a}`;
  if (depMap.has(reverse)) {
    bidirectionalPairs.push({ moduleA: a, moduleB: b });
  }
}

// 外部依存のモジュール分散度
const externalByModule = new Map();
for (const mod of depcruise.modules || []) {
  const fromModule = resolveModule(mod.source);
  if (!fromModule) continue;

  for (const dep of mod.dependencies || []) {
    if (dep.resolved && dep.resolved.startsWith("node_modules")) {
      if (!externalByModule.has(fromModule)) {
        externalByModule.set(fromModule, new Set());
      }
      externalByModule.get(fromModule).add(dep.module);
    }
  }
}

const externalSpread = {};
for (const [mod, pkgs] of externalByModule) {
  externalSpread[mod] = pkgs.size;
}

const result = {
  bidirectionalPairs,
  bidirectionalCount: bidirectionalPairs.length,
  externalSpreadByModule: externalSpread,
  totalModules: modules.length,
};

console.log(JSON.stringify(result, null, 2));
