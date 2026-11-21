# 週次レビュー 2026-W47

作成日: 2026-11-21
対象期間: 2026-11-16 〜 2026-11-22（事業レビューと計測は前の完了週 2026-11-09〜2026-11-15＝W46 窓）

前週: [2026-W46-review.md](./2026-W46-review.md)。スケジュール済みタスク doboku-weekly-review の自動実行で、運営者の確認なしに書いた。判断が要る項目は「見送り・承認待ち」とした。11/20・11/21 は dev のコミットが 0 件のため、開発活動は 11/16〜11/19 の分。

---

## サマリー

- 計画タスク達成率: 0/8（DN-0819・DN-0500・DN-0706・DN-1044・DN-0360 は完了記録なし。DN-1190・DN-1191・DN-1089 は進捗はあるが完了は未確認）
- 主な成果: 管工事 1級 第二次の令和 8 年度予想を note で公開（230d117a28）、ココナラの土木添削を月額に作り替え（DN-1235）、エージェントを 84→75 体へ再編。11 月の受取額は途中で ¥81,881 となり、10 月の確定 ¥67,991 を超えた
- 要注意: 土曜の収集は a8・gsc が failed で、11/21 の値は未取得（DN-1266・DN-1267）。期日切れのカードが 4 件ある。校正学習の蒸留は 11/08 から止まっている
- 数値の要点: W46 窓の Google クリックは 1,052 で基線週平均の -51.7%（試験後の季節の減衰が主因）。演習開始は 261（+222%）。note 販売は 15 件 ¥32,400（部分）

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0500 技術士一次の解答速報 | 実行 | 未達 | 11/16 以降のコミット 0（最終 11/10）。試験は 11/22 で、公式正答の公開後すぐ埋める |
| DN-0706 技術士一次 CTA の本番確認 | 実行 | 未達 | コミット 0 |
| DN-0819 11/21 の収集を全段 rc=0 | 実行 | 未達 | a8・gsc が failed、note-audit・competitors が skipped、note-public-view・note-live・note-sync-check が warn |
| DN-1190 収集のログイン以外の失敗 | 実行 | 一部 | W47 内のコミット 0。note-traffic・note-sales・coconala・moshimo は ok に戻ったが、a8・gsc が新たに failed |
| DN-1191 朝の GSC 登録の記録 | 実行 | 一部 | 登録の記録は commit された（bf0c01c546）。収集の gsc 段は failed |
| DN-1044 過去問の解説を有料側へ | 実行 | 未確認 | 2fd78a38a2 が触れるが、資格 1 つの切り替えかは未確認 |
| DN-1089 10 月の受取額の自動記録 | 手動 | 未確認 | business-records 段は ok だが記録の中身は読んでいない |
| DN-0360 note 同期の止まり | 手動 | 未達 | 記録なし。止まりは 11 件に増えた |

定常: 月次レビュー 2026-10 は W46 内に補完済み（0d8f2108bd）。検索改善は 0/3、校正学習の蒸留は未実施、X の競合の再スキャンは未実施。

## 成果ハイライト

1. 管工事 1級 第二次（12/6）の令和 8 年度予想を note で公開した（230d117a28）
2. ココナラの土木添削を月額の定期購入に作り替えた（DN-1235）。ブログの新規執筆は停止して DN-1247 を起票
3. ハーネスの再編: 領域モデル（DN-1241）、エージェント 84→75 体（DN-1242・DN-0798）、`.claude/scripts` から `scripts/` への集約（DN-1250）

## 開発活動

- コミット数: 143（11/16〜11/19。最新は 11/19 21:46。11/20・11/21 は 0）。todo 34・chore 19・YouTube 公開状態の記録 17・content 11・refactor 7・fix 5・API 照合 3
- 主な変更: ハーネス再編（上記）、サイト内回遊と note 配線の不足の修正（2fd78a38a2）、資格トップの転職バナー重複の修正（#1644）、YouTube の予約への前倒し（11/18）、X の返信上限の修正（11/17 分）
- 変更ファイル数（重複除く）: article.mdx 11・note 146・kindle 1・coconala 4・sns 20
- backlog の消化件数・不具合の起票/閉鎖数・`check-backlog-verify` の実走結果は、この回では集計していない（未取得）
- 台帳の健全性: カード 265 件。S2 は 0。S3（意思決定なのに tier≠🟣）9 件・S11 3 件・S12 3 件・S13 1 件・S16 2 件は次の `/backlog-sweep --audit` へ（定常）。S14 期日超過 4 件は下の「バックログの関門」

