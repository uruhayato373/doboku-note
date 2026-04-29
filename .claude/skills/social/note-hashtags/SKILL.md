---
name: note-hashtags
description: >
  note 公開用ドラフト（docs/note-drafts/{NN-...}/article.md）の内容を解析して、note の上限である 99 個までのハッシュタグを生成し、{article_dir}/hashtags.txt に保存する Generator スキル。1 行 1 個・純粋ハッシュタグのみ・コメント無しでファイル全選択コピペで note に貼り付け可能。
  Use when user asks to [note ハッシュタグ生成, note タグ作成, hashtags.txt 生成, /note-hashtags].
user-invocable: true
---

# /note-hashtags — note ハッシュタグ 99 個生成

note.com は記事 1 本に最大 99 個までハッシュタグを設定でき、検索流入の主要導線。本スキルは記事内容を解析して上限まで活用したリストを生成し、`{article_dir}/hashtags.txt` に保存する。

## 引数

```
/note-hashtags {NN-...} [--max N]
```

| 引数 | 説明 |
|---|---|
| `{NN-...}` | 対象ドラフトディレクトリ名（例: `90-総監択一式17年分分析`）。`NN` 数値だけでも先頭一致で解決 |
| `--max N` | 上限を 99 から N 個に縮める（既定: 99） |

## 出力ファイル

`docs/note-drafts/{NN-...}/hashtags.txt`

**フォーマット要件**（ファイル全選択コピーで note に貼付できる前提）:
- 1 行 1 ハッシュタグ
- 全行が `#` で始まる
- コメント・空行・グループ区切り **禁止**
- 重複禁止
- 行数は 99 以下（既定）
- 改行コードはプロジェクト標準（macOS は LF）

## 生成ロジック

### Step 1: 記事内容の解析

```bash
ROOT="/Users/minamidaisuke/doboku-note"
F="$ROOT/docs/note-drafts/{NN-...}/article.md"

# 1. frontmatter（あれば category / tags 抽出）
# 2. 本文の見出し（## 〜 ####）
# 3. 内部リンク先 slug（ハッシュタグ候補のヒント）
grep -oE '/docs/pe-comprehensive-management-[a-z0-9-]+' "$F" | sort -u
# 4. 強調された語（**...**）
grep -oE '\*\*[^*]+\*\*' "$F" | sort -u
```

### Step 2: カテゴリ別テンプレート + 記事特有キーワード

**コアカテゴリ別テンプレート**（記事のジャンル判定で適用）:

| ジャンル判定 | コアテンプレート例 |
|---|---|
| 技術士総監 | `#技術士` `#技術士試験` `#技術士二次試験` `#総合技術監理` `#総合技術監理部門` `#総監` `#総監受験` `#総監択一` `#技術士総監` `#技術士受験` `#択一式` `#国家資格` `#PE` `#技術士補` `#二次試験` |
| 5管理分野 | `#経済性管理` `#人的資源管理` `#情報管理` `#安全管理` `#社会環境管理` `#リスクマネジメント` `#品質管理` `#コスト管理` `#工程管理` `#労働安全衛生` |
| 1級土木 | `#1級土木施工管理技士` `#土木施工管理技士` `#施工管理技士` `#土木施工管理` `#1級土木` `#建設業` |
| 学習・勉強法 | `#勉強法` `#資格勉強` `#資格試験` `#受験勉強` `#過去問` `#過去問分析` `#過去問演習` `#合格体験記` `#試験対策` `#独学` `#社会人勉強` `#社会人の学び直し` `#リスキリング` `#学び直し` `#効率的な勉強法` |
| 業界・職種 | `#土木` `#建設` `#土木工学` `#建設業` `#エンジニア` `#技術者` `#建設コンサルタント` `#ゼネコン` `#技術職` `#土木技術者` `#インフラ` `#公務員` `#DX` |
| 関連資格 | `#1級土木施工管理技士` `#コンクリート主任技士` `#コンクリート診断士` `#RCCM` `#技術士建設部門` `#建設部門` `#1級建築士` `#応用情報技術者` |
| 一般学習・キャリア | `#note` `#毎日note` `#学び` `#挑戦` `#自己啓発` `#キャリアアップ` `#大人の学び` `#社会人` `#国家試験` `#継続力` `#毎日投稿` `#note挑戦` `#自己投資` |

