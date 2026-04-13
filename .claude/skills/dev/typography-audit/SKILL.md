# /typography-audit — Zennタイポグラフィ準拠監査

## 概要

doboku-note の記事本文スタイル（`src/styles/globals.css` の `.prose-blog` 系ルール）を **Zenn 本番CSSの最新値** と比較し、差分を Critical / Warning / Matches / Intentional の4段階で報告するスキル。

doboku-note は記事本文のタイポグラフィを Zenn 準拠としている。Zenn の CSS は時々更新され、doboku-note の globals.css も時々触るため、半年〜1年スパンで drift が累積する。本スキルは手動比較（毎回60分以上）を自動化し、任意タイミングで確実に差分を検出できるようにする。

## 使い方

```
/typography-audit
```

オプションなし。全カテゴリを比較する。

## 実行手順

### Step 1: Zenn の最新CSSをダウンロード

Zenn は Next.js アプリでハッシュ付きCSSバンドルを配信している。ハッシュは内容変更で変わるため、記事ページのHTMLから動的に抽出する。

```bash
# Zenn の代表記事（markdown guide）から CSS リンクを抽出
curl -sL -A "Mozilla/5.0" "https://zenn.dev/zenn/articles/markdown-guide" -o /tmp/zenn.html
grep -oE 'href="https://static\.zenn\.studio/_next/static/css/[^"]+\.css"' /tmp/zenn.html | head -5 | sed 's/href="//;s/"$//' > /tmp/zenn_css_urls.txt

# 各 CSS を取得し、.znc ルールを含むファイルを特定
for url in $(cat /tmp/zenn_css_urls.txt); do
  curl -sL "$url" -o "/tmp/zenn_$(basename $url)"
done

# .znc を含む CSS だけを main として採用
for f in /tmp/zenn_*.css; do
  if grep -q '\.znc' "$f"; then
    cp "$f" /tmp/zenn_main.css
    echo "Main CSS: $f"
    break
  fi
done
```

### Step 2: Zenn の重要値を抽出

以下の CSS プロパティを `.znc` 系ルールから抽出する。

| カテゴリ | セレクタ | プロパティ |
|---|---|---|
| Body | `.znc` | `line-height` |
| 段落 | `.znc p + p` | `margin-top` |
| リスト | `.znc ul`, `.znc ol` | `margin`, `line-height`, `padding-left` |
| リスト項目 | `.znc li` | `margin` |
| ネストリスト | `.znc ul ul`, `.znc ul ol` | `margin` |
| 見出し直後 | `.znc h1+p` 〜 `.znc h6+p` | `margin-top` |
| blockquote | `.znc blockquote` | `font-size`, `margin`, `border-left`, `padding` |
| table | `.znc table` | `font-size`, `line-height`, `margin` |
| code | `.znc code` | `font-size`, `padding` |
| hr | `.znc hr` | `margin` |
| link | `.znc a`, `.znc a:hover` | `color`, `text-decoration` |

抽出コマンド例:
```bash
grep -oE '\.znc\{[^}]*\}' /tmp/zenn_main.css
grep -oE '\.znc p\+p\{[^}]*\}' /tmp/zenn_main.css
grep -oE '\.znc ul[^{]*\{[^}]*\}|\.znc ol[^{]*\{[^}]*\}' /tmp/zenn_main.css
grep -oE '\.znc li\{[^}]*\}' /tmp/zenn_main.css
grep -oE '\.znc h[1-6]\+p[^{]*\{[^}]*\}' /tmp/zenn_main.css
grep -oE '\.znc blockquote\{[^}]*\}' /tmp/zenn_main.css
```

### Step 3: doboku-note の現在値を抽出

`src/styles/globals.css` を Read し、`.prose-blog` 系ルールを読み取る。Tailwind の `@apply` ディレクティブは以下の換算表で px / rem に変換して比較する。

| Tailwind | 実値 |
|---|---|
| `mb-1` / `mt-1` | 0.25rem (4px) |
| `mb-2` / `mt-2` | 0.5rem (8px) |
| `mb-3` / `mt-3` | 0.75rem (12px) |
| `mb-4` / `mt-4` | 1rem (16px) |
| `mb-5` / `mt-5` | 1.25rem (20px) |
| `mb-6` / `mt-6` | 1.5rem (24px) |
| `mb-8` / `mt-8` | 2rem (32px) |
| `mb-10` / `mt-10` | 2.5rem (40px) |
| `mb-12` / `mt-12` | 3rem (48px) |
| `mb-16` / `mt-16` | 4rem (64px) |

