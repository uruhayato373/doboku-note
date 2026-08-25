# 週次レビュー 2026-W35

作成日: 2026-08-25
対象期間: 2026-08-18 〜 2026-08-24

前週: `docs/reviews/weekly/2026-W34-review.md`（本コミットで削除・git 履歴 e9fc9aaa7 に残存）

---

## サマリー

- **有料記事 71 本が無料プレビュー下限割れとして 3 週間赤を出し続けていた**（Issue #473・全て 1級土木 完全攻略パック ¥9,800 配下）。ただし**下限の基準が書き込み経路と監査経路で違う**ことが判明し、71 という数は過検出を含む。まず測り直す（DN-0126）。
- **PSI の field（CrUX）が 8/18 以降 12 バッチ連続で全 null**。CI ゲートは field でしか実害を判定しないので、「ゲート違反 0 件」は現在**判定材料が無いだけ**。
- 自動化の可視化が一気に前進（`check-workflow-health` 新設 → その初回実行が上の 21 日沈黙を検出）。一方 `note-live-audit.yml` は 3 連続失敗のまま。
- 計測は前週から更新なし（最新スナップショットは 8/21・次回 fetch-metrics は 8/28 金）。NSM の数字は W34 と同一で、本レビューでは新しい判断材料にならない。
- `/backlog-sweep` の実行が直近 2 週で 0 件。台帳 102 枚のうち 59 枚が sweep 到達不能（うち 55 枚は `[検証:]` 無し）。

> **本レビューは火曜実行**（通常は金曜 PM）。W34 の救出に伴って回したため、① 計測は 8/21 スナップショットのままで W34 と同値、② 評価対象の W35 計画（8/24〜8/30）はまだ 2 日しか経っていない。計測系の判断は 8/28 金の定期実行で更新すること。

## 計画 vs 実績

W35 計画（`2026-W34.md`）は開始 2 日のため、W34 の申し送り 7 件に対する 8/18〜8/24 の実績で見る。

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| note drift のライブ反映着手 | Must | 🔴 未着手 | 本文 422 本（W34 と同数）／タグ 137 本／メタ 13 件／アセット 174 件。反映はローカル実機のみ |
| R8択一・PE施工能力への note 導線配線 | Must | 🔴 未着手（**3 週連続**） | `pe-comprehensive-management-r08-primary`（104users）と `pe-construction-competency-revision-r8`（39users）とも note CTA が「—」のまま |
| YT pending_overdue の根本原因切り分け | Should | 🔴 横ばい | 187 件で変化なし。最後の run が 68 日前 |
| knip 増加の grep 裏取り | Should | ✅ 不要と判明 | ラチェット 7 カテゴリすべて baseline と同値（増加ゼロ） |
| `/distill-proofread-learnings` の再開 | Could | 🔴 未実施 | 3 か月目に入った |
| ローカル限定検査の再実査 | Could | ⚠ 部分 | `check-note-structure` は実行できた（71 件 CRITICAL を確認）。ココナラ snapshot は 7.5 日前で検査不成立 |
| GSC clicks -37.5% の完全窓での再確認 | Should | ⏸ 保留 | 新スナップショット未生成（8/28 金） |

W34 で申し送りから落ちていた 2 件（ココナラ DM 残 2 件・A8 単月取得）も下の「来週への申し送り」で拾い直した。

## 成果ハイライト

1. **CI の赤を人へ届ける経路ができた**（a1ca013f6・`check-workflow-health` 新設）。その初回実行が `note-live-audit` の 21 日沈黙を検出し、Issue #473 として起票された。「赤いのに誰も見ていない検査は無いのと同じ」（CLAUDE.md §9）への機械的な回答。
2. **コンクリート主任技士 実務立場別 小論文集 33 本を公開・収録・サイト導線まで通した**（47e70a531・2ad20d7dc）。8 立場 × 4 テーマ ＋ ペルソナ選択ガイド。
3. **マガジン収録ゲートを三軸（repo / SoT / ライブ）に拡張し射程を 26→43 へ**（6d161a5b3・0cdca1142）。SoT とライブが同値のまま古びる事故を塞いだ。
4. **競合 genba-career.com を全 71 記事実読で記録**（1d82f6266）。キャリア記事の勝ち型を移植方針に落とし、転職アフィリの論点を「配置」から「成果ゼロ」へ差し替え（90f1b4d04）。
5. 管理画面に note 公開状態タブ／記事一覧の絞り込みレールを追加（1f4847540・db3566988・f08591e46）。

