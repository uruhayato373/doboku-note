# 週次レビュー 2026-W37

作成日: 2026-09-14
対象期間: 2026-09-07 〜 2026-09-13（前回 2026-W36 レビューは 09-04 作成。W36 ファイルは抽出後に削除・記録は git 履歴）

事業の週次判断: 同期間の provisional review は 09-14 00:08Z に記録済み（`.claude/state/metrics/business/review-2026-09-14T00-08-35-683Z-*.json`・snapshot 同時刻）。同一期間の二重記録はせず、9/18 の CI 取得後に supersedes で訂正する（記録の nextReviewDate=2026-09-18）。

---

## サマリー

- NSM（Organic Search users・JP）**1,599 → 2,294（+43.5%）**、GSC clicks **31 → 101（+226%）**。2 週連続の急伸だが、GSC index coverage は **71.7% → 41.8%**（#485・inspected 1,109→1,516）と逆方向。
- **訂正**: W36 の「PSI field(CrUX) 復旧」は誤読。08-18 以降の全バッチで field_data は 22/22 URL とも null（キーはあるが値が無い）。実害判定は 4 週以上できていない。
- 開発 280 コミット（非マージ）。専門土木テキスト 8 章・コンクリート 3 資格の深掘り・建設部門 書き方ガイド 5 本・分類 SSOT・YouTube 日次配信 CI・DN-0205 の赤ゲート 8 件解消。
- 売上: 2026-09 累計 13 件 / ¥41,080（転記 09-13）。W37 は 3 件 / ¥6,440。note 未着 0 / 575。
- 計測系の計画タスク（DN-0026 の 28 日窓・DN-0185 の索引/イベント記録）は 2 週連続で未着手。

## 計画 vs 実績（W37 weekly.md ＋ W36 申し送り）

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| DN-0185 計測開始を記録 | 実行 1 | 🔴 未達 | カードは 09-08 から本文更新なし。GSC 索引・GA4 イベントの記録が無い |
| DN-0026 28 日窓（09-14 成立）の GSC URL 検査 | 実行 2 | 🔴 未達 | 期日が今日。URL 検査の記録なし |
| DN-0220 公開対象の確認と配信準備 | 実行 3 | 🟡 進行 | 図解・記事は 09-13 に develop へ統合。本番反映と SNS 接続は未確認 |
| note 本文 drift を 90 本/日で消化 | 定常 | 🔴 未達 | 255 → **257**（並行編集で純増） |
| DN-0120 A8 9 月分（09-16・Mac） | 手動 | ⏳ 継続 | 会社 PC からは到達不能を 09-07 に記録 |
| Issue #473 有料プレビュー 71 件 | W36 Must | ✅ 解消 | **09-04 に close**。71 件は二重基準の過検出で実体 0 本 |
| Issue #457 close 判断 | W36 Must | 🔴 未達 | open **38 日** |
| EXP-007 再計測 | W36 Must | ✅ 実施 | 09-14 に measuring へ更新（下記） |
| YT recorded_but_gone 6 件 | W36 Should | 🔴 未達 | 09-10 照合でも 6 件のまま |
| 売上転記 | W36 Could | ✅ 完了 | 09-13 に 13 件転記・検算 0 差 |
| knip 再検査 | W36 Could | ✅ 実施 | 09-13 に返済＋baseline 締め直し（ただし新規赤あり・後述） |
| `/distill-proofread-learnings` | W36 Could | 🔴 未実施 | 前回 06-27・**11 週** |

## 成果ハイライト

