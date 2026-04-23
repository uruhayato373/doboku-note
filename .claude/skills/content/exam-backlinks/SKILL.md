---
name: exam-backlinks
description: >
  過去問⇔キーワードの紐付け状態の確認・再生成・品質改善。カバー率レポート、JSON再ビルド、年度別エンリッチメント、品質検証を提供。
  Use when user asks to [過去問 キーワード 紐付け, exam backlinks, バックリンク確認, /exam-backlinks, カバー率, キーワード充実化].
---

## 用途

過去問MDX内の `<RelatedKeywords>` コンポーネントと、キーワードページを双方向に紐付けるシステムの保守・品質改善を行うスキル。以下のサブコマンドを提供する:

- `check` — カバー率レポートとギャップ分析
- `rebuild` — JSON再生成
- `enrich {year}` — 指定年度のサブエージェント処理
- `verify {slug}` — 特定キーワードの紐付け検証
- `keyword-relations build` — キーワード⇔キーワード関連 JSON 生成
- `keyword-relations insert` — 生成 JSON を MDX へバッチ挿入

## システム概要

### データフロー

```
過去問MDX (.local/r2/posts/pe-comprehensive-management/{year}-primary/article.mdx)
  └ <RelatedKeywords items={[{ slug: "xxx" }]} /> （設問ごと）
     ↓
.claude/skills/content/exam-backlinks/scripts/build-exam-backlinks.mjs （解析）
     ↓
src/config/past-exam-backlinks.json    （キーワード→過去問 逆引き）
src/config/exam-question-keywords.json （過去問→キーワード 正引き）
     ↓
src/components/ui/PastExamBacklinks/  （キーワードページで表示）
src/components/ui/KeywordsInExam/     （過去問ページで表示）
```

### 実行タイミング

- **本番ビルド時**: `npm run build` に含まれるため、デプロイ時は自動で最新化される
- **開発中**: `predev` からは除外済み（dev 起動を高速化）。過去問 MDX を更新したら手動で実行:

```bash
npm run build-backlinks
git add src/config/past-exam-backlinks.json src/config/exam-question-keywords.json
git commit -m "content: 過去問バックリンク再生成"
```

- **一括再生成**: 全静的インデックスをまとめて再生成する場合は `npm run refresh-indexes`

## サブコマンド

### Step 1: `check` — カバー率レポート

引数なしで呼ばれた場合、または `check` サブコマンドが指定された場合:

```bash
node -e "
const backlinks = require('./src/config/past-exam-backlinks.json');
const peChapters = require('./src/config/pe-chapters.json');

const allKeywords = new Set();
for (const ch of peChapters.chapters) {
  for (const sec of ch.sections) {
    for (const kw of sec.keywords || []) allKeywords.add(kw.slug);
  }
}

const referenced = Object.keys(backlinks).filter(k => allKeywords.has(k));
const unreferenced = [...allKeywords].filter(k => !backlinks[k]);

console.log('=== カバー率 ===');
console.log('Total keywords:', allKeywords.size);
console.log('Referenced:', referenced.length, '(' + (referenced.length/allKeywords.size*100).toFixed(1) + '%)');
console.log('Unreferenced:', unreferenced.length);
console.log('');
console.log('=== 未参照キーワード（最初の20件）===');
unreferenced.slice(0, 20).forEach(k => console.log('  -', k));
"
```

次に、`exam-question-keywords.json` から紐付けが薄い設問を抽出:

```bash
node -e "
const qk = require('./src/config/exam-question-keywords.json');
const weak = [];
for (const [exam, questions] of Object.entries(qk)) {
  for (const [anchor, data] of Object.entries(questions)) {
    if (data.slugs.length < 2) weak.push(\`\${exam} \${data.heading}: \${data.slugs.length} keywords\`);
  }
}
console.log('=== 紐付け薄い設問（1件以下、最初の20件）===');
weak.slice(0, 20).forEach(w => console.log('  -', w));
console.log('Total weak questions:', weak.length);
"
```

### Step 2: `rebuild` — JSON再生成

```bash
npm run build-backlinks
```

### Step 3: `enrich {year}` — サブエージェントで充実化

`{year}` は `r01`, `r07`, `h21`, `h30` などの形式。

1. 対象ファイルを確認: `.local/r2/posts/pe-comprehensive-management/{year}-primary/article.mdx`
2. サブエージェント（`general-purpose`）を dispatch する
3. 下記の**標準エンリッチメントプロンプト**を使用
4. 完了後に `rebuild` を実行してJSON再生成

