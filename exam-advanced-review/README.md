# 採点用リポジトリ

**このリポジトリは受験者に非公開。**

## セットアップ

```bash
npm install  # 採点ツールのインストール
```

## 採点フロー

```bash
# 1. 受験者リポが ../exam-advanced にある前提
# 2. 受験者アプリ起動
cd ../exam-advanced && docker compose up -d
cd ../exam-advanced && docker compose exec backend pnpm init

# 3. E2E足切り
make e2e-test
# → fail: 不合格。以降の採点なし

# 4. シードデータ投入（パフォーマンステスト用）
make seed

# 5. 全採点実行
make score-all

# 6. 結果確認
cat reports/score.json
```

## Makeターゲット一覧

### バックエンド
| ターゲット | 内容 | ツール |
|---|---|---|
| `arch-test` | アーキテクチャ品質 | madge + dependency-cruiser |
| `type-check` | 型安全性 | type-coverage + ESLint |
| `lint` | コード品質 | ESLint (recommended + security + n) |
| `code-structure-backend` | コード構造 | カスタムスクリプト |
| `duplication-backend` | コード重複 | jscpd |
| `security-test` | セキュリティ | Bearer |
| `load-test` | パフォーマンス | k6 |

### フロントエンド
| ターゲット | 内容 | ツール |
|---|---|---|
| `frontend-type-check` | 型安全性 | type-coverage |
| `frontend-lint` | コード品質 | ESLint |
| `frontend-bp` | Next.js/React BP | ESLint (next + react + react-hooks + jsx-a11y) |
| `code-structure-frontend` | コード構造 | カスタムスクリプト |
| `duplication-frontend` | コード重複 | jscpd |
| `lighthouse` | Lighthouse | Lighthouse CI |
| `bundle-size` | バンドルサイズ | next build |

### 統合
| ターゲット | 内容 |
|---|---|
| `e2e-test` | 足切り（APIテスト + E2Eテスト） |
| `seed` | シードデータ投入 |
| `score-all` | 全採点 + score.json出力 |
| `clean` | reports/ 削除 |

## スコア方式

| 軸 | 方式 | 理由 |
|---|---|---|
| 循環依存・ADR依存違反 | 絶対数 | 0が理想。コード量に関係なくゼロであるべき |
| ESLint違反・セキュリティ | 相対数（1k行あたり） | コード量が多い人が不利にならない |
| type-coverage | パーセンテージ | 既に相対 |
| コード重複（jscpd） | 重複率% | 既に相対 |
| コード構造 | 平均値（関数長・ファイル長） | 分割している人が有利 |
| パフォーマンス | 連続値 | p95 latencyから算出 |

## ディレクトリ構造

```
exam-advanced-review/
  Makefile              # 採点コマンド
  package.json          # 採点ツール依存
  scripts/
    score.js            # 全reports合算 → score.json
    parse-adr.js        # ADRのDirectory Structureテーブルをパース
    generate-depcruise-config.js  # ADRからdependency-cruiserルール生成
    calc-arch-violations.js       # アーキテクチャ違反集計
    calc-code-structure.js        # 平均関数長・平均ファイル長
    calc-lint-relative.js         # ESLint違反を1k行あたりに変換
    extract-lighthouse.js         # Lighthouse結果抽出
    measure-bundle-size.js        # バンドルサイズ計測
  configs/
    tsconfig.scoring.json         # 採点用tsconfig（strict: true強制）
  reports/              # 採点結果出力先（自動生成）
```
