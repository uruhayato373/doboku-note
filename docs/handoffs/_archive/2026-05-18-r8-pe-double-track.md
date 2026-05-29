---
title: 2026-05-18 総監記述式 R8 対策コンテンツ ダブル展開セッション
date: 2026-05-18
session_focus: サイト（無料）と note（有料）の役割分離を完全分業化、R8 受験者の「サイトでテーマ俯瞰 → キーワード学習 → M3 マガジン購入」直線動線を確立
related_strategy: docs/note/noteコンテンツ計画.md
related_plan: ~/.claude/plans/doboku-note-note-fancy-hedgehog.md
---

# 2026-05-18 セッション引き継ぎ

## 何が起きたか（1 行）

総監記述式 R8 対策コンテンツについて、ユーザーの「essay-data-2026 価値薄」「5 管理縦割りは総監らしくない」「primary-statistics-2026 不要では」等の本質的指摘を受け、サイト = 集客装置・テーマ駆動 / note = 有料商品の役割分離を 4 Phase で再設計し、新規 2 ピラー + 既存 11 ピラー + 4 note 記事の構造改修と相互動線設計を完遂した。

## 本セッションの commit（時系列）

### Phase 1: 既存補強（commit 8cdf9eda1）
- `essay-exam-strategy` 過去 17 年テーマ表に「背景」列追加（書籍 OCR 不使用、年代区分別箇条書き、自前白書要約）
- `essay-data-2026` 冒頭に M1 マガジン CTA 追加（素材データ → 戦略書の分業を明示）
- `mlit-whitepaper-2025` / `whitepaper-study-map` / `management-tradeoffs` の相互リンク強化

### Phase 2: 新規ピラー投下（commit 7e1ea0801, 878581cd1）
- 新規 `r8-essay-keyword-forecast/article.mdx`（guide_order: 7, 文体ですます調）
- 当初は 5 管理縦割りカタログ × 26 KW 構造で作成
- 副 commit: bold-render 11 件 + tag allowlist 修正

### Phase 2.5: last-minute-2026 連動（commit bfe04c17e）
- `last-minute-2026` の 6 思考パターンそれぞれに R8 候補 KW を併記（全 26 KW がいずれかのパターンに登場、孤立 KW ゼロ）
- 9 週スケジュールを表 → 箇条書きに変換、重点 KW・過去問動線を具体化
- 双方向リンク（r8-essay-keyword-forecast ↔ last-minute-2026）確立

### primary-statistics-2026 集約（commit 9fb171da4 に並行エージェント commit で巻き込まれ）
- primary-statistics-2026 を `published: false` で unpublish（unpublishedReason 明記）
- 択一 280 問 × χ² 検定の完全データセットを M1 マガジン第 5-2.5 章に内蔵
- magazine-placement.ts から primary-statistics-2026 ルール削除、essay-template-3d のリンク削除

### Phase 2.6-2.8: テーマ駆動再構築（commit 5fcbd281c）— 最重要
- `r8-essay-keyword-forecast` を 5 管理縦割り → **R8 候補テーマ 6 本のテーマ駆動構造**に大改修
- essay-mlit-\* 7 本の「過去問適用パスポート」直後に r8-essay-keyword-forecast への逆方向リンク追加
- note 無料 2 本（r8予想問題-気候変動適応 / 資源循環サプライチェーン）の関連記事先頭に俯瞰ハブリンク追加

### 補助: whitepaper-study-map RelatedKeywords 分散（commit cbf5b1b05）
- 5 セクション分散配置 + 404 修正

## なぜ大改修したのか（設計理由）

### ユーザー指摘の核心

> 「5 管理という項目で構成するのは違和感がある。総監は、テーマについて 5 管理の視点トレードオフでどう解決するか、という試験のはず」

### Plan agent 検証で判明した問題

1. **r8-essay-keyword-forecast 旧構造（5 管理縦割り × 26 KW カタログ）は keyword-2026（公式キーワード集ハブ）と機能重複**
2. **essay-mlit-\* 7 本が既に「テーマ駆動 → 白書根拠 → 5 管理対立構造 → 解決フレーム → 過去問適用パスポート → 論文 4 ステップ」の均質構造を持っており、これが総監の本質を表現する正解構造**
3. 旧構造は「総監らしさ」を表現できていなかった

### 新構造の核

- **テーマ駆動 6 本**（主役 3 + リンク中心 3）を主役に据える
- 各テーマブロックで「主軸 5 管理ペア／副 5 管理／関連 KW／適用パターン／サイト深掘り／関連白書／note 予想問題」を集約
- 旧 5 管理縦割りは「5 管理視点での逆引き」として末尾に大幅圧縮（60 行 → 25 行、SEO 受け皿として残存）

### R8 候補テーマ 6 本（重点度・主軸・サイト深掘り）