## 開発活動

- コミット数: **47**（対象期間・履歴切り詰め commit `5b41d8c74` は除外）
- 主な変更: 品質ゲートの整備（偽赤 4 件・偽緑 1 件の解消、既存 fail 3 件の解消、マガジン収録ゲート拡張）／CI 失敗の通知経路新設／管理画面 3 タブ／ココナラブログ下書き 10 本／R2 台帳外の一掃（完了・カードは削除済み）
- 注: 期間内の `--shortstat` 集計は履歴切り詰め commit が全ツリーを再追加するため無意味。切り詰め後の実数は 347 files / +168,443 / -6,726。

## コンテンツ実績

| 種別 | 今週 | メモ |
|---|--:|---|
| note 記事 公開 | 33 | コンクリート主任技士 実務立場別 小論文集（8 立場 × 4 テーマ ＋ ガイド） |
| note マガジン 収録是正 | 22 | 完全攻略パック 改訂版 18 本（151→169）＋ ゼネコン/河川コンサル 4 本 |
| ココナラブログ | 1 公開 / 10 下書き | 連載第 5 回「安全管理」で完結。下書き 9 本は型と送客先を分散 |
| サイト MDX | 0 新規 | 総監キーワード 3 本は公開後 revert（f9c97ffec） |

- note 公開状態ドリフト是正: 実行せず（`verify-note-status` は本セッション未実行）
- note 再公開ドリフト: **本文 422 / タグ 137 / メタ 13 / アセット 174**（本文未初期化 7）
- note 構成監査: **CRITICAL 71 件**（全て `FREE_PREVIEW_COLLAPSE`・下記「課題」参照）
- ココナラブログ: 15 本を実検査（公開 6 / 下書き 9）・違反 0・警告 0
- 競合再スキャン DUE: **brain**（一度もスキャンなし・手動 WebSearch）。note/coconala/ig は 35 日・x は 11 日で期限内
- GSC/GA4 UI 取得: **ga4-ui が DUE**（完全な取得記録が無い・直近実行は 0/3 で全失敗＝`csv-menu-ambiguous` / `report-not-found`×2）。gsc-ui は 2 日前・11/16 取得で期限内
- GA4 設定ドリフト: なし（desired 2 件とも登録済み・観測 7 日前）
- note 未着（購入者が受け取れない）: **0 件**（478/478 満たす）。ただし実査は 11.9 日前
- A8: 期限内（20 日経過）。crossCheck 超過 18 click は stats47 同居による想定内

## NSM（オーガニック検索流入）

**新規スナップショットなし**。最新は `ga4-channel-organic-2026-08-21` / `gsc-date-2026-08-21` で、W34 レビューが使ったものと同一。次回 `fetch-metrics.yml` は 8/28（金）06:00 JST。

| 指標 | 08-13 窓 | 08-21 窓 | 増減 |
|---|--:|--:|---|
| Organic Search users（NSM） | 510 | **947** | +85.7% |
| GSC clicks | 32 | 20 | -37.5% |
| GSC impressions | 535 | 881 | +64.7% |

### NSM トレンドの洞察

- 上表は W34 レビューと同一データ。**今週分の判断材料としては使わない**。
- impressions が伸びて clicks が落ちている形は W34 時点と変わらず、3 日遅延の未確定分を含む。完全窓での確認は 8/28 以降。

## 実験の進捗

### Running（2 件）

| ID | title | 経過 | 次アクション |
|---|---|--:|---|
| EXP-006 | civil-1 textbook 未登録 20 本のインデックス登録 | — | 次 check 8/27 |
| EXP-008 | キャリア hub→5柱→ツール再設計 | 3 日 | 9/18 に `report-career-funnel` 再実行（28 日クロック） |

### Measuring / 今週 close

- なし

### 未処理の申し送り（due 判定 1 件）

- **EXP-008**: 要人手 2 件 —（1）deploy から 28 日後に `npm run report-career-funnel` を再実行して凍結基線と比較（2）A8 月次成果の取り込み（`npm run a8-ui:fetch -- --month YYYY-MM`・要ログイン）。確定 3 件未満では案件の勝敗を決めない。

## PSI パフォーマンス推移

