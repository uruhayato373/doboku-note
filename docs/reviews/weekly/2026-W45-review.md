# 週次レビュー 2026-W45

作成日: 2026-11-08
対象期間: 2026-11-02 〜 2026-11-08（事業レビューと計測は前の完了週 2026-10-26〜2026-11-01＝W44 窓）

前週: 2026-W44 のレビュー（このコミットで削除・git 履歴に残る）

---

## サマリー

- 計画タスク達成率: 0/2（実行タスクの DN-0706・DN-0819 はどちらも残り。DN-0706 は画像を作って develop へ入れ、本番の確認と 28 日の比較が残る）
- 主な成果: 週次レビューを指示で回す形に変えた（#1452）。検索の改善 3 件（EXP-060〜062）。運営者の判断 8 件を台帳に反映し、作業カード 5 枚（DN-1043〜1047）を起票した。
- 要注意: 金曜の計測（fetch-metrics）が develop へ書き戻せず、W44 の計測ダイジェストと自然検索人数が欠測（DN-1043）。土曜の収集も前段の記録が develop に入っていない（DN-0819）。
- 数値の要点: W44 窓の note 販売 2 件 ¥9,960（部分）。10 月の受取額は推計 ¥64,418 で、目標 ¥100,000 に −¥35,582。

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0706 技術士一次の CTA 画像 | 実行 | 一部 | 直前パックの POP 画像を冒頭と資格トップに入れた（#1384）。本番の表示確認と 28 日後の比較が残る |
| DN-0819 土曜の回を全段 rc=0 | 実行 | 未達 | 11/7 も auth・KDP・ココナラと GSC の記録の commit・note-sync で落ちた。見る週を 11/14・11/21 へ移した |
| 月次レビュー 10 月分 | 定常 | 一部 | 2026-10 の記録はあるが、再確認日（11/7）を過ぎた。指示で補完する |
| 実験の期限（EXP-015・010 ほか） | 定常 | 未達 | 期限 10 件が残る（下の「実験の進捗」） |
| 検索改善 週 3 件 | 定常 | 完了 | EXP-060〜062 を記録。週次の処置は要処置 0 |
| DN-0360 note 同期の止まり 3 件 | 手動 | 未達 | 3 件とも 10/24 の中断のまま |
| DN-0903 悩みと商品候補 | 手動 | 保留 | 運営者が別の対話で決める |

## 成果ハイライト

1. 週次レビューを運営者の指示で回す形にした。土曜の自動実行は収集と GSC の記録だけになり、常設の worktree は 1 本になった（#1452）
2. 運営者の判断 8 件を台帳に反映した（過去問の解説の有料化・技術士一次の環境部門・もしもの成果の取得・X の再開ほか）
3. 検索の改善 3 件（EXP-060〜062）で、今週の改善は 3/3 件

## 開発活動

- コミット数: 438（[skip ci] を除くと 363）。PR は #1411〜#1452 の約 40 本
- 主な変更: YouTube とショートの年間の枠と量産の工程（#1413〜#1419）、X・Instagram の年間の枠（#1422・#1425）、X の返信候補を人が承認して送る試行（#1443〜#1446）、管理画面の整理（#1424・#1430〜#1433・#1440）、配信ファイルの整理 18,177 → 11,935 件（#1435）、AdSense の審査コードの再設置（#1426）、競合の立ち位置の台帳（#1437・#1439・#1447・#1449）、記事カードの写真サムネイル（#1448）、週次レビューを指示実行へ（#1452）
- backlog 消化: done 32 件 / 掃除 0 件（すべて claude-code）
- 残量: カード 239 件（W44 末 167 件から +72）。判断待ち 23 件
- 分類率: `[種類:]` 付与済み 239/239
- 再発防止: 起票した不具合 13 件 / 閉じた不具合 5 件（検査 2・memory 1・正典 1・残すもの無し 1）/ 未完了の不具合 33 件
- 台帳の健全性: S2（🟢/🟣 に沈んだ不具合）2 件、S3（意思決定なのに 🟣 でない）10 件、S4・S9 は 0。S2・S3 は次の `/backlog-sweep --audit` で見直す

## コンテンツ実績

