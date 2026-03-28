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
- Node.js v18以上
- Git

### 起動

以下のコマンドでアプリケーション全体（バックエンド + フロントエンド + DB）が起動します。

```bash
docker compose up
```

| サービス | URL / 接続先 |
|---|---|
| フロントエンド | http://localhost:3000 |
| バックエンドAPI | http://localhost:8080 |
| PostgreSQL | localhost:5432（DB名: `reservation` / ユーザー: `postgres` / パスワード: `postgres`） |

## 課題の進め方

### ステップ1: 仕様を読む

以下の仕様書を確認してください。

| ドキュメント | 内容 |
|---|---|
| [api-spec/README.md](api-spec/README.md) | API仕様（2エンドポイント） |
| [FRONTEND.md](FRONTEND.md) | フロントエンド仕様（2画面 + data-testid） |

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

以下のリソースが利用可能です。フロントエンドのセレクトに表示してください。

| resource_id | 名前 |
|---|---|
| room-a | 会議室A |
| room-b | 会議室B |
| room-c | 会議室C |

### ステップ2: 設計・実装する

- ディレクトリ構造・アーキテクチャは自由です
- API仕様は**変更不可**
- data-testid仕様は**変更不可**
- 日時: API仕様とフロントエンド仕様をそれぞれ参照
- デザイン・CSS・レイアウトは自由（採点対象外）

### ステップ3: セルフチェックする

APIテストとE2Eテストを提供しています。
**提出前に必ず通ることを確認してください。通らない場合、採点対象外となります。**

```bash
# APIテスト
cd tests && pnpm install && pnpm test:api

# E2Eテスト
cd tests && pnpm test:e2e
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

- ✅ `docker compose up` で起動可能
- ✅ セルフチェック（APIテスト・E2Eテスト）が通ること
- ✅ `adr/backend-architecture.md` と `adr/frontend-architecture.md` が記入されていること

### 推奨

- ✨ 同一リソース・同一時間帯への同時リクエストでダブルブッキングが発生しないこと
- ✨ 大量データでもAPIが高速に応答すること

## プロジェクト構成

```
exam-advanced/
├── README.md                    # このファイル
├── FRONTEND.md                  # フロントエンド仕様
├── api-spec/
│   └── README.md                # API仕様
├── backend/
│   ├── Dockerfile
│   ├── package.json             # Hono + TypeScript
│   ├── tsconfig.json
│   └── src/
│       └── index.ts             # エントリポイント（ヘルスチェックのみ実装済み）
├── frontend/
│   ├── Dockerfile
│   ├── package.json             # Next.js
│   ├── tsconfig.json
│   ├── next.config.ts
│   └── app/                     # 静的HTML（参考用。動的ロジックは未実装）
│       ├── layout.tsx
│       ├── page.tsx
│       └── reservations/
│           ├── page.tsx          # 予約一覧
│           └── new/
│               └── page.tsx     # 予約登録
├── adr/
│   ├── backend-architecture.md   # バックエンドADR（必須）
│   └── frontend-architecture.md  # フロントエンドADR（必須）
├── docker-compose.yml           # BE + FE + DB
└── pnpm-workspace.yaml
```

## 面接について

提出後、選考を通過した方には面接を行います。
面接ではADRに記載した設計判断について質問しますので、設計意図を説明できるようにしておいてください。

## 困ったときは

- Dockerが起動しない → Docker Desktopが起動しているか確認してください
- ポートが使えない → 他のアプリケーションが3000/8080/5432を使用している可能性があります
- セルフチェックが通らない → API仕様・data-testid仕様を再確認してください
