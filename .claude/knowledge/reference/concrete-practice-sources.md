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
| JIS A 5371・5372・5373 | 無筋・鉄筋・プレストレストのプレキャストコンクリート製品（A 5373 は「プレキャストプレストレストコンクリート製品」）（[GBRC 認証基準書 PO-05](https://www.gbrc.or.jp/assets/jis/documents/jis_po-05.pdf)） |
| 道路の橋・トンネルの定期点検 | 5 年に 1 回、近接目視を基本とする。道路法施行規則の改正省令は平成26年7月1日施行（[国土交通省](https://www.mlit.go.jp/road/sign/kijyun/pdf/20140625teikitenken.pdf)。条番号は未照合） |
| 同 1-3-3-2 工場の選定 | JIS マーク認証工場で、主任技士などが常駐し、全国生コンクリート品質管理監査会議の統一監査基準に合格した工場。近くに無い場合は監督職員が確認。配合計画書と納入書を整備・保管 |
| 土木工事施工管理基準（案）令和8年3月 コンクリート工の品質管理 | [PDF](https://www.qsr.mlit.go.jp/content/900005865.pdf)。単位水量の測定は ±15kg/m³ 以内で施工、±15 超〜±20 は原因調査と改善の指示、±20 超は持ち帰り。100m³/日以上は 2 回/日以上。単位水量の上限は粗骨材 20〜25mm で 175、40mm で 165kg/m³ |
| コンクリート標準示方書の版 | 基本原則編・設計編・維持管理編は 2022 年制定（2023 年 3 月発刊）、施工編は 2023 年制定（[土木学会](https://www.jsce.or.jp/publication/20230301news.pdf)。検索の要約で確認） |
| 道路橋示方書 令和7年版 | 令和7年8月22日に改定を発表。令和8年4月1日以降に着手する設計から適用。耐久性能の評価方法の明確化が改定の柱の一つ（[国土交通省](https://www.mlit.go.jp/report/press/road01_hh_001980.html)）。塩害の対策区分（S・I・II・III）は平成14年版で設けられ平成29年版まで続いた。令和7年版での区分と最小かぶりは未確認 |

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

## 業界・担い手（品質と担い手の章で確かめた値）

| 資料 | 確かめたこと |
|---|---|
| 道路に係る建設資材関係資料（国交省・全生工組連のヒアリング資料） | [PDF](https://www.mlit.go.jp/road/ir/ir-council/douroshizai/pdf03/10.pdf) p.5・15。生コン工場数 平成14年 4,449 → 平成30年 3,298、出荷量 平成2年度 1億9,800万m³ → 平成30年度 8,550万m³（グラフの読み取り。工場数の軸が年度か暦年かは資料で確定できない） |
| 令和7年版 国土交通白書 | [PDF](https://www.mlit.go.jp/report/press/content/001895678.pdf)。建設業の就業者 2024 年 55 歳以上 36.7%（全産業 32.4%）・29 歳以下 11.7%（同 16.9%）。市区町村の技術系職員 5 人以下が 1,741 団体の約半数、0 人が 25% |
| 厚労省「建設労働をめぐる情勢について」令和8年3月11日 | [PDF](https://www.mhlw.go.jp/content/11601000/001670286.pdf)。令和6年 入職 294 千人・離職 250 千人、年間総実労働時間 建設業 1,938 時間・全産業 1,643 時間、完全週休 2 日制 建設業 45.9%・全産業 56.7%、外国人技能者 21.3 万人 |
| 時間外労働の上限規制（建設業） | [茨城労働局](https://jsite.mhlw.go.jp/ibaraki-roudoukyoku/roudoukyoku/gyoumu_naiyou/kijunbu/kensetsu_hatarakikata.html)。令和6年4月1日から適用。原則 月 45h・年 360h、特別条項でも年 720h・月 100h 未満・2〜6 か月平均 80h 以内。災害の復旧・復興は月 100h 未満と平均 80h 以内が適用除外 |
| 公共工事設計労務単価 令和8年3月適用 | [国土交通省](https://www.mlit.go.jp/report/press/tochi_fudousan_kensetsugyo14_hh_000001_00337.html)。全職種の単純平均 +4.5%・加重平均 25,834 円・14 年連続の引上げ |
| 労務費に関する基準の運用方針 令和7年12月 | [PDF](https://roumuhi.mlit.go.jp/mlit-files/20251226_12.pdf)。基準は建設業法 34 条、著しく低い労務費の見積り・契約の禁止は 20 条、原価割れ契約の禁止は 19 条の 3。第三次担い手 3 法は令和7年12月12日に全面施行 |
| 建設業法 19 条の 5（著しく短い工期の禁止） | [国土交通省](https://www.mlit.go.jp/totikensangyo/const/totikensangyo_const_tk1_000175.html)。令和元年の新・担い手 3 法。条文の原文は未照合 |
| 山陽新幹線のトンネル剥落（平成11年） | [国土交通省](https://www1.mlit.go.jp/common/001092218.pdf) p.1。福岡・北九州トンネルの剥落のあと、全般検査（目視・打音）と変状展開図による維持管理へ |
| 阪神・淡路大震災の橋脚 | [内閣府防災](https://www.bousai.go.jp/kyoiku/kyokun/hanshin_awaji/data/detail/1-1-5.html)。昭和55年の道路橋示方書の耐震設計編より前の橋脚は帯鉄筋が少なく破壊・崩壊、昭和55年基準のものは概ね良好 |

## 補強 5 章（C-02・C-07・C-08・C-14・C-21）で確かめた値（2026-10-15）
- C-02: JIS R 5210 は 2026-03-23 に改正され、少量混合成分の上限が 5 % から 10 % に上がった — https://www.mlit.go.jp/jutakukentiku/build/content/001990192.pdf（国住指第 473 号）。2009 年改正で SO₃ と強熱減量の上限を上げた理由（廃棄物利用で C₃A が増える・石灰石の混合）— https://kikakurui.com/r5/R5210-2019-01.html。焼成約 1,450℃・石灰石 70〜80 %・普通ポルトランドセメントのシェア 72.1 %（2024 年度）— https://www.jcassoc.or.jp/cement/1jpn/jd1.html
- C-07: JIS G 3112 は 2020-04-20 改正（SD295A→SD295・SD295B 廃止）と 2025-04-21 改正。炭素当量の上限 SD345 0.60 %・SD390 0.65 %・SD490 0.70 %、降伏比 80 % 以下、圧延マーク SD345 突起 1・SD390 2・SD490 3 — https://kikakurui.com/g3/G3112-2020-01.html。JIS G 3536:2014 のリラクセーション値 N 8.0 % 以下・L 2.5 % 以下 — https://kikakurui.com/g3/G3536-2014-01.html。共通仕様書 令和8年3月 3-2-3-12・13（PC 鋼材は機械的に切断、グラウトの水セメント比 45 % 以下・ブリーディング率 0.0 %）
- C-08: 北陸地方整備局 設計要領 共通編 第4章（令和3年10月）の標準配合（無筋 18・RC 24・PC 横桁 30・PC T桁 40、場所打ち杭は呼び強度 30・設計基準強度 24）— https://www.hrr.mlit.go.jp/gijyutu/kaitei/sekkei/R0310_04_sekkeiyouryou.pdf。施工管理基準（案）令和8年3月: 圧縮強度は 1 回が呼び強度の 85 % 以上・3 回平均が呼び強度以上、テストハンマー・コアは設計基準強度が基準 — https://www.qsr.mlit.go.jp/content/900005865.pdf
- C-14: JIS A 5308 の運搬時間は練混ぜ開始から荷卸し地点に到着するまで原則 1.5 時間以内。2024 年改正で、戻りコンクリートの再出荷の禁止、納入書の電磁的記録、高強度コンクリートの強度の検査も 150 m³ に 1 回 — https://www.pref.yamaguchi.lg.jp/uploaded/attachment/193627.pdf。JIS Q 1011:2019 の計量器の静荷重検査 6 か月・運搬車の性能検査 3 年 — https://kikakurui.com/q/Q1011-2019-01.html。全国統一品質管理監査基準（令和8年度版）— http://hinkankaigi.jp/pdf/r8-kijun.pdf
- C-21: 再振動は打終わりから 15〜60 分・練混ぜから 120 分以内（25℃超は 90 分）、振動 5〜15 秒、挿入深さ 40〜50 cm、挿入間隔はバイブレータ径の 10 倍以下 — https://www.cgr.mlit.go.jp/ctc/pdf/technology/concrete/a4-06.pdf（p.27）。打重ね間隔は外気温 25℃以下で 150 分以内・超で 120 分以内 — https://www.cgr.mlit.go.jp/ctc/pdf/technology/concrete/r4_check.pdf（p.38）

## JIS の改正を記事へ反映した箇所（DN-0748・2026-10-15）

確かめた改正の中身:

- JIS R 5210:2026（2026-03-23）。少量混合成分は普通ポルトランドセメントだけ合量 5 % → 10 %。5 % を超える分は石灰石（またはこれと同等の品質のもの。人工炭酸カルシウムを含む）に限り、高炉スラグ・シリカ質混合材・フライアッシュは合量 5 % まで。強熱減量の規定値は普通・早強・超早強で削除（中庸熱・低熱・耐硫酸塩は残る）。混合セメント（R 5211〜5213）も同様 — [セメント協会 セメント・コンクリート No.950 表2](https://www.jcassoc.or.jp/cement/4pdf/2026-950-jis-revision-overview.pdf)、[国住指第473号](https://www.mlit.go.jp/jutakukentiku/build/content/001990192.pdf)（大臣認定の読替えで普通の強熱減量は「－」）
- JIS A 5308:2024（2024-03-21）。普通コンクリートのスランプ 10 cm 削除、指定事項に舗装の強度試験方法（曲げ・圧縮）と「高強度の場合は水の種類」（2019 は「呼び強度が 36 を超える場合は水の区分」）、累加計量（購入者の指定・計量値の記録・計量印字記録から自動算出した単位量を納入書に示す条件。セメント＋混和材、混和材 3 種まで、N＋BB は記号 BA+）、強度の供試体は工場出荷時の採取可・試験頻度は高強度も 150 m³ に 1 回、表JC.3 で安定剤を用いるスラッジ水は固形分率 6 % まで・連続濃度測定方法も 1 % 未満で可、納入書は署名又は記名 — [新旧対照（インターテック）](https://ba.intertek-jpn.com/media/files/jis/JISA5308_JISQ1011_2403.pdf)。2019 年版の表1は [kikakurui の頁画像](https://kikakurui.com/a5/A5308-2019-01.html)
- JIS G 3112:2020 の表3（曲げ性）。SR235 1.5d、SR295 径16以下 1.5d・超 2d、SD295 D16以下 1.5d・超 2d、SD345 D16以下 1.5d・D41以下 2d・D51 2.5d、SD390 2.5d、SD490 2d（90°）。2025-04-21 の改正点（JSA の発行案内）に値の変更は無い — [kikakurui](https://kikakurui.com/g3/G3112-2020-01.html)、[JSA](https://webdesk.jsa.or.jp/common/W10K0620?id=1450)
- 示方書のフックの曲げ内半径（軸方向／スターラップ・帯鉄筋）: SR235 2.0φ/1.0φ、SR295 2.5φ/2.0φ、SD295・SD345 2.5φ/2.0φ、SD390 3.0φ/2.5φ、SD490 3.5φ/3.0φ。φ≦10 mm のスターラップは 1.5φ — 土木施工管理技術テキスト 土木一般編 p.268–269（Drive の頁画像。文字起こしは表が崩れ、「鋭角」を「鉤角」と誤読している）

直した箇所（記事 — 旧 → 新）:

| 記事 | 旧 → 新 |
|---|---|
| civil-construction-1/textbook-rebar-formwork 表3.32 | 曲げ内側の半径 SR295 1倍→1.5倍、SD345 2.5倍→D16以下1.5・D41以下2・D51 2.5、SD390 3倍→2.5倍、SD490 3.5倍→2倍。伸び「2%・1%」→ 20%・18%・12% の例 |
| 同 表3.34 と箇条 | SR235 1.0φ/2.0φ→2.0φ/1.0φ、SR295 を分けて 2.5φ/2.0φ、SD390 のスターラップ 2.0φ→2.5φ、SD490 2.0φ→3.0φ。鉤角→鋭角、隅角部の内側→外側、異形鉄筋の 12 倍は直角フック、1.5φ は 10 mm 以下のスターラップ |
| civil-construction-1/textbook-concrete-mix-design 表3.27 | 2019 年版とも合わない値を 2024 年版の表1で全行置換。指定事項「呼び強度 36 超の骨材の区分」→ 舗装の強度試験方法・高強度の水の種類、材齢を追加。計量「一括加算してはならない」→ 水と混和剤・2024 の累加計量 |
| civil-construction-1/secondary-concrete-basics | SD295A・B の読み替えの注を追加 |
| concrete-chief-engineer/textbook-materials | 少量混合成分 10 % は普通だけ・増量は石灰石だけ・強熱減量の削除、SD 295 A → SD 295、強熱減量の上限は 2019 年版まで |
| concrete-chief-engineer/textbook-production-qc | 高強度の試験頻度 100 m³ → 2024 は 150 m³（3 か所）、スラッジ固形分率 6 %、累加計量 |
| concrete-engineer/textbook-materials | 強熱減量 5.0 % は 2019 年版まで・2026 で削除、読替えに値が無い理由、安定化スラッジ水 6 % |
| concrete-chief-engineer/primary-production-qc・primary-materials | 本文・正答は出題年の版のまま。冒頭に改正の注（Callout）を追加 |
