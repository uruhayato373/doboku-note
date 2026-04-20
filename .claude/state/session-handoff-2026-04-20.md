---
date: 2026-04-20
type: session-handoff
supersedes: session-handoff-2026-04-19.md
related_plan: docs/project/25_exam-keyword-cycle-roadmap.md
status: mvp_trial_done_pr_pending
---

# 次セッション クイックスタート（2026-04-20）

`docs/project/25_exam-keyword-cycle-roadmap.md` の Phase 2/3 を実装し、続けて `/exam-keyword-cycle` の MVP 試運転を 1 サイクル完了した。**PR と Issue の作成は gh 認証未完了のため保留**。認証完了後に残作業をまとめて実行する。

## まず Read すべき 3 ファイル

1. **本ファイル** — 2026-04-20 終了時点のスナップショット
2. **`docs/project/25_exam-keyword-cycle-roadmap.md`** — ロードマップ本体（実装状況を反映済み）
3. **`docs/reviews/exam-keyword-cycle/2026-04-20-r07-primary-1-1.md`** — MVP 試運転の詳細ログ

## 現在の状態

### 1. ロードマップ 25（Phase 2/3）実装状況

| # | 項目 | 状態 | 実装物 |
|---|---|---|---|
| 2 | `--auto` 選択ロジック | ✅ 実装済 | `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` |
| 3 | weekly-review Agent F 組込み | ✅ 実装済 | `.claude/skills/management/weekly-review/SKILL.md` Agent F |
| 4 | `/distill-proofread-learnings --since "1cycle"` | ✅ 実装済 | `.claude/skills/management/distill-proofread-learnings/SKILL.md` |
| 5 | GitHub Actions Workflow | 🟡 骨組完成 | `.github/workflows/exam-keyword-cycle.yml`（remote trigger 接続待ち） |
| 6 | サイクル横断ダッシュボード | ⏳ 未着手 | 数サイクル蓄積後 |

### 2. 未コミット状態（develop 側の実装作業）

Phase 2/3 実装の成果物が `develop` ブランチで未コミットのまま残っている:

```
modified:
  .claude/skills/content/exam-keyword-cycle/SKILL.md
  .claude/skills/management/distill-proofread-learnings/SKILL.md
  .claude/skills/management/weekly-review/SKILL.md
  .obsidian/workspace.json
  docs/project/25_exam-keyword-cycle-roadmap.md

untracked:
  .claude/skills/content/exam-keyword-cycle/scripts/  （select-next-question.mjs）
  .github/workflows/exam-keyword-cycle.yml
```

**次セッションで即コミット推奨**。コミット案（1 コミットにまとめてよい）:

```
feat(exam-keyword-cycle): Phase 2/3 骨組実装（--auto, Agent F, 1cycle, workflow）
```

### 3. MVP 試運転（1 サイクル完了、PR 未作成）

**ブランチ**: `claude/exam-keyword-cycle-2026-04-20-r07-primary-1-1`（push 済み）

**コミット 3 本**（cycle ブランチ上）:
- `65e7ee37` content(pe): business-continuity-plan に BCM のサプライチェーン視点追加
- `4013ed66` content(pe): risk-management-plan に BCP との関連追記
- `8fc2d932` docs(exam-keyword-cycle): 2026-04-20 R07 Ⅰ-1-1 サイクルログ記録

**state 更新済**:
- `.claude/state/exam-keyword-cycles/progress.json` に R07 1-1 が covered 追加（status: in_review）
- `docs/reviews/exam-keyword-cycle/index.json` に 1 件目のサイクル追記

**PR 作成 URL**: https://github.com/uruhayato373/doboku-note/pull/new/claude/exam-keyword-cycle-2026-04-20-r07-primary-1-1

PR body テンプレは本ファイル末尾「保留作業」節に添付。

### 4. gh CLI 認証（保留中）

- `gh` インストール完了（v2.90.0, `C:\Program Files\GitHub CLI\gh.exe`）
- **認証未完了**: `gh auth login` 実行時、GitHub app がうまく起動しない状況
- エラー内容: （未確認 — 次セッションで切り分け）

**切り分け候補**:
- ブラウザのデフォルト設定問題 → `gh auth login --web false` でトークン貼付け方式に切替
- プロキシ/FW → 職場環境なら確認要
- SSO 要求 → Personal Access Token 発行 → `echo <TOKEN> | gh auth login --with-token`

### 5. 重大発見（未 Issue 化）

`.local/r2/posts/pe-comprehensive-management/r07-primary/article.mdx` **行 25** に OCR エラー疑い:

> 事業継続に関する**取機的手象**の教訓

「大規模災害の教訓」等の誤読と推測。原典 PDF `https://www.engineer.or.jp/c_topics/011/attached/attach_11181_1.pdf` との視覚突合が必要。

