# 週次レビュー 2026-W48

作成日: 2026-11-28
対象期間: 2026-11-23 〜 2026-11-29（事業レビューと計測は前の完了週 2026-11-16〜2026-11-22＝W47 窓）

前週: [2026-W47-review.md](./2026-W47-review.md)。スケジュール済みタスク doboku-weekly-review の自動実行で、運営者の確認なしに書いた。判断が要る項目は見送り・承認待ち。開発活動は 11/23〜11/28 の分。

---

## サマリー

- 計画タスク達成率: 0/1 完了（DN-0500 は公式正答の掲載まで進んだが未クローズ・部分達成）。成果欄の目標 3 項目: ①部分 ②未達（収集 rc=1）③未確認（DN-1082 の着手コミット無し）
- 開発活動: develop 512 コミット。note 全資格の採点断定の言い回しの一括修正（DN-1311）、試験制度の一次情報照合（DN-1312）、一次建設専門の裏取り（DN-1304）、note コメント返信・本文更新・KDP 再出版の不具合修正（PR #1770・#1773）、CI の赤の削減（PR #1749）
- 集客（W47 窓）: GSC クリック 9,249（基線週平均 2,218・+317%）。主因は技術士一次 R8 解答速報（/exam/pe-first-stage/guide/r08-answers の google 流入 9.5→4,355）。2級土木二次の速報系は試験後の需要終了で急落（季節）
- 販売: ココナラ受注 4 件・計 ¥10,500（orders.json）。note 販売は収集失敗のため W47 窓の部分値のみ（6 件・¥13,880・部分）
- 月の受取額: 2026-11（途中）¥81,881（11-21 取得・途中）。11-28 の収集失敗で未更新。2026-10 確定 ¥67,991
- 土曜の収集: 8 段が失敗（auth・a8・moshimo・kdp・note-traffic・note-sales・coconala・gsc、post の note-live）。原因は「doboku-note の Playwright プロファイルを使う Chrome が既に稼働中」で起動を見送ったこと（ログイン切れではない）。note-sync は連続失敗で中断 → DN-1316

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0500 技術士一次の解答速報 | 実行 | 一部 | 00a35c0（11/24）で公式正答の掲載確認と科目別の正答表を載せた。60cfb8（11/25）で未掲載を記録。カードは残存で未クローズ |

計画表に載っていたのは 1 件のみで、注記（5 件・手動含め 9 件）と食い違う。表と注記は `/plan-weekly` でそろえる。成果欄の目標: ①11/22 一次の解答速報を公式正答で埋める＝部分 ②11/28 の収集を全段 rc=0＝未達（#1217 に rc=1 の再発） ③期日切れ 4 件（DN-1082）に着手＝未確認（git log に DN-1082 のコミット無し・台帳に該当カードが見当たらない）。

定常: 検索改善は 0/3、校正学習の蒸留は未実施（最新は 13 日前）、X の競合の再スキャンは未実施（DN-1324）。

## 成果ハイライト

1. note 全資格で採点断定の言い回しを一括修正（1級2級土木 328 記事・総監 69+54・建設 49+45・主任技士 46 ほか／DN-1311）。試験制度の記述を一次情報で照合（DN-1312）、技術士一次 建設専門 R01〜R07 の未確認の肢を裏取り（DN-1304）
2. 総監 論文戦略ガイドに R8 出題と条件一覧を追加（DN-1307）、コンクリ技士の暑中温度の誤記を訂正（DN-1305）
3. note コメント返信・本文更新・KDP 再出版の不具合修正（PR #1770・#1773／DN-1308〜1310）、CI の赤を減らした（PR #1749／DN-0998）。DN-1266・DN-1267（a8 検算・gsc 実検査 0 の修理）は 11/25 に完了コミット済み。ただし今週の実収集はプロファイル衝突で再検証できていない

## 開発活動

- コミット数: 512（11/23 14・11/24 132・11/25 180・11/26 70・11/27 47・11/28 69）。種別上位: content(note) 43・content(video) 20・fix(content) 17・chore(metrics) 14・chore(seo) 10・chore(note) 9・data(coconala) 7・chore(assets) 6・content(kindle) 4・content(pe-first-stage) 3・content(civil2) 3
- 主な変更: 上の成果に加え、PR #1723 テーマページ刷新、動画 総監 口述の立場の改訂版（DN-1239・12/10 予約準備）、EXP-067・EXP-068 の登録、Kindle の判断を strategy.md に集約（11/28）
- 新規公開記事・note 公開の件数: 未集計（コミット題名のみ。新規 note 公開は題名上確認できず）
- 台帳の健全性: カード 151 件を実検査。S2 は 1（DN-1299 の egov-laws 誤判定）・S3 7・S5 3・S11 1（DN-1312）・S12 4・S14 期日超過 2（DN-0500・DN-0844）・S16 2（DN-1164）。判定は `/backlog-sweep --audit`（定常）

## コンテンツ実績

| カテゴリ | 今週 | 備考 |
|---|---|---|
| サイト・note・Kindle・SNS の新規本数 | 未集計 | コミット題名のみ。内訳は開発活動の種別上位を参照 |
| ココナラ受注 | 4 件・¥10,500 | 11/26 主任技士小論文診断 ¥2,000・総監添削 ¥3,500・建設部門添削 ¥3,000（いずれも納品済）／11/28 主任技士小論文診断 ¥2,000（受領・期限 11/30） |
| YouTube | 公開 6・新規予約 15 | 先の予約の残り 21（下の YouTube の節） |

## 月の受取額（手数料控除後・管理画面トップと同じ集計）

