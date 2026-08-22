# quality-cycle テンプレート: cem（技術士総合技術監理）

> **真実源**: 採点ルーブリック詳細・拡張パターンは下記の方針 md（Obsidian 可視）。本ファイルは運用スペック（パス・state ファイル・スクリプト）のみ。
>
> - 採点: [`docs/project/02_コンテンツ/02_採点ルーブリック方針.md`](../../../../../docs/project/02_コンテンツ/02_採点ルーブリック方針.md)
> - リライト: [`docs/project/02_コンテンツ/03_リライト方法論方針.md`](../../../../../docs/project/02_コンテンツ/03_リライト方法論方針.md)

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
- **Generator**: `keyword-rewriter` エージェント（拡張パターン **A-H** 適用、H=標準テキスト由来事実取り込み）

## 採点フロー（2026-05-26 改訂、9 ステップ）

- Step 0: キーワード類型判定（現場運用/歴史政策/法令制度/概念理論）— 詳細は `cem-qa.md`「キーワード類型タクソノミ」
- Step 0.5: description boilerplate 除外（「5管理トレードオフ・過去問演習リンク付き」等は contract 対象外）
- Step 0.7: インライン出典チェック（§22、lint カテゴリ 14 / 14R）。factual table・段落直下に **footer に無い固有一次ソース**の `<Callout type="reference" title="出典">` がなければ追加提案（14）。逆に **footer と URL 完全重複**のインライン出典は冗長として削除提案（14R）
- Step 1-7: 既存 lint・5軸採点フロー（[02_採点ルーブリック方針.md](../../../../../docs/project/02_コンテンツ/02_採点ルーブリック方針.md) 参照）

## リライト閾値（2026-05-26 改訂）

「weighted < 2.5 **または** いずれかの軸が ≤ 1 点」がリライト推奨対象。境界ケース（=2.5 で mobile=1 等の HIGH 違反保有）を取りこぼさない。

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

## 実行スクリプト

エントリ: `scripts-cem/quality-cycle.mjs`

```bash
# 全件評価
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode score

# 章別評価（§6.1 等の特定セクション、2026-05-26 追加）
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode score --section 6.1

# リライト（5 件）
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode rewrite --threshold 2.5 --max 5

# 章別リライト
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode rewrite --section 6.1 --threshold 2.5

# スコア集約
node .claude/skills/quality/quality-cycle/scripts-cem/merge-scores.mjs /tmp/cem-score-results.json

# リライト履歴記録
node .claude/skills/quality/quality-cycle/scripts-cem/log-rewrite.mjs /tmp/cem-rewrite-results.json
```

弱点軸 → 推奨拡張パターン A-G の選択ロジックは `scripts-cem/quality-cycle.mjs` の `pickPatterns()` に実装済み（真実源は [03_リライト方法論方針.md](../../../../../docs/project/02_コンテンツ/03_リライト方法論方針.md)）。

## 注意事項

- **人間レビュー必須**: AI リライト後は `reviewStatus: needs-review`。`approved` への変更は人間のみ
- **バッチ分割コミット**: 690 件を 1 コミットにまとめない。5 件ずつコミット推奨（AI 生成シグナル対策）
- **改行コード**: リライト時は必ず `.claude/scripts/lib/mdx-io.mjs` 経由（CRLF 保持）
