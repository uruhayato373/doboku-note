# 週次レビュー 2026-W40

作成日: 2026-10-10（期日 10/3 から 1 週遅れ。土曜の `/weekly-review` が回らなかったため W41 と続けて作成）
対象期間: 2026-09-28 〜 2026-10-04（事業レビューと計測ダイジェストは前の完了週 2026-09-21〜09-27＝W39 窓）

前週: 2026-W39-review.md（本レビュー確定で削除。未完の申し送りは末尾へ転記済み）

---

## サマリー

- 計画タスク達成率: 3/6（50%）。最優先の DN-0312（ココナラ room 18351970）は 9/28 に5テーマ納品・評価送信まで終えた
- 主な成果: 2級ペルソナ第2弾で新規12工事を公開しバンク72工事へ（3ea2d0dbe）。1級二次（10/4）後に1級のココナラを全件受付休止、土木もくじ・X 固定・links を2級先頭へ切り替え。主任技士の小論文を立場別40本で公開（DN-0523）
- 事業（W39 窓 09-21〜27）: 自然検索 1,631 人（1級 646・総監 135・建設部門 41・RCCM 31）、note CTA 110（基線週平均 76.5・+43.8%）。note 台帳登録分 10 件 ¥36,840（1級 8 件 ¥33,480）、ココナラ 1 件 ¥15,000。9 月の note は 35 件 ¥106,800（台帳 10/2 まで・未確定）
- 要注意: **10/7・10/9 の fetch-metrics が書き戻しに失敗**し、W40 窓の GA4/GSC・計測パックが develop に無かった。原因（EXP-019 の案別計測行が台帳の型に合わない）を #958 で直し、10/10 に再実行した
- 自動化の赤が溜まっている: 開いている automation-failure 14 件、重要 workflow 7 本が不健全。7 日超の 6 件のうち 4 件に行き先のカードが無かったので DN-0642・DN-0643 を起票した

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0312 ココナラ room 18351970 の残り2テーマ添削 | 最優先 | ✅ | 9/28 に5テーマ納品・評価送信済み（W41 計画の記載）。カードは orders.json の closed 化と合わせて削除待ち |
| 2級ペルソナ第2弾（新規12工事・バンク72工事） | その他 | ✅ | 3ea2d0dbe |
| DN-0490 develop の CI 赤（fukugyou-dokuritsu の need 未解決） | その他 | 🟡 | カードは残っている。担当セッションの記録は未確認 |
| DN-0185 GSC 索引状況と standards_data_download の記録 | その他 | 🔴 | 未着手（W39 窓の standards_data_download は 0） |
| DN-0363 IG ハイライト・X 固定投稿の差し替え | 運営者 | 🟡 | X 固定と自己紹介は2級向けへ差し替え済み。IG ハイライトは Facebook ログイン待ち（DN-0537） |
| note 本文 drift の消化 | 定常 | 🟡 | 公開 934 本のうち反映待ち 217・止まっている 3（10/3 の BK-10/11 がブラウザ終了で中断） |

## 成果ハイライト

1. 2級を主力へ切り替えた（ペルソナ第2弾・もくじ・X 固定・links の並び）。1級二次の終了に合わせてココナラ1級を休止し、ブログ12本の送客先を2級へ付け替えた
2. 主任技士 小論文を「1立場×1テーマ」の立場別記事 40 本に組み替えて公開した（DN-0523）
3. config/・data/ の全データセット（52＋38）に zod の型を付け、型なしを check-datasets で止めるようにした。今回の fetch-metrics の失敗はこの型検査が初めて止めたもの

## 開発活動

- コミット数: 895（CI の計測・同期コミットを含む）
- 主な変更: スクリプトの共通部品化（走査・引数・JSON・REPO_ROOT）、データセットの型付け、note 全商品 143 件の正本を content/products/note/ へ移設、配布 PDF の分冊（--split）

## コンテンツ実績

| 区分 | 今週 | メモ |
|---|---|---|
| note 新規 | 主任技士 小論文 立場別 40 本・2級ペルソナ第2弾 12 工事 | 旧テーマ別5本は外した |
| note 同期 | 反映済み 714 / 反映待ち 217 / 止まっている 3 | 止まった3本は BK-10_鉄道 R07・R08-yosou、BK-11_トンネル R03（10/3） |
| サイト | 2級一次前期 R03〜R06 の転記ずれ修正（DN-0473）・CTA の配線完了 | |

## NSM（オーガニック検索流入）

