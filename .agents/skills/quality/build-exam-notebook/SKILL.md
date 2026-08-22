---
name: build-exam-notebook
description: >
  技術士総合技術監理部門の 1 次択一過去問 MDX を NotebookLM 専用 notebook に source として
  投入する Skill。MDX → MD 変換 + notebook 作成 + source upload + 検証の一連ワークフロー。
  audit-exam-mapping の needs_review 検証や横断頻度分析の基盤となる。
  Use when user asks to [過去問 notebook 構築, NotebookLM 過去問投入, 過去問 source 追加, /build-exam-notebook].
---

# /build-exam-notebook — 過去問 NotebookLM 専用 Notebook 構築

総監 1 次択一過去問 17 年分（H21〜R07）の MDX を NotebookLM の専用 notebook に投入し、過去問本体に grounded したクエリを可能にする Skill。

## 用途

1. **audit-exam-mapping needs_review 検証**: 教材ベース推論ではなく過去問本体に直接照合した判定が可能に
2. **横断頻度分析**: 「BCM は何年で出題されているか」を 17 年横断で集計
3. **問題文の semantic 検索**: 設問内容を概念で逆引き

## 関連ファイル

| ファイル | 役割 |
|---|---|
| `.Codex/scripts/build-exam-notebook.mjs` | MDX → MD 変換（JSX 削除、frontmatter 簡略化、U+FFFD 検出） |
| `.Codex/scripts/notebooklm-notebook-builder.mjs` | notebook 操作 CLI（find-or-create / list-sources / add-source / bulk-add） |
| `.Codex/scripts/notebooklm-cross-query.mjs` | 構築後のクエリ用（既存ラッパー） |
| `.tmp/exam-notebook/{year}-primary.md` | 変換結果（gitignore 配下） |
| `.tmp/exam-notebook/manifest-{label}.json` | bulk-add 用マニフェスト |

## 前提条件

- `notebooklm` CLI 認証済み（期限切れ時はユーザーが `notebooklm login` を手動実行）
- 対象年度の過去問 MDX が `.local/r2/posts/pe-comprehensive-management/{year}-primary/article.mdx` に存在

## サブコマンド

### `convert --year <year>` / `convert --years r03,r04,...`

MDX を変換し `.tmp/exam-notebook/{year}-primary.md` に出力。副作用なし、idempotent。

```bash
node .Codex/scripts/build-exam-notebook.mjs --year r07
node .Codex/scripts/build-exam-notebook.mjs --years r03,r04,r05,r06,r07
```

**変換ポリシー**:
- frontmatter: `title` / `source_pdf` / `year` のみ残す
- `## Ⅰ-1-N` / `## Ⅱ-1-N` 見出し、問題文、5 選択肢、`<details><summary>`: **残す**
- `<RelatedKeywords items={[...]} />`: **削除**
- `<ExamPoint summary items />`: plain markdown 化（**試験ポイント**: + bullet list）
- `<Callout>` 等他 JSX: 削除（本文だけ残す）
- `quiz-figures:start/end` マーカー: 削除
- U+FFFD 検出 → exit 1 + 年度名報告

### `build --years <list>` （変換 + 投入の連鎖実行）

1. `convert --years <list>` で MDX → MD 変換
2. マニフェスト JSON を生成（または既存を使用）
3. `notebook-builder.mjs bulk-add` で notebook 作成 + source 投入

```bash
# 1. 変換
node .Codex/scripts/build-exam-notebook.mjs --years r03,r04,r05,r06,r07

# 2. マニフェスト作成（年度ごとに { file, title } を列挙）
cat > .tmp/exam-notebook/manifest-r03-r07.json <<EOF
[
  { "file": ".tmp/exam-notebook/r03-primary.md", "title": "R03一次択一40問" },
  { "file": ".tmp/exam-notebook/r04-primary.md", "title": "R04一次択一40問" },
  { "file": ".tmp/exam-notebook/r05-primary.md", "title": "R05一次択一40問" },
  { "file": ".tmp/exam-notebook/r06-primary.md", "title": "R06一次択一40問" },
  { "file": ".tmp/exam-notebook/r07-primary.md", "title": "R07一次択一40問" }
]
EOF

# 3. notebook 構築（idempotent: 既存 source は --skip-existing で skip）
node .Codex/scripts/notebooklm-notebook-builder.mjs bulk-add \
  --notebook "総監一次択一過去問" \
  --manifest .tmp/exam-notebook/manifest-r03-r07.json \
  --skip-existing
```

