/**
 * ADR-000のDirectory Structureテーブルをパースし、モジュール定義を抽出する。
 *
 * Usage: node parse-adr.js <path-to-000-architecture.md>
 * Output: JSON to stdout
 *
 * 期待するADRフォーマット:
 * | モジュール名 | パス | 責務 |
 * |---|---|---|
 * | domain | src/domain/ | ビジネスロジック |
 * | ...    | ...         | ...             |
 */

const fs = require("fs");
const path = require("path");

function parseAdr(filepath) {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  const modules = [];
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // Directory Structureセクション内のテーブルを探す
    if (trimmed.startsWith("| モジュール名")) {
      inTable = true;
      continue;
    }

    // セパレータ行をスキップ
    if (inTable && trimmed.match(/^\|[\s-|]+\|$/)) {
      headerPassed = true;
      continue;
    }

    // テーブル行をパース
    if (inTable && headerPassed && trimmed.startsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (cells.length >= 3) {
        const [name, modulePath, responsibility] = cells;
        // テンプレートの例示行やヘッダーをスキップ
        if (name && modulePath && !name.startsWith("（") && !name.startsWith("例")) {
          modules.push({
            name,
            path: modulePath.replace(/`/g, "").trim(),
            responsibility,
          });
        }
      }
    }

    // テーブル終了
    if (inTable && headerPassed && !trimmed.startsWith("|") && trimmed !== "") {
      break;
    }
  }

  return { modules };
}

// CLI
const filepath = process.argv[2];
if (!filepath) {
  console.error("Usage: node parse-adr.js <path-to-000-architecture.md>");
  process.exit(1);
}

const result = parseAdr(filepath);
console.log(JSON.stringify(result, null, 2));
