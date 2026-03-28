# フロントエンド仕様

## 画面構成

| パス | 画面 |
|---|---|
| `/reservations/new` | 予約登録 |
| `/reservations` | 予約一覧 |

## ナビゲーション
全画面から両ページへ遷移できるリンクを設置すること。

| 要素 | data-testid | 遷移先 |
|---|---|---|
| 予約登録リンク | `nav-new` | `/reservations/new` |
| 予約一覧リンク | `nav-list` | `/reservations` |

## data-testid仕様

E2Eテストで使用します。以下のdata-testidを必ず付与してください。
実際の画面イメージは `app/reservations/` 配下の静的HTMLを参照してください。

### `/reservations/new` — 予約登録画面

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| リソース選択（room-a） | `resource-id-room-a` | 任意 | クリックで選択 |
| リソース選択（room-b） | `resource-id-room-b` | 任意 | クリックで選択 |
| リソース選択（room-c） | `resource-id-room-c` | 任意 | クリックで選択 |
| イベント名入力 | `event-name-input` | 任意 | |
| 開始日時入力 | `start-input` | 任意 | |
| 終了日時入力 | `end-input` | 任意 | |
| 登録ボタン | `submit-button` | 任意 | |
| 成功メッセージ | `success-message` | 任意 | 登録成功時に表示 |
| エラーメッセージ | `error-message` | 任意 | バリデーションエラーや競合時に表示 |

### `/reservations` — 予約一覧画面

#### URLパラメータ
フィルタ状態はURLパラメータに反映すること（ブラウザリロードで状態が維持されること）。

| パラメータ | 必須 | デフォルト | 例 |
|---|---|---|---|
| resource_id | Yes | - | `?resource_id=room-a` |
| page | No | 1 | `&page=2` |

#### data-testid

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| リソースフィルタ（room-a） | `filter-room-a` | 任意 | クリックで選択 |
| リソースフィルタ（room-b） | `filter-room-b` | 任意 | クリックで選択 |
| リソースフィルタ（room-c） | `filter-room-c` | 任意 | クリックで選択 |
| 検索ボタン | `filter-button` | 任意 | |
| 予約リスト | `reservation-list` | 任意 | 予約アイテムを内包 |
| 予約アイテム | `reservation-item` | 任意 | 各予約行。複数存在する |
| 前ページボタン | `prev-page` | 任意 | 1ページ目では非活性 |
| 次ページボタン | `next-page` | 任意 | 最終ページでは非活性 |

## 注意事項
- 日時の表示形式は `YYYY/MM/DD HH:mm`（JST）固定（例: `2030/01/15 19:00`）
- デザイン・CSS・レイアウトは自由（採点対象外）
