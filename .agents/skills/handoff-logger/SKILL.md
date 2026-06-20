---
name: handoff-logger
description: Record project handoff logs after meaningful Codex or Claude work in this repository. Use when work changes code, content, scripts, workflows, deployment state, note publishing state, validation results, or operating rules; when the user asks to leave a log, handoff, memo, or cross-agent record; or before ending a substantial implementation session so future Claude/Codex runs can continue from reliable context.
---

# Handoff Logger

## Core Rule

After meaningful project work, create or update a Markdown handoff under `docs/handoffs/`.

Use this skill especially when the task:

- Changes code, scripts, components, content, data, config, or docs.
- Establishes or changes an operating rule.
- Runs important verification, publishing, deployment, or external-system work.
- Produces decisions that Claude/Codex should remember.
- Leaves known follow-up work or caveats.

Skip only for tiny read-only answers or throwaway terminal checks with no lasting project state.

## File Location

Prefer:

```text
docs/handoffs/YYYY-MM-DD-short-topic.md
```

Use the repository timezone/date from the environment context. Keep the slug short, lowercase, and descriptive.

If a relevant handoff for the same date/topic already exists, update it instead of creating a near-duplicate.

## Required Contents

Keep the log concise but operational. Include:

1. Title with the work topic.
2. Status callout at the top, usually `> [!done]`, `> [!warning]`, or `> [!todo]`.
3. Background: why the work happened.
4. Changes made: grouped by area or file family.
5. Verification: exact commands run and results.
6. Remaining notes: caveats, follow-ups, or things not verified.
7. Key files touched when useful.

Do not paste huge diffs. Summarize the important behavior and link or name files.

## Style

- Write in Japanese for this repository unless the surrounding handoff is English.
- Be direct and factual. The handoff is for future operators, not a release note.
- Include exact commands such as `npm run lint` and `npm run type-check`.
- Mention whether validation passed, failed, or was not run.
- Preserve existing user/agent changes. Do not clean unrelated handoff content.

## Template

Use this structure:

- `# Codex/Claude 実施ログ：短い作業名`
- Top callout:
  `> [!done]`
  `> **YYYY-MM-DD 完了**：一文で成果。検証コマンドと結果も短く書く。`
- `## 背景`
- `## 実施内容`
- `## 検証`
- `## 後続メモ`

For validation, include commands in a fenced shell block when useful, for example:

```bash
npm run type-check
npm run lint
```

## Final Response

When a handoff is created or updated, mention the path in the final response:

```text
作業ログを docs/handoffs/YYYY-MM-DD-short-topic.md に残しました。
```
