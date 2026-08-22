---
name: verify-exam-coverage
description: >
  キーワードページに対し、そのキーワードが登場する全過去問を横断的に洗い出し、記事が「解説として十分か」（誤り選択肢・正答肢・ExamPoint items の論点がカバーされているか）を検証する。未カバー論点と補強方針を表形式で提示し、承認後に補強を適用する。
  Use when user asks to [過去問カバー確認, 解説として十分か, 校正して過去問対応させたい, /verify-exam-coverage, 練られているか].
user-invocable: true
---

キーワードページの解説品質を **「該当キーワードが登場する過去問の論点をすべて説明できているか」** の観点で検証する Evaluator + 補強提案スキル。

## 設計思想

- キーワードページは**試験対策コンテンツ**である以上、「定義と背景が網羅的」だけでは不十分で、**出題された論点に対する解説として十分**であることが品質の核心
- 過去問の「誤り選択肢の引っかけパターン」「正答の判断根拠」「ExamPoint の暗記項目」は、受験者が現場で必要とする知識そのもの
- このスキルは、本文と過去問を突き合わせて**網羅性のギャップ**を可視化し、補強方針を示す

## 引数

```
/verify-exam-coverage [slug または MDX パス] [--apply]
```

- **`slug`**: 対象キーワードページの slug（例: `cash-flow-statement`）
- **MDX パス**: `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx` 等
- **`--apply`**: レポート提示後、ユーザ承認があれば補強 Edit を自動適用
- 省略時: `git diff --name-only HEAD` から MDX キーワードページを対象

## 実行手順

### Step 1: 対象 slug の確定

- 引数パス → slug 抽出
- slug → MDX パス正規化（`.local/r2/posts/{category}/{slug}/article.mdx`）
- ファイル存在確認

### Step 2: 過去問横断検索

以下のディレクトリを Grep で検索し、slug または記事タイトル（`title:` frontmatter 値）が言及されている過去問ファイルを列挙する。

**検索対象パス**:
- 技術士総監: `.local/r2/posts/pe-comprehensive-management/{h,r}*-primary/article.mdx` と `-secondary/article.mdx`
- 1 級土木: `.local/r2/posts/civil-construction-1/primary/*.mdx` と `secondary/*.mdx`

**検索パターン**:
- slug の RelatedKeywords 参照: `{ label: "...", slug: "{slug}" }`
- タイトルの本文言及: キーワード文字列（日本語）
- 関連 ExamPoint items の記述

### Step 3: 各過去問からの論点抽出

各過去問ファイルから、該当問題のブロックを抽出し、以下を切り出す:

1. **問題文**: `## Ⅰ-1-N` から `<details>` までの本文
2. **誤り選択肢の解説**: `❌` 付きの行（誤りの根拠）
3. **正答の解説**: `✅` 付きの行（正答の根拠）
4. **ExamPoint items**: `<ExamPoint>` 内の `items={[ ... ]}` 配列
5. **RelatedKeywords**: 当該キーワードの slug が含まれていることの確認

論点は重複排除し、1 論点 1 行に正規化する。

### Step 4: 記事本文のカバー状況判定

記事 MDX を Read し、以下の要素から「扱っているトピック」を抽出:

- H2/H3 見出し
- 本文中の**太字**（概念の強調）
- ExamPoint items
- 数式・表のラベル

各過去問論点について、記事内での出現を検索して以下の 3 段階で判定:

| 判定 | 条件 |
|---|---|
| ✅ covered | 本文とExamPointの両方で該当概念を説明 |
| ⚠️ partial | ExamPoint のみ記載 / 本文に概念名のみで説明が浅い |
| ❌ missing | 記事に記述なし |

### Step 5: Gap レポート表

以下の形式で出力:

```
=== /verify-exam-coverage: <slug> ===
対象: <MDX パス>
検出過去問: N 問

| 過去問 | 論点 | カバー状況 | 備考 |
|---|---|---|---|
| R7-Ⅰ-1-7 | 3区分は「営業・投資・財務」のみ | ✅ covered | ExamPoint item あり |
| R6-Ⅰ-1-7 | 減価償却費の自己金融効果 | ❌ missing | 概念名が不在 |
| R6-Ⅰ-1-7 | 流動資産 ≠ CF期末残高 | ⚠️ partial | 肯定側のみ記述 |
| ... | ... | ... | ... |

=== Summary ===
過去問数: N
論点数: M
✅ covered: X / ⚠️ partial: Y / ❌ missing: Z

=== 補強方針 ===
[missing 論点ごとに追加すべき内容の骨子を提示]
```

### Step 6: ユーザ承認後の補強適用

以下のプロンプトで確認:

```
補強を適用しますか？ (yes / no / 個別選択)
```