| 月 | 合計 | note | ココナラ | KDP |
|---|---|---|---|---|
| 2026-11（途中） | ¥81,881 | ¥59,132（推計・11-21 取得） | ¥0（途中・11-21 取得） | ¥22,749（推計・11-21 取得） |
| 2026-10 | ¥67,991（確定） | ¥57,435（確定・11-14 取得） | ¥0（確定・11-21 取得） | ¥10,556（確定・11-21 取得） |

2026-11 の値はすべて 11-21 取得（途中）で、11-28 の収集で note-sales・kdp・coconala が失敗したため未更新。欠測を 0 にしていない。目標 ¥100,000 に対する差は、最新の値が古いため出さない。

## 資格別 KPI（2026-W47 窓・前週比）

| 指標 | 全体 | 前週比 | 1級土木 | 技術士 総監 | 技術士 建設部門 | RCCM |
|---|--:|--:|--:|--:|--:|--:|
| 自然検索 | 7,199 | +103.3% | 283 | 215 | 176 | 26 |
| Google クリック | 9,249 | +779.2% | 8（部分） | 5（部分） | 2（部分） | 0（部分） |
| YouTube 経由 | 25 | +8.7% | — | — | — | — |
| X 経由 | 5 | -16.7% | — | — | — | — |
| Instagram 経由 | 1 | -50.0% | — | — | — | — |
| note CTA | 178 | +17.1% | 4 | 19 | 14 | 1 |
| note 販売（件） | 6（部分） | -60.0% | 0（部分） | 1（部分） | 2（部分） | 0（部分） |
| note 売上（円） | 13,880（部分） | -57.2% | 0（部分） | 980（部分） | 4,960（部分） | 0（部分） |
| ココナラ（件） | 0 | — | 0 | — | — | 0 |
| 演習開始 | 432 | +65.5% | 1 | — | — | — |

欠測（—）は 0 ではない。資格間で合算しない。

## NSM（オーガニック検索流入）

W47 窓（11/16〜11/22）の自然検索は 7,199（前週比 +103.3%）。Google のクリックは 9,249 で基線週平均 2,218 の +317%（前週比 +779.2%）。

### NSM トレンドの洞察
- 上昇の主因は技術士一次（11/22 試験）の R8 解答速報 /exam/pe-first-stage/guide/r08-answers（google 流入 9.5→4,355）。ほかに r07-construction（11.8→93）・/exam/pe-first-stage（28.5→107）・r06-basic（15.5→88）
- 下落は 2級土木 二次（10/25 試験）の速報系: r08-secondary-answers（1125.5→7）・secondary-grading-and-partial-credit（79.8→4）。試験後の季節の減衰で、即 noindex はしない。ただし /exam/building-construction/guide/2kyu-keiken-kijutsu（16.3→0）は季節だけでは説明しきれない → DN-1322
- 速報の流入は CTA 率 0.13%（サイト平均 0.55%）。販売へつなぐ設計は EXP-063 の判定を待つ

## 計測ダイジェスト

### 計測ダイジェスト 2026-W47（2026-11-16〜2026-11-22・基線 2026-10-19〜2026-11-15 の週平均と比較）

入力: growth-pack=取得済み / monetization-coverage=取得済み / bing-webmaster=取得済み

| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |
|---|--:|--:|--:|--:|--:|
| google | 6,989 | 2,457 | +184.5% | 80.4% | 208 |
| bing | 3,538 | 3,972.3 | -10.9% | 78.9% | 129 |
| direct | 1,917 | 773.5 | +147.8% | 40.8% | 56 |
| yahoo | 1,239 | 696.8 | +77.8% | 79.4% | 52 |
| referral | 188 | 136.5 | +37.7% | 78.7% | 26 |
| organic-other | 164 | 127 | +29.1% | 79.9% | 2 |
| ai-assistant | 120 | 79.5 | +50.9% | 75% | 12 |
| unassigned | 47 | 18.5 | +154.1% | 83% | 2 |
| organic-video | 38 | 21 | +81% | 39.5% | 0 |
| organic-social | 17 | 16.8 | +1.5% | 70.6% | 0 |
| email | 2 | 0 | — | 100% | 0 |

GSC（日本・web・プロパティ全体）: クリック 9,249（基線週平均 2,218.3・+317%）/ 表示 43,831 / CTR 21.1%

ページ明細（国の条件なしのページ別＝匿名化された検索語の分を含み、日本以外の行も含む）: 1670 行・9277 クリック / 91975 表示・byPage 全体（日本）9,268 クリックの 100% / 表示の 101%。急落・減衰の判定に使う。全体の KPI・資格別の合計には使わない。

Bing 照合: GA4 の bing 自然検索セッション 3,538 / Bing Webmaster クリック 2,674（1.3 倍）

| イベント | 今週 | 基線週平均 | 増減 |
|---|--:|--:|--:|
| note_cta_click | 178 | 200.8 | -11.3% |
| affiliate_cta_click | 24 | 6.3 | +284% |
| coconala_cta_click | 7 | 2 | +250% |
| quiz_cta_click | 4 | 0.3 | +1500% |
| note_cta_impression | 22,649 | 19,932.8 | +13.6% |
| affiliate_cta_impression | 58,798 | 6,829 | +761% |
| coconala_cta_impression | 1,057 | 428 | +147% |
| quiz_start | 432 | 135 | +220% |
| quiz_complete | 53 | 22.5 | +135.6% |
| standards_data_download | 2 | 3 | -33.3% |

google 流入の上昇: /exam/pe-first-stage/guide/r08-answers（9.5→4355） / (not set)（138→333） / /exam/pe-first-stage/primary/r07-construction（11.8→93） / /exam/pe-first-stage（28.5→107） / /exam/pe-first-stage/primary/r06-basic（15.5→88）
google 流入の下落: /exam/civil-construction-2/guide/r08-secondary-answers（1125.5→7） / /exam/civil-construction-2/guide/secondary-grading-and-partial-credit（79.8→4） / /exam/civil-construction-2/secondary/experience-writing-guide（17.3→0） / /exam/building-construction/guide/2kyu-keiken-kijutsu（16.3→0） / /tools/keiken-charcount（12.5→0）

