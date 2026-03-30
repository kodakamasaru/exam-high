/**
 * 全 reports/*.json を読み込み、各軸100点満点でスコアを算出し、
 * 最後にウェイトをかけて合算する。
 *
 * 全軸独立。内部での加重平均なし。
 */

const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "..", "reports");

// ============================================================
// ウェイト（全軸独立。合計の相対比率）
// ============================================================
const WEIGHTS = {
  // --- バックエンド ---
  // アーキテクチャ系
  be_dep_violation:   0.06,   // 依存違反（循環依存 + 双方向依存の合計）
  be_ext_spread:      0.04,   // 外部依存集中度
  be_file_count:      0.04,   // ファイル数（分割度）
  be_func_count:      0.04,   // 関数数（分割度）
  // 型安全性系
  be_type_coverage:   0.10,   // 型カバレッジ
  // コード品質
  be_biome:           0.06,   // Biome lint（recommended）
  // コード構造系
  be_avg_func_len:    0.04,   // 平均関数長
  be_avg_file_len:    0.04,   // 平均ファイル長
  // その他
  be_cognitive:       0.03,   // 認知的複雑度
  be_duplication:     0.04,   // コード重複
  be_security:        0.03,   // セキュリティ
  be_perf_get:        0.04,   // GETパフォーマンス
  be_perf_post:       0.04,   // POSTパフォーマンス
  be_concurrency:     0.04,   // ダブルブッキング防止

  // --- フロントエンド ---
  fe_file_count:      0.04,   // ファイル数（分割度）
  fe_func_count:      0.04,   // 関数数（分割度）
  fe_type_coverage:   0.06,   // 型カバレッジ（.tsのみ）
  fe_biome:           0.06,   // Biome lint（recommended）
  fe_avg_func_len:    0.04,   // 平均関数長
  fe_avg_file_len:    0.04,   // 平均ファイル長
  fe_cognitive:       0.03,   // 認知的複雑度
  fe_duplication:     0.04,   // コード重複
  fe_dep_violation:   0.04,   // 依存違反（循環依存 + 双方向依存の合計）
};

// ============================================================
// ヘルパー
// ============================================================

function readJSON(filename) {
  const filepath = path.join(REPORTS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`  [skip] ${filename} not found`);
    return null;
  }
  try {
    return JSON.parse(fs.readFileSync(filepath, "utf-8"));
  } catch {
    console.warn(`  [error] ${filename} is not valid JSON`);
    return null;
  }
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}

function typeCoverageToScore(percent) {
  const distance = (100 - percent) / 10;
  return clamp(100 - distance * distance * 30);
}


// ORM等の自動生成除外
const IGNORED_DIRS = ["node_modules", ".next", "dist", "generated", ".prisma", "drizzle", "migrations"];
const IGNORED_FILES = [/\.generated\./, /\.d\.ts$/];
function isIgnored(name) { return IGNORED_DIRS.includes(name); }
function isIgnoredFile(name) { return IGNORED_FILES.some((p) => p.test(name)); }

function countLines(dir, extensions) {
  let total = 0;
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) { if (isIgnored(entry.name)) continue; walk(fullPath); }
        else if (extensions.some((ext) => entry.name.endsWith(ext)) && !isIgnoredFile(entry.name)) {
          total += fs.readFileSync(fullPath, "utf-8").split("\n").length;
        }
      }
    } catch {}
  }
  walk(dir);
  return total;
}

function countFunctions(dir, extensions) {
  let totalFunctions = 0, totalFunctionLines = 0, totalFileLines = 0, totalFiles = 0;
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) { if (isIgnored(entry.name)) continue; walk(fullPath); }
        else if (extensions.some((ext) => entry.name.endsWith(ext)) && !isIgnoredFile(entry.name)) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          totalFileLines += lines.length; totalFiles++;
          const funcPatterns = [
            /^(?:export\s+)?(?:async\s+)?function\s+\w+/,
            /^(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\(/,
            /^(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\w+\s*=>/,
            /^\s+(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/,
          ];
          let braceDepth = 0, inFunction = false, funcStartLine = 0;
          for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!inFunction) { for (const p of funcPatterns) { if (p.test(trimmed)) { inFunction = true; funcStartLine = i; braceDepth = 0; break; } } }
            if (inFunction) {
              for (const ch of lines[i]) { if (ch === "{") braceDepth++; if (ch === "}") braceDepth--; }
              if (braceDepth <= 0 && i > funcStartLine) { totalFunctions++; totalFunctionLines += i - funcStartLine + 1; inFunction = false; }
            }
          }
        }
      }
    } catch {}
  }
  walk(dir);
  return {
    totalFiles, totalFunctions, totalLines: totalFileLines,
    avgFunctionLength: totalFunctions > 0 ? Math.round(totalFunctionLines / totalFunctions) : 0,
    avgFileLength: totalFiles > 0 ? Math.round(totalFileLines / totalFiles) : 0,
  };
}

