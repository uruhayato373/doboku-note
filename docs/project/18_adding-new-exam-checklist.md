# 新試験追加チェックリスト

**策定日**: 2026-04-14
**対象**: doboku-note に新しい資格試験を追加するときの作業手順
**関連**:
- `17_data-storage-strategy.md`（複数試験対応の基本方針）
- `01_設計思想.md`（フラット URL・MDX 一元管理）

## 前提

doboku-note は D1 を導入せず、frontmatter + build-time JSON で複数試験に対応する（doc 17）。新試験を追加する際は、データベース移行ではなく **スキーマ拡張と設定ファイル更新** のみで完結する。

想定される新試験の例:

- コンクリート主任技師
- 技術士（建設部門・他選択科目）
- 測量士・測量士補
- 1級・2級造園施工管理技士

---

## チェックリスト

新試験を「`concrete-chief-engineer`」として追加する例で説明する。適宜 `{exam-id}` を実際の試験 ID に置き換える。

### 1. カテゴリ定義の追加

**`src/config/categories.json`** に新試験の category を追加:

```json
[
  {
    "slug": "concrete-chief-engineer",
    "label": "コンクリート主任技師",
    "subtitle": "筆記・実地試験 完全対策",
    "variant": "concrete",
    "order": 3
  }
]
```

- `slug` はハイフン区切りの英小文字のみ
- `order` は既存試験の次の整数
- `variant` はデザインバリアント（`civil`/`pe` のように新規作成可）

### 2. zod スキーマの `ExamId` enum に追加

**`scripts/lib/frontmatter-schema.mjs`**:

```js
export const ExamId = z.enum([
  'civil-construction-1',
  'pe-comprehensive-management',
  'concrete-chief-engineer', // ← 追加
]);
```

この変更で `src/lib/frontmatter-schema.ts` は自動的に追従する（型は推論）。

**テスト**:
```bash
node -e "import('./scripts/lib/frontmatter-schema.mjs').then(m => console.log(m.ExamId.options))"
```

### 3. ハードコードされた試験識別子の更新

現在以下のファイルに `civil-construction-1` / `pe-comprehensive-management` の string literal がハードコードされている。新試験で分岐が必要なら個別対応する:

- `src/lib/doc-classifier.ts` — 分類ロジック
- `src/components/ui/PastExamNav/exam-nav-utils.ts` — ナビ補助

理想的には `ExamId` enum を import して分岐に使うリファクタが望ましい。緊急性がなければ暫定対応でもよい（後日 enum 統一の issue を立てる）。

### 4. コンテンツディレクトリ作成

```bash
mkdir -p .local/r2/posts/concrete-chief-engineer
mkdir -p .local/r2/posts/concrete-chief-engineer/guide
mkdir -p .local/r2/posts/concrete-chief-engineer/primary
mkdir -p .local/r2/posts/concrete-chief-engineer/secondary
```

適切なサブディレクトリは試験の出題形式に合わせる（past-exam / textbook / keyword など）。

### 5. 最初の MDX を書く

新試験のランディング用に最低 1 本の MDX を書く（guide ページ推奨）。frontmatter 必須フィールド:

```yaml
---
title: "{試験名} 試験対策ガイド"
description: "{試験名} の受験概要、勉強方法、過去問傾向を解説。"
category: concrete-chief-engineer
group: guide
tags:
  - guide
  - exam-preparation
published: true
publishedAt: 2026-XX-XX
---
```

### 6. ナビゲーション統合

サイトのヘッダーメニュー・サイドバーに新試験を出現させる。該当コンポーネントを特定して追加（`src/components/layout/` 配下などが候補）。

**確認**: `npm run dev` で開き、メニューに新試験が表示されることを視認。

### 7. 既存の試験横断キーワードに新試験タグを追記（任意）

既存のキーワード MDX が新試験でも該当する場合、frontmatter の `exams:` 配列に新試験 ID を追加する:

```yaml
---
exams:
  - pe-comprehensive-management
  - concrete-chief-engineer   # ← 追加
sections:
  pe-comprehensive-management: '2.1'
  concrete-chief-engineer: '1-3'  # ← 追加
---
```

