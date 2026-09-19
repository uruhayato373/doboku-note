---
name: monthly-review
description: 資格別の集客・学習・note/ココナラ販売・運営負担を前月実測で振り返り、重点と目標、次の改善を記録する。Use when user asks to [月次レビュー, 前月の振り返り, 月次事業レビュー, /monthly-review].
---

## フロー

計測 → ★月次判断 → 月次/週次計画 → 実験 → 再計測。方針の再発明や商品状態の複製はしない。

## 手順

1. `docs/strategy/01_プロダクト戦略.md` と `.claude/config/business-direction.json` を読む。手順・JSON契約は `.claude/knowledge/reference/business-review.md` を読む。
2. `npm run business-review -- report --monthly --json` を実行する。既定は前の完了した暦月。対象月指定時は `--start YYYY-MM-01 --end YYYY-MM-DD` で月末まで指定する。既存の同月レビューと次回日を読み、期日前で追加証拠がなければ重複記録しない。
3. 既存CI計測を優先し、note売上とココナラ分析も確認する。アフィリエイト（転職一本）は `npm run report-buildjob-affiliate`（BuildJob クリック×A8 成果の EPC）と `npm run report-career-funnel`（流入→回遊→CTA→成果）を実行して `.claude/state/metrics/affiliate/*-latest.md` を読む（実行可能性は quality-audit の `--check` が CI で担保・数字の読み方は `.claude/knowledge/reference/affiliate-operations.md`）。認証済み環境で必要なら `npm run fetch-business-metrics -- --monthly --commit`、`npm run note-sales-fetch -- --month YYYY-MM --commit`、`npm run coconala-analytics -- --append-kpi` を使う。ココナラ30日窓は暦月へ換算しない。noteアクセスは管理画面で対象月・新PV定義を確認し、計測記録として追記する。取得不能・不足は欠測で残す。
4. `npm run check-content-expansion -- --json` と `.claude/knowledge/reference/content-expansion.md` で、教材の未確認・原典待ち・成果物変更後の再確認を読む。記事数・図数で充足や効果を代用せず、追加制作の必要性を資格別の学習行動・販売・運営負担から判断する。全重点資格の集客、学習、商品別販売、運営時間、教材不備を点検する。試験カレンダーと前年同時期を参照し、同じ期間・定義以外の増減を効果と呼ばない。数字から原因を断定せず、対象の本文・商品説明・導線を読む。
5. `snapshot --monthly --commit` を保存し、`review` の判断・理由・次の一手・実験参照・次回日を記録する。データ不足時はprovisional。重点は最大3件。変更しない判断にも理由を残す。
6. 目標を変える場合は対象資格・指標のcompleteな実測snapshotと理由を `target` 記録へ追記する。数字を仮置きして達成指標にしない。収益・費用・時間から継続/集中/縮小を判断し、重点資格変更は機械SSOTへ反映する。
7. 改善は既存 `experiments.json` と `/nsm-experiment` へ接続する。SEOは7日観察・同時実験上限・専用判定を保つ。単発実装はbacklog、monthly/weeklyはそのID参照。`npm run check-business-direction` を通し、変更したJSONだけ明示してGitにコミットする。

## 報告

前月の実測・欠測、資格別の判断、重点最大3件、目標変更の根拠、次回日と保存先を簡潔に示す。新しい定期タスクは作らず、既存ルーティンから呼び出す。
