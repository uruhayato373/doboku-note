# 19. 1級土木 過去問解説スタイル統一計画

**作成日**: 2026-04-16
**ステータス**: 計画策定完了、Wave 1 未着手
**関連**: 技術士総監の過去問スタイル（`pe-comprehensive-management/r*-primary/article.mdx`）を基準に統一

---

## 1. 目的

1級土木施工管理技士の過去問解説（`civil-construction-1/primary-*/article.mdx`）のスタイルを、技術士総監の過去問解説と統一する。現在の civil-construction-1 スタイルはテーブル + 水平線ベースで、コンポーネント活用がなく視認性が低い。

---

## 2. 現状（Before）

```
<details>
<summary>解答・解説</summary>

**正答：N**

---

**ポイント**

解説テキスト...

---

**各選択肢の検証**

| 選択肢 | 正誤 | 解説 |
|:---:|:---:|---|
| 1 | ❌ | 解説テキスト |
| **2** | **⭕** | **正答の解説** |
| 3 | ❌ | 解説テキスト |
| 4 | ❌ | 解説テキスト |

</details>
```

### 問題点

- `---`（水平線）で区切る構造が冗長
- 正誤テーブル（4列 × 4行）がモバイルで横スクロール発生
- `⭕` `❌` 記号がテーブル内にあり視認性が低い
- `<ExamPoint>` が未使用（試験ポイントの構造化なし）
- `<RelatedKeywords>` が未使用（キーワードページへの導線なし）
- 正答選択肢の行が太字で潰れている

---

## 3. 目標（After）

技術士総監スタイル（`pe-comprehensive-management/r*-primary/article.mdx`）に準拠:

```
<details>
<summary>解答・解説</summary>

**正答：N**

1. 解説テキスト ✅
2. **誤りの解説 ❌**
3. 解説テキスト ✅
4. 解説テキスト ✅

<ExamPoint
  summary="試験ポイントの要約"
  items={[
    "ポイント1",
    "ポイント2",
  ]}
/>

<RelatedKeywords items={[
  { label: "キーワード名", slug: "keyword-slug" },
]} />

</details>
```

### 変換ルール

| 項目 | Before (civil) | After (統一) |
|---|---|---|
| 正誤表示 | テーブル `\| 選択肢 \| 正誤 \| 解説 \|` | 番号付きリスト `1. 解説 ✅` / `2. **解説 ❌**` |
| 選択肢番号 | `(1)` `(2)` `(3)` `(4)` | `1.` `2.` `3.` `4.` — リスト内では裸番号 |
| 正答マーク | テーブル内 `**⭕**` | リスト行末 `✅` |
| 誤答マーク | テーブル内 `❌` | リスト行末 `❌`、誤答行を太字 |
| ポイント | `**ポイント**` テキスト + `---` 区切り | `<ExamPoint summary="..." items={[...]} />` |
| 水平線 | `---` × 2 | 削除（コンポーネントが視覚的区切り） |
| 関連キーワード | なし | `<RelatedKeywords>` 追加（該当する場合のみ） |

### 注意事項

- 1級土木の選択肢は4択 `(1)〜(4)`、技術士総監は5択 `1.〜5.`
- 変換後も選択肢番号は裸の `1.` `2.` `3.` `4.` にする（`(1)` は問題文中の表記、解説リスト内では Markdown 番号付きリスト）
- `<ExamPoint>` は解説ブロック内（`<details>` 内）に配置 — content-principles §5 の「キーワードページの ExamPoint 制限」は過去問解説には適用されない
- `<RelatedKeywords>` は該当するキーワードページが存在する場合のみ追加
- CRLF 改行コードを保持（`transformMdxFile` 使用）

---

## 4. 対象ファイル一覧

### primary（第1次検定）: 24 ファイル

| 年度 | 問題A | 問題B |
|---|---|---|
| R07 | `primary-r07-a` (66問) | `primary-r07-b` (35問) |
| R06 | `primary-r06-a` (66問) | `primary-r06-b` (35問) |
| R05 | `primary-r05-a` (61問) | `primary-r05-b` (35問) |
| R04 | `primary-r04-a` (61問) | `primary-r04-b` (35問) |
| R03 | `primary-r03-a` (61問) | `primary-r03-b` (35問) |
| R02 | `primary-r02-a` (61問) | `primary-r02-b` (35問) |
| R01 | `primary-r01-a` (61問) | `primary-r01-b` (35問) |
| H30 | `primary-h30-a` (61問) | `primary-h30-b` (35問) |
| H29 | `primary-h29-a` (61問) | `primary-h29-b` (35問) |
| H28 | `primary-h28-a` (61問) | `primary-h28-b` (35問) |
| H27 | `primary-h27-a` (61問) | `primary-h27-b` (35問) |
| H26 | `primary-h26-a` (61問) | `primary-h26-b` (35問) |

