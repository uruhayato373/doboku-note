# quality-cycle テンプレート: cem（技術士総合技術監理）

## 対象

- **カテゴリ**: `pe-comprehensive-management`
- **対象ファイル**: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`
- **対象件数**: ~690 件（キーワードページ）

## state ファイル

| 用途 | パス |
|---|---|
| 評価スコア | `.claude/state/quality-scores.json` |
| 状態遷移履歴 | `.claude/state/quality-cycle-state.json` |
| 機械的スクリーニング | `.claude/state/mechanical-screen.json` |
| Flagship 100 | `.claude/state/flagship-100.json` |

## Evaluator / Generator

- **Evaluator**: `cem-qa` エージェント（5 軸ルーブリック）
- **Generator**: `keyword-rewriter` エージェント（バルクリライト）

## モード

| モード | 役割 | 対象 |
|---|---|---|
| `screen` | 機械的スクリーニング | 690 件全件から初回絞り込み |
| `flagship` | Flagship 100 件の手動選定 | 重点的にリライトする 100 件 |
| `score` | 全件 Evaluator 評価 | 対象全件（既評価はキャッシュ） |
| `rewrite` | weighted < threshold をリライト | threshold 既定 2.5 |
| `verify` | リライト後を再評価 | `needs-review` ステータス |
| `review` | 人間レビュー待ちリスト出力 | `reviewStatus: needs-review` |
| `report` | ダッシュボード出力 | 全件 |
| `issue` | umbrella issue draft 生成 | リライト候補 |

## 5 軸ルーブリック（詳細）

真実源: `docs/reference/content-principles.md` + `.claude/agents/cem-qa.md`

| 軸 | 重み | 合格基準（2 点） |
|---|---|---|
| **構造** | 30% | frontmatter 完備、`とは→サブ節→総合技術監理における位置づけ→参考資料` の順序 |
| **モバイル視認性** | 25% | lint-mdx-mobile カテゴリ 1/6/8 違反、セル 15 字以内、導入文あり |
| **コンテンツ原則** | 20% | §5・§7 準拠、ExamPoint 1-2 個、Callout 視覚分離 |
| **参考資料** | 15% | §9 準拠、公的＋民間 各 1 件以上、WebFetch 確認済み |
| **関連付け** | 10% | section 一致、インラインリンク双方向、法令 e-Gov リンク |

**加重スコア**: `structure×0.30 + mobile×0.25 + principle×0.20 + reference×0.15 + linking×0.10`
- 合格: weighted ≥ 2.0
- リライト候補: weighted < 2.5
- 0 軸があれば weighted を 1.0 にクランプ

## 実行スクリプト

エントリ: `scripts-cem/quality-cycle.mjs`

```bash
# 全件評価
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode score

# リライト（5 件）
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode rewrite --threshold 2.5 --max 5

# スコア集約
node .claude/skills/quality/quality-cycle/scripts-cem/merge-scores.mjs /tmp/cem-score-results.json

# リライト履歴記録
node .claude/skills/quality/quality-cycle/scripts-cem/log-rewrite.mjs /tmp/cem-rewrite-results.json
```

## 拡張パターン（keyword-rewriter が適用）

| ID | パターン | 対象軸 |
|---|---|---|
| M | モバイル視認性修正（表 → 階層化箇条書き）| mobile |
| P | コンテンツ原則修正（ExamPoint 数・配置、Callout 視覚分離）| principle |
| R | 参考資料節補完（公的＋民間 WebSearch→WebFetch）| reference |
| L | 関連付け補強（インラインリンク、法令 e-Gov）| linking |
| S | 構造整理（frontmatter、セクション順序）| structure |

1 ページ最大 2 パターン、優先度 M > P > R > L > S。

## 注意事項

- **人間レビュー必須**: AI リライト後は `reviewStatus: needs-review`。`approved` への変更は人間のみ
- **バッチ分割コミット**: 690 件を 1 コミットにまとめない。5 件ずつコミット推奨（AI 生成シグナル対策）
- **改行コード**: リライト時は必ず `.claude/scripts/lib/mdx-io.mjs` 経由（CRLF 保持）

## 参照

- `.claude/agents/cem-qa.md` — Evaluator の真実源
- `.claude/agents/keyword-rewriter.md` — Generator の真実源
- `docs/reference/content-principles.md` — 品質ルールの真実源
- `.claude/skills/authoring/keyword-page/SKILL.md` — キーワードページの作成規約
- `docs/reference/content-authoring.md` — MDX 実装規約