- 検索の改善 3 本: 1級土木の将来性ガイド（「技術士 オワコン」）・RCCM の学習計画（「rccm 予約」）・土木公務員の資格マップ（「土木 公務員 資格」）の title と冒頭を直した
- note 同期: 公開記事 1,025 本のうち反映済み 664・反映待ち 358・止まっている 3（10/24 の中断。下の「note 同期」）
- note の公開状態の照合・公開ページの目視確認: 11/7 の前段の記録が develop に入っていないため未確認

## 月の受取額（手数料控除後・管理画面トップと同じ集計）

| 月 | 合計 | note | ココナラ | KDP |
|---|---|---|---|---|
| 2026-11（途中） | — | —（未取得） | —（未取得・10-31 取得） | —（未取得） |
| 2026-10 | ¥64,418 | ¥56,655（推計・10-31 取得） | ¥0（途中・10-31 取得） | ¥7,763（推計・10-24 取得） |

## 資格別 KPI（2026-W44 窓・前週比）

| 指標 | 全体 | 前週比 | 1級土木 | 技術士 総監 | 技術士 建設部門 | RCCM |
|---|--:|--:|--:|--:|--:|--:|
| 自然検索 | — | — | — | — | — | — |
| Google クリック | — | — | — | — | — | — |
| YouTube 経由 | — | — | — | — | — | — |
| X 経由 | — | — | — | — | — | — |
| Instagram 経由 | — | — | — | — | — | — |
| note CTA | — | — | — | — | — | — |
| note 販売（件） | 2（部分） | -71.4% | 0（部分） | 0（部分） | 0（部分） | 0（部分） |
| note 売上（円） | 9,960（部分） | -43.3% | 0（部分） | 0（部分） | 0（部分） | 0（部分） |
| ココナラ（件） | 0 | — | 0 | — | — | 0 |
| 演習開始 | — | — | — | — | — | — |

欠測（—）は 0 ではない。資格間で合算しない。

## NSM（オーガニック検索流入）

- W44 窓の自然検索人数・Google クリックは欠測（金曜の fetch-metrics が develop へ書き戻せていない・DN-1043）。欠測は 0 ではない

### NSM トレンドの洞察
- 判断は W44 のダイジェストが出てから行う。参考の W43（10/19〜10/25）は 2級二次の解答例ページで Google 流入が基線の約 8 倍だった（季節の山）

## 計測ダイジェスト

- W44 のダイジェストは未作成（DN-1043）。参考として前回の W43 を残す

<!-- growth-digest:2026-W43 -->
### 前回のダイジェスト 2026-W43（2026-10-19〜2026-10-25・基線 2026-09-21〜2026-10-18 の週平均と比較）

入力: growth-pack=取得済み / monetization-coverage=取得済み / bing-webmaster=取得済み

| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |
|---|--:|--:|--:|--:|--:|
| bing | 5,440 | 3,341.3 | +62.8% | 76.6% | 250 |
| google | 4,100 | 516.5 | +693.8% | 75.9% | 79 |
| yahoo | 979 | 173.8 | +463.5% | 79.3% | 19 |
| direct | 595 | 252.5 | +135.6% | 69.7% | 43 |
| referral | 225 | 115.5 | +94.8% | 77.8% | 20 |
| organic-other | 81 | 17 | +376.5% | 70.4% | 0 |
| ai-assistant | 44 | 19 | +131.6% | 72.7% | 0 |
| organic-social | 12 | 26.3 | -54.3% | 66.7% | 0 |
| unassigned | 9 | 10.3 | -12.2% | 77.8% | 0 |
| organic-video | 0 | 4.8 | -100% | —% | 0 |

GSC（日本・web・プロパティ全体）: クリック 5,648（基線週平均 449.5・+1156.5%）/ 表示 50,150 / CTR 11.26%

ページ明細（国の条件なしのページ別＝匿名化された検索語の分を含み、日本以外の行も含む）: 1312 行・5668 クリック / 139674 表示・byPage 全体（日本）5,665 クリックの 100% / 表示の 100%。急落・減衰の判定に使う。全体の KPI・資格別の合計には使わない。

Bing 照合: GA4 の bing 自然検索セッション 5,440 / Bing Webmaster クリック 6,371（0.9 倍）

