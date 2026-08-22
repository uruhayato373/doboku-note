---
name: visual-research
description: >
  NotebookLM（総監テキスト）で概念構造を抽出し、参照URL（または自動Web検索）から
  視覚パターンを取得してSVG概念図を生成・MDXに挿入する。
  /illustrate-concept との違い: ① --ref URLを直接渡せる、
  ② notebooklm-cross-query.mjs（旧 nlm cross query）でSVGの「内容」をテキスト根拠から設計する。
  Use when user asks to [参照URL から SVG, NotebookLM で図を作成,
  概念図を深掘り生成, /visual-research, 概念図を追加して].
user-invocable: true
---

# /visual-research — NotebookLM × 参照URL → 概念図

NotebookLM（`.claude/scripts/notebooklm-cross-query.mjs`、旧 `nlm cross query` 後継）で概念の内部構造を抽出し、参照ページの視覚パターンを着想源として、
テキスト根拠に裏付けられた SVG 概念図を生成する。

## /illustrate-concept との使い分け

| ケース | 使うスキル |
|---|---|
| 記事に図がなく、どんな図が有効か自分で探したい | `/illustrate-concept` |
| 「この図（参照URL）を参考に作りたい」「NotebookLMの知識をSVGに落としたい」 | `/visual-research`（本スキル） |

## 引数

```
/visual-research <slug> [--ref <URL>] [--notebooks "名前"] [--concept "概念名"]
```

| 引数 | 説明 |
|---|---|
| `<slug>` | キーワード slug（例: `discount-rate`） |
| `--ref <URL>` | 視覚パターン着想源の参照ページ URL（省略時は自動 Web 検索） |
| `--notebooks` | notebooklm クエリ先（省略時: "総監標準テキスト"） |
| `--concept` | SVG化する概念名（省略時は記事から自動抽出） |

## 前提条件

```bash
notebooklm --version  # 0.3.4 以上（旧 nlm から移行）
notebooklm login      # 認証期限切れ時のみ、ユーザーが手動実行
# 総監標準テキスト notebook ID: c55503ac-07cc-47d8-81d2-41dcb150d0a2
```

## ワークフロー

### Step 1: 記事読み込み & 概念確定

1. `content/site/pe-comprehensive-management/<slug>/article.mdx` を Read
2. 既存 `img/` を ls で確認（既存 SVG との重複を避ける）
3. `--concept` 未指定時は記事 H2/H3 から「図で表現できる概念」を 1〜2 個抽出
   - 抽出基準: フロー・分類・対比・定量関係（表だけでは伝えにくいもの）
   - 除外: H3 で既に分岐済み / 単純な2項比較（表で足りる）

### Step 2: NotebookLM クエリ（概念構造の抽出）

```bash
node .claude/scripts/notebooklm-cross-query.mjs --notebooks "総監標準テキスト" \
  "「{概念名}」を図で表現するとしたら、どのような構造・フロー・分類・関係性が重要か？
   定義・主要コンポーネント・相互関係・試験での出題パターンを整理してください。"
```

結果を以下の形式で構造化して保持する:

```
=== visual-research findings: {slug} ===
[主要要素] A, B, C, D
[関係性]   A → B → C（フロー）または A ↔ B（対比）
[比較軸]   X vs Y（2カラム）または 4象限
[試験論点] 試験で問われるポイント
[推奨パターン] 縦フロー / 2カラム比較 / マトリクス / カード縦並び
```

### Step 3: 参照URL から視覚パターン取得

**`--ref <URL>` 指定ありの場合:**

```
WebFetch <URL>
```

ページ内の図・チャート・表の構造を読み取り:
- 構図パターン（縦フロー / 横フロー / マトリクス / ピラミッド / 比較表）
- 情報の階層（大項目→小項目 or 同列並び）
- 視覚的強調箇所（色分け・アイコン・数値の配置）

findings に `[視覚パターン] <パターン名>（<着想源URL>）` として追加。

**`--ref` 未指定の場合:**

`/illustrate-concept` の Discovery Phase と同じ手順:
- 概念名 × 日英各1クエリを WebSearch
- 出典ページを WebFetch して画像 URL 抽出
- 有用候補をトリアージして視覚パターンを特定

### Step 4: SVG 生成 → MDX 挿入

**SVG の内容**: Step 2 の `[主要要素]` `[関係性]` `[試験論点]` を使う（NotebookLM 由来）
**SVG の構図**: Step 3 の `[視覚パターン]` を着想源として使う（参照URL 由来）

`.claude/skills/authoring/create-svg/SKILL.md` のルールを完全適用:

- viewBox 横幅 ≤ 400px
- `style="max-width:{W}px;width:100%"` をルート `<svg>` に必ず付与
- デザイントークン（brand / positive / warn / danger）のみ使用
- フォント最小 13px、`font-family: Inter, "Noto Sans JP", ...` 必須
- 濃色背景禁止、コントラスト比 4.5:1 以上

SVG 冒頭に出典コメント:
```xml
<!-- source: {URL} (構図着想のみ・独自作図) -->
<!-- notebooklm: 総監標準テキスト より概念構造を抽出 -->
```

保存・挿入:
```bash
# 保存先
content/site/pe-comprehensive-management/<slug>/img/figure-{N}.svg

# MDX 挿入（caption 属性は使わない）
<ArticleImage
  src="/posts/<slug>/img/figure-{N}.svg"
  alt="<概念の簡潔説明>"
/>
```

### Step 5: SVG 監査 & コミット

```bash
# HIGH 検出でコミット前にブロック（必須）
node .claude/skills/quality/check-mdx/scripts/rules/svg/audit.mjs \
  --file=content/site/pe-comprehensive-management/<slug>/img/figure-{N}.svg \
  --fail-on=HIGH
```

```bash
git add content/site/pe-comprehensive-management/<slug>/
git commit -m "content(pe): <slug> に概念図を追加（NotebookLM × 参照URL）

構図着想: <URL>（独自作図・トレース禁止）
概念構造出典: 総監標準テキスト（notebooklm-cross-query）"
```

## 完了レポート

```
=== /visual-research: {slug} 完了 ===
概念: {概念名}
NotebookLM クエリ: 1件（総監標準テキスト）
参照URL: {URL}（視覚パターン: {パターン名}）
生成SVG: figure-{N}.svg → <ArticleImage> 挿入済み
SVG audit: HIGH 0件
```

## 参照

- `.claude/skills/authoring/illustrate-concept/SKILL.md` — Discovery First 方式（--ref 未指定時の自動Web検索手順）
- `.claude/skills/authoring/create-svg/SKILL.md` — SVG 作図ルール・デザイントークン
- `.claude/skills/authoring/notebooklm-research/SKILL.md` — notebooklm-cross-query の詳細
- `.claude/knowledge/reference/content-principles.md` — `<ArticleImage>` caption 禁止ルール
