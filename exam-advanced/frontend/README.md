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

## API呼び出し
フロントエンドからAPIを呼ぶ際は `/api/reservations` のように相対パスを使うこと。
`next.config.ts` のrewritesでバックエンドに転送されます。

## 日時の扱い
- 日時はすべてJST（タイムゾーン変換不要）
- 表示形式は `YYYY/MM/DD HH:mm` 固定（例: `2030/01/15 10:00`）

## data-testid仕様

E2Eテストで使用します。以下のdata-testidを必ず付与してください（**変更不可**）。
実際の画面イメージは `app/reservations/` 配下の参考用画面を参照してください。

### `/reservations/new` — 予約登録画面

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| リソース選択（room-a） | `resource-id-room-a` | 任意 | クリックで選択 |
| リソース選択（room-b） | `resource-id-room-b` | 任意 | クリックで選択 |
| リソース選択（room-c） | `resource-id-room-c` | 任意 | クリックで選択 |
| イベント名入力 | `event-name-input` | 任意 | |
| 開始日時入力 | `start-input` | 任意 | `<input type="datetime-local">` またはそれと同等の入力 |
| 終了日時入力 | `end-input` | 任意 | 同上 |
| 登録ボタン | `submit-button` | 任意 | |
| 成功メッセージ | `success-message` | 任意 | 登録成功時に表示 |
| エラーメッセージ | `error-message` | 任意 | バリデーションエラーや競合時に表示 |

### `/reservations` — 予約一覧画面

#### 挙動
- URLパラメータの `resource_id` に基づいてAPIからデータを取得し表示すること
- `resource_id` パラメータなしでアクセスされた場合は `room-a` をデフォルトとすること
- フィルタ状態はURLパラメータに反映すること（ブラウザリロードで状態が維持されること）

#### URLパラメータ

| パラメータ | 必須 | デフォルト | 例 |
|---|---|---|---|
| resource_id | Yes | room-a | `?resource_id=room-a` |
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
| 前ページボタン | `prev-page` | 任意 | 1ページ目ではdisabled |
| 次ページボタン | `next-page` | 任意 | 最終ページではdisabled |

## 注意事項
- API仕様・data-testid仕様は変更不可
- デザイン・CSS・レイアウトは自由（採点対象外）
