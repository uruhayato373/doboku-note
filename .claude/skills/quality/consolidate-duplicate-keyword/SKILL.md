---
name: consolidate-duplicate-keyword
description: >
  総合技術監理キーワード集で同一概念が複数スラグで登録されているケースを検出し、
  1 ページに統合する標準手順（7 フェーズ）を提供する。pe-chapters.json スキャン +
  RelatedKeywords 更新 + _redirects 追加 + 自動生成再ビルドまでの作業書。
  Use when user asks to [重複キーワード 統合, /consolidate-duplicate-keyword, 統合手順].
user-invocable: true
---

**実行環境**: macOS only。

## なぜこのスキルがあるのか

総合技術監理キーワード集 2026 では、同じ概念が複数セクションに登録されているケースがある（例: 「社会的受容（PA）」が 4.2「コミュニケーションと合意形成」と 5.2「リスクマネジメント」の両方に登場）。個別ページとして作成すると内容が重複し保守負担が高い。本スキルは以下を統合した入口を提供する:

- `pe-chapters.json` の duplicate 検出（`.claude/skills/quality/consolidate-duplicate-keyword/scripts/find-duplicate-keywords.mjs`）
- 7 フェーズの標準作業手順
- 過去の統合履歴と経験則警告

## 統合判断基準

重複ペアに遭遇したら、まず以下で判定する。

| 判定 | 条件 | 処置 |
|---|---|---|
| **統合する** | 2 ページの内容がほぼ同じ、文脈の差だけ | 1 ページに統合し、両セクションから同じ slug を指す |
| **別ページ維持** | 2 ページの文脈・読者層・論点が大きく異なる | それぞれ独自に深掘り、相互参照で補完関係を明示 |

**迷ったら統合を優先**。後から分離するのは可能だが、2 ページを別々に維持するのは保守コストが大きい。

## 正規スラグ選定ルール

統合先の正規スラグ (canonical) は **短く・文脈サフィックスの付かない方を推奨**。

- 削るべきサフィックス: `-osh`（労働安全衛生）、`-security`（セキュリティ文脈）、`-labor`（労務文脈）、`-process`（工程文脈）、`-comm`（コミュニケーション文脈）
- 残すべき: base slug（`public-acceptance`, `labor-standards-act`, `system-reliability` など）

**理由**: 統合後はサフィックスの示す文脈が 1 ページに吸収され、サフィックスの意味が失われる。汎用名が望ましい。

## 引数

```
/consolidate-duplicate-keyword            # pe-chapters.json をスキャンして候補を表示
/consolidate-duplicate-keyword --json     # JSON 出力
/consolidate-duplicate-keyword --execute <canonical-slug> <duplicate-slug>
                                          # 特定ペアの統合作業を 7 フェーズでガイド
```

`--execute` は対話的ではなく、ユーザーが各フェーズを手動で実行する間のチェックリストを提示する。

## Step 0: 候補の検出

```bash
node .claude/skills/quality/consolidate-duplicate-keyword/scripts/find-duplicate-keywords.mjs
```

出力:
- **同一タイトル異スラグ** (最有力候補): 文言が完全一致しているペア
- **サフィックスペア候補**: `base` と `base-osh` 等のペア

候補が 0 件なら現時点で統合対象なし（2026-04-14 時点で 0 件）。

## 7 フェーズの統合手順

### 前提条件

- 統合する 2 つのスラグ（A と B）が決まっている
- 正規スラグ（A）を上記ルールで選定済み
- 両ページの内容を確認済みで、統合後の構成が頭の中にある

### 事前調査: 削除対象 B の参照箇所を把握

```bash
grep -rn "B-slug" src/ .local/r2/posts/ public/_redirects
```

想定される参照箇所:

1. **`src/config/pe-chapters.json`** — キーワード登録（通常 1 箇所）
2. **`.local/r2/posts/pe-comprehensive-management/*/article.mdx`**
   - 過去問の `<RelatedKeywords>` コンポーネント内 slug
   - `keyword-2026/article.mdx` 等のインラインリンク
   - 他キーワード記事の本文・関連キーワード欄
