---
name: notebooklm-research
description: >
  NotebookLM MCP（nlm CLI）を使って総監キーワードページを深掘り調査し、
  総監標準テキスト・記述式模範解答・各種白書を横断クエリした引用根拠をもとにリライトする
  Orchestrator スキル。cem-qa で弱軸を特定 → nlm cross query で根拠収集 →
  記事に反映 → cem-qa で再採点 のループを回す。
  Use when user asks to [NotebookLMで調べて, 深掘り調査, 引用根拠でリライト,
  テキストで補強, NotebookLMで品質向上, /notebooklm-research].
---

# /notebooklm-research — NotebookLM MCP 起点のキーワード内容補強

`nlm cross query` を使ってノートブックを横断クエリし、根拠付きで記事を補強する。
`/improve-article` が構造・書式を直すのに対して、本スキルは**内容の根拠と深みを追加する**。

## 前提条件

### nlm CLI（インストール済み確認）
```bash
nlm --version   # 0.6.5 以上
```

### 総監標準テキスト ノートブックの準備

初回のみ、以下のコマンドでノートブックを作成・PDFを登録する：

```bash
# ノートブック作成
nlm notebook create "総監標準テキスト"

# 5管理PDF + キーワード集を追加（ノートブックIDを取得してから実行）
NOTEBOOK_ID=$(nlm notebook list | python3 -c "import sys,json; nb=json.load(sys.stdin); print([n['id'] for n in nb if n['title']=='総監標準テキスト'][0])")
TEXTBOOK_DIR="docs/textbook/技術士（総監）/テキスト/総監標準テキスト"

nlm source add --notebook "$NOTEBOOK_ID" "$TEXTBOOK_DIR/経済性管理.pdf"
nlm source add --notebook "$NOTEBOOK_ID" "$TEXTBOOK_DIR/人的資源管理.pdf"
nlm source add --notebook "$NOTEBOOK_ID" "$TEXTBOOK_DIR/情報管理.pdf"
nlm source add --notebook "$NOTEBOOK_ID" "$TEXTBOOK_DIR/安全管理.pdf"
nlm source add --notebook "$NOTEBOOK_ID" "$TEXTBOOK_DIR/社会環境管理.pdf"
nlm source add --notebook "$NOTEBOOK_ID" "docs/textbook/技術士（総監）/テキスト/総合技術監理キーワード集2026.pdf"
```

ノートブック一覧で「総監標準テキスト」が確認できたら準備完了。

### 利用可能ノートブック（確認済み）

| ノートブック名 | 用途 |
|---|---|
| 総監標準テキスト | 5管理の定義・根拠（要作成） |
| 記述式問題の模範解答例 | 論文・記述式の事例 |
| AIを使って考える全技術 | 技術全般の参考 |
| 各種白書（環境・防災・交通等） | 社会環境管理の事例・データ |

## 引数

```
/notebooklm-research <slug> [--notebooks "名前1,名前2"] [--axes principle,reference] [--auto]
```

| 引数 | 説明 |
|---|---|
| `<slug>` | キーワード slug（例: `discount-rate`） |
| `--notebooks` | クエリするノートブック名（省略時は「総監標準テキスト」を使用） |
| `--axes` | 強化したい弱軸（省略時は cem-qa で自動判定） |
| `--auto` | 承認ステップをスキップして一気に進む |

## 実行フロー

### Step 1: 前提確認とノートブック選択

```bash
nlm notebook list
```

1. 「総監標準テキスト」が存在するか確認する
2. なければ上記の初回セットアップ手順をユーザーに案内して停止
3. `--notebooks` 指定があればその名前でノートブックを特定する
4. 記事 MDX を Read して `title`・`section`・`description` を取得する

### Step 2: cem-qa でベーススコアと弱軸を特定

`cem-qa` エージェントを呼び出し、5 軸スコアを取得する。
`--axes` 指定がない場合は weighted < 2.5 の軸を弱軸として選ぶ。

弱軸とクエリ方針の対応：