1. 1級土木 専門土木テキスト 8 章を新設し概念図 SVG 16 枚、法規 3 本・安全 3 本を市販書の方法論で深掘り（2024〜2025 改正反映）。
2. コンクリート主任技士・技士・診断士のテキストを深掘りし自作 SVG 42 枚を追加。原本由来 142 本に `sources` を宣言（baseline 159 → 17）。
3. 技術士建設部門「書き方ガイド」hub＋スポーク 5 本、193p の論文指南書を経路 D で全文起こし。
4. 分類 SSOT（`check-content-taxonomy`）を新設し全記事 tags を正規表記へ codemod。共通仕様書データ公開を 09-08 本番反映。
5. YouTube: A ブランド 112 パック検証・日次配信 CI（20:17 JST）・旧動画削除の preflight を整備。IG: 336 投稿の campaign を準備し旧シリーズを一時停止。

## 開発活動

- コミット: **280**（マージ込み 304）・変更ファイル 3,326（tags codemod で MDX 1,265 本が一括更新）
- 基盤: business-direction.json＋`business-review` CLI、seo-rank-watch 統合、note-sales-fetch のライブ校正、ローカル容量掃除（Claude/Codex 共通）、`quality:audit:ci` の赤ゲート 8 件解消（DN-0205）
- 運用: 学科記述予想 06/07 を会員限定で配信（予定超過分の解消）、Shorts mp4 の台帳 sha256 是正、reference-materials 孤児 OGP 5 件を R2 削除リストへ

## コンテンツ実績

| カテゴリ | 先週 | 今週 | 増減 |
|---|--:|--:|--:|
| pe-construction | 129 | 146 | +17 |
| civil-practice | 50 | 61 | +11 |
| civil-construction-1 | 154 | 162 | +8 |
| pe-first-stage | 45 | 51 | +6 |
| reference-materials（孤児 5 本） | 5 | 0 | −5 |

- 合計 1,229 → 1,267（+38・他カテゴリは横ばい）。MDX 新規 42 / 削除 5。
- note: 公開 833 本。要再公開＝本文 drift **257**・タグ drift 136・メタ 70・アセット 243・未初期化 7（`check-note-republish`）。
- `verify-note-status` は 240 秒でタイムアウト＝**検査不成立**（社内プロキシ）。`check-note-structure` は未実施。
- 教材からの展開（`check-content-expansion`）: 27/27 教材・930 論点＝covered 904 / partial 12 / blocked 5 / excluded 9。原典待ち 16（DN-0224）・pending 1・**stale 923**（成果物変更後の再照合未了）・productionComplete=false。

## NSM（オーガニック検索流入）

| 指標 | 前週 | 今週 | 増減 |
|---|--:|--:|--:|
| Organic Search users（NSM・JP） | 1,599 | **2,294** | +43.5% |
| Organic sessions（JP） | 2,243 | 3,337 | +48.8% |
| 全チャネル users（JP） | 2,567 | 2,556 | −0.4%（Direct 896→181） |
| GSC clicks | 31 | **101** | +226% |
| GSC impressions / CTR / 順位 | 1,734 / 1.79% / 21.7 | 4,747 / 2.13% / 16.6 | — |

窓: GA4 09-03〜09-09 vs 08-27〜09-02（クリーンな 7 日 WoW）、GSC 09-01〜09-07 vs 08-25〜08-31（3 日遅延込み）。fetch-metrics 09-10 実行。

### NSM トレンドの洞察
- 2 週連続の急伸（W36 +54%）。前週の Direct 896 は bot 疑いの一過性で、全体 users は横ばい＝流入の質が Organic へ寄った。
- GSC は impressions が 2.7 倍。新 URL（/exam/）への露出が始まった一方で index coverage は 41.8%（下記 #485）＝**露出の増加とインデックス率の低下が同時**に出ており、URL 移行の過渡期として来週も両方を見る。
- CTR 改善候補: 「インターフェアリングフロートとは」impr 600 / clicks 2（pos 7.2）、「スクレーパとは」impr 118 / 1（pos 7.1）。試験意図の上位は「1級土木 2次試験 解答例 令和6/7年」。

## 実験の進捗

