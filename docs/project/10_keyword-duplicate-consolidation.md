# 重複キーワードページの統合手順

## 背景

総合技術監理キーワード集2026 では、同じ概念が複数セクションに登録されているケースが存在する（例: 「社会的受容（PA）」が 4.2「コミュニケーションと合意形成」と 5.2「リスクマネジメント」の両方に登場）。

`src/config/pe-chapters.json` の全体スキャン（2026-04-13 時点）で、**同一タイトル・異スラグ** のペアが少なくとも **10組** 見つかった。これらは個別に専用ページが作成されてきたが、実態は内容が重複しており保守負担が高い。

本ドキュメントは **重複ページを1つに統合する標準手順** を定義する。最初の統合事例である `public-acceptance`（社会的受容 PA）を参照テンプレートとする。

## 統合判断基準

重複ペアに遭遇したら、まず以下で判定する。

| 判定 | 条件 | 処置 |
|---|---|---|
| **統合する** | 2ページの内容がほぼ同じ、文脈の差だけ | 1ページに統合し、両セクションから同じ slug を指す |
| **別ページ維持** | 2ページの文脈・読者層・論点が大きく異なる | それぞれ独自に深掘り。相互参照で補完関係を明示 |

判断が難しい場合は、**統合を優先**する。後から分離するのは可能だが、2ページを別々に維持するのは保守コストが大きいため。

## 標準手順（テンプレート）

以下は `public-acceptance` 統合（2026-04-13 実施）で確立した手順。

### 前提条件

- 統合する2つのスラグ（A と B）が決まっている
- どちらを正規スラグ（canonical）とするか決まっている（短く汎用的な方を推奨）
- 両ページの内容を確認済みで、統合後の構成が頭の中にある

### 事前調査

以下のコマンドで影響範囲を棚卸しする。削除対象スラグ（B）が参照される全箇所を把握する。

```bash
# 参照箇所の検出（手動で false positive を除外）
grep -rn "削除対象スラグ" C:/Users/m004195/doboku-note/src C:/Users/m004195/doboku-note/.local
```

想定される参照箇所:

1. **`src/config/pe-chapters.json`** — キーワード登録。1箇所のみ（重要）
2. **`src/config/past-exam-backlinks.json`** — 自動生成。手を触れない
3. **`src/config/exam-question-keywords.json`** — 自動生成。手を触れない
4. **`public/search-index.json`** — 自動生成。手を触れない
5. **`.local/r2/posts/pe-comprehensive-management/*/article.mdx`**
   - 過去問の `<RelatedKeywords>` コンポーネント内 slug
   - `keyword-2026/article.mdx` などのインラインリンク
6. **`public/_redirects`** — 旧 URL の 301 リダイレクト追加先

### 実行フェーズ

#### フェーズ1: 正規ページ（A）の統合リライト

- B のコンテンツから独自価値のある部分を A に統合
- すべてのテーブルを構造化箇条書きに変換（モバイル視認性）
- frontmatter は A の既存値を維持（section は1つだけ保持）
- 「総合技術監理における位置づけ」セクションで **両セクションへの横断的登場**を明記
- ExamPoint に「キーワード集では X.Y と M.N の両方に登場する」という項目を追加

#### フェーズ2: `pe-chapters.json` の slug 書き換え

B のエントリ（削除対象）の `slug` を A（正規）に変更する。**タイトル・セクション位置は変えない**。

```diff
  {
-    "slug": "B",
+    "slug": "A",
    "title": "<共通タイトル>"
  },
```

**確認済み**: 同じ slug が pe-chapters.json の複数セクションに現れても、navigation コードは section ID でキーイングするため壊れない（`src/app/category/[slug]/page.tsx:378`, `src/components/ui/SectionKeywords.tsx`, `src/components/ui/CategoryNavCard/CategoryNavCard.tsx`）。

#### フェーズ3: 過去問 MDX の RelatedKeywords 更新