## コンテンツ実績

| カテゴリ | 今週 | 備考 |
|---|---|---|
| サイト記事（変更した article.mdx） | 11 | 新規か更新かの区別は未集計 |
| note 原稿（変更したパス） | 146 | 未反映 434 件（止まり 11 件）。反映は下の note 同期 |
| Kindle | 1 | 新刊かは未確認 |
| ココナラ | 4 | 土木添削の月額化（DN-1235） |
| SNS の下書き | 20 | |

先週と同じ数え方の記録が無く、増減は出していない。YouTube の公開本数は未取得（記録は予約・公開状態の更新 17 件と API 照合 3 件）。競合の再スキャンは X が期限超過（DN-1272）。

## 月の受取額（手数料控除後・管理画面トップと同じ集計）

| 月 | 合計 | note | ココナラ | KDP |
|---|---|---|---|---|
| 2026-11（途中） | ¥81,881 | ¥59,132（推計・11-21 取得） | ¥0（途中・11-21 取得） | ¥22,749（推計・11-21 取得） |
| 2026-10 | ¥67,991（確定） | ¥57,435（確定・11-14 取得） | ¥0（確定・11-21 取得） | ¥10,556（確定・11-21 取得） |

目標 ¥100,000 に対し 11 月は途中で -¥18,119。KDP と note は推計で、確定ではない。

## 資格別 KPI（2026-W46 窓・前週比）

| 指標 | 全体 | 前週比 | 1級土木 | 技術士 総監 | 技術士 建設部門 | RCCM |
|---|--:|--:|--:|--:|--:|--:|
| 自然検索 | 3,541 | +16.9% | 380 | 195 | 185 | 27 |
| Google クリック | 1,052 | +7.9% | 6（部分） | 7（部分） | 3（部分） | 1（部分） |
| YouTube 経由 | 23 | -17.9% | — | — | — | — |
| X 経由 | 6 | -40.0% | — | — | — | — |
| Instagram 経由 | 2 | +100.0% | — | — | — | — |
| note CTA | 152 | +9.4% | 0 | 20 | 15 | 2 |
| note 販売（件） | 15（部分） | +36.4% | 0（部分） | 1（部分） | 2（部分） | 0（部分） |
| note 売上（円） | 32,400（部分） | +38.5% | 0（部分） | 1,980（部分） | 2,760（部分） | 0（部分） |
| ココナラ（件） | 0 | — | 0 | — | — | 0 |
| 演習開始 | 261 | +91.9% | 0 | — | — | — |

欠測（—）は 0 ではない。資格間で合算しない。

## NSM（オーガニック検索流入）

W46 窓（11/9〜11/15）の自然検索は 3,541（前週比 +16.9%）。Google のクリックは 1,052 で基線週平均 2,179 の -51.7%。GA4 の Organic Search の人数は、この回では別の窓の値と並べていない（未取得）。

### NSM トレンドの洞察
- クリックの減衰は 2級土木 二次（10/25 試験）の当日ページが主因: r08-secondary-answers が 4455→381→39→25、secondary-grading-and-partial-credit が 225→88→19→12。試験後の季節の減衰として扱い、即 noindex や改稿の起票はしない（固定 URL で翌年へ持ち越す）
- 上昇は コンクリート主任技士（/exam/concrete-chief-engineer 35.3→121）と 技術士一次（/exam/pe-first-stage 18.5→49。11/22 試験）。因果は未確認
- bing の自然検索セッションは 3,258（基線 -20.4%）で、Bing Webmaster のクリック 2,607 の 1.2 倍

## 計測ダイジェスト

<!-- growth-digest:2026-W46 -->
### 計測ダイジェスト 2026-W46（2026-11-09〜2026-11-15・基線 2026-10-12〜2026-11-08 の週平均と比較）

入力: growth-pack=取得済み / monetization-coverage=取得済み / bing-webmaster=取得済み

| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |
|---|--:|--:|--:|--:|--:|
| bing | 3,258 | 4,094.5 | -20.4% | 76.7% | 102 |
| google | 1,683 | 2,267.5 | -25.8% | 77.4% | 156 |
| direct | 589 | 703.5 | -16.3% | 69.3% | 53 |
| yahoo | 412 | 656.8 | -37.3% | 77.2% | 29 |
| organic-other | 172 | 95.5 | +80.1% | 74.4% | 0 |
| referral | 125 | 126.8 | -1.4% | 85.6% | 12 |
| ai-assistant | 113 | 58.3 | +94% | 73.5% | 13 |
| unassigned | 45 | 9.5 | +373.7% | 68.9% | 0 |
| organic-video | 24 | 15 | +60% | 16.7% | 2 |
| organic-social | 19 | 15 | +26.7% | 73.7% | 2 |

GSC（日本・web・プロパティ全体）: クリック 1,052（基線週平均 2,179・-51.7%）/ 表示 19,469 / CTR 5.4%

ページ明細（国の条件なしのページ別＝匿名化された検索語の分を含み、日本以外の行も含む）: 1565 行・1062 クリック / 25505 表示・byPage 全体（日本）1,058 クリックの 100% / 表示の 104%。急落・減衰の判定に使う。全体の KPI・資格別の合計には使わない。

Bing 照合: GA4 の bing 自然検索セッション 3,258 / Bing Webmaster クリック 2,607（1.2 倍）

| イベント | 今週 | 基線週平均 | 増減 |
|---|--:|--:|--:|
| note_cta_click | 152 | 198 | -23.2% |
| affiliate_cta_click | 6 | 7.3 | -17.2% |
| coconala_cta_click | 4 | 1.8 | +128.6% |
| quiz_cta_click | 0 | 0.3 | -100% |
| note_cta_impression | 16,371 | 19,514.5 | -16.1% |
| affiliate_cta_impression | 7,323 | 6,250 | +17.2% |
| coconala_cta_impression | 529 | 509.8 | +3.8% |
| quiz_start | 261 | 81 | +222.2% |
| quiz_complete | 36 | 14.5 | +148.3% |
| standards_data_download | 1 | 2.8 | -63.6% |

google 流入の上昇: /exam/concrete-chief-engineer（35.3→121） / (not set)（103.3→185） / /exam/concrete-chief-engineer/guide/essay（10.8→47） / /exam/pe-first-stage（18.5→49） / /exam/pipe-work/guide/kotei-hyo（1.3→31）
google 流入の下落: /exam/civil-construction-2/guide/r08-secondary-answers（1194.8→35） / /exam/civil-construction-2/guide/secondary-grading-and-partial-credit（78.8→14） / /exam/civil-construction-2/secondary/experience-writing-guide（22.8→2） / /exam/civil-construction-2/secondary/experience-writing-examples（18→0） / /tools/keiken-charcount（17.5→1）

## 計測→改善トリアージ

未処分 19 件（W46 のダイジェスト）を全件処分した。台帳への書き込みは `growth-triage apply` の `--commit` が要る（このタスクでは付けていない。判断ファイル: `.tmp/review-prepare/weekly-2026-W47/triage-decisions.json`）。

