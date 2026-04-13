# 重複キーワードページの統合手順

## 背景

総合技術監理キーワード集2026 では、同じ概念が複数セクションに登録されているケースがある（例: 「社会的受容（PA）」が 4.2「コミュニケーションと合意形成」と 5.2「リスクマネジメント」の両方に登場）。そうした重複は個別ページとして作成されがちだが、実態は内容が重複しており保守負担が高い。

本ドキュメントは `pe-chapters.json` を全体スキャンして**同一タイトル・異スラグ**のペアを見つけたときに適用する**標準統合手順**を定義する。

## 統合判断基準

重複ペアに遭遇したら、まず以下で判定する。

| 判定 | 条件 | 処置 |
|---|---|---|
| **統合する** | 2ページの内容がほぼ同じ、文脈の差だけ | 1ページに統合し、両セクションから同じ slug を指す |
| **別ページ維持** | 2ページの文脈・読者層・論点が大きく異なる | それぞれ独自に深掘り。相互参照で補完関係を明示 |

判断が難しい場合は、**統合を優先**する。後から分離するのは可能だが、2ページを別々に維持するのは保守コストが大きいため。

## 標準手順（テンプレート）

### 前提条件

- 統合する2つのスラグ（A と B）が決まっている
- どちらを正規スラグ（canonical）とするか決まっている（**短く・文脈サフィックス`-osh` `-security` `-labor` `-process` 等の付かない方を推奨**）
- 両ページの内容を確認済みで、統合後の構成が頭の中にある

### 事前調査

削除対象スラグ（B）が参照される全箇所を把握する。

```bash
grep -rn "<B-slug>" src/ .local/r2/posts/ public/_redirects
```

想定される参照箇所:

1. **`src/config/pe-chapters.json`** — キーワード登録。通常は1箇所のみ
2. **`.local/r2/posts/pe-comprehensive-management/*/article.mdx`**
   - 過去問の `<RelatedKeywords>` コンポーネント内 slug
   - `keyword-2026/article.mdx` などのインラインリンク
   - 他キーワード記事の本文・関連キーワード欄
3. **`public/_redirects`** — 旧 URL の 301 リダイレクト追加先
4. 以下は自動生成なので**手を触れない**（Phase 5 の build-backlinks で再生成）:
   - `src/config/past-exam-backlinks.json`
   - `src/config/exam-question-keywords.json`
   - `public/search-index.json`

### 実行フェーズ

#### フェーズ1: 正規ページ（A）の統合リライト

- B のコンテンツから独自価値のある部分を A に統合
- 長い表はモバイル視認性のため箇条書きに変換（`CLAUDE.md` のモバイル視認性ルール参照）
- frontmatter は A の既存値を維持（`section` は1つだけ保持）
- 「総合技術監理における位置づけ」セクションで**両セクションへの横断的登場**を明記
- `<ExamPoint>` に「キーワード集では X.Y と M.N の両方に登場する」という項目を追加

#### フェーズ2: `pe-chapters.json` の slug 書き換え

B のエントリ（削除対象）の `slug` を A（正規）に変更する。**タイトル・セクション位置は変えない**。

```diff
  {
-    "slug": "B",
+    "slug": "A",
    "title": "<共通タイトル>"
  },
```

**確認済み**: 同じ slug が pe-chapters.json の複数セクションに現れても、navigation コードは section ID でキーイングするため壊れない（`src/app/category/[slug]/page.tsx`, `src/components/ui/SectionKeywords.tsx`, `src/components/ui/CategoryNavCard/CategoryNavCard.tsx`）。

一括編集するときは Node スクリプトで JSON を読み込んで書き戻すと安全:

```js
// 参考: 2026-04-13 の一括統合で使用したパターン
const data = require('./src/config/pe-chapters.json');
const pairs = [['B1','A1'], ['B2','A2'], ...];
function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== 'object') return;
  if (node.slug) for (const [b,a] of pairs) if (node.slug === b) node.slug = a;
  for (const [k,v] of Object.entries(node)) if (k !== 'slug' && k !== 'title') walk(v);
}
walk(data);
require('fs').writeFileSync('./src/config/pe-chapters.json', JSON.stringify(data, null, 2) + '\n');
```

#### フェーズ3: 過去問 MDX の RelatedKeywords 更新

B を slug として参照している過去問・キーワード MDX を個別に編集し、A に置換する。

**注意**: 既に A と B の両方を同じ `<RelatedKeywords>` に含めているファイルは、重複を生むため **片方を削除**する。ラベルは A の正式タイトルに統一する。