**判定の前提が今週崩れている。** `psi-config.json` は `primary_source: "field"` / `critical_requires_field_slow: true` で、CI ゲート（`isGateViolation`）は `field` / `field-category` / `coverage` の 3 型しか赤にしない。その field が空になっている。

| 期間 | field(CrUX) を持つバッチ | 状況 |
|---|---|---|
| 〜2026-07-20 | 0 件 | CrUX 未供給 |
| 2026-07-21 〜 08-17 | 48 バッチ（983 result） | 最終バッチ 08-17 は LCP **21/21 FAST** |
| **2026-08-18 〜 08-24** | **0 件（12 バッチ連続で全 null）** | **判定材料なし** |

- W34 の「PSI（field p75）全 19 件 FAST・Critical 0 件」は 8/17 までのデータでは正しかったが、**8/25 現在は根拠が失効している**。
- 最新レポート（08-24）の「CI ゲート違反 0 件」は、実害が無いことではなく **field が無く coverage も落ちていない**ことしか意味しない。
- lab は診断として有効。mobile の perf 中央値（直近 5 バッチ）ワースト: `civil-construction-1-secondary-concrete-basics` 64 / `civil-construction-1-guide-strategy` 67 / `primary-r07-a` 71 / `primary-h26-a` 71 / `pe-comprehensive-management-r05-primary` 72。診断上のしきい値超過は 50 件。
- desktop で CLS 超過が 3 件（`/search` 0.549・`primary-r07-a` 0.225・`r07-primary` 0.12）。CLS は field 不在でも lab で再現性があり、`/search` は突出。

## 収益カバレッジ ダッシュボード

> 流入: 2026-07-24〜08-20（`ga4-page-2026-08-21`）

- 流入のあるページ **95** / 高流入（≥15users）で収益導線ゼロ **0** / **note 導線ゼロ（アフィリのみ）9**
- 売上: 転記は最新（8 日前・実検査 280 件）。累計 280 件 / ¥565,640

### note 導線ゼロ（上位 5・他 4 件）

| ページ | users | group |
|---|--:|---|
| `pe-comprehensive-management-r08-primary` | 104 | pastExam |
| `pe-construction-competency-revision-r8` | 39 | guide |
| `pe-first-stage-r07-basic` | 29 | primary |
| `pe-comprehensive-management-general-vs-comprehensive` | 24 | guide |
| `concrete-chief-engineer-textbook-mix-design` | 21 | textbook |

他 4 件: `concrete-diagnostician-guide-overview`(19) / `concrete-chief-engineer-primary-construction`(18) / `civil-construction-1-guide-grade-comparison`(17) / `concrete-chief-engineer-textbook-production-qc`(15)。全量は `.claude/state/metrics/monetization/coverage-latest.md`。

### noteCTR が効いている面（対比）

civil 二次系は `civil-construction-2-secondary-r07` 12.6% / `civil-construction-1-secondary-r07` 13.7% / `civil-construction-2-secondary-experience-writing-examples` 12.5%。**同種の配置を上表に張れば取れる見込みがある**という根拠が 3 週分たまっている。

## SNS 流入と投稿実績

| source | 08-13 窓 | 08-21 窓 | 増減 |
|---|--:|--:|---|
| note / referral | 28 | 21 | -25.0% |
| x / social | 8 | 10 | +25.0% |
| 合計 | 36 | 31 | -13.9% |

- 上記も 8/21 スナップショットで W34 と同一（新規なし）。
- YT 公開照合: 総数 200 / videoId あり 13 / ok 7 / **recorded_but_gone 6** / not_public_after_publishAt 0 / **pending_overdue 187**。3 週連続で横ばい〜悪化。

## 校正学習の蒸留

- **未実施**（`/distill-proofread-learnings` は 3 か月目に入った）。今週も対象期間の `content/site/` MDX 差分がほぼ無い（新規 0 本）ため、蒸留の入力自体が薄い。
- 抽出結果: 実行していないため 0 件。「候補なし」ではなく**未実行**として記録する。

## ドキュメント棚卸し（handoff 抽出→削除候補）

- `check-doc-lifecycle`: handoff 総数 **1**・候補 **0 件**（14 日超なし）。棚卸し不要。
- デッドコード在庫（knip）: **増加なし**。7 カテゴリすべて baseline と同値（Unused files 48 / Unlisted binaries 17 / Unlisted deps 17 / Unused exported types 22 / Unused exports 14 / Unused deps 4 / Unresolved imports 1）。返済もゼロなので baseline 締め直しは不要。

