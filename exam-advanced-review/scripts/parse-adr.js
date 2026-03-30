/**
 * ADRのmarkdownテーブルをパースし、責務定義を抽出する。
 * 最初に見つかったテーブルを使用。
 *
 * Usage: node parse-adr.js <path-to-adr.md>
 * Output: JSON to stdout
 */

const fs = require("fs");

function parseAdr(filepath) {
  const content = fs.readFileSync(filepath, "utf-8");
  const lines = content.split("\n");

  const modules = [];
  let inTable = false;
  let headerPassed = false;

  for (const line of lines) {
    const trimmed = line.trim();

    // テーブルヘッダー行（| で始まる最初の行）
    if (!inTable && trimmed.startsWith("|") && trimmed.endsWith("|")) {
      inTable = true;
      continue;
    }

    // セパレータ行をスキップ
    if (inTable && !headerPassed && trimmed.match(/^\|[\s-|]+\|$/)) {
      headerPassed = true;
      continue;
    }

    // テーブルデータ行をパース
    if (inTable && headerPassed && trimmed.startsWith("|")) {
      const cells = trimmed
        .split("|")
        .map((c) => c.trim())
        .filter((c) => c.length > 0);

      if (cells.length >= 3) {
        const [name, modulePath, responsibility] = cells;
        if (name && modulePath && !name.startsWith("（")) {
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

const filepath = process.argv[2];
if (!filepath) {
  console.error("Usage: node parse-adr.js <path-to-adr.md>");
  process.exit(1);
}

const result = parseAdr(filepath);
console.log(JSON.stringify(result, null, 2));
