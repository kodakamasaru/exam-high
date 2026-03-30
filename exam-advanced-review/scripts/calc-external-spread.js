/**
 * dependency-cruiserの出力とADR責務定義から、
 * 外部パッケージの責務単位でのspreadを算出する。
 *
 * 「honoが3ファイルからimportされているが全部controller責務」→ spread=1（OK）
 * 「honoがcontroller責務とservice責務からimport」→ spread=2（責務漏れ）
 *
 * Usage: node calc-external-spread.js <depcruise-output.json> [modules.json]
 * Output: JSON to stdout
 */

const fs = require("fs");

const depcruiseFile = process.argv[2];
const modulesFile = process.argv[3];

if (!depcruiseFile) {
  console.error("Usage: node calc-external-spread.js <depcruise-output.json> [modules.json]");
  process.exit(1);
}

const depcruise = JSON.parse(fs.readFileSync(depcruiseFile, "utf-8"));

// 責務定義がある場合は責務単位、なければファイル単位
let responsibilities = null;
if (modulesFile && fs.existsSync(modulesFile)) {
  try {
    responsibilities = JSON.parse(fs.readFileSync(modulesFile, "utf-8")).modules;
  } catch {}
}

function resolveResponsibility(filePath) {
  if (!responsibilities) return filePath;
  for (const resp of responsibilities) {
    const respPath = resp.path.replace(/\/$/, "");
    if (respPath.includes("*")) {
      const suffix = respPath.replace(/^\*+\/?\*?/, "");
      if (filePath.endsWith(suffix)) return resp.name;
    } else {
      if (filePath.startsWith(respPath)) return resp.name;
    }
  }
  return filePath;
}

// パッケージごとにimport元の責務（or ファイル）を集計
const extMap = new Map();

for (const mod of depcruise.modules || []) {
  const src = mod.source;
  if (!src.startsWith("src/")) continue;
  // エントリポイント（composition root）は除外。全層を知っているのが正しい設計
  if (src.endsWith("index.ts") || src.endsWith("index.tsx")) continue;

  for (const dep of mod.dependencies || []) {
    const moduleName = dep.module || "";
    if (!moduleName.startsWith(".") && !moduleName.startsWith("src/")) {
      const parts = moduleName.split("/");
      const pkg = moduleName.startsWith("@") && parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : parts[0];

      if (!extMap.has(pkg)) extMap.set(pkg, new Set());
      extMap.get(pkg).add(resolveResponsibility(src));
    }
  }
}

const perPackage = {};
let totalSpread = 0;
let packageCount = 0;

for (const [pkg, units] of extMap) {
  perPackage[pkg] = {
    units: [...units].sort(),
    spread: units.size,
  };
  totalSpread += units.size;
  packageCount++;
}

const avgSpread = packageCount > 0
  ? Math.round((totalSpread / packageCount) * 100) / 100
  : 0;

const maxSpread = packageCount > 0
  ? Math.max(...[...extMap.values()].map((s) => s.size))
  : 0;

const result = {
  mode: responsibilities ? "responsibility" : "file",
  perPackage,
  avgSpread,
  maxSpread,
  packageCount,
};

console.log(JSON.stringify(result, null, 2));