| 窓 | 自然検索人数（GA4・日本） | 前週比 |
|---|--:|--:|
| W38（09-14〜20） | 2,130 | — |
| W39（09-21〜27） | 1,631 | −23.4% |

### NSM トレンドの洞察
- W39 窓の前半（9/21〜23）は 5 連休の後半で、W39 レビューで見た「平日約 400 → 休日約 180 人」の形が続いた。流入元では bing −17.2%・google +83.2%（総監 r08 択一・2級経験記述例・1級 r07 二次が伸びた）
- 連休明けの戻りは W40 窓（09-28〜10-04）で見る。W40 窓は fetch-metrics の失敗で欠測（W41 レビューで再取得後に読む）

## 計測ダイジェスト

<!-- growth-digest:2026-W39 -->
## 計測ダイジェスト 2026-W39（2026-09-21〜2026-09-27・基線 2026-08-24〜2026-09-20 の週平均と比較）

入力: growth-pack=取得済み / monetization-coverage=取得済み / bing-webmaster=取得済み

| 流入元（GA4・日本） | セッション | 基線週平均 | 増減 | エンゲージ率 | キーイベント |
|---|--:|--:|--:|--:|--:|
| bing | 2,053 | 2,480.3 | -17.2% | 69.9% | 72 |
| direct | 386 | 357.3 | +8% | 16.6% | 2 |
| google | 251 | 137 | +83.2% | 64.1% | 13 |
| referral | 173 | 100.5 | +72.1% | 59% | 10 |
| yahoo | 146 | 74.8 | +95.3% | 71.9% | 15 |
| organic-social | 21 | 15.8 | +33.3% | 66.7% | 3 |
| ai-assistant | 20 | 20.5 | -2.4% | 45% | 1 |
| unassigned | 13 | 5.5 | +136.4% | 53.8% | 0 |
| organic-video | 5 | 2 | +150% | 20% | 0 |
| organic-other | 4 | 2.5 | +60% | 75% | 0 |

GSC（日本・web）: クリック 12（基線週平均 8.5・+41.2%）/ 表示 1,522 / CTR 0.79%

Bing 照合: GA4 の bing 自然検索セッション 2,053 / Bing Webmaster クリック 2,305（0.9 倍）

| イベント | 今週 | 基線週平均 | 増減 |
|---|--:|--:|--:|
| note_cta_click | 110 | 76.5 | +43.8% |
| affiliate_cta_click | 5 | 3 | +66.7% |
| coconala_cta_click | 0 | 1.8 | -100% |
| quiz_cta_click | 0 | 0 | — |
| note_cta_impression | 8,094 | 6,784 | +19.3% |
| affiliate_cta_impression | 5,495 | 6,002.3 | -8.5% |
| coconala_cta_impression | 199 | 0 | — |
| quiz_start | 1 | 1.3 | -20% |
| quiz_complete | 0 | 0 | — |
| standards_data_download | 0 | 0.3 | -100% |

google 流入の上昇: /exam/pe-comprehensive-management/past-exams/r08-primary（2.8→19） / /exam/civil-construction-2/secondary/experience-writing-examples（1.8→16） / /exam/civil-construction-1/secondary/r07（2.3→15） / /exam/pe-comprehensive-management/past-exams/r08-secondary（2.8→12） / /exam/civil-construction-1/secondary/r04（6→13）
google 流入の下落: /docs/pe-comprehensive-management-pfi（12.3→0） / /exam/civil-construction-1/secondary/r06（4.5→4） / /tools/keiken-charcount（8.3→8）

### トリアージ対象 8 件（候補 71・抑止 7・表示上限で見送り SEO 0 / 収益 56）

