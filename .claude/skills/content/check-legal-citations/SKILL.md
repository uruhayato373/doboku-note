---
name: check-legal-citations
description: >
  MDX 本文中の法令条文が e-Gov 法令検索へのインラインリンクになっているか検査し、
  必要に応じて一斉修正する。lint-mdx-mobile.mjs のルール 8-2 と
  fix-legal-citations.mjs の薄いラッパー。
  Use when user asks to [法令リンク チェック, e-Gov リンク, /check-legal-citations, 法令引用監査].
user-invocable: true
---

**実行環境**: macOS only（`fix-legal-citations.mjs` は Homebrew 前提のパス解決に移行済み）。

MDX 本文中で「〇〇法第◯条」のように法令条文を引用している箇所について、e-Gov 法令検索の該当条文へのインラインリンクを付与することを強制する。機械検出は `lint-mdx-mobile.mjs` のルール 8-2 が、自動修正は `.claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs` が担う。

## なぜこのスキルがあるのか

`keyword-page` SKILL.md には「本文中で法律の条文に言及する場合、e-Gov 法令検索の該当条文へのアンカーリンクを付与する」というルールがあるが、機械チェック・自動修正・設計判断（特に枝番条文の扱い）が散在していた。このスキルはそれらを 1 つの入口にまとめる。

## 検査対象 URL 形式

```
https://laws.e-gov.go.jp/law/{法令番号}#Mp-At_{条番号}
```

例: 労働基準法 第36条 → `https://laws.e-gov.go.jp/law/322AC0000000049#Mp-At_36`

**法令番号の根拠**: `.claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs` の `LAW_ID_MAP` に登録されている法令のみ自動リンク化可能。2026-04-13 時点で 31 件の base URL を HTTP 200 で検証済み（e-Gov は SPA のため curl では内部 anchor が見えないが、ブラウザでは正しく遷移することを確認）。

## 枝番条文の扱い（重要な設計判断）

「第38条の3」のような **枝番付き条文は独立した別条文** であり、第38条への `#Mp-At_38` リンクは誤り。

**方針: 枝番付き条文には e-Gov リンクを付けない**。太字のみに留める。

**根拠**: e-Gov の枝番アンカー形式（`#Mp-At_38_3` 等）が公式に確定していない。将来 e-Gov 側で仕様が確定した時点で再評価する。

**実装**:
- `lint-mdx-mobile.mjs` ルール 8-2: 枝番パターン `第◯条の◯` を negative lookahead で検出対象外
- `fix-legal-citations.mjs`: 同様に枝番パターンをスキップ

**警告**: このルールを知らずに「第38条の3 → e-Gov リンク化」を試みると、誤ったアンカーを大量生成する恐れあり。必ず本 skill と上記 2 スクリプトのロジックを確認してから手動修正すること。

## 引数

```
/check-legal-citations <file or dir>   # 検査のみ（lint のラッパー）
/check-legal-citations --fix --dry-run  # 自動修正の diff プレビュー
/check-legal-citations --fix --apply    # 実ファイル書き換え
/check-legal-citations --fix --file <p> # 単一ファイル
```

## 検査項目（ルール 8-2）

| 重大度 | コード | 内容 |
|---|---|---|
| **LOW** | `8-2` | 法令条文「〇〇法第◯条」が e-Gov リンクになっていない |

**重大度が LOW である理由**: 法令リンクは SEO/読者体験の改善要素だが、コンテンツの正しさには直接影響しないため。HIGH/MEDIUM には昇格しない。

## 実行手順

