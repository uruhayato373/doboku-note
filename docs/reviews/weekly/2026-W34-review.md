# 週次レビュー 2026-W34

作成日: 2026-08-21
対象期間: 2026-08-14 〜 2026-08-20

---

## サマリー

- 計画タスク達成率: 2/3 Must（NSM 乖離検証を決着、X 064-067 退役は完了）/ R8 択一ページの note 導線配線は未達
- NSM（Organic Search users）は 947（+85.7% WoW）と急回復。ただし GSC clicks は -37.5%（3日遅延の影響あり）
- note 本文 drift が 353→422 本へさらに増加（要ライブ反映・週次持ち越し）。knip デッドコード在庫も増加で FAIL
- 8/17 の売上ペースは月内 ¥15k マイルストーン達成（2026-08: 16件/¥39,520）

## 計画 vs 実績（W33 計画分）

| タスク | 分類 | 状態 | メモ |
|---|---|---|---|
| R8 択一ページに note 導線を配線 | Must | 🔴 未達 | `pe-comprehensive-management-r08-primary`（104users）と `pe-construction-competency-revision-r8`（39users）とも収益カバレッジで note CTA=「—」のまま |
| NSM 乖離の検証（GA4 vs GSC・前年同期比） | Must | ✅ 完了 | 8/17 決着。季節性（試験日と売上曲線が一致）と判定、前年同期比は「データが無く実行不可能」と方針転換。measurement-incidents.md に恒久ルール追記 |
| 1級土木二次の死守コア充実 | Must | ⚠ 部分 | 施工経験記述の想定工事バンクを1級150工事/2級60工事へ拡張（コンクリート主任技士の小論文32本も追加）。完全攻略パックの追録充実は未確認 |
| X 064-067 の退役処理 | Should | ✅ 完了 | `_archive-2026-pe-countdown/` へ退役済み。x-queue-surfacer から消えた |
| note ライブ反映（本文 drift） | Should | 🔴 悪化 | 353→**422 本**へ増加（着手なし） |
| A8 単月取得の実機観察 | Should | ⏸ 未実施 | ローカル要 A8 ログイン。前回取得 8/4（17日経過・due まで13日） |
| ココナラ DM 3 件の返信確認 | Should | ⚠ 部分 | inquiriesOneWay=3 のうち resolved=1（2件残） |
| YT pending_overdue 棚卸し | Could | 🔴 悪化 | 171→**187 件** |
| /doc-declutter（handoff 8件） | Could | ✅ 実施済み | 現存 handoff は全て 1〜2日以内の新規のみ（14日超の候補は 0） |

## 成果ハイライト

1. **NSM 乖離（GA4 vs GSC）を4週の持ち越しから決着**。試験日カレンダーと売上曲線の一致で季節性と結論づけ、前年同期比という実行不可能な検証手段を Must から外す恒久ルールを記録した
2. NSM が W33 の 520 → 947（+85.7%）へ急回復（季節性の谷を抜けた可能性）
3. X 064-067 の偽 OVERDUE 退役、キャリア（転職アフィリ）hub の5柱配線（完了・backlog から削除済み）
4. 施工経験記述 想定工事バンク拡張（1級150工事・2級60工事）＋コンクリート主任技士 実務立場別小論文32本
5. 2026-08 売上が ¥15k マイルストーン達成（16件/¥39,520、17日時点）

## 開発活動

- コミット数: 53（過去7日）
- 主な変更: キャリアアフィリ hub 新設（完了・backlog から削除済み）、backlog 台帳の健全性ゲート新設（check-backlog-verify）、metrics CI の schedule checkout ref 固定、knip ラチェット返済、SVG text-clip 修正
- 注記: `git fetch` 時に `develop`/`main` とも "forced update" を検知（履歴 rewrite）。以降の git 統計は本レビュー時点のツリーに基づく

## コンテンツ実績

| カテゴリ | 今週 | 先週 | 増減 |
|---|---|---|---|
| note 公開記事（監視対象） | 777 | ~765 | 微増 |
| note 本文 drift（要再公開） | 422 | 353 | +69 悪化 |
| note タグ drift | 137 | — | 未計測（前週比なし） |
| コンクリート主任技士 小論文 | +32本 | 0 | 新規 |

