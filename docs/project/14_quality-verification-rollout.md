# PDF⇔MDX 整合性検証ツールの導入と次フェーズ作業計画

**策定日**: 2026-04-14
**最終更新**: 2026-04-14（mac-only 前提で再設計・Phase A を完遂）
**対象**: doboku-note の品質検証フェーズ（A → C → B）
**実行環境**: **macOS only**。Homebrew 経由の poppler を前提とし、Windows/Xpdf/代替案は考慮しない。
**関連**:
- `13_quality-cycle-architecture.md`（品質サイクルの全体像）
- `10_keyword-duplicate-consolidation.md`（重複統合の進捗）
- `08_記述式コンテンツ執筆計画.md`（記述式コンテンツの執筆計画）

## 1. 背景

### 1.1 直前までの実装

ここ数セッションで、以下のレビュー基盤を整備した:

1. **`/review` スキル**（`.claude/skills/dev/review/SKILL.md`）── 対象ファイル種別を判定して適切なレビュースキルを自動実行する統一エントリーポイント
2. **BCP/BCM 重複統合**（Phase 1）── `business-continuity-plan` と `bcp-crisis-management` を統合済み
3. **`civil-construction-qa` サブエージェント**（`.claude/agents/civil-construction-qa.md`）── 1級土木 textbook/guide 専用 Evaluator
4. **`/verify-pdf-mdx` スキル**（`.claude/skills/content/verify-pdf-mdx/SKILL.md`）── category/group を判定して適切な検証エージェントへ振り分けるルーター
5. **`scripts/verify-pdf-mdx.mjs`** ── 決定論的前処理スクリプト（frontmatter 解析・img 抽出・テキスト網羅率計算）
6. **CLAUDE.md 改訂**:
   - 「試験別コンテンツ整備方針」セクション新設（執筆フェーズの判断基準）
   - 「コンテンツ別レビュー視点」セクション新設（レビューフェーズの視点）
   - エージェント表に `civil-construction-qa` 追記
   - スキル表に `/verify-pdf-mdx` 追記

### 1.2 残存する作業ブロック

- **A**: 新ツール `/verify-pdf-mdx` のドッグフード検証（外部依存により部分的に未完）
- **C**: Phase 2 の重複監査残件（`10_keyword-duplicate-consolidation.md` の B/C/D 系）
- **B**: コンテンツ拡充（R03 模範解答、1級土木 guide ページ改善）

本ドキュメントはこれらを **A → C → B の順** で実行する作業計画。

---

## 2. ドッグフード結果サマリ（2026-04-14 完遂）

mac-only 前提で再設計した後に 2 ターゲットで検証を実施:

### 2.1 concrete-key-points.mdx (guide モード)

| 指標 | 値 |
|---|---|
| PDF 自動発見 | `第３章_コンクリート工.pdf` （slug ヒント経由、1 発） |
| PDF ページ数 | 89 |
| OCR suspected | `true`（artifact 430 件。スキャン PDF） |
| heading_rate | 9%（OCR ノイズで不信頼、参考値） |
| **topic_rate** | **90%** ← 主指標として採用 |
| MDX text_chars | 8,036 相当 |

### 2.2 construction-mgmt-overview/article.mdx (textbook モード)

| 指標 | 値 |
|---|---|
| PDF 自動発見 | `第１章_施工管理の概要.pdf` （title キーワード経由） |
| PDF ページ数 | 6 |
| OCR suspected | `false`（デジタル PDF） |
| **heading_rate** | **100%** (4/4) ← 主指標として採用 |
| topic_rate | 80% |
| image_count | 4/4 存在 |
| 画像 natural | fig-1-1〜1-4 全て取得（1500-1900px） |

### 2.3 得られた知見

1. **OCR PDF と digital PDF を区別する必要がある**: スキャン PDF では heading ベースの coverage は使い物にならない。`pdf.ocr_suspected` フラグで切り替える設計とし、textbook/guide ともに対応。
2. **guide モードは topic_rate 80% 以上を合格ラインに**: 編集記事なので 95% coverage は意味がない。
3. **PDF 自動発見は slug ヒント + title キーワードで十分機能**: `--pdf` 明示指定は通常不要。

---

## 3. Phase A: ドッグフード検証の完遂 ✅ 完了（2026-04-14）

### A-1: Poppler の前提確認（macOS only）

macOS では `brew install poppler` で一括導入できる（mac 前提なので Xpdf 衝突や PATH 調整は不要）。

```bash
brew install poppler
pdftotext -v   # poppler 26.x+
pdfinfo -v
pdftoppm -v
```