### Measuring（1 件）
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-007 | X 1 日 1 本→3 本（型×時間帯） | 32 日 | いいね中央値 朝 1→1 / 昼 0.5→1 / 夜 1→1（施策後 72 投稿・9/7 まで） | **09-15**: X の公開 ID/時刻と 9/8 以降の取得欠落を照合。送客（siteClickDelta）は基線が無く判定不能 |

### Running（1 件）
| ID | title | 経過日数 | baseline → current | 次アクション |
|---|---|---|---|---|
| EXP-008 | キャリア hub→5 柱→ツール再設計 | 23 日 | 凍結基線 career-funnel-baseline-2026-08-12 | **09-18**: `npm run report-career-funnel` 再実行＋A8 9 月分取込（PENDING 2 件・確定 3 件未満では勝敗を決めない） |

### 今週 close
- なし

### 未処理の申し送り（`check-experiments-due`）
- EXP-005（done）: 「deploy 後に r07-a の mobile lab LCP を再計測」が残存。learnings で lab 指標を目標にしない結論が出ているため、**申し送りを閉じるか field 指標へ書き換える**。

### SEO Rank Watch
- 監視 9 件（1級土木 4・総監 3・建設部門 2）。候補 `civil1-secondary-r07-answers`「1級土木 2次試験 解答例 令和7年」（pos 11.1・impr 29）は **capacity-limit**（実験枠 2 が EXP-007/008 で埋まっている）で未開始。方針レビュー期日 10-11。

### 次サイクルへの仮説
- EXP-007 を 09-15 で裁定して枠を空け、rank-watch 候補（1級土木 二次 10/4 直前の検索意図）を `/weekly-improve --rank-watch` へ渡す。

## PSI パフォーマンス推移

- **field(CrUX)**: 08-18 以降の全 46 バッチで **22/22 URL とも null**（url-level / origin-level とも 0）。W36 の「復旧」は `field_data` のキー存在を値ありと読んだ誤り。**実害判定は不能**のまま。
- lab（mobile・直近 5 バッチ中央値）: Performance **74**（前 5 バッチ 73）、LCP **4,858ms**（前 5,099ms）＝横ばい・回帰なし。desktop は Perf 99 / LCP 0.7s。
- lab 最低 URL（改善余地・障害ではない）: `/search` Perf 63 / LCP 8.0s、`primary/r07-a` 64 / 8.7s、`secondary/concrete-basics` 67 / 7.7s。`lcp_element` は全バッチで null＝要因の機械特定ができていない。
- fetch-metrics の site root PSI は「PSI 500」で取得失敗（weekly-metrics の psi 節）。

## 収益カバレッジ ダッシュボード

- 売上転記: ✓ 最新（転記 09-13・実検査 293 件・最終売上 09-12）。**2026-09: 13 件 / ¥41,080**（¥9,800 ×2・¥5,480・¥3,960 など）。W37: 3 件 / ¥6,440（civil-2 過去問模範答案 ¥2,480、civil-1 経験記述 完成答案 ¥1,980 ×2）。
- 流入ページ 39・高流入×無導線 **0**・note 導線ゼロ 1（`civil-construction-1-guide-grade-comparison` 15 users）。
- 配置別 CTA CTR: **article-body 6.88%（127 clicks）** ≫ article-top 0.68% ≈ article-mid 0.67% > article-footer 0.36% > article-end 0.23%。sidebar 0.01%。
- label×売上（ID 付き 182/262 clicks）: `civil-2-pastexam-essay@secondary-r07-q1` 23 clicks / 1 売上、`civil-1-pastexam-essay@secondary-r07-q1` 20 clicks / **0 売上**、`civil-1-niji-marugoto-pack@secondary-r07-top` 2 clicks / ¥11,800。
- 詳細: `.claude/state/metrics/monetization/coverage-latest.md`（窓 08-13〜09-09）。

## SNS 流入と投稿実績

| source | 前週 | 今週 | 増減 |
|---|--:|--:|--:|
| note / referral | 22 | 27 | +23% |
| x / social | 10 | 23 | +130% |
| instagram / youtube | 0 | 0 | 行なし |