| イベント | 今週 | 基線週平均 | 増減 |
|---|--:|--:|--:|
| note_cta_click | 383 | 125.5 | +205.2% |
| affiliate_cta_click | 10 | 5.3 | +90.5% |
| coconala_cta_click | 2 | 2.5 | -20% |
| quiz_cta_click | 0 | 0 | — |
| note_cta_impression | 31,521 | 12,483.3 | +152.5% |
| affiliate_cta_impression | 8,719 | 4,857.3 | +79.5% |
| coconala_cta_impression | 648 | 759.3 | -14.7% |
| quiz_start | 51 | 18.8 | +172% |
| quiz_complete | 12 | 1.8 | +585.7% |
| standards_data_download | 4 | 0.8 | +433.3% |

google 流入の上昇: /exam/civil-construction-2/guide/r08-secondary-answers（75→2768） / /exam/civil-construction-2/guide/secondary-grading-and-partial-credit（3.8→152） / (not set)（31.3→127） / /exam/civil-construction-2/secondary/experience-writing-guide（10→58） / /exam/civil-construction-2/guide/secondary-written-questions-guide（1.8→37）
google 流入の下落: /exam/pe-comprehensive-management/past-exams/r08-primary（15→9） / /exam/civil-construction-1/secondary/r06（19.8→15） / /exam/pe-comprehensive-management/past-exams/r08-secondary（5→3） / /exam/civil-construction-1/textbook/safety-scaffolding（4→2） / /exam/civil-construction-1/secondary/r04（14.3→13）

#### トリアージ対象 19 件（候補 136・抑止 27・表示上限で見送り SEO 3 / 収益 51）

| ID | 区分 | 内容 | 期待効果/週 | 推奨 |
|---|---|---|--:|---|
| OPP-57c84288a8 | 実験 | EXP-015（2級土木 二次の経験記述3商品（想定工事バンク ¥5,480→¥6,980・過去問模範答案集 ¥2,480→¥2,980・完成答案集 ¥2,480→¥2,980）を試験直前に値上げし、販売額が落ちないかを見る）: next_check_date 2026-10-26 を超過 | — | verdict / defer |
| OPP-8cf8dd82e2 | 実験 | EXP-027（資格名: /exam/pe-comprehensive-management/keywords/cpd の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 20.1→9.8・目安 improved）。裁定して close する | — | verdict / defer |
| OPP-9fb321f255 | 実験 | EXP-034（技術図書（共通仕様書など）: /standards/tohoku の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 13.5→20.5・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-c04120b67c | 実験 | EXP-024（技術図書（共通仕様書など）: /standards/hokuriku の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 13.4→6.9・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-c49d25f32d | 実験 | EXP-025（技術図書（共通仕様書など）: /standards/hokkaido の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 18.7→—・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-e0e8a74145 | 実験 | EXP-026（技術図書（共通仕様書など）: /standards/kinki の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 10.5→9.2・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-e65f3f93f4 | 実験 | EXP-023（技術図書（共通仕様書など）: /standards/chugoku/local の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 11.7→6.9・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-f2ba0b6d6d | 実験 | EXP-014（2級土木 二次ページの冒頭 CTA を、高額のまとめ売りから時期・検索意図に合う商品へ差し替え、冒頭バナーの表示崩れを直して、冒頭 CTA のクリック率を上げる）: next_check_date 2026-10-26 を超過 / 自動計測の事後窓が完了（ga4.event:note_cta_click 186→296・目安 target-met）。裁定して close する | — | verdict / defer |
| OPP-f834cfe4ab | 実験 | EXP-028（資格名: /exam/civil-construction-1/secondary/r06 の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 15.5→7.3・目安 improved）。裁定して close する | — | verdict / defer |
| OPP-f9ced5b0c3 | 実験 | EXP-029（土木公務員: /exam/pe-comprehensive-management/guide/public-engineer-qualification-map の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 11.4→7.7・目安 improved）。裁定して close する | — | verdict / defer |
| OPP-fa225d9335 | 実験 | EXP-022（技術図書（共通仕様書など）: /standards/okinawa の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 10.7→—・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-fcfcda5a1a | SEO | 「二級土木施工管理技士 二次試験」は平均 8.4 位なのに CTR 0.98%（期待 3%） | 12.7 searchClicks | experiment / backlog |
| OPP-a202ad33ee | SEO | /exam/civil-construction-2/secondary/r06 の検索クリックが週 2（基線の週平均 6.5・-69.2%） | 4.5 searchClicks | backlog |
| OPP-5dd26ae975 | SEO | 「2級土木施工管理技士 2次試験 配点」は平均 1.5 位なのに CTR 5.88%（期待 15%） | 1.2 searchClicks | experiment / backlog |
| OPP-adc3bac9b1 | SEO | 「スクレープドーザー」は平均 6.3 位なのに CTR 1.34%（期待 4%） | 1.2 searchClicks | experiment / backlog |
| OPP-22c5d85639 | SEO | 「建設工事公衆災害防止対策要綱」は平均 8.1 位なのに CTR 0.56%（期待 3%） | 0.9 searchClicks | backlog |
| OPP-9039aef12c | 収益導線 | /exam/civil-construction-1/secondary/r06 の CTA クリック率 0.33%（サイト平均 0.82%） | 1.8 ctaClicks | backlog / experiment |
| OPP-5b6a44c56a | 収益導線 | /exam/pe-first-stage/primary/r07-basic の CTA クリック率 0.24%（サイト平均 0.82%） | 1.5 ctaClicks | backlog / experiment |
| OPP-9a77f81ae7 | 収益導線 | /exam/pe-first-stage の CTA クリック率 0.11%（サイト平均 0.82%） | 1.3 ctaClicks | backlog / experiment |