### Step 4: 差分を分類

各項目を4カテゴリに分ける:

- **🔴 Critical**: 読みやすさに直結する項目で、Zenn と値がずれている
  - 判定対象: `ul/ol line-height`、`li margin`、`p+p margin-top`、`h*+p margin-top`
- **🟡 Warning**: 整合性の項目で、Zenn とずれているが許容範囲の可能性あり
  - 判定対象: `ul/ol margin`、`ul/ol padding-left`、ネストリストmargin
- **✅ Matches**: Zenn と一致
- **⚪ Intentional**: `intentional-deviations.yml` に登録済みの意図的逸脱

### Step 5: レポート出力

以下の形式で出力する:

```markdown
# Typography Audit Report

**実行日時**: {ISO timestamp}
**Zenn CSS source**: {url}
**doboku-note source**: src/styles/globals.css

## サマリー
- 🔴 Critical: {n}
- 🟡 Warning: {n}
- ✅ Matches: {n}
- ⚪ Intentional: {n}

## 🔴 Critical Deviations (must fix)

### ul line-height
- **Zenn**: 1.7
- **doboku-note**: 1.9
- **diff**: +0.2
- **修正案**: `.prose-blog ul, .prose-blog ol { line-height: 1.7 }` に変更

（他の Critical があれば続ける）

## 🟡 Warning (consider fixing)

### li margin
- **Zenn**: 0.4rem 0
- **doboku-note**: 0.5rem 0
- **diff**: +0.1rem

（他の Warning があれば続ける）

## ✅ Matches

- body line-height: 1.9 ✓
- p+p margin-top: 1.5em ✓
- h*+p margin-top: 0.3em ✓

## ⚪ Intentional (allowlisted, no action)

- font-size body: doboku=17px, zenn=16px — 日本語可読性優先、+1px
- H2 margin-top: doboku=4rem, zenn=2.3em — 左アクセントバー設計のため広い上余白が必要
- H3 margin-top: doboku=3rem, zenn=2.25em — 同上

## 次のアクション

Critical が 1件以上ある場合:
1. 上記の修正案を `src/styles/globals.css` に適用するか確認
2. 適用する場合は Edit ツールで修正
3. `npm run dev` で主要ページを確認し回帰がないかチェック

Critical が 0 件の場合: 監査完了
```

### Step 6: 修正の提案

- **Critical が1件以上**: 具体的な diff を提示し、適用するかユーザーに確認
- **Warning のみ**: 報告のみ。自動修正しない
- **全て Matches/Intentional**: 「監査完了、差分なし」と報告

**重要**: 自動で globals.css を修正しない。必ずユーザー確認を経る。

## 意図的逸脱の管理

`intentional-deviations.yml` に登録された項目は比較から除外される。新しく意図的逸脱を追加したい場合はこのファイルを更新する。

ファイル形式:
```yaml
- key: "項目名"
  doboku: "doboku-noteの値"
  zenn: "Zennの値"
  reason: "逸脱する理由"
```

## doboku-note 固有の注意点

- Zenn CSS バンドルのファイル名は変更される（ハッシュベース）ため、ハッシュをハードコードしない
- Zenn CSS には複数ファイルあるが、`.znc` を含むのは1つ（main css）。他は UI や layout 系
- doboku-note は `@tailwindcss/typography` プラグインを使っており、`@apply` されていないプロパティも prose プラグイン由来で適用されている可能性がある。prose プラグインの default は [公式ドキュメント](https://github.com/tailwindlabs/tailwindcss-typography) を参照
- Zenn の `html { font-size: 15px }` と `16px` の2つの指定は、おそらくブレイクポイント別。doboku-note は 17px 固定（意図的）
- `text-autospace: normal` は Chrome 120+ で有効。Zenn が採用済み、doboku-note は未採用（将来的に追加検討）

## 実行タイミング

- **定期**: 半年に1回（Q1, Q3 など）
- **CSS変更時**: `src/styles/globals.css` を大きく触ったあと
- **記事フィードバック時**: 読みにくさの指摘を受けたとき

## 関連

- Plan file: `C:\Users\m004195\.claude\plans\graceful-percolating-gray.md`（2026-04-13 の初回整備）
- CSS file: `src/styles/globals.css`
- Zenn OSS 参考: https://github.com/zenn-dev/zenn-editor/tree/canary/packages/zenn-content-css/src
