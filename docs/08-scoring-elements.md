# 採点要素一覧（全26軸・各100点満点）

## バックエンド（17軸）

### 依存関係
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_dep_violation` | 依存違反 | madge + dependency-cruiser + ADR | 循環依存と双方向依存の大きい方の件数×25を減点 |
| `be_ext_spread` | 外部依存集中度 | dependency-cruiser + ADR | レイヤー単位のavgSpread。(avgSpread-1.0)×50を減点 |

### 分割度
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_file_count` | ファイル数 | score.js内蔵 | totalFiles/10×100 |
| `be_func_count` | 関数数 | score.js内蔵 | totalFunctions/15×100 |

### 型安全性
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_type_coverage` | 型カバレッジ | type-coverage | 非線形二次関数（K=30） |

### コード品質
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_biome` | Biome lint | Biome recommended | diagnosticsPer1k×5を減点 |
| `be_lint_error` | ESLint error | ESLint recommended + security + n | errorsPer1k×10を減点 |
| `be_lint_warn` | ESLint warn | 同上 | warningsPer1k×3を減点 |

### コード構造
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_avg_func_len` | 平均関数長 | score.js内蔵 | 1000/avgFunctionLength |
| `be_avg_file_len` | 平均ファイル長 | score.js内蔵 | 5000/avgFileLength |

### その他
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `be_cognitive` | 認知的複雑度 | eslint-plugin-sonarjs | 100 - avg×5 - max超過分×3 |
| `be_duplication` | コード重複 | jscpd（リテラル正規化後） | 100 - percentage×5 |
| `be_security` | セキュリティ | Bearer | critPer1k×50 + highPer1k×25を減点 |
| `be_perf_get` | GETパフォーマンス | k6 | 5000/p95_ms |
| `be_perf_post` | POSTパフォーマンス | k6 | 5000/p95_ms |
| `be_concurrency` | ダブルブッキング防止 | k6（50VU同時POST） | 成功1件=100、2件以上=0 |

---

## フロントエンド（9軸）

### 依存関係
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_dep_violation` | 依存違反 | madge + dependency-cruiser + ADR | 件数×25を減点 |

### 分割度
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_file_count` | ファイル数 | score.js内蔵 | totalFiles/10×100 |
| `fe_func_count` | 関数数 | score.js内蔵 | totalFunctions/15×100 |

### 型安全性
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_type_coverage` | 型カバレッジ（.tsのみ） | type-coverage | 非線形K=30。.tsなし=0 |

### コード品質
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_biome` | Biome lint | Biome recommended | diagnosticsPer1k×5を減点 |
| `fe_lint_error` | ESLint error | ESLint recommended | errorsPer1k×10を減点 |
| `fe_lint_warn` | ESLint warn | 同上 | warningsPer1k×3を減点 |

### コード構造
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_avg_func_len` | 平均関数長 | score.js内蔵 | 1000/avgFunctionLength |
| `fe_avg_file_len` | 平均ファイル長 | score.js内蔵 | 5000/avgFileLength |

### その他
| ID | 軸 | ツール | 算出方法 |
|---|---|---|---|
| `fe_cognitive` | 認知的複雑度 | eslint-plugin-sonarjs | 100 - avg×5 - max超過分×3 |
| `fe_duplication` | コード重複 | jscpd（リテラル正規化後） | 100 - percentage×5 |

---

## AI（サブエージェント）実装のスコア

### バックエンド

| カテゴリ | ID | 軸 | AIスコア | 差が出るか | 理由 |
|---|---|---|---|---|---|
| 依存関係 | `be_dep_violation` | 依存違反 | 100 | ✕ | シンプルなら違反しない |
| 依存関係 | `be_ext_spread` | 外部依存集中度 | **84** | ◯ | honoが2レイヤーに漏れている |
| 分割度 | `be_file_count` | ファイル数 | **40** | ◎ | 4/10ファイル |
| 分割度 | `be_func_count` | 関数数 | **33** | ◎ | 5/15関数 |
| 型安全性 | `be_type_coverage` | 型カバレッジ | **42** | ◎ | 86%（DTO未定義、pgのany） |
| コード品質 | `be_biome` | Biome lint | **45** | ◎ | noGlobalIsNan、useTemplate等 |
| コード品質 | `be_lint_error` | ESLint error | 100 | ✕ | AIはESLint違反を出さない |
| コード品質 | `be_lint_warn` | ESLint warn | 100 | ✕ | 同上 |
| コード構造 | `be_avg_func_len` | 平均関数長 | 100 | △ | 関数自体は短い（10行） |
| コード構造 | `be_avg_file_len` | 平均ファイル長 | **74** | ◯ | 214行のファイルがある |
| その他 | `be_cognitive` | 認知的複雑度 | 100 | △ | 分岐少ない（avg 4.3） |
| その他 | `be_duplication` | コード重複 | **35** | ◎ | 13%（エラーレスポンス共通化なし） |
| その他 | `be_security` | セキュリティ | 100 | ✕ | 小コードで検出0 |
| その他 | `be_perf_get` | GETパフォーマンス | **0** | ◎ | 未計測（要アプリ起動） |
| その他 | `be_perf_post` | POSTパフォーマンス | **0** | ◎ | 同上 |
| その他 | `be_concurrency` | ダブルブッキング防止 | **0** | ◎ | 同上 |

### フロントエンド

| カテゴリ | ID | 軸 | AIスコア | 差が出るか | 理由 |
|---|---|---|---|---|---|
| 依存関係 | `fe_dep_violation` | 依存違反 | 100 | ✕ | シンプルなら違反しない |
| 分割度 | `fe_file_count` | ファイル数 | **40** | ◎ | 4/10ファイル |
| 分割度 | `fe_func_count` | 関数数 | **20** | ◎ | 3/15関数 |
| 型安全性 | `fe_type_coverage` | 型カバレッジ | **0** | ◎ | .tsファイルなし |
| コード品質 | `fe_biome` | Biome lint | **34** | ◎ | useButtonType、useTemplate等 |
| コード品質 | `fe_lint_error` | ESLint error | 100 | ✕ | AIはESLint違反を出さない |
| コード品質 | `fe_lint_warn` | ESLint warn | 100 | ✕ | 同上 |
| コード構造 | `fe_avg_func_len` | 平均関数長 | **16** | ◎ | 64行の巨大コンポーネント |
| コード構造 | `fe_avg_file_len` | 平均ファイル長 | **53** | ◯ | 分割不足 |
| その他 | `fe_cognitive` | 認知的複雑度 | 100 | △ | 分岐少ない |
| その他 | `fe_duplication` | コード重複 | **90** | ◯ | 2%（正規化後） |

### サマリー

- **差が出る軸（◎◯）**: 16/26
- **差が出ない軸（✕△）**: 10/26
- **AI最終スコア**: 54.71/100（仮ウェイト。パフォーマンス系3軸が未計測で0点）