全件を `npm run growth-triage -- list` で確認し、`apply --decisions <file> --commit` で backlog / 実験 / 束ね / 却下 / 保留に振り分ける（11〜30 位の取りこぼしは検索キーワード戦略のサイクルが受け持つ）。

## 計測→改善トリアージ

- W43 のダイジェストの未処分は 0 件（W44 のレビューで処分済み）。W44 のダイジェストは fetch-metrics の publish の失敗で作られていないので、処分は DN-1043 で出してから行う

## 検索の改善（今週 3/3 件・triage --check --weekly は要処置 0）

- EXP-060 /exam/civil-construction-1/guide/future「技術士 オワコン」: title・description を寄せ、冒頭に答えの H2 と関連ガイドへのリンクを足した
- EXP-061 /exam/rccm/guide/study-plan「rccm 予約」: title・description を寄せ、冒頭に予約の方法と 2026 年度の予約・試験期間を書いた（config/exam-calendar.json の値のみ）
- EXP-062 /exam/pe-comprehensive-management/guide/public-engineer-qualification-map「土木 公務員 資格」: 前回（EXP-029・取得順）と別の角度で「資格一覧」に寄せた
- 観察中: EXP-049〜051（11/1 の改善・本番反映待ち）

## 実験の進捗

期限の来た実験 10 件（`check-experiment-due`）を、同じ日の積み残しの処理で片付けた。残る期限は人手待ちの 2 件（EXP-008・EXP-017 の PENDING）だけ。

| ID | 処置 | 根拠 |
|---|---|---|
| EXP-009 RCCM 問題III 模範論文集 | close: no-effect | CBT 期間（9/16〜10/31）の rccm-* 売上 ¥0。停止条件 ¥10,000 未満に当たり、2027 サイクルの商品追加は止め、記事は保守だけ |
| EXP-010 note CTA の rel=noreferrer | close: partial | 10 月の note の流入元に doboku-note.com 52 PV（外す前は 0）。ただし GA4 の note_cta_click と桁が合わず、大半は no referrer に入る |
| EXP-015 2級二次 3 商品の値上げ | close: partial | 事後窓 2 件 ¥5,960 < 値上げ前 3 件 ¥6,440（-7.5%）。件数が少なく切り分け不能。価格は 2027 年の直前期の前に判断 |
| EXP-017・EXP-018 転職アフィリの面の拡大 | 再計測日を 11/13 へ | 自動計測の事後窓が 10/27 で止まっている（DN-1043）。途中経過は EXP-017 が 15 → 22 クリック、EXP-018 は 0 → 0 |
| EXP-055〜058 | 基線を記録 | 055 は同時比較のため前後の基線なし、056 は新設の導線で変更前 0、057・058 は変更前の GSC の値 |
| EXP-008 | 人手待ち | 28 日後の report-career-funnel と A8 の月次成果（要ログイン） |
| EXP-060〜062（今週の検索改善） | 本番反映待ち | 本番反映の日から計測を始める |

### 次サイクルへの仮説
- 検索改善は 10 月に判定した 9 件のうち成功 3・一部 2・効果なし 4。title を検索語へ寄せるだけで足りないページは、冒頭の答えの段落も合わせて直す（今週の 3 件はその形）
- 新しい資格の商品は、試験期間の X の送客だけでは売れなかった（EXP-009）。2027 の RCCM は記事の保守に留める

