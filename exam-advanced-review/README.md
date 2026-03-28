# 採点用リポジトリ

**このリポジトリは受験者に非公開。**

## 採点フロー

```bash
# 1. 受験者リポをclone
git clone <受験者リポURL> submission/

# 2. 受験者アプリ起動
cd submission && docker compose up -d

# 3. E2E足切り
make e2e-test
# → fail: 不合格。以降の採点なし
# → pass: 以下を実行

# 4. シードデータ投入
make seed

# 5. 採点実行
make score-all

# 6. 結果確認
cat reports/score.json
```

## Makeターゲット一覧

| ターゲット | 内容 | ツール |
|---|---|---|
| `e2e-test` | 足切り（pass/fail） | Playwright |
| `seed` | k6でPOST /reservationsを大量実行（~100万件） | k6 |
| `arch-test` | アーキテクチャ品質 | madge + dependency-cruiser |
| `type-check` | 型安全性 | tsc + type-coverage + ESLint |
| `lint` | コード品質 | ESLint (recommended + security + n) |
| `duplication-check` | コード重複 | jscpd |
| `security-test` | セキュリティ | Bearer |
| `load-test` | パフォーマンス | k6 |
| `frontend-lint` | フロントBP | ESLint (next + react + react-hooks + jsx-a11y) |
| `lighthouse` | Lighthouse | Lighthouse CI |
| `bundle-size` | バンドルサイズ | size-limit |
| `score-all` | 上記全実行 + score.js | - |

## ディレクトリ構造

```
exam-advanced-review/
  Makefile                # 採点コマンド
  scripts/
    score.js              # 全reports/*.jsonを合算 → score.json
    parse-adr.js          # ADR-000のDirectory Structureテーブルをパース
    generate-depcruise-config.js  # ADRからdependency-cruiserルール生成
    calc-arch-violations.js       # アーキテクチャ違反を集計
    extract-lighthouse.js         # Lighthouse結果を抽出
    measure-bundle-size.js        # バンドルサイズ測定
  tests/
    seed.js               # k6シードスクリプト
    load-test.js           # k6負荷テスト
  configs/
    eslint-backend.cjs     # バックエンド用ESLint設定
    eslint-frontend-bp.cjs # フロントBP用ESLint設定
    eslint-frontend-quality.cjs # フロント品質用ESLint設定
    tsconfig.scoring.json  # 採点用tsconfig（strict: true強制）
    tsconfig.frontend.scoring.json
  reports/                 # 採点結果出力先（自動生成）
```
