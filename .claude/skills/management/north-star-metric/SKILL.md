---
name: north-star-metric
description: 資格別の学習価値・集客・販売・運営負担からNSMとKPIの役割を整理し、実測に基づく目標を共通SSOTへ記録する。Use when user asks to [北極星指標, NSM, 重要指標を決めたい, /north-star-metric].
domain: strategy
---

原典: [phuryn/pm-skills](https://github.com/phuryn/pm-skills) (MIT License) のnorth-star-metricを本プロジェクトの事業運用へ適用。

## 手順

1. `docs/strategy/01_プロダクト戦略.md`、`.claude/config/business-direction.json`、`.claude/knowledge/reference/business-review.md` を読む。既存の方向性を毎回ゼロから選び直さない。
2. `npm run business-review -- report --monthly --json` で対象期間・資格別の実測と欠測、過去の目標・レビューを確認する。現値を不明のまま仮置きしない。
3. NSM候補は「顧客価値」「事業の継続性」「先行性」「測定可能性」「操作可能性」「理解しやすさ」「望ましくない最適化を招かないか」で評価する。図や記事の件数、検索1位だけを成功指標にしない。学習行動の測定範囲・重複排除が未整備なら、既存の自然検索人数を集客指標として保持する。
4. 集客→学習→販売→受取/費用/時間の役割を確認し、重点資格・読者課題に結び付ける。販売先のPVと購入、サイト送客は別の集計。NPSを合格率貢献と言わない。
5. 変更が必要な定義は機械SSOTへ反映し、判断理由をプロダクト戦略へ残す。目標は完全な実測snapshotと対象・期間・理由・見直し日を持つtarget記録へ追記する。根拠なく3か月後の数字を約束しない。
6. `npm run check-business-direction` と該当チェックを通し、変更した設定・記録を明示してコミットする。実験は `/nsm-experiment`、レビューは `/weekly-review`・`/monthly-review` へ接続する。

## 報告

どの指標が何を表すか、実測範囲と欠測、変更した定義・目標の根拠、次回日を簡潔に示す。現在値は出典と対象期間を併記する。