- YT 公開照合（09-10）: total 200 / withVideoId 13 / ok 7 / **recorded_but_gone 6**（W36 と同数）。同週に旧動画削除フェーズを整備しており、削除済み置換か記録誤りかの切り分けは未了。
- IG（`ig-reconcile/snapshot.json` 09-10）: published_UNrecorded 51・scheduled 60・anomaly 54・reel_built_unposted 42。`verify-ig-status` は Playwright 要のため本セッション未実行（**照合は 4 日前の値**）。
- X 予約キュー: 充足 10/24 まで・投入待ちなし。ただし新規下書き 8 パック（096〜103・計 57 本）が**見出しの日付書式で due 判定不能**。

## 校正学習の蒸留

未実施（前回 2026-06-27・11 週停滞）。今週は MDX 1,300 本超の変更があり蒸留対象は多い。

## ドキュメント棚卸し（handoff 抽出→削除候補）

| handoff | 経過 | tracked(todo) | 完了シグナル | 推奨 |
|---|---|---|---|---|
| 2026-08-21-actions-recovery.md | 24d | なし | なし | 抽出漏れの疑い → `/doc-declutter` |
| 2026-08-31-coconala-c8-moshi-correction.md | 14d | なし | 5 コミット | `/doc-declutter` で削除判定 |

### デッドコード在庫（knip）
- 09-13 に返済（Unlisted deps 13→9・Unused deps 2→1・Unused files 45→44）。**▲ Unlisted binaries 0 → 2** で ratchet FAIL（09-13 の締め直し後に発生）。grep 裏取りのうえ `knip.json` ignore か `--update-baseline`。

## SNS 予約キュー投入（X）

✅ 投入待ちなし（充足 10/24）。判定不能 8 パック / 57 本は上記 SNS 節。

## backlog 消化サマリ

- **消化**: done **17** 件 / swept 0（blocked 0・fail 0）。09-12〜13 の教材展開（専門土木・コンクリート・図解）で起票→完了が同週内。
- **残量**: カード **18** 件（🔴 8 / 🟡 7 / 🟢 3）・W36 時点 42 件 → −24。
- **分類率**: 18/18（改善 11・不具合 4・制作 3）。
- **モデル別**: codex 16 / claude-code 1。失敗・手戻り 0。
- **台帳の健全性**: S2 0・S4 0・S9 0（健全）。S7 検証ゲート欠落 13/18、S11 実績コミット後に本文未更新 2（DN-0120・DN-0186）、S12 完了 prose 蓄積 1（DN-0135・8 件）。
- **完了の疑い**: `check-backlog-verify` 赤→緑 0 / 常時緑 0 / 赤 1 / **実行不能 1**（`quality:audit:ci` 180 秒タイムアウト）。
- **外部書き込みの孤児**: 検出 0 と表示されたが、run 9 本中 **5 本の取得が Proxy Authentication Required で失敗**＝部分的に検査不成立（スクリプトは ✓ を出す。§9 の偽 PASS 型）。
- **台帳の不整合**: DN-0205 は 09-13 に削除済み（8c881bb8）だが、旧 develop から切った branch のマージ（e019b1b1）で**カードが復活**している。しかも knip ゲートが新原因で再び赤。
- **品質 census**: delta total −5 / thin −6 / failed 0。新規未採点 0・薄層逆戻り 0・スコア低下 0。rewrite queue 317。

## automation-failure Issue の消化

- open **6 件**（最古 #457 **38 日**）。7 日以上 open は全 6 件（#457 / #475 / #477 / #478 / #479 / #485）。
- **#485（09-07 新規）**: index coverage 41.8%（08-01 71.7%）。inspected 1,109→1,516（+407）・discovered-not-indexed 4→**723**・crawled-not-indexed 292→11・indexed 795→**634**。URL 分割（/exam/ 等）で sitemap が膨らみ新 URL が未クロールの過渡期と読めるが、indexed −161 は実減。
- #473 は 09-04 に close（71 件は二重基準の過検出・真の下限割れ 0 本）。#475/#477/#478/#479 は変化なし。