### Step 1: 検査モード

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | grep "8-2"
```

残 LOW 8-2 の件数が現状。2026-04-13 時点では 179 件 → 自動修正で 53 件 → 枝番誤リンク剥離で 39 件まで削減済み。

### Step 2: 自動修正（dry-run）

```bash
node .claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs --dry-run
```

変換候補を diff 形式で確認。同一ファイル内で「初出のみリンク」ルールで動くため、2 回目以降の言及はスキップされる。

### Step 3: 自動修正の適用

```bash
node .claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs --apply
```

バックアップは `/tmp/fix-legal-citations-backup/` に自動保存される（macOS パス）。

### Step 4: 適用後の再検査

```bash
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/ 2>&1 | grep "8-2" | wc -l
```

### Step 5: 残件の手動対応

自動修正では処理できない以下のパターンは手動で対応する:

| パターン | 理由 | 対応方針 |
|---|---|---|
| **「同法第◯条」** | 前出参照、文脈追跡が必要 | 手動で `[**{法令名}第◯条**](url)` に書き換え |
| **「法令名<全角スペース>第◯条」** | スクリプトの正規表現が現状拾えない | 半角スペースに統一してから再実行 or 手動対応 |
| **2 回目以降の再出** | 初出のみリンクルールで意図的にスキップ | 読者体験上必要なら手動でリンク追加 |
| **`LAW_ID_MAP` 未登録の法律** | 法令番号が辞書にない | `fix-legal-citations.mjs` の `LAW_ID_MAP` に追加してから再実行 |

### Step 6: `LAW_ID_MAP` の拡充

新しい法律を扱うときは `.claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs` の `LAW_ID_MAP` に `'{法令名}': '{法令番号}'` を追加する。法令番号は e-Gov で該当法令を開き URL の `law/{番号}` 部分から取得。

## 担当外

- **枝番付き条文への e-Gov リンク付与**: 上記「枝番条文の扱い」参照。明示的に禁止
- **外部法律データベース**（e-Gov 以外）へのリンク: スコープ外
- **告示・通達・ガイドライン** の参照: 法令条文と別の扱い、本 skill は対象外
- **判例へのリンク**: 裁判所サイト等への別系統、本 skill は対象外

## 連携スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`scripts/lint-mdx-mobile.mjs`** ルール 8-2 | 機械検出ロジック本体 |
| **`.claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs`** | 自動修正ロジック本体、`LAW_ID_MAP` の真実源 |
| **`.claude/skills/content/keyword-page/SKILL.md`** L121-127 | 「法令条文には e-Gov リンク」の原則を明記 |
| **`.claude/skills/content/review-mobile/SKILL.md`** | モバイル視認性の一環として 8-2 も検出 |

## 使い方の例

```bash
# 全件検査
/check-legal-citations .local/r2/posts/pe-comprehensive-management/

# 単一ファイル修正プレビュー
/check-legal-citations --fix --file .local/r2/posts/pe-comprehensive-management/labor-standards-act/article.mdx --dry-run

# 全体一斉修正（要確認）
/check-legal-citations --fix --apply
```

## 参照

- `.claude/skills/content/check-legal-citations/scripts/fix-legal-citations.mjs` ── 自動修正実装（`LAW_ID_MAP` と枝番スキップロジックの真実源）
- `scripts/lint-mdx-mobile.mjs` L255-281 ── ルール 8-2 実装
- `scripts/lib/mdx-io.mjs` ── CRLF 保持 I/O
- [note: e-Gov URL 形式の法曹実務解説](https://note.com/lovely_moose206/n/n99fea17e4db8) ── `#Mp-At_{条番号}` の根拠

## 履歴（2026-04-13 時点の一斉移行）

- 初期: 179 件の LOW 8-2 違反
- 手動対応（7 件）: unfair-trade-practices, portrait-publicity-privacy 他
- `fix-legal-citations.mjs` 一斉適用: 122 edits / 50 files → 53 件まで削減
- 枝番誤リンク剥離（17 件）: `第◯条の◯` パターンを太字のみに
- 残 **39 件**（Step 5 の手動対応必要なパターン）

この履歴は doc 11 から移管。以後の進捗は `lint-mdx-mobile.mjs` の違反数で追跡する。