#### 標準エンリッチメントプロンプト（テンプレート）

```
技術士総監部門の過去問MDXに `<RelatedKeywords>` を追加する作業です。

## 対象ファイル
`/Users/minamidaisuke/doboku-note/.local/r2/posts/pe-comprehensive-management/{YEAR}-primary/article.mdx`

## 事前準備
`/tmp/all-keywords.json` に全649キーワードのリストがあることを確認。なければ以下で生成:
```bash
node -e "
const d = require('./src/config/pe-chapters.json');
const kws = [];
for (const ch of d.chapters) {
  for (const sec of ch.sections) {
    for (const kw of sec.keywords || []) {
      kws.push({ slug: kw.slug, title: kw.title, section: sec.id, sectionTitle: sec.title, chapter: ch.title });
    }
  }
}
require('fs').writeFileSync('/tmp/all-keywords.json', JSON.stringify(kws, null, 2));
"
```

## 作業手順
1. {YEAR}-primary の MDX を Read で読み込む
2. 40問それぞれの設問文 + `<details>` 内の解説を読む
3. 各設問の既存 `<RelatedKeywords>` の items 配列を Edit tool で補強（最大 +2件 / 1問）
4. 既存エントリは**削除しない**
5. `<RelatedKeywords>` がまだ無い場合は `</details>` の直前に新規追加

## 品質ルール（重要）
- 既存 items は削除禁止
- 設問の中心概念のみ追加（周辺言及は不要）
- 最大 +2件 / 1問（既存と合わせて最大5件程度）
- slug は /tmp/all-keywords.json に実在するものだけ
- 重複禁止
- 文字化け（U+FFFD）禁止

## 報告
- 補強した設問数
- 追加キーワード総数
- 文字化け有無
```

### Step 4-A: `keyword-relations build` — キーワード⇔キーワード関連 JSON 生成

`<RelatedKeywords>` を各キーワードページに自動挿入するための関連度 JSON を生成する（Issue #29 内部リンク拡充）。

```bash
npm run build-keyword-relations
# → src/config/keyword-relations.json
```

**入力**: `src/config/pe-chapters.json`、`exam-question-keywords.json`、`tag-dictionary.json`、`doc-meta-index.json`

**スコア式**:
- S1 同セクション = 10、S2 同章 = 3（S1 と排他）、S3 共通過去問設問共起 = 2 × count、S4 共通タグ = 1 × min(count, 3)
- EXCLUDED_TAGS = `keyword`, `総合技術監理`（全キーワードで共通のため除外）
- タイブレーク: section 保持 > exam 共起数 > slug アルファベット

**出力スキーマ**:
```json
{
  "version": 1,
  "generated_at": "...",
  "summary": {
    "total_keywords": 640,
    "published_keywords": 639,
    "orphan_slugs_warned": [...],
    "missing_mdx_slugs": [...]
  },
  "config": { "top_n": 5, "weights": {...} },
  "relations": {
    "followership": [
      { "slug": "pm-theory", "label": "PM理論", "score": 14, "signals": ["section", "exam"] },
      ...
    ]
  }
}
```

**Orphan の扱い**: `group: keyword` の MDX が存在するが pe-chapters.json 未登録のスラグ（例: `pdca-cycle` はタグがカタカナ揺れで未登録）は警告ログに出し、`relations` からは除外。Phase 2 の挿入対象にならない（別途 pe-chapters.json の整備が必要）。

### Step 4-B: `keyword-relations insert` — 生成 JSON を MDX へバッチ挿入

Phase 1 リハーサル（5-10 件）→ Phase 2 本番バッチ（604 ページ）で使う。`keyword-relations.json` を読み、指定 slug の MDX に `<RelatedKeywords>` を自動挿入する。

```bash
# dry-run（差分プレビューのみ、書き込みしない）
npm run insert-keyword-relations -- --slugs=followership,risk-assessment --dry-run

# 適用（ファイル書き込み）
npm run insert-keyword-relations -- --slugs=followership,risk-assessment --apply
```

**引数**:
- `--slugs <a,b,c>` カンマ区切りの対象 slug（短い形、プレフィックスなし）
- `--dry-run` 差分プレビューのみ
- `--apply` 書き込み実行
- `--skip-existing` 既に `<RelatedKeywords>` が含まれる MDX はスキップ（デフォルト true）

**挿入位置**: `## 過去問での出題` などの末尾セクション直前。なければファイル末尾。MDX I/O は `.claude/scripts/lib/mdx-io.mjs` の `readMdxFile` / `writeMdxFile` を使い CRLF を保持する（pre-commit フック対応）。

