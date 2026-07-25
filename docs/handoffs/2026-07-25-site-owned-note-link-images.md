# noteリンク画像のサイト管理化

> [!done]
> noteカバー画像やnote側OGPに依存せず、doboku-note.comが管理するWebP画像を使ってnote記事・有料教材へのリンクカードを表示する実装へ移行した。機械チェックをpre-commitとCI品質監査に組み込み、旧方式の再混入をエラーにした。

## 背景

- noteの本文、関連記事、マガジンではカバー画像の表示・トリミング範囲が異なる。
- note側のカバーをサイト内リンクカードに流用すると、文字切れや表示変更の影響を受ける。
- サイト内のnoteリンクには、画像があるもの、テキストのみのもの、Markdown生リンクのものが混在していた。

## 実装内容

### サイト管理画像

- 追加: `public/images/note-links/pe-comprehensive-study.webp`
  - 960 x 960
  - WebP
  - 技術士総合技術監理、社会基盤、5管理、学習ノートを想起させる文字なしイラスト
  - noteロゴ、noteブランド、画像内テキストは使用しない
- 生成にはCodex組み込みのimagegenを使用した。
- 生成意図: サイトとnoteの両方で切り抜きに耐える正方形構図、中央寄せ、縮小時にも識別できる大きなモチーフ、紺・青緑・オフホワイト系。

### 表示コンポーネント

- `src/components/ui/NoteLink/NoteLink.tsx`
  - `imageSrc`を必須化。
  - `coverImage`を廃止。
  - `kind="article" | "product"`と`price`を追加。
  - 有料教材は`data-cta="note"`、解説記事は`data-cta="note-article"`として計測を分離。
  - 画像は装飾扱いの空altとし、隣接するタイトルをリンクのアクセシブルネームに使用。
- `src/components/ui/MagazineTopBanner/MagazineTopBanner.tsx`
  - `magazineId`からサイト管理のマガジン画像を取得して表示。
  - モバイルでも88px、`sm`以上では132pxを確保。
- `src/app/docs/[...slug]/page.tsx`
  - 上部マガジン導線へ`magazineId`を渡す。

### コンテンツ移行

- 技術士総合技術監理の記事内にあるNoteLink 30件を、サイト管理画像付きへ統一。
- うち5管理分野の有料note生リンク5件を`kind="product"`のNoteLinkへ置換し、価格`¥500`を表示。
- 上部マガジン導線25件は、サイト管理画像を使うバナー表示へ統一。

### 再発防止

- 追加: `scripts/check-note-link-cards.mjs`
  - 自社note記事のMarkdown生リンクを拒否。
  - `NoteLink`の`imageSrc`欠落を拒否。
  - `/images/note-links/*.webp`以外を拒否。
  - 実ファイル欠落、WebPでないファイル、旧`coverImage`を拒否。
  - `kind="product"`の`price`欠落を拒否。
- `package.json`
  - `npm run check-note-link-cards`を追加。
- `scripts/quality-audit.mjs`
  - CI用品質ゲートへ`note-link-cards`を追加。
- `scripts/pre-commit-mdx.mjs`
  - ステージ済みMDXにも同じ方針を適用。
- `.claude/knowledge/reference/content-authoring.md`
  - サイト管理画像をSSOTとする執筆ルールを追記。
- `src/components/ui/NoteLink/README.md`
  - 新しい使用方法と禁止事項を反映。

## 削除

- `public/images/note-covers/`配下の旧noteカバー資産35件を削除。
- `scripts/generate-note-square-covers.mjs`を削除。
- Git管理下の削除なので、必要なら履歴から復元できる。

## 検証

以下を実行し、すべて成功した。

```bash
npm run check-note-link-cards
npm run type-check
npm run validate-mdx
npm run lint
npm run check-image-assets:ci
npm run build
git diff --check
```

`check-note-link-cards`の最終結果:

```text
[check-note-link-cards] ✓ NoteLink 30件（有料商品 5件）はサイト管理画像付き。自社note生リンクなし
```

Playwrightで上部マガジンバナー、解説記事カード、有料教材カードを実画面確認済み。確認用スクリーンショットは検証後に削除した。

## 継続時の注意

- 新しいnoteリンク画像は`public/images/note-links/`へWebPで追加する。
- note側カバーのコピーやOGP取得を再導入しない。
- 画像内にタイトルや価格を焼き込まず、変動情報はHTMLで表示する。
- 今回はデプロイしていない。