**承認後の適用パターン**:
- `missing` 論点ごとに、既存セクションへの追記か、新規 H3 サブ節の追加を判断
- 既存セクションの流れを壊さないように挿入位置を選定
- ExamPoint items の更新（missing → covered 移行分を追加）
- 修正は Edit ツールのみ使用（AGENTS.md の CRLF/LF 保持原則）
- 追記後に `node .Codex/scripts/lint-mdx-mobile.mjs <path>` を実行、HIGH ゼロを確認

### Step 7: 最終レポート

補強適用後に以下を報告:
- 補強した論点の件数
- 追加した行数（git diff --stat 相当）
- lint 結果（HIGH/MEDIUM/LOW）
- 過去問カバー率の before/after

## 対象スコープ

**対象**:
- 技術士総監キーワードページ（`.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx`）
- 1 級土木キーワード/教科書ページ（`.local/r2/posts/civil-construction-1/textbook/{slug}.mdx` 等）

**対象外**:
- 過去問ページ自体（`{h,r}*-primary/article.mdx`）— これらは「出題元」として参照するだけ
- ガイド系ページ（`guide/*.mdx`）— 過去問との1:1対応が成立しにくい
- セクション扉ページ（`section-*/article.mdx`, `exam-index/article.mdx`）

## 出力フォーマット例

```
=== /verify-exam-coverage: cash-flow-statement ===
対象: .local/r2/posts/pe-comprehensive-management/cash-flow-statement/article.mdx
検出過去問: 5 問（R7 / R6 / R3 / R1 / H30）

| 過去問 | 論点 | 現状 |
|---|---|---|
| R7-Ⅰ-1-7 | 3区分は営業・投資・財務のみ | ✅ |
| R7-Ⅰ-1-7 | 「社会貢献活動」は存在しない | ⚠️ ExamPointのみ |
| R6-Ⅰ-1-7 | 減価償却費の自己金融効果 | ❌ |
| R6-Ⅰ-1-7 | 流動資産 ≠ CF期末残高 | ❌ |
| R3-Ⅰ-1-1 | 配当は財務、設備取得は投資、税金は営業 | ✅ |
| H30-Ⅰ-?-? | CF計算書の定義（期間・区分・現金同等物） | ✅ |

=== 補強方針 ===
1. 「社会貢献活動は存在しない」を本文3区分冒頭に明示
2. 「減価償却費の自己金融効果」を H3 サブ節として新設
3. 「流動資産 ≠ CF期末残高」を財務三表節に H3 で追加

補強を適用しますか？ (yes / no / 個別選択)
```

## アンチパターン

- **過去問で問われていない論点を勝手に追加しない** — content principle §5 の「原則に沿わない過剰記述を避ける」に反する
- **新規キーワードページを作成しない** — memory `feedback_no_new_keyword_pages` に従い、他キーワードの論点は既存ページへの統合で処理
- **重複する論点を個別カウントしない** — 複数過去問で同じ論点が出題されていても 1 件として扱う
- **記事の主題からズレる論点を追加しない** — キーワード本来の範囲外は参考情報にとどめる
- **ExamPoint items を 8 個以上に膨らませない** — 過剰な items は視認性を下げる、優先度の高い 5-7 件に絞る
- **補強提案を承認前に勝手に適用しない** — Step 6 のユーザ確認は必須
- **lint 検査を省略しない** — 補強後に必ず lint-mdx-mobile を走らせ、新規違反ゼロを確認

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| 過去問が 0 件検出 | slug が過去問の RelatedKeywords に未登録 | `/exam-backlinks` を先に走らせて双方向リンクを整備 |
| 論点の過剰検出 | 同一論点が複数過去問で問われている | Step 3 の論点正規化で重複排除 |
| 補強で CRLF 混在 | 誤って Write ツールを使用 | Edit ツールのみ使用、CRLF 保持を確認 |
| lint HIGH 発生 | 長大な太字・導入文欠落 | 修正してから再適用 |

## 関連スキル・エージェント

- `/review-mobile` — モバイル視認性（表・太字・導入文）
- `/check-mdx --rules syntax` — MDX 構文・ビルド検証
- `/check-mdx --rules links` — 外部/内部リンクの生存確認
- `/exam-backlinks` — 過去問 ↔ キーワードの双方向リンク整備（本スキルの前提）
- `cem-qa` エージェント — 5 軸ルーブリック総合評価（本スキルは「解説網羅性」軸の深堀り）
- `/simplify` — 変更 diff の reuse/quality/efficiency レビュー（本スキルは過去問対応に特化）

## 参照

- `AGENTS.md` — ハーネス設計原則、実装時の行動原則
- `.Codex/knowledge/reference/content-principles.md` — コンテンツ原則 §5（ExamPoint 配置）、§9（参考資料）
- `.Codex/knowledge/reference/content-authoring.md` — MDX コンポーネント・過去問構造
- memory: `feedback_no_new_keyword_pages` — 新規ページ作成しない方針（本スキルは既存ページの補強のみ）