function extractCognitiveComplexity(data) {
  if (!data || !Array.isArray(data)) return { avg: 0, max: 0 };
  const complexities = [];
  for (const file of data) {
    for (const msg of file.messages || []) {
      if (msg.ruleId === "sonarjs/cognitive-complexity") {
        const match = msg.message.match(/from (\d+) to/);
        if (match) complexities.push(parseInt(match[1], 10));
      }
    }
  }
  if (complexities.length === 0) return { avg: 0, max: 0 };
  return {
    avg: Math.round((complexities.reduce((a, b) => a + b, 0) / complexities.length) * 100) / 100,
    max: Math.max(...complexities),
  };
}

// ============================================================
// パス
// ============================================================
const SUBMISSION_DIR = process.env.SUBMISSION_DIR || path.join(__dirname, "..", "..", "exam-advanced");
const BACKEND_SRC = path.join(SUBMISSION_DIR, "backend", "src");
const FRONTEND_APP = path.join(SUBMISSION_DIR, "frontend", "app");

// ============================================================
// 全軸スコア算出（各100点満点）
// ============================================================

function calcAllScores() {
  const scores = {};
  const beStruct = countFunctions(BACKEND_SRC, [".ts"]);
  const beLines = countLines(BACKEND_SRC, [".ts"]);
  const feStruct = countFunctions(FRONTEND_APP, [".ts", ".tsx"]);
  const feLines = countLines(FRONTEND_APP, [".ts", ".tsx"]);

  // --- バックエンド ---

  // 依存違反（循環依存 + 双方向依存。重複検出は大きい方で取る）
  const circular = readJSON("circular.json");
  const circularCount = circular && Array.isArray(circular) ? circular.length : 0;
  const adrDeps = readJSON("adr-deps.json");
  const bidirectionalCount = adrDeps?.bidirectionalCount || 0;
  const depViolations = Math.max(circularCount, bidirectionalCount);
  scores.be_dep_violation = clamp(100 - depViolations * 25);

  // 外部依存集中度
  const spread = readJSON("external-spread.json");
  // モジュール単位のspread。1.0=100, 2.0=50, 3.0=0
  scores.be_ext_spread = spread ? clamp(100 - (spread.avgSpread - 1.0) * 50) : 100;

  // ファイル数
  scores.be_file_count = clamp(beStruct.totalFiles / 10 * 100);

  // 関数数
  scores.be_func_count = clamp(beStruct.totalFunctions / 15 * 100);

  // 型カバレッジ
  const typeCov = readJSON("type-coverage.json");
  scores.be_type_coverage = typeCov?.percent != null ? typeCoverageToScore(typeCov.percent) : 0;

  // Biome lint
  const biomeBE = readJSON("biome-backend.json");
  const biomeBECount = biomeBE?.diagnostics?.length || 0;
  const biomeBEPer1k = beLines > 0 ? (biomeBECount / beLines) * 1000 : 0;
  scores.be_biome = clamp(100 - biomeBEPer1k * 5);

  // 平均関数長
  scores.be_avg_func_len = beStruct.avgFunctionLength > 0 ? clamp(1000 / beStruct.avgFunctionLength) : 100;

  // 平均ファイル長
  scores.be_avg_file_len = beStruct.avgFileLength > 0 ? clamp(5000 / beStruct.avgFileLength) : 100;

  // 認知的複雑度
  const ccBE = extractCognitiveComplexity(readJSON("sonarjs-backend.json"));
  scores.be_cognitive = clamp(100 - ccBE.avg * 5 - (ccBE.max > 10 ? (ccBE.max - 10) * 3 : 0));

  // コード重複
  const jscpdBE = readJSON("jscpd-backend.json");
  scores.be_duplication = jscpdBE?.statistics?.total ? clamp(100 - parseFloat(jscpdBE.statistics.total.percentage) * 5) : 100;

  // セキュリティ
  const security = readJSON("security.json");
  if (security?.findings && beLines > 0) {
    let crit = 0, high = 0;
    for (const f of security.findings) { const s = (f.severity || "").toLowerCase(); if (s === "critical") crit++; else if (s === "high") high++; }
    scores.be_security = clamp(100 - (crit / beLines * 1000) * 50 - (high / beLines * 1000) * 25);
  } else {
    scores.be_security = 100;
  }

  // GETパフォーマンス
  const perfGet = readJSON("perf-get.json");
  scores.be_perf_get = perfGet?.p95 > 0 ? clamp(5000 / perfGet.p95) : 0;

  // POSTパフォーマンス
  const perfPost = readJSON("perf-post.json");
  scores.be_perf_post = perfPost?.p95 > 0 ? clamp(5000 / perfPost.p95) : 0;

  // ダブルブッキング防止
  const cc = readJSON("concurrency.json");
  scores.be_concurrency = cc?.isCorrect ? 100 : 0;

  // --- フロントエンド ---

  // ファイル数
  scores.fe_file_count = clamp(feStruct.totalFiles / 10 * 100);

  // 関数数
  scores.fe_func_count = clamp(feStruct.totalFunctions / 15 * 100);

  // 型カバレッジ（.tsのみ）
  const feTypeCov = readJSON("frontend-type-coverage.json");
  scores.fe_type_coverage = feTypeCov?.percent != null && feTypeCov.percent > 0 ? typeCoverageToScore(feTypeCov.percent) : 0;

  // Biome lint
  const biomeFE = readJSON("biome-frontend.json");
  const biomeFECount = biomeFE?.diagnostics?.length || 0;
  const biomeFEPer1k = feLines > 0 ? (biomeFECount / feLines) * 1000 : 0;
  scores.fe_biome = clamp(100 - biomeFEPer1k * 5);

  // 平均関数長
  scores.fe_avg_func_len = feStruct.avgFunctionLength > 0 ? clamp(1000 / feStruct.avgFunctionLength) : 100;

  // 平均ファイル長
  scores.fe_avg_file_len = feStruct.avgFileLength > 0 ? clamp(5000 / feStruct.avgFileLength) : 100;

  // 認知的複雑度
  const ccFE = extractCognitiveComplexity(readJSON("sonarjs-frontend.json"));
  scores.fe_cognitive = clamp(100 - ccFE.avg * 5 - (ccFE.max > 10 ? (ccFE.max - 10) * 3 : 0));

  // コード重複
  const jscpdFE = readJSON("jscpd-frontend.json");
  scores.fe_duplication = jscpdFE?.statistics?.total ? clamp(100 - parseFloat(jscpdFE.statistics.total.percentage) * 5) : 100;

  // 外部依存集中度
  const feSpread = readJSON("frontend-external-spread.json");
  scores.fe_ext_spread = feSpread ? clamp(100 - (feSpread.avgSpread - 1.0) * 50) : 100;

  // 依存違反（循環依存 + 双方向依存）
  const feCircular = readJSON("frontend-circular.json");
  const feCircularCount = feCircular && Array.isArray(feCircular) ? feCircular.length : 0;
  const feDeps = readJSON("frontend-deps.json");
  const feBidirectionalCount = feDeps?.bidirectionalCount || 0;
  scores.fe_dep_violation = clamp(100 - Math.max(feCircularCount, feBidirectionalCount) * 25);

  return scores;
}

