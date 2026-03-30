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
// BE: 共通100 + 固有20 = 120 → 100に正規化
// FE: 共通100
const WEIGHTS = {
  // --- 共通軸（BE/FE同じポイント） ---
  // be_* と fe_* で同じ値を使う
  //   ファイル数: 20, 型カバレッジ: 20,
  //   責務数: 14, Biome: 14, ファイル長: 14,
  //   外部依存集中度: 6, 依存違反: 6,
  //   コード重複: 3, 認知的複雑度: 3

  // --- バックエンド（共通100 + 固有30 = 130 → 100正規化）---
  // 共通軸
  be_file_count:          20,
  be_type_coverage:       20,
  be_responsibility_count: 14,
  be_biome:               14,
  be_file_len:            14,
  be_dep_violation:        9,
  be_cognitive:            9,
  // BE固有軸（各5）
  be_ext_spread:           5,
  be_duplication:          5,
  be_perf_get:             5,
  be_perf_post:            5,
  be_concurrency:          5,
  be_security:             5,

  // --- フロントエンド（共通100）---
  fe_file_count:          20,
  fe_type_coverage:       20,
  fe_responsibility_count: 14,
  fe_biome:               14,
  fe_file_len:            14,
  fe_dep_violation:        9,
  fe_cognitive:            9,
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

// 型カバレッジ: 90-100%の線形。90%以下=0点
function typeCoverageToScore(percent) {
  if (percent >= 100) return 100;
  if (percent <= 90) return 0;
  return Math.round((percent - 90) / 10 * 100);
}


// ORM等の自動生成除外
const IGNORED_DIRS = ["node_modules", ".next", "dist", "generated", ".prisma", "drizzle", "migrations"];
const IGNORED_FILES = [/\.generated\./, /\.d\.ts$/, /\.config\./, /\.env/];
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
  let totalFunctions = 0, totalFunctionLines = 0, totalFileLines = 0, totalFiles = 0, maxFileLength = 0;
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
          if (lines.length > maxFileLength) maxFileLength = lines.length;
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
    maxFileLength,
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
const FRONTEND_APP = path.join(SUBMISSION_DIR, "frontend");

// ============================================================
// 全軸スコア算出（各100点満点）
// ============================================================

function calcAllScores() {
  const scores = {};
  const beStruct = countFunctions(BACKEND_SRC, [".ts"]);
  const beLines = countLines(BACKEND_SRC, [".ts"]);
  const feStruct = countFunctions(FRONTEND_APP, [".ts", ".tsx"]);
  const feLines = countLines(FRONTEND_APP, [".ts", ".tsx"]);

  // --- 共通スコア算出関数 ---
  function fileCountScore(n) {
    if (n <= 5) return 0;
    if (n >= 15) return 100;
    return Math.round((n - 5) / 10 * 100);
  }
  function responsibilityCountScore(n) {
    if (n <= 2) return 0;
    if (n >= 7) return 100;
    return Math.round((n - 2) / 5 * 100);
  }
  function fileLenScore(avg, max) {
    // 平均: 30以下=100, 80以上=0
    const avgS = avg <= 30 ? 100 : avg >= 80 ? 0 : Math.round((80 - avg) / 50 * 100);
    // 最大: 70以下=100, 120以上=0
    const maxS = max <= 70 ? 100 : max >= 120 ? 0 : Math.round((120 - max) / 50 * 100);
    return Math.min(avgS, maxS);
  }

  // --- バックエンド ---

  // ファイル数（5以下=0、5-15線形、15+=100）
  scores.be_file_count = fileCountScore(beStruct.totalFiles);

  // 型カバレッジ（非線形K=50）
  const typeCov = readJSON("type-coverage.json");
  scores.be_type_coverage = typeCov?.percent != null ? typeCoverageToScore(typeCov.percent) : 0;

  // 責務数（ADRテーブル行数。2以下=0、3-7線形）
  const beModules = readJSON("modules-backend.json");
  scores.be_responsibility_count = responsibilityCountScore(beModules?.modules?.length || 0);

  // Biome lint（1k行あたり違反数）
  const biomeBE = readJSON("biome-backend.json");
  const biomeBECount = biomeBE?.diagnostics?.length || 0;
  const biomeBEPer1k = beLines > 0 ? (biomeBECount / beLines) * 1000 : 0;
  scores.be_biome = clamp(100 - biomeBEPer1k * 5);

  // ファイル長（min(平均スコア, 最大スコア)）
  scores.be_file_len = fileLenScore(beStruct.avgFileLength, beStruct.maxFileLength || beStruct.avgFileLength);

  // 外部依存集中度（責務単位のavgSpread）
  const spread = readJSON("external-spread.json");
  scores.be_ext_spread = spread ? clamp(100 - (spread.avgSpread - 1.0) * 200) : 100;

  // 依存違反（循環依存 + 双方向依存の大きい方）
  const circular = readJSON("circular.json");
  const circularCount = circular && Array.isArray(circular) ? circular.length : 0;
  const adrDeps = readJSON("adr-deps.json");
  const bidirectionalCount = adrDeps?.bidirectionalCount || 0;
  scores.be_dep_violation = clamp(100 - Math.max(circularCount, bidirectionalCount) * 25);

  // コード重複（リテラル正規化後jscpd）
  const jscpdBE = readJSON("jscpd-backend.json");
  // コード重複: 0%=100, 10%以上=0, 線形
  const beDupPct = jscpdBE?.statistics?.total ? parseFloat(jscpdBE.statistics.total.percentage) : 0;
  scores.be_duplication = beDupPct <= 0 ? 100 : beDupPct >= 10 ? 0 : Math.round((10 - beDupPct) / 10 * 100);

  // 認知的複雑度
  const ccBE = extractCognitiveComplexity(readJSON("sonarjs-backend.json"));
  // 認知的複雑度: avg 1以下=100, 3以上=0, 線形
  scores.be_cognitive = ccBE.avg <= 1 ? 100 : ccBE.avg >= 3 ? 0 : Math.round((3 - ccBE.avg) / 2 * 100);

  // BE固有: GETパフォーマンス（比率ベース: 1k件 vs 50万件のp95比率）
  // ratio 3以下=100, 20以上=0, 線形
  const perfGet = readJSON("perf-get.json");
  const perfGetBaseline = readJSON("perf-get-baseline.json");
  if (perfGet?.p95 > 0 && perfGetBaseline?.p95 > 0) {
    const ratio = perfGet.p95 / perfGetBaseline.p95;
    scores.be_perf_get = ratio <= 3 ? 100 : ratio >= 20 ? 0 : Math.round((20 - ratio) / 17 * 100);
  } else {
    scores.be_perf_get = 0;
  }

  // BE固有: POSTパフォーマンス（比率ベース: 1k件 vs 50万件のp95比率）
  // ratio 3以下=100, 20以上=0, 線形
  const perfPost = readJSON("perf-post.json");
  const perfPostBaseline = readJSON("perf-post-baseline.json");
  if (perfPost?.p95 > 0 && perfPostBaseline?.p95 > 0) {
    const ratio = perfPost.p95 / perfPostBaseline.p95;
    scores.be_perf_post = ratio <= 3 ? 100 : ratio >= 20 ? 0 : Math.round((20 - ratio) / 17 * 100);
  } else {
    scores.be_perf_post = 0;
  }

  // BE固有: ダブルブッキング防止
  const cc = readJSON("concurrency.json");
  scores.be_concurrency = cc?.isCorrect ? 100 : 0;

  // BE固有: セキュリティ
  const security = readJSON("security.json");
  if (security?.findings && beLines > 0) {
    let crit = 0, high = 0;
    for (const f of security.findings) { const s = (f.severity || "").toLowerCase(); if (s === "critical") crit++; else if (s === "high") high++; }
    scores.be_security = clamp(100 - (crit / beLines * 1000) * 50 - (high / beLines * 1000) * 25);
  } else {
    scores.be_security = 100;
  }

  // --- フロントエンド ---

  // ファイル数
  scores.fe_file_count = fileCountScore(feStruct.totalFiles);

  // 型カバレッジ（.tsのみ）
  const feTypeCov = readJSON("frontend-type-coverage.json");
  scores.fe_type_coverage = feTypeCov?.percent != null && feTypeCov.percent > 0 ? typeCoverageToScore(feTypeCov.percent) : 0;

  // 責務数
  const feModules = readJSON("modules-frontend.json");
  scores.fe_responsibility_count = responsibilityCountScore(feModules?.modules?.length || 0);

  // Biome lint
  const biomeFE = readJSON("biome-frontend.json");
  const biomeFECount = biomeFE?.diagnostics?.length || 0;
  const biomeFEPer1k = feLines > 0 ? (biomeFECount / feLines) * 1000 : 0;
  scores.fe_biome = clamp(100 - biomeFEPer1k * 5);

  // ファイル長
  scores.fe_file_len = fileLenScore(feStruct.avgFileLength, feStruct.maxFileLength || feStruct.avgFileLength);

  // 依存違反
  const feCircular = readJSON("frontend-circular.json");
  const feCircularCount = feCircular && Array.isArray(feCircular) ? feCircular.length : 0;
  const feDeps = readJSON("frontend-deps.json");
  const feBidirectionalCount = feDeps?.bidirectionalCount || 0;
  scores.fe_dep_violation = clamp(100 - Math.max(feCircularCount, feBidirectionalCount) * 25);

  // 認知的複雑度
  const ccFE = extractCognitiveComplexity(readJSON("sonarjs-frontend.json"));
  // 認知的複雑度: avg 1以下=100, 3以上=0, 線形
  scores.fe_cognitive = ccFE.avg <= 1 ? 100 : ccFE.avg >= 3 ? 0 : Math.round((3 - ccFE.avg) / 2 * 100);

  return scores;
}

// ============================================================
// 出力
// ============================================================

const scores = calcAllScores();

const beKeys = Object.keys(WEIGHTS).filter(k => k.startsWith("be_"));
const feKeys = Object.keys(WEIGHTS).filter(k => k.startsWith("fe_"));

// BE/FE別の加重合計
let beWeighted = 0, beTotal = 0, feWeighted = 0, feTotal = 0;
for (const k of beKeys) { beWeighted += (scores[k] || 0) * WEIGHTS[k]; beTotal += WEIGHTS[k]; }
for (const k of feKeys) { feWeighted += (scores[k] || 0) * WEIGHTS[k]; feTotal += WEIGHTS[k]; }

const beRaw = Math.round(beWeighted / 100 * 10) / 10;       // 加重得点（130点満点）
const beNormalized = Math.round(beWeighted / beTotal * 100) / 100; // 100点換算
const feRaw = Math.round(feWeighted / 100 * 10) / 10;       // 加重得点（100点満点）
const feNormalized = Math.round(feWeighted / feTotal * 100) / 100; // 100点換算
const finalScore = Math.round((beNormalized + feNormalized) / 2 * 100) / 100;

// 軸名の表示ラベル
const LABELS = {
  file_count: "ファイル数", type_coverage: "型カバレッジ",
  responsibility_count: "責務数", biome: "Biome lint",
  file_len: "ファイル長", dep_violation: "依存違反",
  cognitive: "認知的複雑度", ext_spread: "外部依存集中度",
  duplication: "コード重複", perf_get: "GETパフォーマンス",
  perf_post: "POSTパフォーマンス", concurrency: "ダブルブッキング防止",
  security: "セキュリティ",
};
function label(k) { return LABELS[k.replace(/^(be|fe)_/, "")] || k; }

// --- Markdown生成 ---
const md = [];
md.push("# 採点結果\n");

md.push("## Backend\n");
md.push("| 軸 | スコア | ウェイト | 加重点 |");
md.push("|---|---:|---:|---:|");
for (const k of beKeys) {
  const s = Math.round(scores[k] * 10) / 10;
  const w = WEIGHTS[k];
  md.push(`| ${label(k)} | ${s} | ${w} | ${Math.round(s * w / 100 * 10) / 10} |`);
}
md.push(`| **小計** | | **${beTotal}** | **${beRaw}** |`);
md.push(`| **100点換算** | | | **${beNormalized}** |`);

md.push("\n## Frontend\n");
md.push("| 軸 | スコア | ウェイト | 加重点 |");
md.push("|---|---:|---:|---:|");
for (const k of feKeys) {
  const s = Math.round(scores[k] * 10) / 10;
  const w = WEIGHTS[k];
  md.push(`| ${label(k)} | ${s} | ${w} | ${Math.round(s * w / 100 * 10) / 10} |`);
}
md.push(`| **小計** | | **${feTotal}** | **${feRaw}** |`);

md.push("\n## 総合\n");
md.push("| | 点数 |");
md.push("|---|---:|");
md.push(`| BE（${beTotal}点満点） | ${beRaw} |`);
md.push(`| BE（100点換算） | ${beNormalized} |`);
md.push(`| FE（100点満点） | ${feNormalized} |`);
md.push(`| **最終スコア（BE+FE平均）** | **${finalScore}** |`);

const mdText = md.join("\n") + "\n";
console.log(mdText);

// --- JSON出力 ---
const result = {
  scores: Object.fromEntries(Object.entries(scores).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  weights: WEIGHTS,
  be: { raw: beRaw, maxPoints: beTotal, normalized: beNormalized },
  fe: { raw: feRaw, maxPoints: feTotal, normalized: feNormalized },
  finalScore,
};

fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(path.join(REPORTS_DIR, "score.json"), JSON.stringify(result, null, 2));
fs.writeFileSync(path.join(REPORTS_DIR, "score.md"), mdText);