| ID | テーマ | 重点度 | 主軸 5 管理 | サイト深掘り |
|---|---|---|---|---|
| A | 気候変動適応 × グリーンインフラ | 高 | 安 × 社 | essay-mlit-river-basin-management |
| B | 資源循環 × サプライチェーン強靭化 | 高 | 経 × 社 | essay-mlit-construction-2024 + green-transformation |
| C | 少子高齢化深化 × 外国人材 × 組織変革 | 高 | 人 × 安 + 人 × 経 | essay-mlit-foreign-workers + construction-2024 |
| D | インフラ老朽化 × 予防保全 × 群マネ | 中 | 経 × 安 | essay-mlit-aging-infrastructure + group-mgmt |
| E | GX 実装の組織課題 | 中 | 経 × 社 | essay-mlit-green-transformation |
| F | i-Construction 2.0 × 生成 AI × 知識管理 | 中 | 経 × 情 | essay-mlit-i-construction-2 |

## サイト/note 役割分離（決定版・厳守）

| 項目 | サイト（無料） | note 有料 |
|---|---|---|
| 候補テーマ俯瞰（6 本） | ✅ r8-essay-keyword-forecast | — |
| テーマ別 5 管理対立構造 | ✅ essay-mlit-\* 7 本 | — |
| 候補 KW 解説 | ✅ 各 KW ページ | — |
| 適用パターン（型） | ✅ last-minute-2026 | — |
| 直前期スケジュール | ✅ last-minute-2026 9 週 | — |
| R8 予測スコア（X.X/10） | ❌ | ✅ M3 第 1 章（差別化） |
| 予想問題本文 | ❌ | ✅ M3 + 無料 2 本 |
| 模範解答骨子（4 ペルソナ） | ❌ | ✅ M3 専属 |
| M3「5 大トレードオフ型」固有名 | ❌ | ✅ M3 専属（経×人型 等） |

## Red Line 遵守確認（grep ベース）

- ✅ M3 マガジン「5 大トレードオフ型」固有名（経×人型 / 情×人型 / 情×経型 / 効率×安全型 / 経×社環型）→ サイトに不在
- ✅ 数値スコア（X.X/10）→ サイトに不在
- ✅ 予想問題本文・完全な論文骨子 → サイトに新規追加なし
- ✅ essay-mlit-\* 7 本すべてに r8-essay-keyword-forecast への逆方向リンク（各 1 個、合計 7 個）
- ✅ note 無料 2 本に r8-essay-keyword-forecast への俯瞰リンク

## 並行エージェント問題（学んだこと）

複数回、autonomous loop の Obsidian callout 適用 commit に私の staged 変更が巻き込まれて一括コミットされる事象が発生（commit 9fb171da4 がその実例）。

**対策**:
- ステージング後即 commit を励行
- Edit → CRLF 正規化 → lint → refresh-indexes → 明示 stage → 即 commit を連続実行
- 想定外ファイルを git checkout で復元しない（CLAUDE.md feedback_parallel_agent_git に準拠）

## 残作業（後続フェーズ）

### Phase 3（試験前最終週、2026 年 6 月最終週、1 日）— 動線最終化

- `mlit-whitepaper-2025` / `essay-exam-strategy` / `management-tradeoffs` 末尾に新規 2 ピラー（r8-essay-keyword-forecast / whitepaper-study-map）への `<SeeAlso>` 追加
- `r8-essay-keyword-forecast` の M3 マガジン CTA 文言を最終調整（M3 公開後の URL 確定後）
- M1 マガジン公開後、essay-data-2026 の CTA を「公開予定」→「公開中」に書き換え

### Phase 4（試験後、2026-07 下旬〜8 月、1-2 日）— 振り返り

- R8 で実際に出題されたテーマと予測の照合を r8-essay-keyword-forecast に追記
- 的中/不的中の評価（テーマ A〜F のうち何本が当たったか、トレードオフ軸の予測精度）
- 来年度版（R9）対応の判断 — 維持 / 更新 / 廃止
- noteコンテンツ計画.md に振り返り結果を反映

### 中長期: テーマ駆動構造の他資格展開

1 級土木施工管理技士・他資格でも「テーマ × 専門知識のトレードオフ」を問う試験では同じ構造（テーマ駆動ハブ + テーマ別深掘りページ）が有効。本セッションのテンプレートが他資格にも転用可能。

## 関連プラン

- `~/.claude/plans/doboku-note-note-fancy-hedgehog.md` — 全 Phase の設計詳細（Phase 1 / 2 / 2.5 / 2.6 / 2.7 / 2.8 / 2.9 / 3 / 4）

## 関連ドキュメント

- [noteコンテンツ計画.md](../note/noteコンテンツ計画.md) — R8 ダブル展開ハブ更新済（2026-05-18 セクション）
- [content-principles.md](../reference/content-principles.md) — §17 散文中心 / §14-b bold-render 制約
- [whitepaper-study-map](../../.local/r2/posts/pe-comprehensive-management/whitepaper-study-map/article.mdx)（2026-05-18 新設、28 白書俯瞰）
- [r8-essay-keyword-forecast](../../.local/r2/posts/pe-comprehensive-management/r8-essay-keyword-forecast/article.mdx)（2026-05-18 新設・同日 v2 構造改修）
