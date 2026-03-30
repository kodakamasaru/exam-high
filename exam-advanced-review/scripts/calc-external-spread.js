/**
 * dependency-cruiserの出力とADRモジュール定義から、
 * 外部パッケージのモジュール単位でのspreadを算出する。
 *
 * 「honoが3ファイルからimportされているが全部presentation層」→ spread=1（OK）
 * 「honoがpresentation層とservice層からimport」→ spread=2（レイヤー漏れ）
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

// モジュール定義がある場合はモジュール単位、なければファイル単位
let modules = null;
if (modulesFile && fs.existsSync(modulesFile)) {
  try {
    modules = JSON.parse(fs.readFileSync(modulesFile, "utf-8")).modules;
  } catch {}
}

function resolveModule(filePath) {
  if (!modules) return filePath;
  for (const mod of modules) {
    const modPath = mod.path.replace(/\/$/, "");
    if (modPath.includes("*")) {
      const suffix = modPath.replace(/^\*+\/?\*?/, "");
      if (filePath.endsWith(suffix)) return mod.name;
    } else {
      if (filePath.startsWith(modPath)) return mod.name;
    }
  }
  return filePath;
}

// パッケージごとにimport元のモジュール（or ファイル）を集計
const extMap = new Map();

for (const mod of depcruise.modules || []) {
  const src = mod.source;
  if (!src.startsWith("src/")) continue;

  for (const dep of mod.dependencies || []) {
    const moduleName = dep.module || "";
    if (!moduleName.startsWith(".") && !moduleName.startsWith("src/")) {
      const parts = moduleName.split("/");
      const pkg = moduleName.startsWith("@") && parts.length >= 2
        ? `${parts[0]}/${parts[1]}`
        : parts[0];

      if (!extMap.has(pkg)) extMap.set(pkg, new Set());
      extMap.get(pkg).add(resolveModule(src));
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
  mode: modules ? "module" : "file",
  perPackage,
  avgSpread,
  maxSpread,
  packageCount,
};

console.log(JSON.stringify(result, null, 2));