## SNS 予約キュー投入（X）

キュー充足は 9/30 まで（残り 37 日）。一方、**go-live を過ぎたまま未投入の下書きが 3 件**。

| draft | 期間 | 未投入 | 状態 |
|---|---|---|---|
| 068-civil1-secondary-keiken-w1 | 7/6-7/12 | 28/28 | 🔴 OVERDUE |
| 080-pe-comprehensive-r08-hit | 7/21 | 1/1 | 🔴 OVERDUE |
| 082-concrete-pe-competitor-format-repurpose | 7/25-7/29 | 6/6 | 🔴 OVERDUE |

3 件とも go-live が 1 か月以上前で、**投入せず期限だけ過ぎた状態**。内容が今も有効かを見て、投入するか退役させるかを決める段階（W34 の X 064-067 と同じ判断）。

## backlog 消化サマリ

- **消化**: done 0 件 / 掃除 0 件（`dispatch-log` は 8/18 以降 **0 エントリ**＝`/backlog-sweep` が 2 週間回っていない）
- **残量**: カード **102 枚**（🔴24 / 🟡46 / 🟢23 / 🟣9）
- **分類率**: `[実行:]` 分類済み 102/102（未分類 0）。ただし **sweep 到達不能 59/102**（除外＝ユーザー 27・対話 32）
- **モデル別**: 集計対象なし（dispatch 0 件）
- **台帳の健全性**: S2 沈んだ不具合 **0** / S4 定期の混入 **0** / S9 4 層以外 **0** — 3 指標とも健全。S7 到達不能 59（うち `[検証:]` 無し **55**＝陳腐化が永久に検出されない）、S8 重複候補 2 ペア（L529↔L595・L961↔L1082）
- **完了の疑い**: 赤→緑 0 件。**常時緑 4 本**（`check-note-paid-cta` L97 / `test:e2e:admin` L1193 / `audit-note-funnel` L1225 / `quality-census` L1693）＝`[検証:]` が surfacer を指していて完了判定に使えない。差し替えるか外す。
- **外部書き込みの孤児**: orphan 0。`silent-stop` 1 件（youtube-scheduled-post・未処理 187 件で最後の run が 68 日前）

## 自動化の失敗（automation-failure Issue）

**open 2 件・最古 18 日前**。どちらも 7 日を超えているので言及必須。

| Issue | 経過 | channel | 状態 |
|---|--:|---|---|
| #473 | 1 日 | note-live-audit | **未復旧**。原因は下記「課題 1」。対応方針が未決なので閉じられない |
| #457 | 18 日 | gsc-auto-review | **未復旧**。`gsc-auto-review.yml` の CI 実行が失敗。dedup 仕様で以後の同 channel 失敗はこの Issue にコメント追記され埋没する |

`check-workflow-health` の実測: 7 本中 **note-live-audit.yml のみ不健全**（最終 success 21 日前・3 連続失敗）。他 6 本は健全（index-coverage は 23 日前だが実行間隔内）。

## 課題・ブロッカー

1. **無料プレビュー下限の判定が二重基準になっている（最優先・DN-0126）** — Issue #473 の CRITICAL 71 件は全て 1級土木 完全攻略パック（¥9,800）配下。ライブ実測 302〜582 字（中央 442）で固定下限 600 字を割っている。**ただし起票後の実査で、下限が経路によって違うと判明した**:

   | 経路 | 下限 | 実装 |
   |---|---|---|
   | 書き込み（公開・本文更新） | 記事別 `min(600, max(120, 無料部分×0.5))` | `note-publish.mjs:124` / `note-update-body.mjs:207` |
   | 監査 | 固定 600 | `check-note-structure.mjs:178` |

   記事別下限を入れた関数のコメント自身が「固定600字だけでは、工事別テンプレートのように『工事概要の直後から有料』にする正常な短いプレビューを破損扱いする」と書いており（`note-live-check.mjs:117`）、**71 件はまさにその工事別テンプレート**。パック 154 本を offline 実測すると 140 本の記事別下限が 600 未満（min 202 / 中央 511）。したがって「71 本を本文修正する」判断は早い。**測り直してから決める**。
