# 2026-06-27 Docs 記事テンプレート改善案

対象: `/docs/[slug]`

位置づけ: デザイン改修前の提案メモ。実装ではない。既存のデザイン原則（正確・明快・信頼、技術文書の可読性優先）を維持しつつ、試験直前期の読了・回遊・CTA 到達を改善する。

---

## 結論

採用候補は **Editorial Study Sheet**。

記事を「白いカードに入った長文」から、「試験対策の読み進めやすい学習シート」に寄せる。派手なビジュアル刷新ではなく、本文の読み出し、目次、記事末 CTA、モバイル導線を整える。

すぐ大きく変えるより、以下の順で小さく実装するのが安全。

1. 記事ヘッダーの情報整理。
2. 右サイドバーの sticky 固定解除と視線優先度調整。
3. 記事末フッター群の区画化。
4. 必要なら記事カード外形と本文幅を微調整。

---

## 現状診断

### 良い点

- `src/styles/globals.css` に editorial tokens があり、配色・角丸・影・本文タイポグラフィは既に統一されている。
- `/docs/[slug]` は `ArticleSidebar` / `ArticleFooter` に分割済みで、テンプレート全体の責務はある程度整理されている。
- 本文 16px / line-height 1.8 は、スマートフォンでの長文読解に向いている。
- note CTA を記事末尾へ統合したことで、本文途中の読み味は崩れにくくなっている。

### 課題

| 領域 | 課題 | 影響 |
|---|---|---|
| 記事冒頭 | パンくず、H1、日付のみで、この記事が「どの試験・どの段階・何を解決するか」が弱い | 初見読者が読み始める判断をしにくい |
| 右サイドバー | 広告、著者、目次、カテゴリナビが同じ密度で縦積みされ、PC では sticky 固定されている | 目次の発見が遅く、読中に販売/プロフィール導線が追従して少し重い |
| 記事末 | 参考資料、過去問逆引き、note CTA、FAQ、転職 CTA、関連記事、著者が同じ `mt-8` で続く | どこから回遊すべきか判断しづらい |
| モバイル | サイドバー情報が記事末へ逃げるため、長文記事で目次・関連導線の可視性が低い | 読中回遊と現在地把握が弱い |
| デザイン原則 | `principles.md` と現行 CSS の差分がある（本文 14px 原則 vs 現行 16px など） | 今後の改修判断で迷いが出る |

---

## 改善コンセプト

### Editorial Study Sheet

土木・資格試験の読者は「美しい記事」より、「いま何を読み、次に何をすればよいか」を求める。したがって、装飾量は増やさず、学習文書としての視線誘導を強める。

守るもの:

- 白背景、2px radius、薄い罫線、低い影。
- ゴシック統一、本文 16px、行間 1.8。
- 既存の `--accent` / `--accent-fill` / `--paper` / `--rule-soft` を主軸にする。
- 画像・カード・CTA を過剰に増やさない。

変えるもの:

- 記事冒頭に「試験・分類・更新日・読了/設問数」などのメタ情報を整理して見せる。
- 右サイドバーの sticky 固定を一旦解除し、学習導線としての目次をもう少し早く見せる案を検討する。
- 記事末を `参考・復習・購入・著者` のように区画化し、同じ `mt-8` の連続から脱却する。

---

## 提案 A: 記事ヘッダーを Study Header 化

### 狙い

ファーストビューで「この記事は自分の試験対策に関係ある」と判断できるようにする。

### 変更案

現状:

- breadcrumb
- H1
- byline
- 本文

改善:

- breadcrumb は維持。ただし視覚的には小さく。
- H1 下に `category / group / section / updated` を横並びのメタチップとして配置。
- `description` がある記事は 1 文リードとして H1 下に出すことを検討。
- byline は `MetaRow` に任せず、記事ヘッダー専用の `ArticleHeader` へ集約する。

### 実装候補

- 新規: `src/components/ui/ArticleHeader/ArticleHeader.tsx`
- 変更: `src/app/docs/[...slug]/page.tsx`
- 既存: `MetaRow` は footer 用に残すか、header/footer variant を整理する。

### 注意

- H1 は大きくしすぎない。現行 24px は維持または 26px 程度まで。
- リード文を出す場合、全記事で長くなりすぎないよう `description` の文字数と改行を確認する。

---

## 提案 B: 右サイドバーの sticky 固定を解除する

### 狙い

読者が本文を読み進める間、広告・著者・目次が常時追従しない落ち着いた読書体験にする。

### 変更案

推奨:

- `ArticleSidebar` の `sticky top-6` を外す。
- 転職広告 → 著者 → 目次の順は維持。
- 目次カードだけ視覚的に少し軽くし、通常の縦積みの中でも見つけやすくする。
- `AuthorSidebarCard` を少し圧縮する。

補足:

