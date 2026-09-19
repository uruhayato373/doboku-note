# 週次レビュー 2026-W38

作成日: 2026-09-19
対象期間: 2026-09-12 〜 2026-09-18

---

## サマリー

- 計画タスク達成率: 1/7（EXP-007 裁定・DN-0026・DN-0185 は今週も未達で継続）
- 最大の成果: `feat/pack-lineup-2026-10`（RCCM・コンクリート技士/主任技士/診断士等）が develop 統合、MDX 新規 1,275 本
- 最大のリスク: GSC index coverage が 41.8%（#485・09-07 時点）のまま。新規大量公開（sitemap 1109→1516）で悪化の見込みが高い
- note 本文/タグ drift が拡大継続（本文 254 本・タグ 136 本・前週 257→254 はほぼ横ばい）
- 2026-09 note 売上: 13 件 / ¥41,080（09-13 転記・¥15k 月間マイルストーン達成済み）

## 計画 vs 実績

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| EXP-007 裁定・実験枠解放 | W37 Must | 🔴 未達 | measuring のまま。next_check 09-15 を 4 日超過 |
| DN-0026 / DN-0185（計測系2件を閉じる） | W37 Must | 🔴 未達 | backlog に残存。9/18 CI 取得後の反映も未実施 |
| #485 index coverage の切り分け | W37 Must | 🔴 未達 | 09-07 時点 41.8% のまま。新規1,275本公開で悪化リスク |
| DN-0220 図解整備の公開・配信 | 継続 | 🟡 進行 | pack-lineup 統合で制作は前進、本番実測は未着手 |
| note 本文 drift 90 本/日消化 | 定常 | 🟡 横ばい | 257 → 254（ほぼ変わらず） |
| Issue #457 close 判断 | 継続 | ✅ 解消 | 前週 open 6 件 → 今週 open 2 件（#478/#485）に減少、#457 含め4件解消 |
| EXP-008 再計測 | 継続 | 🔴 未達 | next_check 09-18 を1日超過 |

## 成果ハイライト

1. `feat/pack-lineup-2026-10`（#513〜#515）を develop へ一括着地。RCCM・コンクリート技士/主任技士/診断士のnote教材・記事群を新規追加（MDX 新規 1,275 本）
2. note live 監査で有料境界3本の再設定・タグ2本の同期・checker 偽陽性2種を修正し CRITICAL 0 を達成（8eba00b6）
3. CI ゲート改善: indexnow の edge 伝播待ち対応、運用アラートを Pre-merge から分離（ops 区分）、automation-failure の自動クローズ配線（09-18〜）
4. automation-failure open issue が前週6件→今週2件に減少（4件解消）
5. 2026-09 note 売上 ¥41,080（13件）、8月に続き ¥15k マイルストーン達成を維持

## 開発活動

- コミット数（過去7日）: 241（マージ含む。実質的な大型統合は pack-lineup-2026-10 の1件）
- 主な変更: 新資格ライン(RCCM/コンクリート系)の一括統合、note live 監査の偽陽性修正、CI signal tiers 分離、indexnow edge 待ち対応

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|
| content/site MDX（変更ファイル延べ） | 1,894 | — | 未比較（前週データなし） |
| 新規 MDX | 1,275 | — | pack-lineup-2026-10 統合による急増 |
| sitemap URL 数 | 1,516（09-07時点） | 1,109（08-01） | +407 |
| note 公開記事 | 865 | — | check-note-republish 参照 |

- note 公開状態ドリフト（verify-note-status）: 未実行（クラウド週次では実行不可・ローカル限定）
- note 再公開ドリフト: 本文 254 本 / タグ 136 本 / メタ(価格・境界・カバー) 70 本 / アセット 269 本 / 本文未初期化 7 本。件数は前週257からほぼ横ばい。反映はローカル限定（`note-update-body --commit` 等）
- note 未着（購入者受け取れず）: **0 本**（実査575/575・満たし575）— 最重要ゲートは健全
- note 添付実査: 測定 09-07・経過12日（14日以内）
- ココナラブログ健全性: **検査不成立**（`playwright` 未導入環境のためスクリプト実行不可。ローカルで `check-coconala-blog` 要再実行）
- ココナラ取引・評価: **検査不成立**（snapshot 18.1日前・上限7日超過）→ 次セッションで `npm run coconala-orders`（ローカル限定）
- 競合再スキャン: 4プラットフォームとも due なし（直近 note 08-30/20日前が最短）
- GSC/GA4 UI 取得（月次）: **due**（GA4-UI）— 直近取得(07-30)が3ユニット全失敗のまま50日経過。GSC-UIは27日で due 未満
- GA4 設定ドリフト: なし（event_label, cta_placement 双方 present）
- 実験再計測 due: EXP-007（4日超過）・EXP-008（1日超過）
- 壊れた内部リンク: 0（ERROR なし。GSC 404の3件は未公開ページ同士の参照で実害なし）
- A8 成果取込: due なし（11日前）。ただし未登録プログラム候補5件（click計8・確定額0）が継続
- 内部リンク走査: 2,154ファイル / 6,107参照（SSOT notFound 252・redirect 19、ERROR判定なし）

