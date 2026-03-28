# Page snapshot

```yaml
- generic [ref=e2]:
  - link "予約登録" [ref=e3] [cursor=pointer]:
    - /url: /reservations/new
  - text: "|"
  - link "予約一覧" [ref=e4] [cursor=pointer]:
    - /url: /reservations
  - separator [ref=e5]
  - heading "予約登録" [level=1] [ref=e6]
  - group "予約情報" [ref=e8]:
    - generic [ref=e9]: 予約情報
    - paragraph [ref=e10]:
      - text: リソース：
      - generic [ref=e11]:
        - radio "会議室A" [ref=e12]
        - text: 会議室A
      - generic [ref=e13]:
        - radio "会議室B" [ref=e14]
        - text: 会議室B
      - generic [ref=e15]:
        - radio "会議室C" [ref=e16]
        - text: 会議室C
    - paragraph [ref=e17]:
      - text: イベント名：
      - textbox "イベント名：" [ref=e18]:
        - /placeholder: "例: チームMTG"
    - paragraph [ref=e19]:
      - text: 開始日時：
      - textbox "開始日時：" [ref=e20]
      - text: 終了日時：
      - textbox "終了日時：" [ref=e21]
    - paragraph [ref=e22]:
      - button "登録" [ref=e23]
```