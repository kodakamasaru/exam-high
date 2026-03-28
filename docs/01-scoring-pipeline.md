# 採点パイプライン

**このパイプラインは全て採点側のみで実行される。受験者には非公開。**

## 前提
- 受験者は Git で提出（ソースコード + ADR）
- 採点側が受験者のリポジトリを clone し、採点用リポジトリのツール・スクリプトを使って採点する

## 全体フロー
```
git clone <受験者リポ>
↓
受験者コードを採点用Docker環境にマウント
↓
docker compose up              # 受験者アプリ + DB + Redis 起動
↓
make seed                      # k6でPOST /reservationsを大量実行（~100万件）
↓
make e2e-test                  # 【足切り】Playwright（pass/fail）
↓ fail → 不合格。以降の採点なし
↓ pass → 以下を並列実行
├─ make arch-test              # アーキテクチャ品質（ADR解析 + 循環依存 + 外部依存集中度 + 双方向依存）
├─ make type-check             # 型安全性（tsc + type-coverage + ESLint）
├─ make lint                   # コード品質（ESLint recommended + security + n）
├─ make duplication-check      # コード重複（jscpd）
├─ make security-test          # セキュリティ（Bearer）
├─ make load-test              # パフォーマンス（k6）
├─ make frontend-lint          # フロントBP（ESLint next + react + react-hooks + jsx-a11y）
├─ make lighthouse             # Lighthouse CI
├─ make bundle-size            # バンドルサイズ（size-limit）
↓
node scripts/score.js          # 全結果を合算 → score.json
```

## 足切り（E2Eテスト）
**合否判定のみ。スコアにはならない。**

### ツール
Playwright

### テスト対象
- APIエンドポイント → HTTPリクエスト → レスポンス検証
- フロントエンド → data-testid要素操作 → UI検証

### 受験者への制約（README経由で伝える）
- すべての操作対象に `data-testid` を付与すること（仕様書で一覧提供）
- API仕様（エンドポイント + レスポンス形式）は固定（OpenAPI仕様書で提供）
- 起動方法: `docker compose up`

### 判定
- 全テスト通過 → 採点対象
- 1つでも失敗 → 不合格（以降の採点なし）

## score.js
各 `make` コマンドが `reports/*.json` に結果を出力。
`scripts/score.js` がそれを読み込み、ウェイトを掛けて合算し `score.json` を出力する。

```
reports/
  # バックエンド
  circular.json             ← madge（循環依存・ファイル単位）
  adr-deps.json             ← dependency-cruiser（ADR宣言ベースの依存違反・モジュール単位）
  type-coverage.json        ← type-coverage（型カバレッジ）
  type-lint.json            ← ESLint @typescript-eslint（any/unsafe）
  lint.json                 ← ESLint recommended + security + n（コード品質）
  jscpd-backend.json        ← jscpd（コード重複）
  security.json             ← Bearer（セキュリティ）
  perf.json                 ← k6（パフォーマンス）

  # フロントエンド
  frontend-bp.json          ← ESLint next + react + react-hooks + jsx-a11y（BP）
  frontend-deps.json        ← dependency-cruiser（依存方向）
  frontend-type-coverage.json ← type-coverage（型カバレッジ）
  frontend-lint.json        ← ESLint（コード品質）
  jscpd-frontend.json       ← jscpd（コード重複）
  lighthouse.json           ← Lighthouse CI（Performance/A11y/BP）
  bundle-size.json          ← size-limit / next build（バンドルサイズ）

  ↓
scripts/score.js → score.json
```

## リポジトリの分離

```
exam-advanced-review/         # 採点用リポジトリ（非公開）
  scripts/                    # 採点スクリプト群（score.js, ADRパーサー, 集計等）
  tests/                      # 負荷テスト（k6）
  configs/                    # ESLint・Bearer・dependency-cruiser・tsconfig設定
  docker-compose.yml          # 採点用Docker環境
  Makefile                    # 採点コマンド

exam-advanced/                # 受験者配布用リポジトリ
  README.md                   # 仕様書・起動方法・提出方法
  api-spec/                   # OpenAPI仕様
  tests/                      # APIテスト・E2Eテスト（セルフチェック用）
  testid-spec/                # data-testid仕様
  templates/                  # ADRテンプレート
  docker-compose.yml          # 開発用Docker環境（DB・Redis）
```