### トリアージ対象 21 件（候補 241・抑止 34・表示上限で見送り SEO 33 / 収益 93）

| ID | 区分 | 内容 | 期待効果/週 | 推奨 |
|---|---|---|--:|---|
| OPP-099b11dfc5 | 実験 | EXP-055（技術士（建設部門）の読者に、施工管理の転職（ビルドジョブ）とハイクラス転職（ハイクラス DX・コンサル転職）を訪問者ごとに出し分ける）: next_check_date 2026-11-21 を超過 | — | verdict / defer |
| OPP-0f1d5188ca | 実験 | EXP-066（本文の手動の AdSense の枠を自動広告のページ内広告に置き換え、右の欄を追従ブロック 1 枠にして、ページあたりの AdSense 収益が落ちないかを比べる）: 要人手 1 件: PR #1720（feat/rail-follow-auto-ads）を本番へ出すのと同時に、AdSense の管理画面の「サイトごと」で自動広告のページ内広告を有効にし（ページあたりの最大広告数と広告どうしの最小距離を決める）、サイドレールを切る。設定の変更なので運営者の操作。deploy の日を start の基準日にする | — | verdict / defer |
| OPP-20a1d42c96 | 実験 | EXP-041（資格名: /exam/civil-construction-2/guide/overview の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 16→74・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-35597ba2b3 | 実験 | EXP-046（立場のテーマ「建設コンサルタントの技術者」を育成中（noindex）で作り、記事末の回遊と教材の枠を測る）: 要人手 1 件: 決まった立場について、記事に立場のタグを付け、topics.json に facet: audience のテーマを育成中で作り、教材の枠を置く。running にして反映日を history に書き、demand-map.json の position を live にする | — | verdict / defer |
| OPP-5237e9a20d | 実験 | EXP-039（1級土木 二次 令和3年度のページで、経験記述の教材カードを解答の折りたたみの外へ出し、試験後に自分の答案を見直す読者のクリックを増やす）: next_check_date 2026-11-23 を超過 / 自動計測の事後窓が完了（ga4.event:note_cta_click 0→0・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-6a79a25561 | 実験 | EXP-021（総監の定型題名（｜ 技術士 総合技術監理部門 キーワード集）を、表示の多い 5 本で「語とは｜区別点【技術士総監】」に変えて CTR を上げる）: next_check_date 2026-11-21 を超過 / 自動計測の事後窓が完了（gsc.clicks 3→10・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-6cf9589757 | 実験 | EXP-040（資格名: /exam/civil-construction-2/guide/r08-secondary-answers の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 13.6→8.8・目安 improved）。裁定して close する | — | verdict / defer |
| OPP-73f87644d2 | 実験 | EXP-052（技術士一次の直前パック（pe1-chokuzen-pack）で、案内の表示 → 販売先へのクリック → 販売を同じ商品 ID で 6 週記録する）: next_check_date 2026-11-21 を超過 | — | verdict / defer |
| OPP-808d81041a | 実験 | EXP-020（2級土木 二次の 4 本（r06・r07・経験記述の例文・書き方）の題名と説明を検索語の語順に合わせ、冒頭に答えと試験概要への導線を足して、Google の CTR とクリックを上げる）: next_check_date 2026-11-21 を超過 / 自動計測の事後窓が完了（gsc.clicks 9→38・目安 insufficient-data）。裁定して close する | — | verdict / defer |
| OPP-8b1471e1a1 | 実験 | EXP-054（「まず市場価値を確かめる——転職サイトに 2〜3 社登録して比べる」記事と動線で、転職アフィリの発生を増やす）: next_check_date 2026-11-21 を超過 | — | verdict / defer |
| OPP-8d9c970239 | 実験 | EXP-045（悩みのハブ「施工管理から発注者側へ移りたい人の地図」を作り、キャリア記事と教材をつなぐ）: 要人手 1 件: キャリア記事 45 本を移る先 × 要る資格で並べたハブの候補を運営者に出し、決まったら noindex で作る（DN-1200 で制作）。転職アフィリの枠は EXP-043 と重ねない | — | verdict / defer |
| OPP-902c585952 | 実験 | EXP-042（資格名: /exam/rccm/guide/difference-pe の11〜30位の検索語を10位以内へ）: 自動計測の事後窓が完了（gsc.position 14.6→18・目安 worse）。裁定して close する | — | verdict / defer |
| OPP-bf798d71e1 | 実験 | EXP-053（本文中の note 案内を POP 画像（image）と商品名・説明の文字のカード（text）で同時に出し分け、表示あたりのクリックを比べる）: next_check_date 2026-11-21 を超過 / 要人手 1 件: 判定し、本文中の note 案内の既定を決めて負けた側の案のコード（src/lib/note-body-experiment.mjs ほか）を消す。集計は npm run report-note-body-experiment | — | verdict / defer |
| OPP-e24a0c81ae | SEO | 「2級土木施工管理技士 2次試験 解答例」で 3 ページが競合（/exam/civil-construction-2/guide/r08-secondary-answers / /exam/civil-construction-2/secondary/r08 / /exam/civil-construction-2/secondary/r07） | 165.1 searchClicks | experiment / backlog |
| OPP-50a426a6a5 | SEO | /exam/civil-construction-2/guide/secondary-grading-and-partial-credit の検索クリックが週 3（基線の週平均 86・-96.5%） | 83 searchClicks | backlog |
| OPP-4d2d1ae380 | SEO | 「ブラインド訓練とは」は平均 3.1 位なのに CTR 0.33%（期待 10%） | 17.7 searchClicks | experiment / backlog |
| OPP-acfa195f69 | SEO | /exam/building-construction/guide/2kyu-keiken-kijutsu の検索クリックが週 0（基線の週平均 16.8・-100%） | 16.8 searchClicks | backlog |
| OPP-88625200d2 | SEO | /exam/civil-construction-2/secondary/r07 の検索クリックが週 1（基線の週平均 13.5・-92.6%） | 12.5 searchClicks | backlog |
| OPP-c39495dd46 | 収益導線 | /exam/pe-first-stage/guide/r08-answers の CTA クリック率 0.13%（サイト平均 0.55%） | 18.5 ctaClicks | backlog / experiment |
| OPP-1cf635f123 | 収益導線 | 配置 article-banner-2 は表示 18002（28 日）で CTR 0.02%（配置の中央値 0.08%） | 3.1 ctaClicks | experiment / backlog |
| OPP-bf44200ed1 | 収益導線 | 配置 article-rail-2 は表示 10512（28 日）で CTR 0.02%（配置の中央値 0.08%） | 1.7 ctaClicks | experiment / backlog |