| ID | 区分 | 内容 | 期待効果/週 | 推奨 |
|---|---|---|--:|---|
| OPP-162229ca6d | 実験 | EXP-009（RCCM 問題III 模範論文集を 2026 年度 CBT 期間（〜10/31）に note で販売し、新資格の WTP を実売で検証）: next_check_date 2026-10-01 を超過 | — | verdict / defer |
| OPP-64e99175ec | 実験 | EXP-011（直前パック・全部パックの追加で直前期の note 売上を伸ばす（1級・2級土木 10/4・10/25、RCCM 〜10/31、主任技士・技士・技術士一次 11/22〜29））: next_check_date 2026-10-01 を超過 | — | verdict / defer |
| OPP-aeb5940b4c | SEO | 「インターフェアリングフロート」は平均 8.4 位なのに CTR 0.33%（期待 3%） | 1.6 searchClicks | backlog |
| OPP-57ad840c93 | SEO | 「コストドライバーとは」は平均 8.8 位なのに CTR 0%（期待 2.5%） | 0.4 searchClicks | backlog |
| OPP-e13377d736 | SEO | 「中国地方整備局 共通仕様書」が平均 8.5 位（5 位圏へ上げる余地） | 0.4 searchClicks | backlog |
| OPP-8028130bb4 | 収益導線 | /exam/civil-construction-2/guide/exam-overview の CTA クリック率 0.25%（サイト平均 0.68%） | 1 ctaClicks | backlog / experiment |
| OPP-617ac9956a | 収益導線 | /exam/civil-construction-1/textbook/leveling の CTA クリック率 0%（サイト平均 0.68%） | 0.9 ctaClicks | backlog / experiment |
| OPP-4932351d8d | 収益導線 | /exam/civil-construction-1/secondary/getting-started の CTA クリック率 0.18%（サイト平均 0.68%） | 0.5 ctaClicks | backlog / experiment |

全件を `npm run growth-triage -- list` で確認し、`apply --decisions <file> --commit` で backlog / 実験 / watchword / 束ね / 却下 / 保留に振り分ける。

## 計測→改善トリアージ

| OPP | 区分 | 処分 | 行き先・理由 |
|---|---|---|---|
| OPP-162229ca6d | 実験 | defer（11/3） | EXP-009。10/3 時点 rccm-* 0 円・途中。事後窓（〜10/31）の確定後に裁定。next_check_date を 11/3 へ |
| OPP-64e99175ec | 実験 | defer（12/3） | EXP-011。10/3 時点 新 SKU 3 件 ¥5,940・途中。目標期限 11/30 の確定後に裁定 |
| OPP-aeb5940b4c | SEO | bundle | DN-0338（インターフェアリングフロート） |
| OPP-e13377d736 | SEO | bundle | DN-0383（地域別共通仕様書） |
| OPP-57ad840c93 | SEO | backlog | DN-0640。題名は 10/6 に修正済み（57bd3f43d）なので、11/3 以降の 28 日 CTR の確認だけを残す |
| OPP-8028130bb4 | 収益導線 | backlog | DN-0641。2級 exam-overview は 10/6 に修正済み（cfd04f598）、1級 leveling・getting-started が残り |
| OPP-617ac9956a / OPP-4932351d8d | 収益導線 | bundle | DN-0641 |

未処分 0 件。

## 実験の進捗

### Running（11 件）
| ID | 次回 | 状態 |
|---|---|---|
| EXP-008 | 10/20 | 要人手 2 件（report-career-funnel の再実行・A8 月次成果の取り込み） |
| EXP-009 | 11/3 | 途中計測 rccm-* 0 円（事後窓 09-16〜10-31） |
| EXP-011 | 12/3 | 途中計測 新 SKU 3 件 ¥5,940 |
| EXP-012 | 10/23 | 業務経験→資格カード。DN-0305 で判断 |
| EXP-014・015 | 10/26 | — |
| EXP-016 | 12/1 | — |
| EXP-017・018 | 11/4 | EXP-017 の要人手（A8 サイト分割）は任意。10/7 のリファラ方針変更で帰属には不要 |
| EXP-019 | 10/15 | 10/8 開始。案別計測の書き込みが型で止まっていた（#958 で修正） |
| EXP-010 | 11/1 | — |

### 今週 close
- なし

### 次サイクルへの仮説
- 2級二次（10/25）までの 3 週は、2級の直前パック・想定工事バンクの導線（もくじ・X 固定）を先頭にしたことで note CTA の2級比率が上がるか（W41 窓で資格別に見る）

## PSI パフォーマンス推移

- field(CrUX) coverage: 44/44。CI ゲート違反（field 実害・取得失敗率 20% 超）0 件
- 実ユーザー計測（2026-09-09〜10-06・19,089 イベント）: 判定した 77 組すべて良好。不良・要改善 0
- lab のしきい値違反（desktop・診断用）: トップと 1級 four-management・secondary/r07 の TBT、1級 primary/r07-a の CLS 0.224、/search の SEO 66。field が良好なので障害ではなく改善余地

## 収益カバレッジ ダッシュボード

- GA4 入力 1,167 URL / 照合 1,047 URL（流入 2026-09-09〜10-06）。高流入（≥15 人）で収益導線ゼロ 28 本。うち 27 本が civil-practice（実務記事は試験 CTA を置かない設計）、1 本が pavement-guide-overview
- 実務記事の受け皿は「業務経験 → 資格」カード（EXP-012）で検証中 → DN-0305 の判断に含める

