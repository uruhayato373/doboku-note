---
name: notebooklm-research
description: >
  NotebookLM CLI（notebooklm、旧 nlm から 2026-05-11 移行）を使って総監キーワードページを
  深掘り調査し、総監標準テキスト・記述式模範解答・各種白書を横断クエリした引用根拠をもとに
  リライトする Orchestrator スキル。cem-qa 採点は不要。notebooklm-cross-query.mjs ラッパーで
  根拠収集 → 記事に反映のシンプルなフローで内容の深みを追加する。
  Use when user asks to [NotebookLMで調べて, 深掘り調査, 引用根拠でリライト,
  テキストで補強, NotebookLMで品質向上, /notebooklm-research].
---

# /notebooklm-research — NotebookLM 起点のキーワード内容補強

`.Codex/scripts/notebooklm-cross-query.mjs` でノートブックを横断クエリし、根拠付きで記事を補強する。

構造・書式の修正（散文不足・Callout・表形式）は `/improve-article` で一度対応済みであれば
不要。本スキルは**テキスト由来の概念・背景・事例を内容として追加すること**だけに集中する。

> **cem-qa 採点は行わない。** ルーブリックは構造検査であり、内容の深みを測れない。
> 品質判断は人間のレビューで行う。

## 前提条件

### notebooklm CLI（2026-05-11 移行）

旧 `nlm`（Go 製 tmc/nlm）から **`notebooklm`（Python 製、v0.3.4）** への移行済み。実体: `~/bin/notebooklm`（venv ラッパー）。

```bash
notebooklm --version   # 0.3.4 以上
notebooklm login       # 認証期限切れ時はユーザーが手動で実行（インタラクティブ OAuth）
```

`nlm cross query` 相当のサブコマンドが現行 CLI にないため、本プロジェクトでは決定論的ラッパー `.Codex/scripts/notebooklm-cross-query.mjs` を経由する。実態は `notebooklm list --json` で ID 解決 + `notebooklm ask -n <id> --json "..."` を逐次実行する形。

### 総監標準テキスト ノートブック（作成済み）

ID: `c55503ac-07cc-47d8-81d2-41dcb150d0a2`

登録済みソース: 経済性管理 / 人的資源管理 / 情報管理 / 安全管理 / 社会環境管理 / 総合技術監理キーワード集2026

### 利用可能ノートブック

| ノートブック名 | 用途 |
|---|---|
| 総監標準テキスト | 5管理の定義・背景・計算式（メイン） |
| 総監一次択一過去問 | 1 次択一過去問本体（R03-R07 投入済、`/build-exam-notebook` で構築） |
| 記述式問題の模範解答例 | 論文事例・記述式での使われ方 |
| 各種白書（環境・防災・交通等） | 社会環境管理の最新データ・事例 |

## 引数

```
/notebooklm-research <slug> [--notebooks "名前1,名前2"] [--auto]
```

| 引数 | 説明 |
|---|---|
| `<slug>` | キーワード slug（例: `discount-rate`） |
| `--notebooks` | クエリするノートブック名（省略時は「総監標準テキスト」） |
| `--auto` | 確認ステップをスキップして一気に進む |

## 実行フロー

### Step 1: 記事読み込みとクエリ設計

1. `.local/r2/posts/pe-comprehensive-management/<slug>/article.mdx` を Read
2. `title`・`section`・現在の本文から「何が不足しているか」を判断する
3. 補強の観点を以下から選ぶ：

| 観点 | クエリ方針 |
|---|---|
| **Why（動機付け）** | なぜこの概念が必要か・背景・前提 |
| **How（計算・手順）** | 展開式・ステップ・具体的な計算例 |
| **事例** | 建設プロジェクト・公共事業での適用例 |
| **試験論点** | 過去問での問われ方・誤答パターン |
| **5管理トレードオフ** | 他管理との競合・調整の観点 |

### Step 2: notebooklm-cross-query を実行

エージェントの Bash ツールから決定論的ラッパーを呼ぶ:

```bash
node .Codex/scripts/notebooklm-cross-query.mjs \
  --notebooks "総監標準テキスト" \
  "「{keyword}」について、{補強したい観点} を詳しく教えてください。"
```

複数観点を一度にクエリする場合（複数ノートブック横断）:
```bash
node .Codex/scripts/notebooklm-cross-query.mjs \
  --notebooks "総監標準テキスト,記述式問題の模範解答例" \
  "「{keyword}」の定義・背景・試験での問われ方・5管理との関係をまとめてください。"
```

`--json` を付けると構造化出力（answer + references）を返す:
```bash
node .Codex/scripts/notebooklm-cross-query.mjs --json \
  --notebooks "総監標準テキスト" "..."
```

**認証エラー時**: ラッパーが exit 2 + `notebooklm login` の指示を返す。ユーザーが手動で `notebooklm login` を実行 → 再試行。

クエリ結果を構造化して保持する：
```
=== findings: {slug} ===
[Why] ...
[How] ...
[事例] ...
[試験論点] ...
```

### Step 3: 記事へ反映

Edit ツールで直接修正する。

**補強の原則：**
- テキストの文言をそのまま転記しない（要約・再構成する）
- 各 H2 の散文導入を充実させる
- 新しい概念は既存の構成に自然に組み込む（H2 を安易に追加しない）
- `<Callout type="warn">` でテキストが強調する注意点を視覚化
- `frontmatter.dateModified` と `lastRewrittenAt` を今日の日付に更新

**反映先の目安：**

| findings の種類 | 反映先 |
|---|---|
| Why・背景 | 「〜とは」節の散文導入 |
| 展開式・計算例 | 「基本計算式」または関連節 |
| 試験論点・誤答 | `<Callout type="warn">` |
| 実務事例・白書データ | 「総合技術監理における位置づけ」節 |
| 5管理トレードオフ | 「総合技術監理における位置づけ」節 |

### Step 4: 完了レポートとコミット

```
=== /notebooklm-research: {slug} 完了 ===
クエリ数: N件
補強した内容:
  - {補強内容1}（{ノートブック名}）
  - {補強内容2}（{ノートブック名}）
```

コミットメッセージ：
```
content(pe): {slug} を NotebookLM で内容補強
```

## 参照

- `.Codex/knowledge/reference/content-principles.md` — コンテンツ品質ルール
- `.Codex/skills/authoring/improve-article/SKILL.md` — 構造修正（先に実施済みであること）
- `.Codex/skills/quality/quality-cycle/SKILL.md` — 過去問起点の横断校正
- `docs/textbook/技術士（総監）/テキスト/総監標準テキスト/` — テキスト PDF 群（ノートブック登録元）
