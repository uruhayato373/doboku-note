# 過去問起点のキーワード校正サイクル ログ

`/exam-keyword-cycle` スキルが生成する校正サイクルの記録ディレクトリ。

## ファイル構成

| ファイル | 役割 |
|---|---|
| `index.json` | 全サイクルのメタ情報（日付・過去問・対象キーワード・PR 番号等） |
| `YYYY-MM-DD-{exam-slug}-{question-anchor}.md` | 各サイクルの詳細ログ（視点タグ・Before/After・スコア推移） |
| `README.md` | 本ファイル |

## 命名規則

- 日付: サイクル実施日（YYYY-MM-DD）
- exam-slug: 過去問ページの slug（例: `r06-primary`）
- question-anchor: 設問番号のアンカー（例: `1-35`）

例: `2026-04-20-r06-primary-1-35.md`

## 1 ファイルの構成

```markdown
---
date: YYYY-MM-DD
exam: r06-primary
question: 1-35
theme: 生物多様性・CITES
keywords_count: 6
---

# 過去問起点校正サイクル: {exam} {question-label}

## 起点過去問の論点
- ...

## キーワード別ログ

### 1. {slug}
**視点タグ**: ...
**cem-qa スコア**: X → Y
**Before**: > 引用
**After**: > 引用
**根拠**: ...
```

## 関連

- `.claude/skills/content/exam-keyword-cycle/SKILL.md` — 本サイクルの実行スキル
- `.claude/state/exam-keyword-cycles/progress.json` — カバー状況の永続化
- `.claude/knowledge/reference/content-principles.md` — 校正ルールの真実源
- `.claude/knowledge/reference/workflows.md` — 継続改善ループの位置づけ
