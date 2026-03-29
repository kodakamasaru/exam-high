# バックエンド評価

## 評価軸一覧

| # | 軸 | 配点 | ツール | 誤検知 | 重み | スコア方式 |
|---|---|---|---|---|---|---|
| 1 | アーキテクチャ品質 | 大 | madge + dependency-cruiser | 極低 | 厚め | 絶対数（0が理想） |
|   | （ADR宣言ベースの依存違反 + 循環依存） | | | | | |
| 2 | 型安全性 | 大 | tsc + type-coverage + ESLint | 極低〜低 | 厚め | type-coverageは% |
|   | （Honoの型安全ルーティングの活用度もここで差が出る） | | | | | |
| 3 | コード品質 | 中 | ESLint (recommended) + security + n | 低 | 厚め | 相対数（1k行あたり） |
| 4 | コード構造 | 中 | カスタムスクリプト | ゼロ | 厚め | 平均値 |
|   | （平均関数長 + 平均ファイル長） | | | | | |
| 5 | コード重複 | 中 | jscpd | ほぼゼロ | 厚め | 重複率% |
| 6 | セキュリティ | 小 | Bearer | 低 | 薄め | 相対数（1k行あたり） |
| 7 | パフォーマンス | 小 | k6 | ゼロ | 薄め | 連続値 |

---

## 1. アーキテクチャ品質

### 目的
コードが適切に層分けされているかを測定する。
受験者はADR-000でディレクトリ構造（モジュール名・パス・責務）を文書化。
採点側はそこからモジュール境界を読み取り、依存違反を自動検出する。

### 2つの指標

#### ① 循環依存 — ファイル単位
適切に層分けしていれば循環依存は発生しない。
同一フォルダ内であってもファイル間の循環は実害があるため、ファイル単位で検出する。

**ツール**: madge
**コマンド**:
```bash
npx madge --circular --json src/ > reports/circular.json
```
**出力例**:
```json
[
  ["src/service/order.ts", "src/service/inventory.ts", "src/service/order.ts"]
]
```
**スコア**: `0が理想。1件ごとに減点`

#### ② ADR宣言ベースの依存違反 — モジュール単位
受験者がADR-000で宣言したモジュール間の依存グラフを構築し、以下をチェック:
- モジュール間に循環依存がないか（DAGになっているか）
- 依存方向が一貫しているか（A→B かつ B→A がないか）
- 外部パッケージのimportが特定モジュールに集中しているか

**ツール**: dependency-cruiser + ADRパーサースクリプト
**処理フロー**:
1. ADR-000のDirectory Structureテーブルをパース → モジュール定義（名前・パス）を取得
2. dependency-cruiserでモジュール間の依存グラフを構築
3. 違反を検出

**コマンド**:
```bash
node scripts/parse-adr.js docs/adr/000-architecture.md > configs/modules.json
node scripts/generate-depcruise-config.js configs/modules.json > .dependency-cruiser.cjs
npx depcruise --config .dependency-cruiser.cjs --output-type json src/ \
  | node scripts/calc-arch-violations.js > reports/adr-deps.json
```
**出力例**:
```json
{
  "moduleCycles": 0,
  "bidirectionalPairs": 1,
  "externalSpreadByModule": {
    "domain": 0,
    "application": 0,
    "infrastructure": 3
  },
  "totalViolations": 1
}
```
**スコア**:
```
score = MAX_SCORE
      - (moduleCycles × W_module_cycle)
      - (bidirectionalPairs × W_bidirectional)
      - (domain_external_count × W_domain_leak)
```

---

## 2. 型安全性

### 目的
型が適切に定義・利用されているか。
Honoの型安全ルーティングを活用しているほど、type-coverageが自然に高くなる。

### ツール
- tsc（コンパイルチェック）
- type-coverage（型カバレッジ）
- ESLint + @typescript-eslint（any / unsafe検出）

### 前提
採点時は受験者のtsconfigに関わらず **`strict: true` を強制**して実行する。
これにより暗黙のanyも含め統一基準で採点できる。

