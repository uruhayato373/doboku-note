# 販売パッケージ仕様

## 1. パッケージ名

初版フォルダ名：`claude-code-civil-essay-kit`

実際のスキル名候補：`draft-civil-experience-essay`

- lowercase・hyphen区切り
- 64文字未満
- 動作を表す名称

実ファイルを作成する段階では、skill-creatorの規則に従い `init_skill.py` から初期化する。出力先は未決定のため、本企画ではスキル本体をまだ生成しない。

## 2. 配布物の構成

```text
claude-code-civil-essay-kit/
├── START-HERE.pdf
├── LICENSE.txt
├── DISCLAIMER.txt
├── .claude/
│   ├── skills/
│   │   └── draft-civil-experience-essay/
│   │       ├── SKILL.md
│   │       ├── references/
│   │       │   ├── civil-1.md
│   │       │   ├── civil-2.md
│   │       │   ├── evidence-policy.md
│   │       │   └── rubric.md
│   │       ├── scripts/
│   │       │   ├── check-answer-length.mjs
│   │       │   ├── check-required-fields.mjs
│   │       │   └── check-placeholders.mjs
│   │       └── assets/
│   │           ├── project-input.template.md
│   │           ├── answer.template.md
│   │           └── review.template.md
│   └── agents/
│       ├── civil-essay-writer.md
│       └── civil-essay-reviewer.md
├── inputs/
│   ├── questions/
│   ├── references/
│   └── user-experience/
├── outputs/
│   ├── drafts/
│   ├── reviews/
│   └── approved/
└── examples/
    ├── sample-question.md
    ├── sample-project-input.md
    ├── sample-draft.md
    └── sample-review.md
```

skill内部にはREADME等の補助文書を増やさず、購入者向け説明はルートの `START-HERE.pdf` に集約する。

## 3. SKILL.mdの責務

SKILL.mdは500行未満を目標とし、次だけを保持する。

- 対象試験と起動条件
- 入力ファイルの検査
- 1級／2級ルーティング
- Generator→Evaluator→人間承認の手順
- 禁止事項
- 呼び出すreferencesとscripts
- 出力形式

試験別の詳細、字数表、ルーブリックは `references/` へ分ける。

### frontmatter案

```yaml
---
name: draft-civil-experience-essay
description: Create and review draft experience essays for Japan's first- and second-class civil construction management examinations from a user-provided question and verified project facts. Use when Claude Code must extract requirements, build an outline, draft an experience-based answer, check length and structure, and produce a human-review report without inventing projects, roles, quantities, standards, or grading claims.
---
```

## 4. 入力スキーマ

`inputs/user-experience/project-input.md`：

```markdown
# 工事経験入力シート

## 基本情報
- 対象級: 1級 / 2級
- 工事名:
- 工事場所:
- 工期:
- 発注者区分:
- 自分の立場:
- 担当業務:

## 工事内容
- 主な工種:
- 施工量:
- 使用機械・材料:
- 現場条件:

## 記述対象
- 管理テーマ:
- 実際に発生した課題:
- 検討した内容:
- 採用した処置:
- 結果・評価:

## 確認
- [ ] 上記は本人が実際に経験した工事である
- [ ] 不明な数値を推測で埋めていない
- [ ] 会社・顧客の機密情報を匿名化した
```

空欄をClaude Codeが推測で補完してはならない。`UNKNOWN`一覧を先に出し、答案生成を停止する条件を定義する。

## 5. 出力スキーマ

```text
outputs/
├── drafts/{task-id}.md
├── reviews/{task-id}-review.md
└── approved/{task-id}.md
```

ドラフトfrontmatter：

```yaml
---
taskId: sample-001
exam: civil-1
status: needs-review
questionSource: inputs/questions/sample-question.md
projectSource: inputs/user-experience/project-input.md
unknowns: []
generatedAt: YYYY-MM-DD
---
```

状態遷移：

```text
draft → needs-review → needs-rework → revised → needs-review
                       └────────────→ verified → approved
```

`approved`への変更は購入者本人だけが行う。

## 6. 必須検査

### 機械検査

- 必須入力の空欄
- 答案文字数
- 必須見出し・設問番号
- `UNKNOWN`・`TODO`・`要確認`の残存
- 現場固有数値の不自然な追加
- プレースホルダ `〇〇` の一覧
- U+FFFD等の文字化け

### Evaluator検査

- 問題要求への対応
- 現場状況→課題→検討→処置→評価の連鎖
- 1級／2級の要求レベル
- 本人入力との矛盾
- 一般論だけになっていないか
- 断定できない採点基準を使っていないか

## 7. ガードレール

- 本人が経験していない工事を答案化しない
- 問題文を創作しない
- 工期、施工量、役割、規格値を推測しない
- 法定・規格固定値と現場固有値を区別する
- 「採点者」「添削者」「合格保証」を名乗らない
- `--dangerously-skip-permissions`を導入手順で推奨しない
- APIキー、Cookie、顧客情報を入力例に含めない
- 原典不明のPDFを配布物へ含めない

## 8. サンプルデータ

サンプルは完全な架空工事と明記し、実在の会社・自治体・工事・受検者と関係しない内容にする。法令・規格値を使う場合は一次資料と確認日を添える。

サンプル答案は「合格答案」「公式模範解答」と呼ばず、「操作確認用の答案案」とする。

## 9. 技術士版への拡張

土木版が安定した後、次を追加する。

```text
.claude/skills/draft-professional-engineer-essay/
├── SKILL.md
├── references/
│   ├── construction-division.md
│   ├── comprehensive-management.md
│   ├── question-constraints.md
│   ├── evidence-policy.md
│   └── tradeoff-rubric.md
└── scripts/
    ├── check-question-coverage.mjs
    ├── check-section-length.mjs
    └── check-citations.mjs
```

技術士版は、所属組織、業界、我が国のスコープを設問文から判定し、時事政策・統計は公開時点の一次資料確認を必須にする。