## 課題・ブロッカー

1. **index coverage 41.8%（#485）** — 新 URL 723 本が discovered-not-indexed。旧→新の 301/canonical 伝播を待つのか、sitemap・内部リンクで押すのかの判断が必要（`/gsc-review`＋`gsc-index-auditor`）。
2. **PSI field が 4 週以上 null** — 実害判定ができない状態を W36 で「復旧」と誤記した。lab の悪化（/search 8.0s 等）が実ユーザーに出ているか不明。
3. **計測系タスクの 2 週連続未着手**（DN-0026・DN-0185）— 制作 280 コミットの陰で計測・判断が押し出されている。
4. **DN-0205 の復活＋knip 再赤** — マージで削除済みカードが戻り、ゲートも新原因で赤。台帳と CI の両方が嘘をついている状態。
5. **#457 が 38 日 open** — 通知チャネルの消化停止。ココナラ実体は 13 日前の snapshot で検査不成立。

## 学び

- **「値がある」と「キーがある」は別**。PSI の `field_data` は全キーが常に存在し値だけ null になる。緑を読むときは非 null の件数（`field_availability.url_level` の true 数）を数える。W36 の誤記は 1 週間の優先順位を歪めなかったが、EXP-005 の教訓（lab を目標にしない）を無効化しかけた。
- **削除済みカードはマージで戻る**。古い develop から切った branch を merge すると、その間に削除したカードが衝突なしで復活する。`check-backlog-health` は「ID の再利用」しか見ないので、完了→削除の後は develop 先端で branch を切り直すか、merge 後に台帳 diff を見る。
- **取得失敗を数えない surfacer は緑を出す**。`check-external-write-orphans` は run の取得失敗を warning に流して「✓ 痕跡なし」を返した。プロキシ環境では常に部分不成立になるので、取得失敗件数を出力し支配的なら「検査不成立」にする（DN-0225）。
- 露出（impressions ×2.7）とインデックス率（−30pt）は同時に動く。URL 移行期は GSC の単一指標で良し悪しを決めない。
- **偽赤も偽緑と同じ害**。09-13 に追加された pre-commit の `check-business-direction --staged` は index（LF）と作業ツリー（CRLF）を生文字列で比較していて、autocrlf の Windows 端末では**無関係なコミットでも必ず FAIL** した（本レビューのコミットで発覚）。改行を正規化して比較するよう修正済み。新しいゲートは Mac 以外の端末で一度は通す。

## 来週への申し送り

- **09-15** EXP-007 裁定（X 公開 ID/時刻の照合・9/8 以降の取得欠落）→ 枠を空けて rank-watch 候補を `/weekly-improve --rank-watch --no-fetch` へ
- **09-18** CI 取得後に W37 の business review を supersedes で訂正／EXP-008 の 28 日測定（`report-career-funnel`＋A8 9 月分）
- DN-0026 の 28 日窓 GSC 検査（期日超過）と DN-0185 の索引・イベント初回記録
- #485 の切り分け（URL 移行の過渡か実減か）と #457 の close 判断（38 日）
- DN-0205 の再削除と knip Unlisted binaries 2 件の裏取り（`--update-baseline` か ignore）
- `npm run coconala-orders`（snapshot 13 日）・`/google-search-growth`（ga4-ui は完全取得の記録なし）・A8 未登録プログラム候補 5 件（8 clicks 分）
- X 下書き 096〜103 の見出し日付書式を直して due 判定を復旧（57 本）
- `/doc-declutter`（handoff 2 件）・`/distill-proofread-learnings`（11 週）・note 本文 drift 257 の消化再開・YT recorded_but_gone 6 件の切り分け
- EXP-005 の残申し送り（lab LCP 再計測）を閉じるか field 指標へ書き換える