## 計測→改善トリアージ

未処分 21 件を全件処分した（`growth-triage apply --commit` で台帳へ記録済み）。

| OPP | 処分 | 行き先・理由 |
|---|---|---|
| OPP-099b11dfc5（EXP-055） | defer | 実験の裁定は運営者。C5 に載せる |
| OPP-0f1d5188ca（EXP-066） | defer | PR #1720 の本番反映と AdSense 設定は運営者の操作 |
| OPP-20a1d42c96（EXP-041） | defer | 裁定待ち（C5） |
| OPP-35597ba2b3（EXP-046） | defer | 立場の決定は運営者（C5） |
| OPP-5237e9a20d（EXP-039） | defer | 裁定待ち（C5） |
| OPP-6a79a25561（EXP-021） | defer | 裁定待ち（C5） |
| OPP-6cf9589757（EXP-040） | defer | 裁定待ち（C5・目安 improved） |
| OPP-73f87644d2（EXP-052） | defer | 裁定待ち（C5） |
| OPP-808d81041a（EXP-020） | defer | 裁定待ち（C5） |
| OPP-8b1471e1a1（EXP-054） | defer | 裁定待ち（C5） |
| OPP-8d9c970239（EXP-045） | defer | ハブ候補の決定は運営者（C5・DN-1200） |
| OPP-902c585952（EXP-042） | defer | 裁定待ち（C5・目安 worse） |
| OPP-bf798d71e1（EXP-053） | defer | 既定の決定は運営者（C5） |
| OPP-e24a0c81ae（2級二次「解答例」3 ページ競合） | backlog | 起票 C6 |
| OPP-50a426a6a5（2級二次 採点と部分点 急落） | reject | 季節性（2級二次の試験後の需要終了・下落ページが速報系にそろう）。即 noindex はしない。C6 の整理で正規ページを決めるときに一緒に見る |
| OPP-88625200d2（2級二次 r07 急落） | reject | 同上（季節性） |
| OPP-acfa195f69（2級建築 経験記述ガイド 週 0） | backlog | 季節性だけで 0 は説明しきれないので索引状態を確かめる。起票 C7 |
| OPP-4d2d1ae380（ブラインド訓練とは CTR 0.33%） | backlog | 起票 C8 |
| OPP-c39495dd46（一次 r08-answers の CTA 率 0.13%） | defer | EXP-063 が同じページで測定中（11/30 に登録率を読む）。判定前に別の変更を入れない |
| OPP-1cf635f123（article-banner-2 CTR 0.02%） | defer | EXP-066（自動広告・右の欄の見直し）の判定後に配置を決める |
| OPP-bf44200ed1（article-rail-2 CTR 0.02%） | defer | 同上（EXP-066 で右の欄を 1 枠にする案） |

backlog に振った 3 件: OPP-e24a0c81ae → DN-1321・OPP-acfa195f69 → DN-1322・OPP-4d2d1ae380 → DN-1323。

## 実験の進捗

期限の来た実験は 22 件（前週 15 件）。この回では判定も再計測の記録もしていない。close・続行・延長の裁定は運営者の判断 → DN-1320（🟣）。

