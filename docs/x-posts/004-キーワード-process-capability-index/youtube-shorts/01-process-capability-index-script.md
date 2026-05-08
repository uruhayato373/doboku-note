# YT Shorts 01: 工程能力指数 Cp と Cpk の違い

**尺**: 40 秒目安
**公開予定**: 2026-05-04 月 19:30
**元素材**: [source.md](../source.md)

## ナレーション原稿（VOICEVOX 用）

[0-5秒] 問題提起
「総監択一で頻出、工程能力指数の Cp と Cpk、違いを言えますか。」

[5-15秒] 計算式の紹介
「Cp は規格幅 USL マイナス LSL を 6σ で割った値。Cpk は中心ずれを考慮し、上限側と下限側の距離を 3σ で割った小さい方を採用します。」

[15-18秒] 沈黙（考える時間）

[18-23秒] 答え発表
「ポイントは、必ず Cp は Cpk 以上になることです。」

[23-35秒] 解説
「中心が規格中央にあるとき Cp と Cpk は等しくなります。中心がずれていくほど Cpk だけが小さくなります。だから実務では Cpk が、実質的な工程能力を示す指標として重視されます。管理目標は Cp 1.33 以上が一般的です。」

[35-40秒] CTA
「3σ 則の根拠や計算例の詳細は、概要欄のリンク doboku-note にまとめています。」

## 字幕テキスト（タイミング付き）

| 秒 | 字幕 |
|---|---|
| 0-5 | Cp と Cpk の違い |
| 5-10 | Cp = (USL - LSL) / 6σ |
| 10-15 | Cpk = min((USL - x̄)/3σ, (x̄ - LSL)/3σ) |
| 15-18 | （考える時間） |
| 18-23 | 必ず Cp ≧ Cpk |
| 23-29 | 中心一致 → Cp = Cpk |
| 29-35 | 中心ずれ → Cpk が小さくなる |
| 35-40 | doboku-note で詳しく解説 |

## サムネ案

- メイン: 「Cp と Cpk の違い」+ 計算式の対比
- サブ: 「総監 2.2 品質の管理」
- 図解: ベル曲線 2 つ（中心一致 vs 中心ずれ）を左右配置
- 文字大、brand-fill 背景（#e8f0fe）で視認性最優先
- アクセント: positive #3a7d44 で「Cp ≧ Cpk」を強調

## スライド指示（slide-render.mjs 用、5 枚構成）

- Slide 1（0-5 秒）: タイトル「工程能力指数 Cp と Cpk の違い」
- Slide 2（5-15 秒）: 計算式の対比（Cp / Cpk を上下に配置）
- Slide 3（15-23 秒）: 「必ず Cp ≧ Cpk」の強調 + 既存 SVG `normal-distribution-3sigma.svg` を背景透過
- Slide 4（23-35 秒）: 中心一致 vs 中心ずれの 2 ベル曲線比較図
- Slide 5（35-40 秒）: CTA「doboku-note で詳しく」+ サイト URL

## 概要欄テンプレ

工程能力指数 Cp と Cpk の違い（技術士総合技術監理部門 経済性管理 2.2）

総監択一で頻出の工程能力指数。Cp と Cpk の計算式の違い、中心ずれが Cpk を下げる理由を 40 秒で整理。3σ 則の根拠もチェック。

▼ 詳細解説（doboku-note）
https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=youtube&utm_medium=shorts&utm_campaign=keyword-process-capability-index

▼ 経済性管理ピラー（5 管理の俯瞰）
https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar?utm_source=youtube&utm_medium=shorts&utm_campaign=keyword-process-capability-index

#技術士 #技術士総監 #総合技術監理 #品質管理 #工程能力指数 #Cp #Cpk #SQC