## NSM（オーガニック検索流入）

> クリーンな7日 WoW（GA4: 09-03〜09-09 → 09-10〜09-16、`ga4-channel-organic-*.json`）

| 指標 | 前週(09-03〜09) | 今週(09-10〜16) | 増減 |
|---|--:|--:|--:|
| Organic Search activeUsers（★NSM） | 2,294 | 2,136 | −6.9%（−158） |
| sessions | 3,337 | 3,072 | −7.9% |
| engagementRate | 68.7% | 70.1% | +1.4pt |

GSC（`gsc-date-*.json`、08-31〜09-07 → 09-08〜09-14、3日遅延のため直近未確定）:

| 指標 | 前週 | 今週 | 増減 |
|---|--:|--:|--:|
| clicks | 111 | 123 | +10.8% |
| impressions | 5,189 | 5,492 | +5.8% |
| CTR | 2.14% | 2.24% | +0.10pt |

トップクエリ（28日ローリング 08-18〜09-14、`gsc-query-*`）: 「1級土木施工管理技士 2次試験 解答例 令和6年」4clicks/pos16.9、「インターフェアリングフロートとは」2clicks/impr1124/pos7.7（高impr低CTR）

### NSM トレンドの洞察
- GA4 NSM は前週+43.5%の反動でマイナス転換（絶対数は8月末水準を維持）。GSCクリックはプラス継続でチャネル間の方向は一致していない→クリーンなGA4週とGSCの3日遅延窓のズレに留意
- 「インターフェアリングフロート」impr1124でCTR低い＝タイトル改善候補（次のsearch-intent監査候補）

## 実験の進捗

### Running (4 件)
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-008 | キャリアhub再設計 | 29日 | 未計測（PENDING2件） | 09-18超過・report-career-funnel再実行+A8取込 |
| EXP-009 | RCCM問題III note販売 | 3日 | — | next_check 10-01 |
| EXP-010 | note CTA rel=noreferrer撤去 | 3日 | — | next_check 11-01 |
| EXP-011 | 直前パック追加 | 2日 | — | next_check 10-01 |

### Measuring (1 件)
| ID | title | baseline | current | 効果判定 |
|---|---|---|---|---|
| EXP-007 | X 1→3本/日 | 昼基線比 | +0.5（8/14以降72件比較） | 未裁定・4日超過。9/7以降取得欠落あり送客比較不可 |

### 今週 close
- なし

### 次サイクルへの仮説
- EXP-007: 送客比較が不能なら「判定不能」で明記しclose、投稿本数はA案（現状維持）を既定にする
- EXP-008: A8月次成果とreport-career-funnel再取得をセットで9/18超過分を今週中に解消しないと3週目に入る

## PSI パフォーマンス推移

field(CrUX) coverage: **0/44**（判定不能が継続、4週超）。primary_source=fieldのため実害判定不能＝lab違反はmedium上限で扱う。

### 今週の変動
- Gate violations: **0**（CRITICAL相当なし）
- Diagnostic violations: 65（主にmobile LCP/FCP超過。`/exam`系ページで4,700〜8,300ms）
- 継続: `/exam/civil-construction-1/textbook/quality-overview`（mobile LCP 8,327ms）が最重

### 洞察
- field null が4週超継続＝実害判定の基盤が壊れたまま。DN-0158でCrUX供給問題として記録済み、進捗確認が必要
- lab違反は新規公開1,275本の影響で母数が増えた可能性。field復旧が最優先

## 収益カバレッジ ダッシュボード

- 流入のあるページ24 / 高流入(≥15users)で収益導線ゼロ: **0** / note導線ゼロ: **0**（要対応ギャップなし）
- 配置別CTA CTR: article-body 6.34%が最高、sidebar/home-hero は0%（インプレッションはsidebar 12,673と最大だがクリック0）
- 売上: `check-sales-freshness` ✓ 最新（転記09-13・6日前）。2026-09は13件¥41,080

## SNS 流入と投稿実績

GA4 source別WoW（09-03〜09 → 09-10〜16）:

| source | 前週 users | 今週 users | 増減 |
|---|--:|--:|--:|
| note / referral | 27 | 12 | −55.6% |
| x / social | 23 | 3 | −87.0% |
| youtube / video | 0 | 8 | 新規発生 |

YT公開照合（09-17時点）: recorded_but_gone **6件**（前週から変化なし・継続放置）／not_public_after_publishAt 0／pending_overdue 0

## 校正学習の蒸留

今週は `content/site/` 配下で大規模統合（pack-lineup-2026-10）が支配的で、通常の校正差分抽出は対象外とする。次週、統合後の個別リライトが発生したら再開する。

### 今週の抽出結果
- 今週の学習候補: なし（大規模merge統合週のためスキップ）

## SNS 予約キュー投入（X）