## SNS 流入と投稿実績

- 週次スナップショット（data/business/weekly/2026-W40.json）: note 40 人（前週 31）・X 14 人（13）・YouTube 14 人（0）。合計 68 人（44・+54.5%）
- X 予約キュー: 最終予約 10/31。判定不能 10 件（096〜103 ほか・見出しの日付書式）は DN-0220 側

## 校正学習の蒸留

- 今週の学習候補: 未実施（1 週遅れの一括作成のため `/distill-proofread-learnings` は W41 でまとめて回す）

## 点検と Issue

- check-workflow-health: 7 本が不健全（fetch-metrics・note-live-audit・ops-audit・cloudflare-metrics・cloudflare-config-audit・weekly-review-guard・note-public-view） → 振り分け: DN-0642
- #478 workflow-health（8/31〜） → 振り分け: DN-0642
- #571 ops（9/22〜・note-delivery-due・coconala-analytics・sales-freshness・monthly-review-due ほか） → 振り分け: DN-0643
- #636 cloudflare-metrics（9/24〜） → 振り分け: DN-0485
- #695 growth-triage（9/28〜） → 振り分け: 定常（本レビューで W39 ダイジェストを全件処分。次の guard で自動クローズ）
- #709 cloudflare-config（9/29〜） → 振り分け: DN-0485
- #746 auth-state-coconala（9/30〜） → 振り分け: DN-0643
- #862 auth-state-afb・#863 auth-state-moshimo（10/4〜） → 振り分け: DN-0643
- #864 note-sync の反映残り（10/5〜） → 振り分け: 定常（止まっている 3 本は note-update-body --force-retry）
- #867 report 区分 FAIL（outbound-links 切れ 2） → 振り分け: DN-0644
- #923 login-collectors の develop への書き戻し失敗（10/7〜） → 振り分け: DN-0642
- #939 fetch-metrics 計測アラート（10/9〜） → 振り分け: 定常（#958 で原因を修正し 10/10 に再実行）
- #940 workflow-health-guard（10/9〜） → 振り分け: DN-0642
- #943 seo-rank-watch の日次処理の失敗（10/9〜） → 振り分け: DN-0642
- dependabot:sprintf-js（medium） → 振り分け: 定常（DN-0637 で main 向きの経路を整理中）

## backlog 消化サマリ

- **消化**: done 41 件 / swept 1（blocked 0・fail 0）
- **残量**: カード 220 件・前週 80 件から +140（年間計画の重点カードと W40 の起票）
- **分類率**: `[種類:]` 付与 220 / 220（改善 117・不具合 40・制作 43・意思決定 20）
- **再発防止**: 9/28 以降に起票した不具合 32 件 / 閉じた不具合 9 件（検査 4・残すもの無し 5）
- **台帳の健全性**: S2（沈んだ不具合）3・S4 0・S9 0・S10 0。S3（意思決定なのに 🟣 でない）6 → 次の `/backlog-sweep --audit`
- **期日と時期**: 期日超過と月初の `[時期:]` の付け直しは 9 月の月次レビューで扱う

## 事業レビュー（資格別・W39 窓 09-21〜27）

記録: `data/business/records/review-2026-10-10T01-56-03-686Z-57e298c6-d59b-40d0-817f-162b67378074.json`（provisional・snapshot `snapshot-2026-10-10T01-46-03-759Z-…`）。

| 資格 | 実測 | 未確認 | 判断 | 次の一手 |
|---|---|---|---|---|
| 1級土木 | 自然検索 646・note CTA 27・note 8 件 ¥33,480（台帳分）・ココナラ 1 件 ¥15,000・演習開始 0 | note PV・ココナラ閲覧 | 二次（10/4）直前の売上は経験記述の完全攻略・工種別が中心。試験後はココナラを休止済み | 合格発表までは過去問・学科記述の導線を保守 |
| 総監 | 自然検索 135・note CTA 8・note 0 件（台帳分） | note PV | 筆記発表（11/4）までは既存導線を維持 | DN-0248（発表日の無料 2 本と告知） |
| 建設部門 | 自然検索 41・note CTA 2・note 0 件 | note PV | 1 週の数字では配置を変えない | 月次で steel-concrete-exam-themes の CTA を判断 |
| RCCM | 自然検索 31（前週 3）・note CTA 2・note 0 件・ココナラ 0 | note 実売の網羅（台帳 10/2 まで） | 検索流入は出始めたが実売は 0。評価は EXP-009 の窓終了後 | 11/3 に EXP-009 を裁定 |