B を slug として参照している過去問 MDX を個別に編集し、A に置換する。

**注意**: 既に A と B の両方を同じ `<RelatedKeywords>` に含めているファイルは、重複を生むため **1つに統合**する（片方を削除）。ラベルは A の正式タイトルに統一する。

例: `r07-primary/article.mdx`
```diff
  <RelatedKeywords items={[
    { label: "社会的受容（PA）", slug: "public-acceptance" },
-   { label: "社会的受容（PA・情報管理）", slug: "public-acceptance-comm" },
    { label: "住民参加", slug: "citizen-participation" },
  ]} />
```

#### フェーズ4: 削除対象ディレクトリの削除

```bash
rm -rf .local/r2/posts/pe-comprehensive-management/B/
```

ディレクトリ内の `img/` など付属ファイルも含めて完全削除。正規ページに必要な内容は既にフェーズ1で吸収済み。

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
# lint
node scripts/lint-mdx-mobile.mjs .local/r2/posts/pe-comprehensive-management/A/article.mdx

# MDX コンパイル
node scripts/validate-mdx.mjs .local/r2/posts/pe-comprehensive-management/A/article.mdx

# 文字化け
grep -r "��" .local/r2/posts/pe-comprehensive-management/A/

# 再参照が残っていないか
grep -rn "B" src/ .local/r2/posts/pe-comprehensive-management/ --include="*.mdx" --include="*.json"
```

最後にブラウザで以下を確認:
- `/docs/pe-comprehensive-management-A` が正常表示される
- `/category/pe-comprehensive-management` で X.Y と M.N の両セクションから同じ A ページに遷移できる
- 自動バックリンクカード（PastExamBacklinks）に両ページ分の過去問が統合して表示される

## 残件リスト

`pe-chapters.json` 全体で検出された duplicate-title ペアは以下の10組（2026-04-13 時点）。

| 順 | タイトル | スラグ1 | スラグ2 | 状態 |
|---|---|---|---|---|
| 1 | 社会的受容（PA） | public-acceptance | public-acceptance-comm | ✅ **統合済み** (2026-04-13) |
| 2 | リスク評価 | risk-assessment | risk-evaluation | 未着手 |
| 3 | 安全管理 | — | — | 未着手 |
| 4 | 可用性（Availability） | — | — | 未着手 |
| 5 | 工程計画 | process-planning-construction | — | 未着手 |
| 6 | 再雇用制度 | reemployment-system | reemployment-system-labor | 未着手 |
| 7 | 信頼性（Reliability） | — | — | 未着手 |
| 8 | 製品安全 | — | — | 未着手 |
| 9 | 労働安全衛生法 | — | — | 未着手 |
| 10 | 労働基準法 | — | — | 未着手 |

スラグ未調査の項目は、着手時に pe-chapters.json を grep して特定すること。

## 注意点

- **slug 名称の意味が失われる場合**: 例えば `public-acceptance-comm` の `-comm` サフィックスは「コミュニケーション文脈」を示す意図で付けられたが、統合後は不要になる。残された slug（A）が汎用的な名前であることが望ましい
- **exam-question-keywords.json / past-exam-backlinks.json は触らない**: これらは `build-exam-backlinks.mjs` の自動出力なので、手で書き換えても次回 build で消える
- **dev 環境での `_redirects`**: Next.js dev server は Cloudflare の `_redirects` を解釈しないため、旧 URL アクセスは dev では 404 のまま。本番デプロイ後に初めて 301 が機能する
- **統合したことを過去問解説に記録**: 必要に応じて過去問側 `<RelatedKeywords>` にラベル注記を残すか、docs に統合履歴を残す

## 参照

- `src/config/pe-chapters.json` — キーワード集の構造化データ
- `scripts/build-exam-backlinks.mjs` — 自動生成スクリプト
- `public/_redirects` — Cloudflare Pages リダイレクト定義
- 初回統合事例: `public-acceptance`（2026-04-13）