### Step 5: `verify {slug}` — 特定キーワードの紐付け確認

```bash
node -e "
const bl = require('./src/config/past-exam-backlinks.json');
const slug = process.argv[1];
const entries = bl[slug];
if (!entries) {
  console.log('No backlinks for:', slug);
  process.exit(0);
}
console.log(\`=== \${slug} (\${entries.length} entries) ===\`);
for (const e of entries) {
  console.log(\`  - \${e.year} \${e.question} → /docs/\${e.examSlug}#\${e.anchor}\`);
}
" -- {slug}
```

## ヘディングフォーマットの注意

過去問MDXで使われている設問見出しには複数のバリエーションがある:

- `## Ⅰ-1-1` (U+2160 ROMAN NUMERAL ONE) — R01以降で主流
- `## Ⅰ－1－1` (全角ハイフン) — H29, H30
- `## I-1-1` (ASCII I) — H27, H28
- `## II-1-1` (ASCII II) — H21〜H24
- `## Ⅱ-1-1` (U+2161 ROMAN NUMERAL TWO) — H21-H22

`.claude/skills/content/exam-backlinks/scripts/build-exam-backlinks.mjs` の抽出正規表現は `/^(Ⅰ|Ⅱ|Ⅲ|I{1,3}|問題|第)/` でこれらをカバーしている。新しいフォーマットが出現したら正規表現を拡張する。

## 品質チェック観点

### 1. 未参照キーワード

`check` の結果で未参照キーワードが多い場合:
- 新しい（若い）キーワード集で追加されたもので、過去問で問われていない可能性
- または、過去問MDXの解説を読むとキーワードに該当するが `<RelatedKeywords>` が抜けている可能性

対処: `enrich {year}` でサブエージェントを走らせるか、個別に Edit で追加。

### 2. 紐付け薄い設問

`<RelatedKeywords>` が1件以下の設問は充実化候補。`check` で抽出したリストをもとに `enrich {year}` を実行。

### 3. 不正な slug

`build-backlinks` 実行時には slug の実在確認は行わないが、`PastExamBacklinks` コンポーネントはJSONにエントリがあっても `pe-chapters.json` にないslugは表示しない。不正な slug は以下で検出:

```bash
node -e "
const bl = require('./src/config/past-exam-backlinks.json');
const pc = require('./src/config/pe-chapters.json');
const valid = new Set();
for (const ch of pc.chapters) {
  for (const sec of ch.sections) {
    for (const kw of sec.keywords || []) valid.add(kw.slug);
  }
}
const invalid = Object.keys(bl).filter(k => !valid.has(k));
console.log('Invalid slugs:', invalid.length);
invalid.forEach(s => console.log('  -', s));
"
```

### 4. 文字化け

```bash
grep -c '��' .local/r2/posts/pe-comprehensive-management/*/article.mdx | grep -v ':0$'
```

## 関連ファイル

- `.claude/skills/content/exam-backlinks/scripts/build-exam-backlinks.mjs` — 過去問⇔キーワード生成スクリプト
- `.claude/skills/content/exam-backlinks/scripts/build-keyword-relations.mjs` — キーワード⇔キーワード関連生成スクリプト
- `.claude/skills/content/exam-backlinks/scripts/insert-keyword-relations.mjs` — 関連 JSON を MDX へバッチ挿入するスクリプト
- `src/config/past-exam-backlinks.json` — キーワード→過去問 逆引き
- `src/config/exam-question-keywords.json` — 過去問→キーワード 正引き
- `src/config/keyword-relations.json` — キーワード→関連キーワード top-5
- `src/components/ui/PastExamBacklinks/PastExamBacklinks.tsx` — キーワードページ表示
- `src/components/ui/KeywordsInExam/KeywordsInExam.tsx` — 過去問ページ表示
- `src/components/ui/RelatedKeywords/RelatedKeywords.tsx` — 関連キーワード表示
- `src/config/pe-chapters.json` — 全キーワードの正規マスタ
- `docs/project/article-footer-design.md` — 記事末尾の情報設計ルール

## 参照

- `.claude/reference/content-authoring.md` — MDX 作成詳細ルール（コンポーネント・過去問構造・frontmatter）
- `.claude/skills/content/keyword-page/SKILL.md` — キーワードページ作成
- `.claude/skills/content/pdf-to-mdx --exam cem/SKILL.md` — PDF→MDX変換（過去問取り込み時）