- note 構成監査（`check-note-structure`）: **本クラウド環境ではネットワーク到達不可のため検査不成立**（外部 note API への fetch が完走せずタイムアウト、プロセスを強制終了）。ローカルセッションでの再実査が必要
- GSC/GA4 UI 取得（月次）: `anyDue: true`（30日超または前回不完全）。次セッションで `/google-search-growth`（ローカル要 Google ログイン）
- GA4 設定ドリフト: なし（`event_label`/`cta_placement` とも present）
- note 商品未着: 0 本（478/478 実査・OK）
- 競合再スキャン: Brain が **due**（白地・自動 scout なし）。X/IG/ココナラは due でない
- ココナラブログ健全性: **検査不成立**（`playwright` パッケージ未インストールのためこのクラウド環境で実行不可）
- ココナラ取引: actionCount 0、warningCount 0（inquiriesOneWay 3件中 resolved 1件）
- A8 成果取込: due でない（17日経過／30日しきい値）。crossCheckExceeded は stats47 混入分として想定内

## NSM（オーガニック検索流入）

**クリーンな7日 WoW**（GA4: 2026-08-14〜08-20 vs 2026-08-06〜08-12、japanOnly・Organic Search限定）

| 指標 | 今週 | 先週 | WoW |
|---|---|---|---|
| Organic Search activeUsers（NSM） | 947 | 510 | **+85.7%** |
| Organic Search sessions | 1,356 | 801 | +69.3% |

GSC（2026-08-11〜08-18 vs 2026-08-03〜08-10・日次窓、**直近3日は未確定の可能性**）

| 指標 | 今週 | 先週 | WoW |
|---|---|---|---|
| clicks | 20 | 32 | -37.5% |
| impressions | 881 | 535 | +64.7% |
| CTR | 2.27% | 5.98% | -3.71pt |

トップクエリ（直近28日）: 「優劣分岐点とは」4クリック/19表示、「総合技術監理 キーワード集 2026」1クリック/45表示（CTR低・改善余地）

### NSM トレンドの洞察

- GA4 activeUsers の急回復（+85.7%）は季節性の谷を抜けた兆候の可能性があるが、GSC clicks は逆に下落しており**再び符号が割れている**。ただし GSC は3日遅延があり直近数日（8/16-18）が未確定のため、来週の再計測で方向を確認する
- impressions が+64.7%と大きく伸びているのに clicks が減っているのは CTR 低下の要因。上記トップクエリのような表示回数の多い低 CTR クエリの title/description 改善が候補

## 実験の進捗

### Running (1件)

| ID | title | 経過日数 | 次アクション |
|---|---|---|---|
| EXP-006 | civil-1 textbook 未登録 20 本のインデックス登録 | 22日 | 残り10本の登録リクエスト（日次クォータ回復後）、次check 8/27 |
| EXP-008 | キャリア hub 再設計（deploy 完了・28日クロック開始） | 0日 | 9/18 に `report-career-funnel` 再実行、A8月次成果取込後に判定 |

（EXP-007「X 1→3本/日」は前週 running・今回のスナップショットでは status 変化なし。x-own-metrics は中央値で読む準備段階）

### 今週 close

- なし

### 次サイクルへの仮説
- GSC clicks 下落が3日遅延による一時的なものか実質的な劣化かを、来週の完全な週次窓で切り分ける

## PSI パフォーマンス推移

**判定原則: field(CrUX 実ユーザー) が実害、lab は直近5バッチ中央値で診断のみ**（measurement-incidents.md 2026-07-27）

- 追跡 44 URL×strategy 組のうち、lab 中央値がしきい値超過（Perf<70 or LCP>2500ms）: **19件**
- ただし **全19件で field_data category = FAST**（実ユーザー体感は高速）→ **CRITICAL 0件**、いずれも「改善余地（medium）」に留まる
- 代表例: `/`（medPerf 67, medLCP 6.9s lab／field LCP FAST）、`/search`（medPerf 65, medLCP 2.9s）、`pe-comprehensive-management-exam-passing-strategy`（medPerf 65, medLCP 6.2s）

### 今週の変動
- lab 値の日次振れは引き続き大きい（合成スロットリングの性質）。field が FAST な限り障害としては扱わない

### 洞察
- lab 改善余地の候補（LCP 5s超が複数、civil-construction-1 系ページに集中）はあるが、実害ゼロなので優先度は Should 以下

## 収益カバレッジ ダッシュボード

- 売上鮮度: `check-sales-freshness` ✓ 転記は最新（4日前・280件実検査）。2026-08 単月 16件/¥39,520（**¥15kマイルストーン達成**）
- 流入ページ 95、高流入(≥15users)で収益導線ゼロ: **0**（要対応ギャップなし）
- note 導線ゼロ（アフィリのみ）: 9ページ。上位は `pe-comprehensive-management-r08-primary`（104users）・`pe-construction-competency-revision-r8`（39users）・`pe-first-stage-r07-basic`（29users）— **前週 Must で配線予定だった2ページが未着手のまま残存**

