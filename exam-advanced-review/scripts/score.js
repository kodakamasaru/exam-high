/**
 * 全 reports/*.json を読み込み、ウェイトを掛けて合算し score.json を出力する。
 *
 * TODO: 配点の具体値は未確定。仮値で実装。
 */

const fs = require("fs");
const path = require("path");

const REPORTS_DIR = path.join(__dirname, "..", "reports");

function readJSON(filename) {
  const filepath = path.join(REPORTS_DIR, filename);
  if (!fs.existsSync(filepath)) {
    console.warn(`Warning: ${filename} not found, skipping`);
    return null;
  }
  return JSON.parse(fs.readFileSync(filepath, "utf-8"));
}

// --- バックエンド採点 ---

function scoreArchitecture() {
  const circular = readJSON("circular.json");
  const adrDeps = readJSON("adr-deps.json");

  let score = 30; // MAX

  if (circular) {
    score -= circular.length * 3; // 循環依存1件ごとに-3
  }
  if (adrDeps) {
    score -= (adrDeps.moduleCycles || 0) * 5;
    score -= (adrDeps.bidirectionalPairs || 0) * 5;
  }

  return Math.max(0, score);
}

function scoreTypeSafety() {
  const coverage = readJSON("type-coverage.json");
  const typeLint = readJSON("type-lint.json");

  let score = 0;

  if (coverage) {
    score += coverage.percent * 0.25; // 100% → 25点
  }

  if (typeLint) {
    const totalErrors = typeLint.reduce((sum, f) => sum + f.errorCount, 0);
    score -= totalErrors * 0.5;
  }

  return Math.max(0, Math.min(25, score));
}

function scoreCodeQuality() {
  const lint = readJSON("lint.json");
  let score = 15;

  if (lint) {
    const totalErrors = lint.reduce((sum, f) => sum + f.errorCount, 0);
    const totalWarnings = lint.reduce((sum, f) => sum + f.warningCount, 0);
    score -= totalErrors * 1;
    score -= totalWarnings * 0.3;
  }

  return Math.max(0, score);
}

function scoreDuplication() {
  const jscpd = readJSON("jscpd-backend.json");
  let score = 10;

  if (jscpd && jscpd.statistics && jscpd.statistics.total) {
    const pct = parseFloat(jscpd.statistics.total.percentage);
    score -= pct * 2; // 5% → -10
  }

  return Math.max(0, score);
}

function scoreSecurity() {
  const security = readJSON("security.json");
  let score = 10;

  if (security && security.findings) {
    for (const finding of security.findings) {
      if (finding.severity === "critical") score -= 5;
      else if (finding.severity === "high") score -= 3;
      else if (finding.severity === "medium") score -= 1;
    }
  }

  return Math.max(0, score);
}

function scorePerformance() {
  const perf = readJSON("perf.json");
  let score = 0;

  if (perf && perf.metrics) {
    const p95 = perf.metrics.http_req_duration?.["p(95)"];
    if (p95 && p95 > 0) {
      score = Math.min(10, 2000 / p95); // p95=200ms → 10点, p95=2000ms → 1点
    }
  }

  return Math.max(0, score);
}

// --- フロントエンド採点 ---
// TODO: 実装

function scoreFrontend() {
  // 仮実装: 各軸の合算
  return 0; // TODO
}

// --- 合算 ---

const backend = {
  architecture: scoreArchitecture(),
  typeSafety: scoreTypeSafety(),
  codeQuality: scoreCodeQuality(),
  duplication: scoreDuplication(),
  security: scoreSecurity(),
  performance: scorePerformance(),
};

const backendTotal = Object.values(backend).reduce((a, b) => a + b, 0);

const result = {
  backend,
  backendTotal,
  // frontend: TODO,
  // frontendTotal: TODO,
  // total: backendTotal + frontendTotal,
};

const outputPath = path.join(REPORTS_DIR, "score.json");
fs.mkdirSync(REPORTS_DIR, { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
console.log(JSON.stringify(result, null, 2));
