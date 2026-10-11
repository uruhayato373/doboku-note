# doboku-note スタイルシート

サイト全体のスタイルは `globals.css` に集約し、`src/app/layout.tsx` から一度だけ読み込みます。

## 設計方針

- UIの基本色は Editorial tokens（`--accent`、`--paper`、`--ink-*`、`--rule-*`）を使う
- 状態色は `--color-positive-*`、`--color-warn-*`、`--color-danger-*` を使う
- 試験固有色は `--exam-*`、Calloutは `--ct-*` を使う
- `--color-ink-*` と `--color-brand-*` は図版・SNS・既存コンテンツとの共有パレットであり、新規UIでは使わない
- カードの角丸は `rounded-card-inline/content/section/hero` を用途に応じて使う
- カード外枠は `card-surface-content` または `card-surface-section` を使う
- クリック可能なカードには `card-interactive` を追加する

## 読み込み

```tsx
// src/app/layout.tsx
import '../styles/globals.css';
```

過去問演習の問題文・選択肢・解説の HTML（`.quiz-rich-text` の中身）の見た目だけは `quiz-content.css` に分け、`globals.css` から `@import` する。iOS 択一アプリも `build-ios-quiz-bundle` が同じファイルと色のトークン（`scripts/lib/quiz-style.mjs` が `globals.css` から抜き出す `quiz-tokens.css`）を同梱して読むので、演習の中身の見た目はここだけで直す。

コンポーネントやページから個別にグローバルCSSをimportしないでください。新しい共通値はトークンとして `:root` と必要に応じて `.dark` に定義します。