未導入なら `scripts/verify-pdf-mdx.mjs` は exit code 3 で停止し、インストール案内を stderr に出す。

### A-2: ドッグフード実行

スクリプトは `--pdf` を省略すれば自動発見する:

```bash
# guide モード（slug ヒント経由で PDF 自動発見）
node scripts/verify-pdf-mdx.mjs .local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx

# textbook モード（title キーワードで PDF 自動発見）
node scripts/verify-pdf-mdx.mjs .local/r2/posts/civil-construction-1/textbook/construction-mgmt-overview/article.mdx

# PDF ページを PNG 化（視覚比較用、/tmp/verify-pdf-mdx/<slug>/page-N.png）
node scripts/verify-pdf-mdx.mjs <mdx> --render --dpi 150
```

結果は 2 章（本文 Section 2）にサマリを記載。

### A-3: 設計検証 — 得られた結論

1. **heading_rate は OCR 品質に依存するため主指標にはできない**: スキャン PDF だと false positive が混入し heading_rate が低く出る。
2. **topic_rate を guide モードの主指標に採用**: 冒頭 5000 字から頻出する漢字/カタカナ複合語をトピックとして抽出し、MDX 本文での出現率で測る。OCR ノイズに頑健。
3. **ルーブリック閾値の分離**:
   - textbook (OCR 無し): heading_rate ≥ 95%
   - textbook (OCR 有り): topic_rate に fallback
   - guide: topic_rate ≥ 80%（concrete-key-points 実測 90% を根拠に 80% を合格ライン）

### A-4: スクリプト実装の要点（mac-only 最適化）

- **PDF 自動発見**: `SLUG_PDF_HINTS` テーブル + title 日本語キーワード glob で `.claude/pdfs/１級土木施工管理技士/テキスト` 配下を検索
- **pdfinfo でページ数**: poppler 同梱、追加コストゼロ
- **pdftoppm で --render**: `/tmp/verify-pdf-mdx/<slug>/page-N.png` に展開、`--dpi` 指定可（デフォルト 150）
- **OCR 誤字吸収**: `卜→ト`, `Jレ→ル` 等の正規化でマッチング率を上げる
- **全角/半角正規化**: `normalizeText()` で統一
- **第N章パターン**: 改行で分離された `第\n3章` を前処理で 1 行に連結
- **N xxx パターン**: `1概 説` のような数字+日本語（ドットなし）形式を追加

### A-5: civil-construction-qa の呼び出し（次セッション対応）

ドッグフード完遂により、`civil-construction-qa` サブエージェントへ引き渡す JSON は十分な情報を含むようになった。実際の 5 軸評価はエージェントを Task ツールで呼ぶ必要があるが、これはコンテキスト消費が大きいため次セッションに回す。

### A-6: 結果に基づく調整 ✅ 完了

- `civil-construction-qa.md` Mode A/B のルーブリックを `coverage.rate` / `coverage.topic_rate` / `pdf.ocr_suspected` 対応に更新
- `civil-construction-qa.md` 制約事項を mac 前提に書き換え
- `verify-pdf-mdx` SKILL.md の Step 1 を「pdftotext 必須」化
- Step 2 出力に `pdf.ocr_suspected` フラグを追加して後段への引き渡しを強化

---

## 4. Phase C: 重複監査の残件処理

`10_keyword-duplicate-consolidation.md` で特定された残件を順次処理する。本フェーズでは **軽い順** に着手する。

### C-1: 保全性のタイトル明確化（5 分）

**問題**: 同じ日本語「保全性」が異なる英語概念で別ページに存在し、読者が混乱:

- `equipment-maintainability` (sec 2.6) ── タイトル「設備の保全性」── MTTR・設備工学
- `system-integrity` (sec 4.4) ── タイトル「保全性（Integrity）」── RASIS・データ完全性

**作業**:

1. `system-integrity/article.mdx` の frontmatter `title` を「保全性（Integrity）」→「**完全性（Integrity）**」へ変更
2. 本文のタイトル `# 保全性（Integrity）` も同様に変更
3. 内部リンクで「保全性」と書いている箇所を必要に応じて文脈で補足
4. 文字化けチェック

「完全性」を採用する理由: 文部科学省『総合技術監理 キーワード集 2025』では RASIS の I は「完全性」と訳されているケースが多く、混乱を避けられる。

### C-2: 信頼性のタイトル明確化（5 分）

**問題**: 同じ日本語「信頼性」が異なる対象で別ページに存在:

- `equipment-reliability` (sec 2.6) ── タイトル「設備の信頼性」── MTBF・バスタブカーブ
- `system-reliability` (sec 4.4) ── タイトル「信頼性（Reliability）」── RASIS・ISO 27001