2. **PSI の実害判定が機能していない** — field(CrUX) が 12 バッチ連続で全 null。ゲートは field でしか赤にならないため、この状態では性能劣化を検知できない。CrUX 側の供給停止（サンプル数不足の可能性）か取得側の問題かの切り分けが要る。**「ゲート違反 0 件」を安全の証拠として読まないこと**。
3. **高流入 × note 導線ゼロが 3 週連続で未着手** — `r08-primary`(104users) / `competency-revision-r8`(39users)。civil 二次系で noteCTR 12〜14% が出ている以上、機会損失の見積もりは推測ではなく実績ベースで言える。
4. **`/backlog-sweep` が 2 週間止まっている** — 台帳 102 枚に対し dispatch 0 件。しかも 55 枚は `[検証:]` が無く、陳腐化しても永久に検出されない。
5. **X 下書き 3 件が 1 か月以上 OVERDUE** — 投入も退役もされないまま滞留。
6. **ga4-ui の UI 取得が一度も完全成功していない** — 直近実行は 0/3 で全失敗。GA4 UI 由来の指標は現在ゼロ供給。

## 学び

- **「ゲートが緑」と「判定できている」は別**（§9 の再確認）。今週は同じ構造の事例が 2 つ同時に出た。PSI は field が空なので永久に緑、`check-note-structure` は正しく赤を出していたのに読む経路が無くて 3 週間無視された。前者は「入力が無い緑」、後者は「読み手が無い赤」で、**どちらも計器としては死んでいる**。
- 前者を潰す仕掛け（`check-workflow-health`）を今週入れた初回実行が、後者を実際に見つけた。watchdog は作った週に元が取れることがある。
- 一方で `check-workflow-health` 自身は「最後の success がいつか」しか見ない。**入力が空でも success する検査**（今の PSI）はすり抜ける。次の穴はそこ。
- **赤の件数をそのまま作業量として読まない**。#473 の 71 件は、書き込み側と監査側で下限が違うという二重基準の産物を含んでいた。赤を見たら「何件検査したか」だけでなく「**どの基準で測ったか**」も確認する（§9 の系）。

## 来週への申し送り

> 各項目は `.claude/todo/backlog.md` に起票済み（DN-#### を併記）。今週分の実行は `.claude/todo/weekly.md`。
> 定期タスク（ココナラ実体採り直し・A8 月次・brain 競合スキャン・校正学習の蒸留）は種類の決定規則 1 に従い backlog へ置かず weekly.md 側にある。

- **[Must] Issue #473 の決着（DN-0126）** — まず監査の下限を書き込み経路と揃えて測り直し、「本当に下限割れ」の本数を確定させる。その残余に対してだけ方針（境界を下げる / 本文を足す / allowlist）を決める。**測る前に 71 本の本文へ手を入れない**。
- **[Must] R8択一・PE施工能力ページへの note 導線配線（DN-0128）**（4 週目）。civil 二次系の noteCTR 12〜14% を根拠に配置を移植する。
- **[Must] PSI field 供給停止の切り分け（DN-0127）** — CrUX 側かスクリプト側か。field が戻らないなら判定原則（`psi-config.json`）自体を lab 中央値ベースへ書き換える必要がある。
- [Should] note drift のライブ反映着手（DN-0003）（本文 422 / タグ 137 / メタ 13 / アセット 174・1 日 100 件上限＝分割前提・ローカル実機）
- [Should] `/backlog-sweep` の再開と、`[検証:]` 無し 55 枚への検証コマンド付与。常時緑 4 本は差し替えか撤去（DN-0129）
- [Should] ココナラ実体の採り直し（`npm run coconala-orders`・snapshot 7.5 日前で検査不成立）と **DM 残 2 件の返信**（W34 で申し送りから落ちた分）
- [Should] **A8 単月取得の実機観察**（W34 で落ちた分・期限まで 10 日）
- [Could] X OVERDUE 3 件の投入 or 退役判断（DN-0130）
- [Could] Issue #457（gsc-auto-review・18 日 open）の復旧か、復旧不能なら channel ごと畳む（DN-0109 に追記）
- [Could] brain 競合スキャン（一度も未実施・手動 WebSearch）／ ga4-ui 取得の復旧（DN-0051 に追記）
- [Could] `/distill-proofread-learnings` の再開（3 か月目）
