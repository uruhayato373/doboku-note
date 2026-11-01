# 週次レビュー 2026-W44

作成日: 2026-11-01
対象期間: 2026-10-26 〜 2026-11-01（事業レビューと計測ダイジェストは前の完了週 2026-10-19〜2026-10-25＝2026-W43 窓）

前週: [2026-W43-review.md](https://github.com/uruhayato373/doboku-note/blob/cde3b6990/docs/reviews/weekly/2026-W43-review.md)（git 履歴）

> [!warning] 自動実行の失敗と手動の実施
> 10/31（土）の自動の週次レビューは、ヘッドレスの Claude の認証切れ（`OAuth session expired`）で本体が動かなかった（Issue #1330・#1331）。11/1 に対話セッションで同じ手順を手動で回した。空き容量 11GB が資産の復元の予約 20GB を割っていたため、運営者の承認で `.next` と `.tmp` の 7 日超の動画確認物など約 5.3GB を消し、Kindle の EPUB の復元だけ予約チェックを外して行った（予約値は変えていない）。

## サマリー

- 計画タスク達成率: 0/2（DN-0248 は 11/4 の公開待ちで予定どおり、DN-0819 は 10/31 の土曜の回が rc=1 で未達）。余力枠の DN-0826（KDP の bookId 重複）は完了
- 主な成果: 2級 R8 二次の解答例ページが試験週に Google セッション 75→2,768 で、サイト全体の Google クリックが基線週平均の約 12 倍（5,648）。商品の導線が無かった 20 本の配線（DN-0890）、技術士の筆記合格発表後の口頭教材の配線（DN-0902・EXP-047）、検索改善 3 件（EXP-049〜051）
- 要注意: 土曜の収集が 4 段失敗（auth・kdp・note-sales・note-sync）。9 月の note 販売明細 ¥106,800 と月次表示 ¥103,560 の不一致が続く。重点 4 資格の note 販売は今週 0 件（台帳は partial）
- 数値の要点: 自然検索 7,415 人（+111.7%）・note CTA クリック 383（+171.6%）・note 台帳 7 件 ¥17,560（partial）・10 月受取額は途中で ¥64,418

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0248 口頭試験の無料 2 本と告知を 11/3 までにそろえる | 実行 | 進行中（予定どおり） | 10/28 に「この記事でわかること」を足し `note-unpublished` で準備完了を確認済み。公開は発表日 11/4 当日 |
| DN-0819 10/31 の土曜の通しで全段 rc=0 を確かめる | 実行 | 未達 | 週次レビューは認証切れ、auth・kdp・note-sales・note-sync が失敗。空き容量不足でも復元が止まった。11/7 の回で再確認 |
| DN-0853 index coverage の分割取得の初回 run | 余力 | 一部 | 10/28・11/1 の run は 1,900 件を検査したが保存で落ちた（PR #1341・#1342 で修正。残りは DN-0922） |
| DN-0826 KDP の bookId 重複 | 余力 | 完了 | 台帳から削除・dispatch に完了記録 |
| 定常: 実験の判定（EXP-014/015/016） | 定常 | 一部 | EXP-014 を一部改善で閉じ、EXP-015 は 11/3、EXP-016 は 12/3 へ理由つきで延長 |
| 定常: 検索改善 週 3 件 | 定常 | 完了 | EXP-049・050・051 を記録。R8 見直しページの改善（38e5aec8c）はツールの不具合で未記録（DN-0923） |
| 定常: roll-backlog-when（10/31 の繰り越し） | 定常 | 未実施 | 11/3 以降の月次レビューで行う |
| 手動: DN-0360・DN-0895 | 手動 | 未了 | note 同期は反映待ち 357・止まっている 3。DN-0895 は期日 10/26 超過のまま |

## 開発活動

- コミット数: 382（10/26〜11/1・merge 除く。自動の記録コミットを含む）
- 主な変更: 商品導線の未配線 20 本と資格トップの配線（#1310）、建設部門の口頭教材の期間表示（#1309）、アフィリの配置の撮影と EXP-043→EXP-048（#1318・#1319）、affiliate:status の 0 件の修正（#1315）、GSC の URL 検査の保存失敗と 0 件成功の修正（#1341・#1342・#1344）、YouTube の公開済み動画の照合と導線修復（#1323・#1325・#1327・#1328）、Instagram 台帳の整理（#1338〜#1340）

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|
| 検索改善で直したページ | 4（うち記録 3） | 3 | +1 |
| 商品導線を配線した記事 | 20 | — | — |
| note 同期（反映済み／反映待ち／止まっている） | 598／357／3 | — | — |

- note 同期は 10/31 の土曜の回で Drive の配布 PDF が読めず（Unknown system error -11・3 回続けて失敗）、PDF の要る記事を翌週へ回した。止まっている 3 件は 10/24 の更新フローの中断（1級経験記述の置換・精読ガイドの共通工学編・法規編）
- 公開ページの目視確認: 土曜の収集の note-public-view 段は warn。撮影の読み込みは今回の手動実施では行っていない（未確認）

## 月の受取額（手数料控除後・管理画面トップと同じ集計）

| 月 | 合計 | note | ココナラ | KDP |
|---|---|---|---|---|
| 2026-11（途中） | — | —（未取得） | —（未取得・10-31 取得） | —（未取得） |
| 2026-10 | ¥64,418 | ¥56,655（推計・10-31 取得） | ¥0（途中・10-31 取得） | ¥7,763（推計・10-24 取得） |

## 資格別 KPI（2026-W43 窓・前週比）

| 指標 | 全体 | 前週比 | 1級土木 | 技術士 総監 | 技術士 建設部門 | RCCM |
|---|--:|--:|--:|--:|--:|--:|
| 自然検索 | 7,415 | +111.7% | 517 | 171 | 88 | 138 |
| Google クリック | 5,648 | +531.1% | 13（部分） | 6（部分） | 0（部分） | 4（部分） |
| note CTA | 383 | +171.6% | 6 | 16 | 3 | 12 |
| note 販売（件） | 7（部分） | +250.0% | 0（部分） | 0（部分） | 0（部分） | 0（部分） |
| note 売上（円） | 17,560（部分） | +194.6% | 0（部分） | 0（部分） | 0（部分） | 0（部分） |
| ココナラ（件） | 0 | — | 0 | — | — | 0 |
| 演習開始 | 51 | +13.3% | 1 | — | — | — |

欠測（—）は 0 ではない。資格間で合算しない。全体の伸びの大半は重点外の 2級土木（R8 二次の解答例ページ）。

## NSM（オーガニック検索流入）

- GA4 自然検索（日本）: 10/19〜10/25 は 7,415 人（前週 3,503 人・+111.7%）。直近 7 日（10/24〜10/30）は 8,892 人で、試験後も高い水準が続いている
- GSC（日本・web・プロパティ全体）: クリック 5,648（基線週平均 449.5）・表示 50,150・CTR 11.26%

### NSM トレンドの洞察

- 増加の主因は 2級二次（10/25）の試験直後の「解答」検索で、R8 解答例ページと配点・部分点ページが受け皿になった。季節要因なので、11 月は合格発表（2027-02-03）までの見直し需要として同ページ群を整える
- 注目クエリ: 「二級土木施工管理技士 二次試験」8.4 位・CTR 0.98%、「2級土木施工管理技士 2次試験 配点」1.5 位・CTR 5.88% → DN-0923・DN-0924

<!-- growth-digest:2026-W43 -->
## 計測ダイジェスト 2026-W43（2026-10-19〜2026-10-25・基線 2026-09-21〜2026-10-18 の週平均と比較）

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

### トリアージ対象 19 件（候補 136・抑止 27・表示上限で見送り SEO 3 / 収益 51）

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

未処分 0 件（19 件を処分。`data/analysis/growth/triage-log.json`）。

| OPP | 区分 | 処分 | 行き先・理由 |
|---|---|---|---|
| OPP-57c84288a8 | 実験 | 保留（〜11/3） | EXP-015。売上台帳が 10/24 まで・事後窓は 10/25 まで。note 10 月確定後に判定 |
| OPP-f2ba0b6d6d | 実験 | 判定（一部改善） | EXP-014。冒頭 CTA 0.16%→0.37%・同ページ群のクリック 186→296。基準 0.5% 未満 |
| OPP-8cf8dd82e2 ほか 8 件 | 実験 | 束ね | EXP-022〜029・034（search-improvement close で判定済み） |
| OPP-fcfcda5a1a | SEO | 起票 | DN-0923（候補の # 付き URL の不具合と R8 見直しページの記録） |
| OPP-5dd26ae975 | SEO | 起票 | DN-0924（配点ページの title と冒頭） |
| OPP-adc3bac9b1 | SEO | 起票 | DN-0925（スクレープドーザー） |
| OPP-a202ad33ee | SEO | 却下 | 試験直後の検索が R8 解答例へ移った季節要因 |
| OPP-22c5d85639 | SEO | 却下 | 沖縄の必携の逐語ページで、要綱の解説ページではない |
| OPP-9039aef12c | 収益導線 | 却下 | 1級二次は 10/4 に終了。発表までの切替は季節の運用で扱う |
| OPP-5b6a44c56a・OPP-9a77f81ae7 | 収益導線 | 束ね | DN-0706（技術士一次の CTA 画像） |

## 検索の改善（今週 3/3 件・triage --check --weekly exit 0）

| ページ | 検索語 | 直したこと | 記録 |
|---|---|---|---|
| /exam/civil-construction-2/secondary/r07 | 2級土木施工管理技士 2次試験 解答 | seoTitle と冒頭（公式解答は非公表・全 9 問の参考解答例） | EXP-049（f3feb1b52） |
| /exam/civil-construction-1/secondary/r04 | 2級土木施工管理技士 実地試験 解答例 令和4年 | 冒頭の概要と 2級 R4 への案内 | EXP-050（f569ea611） |
| /practice/owner-safety-responsibility | 発注者責任 安全配慮義務 | seoTitle と冒頭の答え | EXP-051（ee596a036・文末修正 a59870b46） |
| /exam/civil-construction-2/guide/r08-secondary-answers | 2級土木施工管理技士二次試験 | seoTitle を「二次試験」表記と解答の公表有無へ | 未記録（38e5aec8c・DN-0923） |

判定 9 件: 成功 EXP-027（cpd 20.1→9.8 位）・EXP-028（1級二次 R6 15.5→7.3 位）・EXP-029（公務員の資格マップ 11.4→7.7 位）、一部改善 EXP-023・024、効果なし EXP-022・025・026・034（共通仕様書の地方ページ。表示が週数件で判定できない）。

## 実験の進捗

### Running

| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-010 | note CTA の noreferrer を外し流入元を測る | 47 日 | doboku-note.com 0 → 52 PV（10/1〜10/10 の途中取得） | 11/7 に月全体で GA4 と桁を比べて閉じる |
| EXP-015 | 2級経験記述 3 商品の値上げ | 26 日 | ¥6,440（3 件）→ ¥2,980（1 件・台帳 10/24 まで） | 11/3 に確定値で判定 |
| EXP-016 | 主任技士 小論文単品 ¥1,480 | 26 日 | 新構成の基線なし → ¥7,960（2 件・10/27 まで） | 12/3（事後窓 11/29 の後） |
| EXP-047 | 建設部門の口頭教材の期間表示 | — | — | 11/4 以降の deploy 後に running |
| EXP-049〜051 | 検索改善 3 件 | 0 日 | 本番反映待ち | 本番反映で計測開始 |

### Measuring

- EXP-008・EXP-017（転職アフィリ）は A8 の月次成果の取り込み待ち（要人手）

### 今週 close

- EXP-014: 一部改善 — 冒頭 CTA は 0.16%→0.37% に上がったが基準 0.5% 未満。商品を検索意図に合わせる方向は維持し、冒頭は短い案内に絞って本文カードへ寄せる
- EXP-022〜029・034: 上の「検索の改善」のとおり

### 次サイクルへの仮説

- 試験直後の「解答」検索は、公式解答が非公表であることを冒頭で答えるページが取る。合格発表まで、見直し・配点・合格基準の受け皿を同じ形で整えると CTR が上がる（DN-0924）
- 冒頭の 1 行 CTA は本文カードの 1/10 以下のクリック率に留まる。冒頭は商品名より「次に読むもの」の案内にした方が率が出るかを、2級で試す

## PSI と実ユーザー計測

- CI ゲート違反（field 実害・取得失敗率 20% 超）: 0 件
- lab のしきい値超過: トップ（mobile LCP 5,401ms）、1級の strategy・four-management・concrete-basics（mobile LCP 5.8〜7.4 秒）、/search の SEO 66、1級 r07-a の desktop CLS 0.25。いずれも lab で、実害の判定は下の実ユーザー計測で行う
- 実ユーザー計測（10/3〜10/30・83,768 件）: 不良 0。要改善 3 組＝2級一次の desktop CLS 良好率 72%、技術士一次の過去問 mobile INP 74%、技術士一次トップ mobile INP 70%（53 件）。不良が無いので起票しない
- build 後 SEO スキャン（11/1）: 1,972 URL・error 0・warn 407（jsonld_recommended_missing・前週比 ±0）

## 収益カバレッジ ダッシュボード

- 計測ダイジェストの入力に monetization-coverage を取得済み。収益導線の機会 51 件は表示上限で見送り、上位 3 件を処分した（技術士一次 2 件は DN-0706 へ束ね）
- 売上台帳: 2026-09 は 35 件 ¥106,800、2026-10 は 22 件 ¥67,680（最終転記 10/31・10 月確定前）。9 月の明細と月次表示の差（¥106,800 と ¥103,560）が sales-freshness の FAIL として残る

## SNS 流入と投稿実績

- SNS は運営者の指示で保留中。今週も X・Instagram の追加投入はしていない（Instagram の予約済み 3 件の台帳整理と、YouTube の予約済み・公開済み動画の照合・導線修復は別セッションで実施）
- 計測ダイジェストの organic-social は 12 セッション（基線週平均 26.3）、organic-video は 0。保留中なので起票しない

## 校正学習の蒸留

- 今週の学習候補: なし（手動実施のため /distill-proofread-learnings は回していない。content/site の校正コミットは検索改善 4 件のみ）
- 一点だけ記録: 冒頭に答えの段落を足すと「〜ます。」の 3 文連続（content-quality 15-1）に掛かりやすい。サブエージェントは常体へ逃げて文体が混ざった（a59870b46 で「ました」に直した）

## SNS 予約キュー投入（X）

- SNS 保留中のため投入しない。surfacer は見出しの日付が読めない下書き 11 件を判定不能と出している（保留解除時に見出しの書式を直す）

## 点検と Issue

- check-workflow-health: index-coverage.yml の最後の success が 12 日前 → 振り分け: DN-0853
- quality:audit:weekly: egov-drift（11/1 施行の法改正 2 本・4 記事）と search-triage（判定待ち 9 件。11/1 に全件 close 済み） → 振り分け: DN-0926
- #1006 note-live-audit の異常（10/12〜） → 振り分け: DN-0819
- #1180 index-coverage の閾値ゲート（10/21〜） → 振り分け: DN-0853
- #1217 土曜の収集が完了しない（10/24〜） → 振り分け: DN-0819
- #1256 workflow-health（index-coverage が 12 日 success なし） → 振り分け: DN-0853
- #1257 report 区分の FAIL（external-links） → 振り分け: DN-0927
- #1312 weekly-review-guard が止まっている → 振り分け: DN-0927
- #1330 自動の週次レビューが完了しない（Claude の認証切れ） → 振り分け: DN-0819
- #1331 GSC の記録層が完了しない（同じ認証切れ） → 振り分け: DN-0819
- dependabot:minimatch medium → 振り分け: DN-0928

## 課題・ブロッカー

1. 土曜の Mac の流れが 2 週続けて完走していない。今週は Claude の認証切れ・KDP のログイン・Drive の読み取りエラー・空き容量の 4 つが重なった（DN-0819）
2. 空き容量が予約 20GB を恒常的に割っている。今回は 5.3GB を消して 17GB。Codex の worktree（約 11GB）とアーカイブ済みの会話（5.9GB）の整理は運営者の判断
3. 9 月の note 販売明細と月次表示の差 ¥3,240（sales-freshness）が解けず、9 月の受取額の確定を妨げている
4. backlog の検証で quality:audit:ci が 1 回目に検査不成立（Kindle の EPUB 0 冊・content-series のタイムアウト）。復元後に再実行した

## 学び

- 自動の週次レビューは「収集は回ったのにレビュー本体だけ認証切れで止まる」ことがある。Issue #1330 は出たが、手動で回すまで成果物は 0 だった。認証の期限は収集の auth 段で事前に見えるようにしたい（DN-0819 の残りに含める）
- 試験直後の需要は、問題・解答例を公表当日に出したページへ一気に集まる。2級 R8 は 10/26 公開が効いた
- 表示が週数件の地方の共通仕様書ページは、title を直しても判定できない。検索改善の候補から外し、表示の多いページへ手を回す

## バックログの関門

判断待ち 14 件を運営者に諮った（11/1）→ やる 5（DN-0706・DN-0878・DN-0905・DN-0491・DN-0343 を 🟡 へ）／やらない 1（DN-0858＝W11 は公開のまま来年まで寝かせ、カード削除）／保留 8（データ待ちの DN-0305・0844・0721・0572・0507・0505・0726 と、運営者が管理画面で決める DN-0903）。判断の時期が先の 9 件はその月に諮る。

- 期日切れ 1 件: DN-0440 は資格欄の表示待ちで、期日を本試験日 11/29 に直した
- 直近 7 日の起票 48 件: 重要度と時期に大きなずれは無い。今回の起票は DN-0923〜0928（6 件・すべて 🟡 [時期:2026-11]、DN-0925 のみ 🟢）
- 7 日超の automation-failure Issue: #1006・#1180・#1217 は既存カード（DN-0819・DN-0853）、#1257・#1312 は DN-0927 を起票
- 健全性: S2 1 件（Windows の npm test・low のまま）、S3 8 件（転送の見直しなど既存）、S14 は解消、S15 9 件は月次の roll-backlog-when で扱う
- backlog の検証: 対象 6 本・実走 6 本（赤→緑 0・常時緑 1＝check-video-content を指す L127 のカードの検証が完了判定にならない・赤 2）

## 来週への申し送り

- 10 月の月次レビュー（11/3 以降）で受取額と目標 ¥100,000 の差を判定し、9 月の記録の残る欠測を読む → 振り分け: 定常
- EXP-015 を 11/3、EXP-010 を 11/7 に判定する → 振り分け: EXP-015, EXP-010
- 技術士の筆記合格発表（11/4）に無料 2 本を公開し、建設部門の冒頭 CTA を切り替える → 振り分け: DN-0248
- 技術士一次（11/22）の CTA 画像を 11 月前半に作る → 振り分け: DN-0706
- 検索改善の候補の # 付き URL を直し、R8 見直しページの改善を記録する → 振り分け: DN-0923
- 2級二次の配点ページの title と冒頭を直す → 振り分け: DN-0924
- 11/1 施行の法改正 2 本に合わせて 4 記事を確かめる → 振り分け: DN-0926
- weekly-review-guard と external-links を直す → 振り分け: DN-0927
- minimatch の脆弱性を直す → 振り分け: DN-0928
- 土曜の流れを 11/7 に全段 rc=0 で通す（運営者は Claude・KDP のログインをやり直す） → 振り分け: DN-0819
- index coverage の全件の結果の保存を確かめる → 振り分け: DN-0922
- note 同期の反映待ちと止まっている 3 件を片付ける → 振り分け: DN-0360
- afb の講座の提携を解除する（運営者の操作） → 振り分け: DN-0878
- 実験の上限を stats47 と同じ方針に直す → 振り分け: DN-0905
- 行政書士の位置づけ（2027 年 11 月受験）を 02・03 に反映する → 振り分け: DN-0491
- 土木二次の売上の切り分けに着手する → 振り分け: DN-0343
- 10 月の note 確定（11/2 以降）で W44 の事業記録を supersedes で訂正する → 振り分け: 定常
- SNS の新規展開・追加予約・認証復旧は再開指示まで保留する → 振り分け: 定常
- （W43 から転記・統合先へ付け替え）本文中の note CTA の表示上位ページを現物で直す → 振り分け: DN-0532
- （W43 から転記・統合先へ付け替え）index coverage を分割取得にする → 振り分け: DN-0853
- （W43 から転記・統合先へ付け替え）RCCM の問題数・AI 編集メモ・口頭チェック記号の残り（口頭対策）を直す → 振り分け: DN-0819
- （W43 から転記・統合先へ付け替え）2級 r05/overview の CTA の 28 日比較（11/9 以降）を読む → 振り分け: DN-0532

## 記録と出典

事業 snapshot: `data/business/records/snapshot-2026-11-01T05-56-25-521Z-8ea41dca-cd78-4e00-8f2b-b9d4387adfd9.json`。weekly 記録: `data/business/records/review-2026-11-01T05-56-48-511Z-cc0663a7-bd3f-4dbb-8709-fe2f85551c0c.json`。点検: `data/business/records/checks-weekly-2026-W44-2026-11-01T05-03-12-982Z.json`。

主な入力: `node scripts/build-weekly-review-draft.mjs --print`（11/1 生成）、`data/analysis/growth/digest-2026-W43.json`、`data/ga4/reports/2026-10-31.json`、`.claude/state/weekly-collect/runs.json`、`~/Library/Logs/doboku-note/weekly-review.log`。
