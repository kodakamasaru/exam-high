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

## 環境構築

### 必要なもの

- Docker Desktop
- Git

### 起動

以下のコマンドでアプリケーション全体（バックエンド + フロントエンド + DB）が起動します。

```bash
docker compose up
```

| サービス | URL / 接続先 |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:3000/api（フロントエンド経由でプロキシ） |
| バックエンドAPI（直接） | http://localhost:8080 |
| PostgreSQL | localhost:5432（DB名: `reservation` / ユーザー: `postgres` / パスワード: `postgres`） |

フロントエンドからAPIを呼ぶ際は `/api/reservations` のように相対パスを使ってください。
`next.config.ts` のrewritesで `http://backend:8080` に転送されます。

### パッケージの追加

ORM等のパッケージを追加する場合は、コンテナ内で `pnpm add` を実行してください。

```bash
# 例: backendにprismaを追加
docker compose exec backend pnpm add prisma @prisma/client
```

追加後、Dockerを再ビルドしてください。

```bash
docker compose up --build
```

### DB初期化

DBの状態をリセットしたい場合は、以下のコマンドでボリュームごと削除してから再起動してください。

```bash
docker compose down -v
docker compose up
```

## 課題の進め方

### ステップ1: 仕様を読む

以下の仕様書を確認してください。

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

以下のリソースが利用可能です。フロントエンドで選択肢として表示してください。

| resource_id | 名前 |
|---|---|
| room-a | 会議室A |
| room-b | 会議室B |
| room-c | 会議室C |

### ステップ2: 設計・実装する

- ディレクトリ構造・アーキテクチャは自由です
- API仕様は**変更不可**
- data-testid仕様は**変更不可**
- デザイン・CSS・レイアウトは自由（採点対象外）
- `docker compose up` だけで、DB準備を含めてアプリケーションが使える状態になること
- フロントエンドからAPIを呼ぶ際は `/api/reservations` のように相対パスを使うこと

### ステップ3: セルフチェックする

APIテストとE2Eテストを提供しています。
**提出前に必ず通ることを確認してください。通らない場合、採点対象外となります。**

アプリケーションが起動した状態（`docker compose up`）で、別ターミナルから実行してください。

```bash
# APIテスト
docker compose run --rm tests pnpm test:api

# E2Eテスト
docker compose run --rm tests pnpm test:e2e
```

テストを再実行する場合は、事前にDB初期化を行ってください。

```bash
docker compose down -v
docker compose up -d
# 起動を待ってからテスト実行
docker compose run --rm tests pnpm test:api
```

### ステップ4: ADRを書く

アーキテクチャ概要を記述してください（**必須**）。
`adr/` にテンプレートがあります。直接記入してください。

- [adr/backend-architecture.md](adr/backend-architecture.md) — バックエンド
- [adr/frontend-architecture.md](adr/frontend-architecture.md) — フロントエンド

### ステップ5: 提出する

別途案内する方法で提出してください。

## 提出基準

### 必須

- ✅ `docker compose up` だけでDB準備を含めてアプリケーションが使える状態になること
- ✅ セルフチェック（APIテスト・E2Eテスト）が通ること
- ✅ `adr/backend-architecture.md` と `adr/frontend-architecture.md` が記入されていること

### 推奨

- ✨ 同一リソース・同一時間帯への同時リクエストでダブルブッキングが発生しないこと
- ✨ 大量データでもAPIが高速に応答すること

## プロジェクト構成

```
exam-advanced/
├── README.md                      # このファイル
├── backend/
│   ├── README.md                  # API仕様
│   ├── Dockerfile
│   ├── package.json               # Hono + TypeScript
│   ├── tsconfig.json
│   └── src/
│       └── index.ts               # エントリポイント（ヘルスチェックのみ実装済み）
├── frontend/
│   ├── README.md                  # フロントエンド仕様
│   ├── Dockerfile
│   ├── package.json               # Next.js
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── app/                       # 参考用画面（動的ロジックは未実装）
├── tests/
│   ├── Dockerfile
│   ├── package.json
│   ├── api/                       # APIテスト
│   └── e2e/                       # E2Eテスト
├── adr/
│   ├── backend-architecture.md    # バックエンドADR（必須）
│   └── frontend-architecture.md   # フロントエンドADR（必須）
├── docker-compose.yml             # BE + FE + DB + tests
└── pnpm-workspace.yaml
```

## 面接について

提出後、選考を通過した方には面接を行います。
面接ではADRに記載した設計判断について質問しますので、設計意図を説明できるようにしておいてください。

## 困ったときは

- Dockerが起動しない → Docker Desktopが起動しているか確認してください
- ポートが使えない → 他のアプリケーションが3000/8080/5432を使用している可能性があります
- セルフチェックが通らない → API仕様・data-testid仕様を再確認してください
- パッケージ追加後にDockerが動かない → `docker compose up --build` で再ビルドしてください
- テスト2回目以降で失敗する → `docker compose down -v && docker compose up` でDB初期化してください