- 広告のファーストビュー露出は少し下がる可能性がある。
- ただし、読書中に広告枠が追従しなくなるため、サイト全体の信頼感と記事本文への集中は上がる。
- 必要なら後で「目次だけ軽く sticky に戻す」案を検討する。最初から戻し先を複雑にしない。

### 実装候補

- `src/components/ui/ArticleSidebar/ArticleSidebar.tsx`
- `src/components/ui/TableOfContents.tsx`
- `src/components/ui/AuthorSidebarCard/AuthorSidebarCard.tsx`

---

## 提案 C: 記事末を Footer Stack として区画化

### 狙い

記事末の回遊導線を「全部同じカードが並ぶ」状態から、読者の次アクション別に整理する。

### 変更案

記事末を以下の順に整える。

1. 参考資料: `ExternalReferences`
2. 復習・関連学習: `PastExamBacklinks` / `RelatedTextbooks` / `SectionKeywords`
3. 有料教材: `SidebarMagazineList` / links hub fallback
4. FAQ / 転職 CTA
5. 関連記事
6. 著者

現行も概ねこの順だが、見た目は `mt-8` の連続。各区画に薄いセクションヘッダーまたは上罫線を入れて、次アクションが切り替わったことを示す。

### 実装候補

- 新規: `ArticleFooterSection`
- 変更: `src/components/ui/ArticleFooter/ArticleFooter.tsx`

### 注意

- カード内カードは禁止。セクションは「外枠カード」ではなく、薄い上罫線 + 小見出し程度にする。
- note CTA は画像オンリー方針を維持。

---

## 提案 D: モバイル読中支援

### 狙い

モバイルの長文記事で現在地と回遊導線を失いにくくする。

### 変更案

- 記事冒頭の byline 下に、目次へ飛ぶ小さなアンカーを出す。
- `TableOfContents` をモバイル記事冒頭に折りたたみで置く案を検討。
- ただしファーストビューを圧迫しやすいため、最初は「目次へ」リンク程度に留める。

### 実装候補

- `ArticleHeader`
- `TableOfContents` の mobile variant

---

## 提案 E: レイアウト幅の微調整

### 狙い

本文の読みやすさと右サイドバーの存在感を整える。

### 現状

- outer: `max-w-[1200px]`
- gap: `32px`
- sidebar: `300px`
- article: `px-12`, mobile full-bleed

### 変更案

- desktop outer は `max-w-[1180px]` または現状維持。
- article padding は desktop `px-12` 維持、tablet で `px-8` を明示。
- 本文最大行長を制御したい場合、article 全体ではなく `.prose-blog` に `max-width` をかける。ただし表・図・CTA が窮屈になるため慎重に扱う。

推奨: まず幅は大きく触らない。ヘッダーとフッター整理を先に見る。

---

## 実装フェーズ

### Phase 0: 低リスク整理

- `inlineMobileOnly` の未使用状態を整理。
- MDX component registry の二重管理を解消。
- `ArticleHeader` 追加前に `MetaRow` の責務を確認。

### Phase 1: 記事ヘッダー改善

- `ArticleHeader` を追加。
- breadcrumb / H1 / description / meta を集約。
- desktop / mobile のスクリーンショットで折り返し確認。

### Phase 2: 記事末 Footer Stack 改善

- `ArticleFooterSection` を追加。
- 参考・復習・教材・関連の区画化。
- note CTA と転職 CTA の順序は現行方針を維持。

### Phase 3: サイドバー微調整

- `ArticleSidebar` の sticky 固定を解除。
- `AuthorSidebarCard` の高さ圧縮。
- `TableOfContents` の視認性改善。
- 広告の位置を動かす場合は GA4 / affiliate 計測の変化を見る。

---

## AIDesigner を使う場合の短いプロンプト案

まだ実行しない。ユーザーが AIDesigner 利用を明示した場合だけ使う。

```text
Design a refined article template for a Japanese civil engineering exam study site. Preserve a quiet editorial documentation feel: white paper surface, thin rules, compact 2px radii, system Japanese sans typography, and high readability for long technical articles. Use a calm non-sticky right sidebar on desktop so ads, author info, and navigation do not follow the reader while scrolling. Improve the first viewport so readers immediately understand the exam category, article purpose, update status, and navigation. Keep monetization subtle and trusted, with article-end image CTAs rather than intrusive inline promotions. The result should feel like a professional study sheet for exam preparation, not a marketing landing page.
```

---

## 採用判断

最初に実装するなら **Phase 1: ArticleHeader** がよい。理由は以下。

- 記事本文や CTA ロジックに触れず、見た目と理解しやすさを改善できる。
- 既存の `page.tsx` に散っている breadcrumb / H1 / byline を分離でき、コード設計上も良くなる。
- スクリーンショットで効果を確認しやすい。

次点で **Phase 2: ArticleFooterSection**。記事末の CV / 回遊改善に効くが、CTA 表示条件が多いため Phase 1 よりやや慎重に進める。
