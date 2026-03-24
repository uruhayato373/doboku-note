CSS・MDX・TSXコンポーネントを doboku-note デザインシステムに照らしてレビューし、違反を検出・分類・修正提案する。

## 引数

```
$ARGUMENTS — レビュー対象のファイルパスまたはディレクトリ
             （例: src/styles/globals.css）
             （例: content/port/fishery-guideline/）
             （例: src/components/layout/）
```

## 手順

### Step 1: 対象特定

- ファイルパスが渡された場合: そのファイルを読み取る
- ディレクトリが渡された場合: 配下の `.mdx`, `.tsx`, `.css` ファイルを Glob で列挙し、全ファイルを対象とする
- 引数なしの場合: 直近の git diff で変更された `.mdx`, `.tsx`, `.css` ファイルを対象とする

### Step 2: リファレンス読み込み

以下を読み込む:

1. `.claude/design-system/prohibited.md` — 禁止パターン一覧（SSOT）
2. `.claude/design-system/quick-reference.md` — 正しいパターンのリファレンス
3. `src/styles/globals.css` — 現行のスタイル定義

### Step 3: 7 カテゴリ走査

#### MDX ファイルの場合

1. **見出し構造**: h1→h2→h3→h4 の順序が正しいか、階層スキップがないか
2. **図・画像**: `className="center-image"` の使用、width 指定、alt 属性、キャプション（`text-center`）の有無
3. **表**: `table-title` と `table-wrapper` の使用、ヘッダーの有無
4. **数式**: `scroll-equation` で囲まれているか、`\tag{}` で番号付与されているか
5. **コンテンツ品質**: 不要な絵文字、AI 生成パターン（過剰な箇条書き、不要なまとめ）
6. **リンク**: リンクテキストが意味のある文言か
7. **アクセシビリティ**: img の alt、th の scope

#### CSS/TSX ファイルの場合

1. **カラー**: `color: black` / `#000` の使用、低コントラストの組み合わせ
2. **タイポグラフィ**: 負の letter-spacing、font-weight: 300 以下、12px 以下のフォント
3. **スペーシング**: 見出し前後の余白不足、表の余白不足
4. **モーション**: 不要なアニメーション
5. **ボーダー**: 薄すぎるボーダー（`#eee` 等）
6. **レスポンシブ**: 固定幅の指定、モバイル未考慮
7. **アクセシビリティ**: outline: none、focus スタイルの欠如

### Step 4: 重大度判定

各違反に重大度を付与:

| 重大度 | 基準 | 例 |
|--------|------|---|
| Critical | アクセシビリティ違反・WCAG 不適合・情報の欠落 | alt 欠損、見出しスキップ、コントラスト不足 |
| High | 禁止パターンに明確に該当 | 不要な絵文字、AI 生成パターン、数式の scroll-equation 欠如 |
| Medium | 推奨パターンからの逸脱 | キャプション欠如、width 未指定、table-wrapper 未使用 |
| Low | 改善推奨だが機能に影響なし | 余白の不統一、スタイルの微細な不整合 |

### Step 5: レポート出力

```markdown
## デザインレビュー: {対象}

### サマリー
- Critical: N件
- High: N件
- Medium: N件
- Low: N件

### 違反一覧

#### Critical

| # | ファイル:行 | カテゴリ | 違反内容 | 修正案 |
|---|------------|---------|---------|--------|
| 1 | path:42 | 見出し構造 | h2 → h4 のスキップ | h3 を挿入 |

#### High
...

#### Medium
...

#### Low
...

### 良い点
- ...
```

## 注意

- 出力は保存しない。会話の中で直接表示する
- 修正案は具体的な className または MDX 記法で提示する
- 大量の違反がある場合は Critical / High を優先し、Low は件数のみ報告する
- MDX コンテンツの「原文の意味変更」は指摘しない（verify-content スキルの管轄）