- EXP-008 キャリア（転職アフィリエイト）を悩み起点の hub→5柱→ツールへ再設計: MEASURE_DUE next_check_date 2026-11-17 を超過 / PENDING 要人手 2 件: 記事末撤去（DN-0779）の deploy から 28 日後に npm run report-career-funnel を再実行し、2026-10-20 の観測（裁定ログ）と比べる / A8 の月次成果を取り込む（npm run a8-ui:fetch -- --mont
- EXP-020 2級土木 二次の 4 本（r06・r07・経験記述の例文・書き方）の題名と説明を検索語の語順に合わせ: MEASURE_DUE next_check_date 2026-11-21 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.clicks 9→38・目安 insufficient-data）。裁定して close する
- EXP-021 総監の定型題名（｜ 技術士 総合技術監理部門 キーワード集）を、表示の多い 5 本で「語とは｜区別点: MEASURE_DUE next_check_date 2026-11-21 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.clicks 3→10・目安 insufficient-data）。裁定して close する
- EXP-030 資格名: /exam/pe-construction/guide/nanido-goukakurit: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 16.7→—・目安 insufficient-data）。裁定して close する
- EXP-031 施工管理の転職: /exam/civil-construction-1/guide/hatchu-s: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 20→—・目安 insufficient-data）。裁定して close する
- EXP-032 施工管理の転職: /exam/civil-construction-2/guide/career-a: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 29.3→61・目安 insufficient-data）。裁定して close する
- EXP-033 資格名: /exam/civil-construction-2/guide/textbooks の1: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 13.8→15.7・目安 worse）。裁定して close する
- EXP-035 資格名: /exam/pe-comprehensive-management/guide/exam-: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 23.6→25・目安 no-effect）。裁定して close する
- EXP-036 資格名: /exam/civil-construction-1/guide/difficulty の: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 20.3→—・目安 insufficient-data）。裁定して close する
- EXP-037 資格名: /exam/pe-construction/keywords/port-airport-e: MEASURE_DUE next_check_date 2026-11-16 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 10.3→8.8・目安 insufficient-data）。裁定して close する
- EXP-039 1級土木 二次 令和3年度のページで、経験記述の教材カードを解答の折りたたみの外へ出し、試験後に自分: MEASURE_DUE next_check_date 2026-11-23 を超過 / VERDICT_DUE 自動計測の事後窓が完了（ga4.event:note_cta_click 0→0・目安 insufficient-data）。裁定して close する
- EXP-040 資格名: /exam/civil-construction-2/guide/r08-secondar: MEASURE_DUE next_check_date 2026-11-27 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 13.6→8.8・目安 improved）。裁定して close する
- EXP-041 資格名: /exam/civil-construction-2/guide/overview の11: MEASURE_DUE next_check_date 2026-11-27 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 16→74・目安 insufficient-data）。裁定して close する
- EXP-042 資格名: /exam/rccm/guide/difference-pe の11〜30位の検索語を10: MEASURE_DUE next_check_date 2026-11-27 を超過 / VERDICT_DUE 自動計測の事後窓が完了（gsc.position 14.6→18・目安 worse）。裁定して close する
- EXP-045 悩みのハブ「施工管理から発注者側へ移りたい人の地図」を作り、キャリア記事と教材をつなぐ: PENDING 要人手 1 件: キャリア記事 45 本を移る先 × 要る資格で並べたハブの候補を運営者に出し、決まったら noindex で作る（DN-1200 で制作）。転職アフィリの枠は EXP-043 と重ねない
- EXP-046 立場のテーマ「建設コンサルタントの技術者」を育成中（noindex）で作り、記事末の回遊と教材の枠を: PENDING 要人手 1 件: 決まった立場について、記事に立場のタグを付け、topics.json に facet: audience のテーマを育成中で作り、教材の枠を置く。running にして反映日を history に書き、demand-map.json の position を live にする
- EXP-052 技術士一次の直前パック（pe1-chokuzen-pack）で、案内の表示 → 販売先へのクリック : MEASURE_DUE next_check_date 2026-11-21 を超過
- EXP-053 本文中の note 案内を POP 画像（image）と商品名・説明の文字のカード（text）で同時: MEASURE_DUE next_check_date 2026-11-21 を超過 / PENDING 要人手 1 件: 判定し、本文中の note 案内の既定を決めて負けた側の案のコード（src/lib/note-body-experiment.mjs ほか）を消す。集計は npm run report-note-body-experiment
- EXP-054 「まず市場価値を確かめる——転職サイトに 2〜3 社登録して比べる」記事と動線で、転職アフィリの発生: MEASURE_DUE next_check_date 2026-11-21 を超過
- EXP-055 技術士（建設部門）の読者に、施工管理の転職（ビルドジョブ）とハイクラス転職（ハイクラス DX・コンサ: MEASURE_DUE next_check_date 2026-11-21 を超過
- EXP-063 技術士一次 令和8年度の解答速報で、正答は無料のまま自己採点シートと結果別の次の一手をメール登録の特: PENDING 要人手 2 件: 11/30 と合格発表の後に、Brevo のリスト「技術士一次 R8 速報」の件数（確認済み）を読む / 11/30 に登録率と速報ページ順位を見る（3 位以上落ちたら特典案内を外す・Brevo list #3 の運営者テスト登録 1 件は数えない）。合格発表後に続行／他資格へ拡大を判定
- EXP-066 本文の手動の AdSense の枠を自動広告のページ内広告に置き換え、右の欄を追従ブロック 1 枠に: PENDING 要人手 1 件: PR #1720（feat/rail-follow-auto-ads）を本番へ出すのと同時に、AdSense の管理画面の「サイトごと」で自動広告のページ内広告を有効にし（ページあたりの最大広告数と広告どうしの最小距離を決める）、サイドレールを切る。設定の変更なので運営者の操作。deploy の日を start の基準日にする

- 自動計測の目安: improved は EXP-040、worse は EXP-033・042、no-effect は EXP-035、ほかは insufficient-data
- EXP-066 は PR #1720 の本番反映と AdSense の設定変更が要る（運営者の操作）。EXP-063 は 11/30 に Brevo の登録件数と速報ページの順位を読む（運営者）

### 今週 close
- なし

## PSI パフォーマンス推移


```
- CI ゲート違反（field 実害・取得失敗率20%超）: **0件**
- `https://doboku-note.com/` (desktop): **CLS** = 0.124 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **SEO** = 69 (閾値: ≥90)
- `https://doboku-note.com/search` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/search` (desktop): **TBT** = 431ms (閾値: ≤300ms)
- `https://doboku-note.com/exam` (desktop): **CLS** = 0.138 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/strategy` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
- `https://doboku-note.com/exam/civil-construction-1/guide/four-management` (desktop): **CLS** = 0.206 (閾値: ≤0.1)
実ユーザー計測 data/rum/web-vitals/2026-11-27.json（2026-10-30〜2026-11-26・1 日前）状態 ok・イベント 133682 件
  要改善　 CLS desktop 良好率  67%（4874 件）/exam/pe-first-stage/guide
  要改善　 CLS desktop 良好率  66%（273 件）/standards/mlit
  要改善　 INP tablet  良好率  61%（89 件）/exam/pe-first-stage/primary
  要改善　 CLS desktop 良好率  73%（45 件）/practice/construction-inspection-types
  要改善　 CLS desktop 良好率  61%（41 件）/exam/surveyor/past-exams