## PSI パフォーマンス推移

```
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.25 (閾値: ≤0.1)
- `https://doboku-note.com/` (mobile): **LCP** = 6451ms (閾値: ≤2500ms)
- `https://doboku-note.com/search` (mobile): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (mobile): **LCP** = 5146ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (mobile): **LCP** = 5552ms (閾値: ≤2500ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/concrete-basics` (mobile): **LCP** = 8176ms (閾値: ≤2500ms)
実ユーザー計測 data/rum/web-vitals/2026-10-31.json（2026-10-03〜2026-10-30・7 日前）状態 ok・イベント 83768 件
  要改善　 CLS desktop 良好率  72%（384 件）/exam/civil-construction-2/primary
  要改善　 INP mobile  良好率  74%（281 件）/exam/pe-first-stage/primary
  要改善　 INP mobile  良好率  70%（53 件）/exam/pe-first-stage
手を打つ組 3（不良 0）
```

### build 後 SEO スキャン（check-seo-build・CI が develop の push ごとに記録）

- 最新の記録: 2026-11-07。検査 1988 URL / sitemap 1988 URL
- error 0（前週比 ±0）/ warn 408（前週比 +1）
- 前週の記録: 2026-10-31

| 型 | 区分 | 件数 | 前週比 |
|---|---|--:|--:|
| jsonld_recommended_missing | warn | 407 | ±0 |
| ssr_thin_body | warn | 1 | +1 |

## 収益カバレッジ ダッシュボード

- 流入 10/3〜10/30（GA4 10/31 取得）: 流入のある 1,001 ページのうち、15 人以上で収益導線ゼロは 0 件
- 流入最大の 2級 R8 二次の解答例ページ（6,265 人）は note へのクリック率が 0.3% と低い。試験後の季節なので、来年の山の前に冒頭の案内を見直す
- 実務のページ 4 本（型枠の取り外し時期 429 人・路盤 255 人・アスファルト舗装 182 人・図面の読み方 179 人）は note の案内が無く、転職広告だけ
- 配置別では本文中（article-body）のクリック率が 2.77% と最も高く、サイドバー 0.12%・インライン 0.08% は低い
- 記録: `data/analysis/monetization/coverage-latest.md`

## SNS 流入と投稿実績

- SNS は保留中のため新規の投稿は無し。運営者の判断で **X だけ再開する**（DN-1007。本数・配分を決めてから active にする）
- 計測ダイジェストが W43 止まりのため、W44 窓の SNS 流入は欠測

## 校正学習の蒸留

### 今週の抽出結果
- 既存原則の適用: 3 件（検索語に合わせた title と冒頭、管工事の再採点による訂正、「〜ます。」3 文連続の回避）
- 新規ルール候補: 1 件
- 既存原則の精緻化・ユーザー嗜好・ワークフロー改善: 0 件

### 適用した変更（承認を待たずに反映済み）
| # | カテゴリ | 概要 | 反映先 |
|---|---|---|---|
| 1 | 新規ルール | 載せていた出典が後から 404 になったら、新しい URL → Wayback の保存版 → 出典名だけ、の順で直す（DN-0927 の 6 コミットで同じ順序）。§12 の「出典名だけ残すのも不可」は新しく載せる URL の決まりとして書き分けた | content-principles.md §12 |

- 2026-11-08 から、校正学習は承認を待たずに規約へ入れる（運営者の指示。distill-proofread-learnings の Phase 4）

### 学習ログ
- `.claude/state/proofread-learnings/2026-11-08.md`

## SNS 予約キュー投入（X）

```
📮 X 予約キュー投入 surfacer — 2026/11/8
   最終予約記録（途中の空白を含む）: 11/30   lookahead: 8 日

⚠ 判定不能: 11 件（見出しから日付が読めず due 判定できない・未投入あり）
   - 096-civil1-pressure-correction（未投入 1/1）— 見出しの日付書式を確認する
   - 097-civil1-diagram-reuse（未投入 3/3）— 見出しの日付書式を確認する
   - 098-cem-textbook-diagrams（未投入 19/19）— 見出しの日付書式を確認する
   - 099-pe-construction-textbook-diagrams（未投入 5/5）— 見出しの日付書式を確認する
   - 100-pe-first-stage-calculation-diagrams（未投入 3/3）— 見出しの日付書式を確認する
   - 101-civil-textbook-diagrams（未投入 4/4）— 見出しの日付書式を確認する
   - 102-practice-textbook-diagrams（未投入 7/7）— 見出しの日付書式を確認する
   - 103-cem-existing-figure-diagrams（未投入 15/15）— 見出しの日付書式を確認する
   - 108-civil1-prestress-diagrams（未投入 1/1）— 見出しの日付書式を確認する
   - 109-civil1-construction-diagrams（未投入 5/5）— 見出しの日付書式を確認する
   - 114-pe-merit-series（未投入 8/8）— 見出しの日付書式を確認する
```

## その他パフォーマンス（必要に応じて）

### note 同期

```
[note-sync-plan] 公開記事 1025: 反映済み 664 / 反映待ち 358 / 止まっている 3
  反映待ちの部品: 本文 360・カバー 17・タグ 0（配布 PDF の取り寄せが要る 0）
  止まっている: 前回の更新が途中で止まった 3 件 → note の公開ページを確認し、問題なければ note-update-body --sync --article <path> --force-retry --commit
    nd88d5ec77f2d  content/note/1級・2級土木/1級土木/1級経験記述を自分の現場に置換/article.md（2026-10-24T07:59:28: 更新フローが false を返した（保存せず中断））
    nd4320a66d09f  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/土木一般-共通工学編/article.md（2026-10-24T08:10:37: 更新フローが false を返した（保存せず中断））
    n653cd1b3ee71  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/施工管理-法規編/article.md（2026-10-24T08:09:47: 更新フローが false を返した（保存せず中断））
```

### ココナラ取引

- 要対応 0・注意 0

### 売上台帳

```
最終更新: 2026-10-31
【2026-09】 35件 / ¥106,800 ★¥15kマイルストーン達成
【2026-10】 22件 / ¥67,680 ★¥15kマイルストーン達成
```

## 点検と Issue

- check-workflow-health: fetch-metrics.yml が 2 連続で失敗（最終成功 7 日前）→ 振り分け: DN-1043
- quality:audit:weekly の egov-drift: 7 法令に 11/2 施行の改正・リンクする記事 17 本 → 振り分け: DN-1047
- quality:audit:weekly の monthly-review-due: 2026-10 の月次の再確認日（11/7）を過ぎた → 振り分け: 定常（運営者の指示で `/monthly-review 2026-10` の補完を回す）
- #1006 note-live-audit（10/12〜）: 起票元の note-live-audit.yml は削除済みで自動では閉じない。照合は土曜の収集の note-audit 段へ移った → 振り分け: DN-0819（Issue は人が閉じる。この回では閉じる操作が権限で止まった）
- #1217 weekly-collect（10/24〜）: 11/7 も auth・KDP・ココナラと GSC の記録の commit・note-sync で落ちた → 振り分け: DN-0819
- #1331 gsc-auto-review（10/31〜）: 11/7 の回で週次・coverage とも記録でき、鮮度は OK に戻った → 振り分け: 定常（月曜の weekly-review-guard が鮮度で自動クローズ）
- #1421 fetch-metrics（11/6〜）: develop への publish で型のテストが 1 件落ちる → 振り分け: DN-1043
- #1445 gsc-indexing-local（11/6〜）: 11/7 の朝に空きメモリが閾値を割ってブラウザを開かなかった（一時的）→ 振り分け: 定常（次の成功で自動クローズ。続けば閾値と起動時刻を見直す）

## イシューマップ

- overall B1: DN-0955 が閉じて判定の番が来たが、11/4 以降の受注・販売は 11/7 の収集が記録できず実測が無い。state は open のまま、判定を 2026-12 の note 販売（総監・建設部門）とココナラの問い合わせに付け替えた → 振り分け: 定常

## 課題・ブロッカー

1. 計測の書き戻しが 2 回続けて止まり、W44 の数字で判断できない（DN-1043）。この週の KPI 表はほぼ欠測
2. 土曜の収集が 3 週続けて全段は通っていない。ログイン（KDP・auth）と、収集の記録が commit 前の検査で落ちる問題が重なっている（DN-0819）
3. 実験の期限が 10 件たまっている。判定しないと学びが台帳に入らない
4. バックログが 1 週で +72 件（167 → 239）。起票が消化（32 件）を大きく上回る

## 学び

- 画面のない自動の週次レビューは、収集の失敗と同時に止まり、下書きだけが残った。レビューは指示で回し、収集だけを自動に残す形に変えた
- 書き戻しの直前の検査（unit-tests）は CI のログの末尾しか残らず、落ちたテストの名前が読めない。失敗した行を先に出す形にしないと、原因を追えない（DN-1043 に含めた）
- `search-improvement record` は `--sha` を省くと commit の解決に失敗した。直した commit の SHA を明示して記録する

## バックログの関門

判断待ち 12 件を運営者に諮った（2 回・各 4 問）。

- やる: DN-0505 → 環境部門から展開（DN-1045 へ移して削除）／DN-0507 → 解説を全面的に有料側へ（DN-1044 へ移して削除）／DN-0953 → もしもの成果を取る段を作る（DN-1046 へ移して削除）
- 一部決定（カードに決定を書き、残りの論点で継続）: DN-0572 → 残して 12 月に再判定／DN-1007 → X だけ再開、本数・配分などは継続／DN-0989 → 別の資格へ広げる、広げる先を選ぶ
- 保留: DN-0726（YouTube は保留のまま）／DN-0903（運営者が別の対話で決める）／DN-0305・DN-0844・DN-0721（11/26 の EXP-012 の判定待ち）
- 決定済み: DN-0955 は 11/4 に再開を決めて再出品済み。完了には issue-map.json と 2026-11-04 の critical レビューの参照の付け替えが要るため、この回では閉じていない
- 期日切れ 0 件
- backlog 検証（`check-backlog-verify`）: 対象 7 本を実走・赤→緑 0・常時緑 3・赤 4・実行不能 0（1 回目は Mac の負荷で standards-page-images が時間切れになり再実行）。常時緑の 3 本（check-video-content・check-standard-articles・check-competitor-scan-due）は `[検証:]` が surfacer を指していて完了判定に使えない疑い → 次の `/backlog-sweep --audit` で差し替える
- 直近 7 日の起票 93 件（積み残しの処理で台帳監査）: 全件のタグと約 55 件の本文を確かめた。
  - 反映: DN-1004・DN-1006 を判断待ちへ、DN-1028 を低へ（Instagram は保留）、DN-1010・DN-1011・DN-1042・DN-0946 を中へ、DN-0979 の種類を改善へ。DN-1027 は DN-1028 で答えが出たので削除、DN-0996 は DN-0889 に統合
  - 運営者の判断: DN-0981 は登録の特典を解説から「次の一手・復習シート」に取り替える／DN-1045 は問題と正答だけで作る／DN-1034 は CLI の認証先を読み取り用へ戻す（X 再開の前提）
  - 残り（重複の疑い・対象の突き合わせ）: DN-1024 と DN-1016、DN-1013 と DN-1014、DN-0959・DN-0966・DN-0981 の対象 URL、DN-0932 の閉じ方、DN-0969 の重要度、YouTube の進行中カード（DN-0980・DN-0988・DN-1001・DN-1002）→ 次の `/backlog-sweep --audit`
- 7 日超の Issue: #1006・#1217 → DN-0819、#1331 → 復旧済み（月曜に自動クローズ）

## 来週への申し送り

- fetch-metrics の publish を直し、W44 の計測ダイジェストを出して計測トリアージを処分する → 振り分け: DN-1043
- 11/14 の土曜の収集を全段 rc=0 にする。運営者は事前に KDP のログインをやり直す → 振り分け: DN-0819
- 2026-10 の月次レビューを再確認日に合わせて補完する → 振り分け: 定常
- 期限の来た実験 10 件を再計測・判定する（EXP-009・010・015・017・018）、基準値の無い 4 件（EXP-055〜058）に基準値を入れる → 振り分け: 定常
- X の再開の論点（本数・技術士の配分・解答速報）を決めて active にする → 振り分け: DN-1007
- 過去問の解説を有料側へ移す計画を作り、資格 1 つで先に切り替える → 振り分け: DN-1044
- 11/2 施行の 7 法令の改正にリンクする記事 17 本を確かめる → 振り分け: DN-1047
- note 同期の止まっている 3 件を片付ける（ログイン済み Mac）→ 振り分け: DN-0360
- X 予約キューの下書き 11 件の見出しの日付が読めない。X を再開する前に書式を直す → 振り分け: DN-1007
