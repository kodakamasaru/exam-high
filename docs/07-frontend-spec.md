# フロントエンド仕様

## 画面構成
2画面。ルーティングは以下の通り。

| パス | 画面 |
|---|---|
| `/reservations/new` | 予約登録 |
| `/reservations` | 予約一覧 |

## ナビゲーション
両画面に以下のリンクを設置すること。

| 要素 | data-testid | 遷移先 |
|---|---|---|
| 予約登録リンク | `nav-new` | `/reservations/new` |
| 予約一覧リンク | `nav-list` | `/reservations` |

## ワイヤーフレーム（参考）
以下は参考用。この通りに実装する必要はないが、data-testidは必ず付与すること。

### `/reservations/new` — 予約登録
```
+----------------------------------+
| [予約登録]  [予約一覧]             |
+----------------------------------+
| 予約登録                          |
|                                  |
| リソース [▼ 会議室Aを選択]        |
| イベント名 [________________]     |
| 開始日時   [________________]     |
| 終了日時   [________________]     |
|                                  |
| [登録]                            |
|                                  |
| ✓ 予約を登録しました              |
| ✗ この時間帯はすでに予約があります  |
+----------------------------------+
```

### `/reservations` — 予約一覧
```
+----------------------------------+
| [予約登録]  [予約一覧]             |
+----------------------------------+
| 予約一覧                          |
|                                  |
| リソース [▼ 会議室Aを選択] [検索]  |
|                                  |
| 2030/01/15 10:00-11:00  チームMTG       |
| 2030/01/15 13:00-14:00  1on1           |
| 2030/01/16 15:00-16:30  設計レビュー     |
|                                  |
| [前へ]  1 / 8  [次へ]             |
+----------------------------------+
```

## data-testid仕様

### 共通（全画面）

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| 予約登録リンク | `nav-new` | `<a>` | `/reservations/new` へ遷移 |
| 予約一覧リンク | `nav-list` | `<a>` | `/reservations` へ遷移 |

### `/reservations/new` — 予約登録画面

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| リソース選択 | `resource-id-select` | `<select>` | option valueはresource_id（room-a等） |
| イベント名入力 | `event-name-input` | `<input>` | |
| 開始日時入力 | `start-input` | `<input>` | datetime-local or text。ISO 8601形式の値を受け付けること |
| 終了日時入力 | `end-input` | `<input>` | 同上 |
| 登録ボタン | `submit-button` | `<button>` | |
| 成功メッセージ | `success-message` | 任意 | 登録成功時に表示 |
| エラーメッセージ | `error-message` | 任意 | バリデーションエラーや競合時に表示 |

### `/reservations` — 予約一覧画面

#### URLパラメータ
一覧画面のフィルタ状態はURLパラメータに反映すること（ブラウザリロードで状態が維持されること）。
日付フィルタ（from/to）はフロントでは不要。APIのデフォルト（現在日時以降）に任せる。

| パラメータ | 必須 | デフォルト | 例 |
|---|---|---|---|
| resource_id | Yes | - | `?resource_id=room-a` |
| page | No | 1 | `&page=2` |

例: `/reservations?resource_id=room-a&page=2`

※ APIの `from`/`to` パラメータは存在するが、フロントからは使わない。

#### data-testid

| 要素 | data-testid | HTML要素 | 備考 |
|---|---|---|---|
| リソースフィルタ | `filter-resource-id` | `<select>` | option valueはresource_id |
| 検索ボタン | `filter-button` | `<button>` | |
| 予約リスト | `reservation-list` | 任意コンテナ | 予約アイテムを内包 |
| 予約アイテム | `reservation-item` | 任意 | 各予約行。複数存在する |
| 前ページボタン | `prev-page` | `<button>` | 1ページ目では非活性 |
| 次ページボタン | `next-page` | `<button>` | 最終ページでは非活性 |

### 予約アイテム内のdata-testid
`reservation-item` 内に以下を含むこと:

| 要素 | data-testid | 備考 |
|---|---|---|
| イベント名 | `reservation-event-name` | |
| 開始日時 | `reservation-start` | JSTで表示（表示形式は自由） |
| 終了日時 | `reservation-end` | JSTで表示（表示形式は自由） |

## E2Eテストの動作イメージ
受験者にはE2Eテストコードをセルフチェック用に提供する。
テストは以下のような操作をする:

### 登録テスト
```
1. /reservations/new に遷移
2. resource-id-select で "room-a" を選択
3. event-name-input に "テスト予約" を入力
4. start-input に "2030-01-15T10:00:00" を入力
5. end-input に "2030-01-15T11:00:00" を入力
6. submit-button をクリック
7. success-message が表示されることを確認
```

### 一覧テスト
```
1. /reservations に遷移
2. filter-resource-id で "room-a" を選択
3. filter-button をクリック
4. reservation-list 内に reservation-item が存在することを確認
5. reservation-item 内の reservation-event-name にテキストがあることを確認
```

### 競合テスト
```
1. 同じリソース・同じ時間帯で2回登録
2. 2回目で error-message が表示されることを確認
```

## 注意事項
- 日時の表示形式は `YYYY/MM/DD HH:mm` 固定（例: `2030/01/15 19:00`）
- APIはUTC、表示はJST（UTC+9）に変換すること
- デザイン・CSS・レイアウトは自由。採点対象外