手を打つ組 5（不良 0）
```


### 洞察
- CI ゲートの違反（field 実害）は 0 件。ラボ値は / ・/exam・guide 系の desktop CLS（0.124〜0.206）と /search の SEO 69・TBT 431ms が閾値超え。夜間 Lighthouse（#1769）が 11/26 から赤なのと同じ候補 → DN-1318
- 実ユーザー計測は不良 0・手を打つ組 5（CLS: pe-first-stage/guide・standards/mlit ほか／INP: pe-first-stage/primary）

### build 後 SEO スキャン


- 最新の記録: 2026-11-28。検査 2138 URL / sitemap 2138 URL
- error 0（前週比 ±0）/ warn 407（前週比 ±0）
- 前週の記録: 2026-11-21

| 型 | 区分 | 件数 | 前週比 |
|---|---|--:|--:|
| jsonld_recommended_missing | warn | 407 | ±0 |


## 収益カバレッジ ダッシュボード

- GA4入力 2160 URL / 記事・資格トップ・ホームへの照合 1455 URL / その集計対象外 705 URL（ツール・検索・教材一覧等を含む）

> 流入: `2026-10-30〜2026-11-26`（2026-11-27.json#page） / クリック: `2026-10-30〜2026-11-26`

- 流入のあるページ: **1453**　/　高流入(≥15users)で**収益導線ゼロ**: **0**　/　**note 導線ゼロ**（アフィリのみ）: **0**

### 要対応ギャップ（高流入 × 無導線）

- なし（≥15users のページはすべて何らかの収益導線あり）

出所: data/analysis/monetization/coverage-latest.md（ほかの節: 上位 25 ページ × 収益カバレッジ・配置別 CTA CTR・note CTA label × 同期間の商品売上（ID付きのみ））

## SNS 流入と投稿実績

| 流入元 | users | 前週 | 増減 | sessions |
|---|--:|--:|--:|--:|
| note | 41 | 21 | +95.2% | 102 |
| youtube | 25 | 23 | +8.7% | 38 |
| x | 5 | 6 | -16.7% | 10 |
| instagram | 1 | 2 | -50.0% | 1 |
| 合計 | 72 | 52 | +38.5% | 151 |

出所: data/business/weekly/2026-W47.json（sns）。急落は今週 sessions ≥ 5 かつ前週比 −30% 以上、新規成長は前週 < 3 から今週 ≥ 10（collect-metrics.md）。

### YouTube の公開（2026-11-23〜2026-11-29）

- 公開になった本数: 6（civil-construction-1・longform 2 / concrete-chief-engineer・longform 1 / pe-construction・longform 2 / pe-construction・short 1）
- この週に新しく予約した本数: 15（civil-construction-1・longform 2 / civil-construction-2・longform 3 / concrete-diagnostician・longform 1 / pe-comprehensive-management・longform 1 / pe-comprehensive-management・short 2 / pe-construction・longform 2 / pe-construction・short 3 / rccm・longform 1）
- 先の予約の残り: 21
- 台帳の全件: 194（状態は台帳の記録。YouTube 側との照合は verify-video-publication）

X の自分の投稿・返信の件数は、この回では取得していない（未取得）。

## 校正学習の蒸留

- 今週分は回していない。最新の記録は 13 日前 → 来週の申し送り（定常）

## SNS 予約キュー投入（X）

```
📮 X 予約キュー投入 surfacer — 2026/11/28
   最終予約記録（途中の空白を含む）: 11/30   lookahead: 8 日

📦 ストック: 9 件 63 本（日時未定・載せる先: x-c1-restart-2027 13 本・DN-0220 39 本・x-pe1-2027 3 本・DN-0887 8 本）

✅ 投入待ちなし（lookahead 内に未投入の下書きはありません）
```

## その他パフォーマンス

### 検索の改善（今週 0/3 件）


- [資格名] /exam/surveyor/guide/overview「測量士試験」表示 104・最良 11 位
- [資格名] /exam/pe-first-stage「技術士一次試験 過去問」表示 95・最良 11.7 位
- [資格名] /exam/pe-first-stage/guide/basic-subject「技術士 基礎科目」表示 88・最良 11 位

### 検索の週次処置（要処置 13）

- 要処置 [資格名] /tools/kakomon-quiz/pe-first-stage: 受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）
- 要処置 [土木公務員] /exam/civil-construction-1/guide/public-engineer-salary-table: 受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）
- 要処置 [土木公務員] /exam/civil-construction-1/guide/public-servant: 受け皿に加える（decide --accept）か、狙いのページへ誘導する（decide --route-to）
- 要処置 [資格名] /exam/pe-construction/guide/nanido-goukakuritsu: EXP-030 の事後窓が確定（16.7→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-030 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [施工管理の転職] /exam/civil-construction-1/guide/hatchu-shien: EXP-031 の事後窓が確定（20→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-031 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [施工管理の転職] /exam/civil-construction-2/guide/career-agent-comparison: EXP-032 の事後窓が確定（29.3→61・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-032 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-2/guide/textbooks: EXP-033 の事後窓が確定（13.8→15.7・目安 worse）→ npm run search-improvement -- close --id EXP-033 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/pe-comprehensive-management/guide/exam-index: EXP-035 の事後窓が確定（23.6→25・目安 no-effect）→ npm run search-improvement -- close --id EXP-035 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-1/guide/difficulty: EXP-036 の事後窓が確定（20.3→—・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-036 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/pe-construction/keywords/port-airport-exam-themes: EXP-037 の事後窓が確定（10.3→8.8・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-037 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-2/guide/r08-secondary-answers: EXP-040 の事後窓が確定（13.6→8.8・目安 improved）→ npm run search-improvement -- close --id EXP-040 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/civil-construction-2/guide/overview: EXP-041 の事後窓が確定（16→74・目安 insufficient-data）→ npm run search-improvement -- close --id EXP-041 --result <success|partial|no-effect|negative> --learning "…" --commit
- 要処置 [資格名] /exam/rccm/guide/difference-pe: EXP-042 の事後窓が確定（14.6→18・目安 worse）→ npm run search-improvement -- close --id EXP-042 --result <success|partial|no-effect|negative> --learning "…" --commit

### note 同期

```
[note-sync-plan] 公開記事 1079: 反映済み 96 / 反映待ち 958 / 止まっている 25
  反映待ちの部品: 本文 982・カバー 30・タグ 0（配布 PDF の取り寄せが要る 705）
  止まっている: 前回の更新が途中で止まった 11 件 → note の公開ページを確認し、問題なければ note-update-body --sync --article <path> --force-retry --commit
    nd88d5ec77f2d  content/note/1級・2級土木/1級土木/1級経験記述を自分の現場に置換/article.md（2026-10-24T07:59:28: 更新フローが false を返した（保存せず中断））
    nd4320a66d09f  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/土木一般-共通工学編/article.md（2026-10-24T08:10:37: 更新フローが false を返した（保存せず中断））
    n653cd1b3ee71  content/note/1級・2級土木/1級土木/magazines/1級土木-テキスト精読ガイド/施工管理-法規編/article.md（2026-10-24T08:09:47: 更新フローが false を返した（保存せず中断））
    n4863a5b0659b  content/note/技術士建設部門/magazines/BK-05_鋼構造及びコンクリート/R08-yosou/article-III.md（2026-11-14T09:06:54: locator.click: Timeout 8000ms exceeded.
