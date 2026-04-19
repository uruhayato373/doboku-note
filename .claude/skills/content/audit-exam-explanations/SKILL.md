---
name: audit-exam-explanations
description: >
  過去問 MDX（primary/secondary）に含まれる破損解説パターンを検出する Evaluator スキル。
  文頭欠落・ExamPoint summary 欠落・Markdown 構文破損（**...❌**）の 3 種を正規表現で走査し、
  .claude/state/broken-explanations.json に出力する。修正は行わず検出のみ。
  Use when user asks to [解説監査, 破損解説スキャン, /audit-exam-explanations].
---

## 用途

過去問 MDX の **<details> ブロック内に混入した破損解説** を検出する Evaluator 専任スキル。修正は行わない（Generator 側の `/improve-article` や人間が担当）。

## 検出パターン

| ID | パターン | 例（破損形） | 正しい形 |
|---|---|---|---|
| **P1-headless** | 解説の文頭が閉じカギから始まる（本文欠落） | `1. 」と規定されている ✅` | `1. 法第 31 条に「〜〜」と規定されている ✅` |
| **P2-examPoint-empty** | ExamPoint の summary が欠落または `」` だけ | `summary="」とされている"` | `summary="特殊車両の通行許可申請は、道路管理者が複数でも一に申請でよい"` |

いずれも AI 生成時にソース（正答 PDF）を確実に参照せず、出力が途切れた結果と推定される。

**検出対象外（意味破損）**: 選択肢の解説が設問と同じ内容なのに ❌ マークがついている等の「意味の矛盾」は syntactic には分離不能なため本スキルでは検出しない。`/improve-article` の対話フローで読者視点で拾う。

## 引数

```
/audit-exam-explanations [--category <cat>] [--topic <keyword>]
```

| 引数 | 既定 | 説明 |
|---|---|---|
| `--category` | `civil-construction-1` | 対象カテゴリ（`civil-construction-1` / `pe-comprehensive-management`） |
| `--topic` | なし | 絞り込みキーワード（例: `港則法`）。指定時は該当用語が前後 30 行内にある検出のみ残す |

## 実行

```bash
# 全件スキャン
node .claude/skills/content/audit-exam-explanations/scripts/audit.mjs

# カテゴリ指定
node .claude/skills/content/audit-exam-explanations/scripts/audit.mjs --category=civil-construction-1

# トピック絞り込み（例: 港則法）
node .claude/skills/content/audit-exam-explanations/scripts/audit.mjs --topic=港則法
```

## 出力

`.claude/state/broken-explanations.json`

```json
{
  "meta": { "generated_at": "...", "category": "civil-construction-1", "topic": null },
  "summary": {
    "scanned_files": 39,
    "files_with_issues": 11,
    "total_findings": 64,
    "by_pattern": { "P1-headless": 18, "P2-examPoint-empty": 46 }
  },
  "findings": [
    { "file": "...primary-h28-a/article.mdx", "pattern": "P1-headless", "line": 2140, "snippet": "1. 」と規定されている ✅" },
    ...
  ]
}
```

## 連携パターン

### 単発監査 + 個別修正

```
/audit-exam-explanations               # 全体像を把握
jq '.findings[] | select(.file | contains("h28"))' .claude/state/broken-explanations.json
/improve-article <対象スラグ>           # 個別に対話的修復
```

### 週次ヘルスチェック

`/weekly-review` や `/weekly-improve` の一部として組み込み、破損件数の推移を監視する。

### pre-commit との連動

`scripts/pre-commit-mdx.mjs` は本スキルの `detect.mjs` を import し、ステージされた MDX に破損が含まれる場合 **warning** を表示（ブロックはしない）。既存の 64 件に対してコミット不能を避けるため reject にはしない。

## 制約

- **検出専任・修正しない**（Evaluator/Generator 分離原則）
- false positive の可能性: 正規表現ベースなので、意図的な引用（例: 本文中に「**の許可 ❌**」と書かれているコラム）が稀にヒットする
- false negative の可能性: AI 生成由来の未知の破損パターンは拾えない。新パターンが見つかれば `detect.mjs` の `PATTERNS` 配列に追加する

## 参照

- `scripts/detect.mjs` — 検出ロジック本体（pre-commit からも import）
- `scripts/audit.mjs` — CLI
- `.claude/skills/content/improve-article/SKILL.md` — 検出結果に基づく対話型修復
- `scripts/pre-commit-mdx.mjs` — pre-commit 連動