サイクル本体では修正せず Issue 化保留（過去問 MDX 修正は PDF 突合必須のため）。

## 次セッションで選べるアクション

### パスA: 認証完了 → PR/Issue 自動作成（最短）

1. `gh auth login` を別ターミナルで完走
2. 本ブランチの PR を作成（下記テンプレ使用）
3. OCR エラー疑いを Issue として起票（下記テンプレ使用）
4. develop ブランチに戻って Phase 2/3 実装分を 1 コミット → push → PR

### パスB: PAT 方式で認証回避

GitHub Personal Access Token を発行して:

```bash
echo <TOKEN> | "/c/Program Files/GitHub CLI/gh.exe" auth login --with-token
```

権限スコープ: `repo`, `read:org`, `workflow`

### パスC: Web から手動 PR/Issue 作成

認証トラブルを一旦棚上げして、ブラウザから直接:
- PR: 上記 URL を開いて本文テンプレ貼付
- Issue: `New Issue` → 下記テンプレ貼付

## 保留作業

### 1. 今サイクルの PR body テンプレ

```markdown
## 起点過去問
- **R07 Ⅰ-1-1**: BCP・BCM に関する設問（内閣府「事業継続ガイドライン 令和5年3月」準拠）
- [該当過去問ページ](/docs/pe-comprehensive-management-r07-primary#-1-1)
- 正答: **2**（BCM は委託先・調達先・供給先を含まない、という記述が誤り）

## 対象キーワードと視点
| キーワード | 視点タグ | 変更内容 |
|---|---|---|
| business-continuity-plan | 網羅性・関連付け | BCM の検討範囲にサプライチェーン（委託先・調達先・供給先）を含む旨を新節・ExamPoint に追加 |
| risk-management-plan | 関連付け | 「建設分野での適用」末尾に BCP・BCM との関連を追記し R07 Ⅰ-1-1 へ相互リンク |

## 変更サマリー（視点別）
- 網羅性: 1 件
- 関連付け: 2 件

## 重大な発見（Issue 化候補）
- `r07-primary/article.mdx` 行 25 の OCR エラー疑い: 「取機的手象」→ 原典 PDF 突合後に別途修正

## サイクル記録
- サイクルログ: `docs/reviews/exam-keyword-cycle/2026-04-20-r07-primary-1-1.md`
- 本 PR は MVP 試運転の 1 サイクル目

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

### 2. OCR Issue 起票テンプレ

```markdown
タイトル: [content] R07 Ⅰ-1-1 本文の OCR エラー疑い「取機的手象」
ラベル: content-quality, auto-generated

本文:
## 概要

`.local/r2/posts/pe-comprehensive-management/r07-primary/article.mdx` 行 25 に OCR 誤読疑い。

## 該当箇所

> 事業継続に関する**取機的手象**の教訓、関連制度の整備、…

「大規模災害の教訓」等の誤読と推測される。

## 対応方針

1. 原典 PDF `https://www.engineer.or.jp/c_topics/011/attached/attach_11181_1.pdf` の行 25 該当文を視覚突合
2. 周辺行の OCR エラーも同時確認（設問文・選択肢・解説すべて）
3. 修正 PR 作成

## 参考

- サイクルログ: `docs/reviews/exam-keyword-cycle/2026-04-20-r07-primary-1-1.md`
- 発見元サイクル PR: （上の PR URL を本 Issue 登録後に追記）
```

### 3. 認証完了後に実装したい拡張（保留）

`docs/project/25_exam-keyword-cycle-roadmap.md` には未記載だが、会話で合意した:

- **`/exam-keyword-cycle` Phase 1.5**: 重大発見 → `gh issue create --label content-quality` 自動起票
- **`.claude/scripts/lib/github-io.mjs`** 新設: PR/Issue 作成ヘルパー
- **Phase 6 を gh ベース書き換え**（手動フォールバック残す）

これらの追加項目は、Phase 2/3 実装がコミットされた後に **ロードマップ 25 に Phase 3.5 として追記** する方針。

## 関連ファイル

- `docs/project/25_exam-keyword-cycle-roadmap.md` — ロードマップ本体
- `docs/reviews/exam-keyword-cycle/2026-04-20-r07-primary-1-1.md` — 試運転ログ
- `docs/reviews/exam-keyword-cycle/index.json` — サイクル履歴
- `.claude/state/exam-keyword-cycles/progress.json` — カバレッジ状態
- `.claude/skills/content/exam-keyword-cycle/SKILL.md` — スキル本体
- `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` — `--auto` 実装
- `.github/workflows/exam-keyword-cycle.yml` — GitHub Actions 骨組
