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

**BE 120点満点 → 100に正規化、FE 100点満点**

共通10軸（BE/FE同じポイント） + BE固有4軸（各5点）

---

## 採点軸一覧（全24軸）

### 共通軸（10軸・合計100ポイント）

#### 分割度
| 軸 | ID | ポイント | 算出方法 |
|---|---|---|---|
| ファイル数 | `*_file_count` | 20 | 5以下=0、5-15線形、15+=100 |
| 型カバレッジ | `*_type_coverage` | 20 | 非線形二次関数K=50。BEはtype-coverage。FEは.tsファイルのみ（.tsなし=0） |
| ファイル長 | `*_file_len` | 12 | min(平均スコア, 最大スコア)。平均: 50行以下=100, 100行以上=0。最大: 80行以下=100, 200行以上=0 |
| レイヤー数 | `*_layer_count` | 10 | ADRテーブル行数。2以下=0、3-7線形、7+=100 |
| Biome lint | `*_biome` | 10 | Biome recommended違反数を1k行あたりに変換。diagnosticsPer1k×5を減点 |
| 関数数 | `*_func_count` | 8 | 5以下=0、5-15線形、15+=100 |
| 外部依存集中度 | `*_ext_spread` | 8 | ADRレイヤー単位のavgSpread。(avgSpread-1.0)×50を減点 |
| 平均関数長 | `*_avg_func_len` | 3 | 1000/avgFunctionLength |
| コード重複 | `*_duplication` | 3 | jscpd（リテラル正規化後）。100 - percentage×5 |
| 認知的複雑度 | `*_cognitive` | 3 | eslint-plugin-sonarjs。100 - avg×5 - max超過分×3 |
| 依存違反 | `*_dep_violation` | 3 | 循環依存と双方向依存の大きい方の件数×25を減点 |

### BE固有軸（4軸・合計20ポイント）

| 軸 | ID | ポイント | 算出方法 |
|---|---|---|---|
| GETパフォーマンス | `be_perf_get` | 5 | k6。50万件シード後。10000/p95_ms（100ms以下=100） |
| POSTパフォーマンス | `be_perf_post` | 5 | k6。30000/p95_ms（300ms以下=100） |
| ダブルブッキング防止 | `be_concurrency` | 5 | k6。50VU同時POST。成功1件=100、2件以上=0 |
| セキュリティ | `be_security` | 5 | Bearer。critPer1k×50 + highPer1k×25を減点 |

### 合計

| | ポイント | 正規化 |
|---|---|---|
| BE | 共通100 + 固有20 = 120 | → 100点満点 |
| FE | 共通100 | = 100点満点 |

---

## スコア計算式の詳細

### ファイル数・関数数（5以下=0、5-15線形）
```
score = n <= 5 ? 0 : n >= 15 ? 100 : (n - 5) / 10 * 100
```

### レイヤー数（2以下=0、3-7線形）
```
score = n <= 2 ? 0 : n >= 7 ? 100 : (n - 2) / 5 * 100
```

### 型カバレッジ（非線形二次関数K=50）
```
distance = (100 - percent) / 10
score = 100 - distance² × 50
```

### ファイル長（平均と最大のmin）
```
avgScore = avg <= 50 ? 100 : avg >= 100 ? 0 : (100 - avg) / 50 * 100
maxScore = max <= 80 ? 100 : max >= 200 ? 0 : (200 - max) / 120 * 100
score = min(avgScore, maxScore)
```

### GETパフォーマンス
```
score = clamp(10000 / p95_ms)   // 100ms以下=100
```

### POSTパフォーマンス
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
| `arch-test` | 依存違反 + 外部依存集中度 |
| `type-check` | BE型カバレッジ + Biome lint |
| `sonarjs-backend` | BE認知的複雑度 |
| `duplication-backend` | BEコード重複（リテラル正規化後） |
| `security-test` | セキュリティ（Bearer） |
| `load-test` | GETパフォーマンス + POSTパフォーマンス + ダブルブッキング防止 |
| `frontend-type-check` | FE型カバレッジ（.tsのみ） |
| `frontend-biome` | FEコード品質（Biome） |
| `sonarjs-frontend` | FE認知的複雑度 |
| `frontend-deps` | FE依存違反 + 外部依存集中度 |
| `duplication-frontend` | FEコード重複（リテラル正規化後） |
| `score-all` | 上記全実行 + score.json出力 |
| `clean` | reports/ 削除 |

---

## ディレクトリ構造

```
exam-advanced-review/
  Makefile
  package.json
  scripts/
    score.js                        # 全24軸スコア算出 + ウェイト合算
    parse-adr.js                    # ADRのレイヤー構成テーブルをパース
    generate-depcruise-config.js    # ADR→dependency-cruiserルール生成
    calc-arch-violations.js         # レイヤー間依存違反集計
    calc-external-spread.js         # 外部依存集中度算出（レイヤー単位）
    run-sonarjs.js                  # sonarjs実行ラッパー
    run-type-lint.js                # type-aware ESLint実行ラッパー（未使用・参考用）
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
