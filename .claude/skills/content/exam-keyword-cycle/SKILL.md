---
name: exam-keyword-cycle
description: >
  過去問 1 問を起点に、その問題が参照しているキーワード群を最小限に校正する
  バッチ志向スキル。`--year` 指定で 1 年度（R04-primary など）の全問を
  夜間バッチで一気通貫処理する用途を想定。PR・Umbrella Issue・詳細ログは
  持たず、progress.json の covered 更新と 1 サイクル = 1 コミット = push
  の 3 ステップに特化。
  Use when user asks to [過去問起点の校正, キーワードサイクル, /exam-keyword-cycle, 夜間バッチ校正].
---

# /exam-keyword-cycle — 過去問起点キーワード校正（バッチモード）

## 目的

**最低限の品質向上**を軸に、過去問 1 問ずつキーワードを補強していく運用スキル。

- 1 サイクル = 過去問 1 問 × 関連キーワード 2〜4 件の補強
- バッチで夜間に 1 年度分を一括処理できる構造
- PR・Umbrella・詳細ログ・キーワード別コミットは**持たない**（2026-04-22 リファクタリング）

## 引数

```
/exam-keyword-cycle [--exam <slug>] [--question <anchor>] [--year <slug>] [--batch] [--auto]
```

| 引数 | 用途 |
|---|---|
| `--exam` + `--question` | 単一サイクル。`--exam r04-primary --question 1-11` |
| `--year <slug>` + `--batch` | 年度バッチ。`--year r04-primary --batch` で未カバー全問を順次処理 |
| `--auto` | state から次の未カバー 1 問を自動選択（単発用途） |

## 運用方針（必読）

- **新規キーワードページは作らない**。`keyword-2026/article.mdx` のカタログが真実源。カタログ外の用語が過去問で出現しても、既存ページでの言及で済ます（memory: no-new-keyword-pages, 2026-04-18）
- **PR は作らない**。develop ブランチに直接 push。朝に `git log --stat` で差分確認
- **ログ md は作らない**。編集内容は MDX に書かれており、commit message と diff で十分
- **Umbrella Issue 同期は行わない**。GitHub Issue での進捗管理から撤退済

## フェーズ（3 段階）

### Phase 1: 読む

1. `.local/r2/posts/pe-comprehensive-management/{exam-slug}/article.mdx` から `## Ⅰ-{anchor}` セクションを抽出
2. セクション内の `<RelatedKeywords items={[...]}>` から対象キーワード slug を取得
3. キーワード MDX を全件 Read し、過去問で問われた論点との**ギャップ**を特定
   - 本文に論点の記述があるか（網羅性）
   - 誤答選択肢の罠が明示されているか（試験適合）
   - 過去問へのインラインリンクがあるか（関連付け）

### Phase 2: 書く

ギャップに応じて MDX を編集。変更量は**小〜中**に抑える:

- 新設節は 1 件まで、既存節への追記は 2-3 件まで
- 過去問へのインラインリンクは必ず追加: `[R04 Ⅰ-N-N](/docs/pe-comprehensive-management-r04-primary#N-N)`
- **アンカー形式**: `#{N-N}`（例: `#1-10`）。先頭ハイフン無し（2026-04-22 修正）

**編集ルール**:
- 絵文字禁止（CLAUDE.md）、`<Callout>` で代替
- CRLF/LF は元ファイルに合わせる（mojibake チェック: `grep -c "$(printf '\xef\xbf\xbd')"` で 0 を確認）
- MDX lint は pre-commit が自動チェック

### Phase 3: 記録 + コミット

1. `.claude/state/exam-keyword-cycles/progress.json` の `covered` に該当エントリを追加（`pr` は `null`、`status` は `"committed"`）
2. 1 サイクル = **1 コミット** にまとめて develop へ直接 push
   - コミットメッセージ: `content(pe): R04 Ⅰ-1-N — {核心論点の一言} [{keywords}]`
   - pre-push フック（type-check + tests）が通ることを確認

**コミット粒度**: 1 サイクル = 1 コミット。キーワード別コミットや進捗用コミットは作らない（progress.json は同じコミットに含める）。

## バッチモード（`--year <slug> --batch`）

年度一括処理の動作:

```bash
# 疑似コード
year_slug="r04-primary"
while true; do
  next = select_next_uncovered(year_slug)
  if next is null: break
  run_cycle(year_slug, next.question)  # Phase 1-3
  if failed: break  # サイクル失敗時は即停止、人手介入を待つ
done
```

- **失敗時停止**: 1 サイクルでも pre-commit/pre-push が失敗したら以降を停止。progress.json は既に更新された分までコミット済み
- **並行実行禁止**: 同一 develop に対するバッチは同時 1 本だけ。複数起動時の競合は未解決
- **中断しても再開可能**: `--year` + `--batch` で再起動すれば未カバーから継続

## 前提条件

- `src/config/exam-question-keywords.json` と `src/config/past-exam-backlinks.json` が最新
- 対象過去問 MDX が存在し `<RelatedKeywords>` が設定されている
- develop ブランチ上にいて、作業ツリーが clean
- `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx`（カタログ真実源）が最新

## 状態ファイル

| ファイル | 役割 |
|---|---|
| `.claude/state/exam-keyword-cycles/progress.json` | `covered` マップで重複処理を防ぐ唯一の目的 |

他のファイル（`logs/*.md`, `logs/index.json`, `umbrella-drafts/*.md`）は **新規作成しない**。既存分は履歴として残す。

## 廃止した機能（履歴）

以下は 2026-04-22 リファクタリングで廃止:

- キーワード別コミット（1 サイクル 3 コミット → 1 コミットに集約）
- サイクルログ md（`logs/YYYY-MM-DD-*.md`）
- `logs/index.json` 更新
- Umbrella Issue 同期（`sync-umbrella.mjs --exam` / `--parent`）
- PR 作成（`/pr-create --base develop`）
- Phase 4「ユーザー一括承認」

廃止理由: 目的が「最低限の品質向上」である以上、これらは過剰な監査証跡・承認プロセス。MDX に書かれた結果と git log で運用が完結する。

## 参照

- `.claude/content-principles.md` — 校正ルールの真実源
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx` — キーワードカタログ真実源
- `.claude/state/exam-keyword-cycles/progress.json` — 重複処理防止
- `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` — 次の未カバー問を選択（`--auto` / `--batch` 共用）
