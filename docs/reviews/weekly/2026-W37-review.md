# 週次レビュー 2026-W37

作成日: 2026-09-11
対象期間: 2026-09-05 〜 2026-09-11

※ 前回（2026-W36）のレビュー・計画ファイルは保持方針に従い削除済み（履歴は git 参照）

---

## サマリー

- **index coverage が 71.7%→41.8%（-29.9pt）に急落**（Issue #485・#457 で二重検知）。8月末の `/docs`→`/exam・practice・standards・topics` URL 移行後の再クロール待ちが支配的仮説だが、10月の月次計測が判定期限
- NSM（Organic Search users）は 1,606→2,307（+43.6%）、GSC clicks 31→101（+225.8%）と大幅増。ただしindex coverage急落と時期が重なり要因未切り分け
- backlog が **42枚→20枚に大幅消化**（dispatch-log: 8/29-9/5 で done17/swept22）。S3構造課題（意思決定tier誤り）は解消
- automation-failure Issue #457 が**実際に「dedup 埋没」の実害を起こした**：8/25 に復旧確認済みで即クローズ可能だったのに17日放置し、本日 09-11 の新規異常（index coverage）が同じ Issue にコメント追記され埋没
- 売上転記が **25日経過で FAIL**（前回18日WARN から悪化）。8月実績（16件/¥39,520）は先週から更新なし
- knip デッドコード在庫が実環境（本セッションで `npm install` 完了）で4カテゴリ▲増加を確認（前回はクラウド環境差で誤検出疑いだったが今回は実測）

## 計画 vs 実績（2026-W36 申し送りの消化）

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| Issue #473 方針決定（有料プレビュー71件） | Must | ✅ 解消 | Issue 一覧から消滅（クローズ済み） |
| Issue #457 のクローズ判断 | Must | 🔴 悪化 | 未クローズのまま17日追加放置、本日ついに新規異常が埋没する実害発生 |
| EXP-007 の再計測 | Must | 🔴 未達 | 期限8/27を15日超過（前回8日から悪化）。再計測されないまま3週目 |
| YT recorded_but_gone 6件の実体確認 | Should | 🔴 未達 | 件数変化なし（6件のまま） |
| ココナラ滞留対応 | Should | 未確認 | snapshot 10.5日前で検査不成立、ローカル実機必要 |
| 売上転記の取り直し | Could | 🔴 悪化 | 18日→25日、WARNからFAILへ |
| knip ratchet 悪化のローカル再検査 | Could | ✅ 実施 | 本セッションで `npm install` 完了・実環境で4カテゴリ▲増加を確認 |
| `/distill-proofread-learnings` の再開 | Could | 🔴 未達 | 引き続きスコープ外（11週停滞） |

## 開発活動

- 直近7日の非マージコミット: **240件**（マージ込み262件）
- diffstat は経路D書籍OCR（ページ画像＋テキスト）一括登録により 10,401ファイル変更と巨大化しており、コミット単位の粗集計としては信頼できない（前回同様の注記）
- 主なテーマ: 経路D書籍OCR全文起こし登録 32件（技術士論文の書き方193p・最新土木業界の動向とカラクリ262p 等）／YouTube動画パック公開・検証 27件／技術士建設部門 執筆技術ガイド6本新設（キーワードノートの作り方・提出前チェックリスト・設問分解・当日手順・あいまい表現排除 等）／キャリア系note誘導文言の検証根拠強化・アフィリエイト経路是正／ローカル容量肥大の機械検査新設（disk-hygiene）

## コンテンツ実績

- content/site 配下の関連コミット: 55件（PE建設部門ガイド新設が中心）
- note 記事: 公開 831 本中 synced 567 本（本文）／synced 695 本（タグ）。要再公開: 本文 drift 257 本（前週255→微増）・タグ drift 136 本（前週137→微減）・未初期化 7 本
- カテゴリ別ページ数の差分集計は今回も未実施（doc-meta-index.json は今回セッションで新規生成のため前週比較なし）

## NSM（オーガニック検索流入）

