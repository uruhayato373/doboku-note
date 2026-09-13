---
taskId: DN-0211
type: implementation-plan
createdAt: 2026-09-13
deleteOnComplete: true
---

# CI契約の同期

## 目的・scope
SEO Rank Watch の受入を妨げる既存のCI誤検出を解消する。公開ページの動作は変更しない。

## SSOT・確定設計・対象
現在の src/components/standards と src/app/standards を真実源に e2e/standards.spec.ts の旧UI期待値を改訂する。knip は解析対象外adminが直接importするhast-util-sanitizeのみ、利用箇所を記録してignoreDependenciesに明示する。baselineは増やさない。

## 手順・検証
機関10リンク→文書、テーマ双方向、原典2分冊・ページ範囲、モバイル外側summary、ナビの18節リンクと到達アンカーを実測する。knip-ratchetとCIの全E2Eを成功させる。

## 停止条件・抽出・削除条件
実画面の機能欠落ならテストを弱めず不具合として直す。恒久の解析除外理由はadmin READMEへ抽出し、検証後カード完了とともにこのplanを削除する。

## 起動プロンプト
DN-0211をclaimし、修正と検証を終えてtodo:completeする。
