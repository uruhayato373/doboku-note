---
taskId: DN-0210
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# SEO Rank Watch

## 目的・scope
既存記事の検索需要に応える改善を1回1キーワードで運用する。noindex・サイト構造・本番公開は既存の承認経路を維持する。

## SSOT・確定設計
監視設定は .claude/config/seo-watchwords.json。順位履歴は既存の .claude/state/metrics/gsc/ 配下へ追記。改善状態は .claude/state/experiments.json の既存ライフサイクルから導出する。新たな同内容の台帳を作らない。
GSC の PT・両端包含・final データで取得し、前後の非重複7日を比較。反映日を除く完全な7日から観察し、欠測・小標本は14/28日へ延長。同一ページの観察中は変更を拒否する。

## 対象・手順
scripts の取得/判定/記録/ガード、既存 GSC fetcher、admin /metrics、fetch-metrics CI、weekly-improve・nsm-experiment・関連手順を更新する。実データから少数の監視対象を選び、初回測定する。

## 検証・停止条件
日付の包含/DST、欠測、クールダウン、1回1件、履歴追記、展開未確認時の拒否を node:test で検証。admin 型検査と表示確認。認証失敗は秘密を表示せず止める。判定に足りるデータが無い場合は改善しない。

## 抽出先・削除条件
恒久ルールを seo-rank-watch reference と既存スキルへ抽出。すべての検証後、カード完了と同時にこの計画を削除する。

## 起動プロンプト
DN-0210 を claim し、上記の実装・検証・抽出後 todo:complete を実行する。