## SNS 流入と投稿実績

**source別WoW**（GA4: 2026-08-14〜08-20 vs 2026-08-06〜08-12）

| source | 今週 users | 先週 users | WoW |
|---|---|---|---|
| note / referral | 21 | 28 | -25.0% |
| x / social | 10 | 8 | +25.0% |
| instagram | 0 | 0 | — |
| youtube | 0 | 0 | — |

YT公開照合（`yt-verify/latest.json`・2026-08-20時点）: 対象200件のうち **recorded_but_gone 6件**（台帳に記録済みだがライブから消失）、pending_overdue **187件**（前週171から悪化）。IG/X の公開ドリフト照合はローカル Playwright 限定のためクラウド週次では未実行。

## 校正学習の蒸留

`/distill-proofread-learnings` は前回 2026-06-27 実行以降未実施（約2ヶ月ギャップ）。今週の `content/site/` 差分は8コミット（キャリアhub新設・career記事の文末単調修正・SVG修正）と対象が少なく、本ルーティンでは完全実行を見送った。**次回ローカルセッションで蒸留サイクルの再開を推奨**（2ヶ月分の校正パターンが未抽出のまま溜まっている）。

### 今週の抽出結果
- 未実施（上記の理由により今回はスキップ）

## SNS 予約キュー投入（X）

⚠ 今週投入すべき下書き: **3件**（すべて OVERDUE・go-live 超過）

| draft | 期間 | 未投入 | 状態 |
|---|---|---|---|
| 068-civil1-secondary-keiken-w1 | 7/6-7/12 | 28/28 | 🔴 OVERDUE |
| 080-pe-comprehensive-r08-hit | 7/21-7/21 | 1/1 | 🔴 OVERDUE |
| 082-concrete-pe-competitor-format-repurpose | 7/25-7/29 | 6/6 | 🔴 OVERDUE |

キュー充足は 9/30 まで（残り40日）だが、上記3件は go-live 期日超過済み。次のローカルセッションで `x-schedule-guard` → `publish-x` → `x-sync-status` の投入手順が必要。

## その他パフォーマンス

なし（NSM/PSI/SNS で網羅済み）

## 課題・ブロッカー

1. **note 本文 drift が 353→422本へ悪化**（2週連続の課題持ち越し・要ライブ反映は1日100件上限で4〜5日分）
2. **note タグ drift 137本・メタ(価格/境界/カバー)drift 13本・アセットdrift 174本**（republish 系すべて未着手）
3. **YT pending_overdue が171→187件へ悪化**、recorded_but_gone 6件（ライブから消失した投稿の再確認が必要）
4. **knip デッドコード在庫が増加で FAIL**（Unlisted binaries 15→24、Unused deps 4→5、Unused devDeps 0→4）。grep裏取りの上で正当な追加なら baseline 更新、そうでなければ削除が必要
5. **R8択一・PE施工能力ページの note 導線が2週連続未配線**（Must から2週間動いていない）
6. **`check-coconala-blog` がこのクラウド環境で実行不能**（playwright パッケージ未インストール）。ローカルでの実査が必要
7. **`check-note-structure`（構成監査）がこのクラウド環境でネットワーク到達不可**。ローカルセッションでの再実査が必要
8. **`check-external-write-orphans` が `gh` CLI 不在で検査不成立**（このクラウド環境は GitHub MCP 経由のみ）

## 学び

- **持ち越しタスクは「優先度」か「実行不可能」かを判定する**（今回 NSM前年同期比の教訓）。3週以上動かないタスクは書き方自体を疑う
- **クラウドルーティン実行環境の限界を明示的に記録する**: playwright 未インストール（coconala-blog）、外部 note API への到達不可（note-structure）、gh CLI 不在（external-write-orphans）の3系統はこのクラウド週次では原理的に実行できない。ローカルセッションでの補完が必須の項目として毎週明示する

## 来週への申し送り

- note 本文/タグ/メタ/アセット drift（合計 746 件相当）のライブ反映着手（ローカル・1日100件上限）
- R8択一・PE施工能力ページへの note 導線配線（2週連続 Must 未達）
- YT pending_overdue 棚卸し（187件）と recorded_but_gone 6件の確認
- knip デッドコード増加の grep 裏取り（正当な追加か削除漏れか）
- ローカルセッションで `check-note-structure` / `check-coconala-blog` / `verify-note-status` / `verify-ig-status` の再実査（クラウド週次では実行不可）
- `/distill-proofread-learnings` の再開（2ヶ月未実施）
- GSC clicks -37.5% が3日遅延の一時的乖離か実質劣化かを来週の完全窓で確認