`.claude/state/weekly-metrics/2026-W37.json`（CI供給・非重複クリーン窓）を使用。

| 指標 | 前週（8/27-9/2） | 今週（9/3-9/9） | 増減 |
|---|--:|--:|--:|
| Organic Search users（NSM） | 1,606 | 2,307 | **+43.6%** |
| Organic sessions | 2,253 | 3,354 | +48.9% |

| 指標 | 前週（8/25-31） | 今週（9/1-7） | 増減 |
|---|--:|--:|--:|
| GSC clicks | 31 | 101 | **+225.8%** |
| GSC impressions | 1,734 | 4,747 | +173.7% |
| GSC 平均順位 | 21.7 | 16.6 | 改善 |

※ GA4/GSCとも非重複7日窓（前回レビューの重複窓より正確）。GSCは3日遅延のため直近日は未確定。

### NSM トレンドの洞察
- 先週の急伸（+54.2%）に続き今週はさらに大幅増（clicks+225.8%・平均順位も21.7→16.6へ改善）。ただし index coverage が同時に急落しているため（下記）、この伸びが今回のURL移行に伴う一時的な再評価（新URL体系のクロール・再ランキング）由来である可能性もあり、来週以降も同水準を維持できるかで実質判断する
- 上位クエリは「1級土木施工管理技士 2次試験 解答例 令和6年」（clicks3/impr4/CTR75%）が高CTR。一方「インターフェアリングフロートとは」は impr600/clicks2/CTR0.33%と高インプレッション低CTRが継続（改善余地変化なし）

## index coverage 急落（新規・要注意）

- **indexed_ratio 41.8%**（2026-09-07 計測・閾値60%未満で異常判定）。前回2026-08-01は71.7%で **-29.9pt**（閾値-5pt超）
- **discovered_not_indexed 723件**（sitemap 1,516の47.7%・閾値20%超）。hygiene（404+redirect）は0で正常、inspected=sitemapで検査自体は完全
- gsc-index-auditor の診断（Issue #457コメント・09-11自動生成）: 支配的仮説は **8月末の `/docs`→`/exam・practice・standards・topics` URL 移行直後の再クロール待ち**。discovered 723件は全件fetch未試行で技術エラー0件、indexed 634件は全て新URL体系。other 148件の内訳は「Google未認識」116件＋canonical不一致32件（旧/docs・/categoryのまま＝301反映待ち）
- 恒久的な権威性不足か一時的な谷かは **10月の月次計測（index-coverage.yml）が判定期限**
- 起票は2系統: Issue #485（index-coverage.yml 閾値ゲート）と Issue #457（gsc-auto-review 月次診断・後述の dedup 埋没問題あり）

## 実験の進捗

### Running（2件）
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-007 | X 1日1本→3本増量（型×時間帯A/B/C） | 29日 | — | **MEASURE_DUE**（next_check_date 8/27 を15日超過）。`/nsm-experiment measure EXP-007` |
| EXP-008 | キャリアhub→5柱→ツール再設計 | 21日 | — | PENDING（次check 9/18・deploy28日後のreport-career-funnel再実行／A8月次成果取込が要人手） |

### 今週 close
- なし

### 次サイクルへの仮説
- EXP-007 は3週連続で再計測未実施。次回セッションで測定を確定させないと、X投稿頻度施策の継続可否判断がこれ以上先延ばしできない

## PSI パフォーマンス推移

- **field(CrUX) が再び全欠測**: 直近14バッチ（09-04〜09-10、全て22/22 URL）とも `field_availability` が url_level/origin_level ともfalse。前回レビューで報告した「8/30-8/31に復旧」は09-04以降に再び消失しており、単発の自然変動だった可能性が高い（DN-0158(3)としてCrUX全体の供給問題を継続記録）
- primary_source=field の運用ルール上、field欠測時は「実害判定不能」であり「異常なし」ではない（report_only・CIゲート対象外）
- Diagnostic violations: 60件 / Gate violations: 0件（field不在のためgate自体は今回も発火せず）
- lab値の詳細分析（直近5バッチ中央値）は本セッションでは未実施

## 収益カバレッジ ダッシュボード

