# ADR（Architecture Decision Record）

## 概要
受験者に設計判断の記録を提出させる。
- **ADR-000（Architecture Overview）**: アーキテクチャ品質の自動採点に使用
- **その他のADR**: 面接での深掘り材料（自動採点対象外）

## ADR-000: Architecture Overview（必須・採点対象）
アーキテクチャ宣言。受験者から見ると「自分の設計を文書化しているだけ」だが、
採点側はここからモジュール境界を読み取り、依存違反を自動検出する。

### テンプレート
```markdown
# ADR-000: Architecture Overview

## Directory Structure
| モジュール名 | パス | 責務 |
|---|---|---|
| domain | src/domain/ | ビジネスロジック・エンティティ |
| application | src/app/ | ユースケース |
| infrastructure | src/infra/ | DB永続化・外部API |
```

### 採点側の処理（受験者には非公開）
1. テーブルをパースしてモジュール（パス）を特定
2. dependency-cruiserでモジュール間の依存グラフを構築
3. 以下を自動チェック：
   - モジュール間に循環依存がないか（DAGになっているか）
   - 外部パッケージのimportが特定モジュールに集中しているか（フォルダ単位）
   - 依存方向が一貫しているか（A→B かつ B→A がないか）
4. + ファイル単位の循環依存チェック（madge。ADR不要）

## その他のADR（任意・採点対象外）
面接での深掘り材料として使用。

### テンプレート
```markdown
# ADR-XXX: タイトル

## Context
（背景・課題。なぜこの設計判断が必要になったか）

## Options
### Option A: xxx
- Pros: ...
- Cons: ...

### Option B: xxx
- Pros: ...
- Cons: ...

## Decision
（選択した案とその理由）

## Tradeoffs
（トレードオフ・制約・将来のリスク）
```

## 受験者への指示
- `docs/adr/` ディレクトリにADRを提出すること
- **ADR-000（Architecture Overview）は必須**。Directory Structureテーブルを記述すること
- その他のADR（DB設計、FW選択、パフォーマンス戦略等）は任意だが推奨
- テンプレートに従うこと

## 面接での使い方
- 足切り通過者のみ面接対象
- ADRの内容を深掘りし、設計判断の妥当性・思考プロセスを確認
- 自動採点では測れない「設計思想の質」をここで評価する
