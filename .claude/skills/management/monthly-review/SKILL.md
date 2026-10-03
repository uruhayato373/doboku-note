---
name: monthly-review
description: 資格別の集客・学習・note/ココナラ販売・運営負担を前月実測で振り返り、重点と目標、次の改善を記録する。Use when user asks to [月次レビュー, 前月の振り返り, 月次事業レビュー, /monthly-review].
domain: strategy
---

## フロー

計測 → ★月次判断 → 月次/週次計画 → 実験 → 再計測。方針の再発明や商品状態の複製はしない。

## 手順

**配線の正本**: このスキルが実行するコマンドは `.claude/config/review-wiring.json` の monthly に段と役割付きで載せる（CI の check-review-wiring が食い違いを止める）。このレビューから起票したカードは本文の起点を「月次レビュー（開始日〜終了日）」で始める。

1. `docs/strategy/01_プロダクト戦略.md` と `config/business-direction.json` を読む。手順・JSON契約は `.claude/knowledge/reference/business-review.md` を読む。
2. `npm run business-review -- report --monthly --json` を実行する。**最初に月の受取額（`netReceipts`）と目標の差を書く**（管理画面トップ＝KPI と同じ集計・ツリーは `docs/strategy/15_KPIツリー.md`）。受取額が未記録なら `npm run record-net-receipts -- --month YYYY-MM --coconala <円> --commit` で記録する（note の手数料控除後売上は自動取得・KDP は確定値・ココナラは売上履歴の控除後を渡す）。原因は目標を割ったチャネルから入口へ降りて探し、資格別の配分は季節（試験日までの距離・前年同期）で読む。既定は前の完了した暦月。対象月指定時は `--start YYYY-MM-01 --end YYYY-MM-DD` で月末まで指定する。既存の同月レビューと次回日を読み、期日前で追加証拠がなければ重複記録しない。
3. 検索は `npm run report-search-opportunities -- --json` でクラスター別（`docs/strategy/16_検索キーワード戦略.md`）の表示・1 桁の検索語数・11〜30 位の検索語数と約 28 日前との差を読み、KPI ツリーの「サイト」の段として書く。起票済みの改善カードの対象語が 28 日後に上がったかを確かめ、上がらなければ検索意図とのずれを見直す。クラスターや受け皿の変更は月次でだけ行い、`config/search-strategy.json` と 16 を同時に直す。
3b. 既存CI計測を優先し、note売上、KDPロイヤリティ、ココナラ分析も確認する。アフィリエイト（転職一本）は `npm run report-buildjob-affiliate`（BuildJob クリック×A8 成果の EPC）と `npm run report-career-funnel`（流入→回遊→CTA→成果）を実行して `data/analysis/{career-funnel,buildjob-report}.md` を読む（実行可能性は quality-audit の `--check` が CI で担保・数字の読み方は `.claude/knowledge/reference/affiliate-operations.md`）。認証済み環境で必要なら `npm run fetch-business-metrics -- --monthly --commit`、`npm run note-traffic-fetch -- --month YYYY-MM --commit`、`npm run note-sales-fetch -- --month YYYY-MM --commit`、`npm run kdp-report -- --month YYYY-MM`、`npm run coconala-analytics -- --append-kpi` を使う。noteは月次アクセスの売上表示と販売明細合計が一致するまでcompleteにしない。KDPは共有口座総額ではなくcatalog対象の書籍別確定値だけを資格別・全体に反映する。ココナラ30日窓は暦月へ換算せず、注文件数・販売額だけを全タブ取引スナップショットから暦月集計する。取得不能・不足は欠測で残す。
   note の商品別は `npm run report-site-to-sales -- --month YYYY-MM` で送客クリック・サイト経由閲覧・販売を並べ、各値の状態（window-mismatch・unresolvable・未解決件数）を欠測のまま読む（読み方は `.claude/knowledge/reference/sales-tracking.md`「月次のサイト送客→売上の突合」）。
4. `npm run exam-ssot-status` で資格の正本（`qualification-registry.json`・`exam-calendar.json`・`exam-stats.json`）の照合状態を読む。要対応（未確認・主担当の原文未照合・最終照合から180日超・展開中資格の次年度日程未登録・統計が古い）は、実施機関の公式ページ・公式PDFを主担当が読んで正本を更新し、`verification`（照合日・checkedBy・unresolved/pending/notPublished）を書き換える。調査担当（サブエージェント）の読み取りだけで checkedBy: self にしない。発表待ち（pending）は発表日を過ぎていれば同様に確認する。更新後は `npm run check-exam-calendar` を通す。出題形式（`exam-formats.json`）の照合状態も同じ表に出る。
   `npm run check-past-exam-inventory` で過去問の年度在庫（`data/pastexams/inventory.json`）を読む。WARN（公式掲載中なのに未取得・次の更新で消える見込み・新年度の掲載見込み・Drive 未退避）は `/past-exam-archive` の手順で公式から取得し、Drive へ退避・照合・登録する。
   続けて `npm run qualification-market` で資格ごとの展開の判断材料（自分で書く区分とその受験者数・買われる時期・売上・競合の混み具合）を読む（管理画面 戦略＞資格と市場＞展開の判断と同じ）。要対応の市場スキャン未取得・90日超は `npm run scan-qualification-market -- --coconala` で取り直す。展開する資格の変更は `qualification-registry.json` の portfolio と `docs/strategy/06_多資格展開戦略.md` の判断記録を同じ commit で直す。