例:
```diff
  <RelatedKeywords items={[
    { label: "社会的受容（PA）", slug: "public-acceptance" },
-   { label: "社会的受容（PA・情報管理）", slug: "public-acceptance-comm" },
    { label: "住民参加", slug: "citizen-participation" },
  ]} />
```

**実経験**: Explore エージェントの事前調査では dedup ケースを見落とすことがある。**Phase 3 の最中に改めて grep して**、A と B が両方出現する箇条書き・関連キーワード欄を逐次潰していくこと（2026-04-13 の一括統合では Agent 調査分の他に 6 件の追加 dedup が発見された）。

#### フェーズ4: 削除対象ディレクトリの削除

```bash
rm -rf .local/r2/posts/pe-comprehensive-management/B/
```

ディレクトリ内の `img/` など付属ファイルも含めて完全削除。**画像が A 側にもコピーされていることを事前確認**すること（SVG 等の図版を B 側にだけ置いているケースがある）。

#### フェーズ5: 自動生成ファイルの再生成

```bash
npm run build-backlinks
```

これで以下が自動更新される:
- `src/config/past-exam-backlinks.json` — B キーが消え、A キー配下にバックリンクが統合される
- `src/config/exam-question-keywords.json` — B の参照が A に置換される

**手で直接編集しない**。再生成のみ。

#### フェーズ6: `public/_redirects` に 301 を追加

```
# 重複キーワード統合: B → A
/docs/pe-comprehensive-management-B /docs/pe-comprehensive-management-A 301
```

外部リンク・検索結果・既存ブックマークが旧 URL を指している場合でも新 URL へ誘導する。

#### フェーズ7: 検証

```bash
# MDX コンパイル
node scripts/validate-mdx.mjs .local/r2/posts/pe-comprehensive-management/A/article.mdx

# 文字化け
grep -r "��" .local/r2/posts/pe-comprehensive-management/A/

# B スラグの残留参照がゼロであること
grep -rn "B" src/ .local/r2/posts/ --include="*.mdx" --include="*.json"

# 型・lint
npm run type-check
npm run lint
```

最後にブラウザで以下を確認:
- `/docs/pe-comprehensive-management-A` が正常表示される
- `/category/pe-comprehensive-management` で X.Y と M.N の両セクションから同じ A ページに遷移できる
- 自動バックリンクカード（PastExamBacklinks）に両ページ分の過去問が統合して表示される

## 注意点

- **slug 名称の意味が失われる場合**: 例えば `public-acceptance-comm` の `-comm` サフィックスは「コミュニケーション文脈」を示す意図で付けられたが、統合後は不要になる。残された slug（A）が汎用的な名前であることが望ましい
- **exam-question-keywords.json / past-exam-backlinks.json は触らない**: これらは `build-exam-backlinks.mjs` の自動出力なので、手で書き換えても次回 build で消える
- **dev 環境での `_redirects`**: Next.js dev server は Cloudflare の `_redirects` を解釈しないため、旧 URL アクセスは dev では 404 のまま。本番デプロイ後に初めて 301 が機能する
- **物理 HTML と `_redirects` の優先順**: Cloudflare Pages は物理 HTML ファイルを `_redirects` より優先する。`package.json` の build スクリプトに `rm -rf out` が含まれていることで B スラグの古い HTML が残らないようになっている
- **統合したことを過去問解説に記録**: 必要に応じて過去問側 `<RelatedKeywords>` にラベル注記を残すか、本ファイル末尾の統合履歴に追記する

## 参照

- `src/config/pe-chapters.json` — キーワード集の構造化データ
- `scripts/build-exam-backlinks.mjs` — 自動生成スクリプト
- `public/_redirects` — Cloudflare Pages リダイレクト定義

## 統合履歴

| 実施日 | 件数 | 備考 |
|---|---|---|
| 2026-04-13 | 1件（`public-acceptance` — 社会的受容 PA） | 初回事例。手順書の原型を確立 |
| 2026-04-13 | 8件（下記）| 一括統合。全残件を解消 |

**2026-04-13 一括統合の内訳** — 正規スラグ (A) ← 削除スラグ (B):

- `risk-assessment` ← `risk-evaluation`（リスク評価）
- `system-availability` ← `availability-security`（可用性）
- `process-planning-construction` ← `process-scheduling`（工程計画）
- `reemployment-system` ← `reemployment-system-labor`（再雇用制度）
- `system-reliability` ← `reliability-security`（信頼性）
- `product-safety` ← `product-safety-process`（製品安全）
- `occupational-safety-act` ← `occupational-safety-act-osh`（労働安全衛生法）
- `labor-standards-act` ← `labor-standards-act-osh`（労働基準法）

新たな重複が見つかった場合は本履歴に追記すること。