### secondary（第2次検定）: 7 ファイル

- `secondary-r03` 〜 `secondary-r06`（年度別）
- `secondary-concrete-past-problems`
- `secondary-construction-plan-past-problems`
- `secondary-experience-writing-guide`

**合計: 31 ファイル、約 1,500 問**

---

## 5. 実行計画（Wave 方式）

### Wave 1: R07（試作・検証）

| ファイル | 問題数 | 状態 |
|---|---|---|
| `primary-r07-a` | 66 | 未着手 |
| `primary-r07-b` | 35 | 未着手 |

**目的**: 変換ルールの妥当性を検証。問題なければ Wave 2 以降に展開。

### Wave 2: R06〜R04（直近3年分）

| ファイル | 問題数 | 状態 |
|---|---|---|
| `primary-r06-a` | 66 | 未着手 |
| `primary-r06-b` | 35 | 未着手 |
| `primary-r05-a` | 61 | 未着手 |
| `primary-r05-b` | 35 | 未着手 |
| `primary-r04-a` | 61 | 未着手 |
| `primary-r04-b` | 35 | 未着手 |

### Wave 3: R03〜R01

| ファイル | 問題数 | 状態 |
|---|---|---|
| `primary-r03-a` | 61 | 未着手 |
| `primary-r03-b` | 35 | 未着手 |
| `primary-r02-a` | 61 | 未着手 |
| `primary-r02-b` | 35 | 未着手 |
| `primary-r01-a` | 61 | 未着手 |
| `primary-r01-b` | 35 | 未着手 |

### Wave 4: H30〜H26

| ファイル | 問題数 | 状態 |
|---|---|---|
| `primary-h30-a` | 61 | 未着手 |
| `primary-h30-b` | 35 | 未着手 |
| `primary-h29-a` | 61 | 未着手 |
| `primary-h29-b` | 35 | 未着手 |
| `primary-h28-a` | 61 | 未着手 |
| `primary-h28-b` | 35 | 未着手 |
| `primary-h27-a` | 61 | 未着手 |
| `primary-h27-b` | 35 | 未着手 |
| `primary-h26-a` | 61 | 未着手 |
| `primary-h26-b` | 35 | 未着手 |

### Wave 5: secondary（第2次検定）

| ファイル | 問題数 | 状態 |
|---|---|---|
| `secondary-r03` | 〜24 | 未着手 |
| `secondary-r04` | 〜25 | 未着手 |
| `secondary-r05` | 〜26 | 未着手 |
| `secondary-r06` | 〜20 | 未着手 |
| `secondary-concrete-past-problems` | 〜6 | 未着手 |
| `secondary-construction-plan-past-problems` | 〜17 | 未着手 |
| `secondary-experience-writing-guide` | 〜6 | 未着手 |

---

## 6. 変換方法

### 機械変換（スクリプト）で対応可能な部分

- `---` 水平線の削除
- `**ポイント**` → `<ExamPoint summary="..." items={[...]} />` の構造化（ポイント文を summary に、詳細がある場合は items に分割）
- 正誤テーブル → 番号付きリストへの変換
- `⭕` → `✅`、正答行の太字調整

### 人間判断が必要な部分

- `<ExamPoint>` の `summary` と `items` の内容設計（ポイント文の適切な分割）
- `<RelatedKeywords>` の追加（対応するキーワードページの存在確認）
- 解説テキストの品質確認

### 推奨アプローチ

Wave 1（R07）は**手動 + LLM 支援**で丁寧に変換し、変換パターンを確立。
Wave 2 以降は**スクリプトで機械変換 → LLM で品質チェック**の半自動方式。

---

## 7. 検証基準

各 Wave 完了時に以下を確認:

1. `node .claude/scripts/lint-mdx-mobile.mjs <file>` で新規 HIGH ゼロ
2. 文字化け（U+FFFD）ゼロ
3. ブラウザで解答・解説の表示確認（`<details>` の開閉動作含む）
4. `<ExamPoint>` が `<details>` 内に正しく表示される
5. `<RelatedKeywords>` のリンクが有効（存在するキーワードページへのリンク）

---

## 8. 関連ドキュメント

- `.claude/content-principles.md` — コンテンツ品質ルール（§5 ExamPoint、§9 参考資料）
- `.claude/reference/exam-content-policy.md` — 試験別コンテンツ整備方針
- `docs/project/13_quality-cycle-architecture.md` — 品質サイクル全体像