3. **`public/_redirects`** — 旧 URL の 301 リダイレクト追加先
4. **以下は自動生成なので手を触れない**（Phase 5 で再生成）:
   - `src/config/past-exam-backlinks.json`
   - `src/config/exam-question-keywords.json`
   - 全文検索インデックスは build 時に pagefind が `out/pagefind/` へ生成（旧 `public/search-index.json` は廃止済み）

### フェーズ 1: 正規ページ (A) の統合リライト

- B のコンテンツから独自価値のある部分を A に統合
- 長い表はモバイル視認性のため箇条書きに変換（`docs/reference/content-authoring.md` の「モバイル視認性（詳細ルール）」参照）
- frontmatter は A の既存値を維持（`section` は 1 つだけ保持）
- 「総合技術監理における位置づけ」セクションで **両セクションへの横断的登場** を明記
- `<ExamPoint>` に「キーワード集では X.Y と M.N の両方に登場する」という項目を追加

### フェーズ 2: `pe-chapters.json` の slug 書き換え

B のエントリの `slug` を A に変更する。**タイトル・セクション位置は変えない**。

```diff
  {
-    "slug": "B",
+    "slug": "A",
    "title": "<共通タイトル>"
  },
```

**確認済み**: 同じ slug が `pe-chapters.json` の複数セクションに現れても、navigation コードは section ID でキーイングするため壊れない（`src/app/category/[slug]/page.tsx`, `src/components/ui/SectionKeywords.tsx`, `src/components/ui/CategoryNavCard/CategoryNavCard.tsx`）。

一括編集するときは Node スクリプトで JSON を読み込んで書き戻すと安全:

```js
// 参考: 2026-04-13 の一括統合で使用したパターン
import { readFileSync, writeFileSync } from 'node:fs';
const data = JSON.parse(readFileSync('./src/config/pe-chapters.json', 'utf8'));
const pairs = [['B1','A1'], ['B2','A2']];
function walk(node) {
  if (Array.isArray(node)) return node.forEach(walk);
  if (!node || typeof node !== 'object') return;
  if (node.slug) for (const [b,a] of pairs) if (node.slug === b) node.slug = a;
  for (const [k,v] of Object.entries(node)) if (k !== 'slug' && k !== 'title') walk(v);
}
walk(data);
writeFileSync('./src/config/pe-chapters.json', JSON.stringify(data, null, 2) + '\n');
```

### フェーズ 3: 過去問 MDX の RelatedKeywords 更新

B を slug として参照している過去問・キーワード MDX を個別に編集し、A に置換する。

**重要な注意**: 既に A と B の両方を同じ `<RelatedKeywords>` に含めているファイルは、重複を生むため **片方を削除**する。ラベルは A の正式タイトルに統一する。

```diff
  <RelatedKeywords items={[
    { label: "社会的受容（PA）", slug: "public-acceptance" },
-   { label: "社会的受容（PA・情報管理）", slug: "public-acceptance-comm" },
    { label: "住民参加", slug: "citizen-participation" },
  ]} />
```

**経験則**: Explore エージェントの事前調査では dedup ケースを **見落とすことがある**。**Phase 3 の最中に改めて grep して**、A と B が両方出現する箇条書き・関連キーワード欄を逐次潰していくこと。2026-04-13 の一括統合では Agent 調査分の他に **6 件の追加 dedup** が発見された。

### フェーズ 4: 削除対象ディレクトリの削除

```bash
rm -rf .local/r2/posts/pe-comprehensive-management/B/
```

ディレクトリ内の `img/` 等付属ファイルも含めて完全削除。**画像が A 側にもコピーされていることを事前確認**すること（SVG 等の図版を B 側にだけ置いているケースがある）。

### フェーズ 5: 静的インデックスの再生成

```bash
npm run refresh-indexes
```

これで以下が自動更新される:
- `src/config/past-exam-backlinks.json` — B キーが消え、A キー配下に統合される
- `src/config/exam-question-keywords.json` — B の参照が A に置換される