| OPP | 区分 | 処分 | 行き先・理由 |
|---|---|---|---|
| OPP-06f268d461 | 実験 EXP-020 | 保留 | 実験の close は運営者の判断。承認待ち |
| OPP-37c15daeb0 | 実験 EXP-031 | 保留 | 同上 |
| OPP-404ef7f215 | 実験 EXP-037 | 保留 | 同上 |
| OPP-497218663e | 実験 EXP-033 | 保留 | 同上（目安 worse） |
| OPP-4dcc698adc | 実験 EXP-030 | 保留 | 同上 |
| OPP-8917c5b288 | 実験 EXP-021 | 保留 | 同上 |
| OPP-9532e1b6ef | 実験 EXP-032 | 保留 | 同上 |
| OPP-ba3632c4e5 | 実験 EXP-063 | 保留 | 11/30 と合格発表の後に Brevo の件数を読む（要人手） |
| OPP-d75bce3403 | 実験 EXP-036 | 保留 | 実験の close は運営者の判断 |
| OPP-e340c70939 | 実験 EXP-035 | 保留 | 同上（目安 no-effect） |
| OPP-f8ef67e9fb | 実験 EXP-008 | 保留 | 要人手 2 件（report-career-funnel の再実行・A8 の月次成果は要ログイン。a8 段は failed → DN-1266） |
| OPP-0694ea3680 | SEO 減衰 | 却下 | 試験日 10/25 の当日ページの季節の減衰。固定 URL で翌年へ持ち越す既存カードが扱う |
| OPP-ff05bcc774 | SEO 減衰 | 却下 | 試験後の季節の減衰 |
| OPP-92a81ae5df | SEO 減衰 | 却下 | 試験後の季節の減衰 |
| OPP-b5118986af | SEO 減衰 | 却下 | 試験後の季節の減衰 |
| OPP-06b447126e | SEO 減衰 | 却下 | 試験後の季節の減衰 |
| OPP-3612c246ab | CTA 率 0.37% | 却下 | 流入が季節で落ちた後の率で件数が小さく判断できない。翌年の試験期に再び出れば扱う |
| OPP-40eb9c315c | 収益導線なし | backlog | DN-1270（/practice/formwork-removal-timing に導線を足す） |
| OPP-2261b1b670 | CTA 率 0% | 束ね | DN-0706 の本文へ追記（技術士一次の CTA） |

## 実験の進捗

総数 66（running 37・done 25・abandoned 4）。期限の来た 15 件は、この回では判定も再計測の記録もしていない（close と開始の判断は運営者の承認待ち）。

| ID | 状態 | この回の扱い |
|---|---|---|
| EXP-020・021・030〜033・035〜037 | 事後窓が完了（目安は insufficient-data が多い。EXP-033 は worse・EXP-035 は no-effect） | 見送り・承認待ち（close は運営者） |
| EXP-008・EXP-063 | 要人手 | A8 の月次成果（要ログイン）・11/30 以降の Brevo の件数 |
| EXP-052〜055 | 再計測日 11/21 を超過 | 次週に `/nsm-experiment measure`（定常） |
| EXP-017・018・045・046 | W46 からの持ち越し | 見送り・承認待ち |
| EXP-012 | 判定 11/26 | その後に DN-0305・DN-0844 を諮る |

### 今週 close
- なし

### 次サイクルへの仮説
- 試験当日の速報ページは当日に集中して減衰する。減衰を改善の対象にせず、翌年の試験期の再点検に回す

## PSI パフォーマンス推移

```
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**
- `https://doboku-note.com/search` (desktop): **SEO** = 66 (閾値: ≥90)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **CLS** = 0.214 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/primary/r07-a` (desktop): **TBT** = 682ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/civil-construction-1/secondary/r07` (desktop): **TBT** = 353ms (閾値: ≤300ms)
- `https://doboku-note.com/exam/pe-comprehensive-management/past-exams/r07-primary` (desktop): **CLS** = 0.17 (閾値: ≤0.1)
- `https://doboku-note.com/exam/pe-comprehensive-management/keywords/agile` (desktop): **TBT** = 546ms (閾値: ≤300ms)
- `https://doboku-note.com/` (mobile): **LCP** = 5357ms (閾値: ≤2500ms)
実ユーザー計測 data/rum/web-vitals/2026-11-20.json（2026-10-23〜2026-11-19・1 日前）状態 ok・イベント 115479 件
  要改善　 CLS desktop 良好率  72%（254 件）/standards/mlit
  要改善　 INP tablet  良好率  61%（64 件）/exam/pe-first-stage/primary