5. `npm run check-content-expansion -- --json` と `.claude/knowledge/reference/content-expansion.md` で、教材の未確認・原典待ち・成果物変更後の再確認を読む。記事数・図数で充足や効果を代用せず、追加制作の必要性を資格別の学習行動・販売・運営負担から判断する。全重点資格の集客、学習、商品別販売、運営時間、教材不備を点検する。試験カレンダーと前年同時期を参照し、同じ期間・定義以外の増減を効果と呼ばない。数字から原因を断定せず、対象の本文・商品説明・導線を読む。
6. `snapshot --monthly --commit` を保存し、`review` の判断・理由・次の一手・実験参照・次回日を記録する。データ不足時はprovisional。重点は最大3件。変更しない判断にも理由を残す。
7. 目標を変える場合は対象資格・指標のcompleteな実測snapshotと理由を `target` 記録へ追記する。数字を仮置きして達成指標にしない。収益・費用・時間から継続/集中/縮小を判断し、重点資格変更は機械SSOTへ反映する。
8. **バックログの関門**: `npm run backlog-gate -- --monthly` で、時期の無い 🟢 を全件（月を付けるか削除する）と、起票から 90 日を超えたカード（残すか削除する）を運営者に諮って台帳を直す。今月の 🔴🟡 の件数が多ければ、中身で選んで来月へ回す（件数の上限は設けない）。
   年間の重点はバックログのカードの `[時期:]` が正本（管理画面 計画 ＞ 年間ロードマップ）。今月・来月の行が現状と合っているかを確かめ、ずれていればカードの `[時期:]` を直す。月間計画（monthly.md）の選択タスクは `[時期:]` が今月を含むカードから選ぶ。時期を過ぎて残るカードは `npm run check-backlog-health` の S15 に出る。月の件数は絞らず、終わったカードは削除し、残りは `npm run roll-backlog-when -- --write` で翌月へ回す（`[時期:]` の終わりを今月へ延ばす）。月次レビューを回し忘れると毎月 3 日以降に `check-monthly-review-due` が SessionStart で知らせる。
8b. **点検と Issue**: `npm run review-checks -- --cadence monthly --run YYYY-MM --write` で月次の点検（`review-wiring.json` の `checks`。`npm run check-workflow-health` ほか）を実行し、開いている GitHub Issue・Dependabot の脆弱性と一緒に回ごとに保存する。失敗・検査不成立の点検と開いている Issue・脆弱性の**全件**を、レポートの「点検と Issue」に `- <コマンド名 or #番号 or dependabot:パッケージ名> 状況 → 振り分け: DN-xxxx / 定常 / 理由` で書く。行き先が無い項目が残る回は「実施できた」にならない（管理画面のレビュー手順が数える）。起票するカードの起点は「月次レビュー（開始日〜終了日）」。復旧済みで開いたままの Issue は閉じる。
9. 改善は既存 `experiments.json` と `/nsm-experiment` へ接続する。running の実験で `next_check_date` が今月内または過去のものは、判定（close/継続の理由）か延長理由のどちらかを `actions` に必ず1行残す。判定せずに日付だけ後ろへずらさない（2026-09 に EXP-008 が再計測前の追加展開で判定を一度も経ずに 9/18→10/20 へ延びた）。SEOは7日観察・同時実験上限・専用判定を保つ。単発実装はbacklog、monthly/weeklyはそのID参照。`npm run check-business-direction` を通し、変更したJSONだけ明示してGitにコミットする。

## 月次レポート（証拠を残す）

判断と根拠を `docs/reviews/monthly/YYYY-MM-review.md`（対象月）に下の形で書く。手順の点検（管理画面 戦略 ＞ レビュー ＞ 月次（`/metrics/business/monthly`）の「今月やること」「手順チェックリスト」「実施履歴」）はこの節の有無で各手順の実施を確かめる。最新の 1 本だけ残し、前月のファイルは未完の申し送りを backlog へ移したうえで削除する（git 履歴が記録を持つ）。

## 出力フォーマット

```markdown
# 月次レビュー YYYY-MM

作成日: YYYY-MM-DD
対象期間: YYYY-MM-01 〜 YYYY-MM-DD

## 受取額と目標
## 検索クラスター
## 販売と送客
## 資格の正本と市場
## 実験の判定
## バックログの関門
## 時期付け
## 点検と Issue
## 来月への申し送り
```

「来月への申し送り」の各項目も末尾に `→ 振り分け: DN-xxxx / 定常 / EXP-xxx` を書く（行き先の無い申し送りは翌月に消える）。

## 報告

前月の実測・欠測、資格別の判断、重点最大3件、目標変更の根拠、次回日と保存先を簡潔に示す。新しい定期タスクは作らず、既存ルーティンから呼び出す。
