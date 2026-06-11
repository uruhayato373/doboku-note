# docs/ SSOT 再整理 manifest（2026-06-11）

2026-06-11 の競合分析・収益化戦略再設計・1級2級メンバーシップ設計・総監ハブ記事設計の追加で多重化した戦略/note計画系 SSOT を、トピックごとに 1 つへ収斂させる作業の全件リスト。

> [!important] 整理の原則
> - 整理対象は「about ドキュメント」（戦略・計画・索引・README・ポリシー・進捗・handoff）のみ。成果物コンテンツ本体（article.md / textbook MDX / 図版 / design-system 仕様）は読み取り専用。
> - コンテンツは削除しない。陳腐化セクションは「> [!note] 最新は {path} を参照」への置換または「## アーカイブ」退避。
> - 各ファイルの Red Line セクションは一字一句変更しない。

## 決定した SSOT 体系（収斂後）

| トピック | 真実源（SSOT） | 従属ドキュメント |
|---|---|---|
| 総監 note 戦略・進捗・価格企画 | `docs/note/技術士総監/noteコンテンツ計画.md` | `総監マガジン構成_決定2026.md`（2026-06-10 の決定記録＝ADR） |
| 建設部門 note 戦略・価格企画 | `docs/note/技術士建設部門/noteコンテンツ計画.md` | — |
| **1級・2級土木 note 戦略（4分裂の統合先）** | `docs/note/1級・2級土木/noteコンテンツ計画.md` | 1級/2級 施工経験記述プラン（買い切りマガジン実装詳細）・集客クラスター×2・添削テンプレ・2級伴走設計（先行ドラフト＝アーカイブ） |
| 実価格・noteUrl | `src/lib/note-magazines.ts` | （従来どおり・変更なし） |
| 両資格リリース計画 | 総監 noteコンテンツ計画.md「📅 統合リリースカレンダー 2026-07〜12」 | `05_コンテンツロードマップ.md` はアーカイブ（参照化） |
| 価格の競合対比妥当性 | `docs/project/01_戦略/09_note競合分析2026.md`（判断記録） | — |
| note 記事の所在索引 | `docs/note/README.md` | — |

## 作業全件表

### Zone 1: docs/note/

| # | action | file | 内容 |
|---|---|---|---|
| 1 | update | `docs/note/README.md` | 全面更新（2026-05-29 で陳腐化）: 1級・2級土木/・技術士建設部門/・コンクリート主任技師/・コンクリート診断士/・共通/ を反映、各試験 SSOT へのポインタ、公開マガジン一覧の更新 |
| 2 | update | `docs/note/1級・2級土木/noteコンテンツ計画.md` | 1級・2級土木 note 戦略の統合 SSOT へ昇格。冒頭に「SSOT 体系（サブ文書索引）」節を追加し 4 分裂を収斂 |
| 3 | update | `docs/note/2級土木/2級伴走メンバーシップ設計.md` | 冒頭に supersession バナー（決定は 1級・2級土木/noteコンテンツ計画.md）。本文は §参照が生きているため保存（アーカイブ扱い） |
| 4 | update | `docs/note/1級土木/1級土木施工経験記述プラン.md` | 冒頭に位置づけ注記（買い切りマガジン実装プラン。戦略の上位 SSOT は 1級・2級土木/noteコンテンツ計画.md） |
| 5 | update | `docs/note/2級土木/2級土木施工経験記述プラン.md` | 同上 |
| 6 | update | `docs/note/1級土木/1級土木-集客記事クラスター.md` | 親プラン行に統合 SSOT への参照を追加 |
| 7 | update | `docs/note/2級土木/2級土木-集客記事クラスター.md` | 同上 |
| 8 | update | `docs/note/プロフィール.md` | リンク切れ修復（`docs/note/noteコンテンツ計画.md` → `技術士総監/noteコンテンツ計画.md`） |
| 9 | update | `docs/note/技術士総監/noteコンテンツ計画.md` | 廃止済み `.claude/state/task-queue.json`（T-016）参照を `docs/todo/` へ置換（4 ヶ所）。本文・Red Line は不変 |
| 10 | update | `docs/note/技術士総監/総監マガジン構成_決定2026.md` | SSOT 関係行に「本書は決定記録（ADR）。価格企画の現行真実源は noteコンテンツ計画.md（v5 反映済み）」を明記 |
| 11 | update | `docs/note/1級土木/takuitsu-pdf-prototype.md` | 冒頭に注記（戦略の真実源は 08_Kindle出版戦略.md。本書は試作記録） |

### Zone 2: docs/project/

