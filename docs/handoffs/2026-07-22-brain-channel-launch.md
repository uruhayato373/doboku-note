# Brain 2商品ローンチ（3チャネル展開・審査待ち）

> [!done]
> **2026-07-22 完了**: Brain商品①（施工経験記述キット）②（総監施策バンク）を制作〜検証〜3チャネル展開まで完走。Brain は両商品とも**公開申請済み（審査待ち・原則24h・結果メール）**、ココナラは両商品**ライブ販売中**、note 入口記事2本は公開品質で待機。

## 状態サマリ

| チャネル | ① 経験記述キット | ② 総監施策バンク |
|---|---|---|
| Brain | **申請済 ¥7,980** `/a/b5EDO3UjMgoTZsNWa0JXY` | **申請済 ¥9,800** `/a/b1IDO3UjMgoTZsNWa0JXY` |
| ココナラ | listed ¥3,000（services/4322659） | listed ¥2,500 PDF（services/4322661） |
| note | 入口記事 published:false 待機 | 入口記事 published:false 待機 |

- 納品: Brain=有料エリアの R2 リンク（`storage.doboku-note.com/brain/dist/`・トークン付）で自動／ココナラ=トークルーム手動送付（①=外部URL除去版ZIP `C:\tmp\claude-code-civil-essay-kit-coconala.zip`・②=`.claude/config/coconala/assets/pdf/coconala-sokan-bunseki.pdf`）
- kit リポジトリ（private）: `claude-code-civil-essay-kit`（main=Brain版／coconala-dist=外部URL除去版）・`pe-policy-bank-kit`（main）。いずれも origin 同期済

## このセッションで確立したもの

- **Brain 出品の Playwright 全自動パイプライン**（新規記事→本文→画像→価格→有料ライン→assert→申請確定）。ノウハウと罠は memory `project_brain_civil_essay_kit` に恒久記録（設定はセッション状態・可視テキストassert・確認モーダル2段 等）
- **R6/R7 統制バックテスト**（3レンズ×2年・K=5・outcome非開示）: R6=3/3一致・R7=1/3＝「少数絞りは外れる→K=11幅広備蓄」の定量実証。汚染1件は自己申告→無効化→クリーン再実行。記録=`docs/project/05_プロダクト/brain-r8-policy-prediction-skill/04-backtest-results.md` §6-7
- R2 配布経路: `.claude/config/brain/dist/` + `scripts/upload-brain-dist-r2.mjs` + `r2-brain-dist.yml`（workflow_dispatch）

## 次アクション（→ backlog「Brain 2商品の審査後フォローと販売運用」に登録済）

1. **審査結果メール確認**（両商品）→ 通過: note入口記事2本を手動公開して告知／却下: 指摘対応→再申請
2. カテゴリ「ビジネス」→「資格」変更検討（審査通過後）
3. ココナラ注文が来たら納品オペ・売上は `/record-sales`

> [!warning]
> 削除条件（handoff ライフサイクル）: 両商品の審査結果が確定し、backlog エントリで追跡が回り始めたら本 handoff は削除してよい（知見は memory・検証記録は 04・タスクは backlog に抽出済み）。
