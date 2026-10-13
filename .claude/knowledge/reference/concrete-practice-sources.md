---
title: コンクリートの実務シリーズで確かめた一次資料（執筆担当が引く）
---

# コンクリートの実務シリーズで確かめた一次資料（執筆担当が引く）

シリーズ `concrete-practice`（`config/content-series.json`）の章を書くとき、執筆担当と QA はまずここを読む。ここにある値は、2026-10-13 までに原文で確かめたもの。ここに無い値だけを WebSearch / WebFetch で確かめる。手順は [book-coverage-expansion.md](./book-coverage-expansion.md) §4。

- 担当が新しく確かめた値は、返答の `factsVerified` に「値 — 出典 URL（版・条・頁）」で書く。親がここへ足す（担当はこのファイルを編集しない）。
- 改正を見つけたら、古い行を消さずに「（令和◯年◯月に改正）」と書き足し、新しい行を足す。

## 規格・仕様書

| 資料 | 確かめたこと |
|---|---|
| JIS A 5308:2024（令和6年3月21日改正） | [JSA のプレビュー](https://webdesk.jsa.or.jp/preview/pre_jis_a_05308_000_000_2024_j_ed10_ch.pdf)・[改正点（山口県）](https://www.pref.yamaguchi.lg.jp/uploaded/attachment/193627.pdf)・[新旧対照](https://ba.intertek-jpn.com/media/files/jis/JISA5308_JISQ1011_2403.pdf) |
| JIS A 5308:2019 本文 | [kikakurui](https://kikakurui.com/a5/A5308-2019-01.html)。配合計画書の呼び方の欄はセメントの種類と粗骨材の最大寸法。骨材の種類と ASR の抑制対策は使用材料の欄 |
| 土木工事共通仕様書（案）令和8年3月 | [目次](https://www.mlit.go.jp/tec/r08dobokukoujikyoutsuusiyousyo/)。近畿地方整備局版（令和8年4月）はサイトの `std:kinki/common` の頁で引ける |
| 同 1-3-3 レディーミクストコンクリート | [1-3-3](https://www.mlit.go.jp/tec/r08dobokukoujikyoutsuusiyousyo/honbun01_syo03_setsu03.html)。水セメント比の上限は一般の環境条件で鉄筋 55%・無筋 60% |
| 同 1-3-9 暑中コンクリート | [1-3-9](https://www.mlit.go.jp/tec/r08dobokukoujikyoutsuusiyousyo/honbun01_syo03_setsu09.html)。日平均気温が 25℃ を超えると予想されるとき。打設時のコンクリート温度の上限は、所定の品質を確保できる場合 38℃、それ以外 35℃ |
| 同 1-3-10 寒中コンクリート | 日平均気温が 4℃ 以下になると予想されるとき |

## 国土交通省の通知・要領

| 資料 | URL |
|---|---|
| スランプの通知（国技建管第13号・平成29年4月21日） | [本文](https://www.mlit.go.jp/tec/content/001989953.pdf)・[令和8年3月18日改正](https://www.mlit.go.jp/tec/content/001989954.pdf) |
| 流動性を高めた現場打ちコンクリートの活用に関するガイドライン | [PDF](https://www.mlit.go.jp/common/001191821.pdf) |
| アルカリ骨材反応抑制対策 | [記者発表](https://www.mlit.go.jp/kisha/kisha02/13/130801_.html) |
| レディーミクストコンクリートの品質確保について（国官技第61号・平成13年3月29日） | [PDF](https://www.qsr.mlit.go.jp/content/900012378.pdf)。水セメント比の上限（鉄筋 55%・無筋 60%）、テストハンマーの強度は材齢 28 日 |
| 非破壊試験の通知（国官技第44号・平成30年）と 2 要領 | [通知](https://www.mlit.go.jp/common/001260868.pdf)・[強度の要領](https://www.mlit.go.jp/common/001260869.pdf)・[配筋状態・かぶりの要領](https://www.mlit.go.jp/common/001260872.pdf) |
| 土木工事施工管理基準（案）令和8年3月 | [PDF](https://www.qsr.mlit.go.jp/content/900005865.pdf) |
| 公共工事標準請負契約約款（令和7年12月2日改正） | [PDF](https://www.mlit.go.jp/totikensangyo/const/content/001499463.pdf) |
| i-Construction 2.0 | [PDF](https://www.mlit.go.jp/report/press/content/001738521.pdf) |
| 建設用 3D プリンタの参考資料（案）令和8年3月 | [PDF](https://www.mlit.go.jp/tec/content/001991029.pdf) |
| 自動施工の安全ルール | [PDF](https://www.mlit.go.jp/tec/constplan/content/001885762.pdf) |

## 地方整備局

| 資料 | URL |
|---|---|
| 中国地方整備局 コンクリート構造物の品質確保・向上の手引き（案）施工編 令和4年3月（台帳 `cgr-concrete-quality-guide-construction`） | [PDF](https://www.cgr.mlit.go.jp/ctc/pdf/technology/concrete/a4-06.pdf) |
| 同 監督職員のチェックポイント 令和4年9月（台帳に未登録） | [PDF](https://www.cgr.mlit.go.jp/ctc/pdf/technology/concrete/r4_check.pdf)。打込み温度の上限は 35℃ 以下（令和8年3月の共通仕様書の 38℃ とは版の差） |

## 論文

| 資料 | 確かめたこと |
|---|---|
| 日本コンクリート工学会 年次論文集 Vol.26 | [PDF](https://data.jci-net.or.jp/data_pdf/26/026-01-1211.pdf)。水和に要る水は結合水 約23%・ゲル水 約21%・合計 約44%。「25〜30%」は結合水だけを指す概数 |
| 同 Vol.37（Powers のモデルの結合水 0.23） | [PDF](https://data.jci-net.or.jp/data_pdf/37/037-01-1086.pdf) |
