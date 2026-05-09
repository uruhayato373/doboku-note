# YT Shorts 01: 冗長化は何種類？

**尺**: 40 秒目安
**公開予定**: 2026-07-08 水 19:30
**元素材**: [source.md](../source.md)

## ナレーション原稿（VOICEVOX 用）

[0-5秒] 問題提起
「冗長化、何種類か答えられますか。」

[5-15秒] 3 種類の紹介
「待機冗長は UPS のように普段は待機。並列冗長は常時並列で稼働。多数決冗長は航空機の 3 重化のように多数決で出力を採用します。」

[15-18秒] 沈黙（考える時間）

[18-30秒] 解説
「答えは 3 種類。冗長性はフォールトトレランス（故障許容設計）の主要な実現手段です。IEC 61508 では SIL3 達成に HFT 1 以上が原則。単一故障でもシステムの安全機能が維持されます。」

[30-40秒] CTA
「並列システム信頼度の計算式や R02 過去問は、概要欄のリンク doboku-note にまとめています。」

## 字幕テキスト（タイミング付き）

| 秒 | 字幕 |
|---|---|
| 0-5 | 冗長化は何種類？ |
| 5-10 | 待機（UPS）／並列（二重化） |
| 10-15 | 多数決（航空機 3 重化） |
| 15-18 | （考える時間） |
| 18-24 | 答え=3 種類 |
| 24-30 | フォールトトレランスの実現手段 |
| 30-40 | doboku-note で詳しく解説 |

## サムネ案

- メイン: 「冗長化は何種類？」
- サブ: 「待機 / 並列 / 多数決」
- 図解: 既存 SVG `redundancy-types.svg` のミニチュア
- 文字大、warn 系背景でインパクト

## スライド指示（slide-render.mjs 用、5 枚構成）

- Slide 1（0-5 秒）: タイトル「冗長化は何種類？」
- Slide 2（5-15 秒）: 3 種類の例（UPS / 二重化 / 3 重化）
- Slide 3（15-18 秒）: 「考える時間」+ 既存 SVG プレビュー
- Slide 4（18-30 秒）: 既存 SVG `redundancy-types.svg` 全面表示 + 「答え=3 種類」
- Slide 5（30-40 秒）: CTA「doboku-note で詳しく」

## 概要欄テンプレ

冗長化は何種類？（技術士総合技術監理部門 安全管理 5.4）

総監で頻出の冗長性。3 種類の動作差、IEC 61508/SIL、並列システム信頼度を 40 秒で整理。

▼ 詳細解説（doboku-note）
https://doboku-note.com/docs/pe-comprehensive-management-redundancy-safety?utm_source=youtube&utm_medium=shorts&utm_campaign=keyword-redundancy-safety

▼ フォールトトレランス
https://doboku-note.com/docs/pe-comprehensive-management-fault-tolerance?utm_source=youtube&utm_medium=shorts&utm_campaign=keyword-redundancy-safety

#技術士 #技術士総監 #総合技術監理 #安全管理 #冗長性 #フォールトトレランス
