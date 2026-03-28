# フロントエンド評価

## 評価軸一覧

| # | 軸 | 配点 | ツール | 誤検知 | 重み |
|---|---|---|---|---|---|
| 1 | 型安全性 | 中 | tsc + type-coverage + ESLint | 極低〜低 | 厚め |
| 2 | コード品質 | 中 | ESLint (recommended) | 低 | 厚め |
| 3 | コード重複 | 中 | jscpd | ほぼゼロ | 厚め |
| 4 | 依存方向 | 小 | dependency-cruiser | 極低 | 厚め |
| 5 | Next.js / React ベストプラクティス | 小 | @next/eslint-plugin-next + react + react-hooks + jsx-a11y | 低 | 薄め |
| 6 | Lighthouse | 小 | Lighthouse CI | ゼロ | 薄め |
| 7 | バンドルサイズ | 小 | size-limit | ゼロ | 薄め |

---

## 1. 型安全性

バックエンドと同一の方法（tsc + type-coverage + ESLint @typescript-eslint）。
採点用tsconfig（strict: true強制）でフロントエンドのソースに対して実行。

### コマンド
```bash
npx type-coverage --project configs/tsconfig.frontend.scoring.json --json --at-least 0 > reports/frontend-type-coverage.json
```

---

## 2. コード品質

バックエンドと同一の方法（ESLint recommended）。
フロントエンドのソースに対して実行。

### コマンド
```bash
npx eslint src/frontend/ --ext .tsx,.ts \
  -c configs/eslint-frontend-quality.cjs \
  -f json -o reports/frontend-lint.json
```

---

## 3. コード重複

### 目的
コピペコードの検出

### ツール
jscpd

### コマンド
```bash
npx jscpd src/frontend/ --reporters json --output reports/ --min-lines 5 --min-tokens 50
# → reports/jscpd-frontend.json
```

### スコア
```
score = MAX_SCORE - (duplication_percentage × W_duplication)
```

---

## 4. 依存方向

### 目的
フロントエンド内部の責務分離を確認

### ツール
dependency-cruiser

### 方法
バックエンドと同様、ADR-000のモジュール宣言からフロントエンド側のモジュール境界を読み取り、
循環依存 + 双方向依存で層の質を測定。

### コマンド
```bash
npx depcruise --config configs/depcruise-frontend.cjs --output-type json src/frontend/ > reports/frontend-deps.json
```

### スコア
```
score = MAX_SCORE - (circular_count × W_fe_circular) - (bidirectional_count × W_fe_bidirectional)
```

---

## 5. Next.js / React ベストプラクティス

### 目的
Next.js・React・アクセシビリティのベストプラクティスへの準拠度を評価。
FW固有のBPなので配点は小さめ（求めるのは特定FW特化人材ではなくどのFWにも対応できる人材）。

### ツール
4つのESLintプラグインを組み合わせ:

**@next/eslint-plugin-next（~18ルール）— Next.js固有**
| ルール例 | 検出内容 |
|---|---|
| `@next/next/no-img-element` | `<img>`ではなくnext/Image使え |
| `@next/next/no-html-link-for-pages` | `<a>`ではなくnext/Link使え |
| `@next/next/no-sync-scripts` | `<script>`ではなくnext/Script使え |

**eslint-plugin-react（~100+ルール）— Reactパターン**
| ルール例 | 検出内容 |
|---|---|
| `react/no-unstable-nested-components` | コンポーネント内でのコンポーネント定義 |
| `react/jsx-no-constructed-context-values` | Context valueのインライン生成 |
| `react/jsx-no-leaked-render` | `&&`による意図しないレンダリング |
| `react/no-array-index-key` | 配列indexをkeyに使用 |

**eslint-plugin-react-hooks（2ルール）— hooks**
| ルール | 検出内容 |
|---|---|
| `react-hooks/rules-of-hooks` | hooks呼び出しルール違反 |
| `react-hooks/exhaustive-deps` | useEffect等の依存配列不備 |

**eslint-plugin-jsx-a11y（~30+ルール）— アクセシビリティ**
| ルール例 | 検出内容 |
|---|---|
| `jsx-a11y/alt-text` | img要素のalt属性不足 |
| `jsx-a11y/anchor-is-valid` | 無効なアンカーリンク |
| `jsx-a11y/click-events-have-key-events` | クリックイベントにキーボード操作なし |

### コマンド
```bash
npx eslint src/frontend/ --ext .tsx,.ts \
  -c configs/eslint-frontend-bp.cjs \
  -f json -o reports/frontend-bp.json
```

### スコア
```
score = MAX_SCORE - (error_count × W_fe_bp_error) - (warning_count × W_fe_bp_warn)
```

---

## 6. Lighthouse

### 目的
フロントエンドのランタイム品質（Performance, Accessibility, Best Practices）を実測

### ツール
Lighthouse CI

### コマンド
```bash
npx lhci collect --url=http://localhost:3000 --numberOfRuns=3
npx lhci upload --target=filesystem --outputDir=reports/lighthouse/
node scripts/extract-lighthouse.js reports/lighthouse/ > reports/lighthouse.json
```

### 出力例
```json
{
  "performance": 85,
  "accessibility": 92,
  "bestPractices": 100,
  "seo": 78
}
```

### スコア
```
score = performance × W_lh_perf + accessibility × W_lh_a11y + bestPractices × W_lh_bp
```

### 注意点
- Docker内でのスコアは実機と異なる場合がある → `numberOfRuns=3` で中央値を取る
- URLは `http://localhost:3000` 固定（受験者への制約）

---

## 7. バンドルサイズ

### 目的
フロントエンドの配信サイズを客観的に測定

### ツール
size-limit

### コマンド
```bash
npx next build src/frontend/
node scripts/measure-bundle-size.js > reports/bundle-size.json
```

### スコア
```
score = f(totalSizeKB)   # 小さいほど高スコア。連続値。
```
