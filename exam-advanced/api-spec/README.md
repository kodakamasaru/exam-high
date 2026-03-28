# API仕様

## 共通
- 日時はすべて **UTC**（ISO 8601形式。例: `2030-01-15T10:00:00Z`）

## POST /reservations
予約を登録する。同一リソースの時間重複（日付またぎ含む）は409で拒否。

### リクエスト
```json
{
  "resource_id": "room-a",
  "event_name": "チームMTG",
  "start": "2030-01-15T10:00:00Z",
  "end": "2030-01-15T11:00:00Z"
}
```

| フィールド | 型 | 必須 | 説明 |
|---|---|---|---|
| resource_id | string | Yes | リソースID（room-a, room-b, room-c のいずれか） |
| event_name | string | Yes | イベント名 |
| start | ISO 8601 datetime | Yes | 開始日時（UTC） |
| end | ISO 8601 datetime | Yes | 終了日時（UTC） |

### バリデーション
- 全フィールド必須
- `end` は `start` より後であること
- `start` は現在日時より後であること（過去の予約は不可）
- `resource_id` は有効な値であること（room-a, room-b, room-c）

### レスポンス

**201 Created**
```json
{
  "id": "rsv-456",
  "resource_id": "room-a",
  "event_name": "チームMTG",
  "start": "2030-01-15T10:00:00Z",
  "end": "2030-01-15T11:00:00Z",
  "created_at": "2030-01-10T12:00:00Z"
}
```

**409 Conflict**（同一リソースで時間が重複する既存予約がある場合）
```json
{
  "error": "slot_conflict",
  "message": "The requested time slot conflicts with an existing reservation"
}
```

**400 Bad Request**（バリデーションエラー）
```json
{
  "error": "validation_error",
  "message": "end must be after start"
}
```

### 時間重複の判定
同一 `resource_id` に対して、以下の条件を満たす既存予約がある場合は競合:
```
既存.start < 新規.end AND 既存.end > 新規.start
```

日付またぎの例（正常）:
```json
{
  "resource_id": "room-a",
  "event_name": "夜間作業",
  "start": "2030-01-15T22:00:00Z",
  "end": "2030-01-16T02:00:00Z"
}
```

### 並行処理
同一リソース・同一時間帯に対する同時リクエストでダブルブッキングを防止すること。

---

## GET /reservations
予約一覧を取得する。リソースID必須。デフォルトは現在日時以降を開始日時の近い順に返す。

### パラメータ

| パラメータ | 型 | 必須 | デフォルト | 説明 |
|---|---|---|---|---|
| resource_id | string | Yes | - | リソースID |
| from | ISO 8601 datetime | No | 現在日時 | 検索開始日時 |
| to | ISO 8601 datetime | No | なし（from以降すべて） | 検索終了日時 |
| page | integer | No | 1 | ページ番号 |
| limit | integer | No | 20 | 1ページあたりの件数 |

### ソート
`start` 昇順（近い順）固定。

### レスポンス

**200 OK**
```json
{
  "data": [
    {
      "id": "rsv-456",
      "resource_id": "room-a",
      "event_name": "チームMTG",
      "start": "2030-01-15T10:00:00Z",
      "end": "2030-01-15T11:00:00Z",
      "created_at": "2030-01-10T12:00:00Z"
    }
  ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150
  }
}
```

**400 Bad Request**（resource_id未指定）
```json
{
  "error": "validation_error",
  "message": "resource_id is required"
}
```
