# PDF⇔MDX 整合性検証ツールの導入と次フェーズ作業計画

**策定日**: 2026-04-14
**対象**: doboku-note の品質検証フェーズ（A → C → B）
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

## 2. ドッグフードで判明した状況（重要）

`/verify-pdf-mdx` を `concrete-key-points.mdx` で初回実行した結果、以下が判明:

### 2.1 動作した部分（収穫）

`scripts/verify-pdf-mdx.mjs` 本体は正常動作:

- frontmatter 解析 OK（`category=civil-construction-1`, `group=guide`）
- 見出し抽出 OK（49 件）
- 表カウント OK（23 件）
- テキスト文字数 OK（8,036 字）
- `<img>` 抽出 OK（concrete-key-points は画像ゼロという正しい結果）
- 数式カウント OK（0 件）

### 2.2 ボトルネック

PATH にある `pdftotext` は **Xpdf 4.00 製**（Mingw64 経由でインストール）で、Adobe-Japan1 文字集合に対応していないため日本語 PDF が読めない:

```
Syntax Error: Unknown character collection 'Adobe-Japan1'
Syntax Error: Couldn't find '90ms-RKSJ-H' CMap file
Syntax Error: Failed to parse font object for 'MSGothic'
```

結果として `/verify-pdf-mdx` の Step 7（テキスト網羅率計算）と Step 4（PDF ページ画像化、pdftoppm）が事実上機能しない。

### 2.3 解決方法

**Poppler 系ユーティリティ** をインストールすれば、両ツール（`pdftotext` + `pdftoppm`）が一括で導入され、日本語 PDF も標準で扱える。

---

## 3. Phase A: ドッグフード検証の完遂

### A-1: Poppler 導入（ユーザ作業）

以下のいずれかで導入する:

```powershell
# 推奨: Scoop の場合
scoop install poppler

# Chocolatey の場合
choco install poppler
```

導入後、新しいターミナルで以下が成功することを確認:

```bash
pdftotext -v   # version 22.x or later (poppler) と表示されること
pdftoppm -v
which pdftotext  # /c/.../poppler/.../pdftotext.exe を指していること
```

**注意点**: Mingw64 経由で入っている Xpdf 製 `pdftotext` が PATH の優先順位で先に来ている可能性がある。`which pdftotext` の出力を確認し、Xpdf 由来なら PATH 順序を調整するか、Mingw64 版を退避させる。

### A-2: 再ドッグフード（assistant 作業）

Poppler 導入後、以下を実行:

```bash
# 1. 直接実行で日本語抽出を確認
pdftotext -layout ".claude/pdfs/１級土木施工管理技士/テキスト（土木一般編）/第３章_コンクリート工.pdf" - | head -50

# 2. スクリプトで前処理
node scripts/verify-pdf-mdx.mjs \
  .local/r2/posts/civil-construction-1/guide/concrete-key-points.mdx \
  --pdf ".claude/pdfs/１級土木施工管理技士/テキスト（土木一般編）/第３章_コンクリート工.pdf" \
  > C:/tmp/verify-result.json

# 3. JSON 結果を確認（heading_count と coverage が正常に計算されているか）
```

期待される結果:

- `pdf.heading_count > 0`
- `pdf.text_chars` が数千〜数万に増加
- `coverage.rate` が 0.X の数値で出る
- `coverage.missing` に PDF にあって MDX にない章節がリストされる

### A-3: 設計検証（assistant 作業）

ドッグフード結果から以下を判定:

1. **網羅率の閾値（95%）が妥当か**
   - guide ページは編集記事なので 95% は厳しすぎる可能性
   - 実測値を見て、guide モードの閾値を 60-70% 程度に緩和することを検討
2. **見出しマッチングロジックの精度**
   - PDF 側の見出しが「`第3章 コンクリート工`」「`3.1 セメント`」のような形式で抽出できているか
   - MDX 側の見出しと文字列ベースで対応付けられているか
   - 部分一致が False Negative を起こしていないか
