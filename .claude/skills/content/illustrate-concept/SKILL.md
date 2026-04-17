---
name: illustrate-concept
description: >
  MDX 記事に挿入する概念図の視覚的メタファーを Web 画像検索で調査し、
  候補をユーザーに提示して合意を得てから /create-svg に引き渡す。
  「何を図にするか」の着想フェーズを担う、/create-svg の上流スキル。
  Use when user asks to [概念図の検討, 図の着想, SVGの素案作成, 図版案の調査, /illustrate-concept].
---

## 用途

MDX 記事（主に総合技術監理キーワードページ）に挿入する概念図について、Web 上の公開画像から **視覚的メタファーの着想源** を調査し、候補をユーザーに提示・合意を得てから `/create-svg` に引き渡す。

Claude が独力で作図すると「ありきたりの2カラム比較」に陥りやすい問題を解決するため、先に「この概念は世の中でどう図示されているか」を調べる工程を定型化する。

## スコープと位置づけ

- **Generator スキル**。`/create-svg` の **上流** に位置する
- SVG の実作成は担当しない（確定した視覚メタファーを引数にして `/create-svg` を呼ぶ）
- 出典画像のトレース・再現は **禁止**（著作権リスク回避）

## 引数

```
/illustrate-concept <対象記事のパス> [<図にしたい概念>]
```

| 引数 | 必須 | 説明 |
|------|------|------|
| 対象記事のパス | 必須 | `.local/r2/posts/{slug}/article.mdx` の絶対パスまたは相対パス |
| 図にしたい概念 | 任意 | 具体的に指定があれば調査の焦点を絞る。省略時は Step 1 で Claude が候補抽出 |

## Workflow

### Step 1: 対象記事の読解と SVG 候補概念の抽出

1. 記事の MDX を Read し、H2/H3 構造と主要概念を把握
2. SVG 化の価値が高い概念を 1〜3 個抽出（判断基準）:
   - 分類・階層構造（4象限、ツリー、サイクル等）
   - 時系列・プロセス（フロー、段階遷移）
   - 対比（2軸、Before/After）
   - 定量関係（グラフ、位置関係）
3. テキストで十分に表現できている（H3 見出しで分岐済み等）場合は **SVG 不要** と判断して終了
4. ユーザーに候補を提示し、どの概念を図にするか確認

### Step 2: 検索クエリ策定

確定した概念について、日英 2〜3 クエリを生成。例:

- 「予防保全 分類 図」「保全方式 体系図」
- "preventive maintenance classification diagram"
- "TBM CBM comparison chart"

### Step 3: WebSearch 実行

各クエリで WebSearch を実行し、画像 URL を計 **3〜5 件** ピックアップ。選定基準:

- 構図が明快（ごちゃごちゃしていない）
- 視覚的メタファーの着想として有用（色・形・配置で概念が伝わる）
- 出典が明示されている（後で記録する）

### Step 4: 画像取得とローカル保存

1. 一時ディレクトリを作成: `C:\tmp\illustrate-concept\{slug}\`
2. 各画像を WebFetch または curl で取得し、`candidate-{N}.{ext}` として保存
3. Read tool で各画像を視覚確認（Claude Code のマルチモーダル機能を活用、構図の特徴を把握）

### Step 5: ユーザーへ提示

各候補を以下のフォーマットで提示:

```
### 候補 1

- **ローカルパス**: C:\tmp\illustrate-concept\{slug}\candidate-1.png
- **出典 URL**: https://example.com/source-page
- **構図の特徴**: （Claude が Read で確認した内容を 1〜2 行で言語化）
- **推奨 /create-svg パターン**: マトリクス（2×2）／ 縦フロー／ 横2カラム比較／ カード縦並び のいずれか
```

ユーザーはローカルパスをエクスプローラで開いて視覚確認できる。

### Step 6: ユーザー承認

以下のいずれかの応答を受ける:

- 「○番を採用」
- 「○の構図と△の配色を組み合わせ」
- 「全部却下、別概念で再検索」 → Step 2 に戻る
- 「すべて却下、SVG なしでいく」 → 一時ファイル削除して終了

### Step 7: /create-svg に引き渡し

1. 確定した視覚メタファー・出典 URL・記事スラグを整理し、`/create-svg` を呼び出す
2. `/create-svg` 側で SVG 生成・MDX への `<ArticleImage>` 挿入を実行
3. **SVG 内に出典コメントを挿入** させる（`<!-- source: {URL} -->` を `<svg>` 直後に）
4. 一時ディレクトリ `C:\tmp\illustrate-concept\{slug}\` を削除
5. コミットメッセージ本文に出典 URL を含めるようユーザーに案内

## 著作権・出典ポリシー（必読）

- 取得した画像は **構図・視覚メタファーの着想源** としてのみ使用する
- **トレース・再現は禁止**。形状・配色・レイアウトは `.claude/design-system/principles.md` のデザイントークンに基づき独自作図
- 出典 URL は **2 箇所に必ず記録**:
  1. SVG ファイル冒頭の `<!-- source: {URL} (構図着想のみ・独自作図) -->` コメント
  2. git コミットメッセージ本文
- 取得画像を `.local/r2/posts/` 配下に保存することは **絶対禁止**（一時ディレクトリのみ）
- Step 7 完了後は一時ファイルを必ず削除

## `/create-svg` との連携

| 役割 | 担当 |
|---|---|
| 視覚メタファーの着想・選定 | `/illustrate-concept`（本スキル） |
| レイアウトパターン選択 | `/create-svg`（4 パターン） |
| viewBox・デザイントークン適用 | `/create-svg` |
| モバイル視認性セルフチェック | `/create-svg` Step 3 |
| MDX への `<ArticleImage>` 挿入 | `/create-svg` Step 4 |
| コミット | `/create-svg` Step 5 |

本スキルは `/create-svg` を置き換えるものではなく、**前段の着想フェーズを追加する** ものである。

## スコープ外

- 「何を図にするか」が既に明確な場合は、本スキルを経由せず直接 `/create-svg` を呼ぶ
- 画像の AI 解析 API 統合（WebSearch + Read の組み合わせで十分）
- 厳格な出典ポリシー（CC-BY 限定等）は Phase 2 以降の検討事項

## 参照

- `.claude/skills/content/create-svg/SKILL.md` — 下流で呼び出す SVG 作成スキル
- `.claude/design-system/principles.md` — デザイントークン・コントラスト比ルール
- `.claude/reference/content-authoring.md` — MDX コンポーネント・画像配信規約
- `CLAUDE.md` § 「コンテンツ編集時のコミット運用」 — 記事修正完了後の即コミット原則