**作業**:

1. `system-reliability/article.mdx` の frontmatter `title` を「信頼性（Reliability）」→「**システム信頼性（Reliability）**」へ変更
2. 本文タイトルも同様
3. 文字化けチェック

### C-3: 製造物責任の本文精査（30 分）

**問題**: `product-liability`（概念）と `product-liability-act`（法律）の本文重複疑い

**作業**:

1. 両 MDX を Read で全文確認
2. 重複している段落を特定
3. 棲み分け方針を決定:
   - 概念ページは「PL とは何か / 国際的な動向 / 実務対応」
   - 法律ページは「PL 法の条文 / 適用範囲 / 判例 / 免責事由」
4. 重複箇所をどちらかに寄せる
5. 相互リンクを明確化

### C-4: 障害者雇用の本文精査（30 分）

**問題**: `disability-employment`（概念）と `disability-employment-act`（法律）の重複疑い

**作業**: C-3 と同じ手順。

### C-5: メンタルヘルスの精査（30 分）

**問題**: `mental-health` (5.3 労働衛生) と `mental-health-care` (3.2 人的資源管理) の重複疑い

**作業**:

1. 両 MDX を全文 Read
2. 4 つのケア（セルフ・ライン・事業場内・事業場外）の解説が完全に同文か確認
3. 完全重複なら一方に統合
4. 異なる視点なら棲み分けを明示（労働衛生視点 vs 人事施策視点）

### C 全体の検証

- `/review` を統合後の各ページに実行して HIGH 違反ゼロを確認
- `npm run build` がエラーなく通ることを確認

---

## 5. Phase B: コンテンツ拡充

Phase A/C 完了後、本業のコンテンツ拡充に戻る。

### B-1: R03 模範解答の追加（最優先）

**現状**: 直近 7 年（R01〜R07）のうち、唯一 R03 だけが模範論文例を持っていない。

**作業**:

1. `test.md` に R03 の模範解答を準備（ユーザ作業 or 既存ソースから引用）
2. `.local/r2/posts/pe-comprehensive-management/r03-secondary/article.mdx` に並列 H2 で「模範論文例」セクションを追加
3. 既存の R01/R02/R04/R05/R06/R07 と同じ並列 H2 + `<details>` 構造を踏襲
4. 文字化けチェック

これで R01〜R07 の 7 年分が完備し、サイト価値の連続性が確保される。

### B-2: 1級土木 guide ページの改善

`concrete-key-points.mdx` をはじめ、guide 系ページは画像ゼロ + 過去問バックリンクが弱い。Phase A で動作確認した `civil-construction-qa` (guide mode) の結果に基づき、以下を改善:

- 出題頻度表の整備（過去問データから根拠を明示）
- 主要トピックごとの過去問バックリンク追加
- 重要箇所への図の追加（必要なら教科書 PDF から抽出）
- モバイル視認性の確認

対象ファイル:

- `.local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx`
- `.local/r2/posts/civil-construction-1/guide/earthwork-key-points.mdx`
- `.local/r2/posts/civil-construction-1/guide/law-key-points.mdx`
- `.local/r2/posts/civil-construction-1/guide/four-management.mdx`
- `.local/r2/posts/civil-construction-1/guide/strategy.mdx`
- `.local/r2/posts/civil-construction-1/guide/concrete-maintenance.mdx`

### B-3: 頻出テーマ記事（`08_記述式コンテンツ執筆計画.md` Q2-A-8）

総監向けの頻出テーマ記事 5 本（最優先分）:

1. BCP × 5 管理
2. DX × 5 管理
3. 少子高齢化 × 5 管理
4. インフラ老朽化 × 5 管理
5. 働き方改革 × 5 管理

各 3,500 字程度。`08_記述式コンテンツ執筆計画.md` の詳細を参照。

### B-4: Guide 5（5管理統合の書き方）の執筆

`08_記述式コンテンツ執筆計画.md` の Q2-A-7 で計画している論文の書き方ガイドの最優先記事。

---

## 6. 進行管理と判断ポイント

### 6.1 各 Phase 完了の定義

| Phase | 完了条件 |
|---|---|
| **A** | `/verify-pdf-mdx` が concrete-key-points と construction-mgmt-overview の両方で意味のあるレポートを返す。ルーブリック閾値が実情に合わせて調整済み |
| **C** | 5 件の重複ペアすべてが解決済み（タイトル変更 or 統合 or 棲み分け明文化）。`/review` で HIGH 違反なし、`npm run build` 成功 |
| **B** | R03 模範解答 + 1級土木 guide 6 ページ + 頻出テーマ記事 5 本 + Guide 5 が公開済み |