- **売上転記**: `check-sales-freshness` **FAIL** — 転記 2026-08-17 から **25日経過**（閾値21日、前回18日から悪化）
- 2026年08月: 16件 / ¥39,520（前週から変化なし＝転記停止中）
- 累計（全期間）: 280件 / ¥565,640
- 高流入(≥15users)で収益導線ゼロ: **0件**（健全）
- note導線ゼロ（アフィリのみ）: 1ページ（`civil-construction-1-guide-grade-comparison`, 20users・前週から変化なし）
- 配置別CTA CTR: article-body 6.88%が突出（127クリック）、次いでarticle-top 0.68%・article-mid 0.67%
- **メンバーシップ配信遅延**: 学科06施工計画が予定9/8を3日超過（noteStatus=draft のまま未配信）

## SNS 流入と投稿実績

`.claude/state/weekly-metrics/2026-W37.json` の sns セクション（非重複窓）を使用。

| source | 前週 | 今週 | 増減 |
|---|--:|--:|--:|
| note | 22 | 27 | +22.7% |
| x | 10 | 23 | **+130%** |
| 合計 | 32 | 50 | +56.25% |

- YT公開照合: total200 / withVideoId13 / ok7 / **recorded_but_gone 6**（前週から変化なし・未着手）/ not_public_after_publishAt 0 / pending_overdue 0

## SNS 予約キュー投入（X）

✅ 投入待ちなし（lookahead 8日内に未投入の下書きなし。キュー充足は10/7まで）

## 校正学習の蒸留

未実施（前回2026-06-27・約11週停滞）。本レビューのスコープでも `/distill-proofread-learnings` は実行していない。

## ドキュメント棚卸し（handoff 抽出→削除候補）

### active handoff 候補（2件・scanned 3件）
| handoff | 経過 | tracked(todo) | 完了シグナル(PR/SHA) | 推奨 |
|---|---|---|---|---|
| 2026-08-21-actions-recovery.md | 21d | なし | なし | backlog抽出漏れの疑い→確認のうえ削除（前週14dから継続放置） |
| 2026-09-07-backlog-sweep-and-a8-blocker.md | 4d | なし | 1コミットあり | 経過観察 |

- `2026-08-31-coconala-c8-moshi-correction.md` は候補から外れた（age/orphanいずれの基準にも非該当）

### デッドコード在庫（knip）
- **▲増加あり（本セッションは `npm install` 完了済みの実環境で計測）**: Unlisted binaries 5→8／Unused exported types 21→24／Unused exports 12→14／Unused files 44→45
- 前回はクラウド環境のdevDependencies欠如による誤検出の可能性を指摘したが、今回は完全な `node_modules` 環境での実測であり、真の増加とみてよい。grep裏取りのうえ次のローカルセッションで是正判断

### アクション提案
- handoff候補2件・knip増加4カテゴリ → 次のローカルセッションで `/doc-declutter` と knip是正判断

## backlog 消化サマリ

- **消化**: done 17件 / 掃除（swept）22件（2026-08-29〜09-05の集計、全てcodex実行。dispatch-logは09-05以降記録なし＝直近6日ノーアクティビティ）
- **残量**: カード20件（🔴内訳: 改善10・不具合2・制作7・意思決定1）。前週42件から**大幅減**
- **分類率**: 種類付与済み20/20（全件）
- **台帳の健全性**: S2（沈んだ不具合）0件・S3（意思決定なのにtier≠🟣）**0件（前週6件から解消）**・S4（定期混入）0件・S9（4層外）0件。S7（検証ゲート欠落）8/20件（前週40/42件から比率改善）・S12（完了prose蓄積）1件（L56）・S13（チャネル状態複製疑い）1件（L78）
- **完了の疑い**: `check-backlog-verify` は今回も100秒でタイムアウトし検査不成立（2週連続、環境要因の可能性が高まっている）
- **外部書き込みの孤児**: `gh` CLI 不在のため検査不成立（クラウド環境の恒常的制約。GitHub操作はMCP経由）
- **品質censusのdelta**: total+60（新規未採点65件はPE建設部門ガイド新設分）／scored+0／thin-1／failed+0。逆戻りなし
- **収益カバレッジ**: 上記セクション参照（高流入×無導線ギャップ0件、健全）