// ============================================================
// 出力
// ============================================================

const scores = calcAllScores();

console.log("=== All Scores (each /100) ===\n");

// バックエンド
console.log("Backend:");
const beKeys = Object.keys(WEIGHTS).filter(k => k.startsWith("be_"));
for (const k of beKeys) {
  console.log(`  ${k}: ${Math.round(scores[k])}/100 (weight: ${WEIGHTS[k]})`);
}

// フロントエンド
console.log("\nFrontend:");
const feKeys = Object.keys(WEIGHTS).filter(k => k.startsWith("fe_"));
for (const k of feKeys) {
  console.log(`  ${k}: ${Math.round(scores[k])}/100 (weight: ${WEIGHTS[k]})`);
}

// 加重平均
let weightedTotal = 0, totalWeight = 0;
for (const [k, w] of Object.entries(WEIGHTS)) {
  weightedTotal += (scores[k] || 0) * w;
  totalWeight += w;
}
const finalScore = Math.round(weightedTotal / totalWeight * 100) / 100;

console.log(`\n=== Final Score: ${finalScore}/100 ===`);

const result = {
  scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  weights: WEIGHTS,
  finalScore,
};

console.log(JSON.stringify(result, null, 2));

const outputPath = path.join(REPORTS_DIR, "score.json");
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
