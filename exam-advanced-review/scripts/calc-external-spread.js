/**
 * dependency-cruiserの出力から、外部パッケージの依存集中度を算出する。
 *
 * 各外部パッケージが何ファイルからimportされているか（spread）を計測。
 * spreadが小さいほど責務分離ができている。
 *
 * Usage: node calc-external-spread.js <depcruise-output.json>
 * Output: JSON to stdout
 */

const fs = require("fs");

const depcruiseFile = process.argv[2];

if (!depcruiseFile) {
  console.error("Usage: node calc-external-spread.js <depcruise-output.json>");
  process.exit(1);
}

const depcruise = JSON.parse(fs.readFileSync(depcruiseFile, "utf-8"));

// 外部パッケージごとに、importしているsrcファイルを集計
const extMap = new Map();

for (const mod of depcruise.modules || []) {
  const src = mod.source;
  if (!src.startsWith("src/")) continue;

  for (const dep of mod.dependencies || []) {
    const resolved = dep.resolved || dep.module || "";
    const moduleName = dep.module || "";

    // 外部パッケージ判定: node_modulesを経由するか、相対パスでない
    if (!moduleName.startsWith(".") && !moduleName.startsWith("src/")) {
      // パッケージ名を正規化 (@scope/name or name)
      const parts = moduleName.split("/");
      const pkg = moduleName.startsWith("@") && parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : parts[0];

      if (!extMap.has(pkg)) {
        extMap.set(pkg, new Set());
      }
      extMap.get(pkg).add(src);
    }
  }
}

// 結果を構築
const perPackage = {};
let totalSpread = 0;
let packageCount = 0;

for (const [pkg, files] of extMap) {
  perPackage[pkg] = {
    files: [...files].sort(),
    spread: files.size,
  };
  totalSpread += files.size;
  packageCount++;
}

const avgSpread = packageCount > 0
  ? Math.round((totalSpread / packageCount) * 100) / 100
  : 0;

const maxSpread = packageCount > 0
  ? Math.max(...[...extMap.values()].map((s) => s.size))
  : 0;

const result = {
  perPackage,
  avgSpread,
  maxSpread,
  packageCount,
};

console.log(JSON.stringify(result, null, 2));
