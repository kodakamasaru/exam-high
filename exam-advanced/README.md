# 予約管理システム — 採用試験

## 概要

予約管理システムのバックエンドAPI + フロントエンドをゼロから実装する課題です。

### 使用技術

| 項目 | 指定 |
|---|---|
| バックエンド | **Hono** (TypeScript) |
| フロントエンド | **Next.js** |
| DB | **PostgreSQL**（Docker提供） |
| ORM | 自由 |
| その他 | 自由（Redis等、必要に応じて追加可） |

## 想定システム要件

以下の規模での運用を想定して設計・実装してください。

| 項目 | 想定値 |
|---|---|
| リソース数 | 数千 |
| 日次予約件数 | 数万件 |
| 総予約データ量 | 数千万件 |
| 同時アクセス数 | 数千 |

### 自由な点
- ディレクトリ構造・アーキテクチャ
- ORM/ライブラリの選定・追加
- リンター/フォーマッターの選定・追加
- DBスキーマ
- 各種configファイル（tsconfig.json、eslint設定等）の変更・追加
- Dockerfileの変更
- ブランチ戦略
- PR / Issueの運用（使用しなくても構いません）
- デザイン・CSS・レイアウト（見た目は採点対象外。保守性・拡張性を意識したコンポーネント設計は評価対象）

### 禁止事項
- フレームワーク（Hono / Next.js）の変更
- データベース（PostgreSQL）の変更
- docker-compose.yml の変更
- テストコード（tests/）の変更
- API仕様（エンドポイント・リクエスト/レスポンス形式）の変更
- data-testid仕様の変更

### その他
- 仕様に記載されていない機能（ユーザー認証等）の実装は不要
- ただし、今後大きく機能拡張が行われるという想定で設計すること

## 環境構築

### 必要なもの

- Docker Desktop
- Git

### 起動

```bash
docker compose up
```

バックエンド・フロントエンド・DBが起動します。

| サービス | URL / 接続先 |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:3000/api（フロントエンド経由でプロキシ） |
| バックエンドAPI（直接） | http://localhost:8080 |
| PostgreSQL | localhost:5432（DB名: `reservation` / ユーザー: `postgres` / パスワード: `postgres`） |

### DBセットアップ

`backend/package.json` の `init` スクリプトにDBマイグレーション処理を実装してください。
起動後、以下のコマンドでセットアップを実行します。

```bash
docker compose exec backend pnpm init
```

### パッケージの追加

コンテナ内で `pnpm add` を実行してください。

```bash
# 例: backendにprismaを追加
docker compose exec backend pnpm add prisma @prisma/client
```

### DB初期化

DBをリセットしたい場合：

```bash
docker compose down -v
docker compose up -d
docker compose exec backend pnpm init
```

## 課題の進め方

### ステップ0: リポジトリをForkしてクローンする

1. このリポジトリを自分のGitHubアカウントにForkする
2. Forkしたリポジトリをクローンする
   ```bash
   git clone <ForkしたリポジトリのURL>
   cd <リポジトリ名>
   ```
3. 作成したリポジトリに弊社アカウント（`recruit@nxted.co.jp`）を招待する

### ステップ1: 仕様を読む

| ドキュメント | 内容 |
|---|---|
| [backend/README.md](backend/README.md) | API仕様（2エンドポイント） |
| [frontend/README.md](frontend/README.md) | フロントエンド仕様（2画面 + data-testid） |

#### 実装するAPI

| エンドポイント | 概要 |
|---|---|
| `POST /reservations` | 予約登録。同一リソースの時間重複は409で拒否 |
| `GET /reservations` | 予約一覧取得。リソースID必須。ページネーション付き |

#### 実装するフロントエンド

| パス | 概要 |
|---|---|
| `/reservations/new` | 予約登録画面 |
| `/reservations` | 予約一覧画面 |

#### リソース一覧（固定）

フロントエンドで選択肢として表示してください。

| resource_id | 名前 |
|---|---|
| room-a | 会議室A |
| room-b | 会議室B |
| room-c | 会議室C |

### ステップ2: 設計・実装する

仕様書に従って設計・実装してください。
フロントエンドからAPIを呼ぶ際は `/api/reservations` のように相対パスを使ってください（`next.config.ts` のrewritesでバックエンドに転送されます）。

### ステップ3: セルフチェックする

APIテストとE2Eテストを提供しています。
**提出前に必ず通ることを確認してください。通らない場合、採点対象外となります。**

アプリケーションが起動・セットアップ済みの状態で、別ターミナルから実行してください。

```bash
# APIテスト
docker compose run --rm tests pnpm test:api

# E2Eテスト
docker compose run --rm tests pnpm test:e2e
```

テストを再実行する場合は、事前にDB初期化を行ってください（「DB初期化」セクション参照）。

### ステップ4: ADRを書く

アーキテクチャ概要を記述してください（**必須**）。
`adr/` にテンプレートがあります。直接記入してください。

- [adr/backend-architecture.md](adr/backend-architecture.md) — バックエンド
- [adr/frontend-architecture.md](adr/frontend-architecture.md) — フロントエンド

## 提出基準

### 必須

- ✅ `docker compose up` → `docker compose exec backend pnpm init` でアプリケーションが使える状態になること
- ✅ セルフチェック（APIテスト・E2Eテスト）が通ること
- ✅ `adr/backend-architecture.md` と `adr/frontend-architecture.md` が記入されていること


## プロジェクト構成

```
exam-advanced/
├── README.md                        # このファイル
├── backend/
│   ├── README.md                    # API仕様
│   ├── Dockerfile
│   ├── package.json                 # Hono + TypeScript（initスクリプト要実装）
│   ├── tsconfig.json
│   └── src/
│       └── index.ts                 # エントリポイント（ヘルスチェックのみ実装済み）
├── frontend/
│   ├── README.md                    # フロントエンド仕様
│   ├── Dockerfile
│   ├── package.json                 # Next.js
│   ├── tsconfig.json
│   ├── next.config.ts               # APIプロキシ設定済み
│   └── app/                         # 参考用画面（動的ロジックは未実装）
│       ├── layout.tsx
│       ├── page.tsx
│       └── reservations/
│           ├── page.tsx             # 予約一覧
│           └── new/
│               └── page.tsx         # 予約登録
├── tests/
│   ├── Dockerfile
│   ├── package.json
│   ├── playwright.config.ts
│   ├── api/
│   │   └── reservations.test.ts     # APIテスト
│   └── e2e/
│       └── reservations.test.ts     # E2Eテスト
├── adr/
│   ├── backend-architecture.md      # バックエンドADR（必須）
│   └── frontend-architecture.md     # フロントエンドADR（必須）
├── .gitignore
├── docker-compose.yml               # BE + FE + DB + tests
└── pnpm-workspace.yaml
```

## 困ったときは

- Dockerが起動しない → Docker Desktopが起動しているか確認してください
- ポートが使えない → 他のアプリケーションが3000/8080/5432を使用している可能性があります
- セルフチェックが通らない → API仕様・data-testid仕様を再確認してください
- テスト再実行で失敗する → DB初期化してから再実行してください（「DB初期化」セクション参照）