**手で直接編集しない**。再生成のみ。

### フェーズ 6: `public/_redirects` に 301 を追加

```
# 重複キーワード統合: B → A
/docs/pe-comprehensive-management-B /docs/pe-comprehensive-management-A 301
```

外部リンク・検索結果・既存ブックマークが旧 URL を指している場合でも新 URL へ誘導する。

### フェーズ 7: 検証

```bash
# MDX コンパイル
node .claude/scripts/validate-mdx.mjs .local/r2/posts/pe-comprehensive-management/A/article.mdx

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

## 重要な注意点

- **slug 名称の意味が失われる場合**: 例えば `public-acceptance-comm` の `-comm` サフィックスは「コミュニケーション文脈」を示す意図だが、統合後は不要になる。残された slug が汎用的な名前であることが望ましい
- **`exam-question-keywords.json` / `past-exam-backlinks.json` は触らない**: `build-exam-backlinks.mjs` の自動出力、手で書き換えても次回 `npm run build-backlinks` で消える
- **dev 環境での `_redirects`**: Next.js dev server は Cloudflare の `_redirects` を解釈しないため、旧 URL アクセスは dev では 404 のまま。本番デプロイ後に初めて 301 が機能する
- **物理 HTML と `_redirects` の優先順**: Cloudflare Pages は物理 HTML ファイルを `_redirects` より優先する。`package.json` の build スクリプトに `rm -rf out` が含まれていることで B スラグの古い HTML が残らないようになっている

## 担当外

- **キーワードの新規作成**: `/keyword-page create` モードの担当
- **重複ではない類似キーワードの棲み分け**: 上記「統合判断基準」で「別ページ維持」と判定されたケースは手動で相互参照を整理
- **タグや frontmatter の検証**: `/check-mdx --rules frontmatter` の担当

## 連携スキル・コンポーネント

| 連携先 | 役割 |
|---|---|
| **`.claude/skills/quality/consolidate-duplicate-keyword/scripts/find-duplicate-keywords.mjs`** | Step 0 の候補検出 |
| **`.claude/skills/quality/exam-backlinks/scripts/build-exam-backlinks.mjs`** | Phase 5 の自動生成 |
| **`/keyword-page revise`** モード | Phase 1 の統合リライト時の編集スキル |
| **`public/_redirects`** | Phase 6 の 301 リダイレクト定義 |

## 統合履歴

| 実施日 | 件数 | 備考 |
|---|---|---|
| 2026-04-13 | 1 件 (`public-acceptance` ← 社会的受容 PA) | 初回事例。手順書の原型を確立 |
| 2026-04-13 | 8 件 (下記) | 一括統合。全残件を解消 |

**2026-04-13 一括統合の内訳** — 正規スラグ (A) ← 削除スラグ (B):

- `risk-assessment` ← `risk-evaluation`（リスク評価）
- `system-availability` ← `availability-security`（可用性）
- `process-planning-construction` ← `process-scheduling`（工程計画）
- `reemployment-system` ← `reemployment-system-labor`（再雇用制度）
- `system-reliability` ← `reliability-security`（信頼性）
- `product-safety` ← `product-safety-process`（製品安全）
- `occupational-safety-act` ← `occupational-safety-act-osh`（労働安全衛生法）
- `labor-standards-act` ← `labor-standards-act-osh`（労働基準法）

**新たな重複が見つかった場合は本履歴に追記すること**。`find-duplicate-keywords.mjs` で検出し、本スキルの 7 フェーズで統合し、ここに記録する。

## 参照

- `src/config/pe-chapters.json` — キーワード集の構造化データ
- `.claude/skills/quality/consolidate-duplicate-keyword/scripts/find-duplicate-keywords.mjs` — 重複検出（本スキルの入口）
- `.claude/skills/quality/exam-backlinks/scripts/build-exam-backlinks.mjs` — 自動生成スクリプト
- `public/_redirects` — Cloudflare Pages リダイレクト定義
- `docs/reference/content-authoring.md` — モバイル視認性ルール（表 → 箇条書きの判断基準）
