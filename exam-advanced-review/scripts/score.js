/**
 * 全 reports/*.json を読み込み、各軸100点満点でスコアを算出し、
 * 最後にウェイトをかけて合算する。
 */

const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "..", "reports");

const WEIGHTS = {
  backend: {
    architecture: 0.15,
    typeSafety: 0.12,
    codeQuality: 0.08,
    codeStructure: 0.08,
    cognitiveComplexity: 0.04,
    duplication: 0.05,
    security: 0.05,
    performance: 0.07,
  },
  frontend: {
    typeSafety: 0.08,
    codeQuality: 0.08,
    codeStructure: 0.08,
    cognitiveComplexity: 0.04,
    duplication: 0.05,
    deps: 0.03,
    lighthouse: 0.03,
  },
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

/** 型カバレッジ%→非線形スコア（二次関数 K=30） */
function typeCoverageToScore(percent) {
  const distance = (100 - percent) / 10;
  return clamp(100 - distance * distance * 30);
}

/** ESLint JSON出力からerror/warning数を集計 */
function countLintIssues(data) {
  if (!data || !Array.isArray(data)) return { errors: 0, warnings: 0 };
  let errors = 0, warnings = 0;
  for (const file of data) {
    errors += file.errorCount || 0;
    warnings += file.warningCount || 0;
  }
  return { errors, warnings };
}

/** ESLint JSON出力からerror/warning数を1k行あたりに変換 */
function lintPer1k(data, totalLines) {
  const { errors, warnings } = countLintIssues(data);
  if (totalLines <= 0) return { errorsPer1k: 0, warningsPer1k: 0 };
  return {
    errorsPer1k: Math.round((errors / totalLines) * 1000 * 100) / 100,
    warningsPer1k: Math.round((warnings / totalLines) * 1000 * 100) / 100,
  };
}

/** ファイル群の総行数をカウント */
function countLines(dir, extensions) {
  let total = 0;
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
          walk(fullPath);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          total += fs.readFileSync(fullPath, "utf-8").split("\n").length;
        }
      }
    } catch {}
  }
  walk(dir);
  return total;
}

/** ファイル数をカウント */
function countFiles(dir, extensions) {
  let total = 0;
  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
          walk(fullPath);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          total++;
        }
      }
    } catch {}
  }
  walk(dir);
  return total;
}

/** 関数の長さ・数をカウント（簡易版） */
function countFunctions(dir, extensions) {
  let totalFunctions = 0;
  let totalFunctionLines = 0;
  let totalFileLines = 0;
  let totalFiles = 0;

  function walk(d) {
    try {
      const entries = fs.readdirSync(d, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(d, entry.name);
        if (entry.isDirectory()) {
          if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
          walk(fullPath);
        } else if (extensions.some((ext) => entry.name.endsWith(ext))) {
          const content = fs.readFileSync(fullPath, "utf-8");
          const lines = content.split("\n");
          totalFileLines += lines.length;
          totalFiles++;

          const funcPatterns = [
            /^(?:export\s+)?(?:async\s+)?function\s+\w+/,
            /^(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\(/,
            /^(?:export\s+)?const\s+\w+\s*=\s*(?:async\s+)?\w+\s*=>/,
            /^\s+(?:async\s+)?\w+\s*\([^)]*\)\s*(?::\s*\w+)?\s*\{/,
          ];

          let braceDepth = 0, inFunction = false, funcStartLine = 0;
          for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!inFunction) {
              for (const pattern of funcPatterns) {
                if (pattern.test(trimmed)) { inFunction = true; funcStartLine = i; braceDepth = 0; break; }
              }
            }
            if (inFunction) {
              for (const ch of lines[i]) { if (ch === "{") braceDepth++; if (ch === "}") braceDepth--; }
              if (braceDepth <= 0 && i > funcStartLine) {
                totalFunctions++;
                totalFunctionLines += i - funcStartLine + 1;
                inFunction = false;
              }
            }
          }
        }
      }
    } catch {}
  }
  walk(dir);

  return {
    totalFiles,
    totalFunctions,
    totalLines: totalFileLines,
    avgFunctionLength: totalFunctions > 0 ? Math.round(totalFunctionLines / totalFunctions) : 0,
    avgFileLength: totalFiles > 0 ? Math.round(totalFileLines / totalFiles) : 0,
  };
}

/** sonarjs出力から認知的複雑度を抽出 */
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
  const total = complexities.reduce((a, b) => a + b, 0);
  return {
    avg: Math.round((total / complexities.length) * 100) / 100,
    max: Math.max(...complexities),
  };
}