全体: 実受取・費用・作業時間は欠測（DN-0303・DN-0368）。KDP・ココナラ閲覧は週次へ按分しない。

## 課題・ブロッカー

1. **計測の書き戻しが 10/7 から止まっていた**（#939）。新しい型検査が止めたのは正しい挙動で、書く側（affiliate-experiment-report）の行の形が型に無かった。#958 で修正
2. **ログインが要る取得が軒並み期限切れ**（ココナラ・afb・もしも・note 売上/アクセス）。売上台帳は 10/2 で止まり、ココナラの評価未送信は検査不成立 → DN-0643
3. **automation-failure 14 件・不健全 workflow 7 本**。7 日超の Issue にカードが無いものが 4 件あった → DN-0642・DN-0643
4. 週次レビューが 1 週抜けた。催促（SessionStart）と月曜の guard は鳴っていたが、土曜にセッションを開かなかった

## 学び

- 型検査を足すと、書き手が型を知らない行で CI の publish ごと止まる。新しい記録の形（今回は意匠実験の案別計測）を足すときは、書く関数と型を同じ PR で直し、実台帳＋合成レポートで safeParse まで通す
- 週間計画（weekly.md）に「対応済み」と書かれた機会を、ダイジェストだけを見て起票すると重複する。トリアージの前に weekly.md と直近の content コミットを照合する

## バックログの関門

判断待ち（🟣）の諮問と直近 7 日の起票の見直しは、W41 レビューでまとめて行う（同じ日に 2 週分を作るため）。7 日超の Issue 6 件 → カード（DN-0642・DN-0643・DN-0485）と定常（#695）へ振り分けた。

## 来週への申し送り

- 重要 workflow 7 本の不健全と #478・#923・#940・#943 を原因ごとに直す → 振り分け: DN-0642
- Mac でココナラ・afb・もしもに再ログインし、9 月分の note 売上・アクセス・ココナラ分析を取得する → 振り分け: DN-0643
- 送客先の切れたリンク 2 件を直す → 振り分け: DN-0644
- fetch-metrics の再実行で W40 窓の計測パックと GA4/GSC が揃ったかを確かめ、W41 レビューで読む → 振り分け: 定常
- 検索キーワード戦略の改善候補 3 件（建設部門 難易度・発注者支援・転職エージェント比較） → 振り分け: DN-0645, DN-0646, DN-0648
- EXP-008 の 28 日判定（10/20）で、記事サイドバー撤去後の変化と A8 確定成果を見る → 振り分け: EXP-008
- EXP-009 を 11/3、EXP-011 を 12/3 に裁定する → 振り分け: EXP-009, EXP-011
- EXP-019 の初回の案別計測を 10/15 に読む → 振り分け: EXP-019
- ココナラ room 18351970 の orders.json を closed にし、DN-0312 を削除する → 振り分け: DN-0312
- インターフェアリングフロートの title・description 改善 → 振り分け: DN-0338
- IG の照合ドリフト（未記録 48・異常 45）を /ig-reconcile で解消する → 振り分け: DN-0339
- Cloudflare zone analytics・zone config の取得失敗を直す → 振り分け: DN-0485
- A8 の未登録プログラム候補 5 件を登録・照合する → 振り分け: DN-0330
- 教材の原典待ち 16 論点と確認後の変更 43 件 → 振り分け: DN-0224
- GA4-UI の取得（3 ユニット全失敗）を正式レポート名で直す → 振り分け: DN-0135
- X 予約下書き 096〜103 の見出し日付書式 → 振り分け: DN-0220
- 実務記事の高流入×無導線 27 本は「業務経験 → 資格」カードの判断に含める → 振り分け: DN-0305
- backlog の S2（沈んだ不具合 3）と S3（意思決定なのに 🟣 でない 6）を `/backlog-sweep --audit` で是正する → 振り分け: 定常
- note 同期で止まった 3 本（BK-10 鉄道 R07・R08-yosou、BK-11 トンネル R03）を --force-retry で反映する → 振り分け: 定常
- 9 月の月次レビュー（/monthly-review）を DN-0643 の取得後に行う → 振り分け: 定常
- knip の返済を `check-knip-ratchet -- --update-baseline` で締め直す → 振り分け: 定常
- note 公開ページの目視確認（W39 から未完了）を次の週次で行う → 振り分け: 定常