**記事特有キーワード**: 内部リンク先 slug や本文の頻出語から導出（例: `business-continuity-plan` → `#BCP` `#BCM` `#事業継続計画`、`pert-cpm` → `#PERT` `#CPM`、`maslow-hierarchy-of-needs` → `#マズロー` `#モチベーション理論`）。

**slug → ハッシュタグ変換マップ例**（必要に応じて拡張）:

| slug | ハッシュタグ候補 |
|---|---|
| business-continuity-plan | `#BCP` `#BCM` `#事業継続計画` |
| pert-cpm | `#PERT` `#CPM` |
| break-even-point | `#損益分岐点` |
| quality-control | `#QC七つ道具` `#新QC七つ道具` `#品質管理` |
| pdca | `#PDCA` |
| carbon-pricing | `#カーボンニュートラル` `#SDGs` |
| labor-standards-act | `#労働基準法` `#36協定` `#働き方改革` |
| value-engineering | `#VE` `#バリューエンジニアリング` |
| risk-assessment | `#リスクアセスメント` |
| heinrich-law | `#ヒューマンエラー` `#ハインリッヒの法則` |
| maslow-hierarchy-of-needs | `#マズロー` `#モチベーション理論` |
| mcgregor-xy-theory | `#リーダーシップ` |
| variable-work-hours | `#変形労働時間制` |
| flextime-system | `#フレックスタイム制` |
| npv-net-present-value | `#NPV` |
| process-capability-index | `#工程能力指数` |

### Step 3: 統合 + 上限調整

1. 該当する全テンプレートを結合
2. 内部リンク slug から派生ハッシュタグを追加
3. **重複削除**（同一文字列）
4. 99 個（または `--max N`）を超える場合は **記事特有キーワード優先** で残す（コアテンプレートより記事独自シグナルを優先）
5. 1 行 1 個で書き出し

### Step 4: 検証

```bash
F="$ROOT/docs/note-drafts/{NN-...}/hashtags.txt"
echo "総行数: $(wc -l < "$F" | tr -d ' ')"
echo "ハッシュタグ行数: $(grep -cE '^#' "$F")"
echo "空行: $(grep -c '^$' "$F")"
echo "コメント: $(grep -cE '^#[[:space:]]' "$F")"
echo "重複: $(sort "$F" | uniq -d | wc -l | tr -d ' ')"
```

期待値: `総行数 == ハッシュタグ行数 ≤ 99 / 空行 0 / コメント 0 / 重複 0`。

## 報告フォーマット

```
## /note-hashtags 結果

対象: docs/note-drafts/{NN-...}/article.md
出力: docs/note-drafts/{NN-...}/hashtags.txt

生成タグ: N 個（上限 99）
内訳:
- コアテンプレート: M 個
- 記事特有: K 個（slug から N 個抽出）

検証: 行数 N / 空行 0 / コメント 0 / 重複 0 → OK
```

## 既存スキル・エージェントとの関係

| 関連 | 役割 |
|---|---|
| `/social-post note ...` | note 本文の **生成** |
| `/note-hashtags` | note ハッシュタグの **生成** |
| `/note-prepublish-review` | 公開前統合チェック（hashtags.txt 存在を Phase 1 で検証） |
| `note-link-injector` agent | 本文へのリンク注入 |

## 制約

- **対象は `docs/note-drafts/` 配下のみ**
- **既存 hashtags.txt があれば上書き**（バックアップは取らない、git で履歴管理）
- **記事 1 本ずつ実行**（バルク非対応）
- **slug → hashtag マップは本ファイルが真実源**。新カテゴリ・新キーワードを追加するときは本 SKILL.md を編集
