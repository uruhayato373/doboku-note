---
name: gsc-review
category: management
description: >
  週次 GSC index coverage を gsc-index-auditor で診断し、gsc-management.md の観測・判断ログへ判断つきで追記する。Use when user asks to [GSC月次レビュー, index coverage確認, インデックス率, /gsc-review].
user-invocable: true
domain: site
---

月次の GSC **index coverage** レビューを回すオーケストレータ。「サイトの何割が Google に登録され、未登録の原因は何か」を継続管理する。設計・閾値・判断マトリクスの真実源は [.claude/knowledge/reference/gsc-management.md](../../knowledge/reference/gsc-management.md)。

## いつ使うか

> [!important] 通常は土曜の Mac が自動で記録する（2026-10-25〜。それまでは CI の gsc-auto-review.yml）
> 週次レビューの前段の GSC の記録層（`scripts/scheduled/weekly-review.sh` の run_gsc_record・DN-0849）が、未記録の inspection-batch を見つけると
> `gsc-index-auditor` を起動し観測ログへ `### YYYY-MM-DD（月次・自動レビュー）` を自動追記する。
> **本スキルは応急・深掘り・上書き用**＝①月初から土曜を待たずに見たい ②自動エントリの判断を
> 人が上書きしたい ③ 土曜の GSC の記録層が失敗・沈黙した（`npm run check-gsc-auto-review` が DUE / `automation-failure`
> Issue が立った）とき。自動エントリと同日付で手動エントリを足してよい（append-only）。

- `index-coverage.yml`（CI・週次。水曜 JST 11:00 に周回を始め、1 日 1,900 件を超えた分は木・金に続け、全件そろった回だけ履歴に積む）の後。ふだんは土曜の Mac の記録層が自動で記録するので、これは応急・深掘り用
- index coverage の急変を疑うとき

> performance（impressions/CTR/順位の改善候補）は守備範囲外＝`/weekly-improve`（`metrics-analyzer`）へ。本スキルは coverage 専任。

## 前提（計測は CI 供給が正）

ローカルで GSC API を叩かない（creds 未設定・会社 PC はプロキシ遮断。`measurement-incidents.md` 2026-06-05）。本スキルは **CI がコミット済みのスナップショットを読む**だけ。最新が無い/古いときは「`index-coverage.yml` を `workflow_dispatch` で回してから再実行」と案内する。

## 手順

1. **データ確認**
   - `data/gsc/url-inspection/` の最新ファイルの日付を確認
   - `data/gsc/index-coverage.json` の最新エントリ日付を確認
   - 最新の完了した batch が 8 日より古ければ、直近 run の検査件数と publish 成否を確認し、CI 未実行・周回未完了・保存失敗を区別する。必要なら `gh workflow run index-coverage.yml`（mode=auto で続きを検査）を案内（実行はユーザー判断）

2. **診断（gsc-index-auditor を起動）**
   - サブエージェント `gsc-index-auditor` を呼ぶ（最新 batch と history を読ませる）
   - 返ってくる診断（indexed_ratio・前回差分・原因バケット・hygiene URL・データ健全性フラグ）を受け取る

3. **観測・判断ログ追記の下書き提示**
   - `.claude/knowledge/reference/gsc-management.md` 末尾の「観測・判断ログ」セクションに追記する Markdown 下書きを作る（日付・数値・診断・**推奨アクション**）
   - 数値は history.json を引用。原因バケットは auditor の判定を踏襲

4. **ユーザー判断 → 確定**
   - ユーザーが「何を打ち手にするか（被リンク獲得 / コンテンツ統合 / 量の抑制 / hygiene 即修正 / 様子見）」を決める
   - 決定を加えて `gsc-management.md` の観測・判断ログへ Edit で追記（人間の意思決定記録）
   - hygiene の 404/redirect は具体タスクとして `.claude/todo/` へ起票を提案

## 月次の画面の実査（4 項目・月 1 回）

API と CI の記録で取れない 4 項目は、月次レビューの前に GSC の画面で読み、観測・判断ログへ 1 エントリにまとめる（2026-11-11 の実査で、判断を変えた材料はこの 4 つだった）。
画面の操作はトークンが高くつくので、この 4 つ以外は画面で読まない（検索の数字・未登録の理由別 URL は `data/gsc/` の記録で足りる）。ブラウザの操作は Sonnet に任せてよい。

1. **メッセージ**（右上のベル）: 前回の実査より新しいものの種類と件数。「インデックスに登録されない新しい要因」は本文の要因名まで読む（意図した robots・noindex の結果なら想定どおりと書く）
2. **生成 AI 機能のパフォーマンス**（検索パフォーマンス → 「Google 検索の生成 AI 機能…」のレポート・28 日）: ページ別の表示の上位 10。ページ全体の表示に占める割合が大きく CTR が低いページは、週次の `topLowCtr` と合わせて題名の実験の向きを決める
3. **リンク**: 外部リンクの合計・上位のリンク元サイト。**note.com・x.com 以外のリンク元サイト数**を 1 行で残す（DN-0418 の被リンクの声かけの効果判定。2026-11-11 時点で 0）
4. **クロールの統計情報**（設定 → クロールの統計情報）: 平均応答時間・応答別の割合（200・301・404）。301 が 3 割を超えたら旧 URL の内部リンクの残りを疑う

見出しは `### YYYY-MM-DD（月次・画面の実査）`。2 回まわして、読んで判断が変わらなかった項目は手順から外す。判断が変わった項目は、画面の取得（`gsc-local-routine` の月次の CSV）へ足すかを決める（先に自動化しない）。

## 出力

- 会話内に diagnosis サマリー
- `.claude/knowledge/reference/gsc-management.md` の観測・判断ログへ 1 エントリ追記（ユーザー承認後）
- 必要なら `.claude/todo/` に hygiene 修正タスク

## 深掘り（理由別の例 URL が要るとき）

本スキルは CI（API/sitemap）データで coverage 全体を診断する。**「クロール済み-未登録」等の理由ごとに
どの URL がそうなっているか**は API では取れない（GSC UI のみ）。同月内に `/google-search-growth`
（ローカル・要 Google ログイン）を併走すると、理由別 UI CSV を取得して API データと URL 突合し、
修正アクション（FIX_TECHNICAL / REDIRECT_LEGACY / CONSOLIDATE / NOINDEX 候補）へ分類できる。
期限は `check-gsc-ui-due` を weekly-review が surface。両者は同じ観測・判断ログを共有。
判定は日数だけではない＝**最後の完全取得（`lastComplete`）から 30 日**、または
**直近の実行が不完全（`lastAttempt.complete !== true`）**のいずれかで DUE（2026-07-30 改訂）。

## やらないこと

- GSC データの取得（CI の責務）／history.json への追記（CI の `append-coverage-history.mjs`）
- 理由別 UI CSV の取得（`/google-search-growth`＝ローカル手動・月次）
- performance / CWV の分析（`/weekly-improve` / `performance-auditor`）
- 修正の自動実施（ユーザー判断 + 各 Generator）

## 参照

- `.claude/knowledge/reference/gsc-management.md` — GSC 管理 SSOT（分業/閾値/判断マトリクス/観測ログ）
- `.claude/agents/gsc-index-auditor.md` — 診断 Evaluator（本スキルが起動）
- `.github/workflows/index-coverage.yml` — 週次取得 CI（周回・DN-0825）
- `.claude/skills/weekly-improve/SKILL.md` — performance 側（直交・補完）