Call log:
  - waiting for locator('[aria-label="メニューを開く"]').last()
    - locator）
```

### ココナラ取引

- 要対応 4・注意 4
- DM 10387969: 既読の問い合わせ （対象商品不明）（3日前） — 返信済みか確認。https://coconala.com/mypage/direct_message/10387969
- 評価未送信: coconala-cce-essay-shindan（room 18658304） — 取引は delivered だが orders.json に rating が無い。期限を過ぎるとこちらの評価は公開されない。https://coconala.com/ratings/provider_add/18658304
- 評価未送信: coconala-pe-sokan-tensaku（room 18660481） — 取引は delivered だが orders.json に rating が無い。期限を過ぎるとこちらの評価は公開されない。https://coconala.com/ratings/provider_add/18660481
- 評価未送信: coconala-pe-construction-tensaku（room 18661633） — 取引は delivered だが orders.json に rating が無い。期限を過ぎるとこちらの評価は公開されない。https://coconala.com/ratings/provider_add/18661633

### 売上台帳

```
最終更新: 2026-11-21
【2026-10】 22件 / ¥67,680 ★¥15kマイルストーン達成
【2026-11】 32件 / ¥69,680 ★¥15kマイルストーン達成
```

### 運営者の入力が要るもの（認証）

```
[auth-freshness] FAIL 対象 5 件 / 実検査 5 件 / 要ログイン 4 件 / 要確認 4 件
a8: 認証成功の記録なし → npm run auth:login -- --service a8; Cookie=1795557411475.844 state=1795221019664.2483 checkedAt=2026-11-24T21:56:51.344Z
moshimo: 認証成功の記録なし → npm run auth:login -- --service moshimo; Cookie=1795557443428.988 state=1795221073123.1313 checkedAt=2026-11-24T21:57:25.459Z
kdp: 認証成功の記録なし → npm run auth:login -- --service kdp; Cookie=1795829468922.211 state=1795515818400.2769 checkedAt=2026-11-24T21:56:37.108Z
note: 認証確認は7日以内 → npm run auth:status -- --service note; Cookie=1795831847829.7727 state=1795516302634.3215 checkedAt=2026-11-24T21:56:30.281Z
coconala: 認証成功の記録なし → npm run auth:login -- --service coconala; Cookie=1795836955165.2668 state=1791188077677.4045 checkedAt=2026-11-24T21:56:33.314Z
```

> rc=1

### handoff の棚卸し

- docs/handoffs/2026-10-15-pe-municipal-oral-publish.md が残る。抽出して削除できるかは未確認 → 来週の申し送り（定常）

上の auth-freshness の FAIL は「認証成功の記録なし」で、今週の 8 段の失敗の直接原因ではない。失敗印の理由文は「playwright-launch 起動を見送り（Chrome が既に稼働中）」で、再ログインの前に Chrome の残りを閉じて収集を回し直す（DN-1316）。

## 点検と Issue

[review-checks] 週次 2026-W48: 点検 6 本中 6 本を実行 / 要対応 1・検査不成立 0 / 開いている Issue 6 / 依存の脆弱性 0。記録: `data/business/records/checks-weekly-2026-W48-2026-11-28T04-30-01-124Z.json`

- quality:audit:weekly の todo-claims-stale → 振り分け: 定常（期限切れ claim の解放は `/backlog-sweep`）
- quality:audit:weekly の competitor-scan-due → 振り分け: DN-1324
- quality:audit:weekly の search-triage → 振り分け: 定常（検索の週次処置 要処置 13 は search-improvement のサイクル。EXP-030〜042 の close は DN-1320 に含める）
- #1217 weekly-collect（10/24〜）→ 振り分け: DN-1316（今週の原因）・DN-0819（2 週連続 rc=0 の確認）
- #1460 ops（11/8〜）→ 振り分け: 定常（遅れの内訳は registry-due・note-delivery-due・own-videos-freshness・weekly-collect。weekly-collect は DN-1316）
- #1475 report-checks（11/9〜）→ 振り分け: DN-1298（外部リンク切れ 21 件）
- #1743 gsc-indexing-local（11/24〜）→ 振り分け: DN-1319
- #1768 e2e-nightly（11/26〜）→ 振り分け: DN-1317
- #1769 lighthouse-nightly（11/26〜）→ 振り分け: DN-1318

土曜の収集の新規の不具合: 8 段のプロファイル衝突 → DN-1316。

## イシューマップ

更新の番 3 件。

- overall B2（DN-0343 が閉じた）・overall A1（DN-0932 が閉じた）・construction X2・T1（DN-0992 が閉じた）: 月次レビュー（12 月の回）でマップを更新する。方針・マップの変更は月次の判断のため、今週は書き換えない → 振り分け: 定常

## 課題・ブロッカー

1. 収集がプロファイル衝突で 8 段見送り（新しい原因）→ DN-1316
2. 夜間 E2E（#1768）と夜間 Lighthouse（#1769）が 11/26 から赤のまま、原因未確認 → DN-1317・DN-1318
3. GSC 登録リクエストの失敗（#1743・11/27 再発）→ DN-1319
4. 期限の来た実験が 22 件に増えた（前週 15 件）。裁定は運営者 → DN-1320（🟣）
5. 計画表に 1 件しか載っておらず、注記（5 件・手動含め 9 件）と食い違う → `/plan-weekly` で表と注記をそろえる

## 学び

- 土曜の収集の失敗は「ログイン切れ」と「プロファイルの取り合い」で対処が別。失敗印の理由文（playwright-launch 起動を見送り）で切り分けてから再ログインを勧める
- 試験直後の速報ページは 1 週で 400 倍以上の流入を生む一方、CTA 率は 0.13%（サイト平均 0.55%）。速報の流入を販売へつなぐ設計は EXP-063 の判定を待つ

## バックログの関門

運営者が居ない実行のため、判断は「見送り・承認待ち」とし、台帳のカードは書き換えていない。

- 今決められる判断待ち 4 件（DN-0305・DN-0844・DN-1278・DN-1297）: 見送り・承認待ち（運営者に諮る）
- 判断の時期が先の 10 件（DN-0265・0624・0572・0427・1062・1006・1033・0428・1247・0331）: その月に諮る。今週は処分なし
- 期日切れ DN-0500: 公式正答の掲載まで済み・未掲載分が残る。閉じない。続行（次週計画に載せる。期日の変更は計画側で扱う）
- 期日切れ DN-0844: 承認待ち（判断待ちに同じ）
- 直近 7 日の起票 18 件: 重要度タグは台帳に無い（未取得）。内容は確認し、重複・時期の誤りは見当たらない。この回で DN-1316〜DN-1324 の 9 件を起票した
- backlog-verify: check-standard-articles が常時緑（L787・L800 のカード）。完了判定にならない検証を指している疑い → 次の `/backlog-sweep --audit`（定常）
- バックログの健全性（S2・S3・S16 ほか）: 判定は `/backlog-sweep --audit`（定常）。S16 の DN-1164（wip/shorts-batch-2026-11-13）も同じ監査で扱う
- 閉じるカード: なし（今週完了を確認できたカードは DN-1266・DN-1267 だけで、既に完了済み）
- 7 日超の automation-failure Issue: #1217 → DN-1316・DN-0819、#1743 → DN-1319、#1768 → DN-1317、#1769 → DN-1318

## 来週への申し送り

- DN-0500 解答速報の未掲載分を埋めて閉じる → 振り分け: DN-0500
- 収集の全段 rc=0。残った Chrome（pid 13200 ほか）を閉じてから `npm run weekly-review:install -- --run-now` で回し直す → 振り分け: DN-0819
- 収集の入口で Chrome の残りを検知する仕組み → 振り分け: DN-1316
- DN-1266・DN-1267（a8・gsc の修理）が次の収集で実際に通るかを確かめる → 振り分け: DN-0819
- note-live 添付・note-audit skipped → 振り分け: DN-1268
- 夜間 E2E の原因 → 振り分け: DN-1317
- 夜間 Lighthouse の原因 → 振り分け: DN-1318
- GSC 登録リクエストの失敗 → 振り分け: DN-1319
- 期限の来た実験 22 件の裁定（EXP-063 は 11/30 に Brevo の件数を読む）→ 振り分け: DN-1320
- 2級二次「解答例」3 ページの競合整理 → 振り分け: DN-1321
- 2級建築 経験記述ガイドの週 0 の原因 → 振り分け: DN-1322
- 「ブラインド訓練とは」の題名・説明 → 振り分け: DN-1323
- 競合の再スキャン → 振り分け: DN-1324
- 技術士一次の CTA の本番確認 → 振り分け: DN-0706
- 期日切れ 4 件（DN-1082）は台帳にカードが見当たらない（未確認）。todo-planner が実在を確かめる → 振り分け: 定常
- 型枠の取り外し時期ページの収益導線（DN-1270）は台帳にカードが見当たらない（未確認）→ 振り分け: 定常
- 校正学習の蒸留・handoff 1 件の抽出・検索の改善 3 件 → 振り分け: 定常
- ココナラ DM 10387969 の返信確認・評価未送信 3 件（room 18658304・18660481・18661633）・11/28 受注（主任技士 小論文診断・期限 11/30）の納品は運営者（承認待ち・送信はエージェント不可）→ 振り分け: 定常

## 運営者に諮る項目

1. 判断待ち 4 件: DN-0305・DN-0844（期日 11/27 切れ）・DN-1278・DN-1297
2. 実験の裁定 22 件（DN-1320）。EXP-066 は PR #1720 の本番反映と AdSense の設定変更が要る
3. EXP-063: 11/30 に Brevo の登録件数と速報ページの順位を読む
4. 収集のやり直し: 残った Chrome（pid 13200 ほか）を閉じてから `npm run weekly-review:install -- --run-now`
5. ココナラ: DM 10387969 の返信確認、評価未送信 3 件、11/28 受注の納品（期限 11/30）