### `verify`

`notebooklm source list -n <notebook> --json` で投入結果を検証。

```bash
node .Codex/scripts/notebooklm-notebook-builder.mjs list-sources --notebook "総監一次択一過去問"
```

各 source の `status: "ready"` を確認。`failed` があれば該当年度を `refresh` で再投入。

### `refresh --year <year>`

単一年度を再投入（MDX 改修時の差分反映）。

```bash
# 1. 既存 source を削除
node .Codex/scripts/notebooklm-notebook-builder.mjs delete-source \
  --notebook "総監一次択一過去問" \
  --title "R07一次択一40問"

# 2. 再変換
node .Codex/scripts/build-exam-notebook.mjs --year r07

# 3. 再投入
node .Codex/scripts/notebooklm-notebook-builder.mjs add-source \
  --notebook "総監一次択一過去問" \
  --file .tmp/exam-notebook/r07-primary.md \
  --title "R07一次択一40問"
```

## クエリ利用例

構築後、`notebooklm-cross-query.mjs` で直接クエリ可能:

```bash
# 単一 notebook
node .Codex/scripts/notebooklm-cross-query.mjs \
  --notebooks "総監一次択一過去問" \
  "R07 Ⅰ-1-24 の選択肢で問われている用語を 3 つ挙げてください"

# 教材と並列クエリ（needs_review 検証用途）
node .Codex/scripts/notebooklm-cross-query.mjs \
  --notebooks "総監一次択一過去問,総監標準テキスト" \
  "サプライチェーンは BCM の検討範囲に含まれるか"
```

## 段階リリース

| Phase | 範囲 | 投入年度 | 所要 |
|---|---|---|---|
| **MVP（完了 2026-05-11）** | R03-R07 5 年分 | r03 / r04 / r05 / r06 / r07 | ~25 分 |
| Phase 2 | R01-R02 追加 | r01 / r02 | ~10 分 |
| Phase 3 | 平成全年度 | h21-h30 一括 | ~25 分 |

## 既存 Skill との関係

| Skill | 関係 |
|---|---|
| `/audit-exam-mapping` | **下流利用者**。`verify-needs-review` 経由で本 notebook をクエリ |
| `/notebooklm-research` | 並列。キーワード深掘り（教材ベース）用、本スキルは過去問本体ベース |
| `/exam-keyword-cycle` | 独立。MDX 改修サイクルの結果が本 notebook の refresh トリガーになり得る |

## 失敗パターン

| 失敗 | 回避 |
|---|---|
| 認証期限切れ（exit 2） | `notebooklm login` でユーザーが再認証 → retry |
| source upload 失敗 | bulk-add は `--skip-existing` で再実行可能（既投入は skip） |
| 同一 title 重複 | bulk-add 開始時に既存 list と突合、`--skip-existing` で skip |
| U+FFFD 混入（convert exit 1） | 元 MDX を `/improve-article` 等で修正してから retry |
| title が filename になる | builder が自動 rename（CLI の --title は file source で無視される CLI の挙動を補正） |
| `source wait` が exit 1 で false-positive | builder は wait CLI の exit code を信頼せず list-sources で status 直接確認 |

## 検証実績（2026-05-11 MVP）

- 変換: R03-R07 5 年度すべて H2 40 個 / details 40 個 / JSX 残ゼロ
- 投入: 5 sources すべて `status: ready`
- クエリ検証: R07 Ⅰ-1-24（境界型 vs ゼロトラスト）の正答論点を citation 付きで正確に抽出
- notebook ID: `44ad13d4-2408-473f-9dbd-10a7dda89ae4`