この作業は段階的でよい。初期は新試験のコンテンツのみでも動く。

### 8. build-time インデックス再生成

```bash
node scripts/build-exam-backlinks.mjs
node scripts/build-cross-exam-keyword-index.mjs
node scripts/build-tag-index.mjs
```

- `cross-exam-keywords.json` に新試験の entry が現れるか確認
- `tag-dictionary.json` に新試験で使ったタグが集計されているか確認

### 9. frontmatter 監査

新試験下の全 MDX がスキーマを通ることを確認:

```bash
node -e "
import('./scripts/lib/frontmatter-schema.mjs').then(async ({FrontmatterSchema}) => {
  const {readdirSync, readFileSync} = await import('node:fs');
  const {join, extname} = await import('node:path');
  const matter = (await import('gray-matter')).default;
  const walk = d => readdirSync(d, {withFileTypes:true}).flatMap(e => {
    const p = join(d, e.name);
    return e.isDirectory() ? walk(p) : (extname(e.name) === '.mdx' ? [p] : []);
  });
  let ok = 0, ng = 0;
  for (const f of walk('.local/r2/posts/concrete-chief-engineer')) {
    const {data} = matter(readFileSync(f, 'utf8'));
    const r = FrontmatterSchema.safeParse(data);
    if (r.success) ok++; else { ng++; console.log(f, r.error.issues[0]); }
  }
  console.log('OK:', ok, 'NG:', ng);
});
"
```

期待: NG = 0。

### 10. ビルド全体のグリーン確認

```bash
npm run build
```

- ビルドが通ること
- 全リンクが正しく解決されていること（Next.js が不明なルートで静的生成エラーを出さないこと）
- 生成された `out/` にコンテンツが含まれていること

---

## 新試験追加後のベストプラクティス

- **試験横断キーワードの段階的拡張**: 最初は単一試験で始め、コンテンツが充実したら `exams:` 配列で他試験と紐付ける。早すぎる共有化は片方の試験で不完全な文脈を生む。
- **タグの追加を慎重に**: 新試験固有のタグを作る前に、既存 `src/config/tags.json` を見て流用できないか確認する。タグ数の膨張は検索 UX を損なう。
- **ディレクトリ規約の統一**: 既存試験（`civil-construction-1`、`pe-comprehensive-management`）のサブディレクトリ構造（guide/primary/secondary/textbook/keyword）と揃えると、後の自動化（review スキル等）が使いまわせる。
- **Convention B（article.mdx）推奨**: 新規コンテンツは `{slug}/article.mdx` 形式（Convention B）で作ると URL がきれいになる（CLAUDE.md 参照）。

---

## トラブルシューティング

### A. `bad exam: Invalid option` エラー

pre-commit hook で `frontmatter exams.0: Invalid option` が出る。→ Step 2 の `ExamId` enum に新試験 ID を追加し忘れている。

### B. ナビゲーションに出ない

Step 6 のコンポーネント更新漏れ。`src/components/` で `civil-construction-1` を grep して、新試験を同様に追加する。

### C. `tag-dictionary.json` に未登録タグが大量に出る

新試験で使った新規タグは `src/config/tags.json`（allowlist）に未登録。必要なタグは allowlist にも追加する。完全一致させる必要はないが、意図的に漏らしたタグは放置するとタグ一覧 UI に出現しない。

### D. ビルドが 1 分以上遅くなる

`build-*-index.mjs` のスキャンは 746 MDX → 約 2-3 秒なので、数千規模まで問題にならない。遅延の原因はほぼ `next build` 側。

---

## 参考

- `docs/project/17_data-storage-strategy.md` — 複数試験対応の方針決定
- `scripts/lib/frontmatter-schema.mjs` — スキーマ実体
- `src/config/categories.json` — 既存カテゴリ定義
- `CLAUDE.md` の「試験別コンテンツ整備方針」セクション — 各試験の整備方針差分

---

**改訂履歴**:

- 2026-04-14: 初版作成。doc 17 §5.5 の実装として。