3. **スクリプト出力 JSON のスキーマが civil-construction-qa の入力として十分か**
   - 不足があれば `verify-pdf-mdx.mjs` を改訂

### A-4: 第2のターゲットでの検証（assistant 作業）

textbook モードでも検証する:

```bash
node scripts/verify-pdf-mdx.mjs \
  .local/r2/posts/civil-construction-1/textbook/construction-mgmt-overview/article.mdx \
  --pdf ".claude/pdfs/１級土木施工管理技士/テキスト（施工管理・法規編）/第１章_施工管理.pdf"
```

期待される結果:
- `image_count = 4`（fig-1-1〜fig-1-4 が抽出される）
- `image_missing = 0`
- `naturalWidth/Height` が各画像で取得されている

### A-5: civil-construction-qa の手動呼び出し（assistant 作業）

スクリプトで JSON が取れたら、`civil-construction-qa` サブエージェントを `Task` ツールで呼び出して 5 軸ルーブリック評価を実行。

サブエージェントが Playwright MCP を使って:
- `http://localhost:3020/docs/civil-construction-1-textbook-construction-mgmt-overview` を開く
- Desktop / Mobile スクショを取得
- 各 `<img>` の natural/display 寸法を取得
- 視覚一致サンプルを 3 件実行
- 5 軸スコアと指摘事項リストを返す

### A-6: 結果に基づく調整（assistant 作業）

ドッグフードで発見した問題を修正:

- ルーブリックの閾値調整（textbook 95% / guide 60% など）
- スクリプトのバグ修正
- サブエージェント定義の workflow 修正
- 必要なら `civil-construction-qa.md` の出力フォーマット改訂

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

## 7. 推奨する進め方（合意済み）

1. **A の Poppler 導入はユーザ作業**として並行実施
2. **その間に C の B-1/B-2（タイトル明確化）に着手** ── 5〜10 分で完了する軽作業
3. **Poppler 導入後に A を再開** ── ドッグフード検証を完遂し、ルーブリック調整
4. **C の残件（C-3〜C-5）に進む** ── 本文精査
5. **B（コンテンツ拡充）に戻る** ── R03 → 1級土木 guide → 頻出テーマ記事

各ステップで詰まったら本ドキュメントを再読して状況を整理する。

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

## 9. 補足: 視覚比較の代替案（Poppler が入らない場合）

万一 Poppler が導入できない場合の代替手段:

### 代替案 A: PDF.js + Node ベースの抽出

`pdfjs-dist` を使って Node から直接 PDF を読む:

```bash
npm install --save-dev pdfjs-dist
```

`scripts/verify-pdf-mdx.mjs` を改訂し、`pdftotext` の代わりに `pdfjs-dist` で全文抽出する。日本語フォントへの依存が少なく、Mingw64 環境でも動くはず。

### 代替案 B: Xpdf 日本語サポートパックの導入

Xpdf-Japanese 言語パック（CMaps）をダウンロードして Xpdf のインストールパスに展開:

- https://www.xpdfreader.com/download.html → Xpdf language support packages
- 設定ファイル `xpdfrc` で `cidToUnicode` `unicodeMap` `cMapDir` を指定

ただし設定が煩雑で、CI で再現するのが難しい。

### 代替案 C: ImageMagick + Tesseract OCR

PDF を ImageMagick で PNG に変換し、Tesseract 日本語 OCR でテキスト抽出:

```bash
magick convert -density 300 input.pdf input-%d.png
tesseract input-1.png stdout -l jpn
```

精度は劣るが、外部依存は確保できる。

**推奨は Poppler。代替案は Poppler が入らないことが確定した場合のみ検討する。**

---

**完了判定**: 本ドキュメントは作業計画書であり、各 Phase の進捗に応じて随時更新する。
