# 採点用リポジトリ

**このリポジトリは受験者に非公開。**

## セットアップ

```bash
pnpm install
```

## 採点フロー

```bash
# 0. 環境変数設定
export SUBMISSION_DIR=../exam-advanced  # 受験者の提出物ディレクトリ

# 1. 受験者アプリ起動 + DBセットアップ
cd $SUBMISSION_DIR && docker compose up -d
cd $SUBMISSION_DIR && docker compose exec backend pnpm run init
cd -

# 2. ゲート条件テスト
SUBMISSION_DIR=$SUBMISSION_DIR make gate

# 3. シードデータ投入 + 全採点
SUBMISSION_DIR=$SUBMISSION_DIR make seed
SUBMISSION_DIR=$SUBMISSION_DIR make score-all

# 4. 結果確認
cat reports/score.json
```

---

## スコア算出方法

**BE 145点満点 → 100に正規化、FE 100点満点**

---

## 採点軸一覧（全20軸）

### 共通軸（BE/FE同じポイント。7軸・合計100ポイント）

| 軸 | ID | pt | 算出方法 |
|---|---|---|---|
| ファイル数 | `*_file_count` | 20 | 5以下=0、5-15線形、15+=100 |
| 型カバレッジ | `*_type_coverage` | 20 | 90-100%線形。90%以下=0。FEは.tsファイルのみ（.tsなし=0） |
| 責務数 | `*_responsibility_count` | 14 | ADR責務構成テーブルの行数。2以下=0、3-7線形、7+=100 |
| Biome lint | `*_biome` | 14 | Biome recommended違反数/1k行。diagnosticsPer1k×5を減点 |
| ファイル長 | `*_file_len` | 14 | min(平均スコア, 最大スコア)。平均: 30行以下=100, 80行以上=0。最大: 70行以下=100, 120行以上=0 |
| 依存違反 | `*_dep_violation` | 9 | 循環依存と双方向依存の大きい方の件数×25を減点 |
| 認知的複雑度 | `*_cognitive` | 9 | eslint-plugin-sonarjs。avg 1以下=100、3以上=0、線形 |

### BE固有軸（6軸・合計45ポイント）

| 軸 | ID | pt | 算出方法 |
|---|---|---|---|
| 外部依存集中度 | `be_ext_spread` | 5 | ADR責務単位のavgSpread。(avgSpread-1.0)×200を減点。1.5以上=0 |
| コード重複 | `be_duplication` | 5 | jscpd（リテラル正規化後）。0%=100、10%以上=0、線形 |
| GETパフォーマンス | `be_perf_get` | 10 | k6。50万件シード後。10000/p95_ms（100ms以下=100） |
| POSTパフォーマンス | `be_perf_post` | 10 | k6。30000/p95_ms（300ms以下=100） |
| ダブルブッキング防止 | `be_concurrency` | 10 | k6。50VU同時POST。成功1件=100、2件以上=0 |
| セキュリティ | `be_security` | 5 | Bearer。critPer1k×50 + highPer1k×25を減点 |

### 合計

| | ポイント | 正規化 |
|---|---|---|
| BE | 共通100 + 固有45 = 145 | → 100点満点 |
| FE | 共通100 | = 100点満点 |

---

## スコア計算式

### ファイル数（5以下=0、5-15線形）
```
score = n <= 5 ? 0 : n >= 15 ? 100 : (n - 5) / 10 * 100
```

### 責務数（2以下=0、3-7線形）
```
score = n <= 2 ? 0 : n >= 7 ? 100 : (n - 2) / 5 * 100
```

### 型カバレッジ（90-100%線形）
```
score = percent >= 100 ? 100 : percent <= 90 ? 0 : (percent - 90) / 10 * 100
```

### ファイル長（平均と最大のmin）
```
avgScore = avg <= 30 ? 100 : avg >= 80 ? 0 : (80 - avg) / 50 * 100
maxScore = max <= 70 ? 100 : max >= 120 ? 0 : (120 - max) / 50 * 100
score = min(avgScore, maxScore)
```

### 認知的複雑度（avg 1-3線形）
```
score = avg <= 1 ? 100 : avg >= 3 ? 0 : (3 - avg) / 2 * 100
```

### コード重複（BE固有。0-10%線形）
```
score = pct <= 0 ? 100 : pct >= 10 ? 0 : (10 - pct) / 10 * 100
```

### 外部依存集中度（BE固有。1.0-1.5線形）
```
score = avgSpread <= 1 ? 100 : avgSpread >= 1.5 ? 0 : 100 - (avgSpread - 1) * 200
```

### GETパフォーマンス（BE固有）
```
score = clamp(10000 / p95_ms)   // 100ms以下=100
```

### POSTパフォーマンス（BE固有）
```
score = clamp(30000 / p95_ms)   // 300ms以下=100
```

---

## 自動生成ファイル除外

以下は全採点軸から除外:
- ディレクトリ: `node_modules/`, `.next/`, `dist/`, `generated/`, `.prisma/`, `drizzle/`, `migrations/`
- ファイル: `*.d.ts`, `*.generated.*`

---

## Makeターゲット

| ターゲット | 内容 |
|---|---|
| `gate` | 足切り（APIテスト + E2Eテスト） |
| `seed` | シードデータ投入（k6、50万件） |
| `arch-test` | BE依存違反 + BE外部依存集中度 |
| `type-check` | BE型カバレッジ + BE Biome lint |
| `sonarjs-backend` | BE認知的複雑度 |
| `duplication-backend` | BEコード重複（リテラル正規化後） |
| `security-test` | BEセキュリティ（Bearer） |
| `load-test` | GETパフォーマンス + POSTパフォーマンス + ダブルブッキング防止 |
| `frontend-type-check` | FE型カバレッジ（.tsのみ） |
| `frontend-biome` | FE Biome lint |
| `sonarjs-frontend` | FE認知的複雑度 |
| `frontend-deps` | FE依存違反 |
| `score-all` | 上記全実行 + score.json出力 |
| `clean` | reports/ 削除 |

---

## ディレクトリ構造

```
exam-advanced-review/
  Makefile
  package.json
  scripts/
    score.js                        # 全20軸スコア算出 + ウェイト合算
    parse-adr.js                    # ADRの責務構成テーブルをパース
    generate-depcruise-config.js    # ADR→dependency-cruiserルール生成
    calc-arch-violations.js         # 責務間依存違反集計
    calc-external-spread.js         # 外部依存集中度算出（責務単位）
    run-sonarjs.js                  # sonarjs実行ラッパー
  tests/
    seed.js                         # k6シード（50万件、タイムアウト60分）
    load-test-get.js                # k6 GET負荷テスト
    load-test-post.js               # k6 POST負荷テスト
    concurrency-test.js             # k6 50VU同時POST
  configs/
    biome.json                      # Biome recommended設定
    tsconfig.scoring.json           # strict: true強制
  reports/                          # 採点結果出力先（自動生成）
```