### 6.2 Phase 間の依存関係

- **A** は Poppler 導入待ち。ユーザ作業のため並行実行可
- **C** は Poppler 不要、即着手可能（B-1/B-2 のみ）。C-3〜C-5 は本文精査が必要なので Phase A で `/review` がしっかり動くようになってから着手すると効率的
- **B** は A/C の知見を活かして実施するのが理想だが、B-1（R03 模範解答）は独立タスクなので並行可能

### 6.3 中断・中止の判断

以下の場合は計画を見直す:

- Poppler 導入で別の依存問題が発覚した場合（A-1 で中止 → 代替手段を検討）
- ドッグフードでルーブリック設計の根本的な欠陥が見つかった場合（A-3 で `civil-construction-qa.md` の大幅改訂）
- C 系の精査で「実は重複じゃなかった」と判明した場合（個別判断）

### 6.4 進捗の記録方法

各 Phase の完了時に以下を更新:

- 本ドキュメント（`14_quality-verification-rollout.md`）の各セクション末尾に「**完了 yyyy-mm-dd**」を追記
- `08_記述式コンテンツ執筆計画.md` の Phase 1 タスク表（B-1/B-2 の進捗）
- `10_keyword-duplicate-consolidation.md` の Phase 2 タスク表（C-1〜C-5 の進捗）

---

## 7. 推奨する進め方（2026-04-14 更新・mac 前提）

1. ~~**A の Poppler 導入**~~ → **完了**（mac 前提で `brew install poppler` のみ、今後の検証も同じ）
2. ~~**A-2〜A-6 のドッグフード**~~ → **完了**（2 ターゲットで実測、ルーブリック閾値調整も実施）
3. **C-1/C-2（タイトル明確化）に着手** ── 各 5 分の軽作業（system-integrity / system-reliability）
4. **C-3〜C-5（本文精査）に進む** ── 各 30 分（product-liability / disability-employment / mental-health）
5. **A-5 civil-construction-qa 実呼び出し** ── 次セッションで Task ツール経由で実行（コンテキスト消費大のため分離）
6. **B（コンテンツ拡充）に戻る** ── R03 → 1級土木 guide → 頻出テーマ記事

---

## 8. 関連ファイル一覧

### 8.1 本フェーズで作成・修正したファイル

**新設**:
- `.claude/agents/civil-construction-qa.md`
- `.claude/skills/content/verify-pdf-mdx/SKILL.md`
- `.claude/skills/dev/review/SKILL.md`（少し前に新設）
- `scripts/verify-pdf-mdx.mjs`
- `docs/project/14_quality-verification-rollout.md`（本ドキュメント）

**更新**:
- `CLAUDE.md`（試験別コンテンツ整備方針 / コンテンツ別レビュー視点 / エージェント表 / スキル表）
- `.claude/skills/content/civil-construction-1-pdf-to-mdx/SKILL.md`（Phase 5 追加）

**削除**:
- `.claude/skills/management/review-router/`（stale なテンプレート）
- `.local/r2/posts/pe-comprehensive-management/bcp-crisis-management/`（BCP 統合により削除）

### 8.2 参照すべき既存ドキュメント

- `CLAUDE.md` ── ハーネス設計原則、エージェント連携
- `08_記述式コンテンツ執筆計画.md` ── Phase B のコンテンツ拡充計画
- `10_keyword-duplicate-consolidation.md` ── Phase C の重複監査リスト
- `13_quality-cycle-architecture.md` ── 品質サイクル全体像
- `.claude/content-principles.md` ── コンテンツ作成原則

---

## 9. 補足: mac-only 前提で削除した事項（履歴）

本ドキュメントは 2026-04-14 の再設計で **macOS only** 前提に統合された。以下の旧セクションは不要として削除:

- **旧 A-1 Poppler 導入手順（Windows/Scoop/Chocolatey 版）** — mac では `brew install poppler` 1 コマンドで済むため不要
- **旧 2.2 ボトルネック（Xpdf Mingw64）** — 2.1/2.2/2.3 の発見記録は Section 2 のサマリに集約
- **旧 9 代替案 (A: pdfjs-dist / B: Xpdf 言語パック / C: ImageMagick + Tesseract)** — mac 前提なら poppler が常に使えるため代替案は考慮しない
- **Windows パス pathlib / PATH 順序調整** — mac では不要

mac 以外の環境で動かす必要が発生した場合は、このドキュメントとは別に環境差分ドキュメントを立てる。

---

**完了判定**: 本ドキュメントは作業計画書であり、各 Phase の進捗に応じて随時更新する。Phase A は 2026-04-14 完了。