手を打つ組 2（不良 0）
```

### 洞察
- CI ゲートの違反（field 実害）は 0 件。ラボ値の TBT・CLS・LCP は閾値超えが続くが、実ユーザー計測の不良は 0 で手を打つ組は 2（CLS の基準書の国交省目次・INP の技術士一次の過去問トップ）

### build 後 SEO スキャン

- 最新の記録: 2026-11-21。検査 2110 URL / sitemap 2110 URL
- error 0（前週比 ±0）/ warn 407（前週比 ±0）
- 前週の記録: 2026-11-14

| 型 | 区分 | 件数 | 前週比 |
|---|---|--:|--:|
| jsonld_recommended_missing | warn | 407 | ±0 |

## 収益カバレッジ ダッシュボード

収益カバレッジ（資格×チャネルの欠測）の集計は、この回では読んでいない（未取得）。W46 窓の CTA は note 152・アフィリ 6・ココナラ 4。収益導線が無い面は /practice/formwork-removal-timing（流入 544 人・28 日）→ DN-1270。

## SNS 流入と投稿実績

- 流入（W46 窓・GA4）: YouTube 経由 23（前週比 -17.9%）・X 経由 6（-40.0%）・Instagram 経由 2（+100%）。Instagram は取得しない決定のため指標は欠測のまま
- X 自分の投稿（11/21 取得・フォロワー 148）: W47 は 16 本・いいね 12・RT 0（前週 25 本・いいね 22・RT 0）
- X 返信（11/16 以降の記録）: 返信 12 件・見送り 38 件（11/18・11/19 の分）。11/20・11/21 の記録は無い（送っていないか未記録かは未確認）
- YouTube: 公開状態の記録 17 件と API 照合 3 件。11/18 の例は rendered→scheduled（予約）。公開本数は未取得

## 校正学習の蒸留

- 今週分は回していない。最新の記録は `.claude/state/proofread-learnings/2026-11-08.md`（13 日前）→ 来週の申し送り（定常）

## SNS 予約キュー投入（X）

```
📮 X 予約キュー投入 surfacer — 2026/11/21
   最終予約記録（途中の空白を含む）: 11/30   lookahead: 8 日

📦 ストック: 9 件 63 本（日時未定・載せる先: x-c1-restart-2027 13 本・DN-0220 39 本・x-pe1-2027 3 本・DN-0887 8 本）

✅ 投入待ちなし（lookahead 内に未投入の下書きはありません）
```

## その他パフォーマンス

### 検索の改善（今週 0/3 件）

- [資格名] /exam/surveyor/guide/overview「測量士試験」表示 65・最良 11 位
- [資格名] /exam/civil-construction-2/guide/exam-overview「土木施工管理技士2級」表示 47・最良 14 位
- [施工管理の転職] /exam/civil-construction-1/guide/public-engineer-salary-table「公務員 土木 年収」表示 39・最良 13.8 位

### 検索の週次処置

- 要処置 [資格名] /docs/civil-construction-1-guide-study-method: サイト内の 1 本が旧 URL を指している → /exam/civil-construction-1/guide/study-method へ張り替える
- 要処置 [土木公務員] /exam/civil-construction-1/guide/public-engineer-salary-table: 受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）
- 要処置 [土木公務員] /exam/civil-construction-1/guide/public-servant: 受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）
- 要処置 [資格名] /exam/pe-construction/guide/nanido-goukakuritsu: EXP-030 の事後窓が確定（16.7→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-030 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [施工管理の転職] /exam/civil-construction-1/guide/hatchu-shien: EXP-031 の事後窓が確定（20→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-031 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [施工管理の転職] /exam/civil-construction-2/guide/career-agent-comparison: EXP-032 の事後窓が確定（29.3→61・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-032 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-2/guide/textbooks: EXP-033 の事後窓が確定（13.8→15.7・目安 worse）→ npm run search-improvement -- close --id EXP-033 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/pe-comprehensive-management/guide/exam-index: EXP-035 の事後窓が確定（23.6→25・目安 no-effect）→ npm run search-improvement -- close --id EXP-035 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-1/guide/difficulty: EXP-036 の事後窓が確定（20.3→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-036 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/pe-construction/keywords/port-airport-exam-themes: EXP-037 の事後窓が確定（10.3→8.8・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-037 --result <success|partial|no-effect|negative> --learning "…" --commit

### note 同期

```
[note-sync-plan] 公開記事 1078: 反映済み 644 / 反映待ち 423 / 止まっている 11
  反映待ちの部品: 本文 434・カバー 27・タグ 0（配布 PDF の取り寄せが要る 310）
  止まっている: 前回の更新が途中で止まった 10 件 → note の公開ページを確認し、問題なければ note-update-body --sync --article <path> --force-retry --commit
    nd88d5ec77f2d  content/note/1級・2級土木/1級土木/1級経験記述を自分の現場に置換/article.md（2026-10-24T07:59:28: 更新フローが false を返した（保存せず中断））
    nd4320a66d09f  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/土木一般-共通工学編/article.md（2026-10-24T08:10:37: 更新フローが false を返した（保存せず中断））
    n653cd1b3ee71  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/施工管理-法規編/article.md（2026-10-24T08:09:47: 更新フローが false を返した（保存せず中断））
    n4863a5b0659b  content/note/技術士建設部門/magazines/BK-05_鋼構造及びコンクリート/R08-yosou/article-III.md（2026-11-14T09:06:54: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('[aria-label="メニューを開く"]').last()
    - locator）