/** Lighthouse結果ディレクトリからスコア抽出 */
function extractLighthouse() {
  const dir = path.join(REPORTS_DIR, "lighthouse-raw");
  if (!fs.existsSync(dir)) return { performance: 0, accessibility: 0 };
  const files = fs.readdirSync(dir).filter((f) => f.endsWith(".json"));
  const scores = { performance: [], accessibility: [] };
  for (const file of files) {
    try {
      const data = JSON.parse(fs.readFileSync(path.join(dir, file), "utf-8"));
      const cats = data.categories || {};
      if (cats.performance) scores.performance.push(Math.round(cats.performance.score * 100));
      if (cats.accessibility) scores.accessibility.push(Math.round(cats.accessibility.score * 100));
    } catch {}
  }
  function median(arr) { const s = [...arr].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 !== 0 ? s[m] : (s[m - 1] + s[m]) / 2; }
  return {
    performance: scores.performance.length > 0 ? median(scores.performance) : 0,
    accessibility: scores.accessibility.length > 0 ? median(scores.accessibility) : 0,
  };
}

// ============================================================
// サブミッションパス（Makefileから環境変数で受け取る or デフォルト）
// ============================================================
const SUBMISSION_DIR = process.env.SUBMISSION_DIR || path.join(__dirname, "..", "..", "exam-advanced");
const BACKEND_SRC = path.join(SUBMISSION_DIR, "backend", "src");
const FRONTEND_APP = path.join(SUBMISSION_DIR, "frontend", "app");

// ============================================================
// バックエンド採点
// ============================================================

function scoreBackendArchitecture() {
  let violationScore = 100;
  const circular = readJSON("circular.json");
  if (circular && Array.isArray(circular)) violationScore -= circular.length * 25;
  const adrDeps = readJSON("adr-deps.json");
  if (adrDeps) violationScore -= (adrDeps.bidirectionalCount || 0) * 25;
  violationScore = clamp(violationScore);

  let spreadScore = 100;
  const spread = readJSON("external-spread.json");
  if (spread) spreadScore = clamp(100 - (spread.avgSpread - 1.0) * 60);

  const structure = countFunctions(BACKEND_SRC, [".ts"]);
  const fileScore = clamp(structure.totalFiles / 16 * 100);
  const funcScore = clamp(structure.totalFunctions / 22 * 100);
  const splitScore = (fileScore + funcScore) / 2;

  return clamp(violationScore * 0.4 + spreadScore * 0.3 + splitScore * 0.3);
}

function scoreBackendTypeSafety() {
  let score = 0;
  const coverage = readJSON("type-coverage.json");
  if (coverage && coverage.percent != null) score = typeCoverageToScore(coverage.percent);
  // type-lint違反はESLint出力から直接計算
  const typeLint = readJSON("type-lint.json");
  const lines = countLines(BACKEND_SRC, [".ts"]);
  const { errorsPer1k } = lintPer1k(typeLint, lines);
  score -= errorsPer1k * 5;
  return clamp(score);
}

function scoreBackendCodeQuality() {
  const lint = readJSON("lint.json");
  const lines = countLines(BACKEND_SRC, [".ts"]);
  const { errorsPer1k, warningsPer1k } = lintPer1k(lint, lines);
  return clamp(100 - errorsPer1k * 10 - warningsPer1k * 3);
}

function scoreBackendCodeStructure() {
  const s = countFunctions(BACKEND_SRC, [".ts"]);
  let score = 0;
  if (s.avgFunctionLength > 0) score += clamp(1000 / s.avgFunctionLength);
  if (s.avgFileLength > 0) score += clamp(5000 / s.avgFileLength);
  return clamp(score / 2);
}

function scoreBackendCognitiveComplexity() {
  const data = readJSON("sonarjs-backend.json");
  const cc = extractCognitiveComplexity(data);
  let score = 100 - cc.avg * 5;
  if (cc.max > 10) score -= (cc.max - 10) * 3;
  return clamp(score);
}

function scoreBackendDuplication() {
  const jscpd = readJSON("jscpd-backend.json");
  if (jscpd && jscpd.statistics && jscpd.statistics.total) {
    return clamp(100 - parseFloat(jscpd.statistics.total.percentage) * 10);
  }
  return 100;
}

function scoreBackendSecurity() {
  const security = readJSON("security.json");
  const lines = countLines(BACKEND_SRC, [".ts"]);
  if (!security || !security.findings || lines <= 0) return 100;
  let critical = 0, high = 0;
  for (const f of security.findings) {
    const sev = (f.severity || "").toLowerCase();
    if (sev === "critical") critical++;
    else if (sev === "high") high++;
  }
  const critPer1k = (critical / lines) * 1000;
  const highPer1k = (high / lines) * 1000;
  return clamp(100 - critPer1k * 50 - highPer1k * 25);
}