✅ 投入待ちなし（lookahead 8日内に未投入の下書きなし）。ただし見出し日付書式が読めず判定不能な下書き8パック（096〜103、図解系）が継続。日付書式の是正が必要。

## ドキュメント棚卸し（handoff 抽出→削除候補）

### active handoff 候補（3 件）
| handoff | 経過 | tracked(todo) | 完了シグナル(PR/SHA) | 推奨 |
|---|---|---|---|---|
| 2026-08-21-actions-recovery.md | 29d | なし | なし | 抽出漏れ疑い→backlog確認後削除 |
| 2026-08-31-coconala-c8-moshi-correction.md | 19d | なし | commit 5件あり | 完了済みの見込み→削除候補 |
| 2026-09-15-note-funnel-cta-live-sync.md | 未経過(<14d) | — | — | 継続監視 |

### デッドコード在庫（knip）
- 返済あり: Unlisted dependencies 13→9 / Unused dependencies 2→1（baseline未締め直し）。増加なし（Unused files 44横ばい）
- 次アクション: `npm run check-knip-ratchet -- --update-baseline` で締め直し推奨

## backlog 消化サマリ

- **消化**: done 22 件 / swept 0（blocked 0・fail 0）。09-12以降の dispatch-log 全件成功
- **残量**: カード **40** 件（🔴16 🟡17 🟢7）・前週18件から **+22**（pack-lineup統合に伴う新規タスク起票が主因）
- **分類率**: 40/40（改善25・不具合8・制作6・定期1）
- **モデル別**: codex 17 / claude-code 5。失敗・手戻り 0
- **台帳の健全性**: S2(沈んだ不具合) 0・S4(定期混入) 1（L82会員特典収録カード）・S9(4層外) 0。S4は要是正（backlogの役割違反）
- **完了の疑い**: `check-backlog-verify` 赤→緑 0 / 常時緑 2（check-content-expansion・check-video-content＝surfacer止まりで完了判定に使えない） / 赤 4 / 実行不能 1（quality:audit:ci 180秒タイムアウト）
- **品質censusのdelta**: 未確認（`build-quality-census.mjs` が `src/config/doc-meta-index.json` 未生成でENOENT。`npm run refresh-indexes` が依存パッケージ不足で失敗、環境要因）
- **収益カバレッジ**: 上記の通りギャップ0、article-body CTR 6.34%が最高

## automation-failure Issue の消化

- open **2 件**（最古 #478・19日前）。前週6件から4件解消
  - #478 workflow-health（psi-audit.yml 8連続失敗）: psi-batchが09-16〜09-18に連続生成されており**復旧済みの見込み**。人による確認・close待ち
  - #485 index-coverage（indexed_ratio 41.8%、08-01比−29.9pt）: 09-07時点のまま未更新。新規1,275本公開で悪化リスクが高く、最優先で切り分けが必要

## 課題・ブロッカー

1. **GSC index coverage 41.8%（#485）が3週目**。新規大量公開（sitemap+407）で今後さらに悪化の可能性。DN-0026/DN-0185とあわせて切り分けが必要
2. **PSI field(CrUX) 判定不能が4週超**。実害の有無を機械的に確認できない状態が続いている（DN-0158）
3. **note本文/タグdriftが254/136本で高止まり**。ローカル限定の反映作業が消化に追いついていない
4. **backlog残量が40件（前週比+22）**。pack-lineup統合の後処理タスクが積み上がっている。S4定期混入1件も是正が必要
5. **YT recorded_but_gone 6件が継続放置**（複数週横ばい）
6. **クラウド実行環境の制約**: `node_modules`が未インストール状態から開始（`npm install --legacy-peer-deps`で復旧）、`playwright`/`tsx`/`gray-matter`等一部パッケージ利用スクリプト（check-coconala-blog、report-monetization-coverage単体実行、refresh-indexes、quality-census）が未検証。coverage-latest.mdはCI生成の既存ファイルを代用した

## 学び

- pack-lineup-2026-10のような大規模一括統合（MDX新規1,275本）は index coverage を直接押し下げる。今後の大型統合ではindex coverageの事前影響試算をセットにすべき
- automation-failureの`--resolve`自動クローズ配線（09-18〜）が効き始めており、open件数が6→2に減少。ただし#478のような「実体は復旧済みだが自動配線対象外」のケースは人手確認が必要

## 来週への申し送り

- #485 index coverage の切り分けを最優先（Must継続3週目）
- EXP-007/EXP-008 の裁定・再計測を今週中に消化し、実験枠を解放する
- #478 の復旧確認・close（psi-batch生成再開を確認済み）
- backlog S4（定期混入カードL82）の是正、check-backlog-verify「常時緑」2件の検証ゲート差し替え
- ローカルセッションでの反映が必要な項目: note本文/タグdrift解消、ココナラ実体snapshot再取得（18日超過）、GA4-UI再取得（50日超過・3ユニット失敗のまま）、X予約下書き8パックの見出し日付書式修正