| # | action | file | 内容 |
|---|---|---|---|
| 12 | update | `docs/project/01_戦略/04_収益化戦略.md` | (a) v8 補足を追加（2026-06-11 SSOT 再編: 価格の真実源は各 noteコンテンツ計画.md・リリース計画は統合カレンダー） (b) §8 の陳腐化価格表（¥1,980 統一）を参照ポインタに置換 (c) E シリーズ表に真実源注記 (d) リンク切れ修復 ×2 |
| 13 | update | `docs/project/01_戦略/05_コンテンツロードマップ.md` | 冒頭にアーカイブバナー（現行リリース計画は統合リリースカレンダー＋各 noteコンテンツ計画.md）。リンク切れ修復 ×1 |
| 14 | — | `docs/project/01_戦略/09_note競合分析2026.md` | 変更なし（既に「判断記録・真実源は note-magazines.ts ＋各計画」と自己宣言済み） |
| 15 | update | `docs/project/04_運営/02_アフィリエイト提携状況.md` | リンク切れ修復 ×1 |
| 16 | update | `docs/project/04_運営/05_civil-affiliate-seo-expansion.md` | リンク切れ修復 ×1 |
| 17 | update | `docs/project/04_運営/07_アフィリ×note共存設計.md` | リンク切れ修復 ×1 |
| 18 | update | `docs/project/05_プロダクト/01_iOSアプリ仕様.md` | リンク切れ修復 ×1 |
| 19 | update | `docs/project/05_プロダクト/04_iOSエコシステム動線.md` | リンク切れ修復 ×2 |
| 20 | update | `docs/project/02_コンテンツ/01_記述式コンテンツ戦略.md` | リンク切れ修復 ×2 |
| 21 | update | `docs/project/02_コンテンツ/06_R8記述式予測フロー.md` | リンク切れ修復 ×2 |
| 22 | update | `docs/project/03_SNS/02_チャネル動線設計.md` | リンク切れ修復 ×4 |
| 23 | update | `docs/project/03_SNS/03_投稿カレンダー2026Q2.md` | リンク切れ修復 ×1 |

### Zone 3: docs/reference/ + CLAUDE.md

| # | action | file | 内容 |
|---|---|---|---|
| 24 | update | `docs/reference/links-hub.md` | リンク切れ修復 ×1 |
| 25 | update | `docs/reference/content-principles.md` | リンク切れ修復 ×1（Red Line 本文は不変・参照パスのみ） |
| 26 | update | `CLAUDE.md` | リファレンス索引の `docs/note/noteコンテンツ計画.md` 行を `docs/note/README.md`（試験別 SSOT 索引）へ更新。全リンク存在確認 |

### 提案のみ（実行しない）

| # | 対象 | 提案内容 | 実行しない理由 |
|---|---|---|---|
| P1 | `docs/study-notes/技術士二次_建設部門_記述式回答方針.md` | 1 ファイルだけの孤立ディレクトリ。`docs/note/技術士建設部門/` または `docs/project/02_コンテンツ/` への統合候補 | 成果物（論述メソッド本文）の可能性があり read-only 扱い。親判断待ち |
| P2 | `docs/textbook/技術士（総監）/`・`docs/textbook/コンクリート主任技師*/` | textbook 原稿群の配置は `.local/r2/posts/`（プロダクション）との関係を含め別途設計が必要 | 成果物コンテンツ本体（read-only） |
| P3 | `docs/reviews/weekly/2026-W21.md` と `2026-W21-review.md` の二重存在 | 命名規則の不統一。片方をリネームまたは統合 | 週次レビュー自動化（クラウドルーティン）の出力先仕様に依存。壊すと再発するため親判断待ち |

### 報告のみ（このエージェントは触らない領域）→ 親が後続で全件解決済み（2026-06-11）

| # | 対象 | 内容 | 状態 |
|---|---|---|---|
| R1 | `.claude/skills/social/pe-note-plan/SKILL.md` | 旧パス `docs/note/noteコンテンツ計画.md` を 5 ヶ所参照（リンク切れ）→ `技術士総監/noteコンテンツ計画.md` へ修正 | ✅ 解決（パス参照のみの修正のため skills-guide/registry の更新は不要＝カタログ項目に変化なし） |
| R2 | `.claude/skills/authoring/pe-essay-cycle/SKILL.md` | 同上 1 ヶ所 | ✅ 解決 |
| R3 | memory `project_note_a1_rewrite.md` L29 | 旧 doc 番号が現パスと不一致 | ✅ 解決（現行 SSOT パスへ更新） |
| R4 | memory `project_pe_construction_secondary.md` | 「価格は全商品¥1,980均一」が陳腐化（¥2,480〜3,980 段階価格へ改訂済み） | ✅ 解決（段階価格＋SSOTポインタへ更新） |

## 検証（2026-06-11 完了）

- [x] 各 commit 後に U+FFFD / `﹖` の grep（0 件。`docs-markdown-style.md` の � はチェック手順例示の意図的な文字＝既存）
- [x] callout タイポ check 0 件 — 走査で発見した既存違反 6 ヶ所（`[!tip]`×3 / `[!warn]`×3: 08_Kindle出版戦略・todo/annual・コンクリ主任技師_企画）も推奨 4 タイプへ正規化済み
- [x] `docs/note/noteコンテンツ計画.md` 旧パス残存 0 件（docs/・CLAUDE.md 内。.claude/skills/ 内 2 ファイルは報告のみで残置 → R1/R2）
- [x] CLAUDE.md リファレンス索引の全リンク存在確認（実パス欠落 0 件）
- [x] 新設した相対リンクの解決確認（1級・2級土木 SSOT ↔ 各サブ文書 ↔ 戦略文書）

## 実施 commit

| commit | 内容 |
|---|---|
| 715e85ee4 | manifest 作成 |
| 722bc00ea | Zone 1: docs/note（SSOT 統合・README 全面更新ほか #1〜#11） |
| 37d3be003 | Zone 2: docs/project（04 v8 注記・05 アーカイブ化・リンク修復 #12〜#23） |
| 4a429b1d3 | Zone 3: docs/reference + CLAUDE.md（#24〜#26） |
| b03b7f985 | 追加発見: callout 4 タイプ正規化（6 ヶ所） |