```

### ココナラ取引

- 要対応 1・注意 0
- DM 10387969: 既読の問い合わせ （対象商品不明）（3日前） — 返信済みか確認。https://coconala.com/mypage/direct_message/10387969

### 売上台帳

```
最終更新: 2026-11-21
【2026-10】 22件 / ¥67,680 ★¥15kマイルストーン達成
【2026-11】 32件 / ¥69,680 ★¥15kマイルストーン達成
```

### handoff の棚卸し

- `docs/handoffs/2026-10-15-pe-municipal-oral-publish.md` が 1 件残る（37 日経過）。抽出して削除できるかは未確認 → 来週の申し送り（定常）

## 点検と Issue

[review-checks] 週次 2026-W47: 点検 6 本中 6 本を実行 / 要対応 1・検査不成立 0 / 開いている Issue 6 / 依存の脆弱性 0。記録: `data/business/records/checks-weekly-2026-W47-2026-11-21T04-30-50-514Z.json`

- quality:audit:weekly の todo-claims-stale → 振り分け: 定常（次週の `/plan-weekly` で期限切れの claim を解放するか続けるかを決める）
- quality:audit:weekly の egov-drift → 振り分け: DN-1271
- quality:audit:weekly の competitor-scan-due → 振り分け: DN-1272
- quality:audit:weekly の search-triage → 振り分け: 定常（要処置 10 件のうち 7 件は実験の close＝承認待ち。残り 3 件〔旧 URL の張り替え・土木公務員の受け皿 2 件〕は次週の計画へ）
- #1217 weekly-collect（10/24〜）→ 振り分け: DN-0819
- #1445 gsc-indexing-local（11/6〜）→ 振り分け: DN-1191
- #1460 ops（11/8〜）→ 振り分け: 定常（X の予約は 11/30 まで入っている。遅れの中身は次週の計画で確かめる）
- #1475 report-checks（11/9〜）→ 振り分け: DN-1273
- #1625 workflow-health（11/16〜）→ 振り分け: 定常（今週の check-workflow-health は緑。起票元 workflow の成功で自動クローズを待つ）
- #1626 growth-triage（11/16〜）→ 振り分け: 定常（このレビューで 19 件を処分して解消。ただし書き込みは `--commit` 待ち）

土曜の収集の新規の不具合: a8 段 → DN-1266 ／ gsc 段 → DN-1267 ／ note-live 段（note-attach-file.mjs の exit 1）→ DN-1268 ／ note-audit 段の skipped 理由 → DN-1269。

## イシューマップ

- overall B2（DN-0343 が閉じた）・overall A1（DN-0932）・construction X2・T1（DN-0992）→ 振り分け: 定常（次の結びのカードは月次レビュー 2026-11 で決める。サブイシューの方針は運営者の判断）

## 課題・ブロッカー
- 完了ゲート `check-weekly-review --week 2026-W47` は未完 1 件で終わった（2 回実行）。`check-backlog-verify` で `[検証:]` の 2 本（site-visual-review・quality:audit:ci）が exit 2 の検査不成立になった（0〜2 ms で停止。worktree で起動できない・ロック等の可能性があり原因は未確認）。このレビューは「完了」ではない

1. 土曜の収集が全段 rc=0 に届かない。a8（検算で rawFile null・最後の ok 10/31）と gsc（実検査 0・最後の ok 11/14）が failed。11/21 の A8 と GSC の値は未取得（DN-1266・DN-1267・DN-0819）
2. 今週の計画 8 件のうち DN-0500・0706・1089・0360 は完了記録なし。DN-0500 は 11/22 当日に要る
3. 期日切れ 4 件（DN-1082・DN-0999・DN-0477・DN-1127）
4. 校正学習の蒸留が 11/08 から止まっている。11/20・11/21 はコミットが 0 件

## 学び

- 試験当日の速報ページは当日に集中し、3 週で 1/100 以下に落ちる。減衰は季節要因として扱い、即 noindex や改稿の起票はしない（固定 URL の方針で翌年へ持ち越す）
- 収集の段の ok は、取得の exit 0 でも検算で落ちる。a8 は 4 回とも exit 0 で、検算が rawFile null を見つけた。検算の失敗は取得の失敗として読む
- gsc 段が 2 秒で終わり実検査 0 になった。検査ゼロを PASS と読まない原則どおり failed で止まったのは正しい

## バックログの関門

運営者が居ない実行のため、判断は全件「見送り・承認待ち」とし、台帳は変えていない。

- 今決められる判断待ち 2 件: DN-0305・DN-0844 → 見送り・承認待ち（EXP-012 の判定 11/26 を待つ。期日 11/30・11/27）
- 判断の時期が先の 10 件（DN-0265・0624・0572・0427・1062・1006・1033・0428・1247・0331）: その月に諮る
- 期日切れ 4 件（DN-1082・DN-0999・DN-0477・DN-1127）: 次週の計画に優先で載せる。期日の再設定は運営者に諮る（カードは書き換えていない）
- 直近 7 日の起票 46 件: 重要度と時期の確認はしていない（件数だけ）。この回で DN-1266〜DN-1273 の 8 件を起票した → 次の `/backlog-sweep --audit`
- 閉じるカード: なし（完了の外部実体を確かめられたカードが無い。DN-1191 は記録の commit は直ったが 11/21 の gsc 段が failed のため残す）
- 7 日超の automation-failure Issue: #1217 → DN-0819、#1445 → DN-1191
- DN-0706 に OPP-2261b1b670 を束ねた

## 来週への申し送り

- 11/22 技術士一次の解答速報を、公式正答の公開後すぐ埋める → 振り分け: DN-0500
- 11/28 の土曜の収集を全段 rc=0 にする（a8・gsc の検算） → 振り分け: DN-0819
- a8 段の検算失敗（rawFile null）を直す → 振り分け: DN-1266
- gsc 段が実検査 0 で終わるのを直す → 振り分け: DN-1267
- note-live の添付の失敗・note-audit の skipped 理由を確かめる → 振り分け: DN-1268
- 10 月の受取額が収集だけで記録されたかを business-records の中身で確かめる → 振り分け: DN-1089
- 期日切れ 4 件の着手と期日の再設定 → 振り分け: DN-1082
- 技術士一次の CTA の本番確認（OPP-2261b1b670 を束ねた）→ 振り分け: DN-0706
- 期限の来た実験 15 件の判定（close 11 件は運営者・measure は EXP-052〜055）→ 振り分け: EXP-052
- egov-drift の差分の確認 → 振り分け: DN-1271
- X の競合の再スキャン → 振り分け: DN-1272
- quality-audit report 区分の FAIL → 振り分け: DN-1273
- 型枠の取り外し時期ページの収益導線 → 振り分け: DN-1270
- 校正学習の蒸留・handoff 1 件の抽出・検索の改善 3 件 → 振り分け: 定常
- ココナラの DM 10387969（既読・対象商品不明・3 日前）の返信の有無を確かめる（運営者）→ 振り分け: 定常

## 運営者に諮る項目

1. DN-0305・DN-0844（EXP-012 の判定 11/26 の後）
2. 実験の close 11 件（EXP-020・021・030〜033・035〜037・008・063）と、EXP-017・018 の判定・EXP-045・046 の開始
3. 期日切れ 4 件の期日の再設定
4. ココナラの DM 10387969 への返信
5. a8 の 11/21 の値（未取得・最後の ok 10/31）と gsc の 11/21 の値（未取得・最後の ok 11/14）。ログインは有効（auth-freshness OK 5/5）なので、原因はログイン以外
6. トリアージの書き込み（`growth-triage apply --decisions .tmp/review-prepare/weekly-2026-W47/triage-decisions.json --commit`）