### コマンド
```bash
# 採点用tsconfig（strict: true強制）を使用してコンパイルチェック
npx tsc --noEmit --project configs/tsconfig.scoring.json 2>&1 | grep -c "error TS" > reports/tsc-errors.txt

# 型カバレッジ（strict: true環境で実行。暗黙anyもuncoveredとして検出）
npx type-coverage --project configs/tsconfig.scoring.json --json --at-least 0 > reports/type-coverage.json

# 明示的any / unsafe操作の検出
npx eslint src/ --ext .ts \
  --rule '{"@typescript-eslint/no-explicit-any": "error", "@typescript-eslint/no-unsafe-assignment": "error"}' \
  -f json -o reports/type-lint.json
```

### 採点用tsconfig（configs/tsconfig.scoring.json）
```json
{
  "extends": "../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "noImplicitAny": true
  }
}
```
受験者のtsconfigを継承しつつ、strict関連のみ上書きする。

### 出力例（type-coverage）
```json
{
  "correctCount": 1850,
  "totalCount": 2000,
  "percent": 92.5
}
```

### スコア
```
score = type_coverage_percent × W_coverage
      - any_usage_count × W_any
      - unsafe_count × W_unsafe
      - tsc_error_count × W_tsc
```

---

## 3. コード品質

### 目的
ESLintルール違反の数。Node.jsセキュリティBP（eslint-plugin-security）とNode.js BP（eslint-plugin-n）も統合。

### ツール
ESLint（recommended + eslint-plugin-security + eslint-plugin-n）

### コマンド
```bash
npx eslint src/ --ext .ts \
  -c configs/eslint-backend.cjs \
  -f json -o reports/lint.json
```

### スコア
コード量が多い受験者が不利にならないよう、1000行あたりの違反数で算出。
```
errors_per_1k = total_errors / total_lines * 1000
warnings_per_1k = total_warnings / total_lines * 1000
score = MAX_SCORE - (errors_per_1k × W_lint_error) - (warnings_per_1k × W_lint_warn)
```

---

## 4. コード構造

### 目的
適切にコードが分割されているかを測定。ベタ書きよりもコンポーネント・関数分割している方が高スコア。

### 指標
- **平均関数長**（行数）: 短いほど高スコア
- **平均ファイル長**（行数）: 短いほど高スコア

### ツール
カスタムスクリプト（TSファイルをパースして関数・ファイルの行数を集計）

### コマンド
```bash
node scripts/calc-code-structure.js src/ > reports/code-structure.json
```

### 出力例
```json
{
  "avgFunctionLength": 15,
  "avgFileLength": 85,
  "totalFiles": 24,
  "totalFunctions": 48
}
```

### スコア
```
score = W_func / avgFunctionLength + W_file / avgFileLength
```

---

## 5. コード重複

### 目的
コピペコードの検出

### ツール
jscpd

### コマンド
```bash
npx jscpd src/ --reporters json --output reports/ --min-lines 5 --min-tokens 50
```

### スコア
```
score = MAX_SCORE - (duplication_percentage × W_duplication)
```

---

## 6. セキュリティ

### 目的
既知の脆弱性の検出（データフロー解析ベース）

### ツール
Bearer（データフロー + taint tracking。OWASP Top 10 / CWE Top 25 ルール組み込み済み）

### 採用理由
- Semgrepはパターンマッチのため誤検知が多い（精度 ~36%）
- Bearerはデータフロー解析で「ユーザー入力が危険な関数に到達するか」を追跡（精度 ~80%）
- ライセンス: Elastic License 2.0（内部利用OK。SaaS提供のみ制限）
- Dockerイメージ: ~109MB

### コマンド
```bash
docker run --rm \
  -v $(pwd):/tmp/scan \
  bearer/bearer:latest-amd64 \
  scan /tmp/scan \
  --format json --output /tmp/scan/reports/security.json
```

### スコア
```
critical_per_1k = critical_count / total_lines * 1000
high_per_1k = high_count / total_lines * 1000
score = MAX_SCORE - (critical_per_1k × W_sec_critical) - (high_per_1k × W_sec_high)
```

---

## 7. パフォーマンス

### 目的
大量データでのAPI応答性能

### ツール
k6

### 前提
- `make seed` で数千万件のシードデータを投入済み

### コマンド
```bash
k6 run --out json=reports/perf.json scripts/load-test.js
```

### スコア
```
score = f(p95_latency) + f(throughput)
```
※ 連続値。計算式は要検討。
