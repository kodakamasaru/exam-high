/**
 * dependency-cruiserの出力とADRの責務定義を使って、アーキテクチャ違反を集計する。
 *
 * Usage: node calc-arch-violations.js <depcruise-output.json> <modules.json>
 * Output: JSON to stdout
 *
 * 検出する違反:
 * 1. 責務間の双方向依存（A→B かつ B→A）
 * 2. 外部パッケージのimportが責務をまたいで分散しているか
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

// 責務名を解決する関数
// ディレクトリベース（src/domain/）とサフィックスベース（**/*.controller.ts）の両方に対応
function resolveResponsibility(filePath) {
  for (const mod of modules) {
    const modPath = mod.path.replace(/\/$/, "");
    if (modPath.includes("*")) {
      const suffix = modPath.replace(/^\*+\/?\*?/, "");
      if (filePath.endsWith(suffix)) return mod.name;
    } else {
      if (filePath.startsWith(modPath)) return mod.name;
    }
  }
  return null;
}

// 責務間の依存マップを構築
const depMap = new Map();

for (const mod of depcruise.modules || []) {
  const fromResp = resolveResponsibility(mod.source);
  if (!fromResp) continue;

  for (const dep of mod.dependencies || []) {
    if (dep.resolved && dep.resolved.startsWith("node_modules")) continue;

    const toResp = resolveResponsibility(dep.resolved || dep.module);
    if (!toResp || toResp === fromResp) continue;

    const key = `${fromResp}→${toResp}`;
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
    bidirectionalPairs.push({ respA: a, respB: b });
  }
}

// 外部依存の責務分散度
const externalByResp = new Map();
for (const mod of depcruise.modules || []) {
  const fromResp = resolveResponsibility(mod.source);
  if (!fromResp) continue;

  for (const dep of mod.dependencies || []) {
    if (dep.resolved && dep.resolved.startsWith("node_modules")) {
      if (!externalByResp.has(fromResp)) {
        externalByResp.set(fromResp, new Set());
      }
      externalByResp.get(fromResp).add(dep.module);
    }
  }
}

const externalSpread = {};
for (const [resp, pkgs] of externalByResp) {
  externalSpread[resp] = pkgs.size;
}

const result = {
  bidirectionalPairs,
  bidirectionalCount: bidirectionalPairs.length,
  externalSpreadByResponsibility: externalSpread,
  totalResponsibilities: modules.length,
};

console.log(JSON.stringify(result, null, 2));