## automation-failure Issue の消化

open **6件**（最古 **35日前**）:
- **#457**（35日・gsc-auto-review）: **要最優先対応**。元の原因（disk容量起因のCI失敗）は8/25時点で復旧確認済み・クローズ可能だったのに17日放置し、**本日09-11に発生した新規異常（index coverage急落）が dedup 仕様により同一Issueへのコメント追記に埋没した**。8/25コメントで警告されていた「以後の失敗が埋没する」実害がまさに今回顕在化した
- #475（18日・pre-merge赤 develop）: 未確認
- #477（12日・uptime-ping失敗）: 未確認
- #478（11日・workflow-health赤）: 未確認
- #479（11日・quality-audit report区分FAIL）: 前回同様 `playwright-auth-wiring-strict` の既存違反で失敗中、Phase03完了までは想定内の可能性
- **#485（4日・新規・index-coverage閾値ゲート）**: 上記「index coverage急落」節参照。#457の09-11コメントと同一事象

**7日以上openなのは #457・#475・#477・#478・#479 の5件**（前週3件から増加）。#457は原因切り分けと閉鎖判断の両方が必要（復旧済みの旧原因はクローズ、新規のindex coverage異常は別途追跡）。

## 課題・ブロッカー

1. **index coverage が-29.9ptの急落**（71.7%→41.8%）。URL移行の再クロール待ちが有力仮説だが10月まで判定できず、NSM/GSCの好調が今後も続くか不透明
2. automation-failure Issue #457 が dedup 埋没の実害を起こした。8/25時点で解決済みだった旧原因のクローズ判断が17日放置され、通知チャネルとして機能不全に陥った
3. EXP-007 の再計測が3週連続未実施（期限15日超過）。X投稿頻度施策の継続可否が宙に浮いたまま
4. 売上転記が25日経過でFAIL（8月実績が更新されないまま）
5. YT `recorded_but_gone` 6件が2週連続未着手
6. メンバーシップ配信「学科06施工計画」が予定を3日超過して未配信
7. knip デッドコード在庫が実環境測定で4カテゴリ増加を確認（要is-a-mistake判定）

## 学び

- automation-failure Issueの「dedupで以後の失敗が埋没する」という2026-08-25時点の警告どおりの事故が2026-09-11に実際に起きた。**警告が出てから実害が出るまでの猶予（今回17日）を消化に使わないと、警告自体が無意味になる**。次回以降、automation-failure節で「復旧済みだが未クローズ」なものは即クローズを最優先タスクとして扱うべき
- PSI field(CrUX)は前回「復旧」と報告したが、わずか3〜4日で再び全欠測に戻った。**単発の回復を「解消」と呼ばない**（前回レビューの学びと同じ教訓を再度確認）。次回以降は「復旧」ではなく「一時的にfieldが得られた期間があった」程度の慎重な書き方にする
- クラウド実行環境でも `npm install --legacy-peer-deps` を実行すればknip等ローカル専用検査の大半が実環境で回せることを確認した。ただしnote.comへのライブfetch（check-note-structure・verify-note-status・check-note-live-headings）はいずれも90秒超で完走せず、プロキシ等ネットワーク制約は依然として残る

## 来週への申し送り

- index coverage急落の10月判定待ち（discovered→indexed の移行速度を月次で確認）
- Issue #457 のクローズ判断（旧原因は復旧済み・新規index coverage異常は別途追跡）
- EXP-007 の再計測（`/nsm-experiment measure EXP-007`、期限超過15日）
- 売上転記の取り直し（25日経過、FAIL）
- YT `recorded_but_gone` 6件の実体確認
- メンバーシップ「学科06施工計画」の配信（3日超過）
- knip ratchet 4カテゴリ増加のgrep裏取りと是正判断
- `/distill-proofread-learnings` の再開（11週停滞）
- note本文drift 257本の段階的ライブ反映継続