function scoreBackendPerformance() {
  const perf = readJSON("perf.json");
  if (perf && perf.metrics) {
    const p95 = perf.metrics.http_req_duration?.["p(95)"];
    if (p95 && p95 > 0) return clamp(5000 / p95);
  }
  return 0;
}

// ============================================================
// フロントエンド採点
// ============================================================

function scoreFrontendTypeSafety() {
  const coverage = readJSON("frontend-type-coverage.json");
  if (coverage && coverage.percent != null && coverage.percent > 0) {
    return typeCoverageToScore(coverage.percent);
  }
  return 0; // .tsファイルなし→0点
}

function scoreFrontendCodeQuality() {
  const lint = readJSON("frontend-lint.json");
  const lines = countLines(FRONTEND_APP, [".ts", ".tsx"]);
  const { errorsPer1k, warningsPer1k } = lintPer1k(lint, lines);
  return clamp(100 - errorsPer1k * 10 - warningsPer1k * 3);
}

function scoreFrontendCodeStructure() {
  const s = countFunctions(FRONTEND_APP, [".ts", ".tsx"]);
  let score = 0;
  if (s.avgFunctionLength > 0) score += clamp(1000 / s.avgFunctionLength);
  if (s.avgFileLength > 0) score += clamp(5000 / s.avgFileLength);
  return clamp(score / 2);
}

function scoreFrontendCognitiveComplexity() {
  const data = readJSON("sonarjs-frontend.json");
  const cc = extractCognitiveComplexity(data);
  let score = 100 - cc.avg * 5;
  if (cc.max > 10) score -= (cc.max - 10) * 3;
  return clamp(score);
}

function scoreFrontendDuplication() {
  const jscpd = readJSON("jscpd-frontend.json");
  if (jscpd && jscpd.statistics && jscpd.statistics.total) {
    return clamp(100 - parseFloat(jscpd.statistics.total.percentage) * 10);
  }
  return 100;
}

function scoreFrontendDeps() {
  let score = 100;
  const deps = readJSON("frontend-deps.json");
  if (deps) score -= (deps.bidirectionalCount || 0) * 15;
  const circular = readJSON("frontend-circular.json");
  if (circular && Array.isArray(circular)) score -= circular.length * 15;
  return clamp(score);
}

function scoreFrontendLighthouse() {
  const lh = extractLighthouse();
  return clamp((lh.performance || 0) * 0.6 + (lh.accessibility || 0) * 0.4);
}

// ============================================================
// 合算
// ============================================================

console.log("=== Backend Scores (each /100) ===");
const backend = {
  architecture: scoreBackendArchitecture(),
  typeSafety: scoreBackendTypeSafety(),
  codeQuality: scoreBackendCodeQuality(),
  codeStructure: scoreBackendCodeStructure(),
  cognitiveComplexity: scoreBackendCognitiveComplexity(),
  duplication: scoreBackendDuplication(),
  security: scoreBackendSecurity(),
  performance: scoreBackendPerformance(),
};
for (const [k, v] of Object.entries(backend)) {
  console.log(`  ${k}: ${Math.round(v)}/100 (weight: ${WEIGHTS.backend[k]})`);
}

console.log("\n=== Frontend Scores (each /100) ===");
const frontend = {
  typeSafety: scoreFrontendTypeSafety(),
  codeQuality: scoreFrontendCodeQuality(),
  codeStructure: scoreFrontendCodeStructure(),
  cognitiveComplexity: scoreFrontendCognitiveComplexity(),
  duplication: scoreFrontendDuplication(),
  deps: scoreFrontendDeps(),
  lighthouse: scoreFrontendLighthouse(),
};
for (const [k, v] of Object.entries(frontend)) {
  console.log(`  ${k}: ${Math.round(v)}/100 (weight: ${WEIGHTS.frontend[k]})`);
}

let weightedTotal = 0, totalWeight = 0;
for (const [k, v] of Object.entries(backend)) {
  weightedTotal += v * WEIGHTS.backend[k];
  totalWeight += WEIGHTS.backend[k];
}
for (const [k, v] of Object.entries(frontend)) {
  weightedTotal += v * WEIGHTS.frontend[k];
  totalWeight += WEIGHTS.frontend[k];
}

const finalScore = Math.round(weightedTotal / totalWeight * 100) / 100;

const result = {
  backend: Object.fromEntries(Object.entries(backend).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  frontend: Object.fromEntries(Object.entries(frontend).map(([k, v]) => [k, Math.round(v * 10) / 10])),
  weights: WEIGHTS,
  finalScore,
};

console.log(`\n=== Final Score: ${finalScore}/100 ===`);
console.log(JSON.stringify(result, null, 2));

const outputPath = path.join(REPORTS_DIR, "score.json");
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
