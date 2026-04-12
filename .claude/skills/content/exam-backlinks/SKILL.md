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

## システム概要

### データフロー

```
過去問MDX (.local/r2/posts/pe-comprehensive-management/{year}-primary/article.mdx)
  └ <RelatedKeywords items={[{ slug: "xxx" }]} /> （設問ごと）
     ↓
scripts/build-exam-backlinks.mjs （解析）
     ↓
src/config/past-exam-backlinks.json    （キーワード→過去問 逆引き）
src/config/exam-question-keywords.json （過去問→キーワード 正引き）
     ↓
src/components/ui/PastExamBacklinks/  （キーワードページで表示）
src/components/ui/KeywordsInExam/     （過去問ページで表示）
```

### 自動実行

- `npm run dev` / `npm run build` の前に `build-exam-backlinks.mjs` が自動実行される
- 過去問MDX更新後に手動で実行したい場合は `npm run build-backlinks`

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

### Step 4: `verify {slug}` — 特定キーワードの紐付け確認

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

`scripts/build-exam-backlinks.mjs` の抽出正規表現は `/^(Ⅰ|Ⅱ|Ⅲ|I{1,3}|問題|第)/` でこれらをカバーしている。新しいフォーマットが出現したら正規表現を拡張する。

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

- `scripts/build-exam-backlinks.mjs` — 生成スクリプト
- `src/config/past-exam-backlinks.json` — キーワード→過去問 逆引き
- `src/config/exam-question-keywords.json` — 過去問→キーワード 正引き
- `src/components/ui/PastExamBacklinks/PastExamBacklinks.tsx` — キーワードページ表示
- `src/components/ui/KeywordsInExam/KeywordsInExam.tsx` — 過去問ページ表示
- `src/config/pe-chapters.json` — 全キーワードの正規マスタ
- `docs/project/article-footer-design.md` — 記事末尾の情報設計ルール

## 参照

- `CLAUDE.md` — コンテンツ作成規約
- `.claude/skills/content/keyword-page/SKILL.md` — キーワードページ作成
- `.claude/skills/content/cem-pdf-to-mdx/SKILL.md` — PDF→MDX変換（過去問取り込み時）
