# quality-cycle テンプレート: civil-textbook（1級土木施工管理）

## 対象

- **カテゴリ**: `civil-construction-1`
- **対象ファイル**:
  - textbook: `.local/r2/posts/civil-construction-1/textbook/**/*.mdx`
  - guide: `.local/r2/posts/civil-construction-1/guide/**/*.mdx`
- **対象件数**: ~40 件

## state ファイル

| 用途 | パス |
|---|---|
| 評価スコア | `.claude/state/civil-quality-scores.json` |
| 状態遷移履歴 | `.claude/state/civil-quality-cycle-state.json` |

※ screen/flagship モードは使わないため mechanical-screen / flagship ファイルなし。

## Evaluator / Generator

- **Evaluator**: `civil-construction-review` エージェント（PDF 照合なし、5 軸校正）
- **Generator**: `civil-textbook-rewriter` エージェント（バルクリライト）

**PDF 照合は別系統**: 初回変換直後の PDF 原本照合は `civil-construction-qa` が担当（`/improve-article --mode verify`）。本プロファイルは「変換済み既存 MDX の継続的な品質向上」に特化。

## モード

対象件数が少ない（40 件）ため、CEM 版から `screen` / `flagship` を省略した 4 モード + `report` + `issue`。

| モード | 役割 |
|---|---|
| `score` | Evaluator で全 40 件評価（既評価はキャッシュ） |
| `rewrite` | weighted < threshold をリライト |
| `verify` | リライト後を再評価 |
| `review` | 人間レビュー待ちリスト出力 |
| `report` | ダッシュボード出力 |
| `issue` | GitHub umbrella issue draft 生成 |

## 5 軸ルーブリック（詳細）

真実源: `.claude/agents/civil-construction-review.md`

| 軸 | 重み | 合格基準（2 点） |
|---|---|---|
| **構造** | 20% | frontmatter 必須 6 項目、H2/H3 階層整合、`/check-mdx --rules syntax` OK |
| **テキスト原則** | 20% | content-principles §1-5,7 準拠（絵文字なし、太字 ≤30 字、1 文 1 段落）|
| **モバイル視認性** | 30% | lint-mdx-mobile HIGH/MEDIUM ゼロ、4 列以上表なし、3 列表セル ≤15 字 |
| **図表の適切性** | 15% | `<ArticleImage>` 使用、caption 帰属情報 ≤60 字、alt ≤80 字、出典コメント |
| **参考資料・関連付け** | 15% | `/check-mdx --rules links` OK、公的＋民間両方、e-Gov 法令リンク、過去問バックリンク（guide 時） |

**加重スコア**: `structure×0.20 + principle×0.20 + mobile×0.30 + figures×0.15 + reference×0.15`
- 合格: weighted ≥ 2.0
- リライト候補: weighted < 2.5
- 0 軸があれば weighted を 1.0 にクランプ

## 実行スクリプト

エントリ: `scripts-civil-textbook/civil-textbook-cycle.mjs`

```bash
# 全 40 件評価
node .claude/skills/quality/quality-cycle/scripts-civil-textbook/civil-textbook-cycle.mjs --mode score

# リライト（5 件）
node .claude/skills/quality/quality-cycle/scripts-civil-textbook/civil-textbook-cycle.mjs --mode rewrite --threshold 2.5 --max 5

# スコア集約
node .claude/skills/quality/quality-cycle/scripts-civil-textbook/merge-scores.mjs /tmp/civil-score-results.json
```

## 拡張パターン（civil-textbook-rewriter が適用）

| ID | パターン | 対象軸 |
|---|---|---|
| G | モバイル視認性修正（表 → 階層化箇条書き）| mobile |
| I | 画像コンポーネント移行（`<img>` → `<ArticleImage>`）| figures |
| R | 参考資料節補完 | reference |
| B | 過去問バックリンク追加（guide 限定）| principle/figures (guide) |
| S | 構造整理（frontmatter 補完・階層修正）| structure |
| P | テキスト原則修正（絵文字削除、太字スコープ、段落分割）| principle |

1 ページ最大 2 パターン、優先度 G > I > R > B > P > S。

## 注意事項

- **人間レビュー必須**: AI リライト後は `reviewStatus: needs-review`
- **バッチ分割コミット**: 5 件ずつコミット推奨
- **改行コード**: `.claude/scripts/lib/mdx-io.mjs` 経由で書き込み
- **PDF 照合は別系統**: 網羅率 95% 検証は `/improve-article --mode verify` で実施（本サイクルには含まない）

## 参照

- `.claude/agents/civil-construction-review.md` — Evaluator の真実源
- `.claude/agents/civil-textbook-rewriter.md` — Generator の真実源
- `.claude/agents/civil-construction-qa.md` — PDF 照合 Evaluator（別系統）
- `.claude/knowledge/reference/content-principles.md` — 品質ルールの真実源
- `.claude/knowledge/reference/content-authoring.md` — MDX 実装規約