| 弱軸 | クエリ方針 | 推奨ノートブック |
|---|---|---|
| コンテンツ原則（散文不足・Why 欠如） | 定義の背景・動機付け・具体例 | 総監標準テキスト |
| 参考資料（根拠薄い） | 該当章節の記述・数値・出典 | 総監標準テキスト |
| 試験論点（過去問連携不足） | 出題年度・問われ方・誤答パターン | 記述式問題の模範解答例 |
| 社会環境系キーワード | 最新データ・事例 | 各種白書 |

### Step 3: nlm cross query でリサーチ実行

弱軸ごとに `nlm cross query` を実行する（エージェントの Bash ツールで直接実行可能）：

```bash
# 基本構造（ノートブック名でクエリ）
nlm cross query --notebooks "総監標準テキスト" \
  "「{keyword}」について、定義・背景・5管理における位置づけ・
   試験で問われる論点・誤解しやすいポイントを詳しく教えてください。"

# 複数ノートブックをまとめてクエリ
nlm cross query --notebooks "総監標準テキスト,記述式問題の模範解答例" \
  "「{keyword}」の実務事例と論文での使われ方を教えてください。"
```

弱軸別クエリテンプレート：

```
コンテンツ（Why 欠如）:
  "「{keyword}」はなぜ必要か。投資・管理・技術との関係で動機付けを説明してください。"

参考資料（根拠）:
  "「{keyword}」に関連する章・節・数値・定義を原文で引用してください。"

試験論点:
  "「{keyword}」は過去問でどのように出題されていますか？
   正答のポイントと誤答になりやすいパターンを教えてください。"
```

取得した回答を構造化して保持する：
```
=== findings: {slug} ===
[コンテンツ] テキスト 第◯章より: 「...（引用）...」
[試験論点] 模範解答例より: R◯年 ◯問「...」
[事例] ◯◯白書より: ...
```

### Step 4: 記事への反映

findings を使って記事を編集する。Edit ツールで直接修正。

**補強の原則：**
- テキストの文言をそのまま転記しない（要約・再構成する）
- 各 H2 の散文導入を充実させる（§17）
- テキストが強調している注意点は `<Callout type="warn">` で視覚化（§7）
- 根拠が明確な記述は `<Callout type="info">` で補強
- `frontmatter.dateModified` を今日の日付に更新

**記事の構成で優先する補強箇所：**

| findings の種類 | 反映先 |
|---|---|
| Why の説明・背景 | 「{keyword} とは」節の散文導入 |
| 数式・展開式・具体例 | 「基本計算式」または関連節 |
| 試験論点・誤答パターン | `<Callout type="warn">` として追加 |
| 実務事例・白書データ | 「総合技術監理における位置づけ」節 |

### Step 5: cem-qa で再採点

再度 `cem-qa` を呼び出してスコアを確認する。

- `≥ 2.5` → Step 6 へ（目標スコアは 2.0 より高い 2.5 を設定）
- `< 2.5` かつイテレーション残あり → Step 3 に戻り追加クエリ
- `< 2.5` かつ 2 イテレーション消化 → 残課題を列挙して停止

### Step 6: 完了レポートとコミット

```
=== /notebooklm-research: {slug} 完了 ===
開始スコア: 2.15 → 終了スコア: 2.85
NotebookLM クエリ数: 3件
補強した内容:
  - 「投資と回収の時間的ずれ」の動機付け（総監標準テキスト 第1章）
  - 年ごとの NPV 展開式（総監標準テキスト 第1章）
  - 割引率↑→NPV↓の逆相関 Callout warn（模範解答例より）
```

コミットメッセージ：
```
content(pe): {slug} を NotebookLM 調査で内容補強（cem-qa {before}→{after}）
```

## 参照

- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価
- `.claude/content-principles.md` — コンテンツ品質ルール
- `.claude/skills/authoring/improve-article/SKILL.md` — 構造修正（本スキルと補完）
- `.claude/skills/quality/exam-keyword-cycle/SKILL.md` — 過去問起点の横断校正
- `docs/textbook/技術士（総監）/テキスト/総監標準テキスト/` — テキスト PDF 群（ノートブック登録元）
