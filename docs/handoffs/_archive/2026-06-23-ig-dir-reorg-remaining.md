---
date: 2026-06-23
context: Instagram ディレクトリ資格軸再編 — 残作業
status: active
---

# Instagram `_exam-packs` → 資格軸パス 残存更新

## 背景

`docs/sns/instagram/` を資格軸（`cem/` / `civil-1/` / `civil-2/` / `pe-construction/`）に再編した（commit 437853fbb）。
SKILL.md 5ファイル・README・scripts 2ファイルは更新済みだが、`.claude/` 配下の19ファイルが未更新。

## 着手順序

### 1. `sns-config.mjs`（最優先 — 他スクリプトの依存元の可能性）

```
.claude/scripts/lib/sns-common/sns-config.mjs
```

中央パス設定がここにあれば、他スクリプトへの連鎖更新が減る。まずここを Read して確認。

### 2. パック生成スクリプト

```
.claude/scripts/sns/generate-civil-1-pack.mjs
.claude/scripts/sns/generate-civil-2-pack.mjs
```

`BASE` / `OUTPUT_BASE` 定数を新パスへ更新。
- `civil-1/exam-packs/`
- `civil-2/exam-packs/`

### 3. スキル実行スクリプト

```
.claude/skills/social/ig-post-create/scripts/ig-post-create.mjs
.claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs
.claude/skills/social/publish-ig-bs/publish-ig-bs.ts
.claude/skills/social/yt-shorts-create/scripts/yt-shorts-create.mjs
.claude/skills/social/yt-shorts-create/scripts/per-problem-shorts.mjs
```

### 4. その他スクリプト

```
.claude/scripts/upload-sns-r2.mjs
.claude/scripts/youtube/generate-thumbnails.mjs
.claude/scripts/instagram/build-stories.mjs
.claude/scripts/lint-stories-titles.mjs
scripts/lint-exam-pack-structure.mjs
```

### 5. エージェント説明（.md）

```
.claude/agents/ig-carousel-writer.md
.claude/agents/ig-carousel-qa.md
.claude/agents/ig-reels-writer.md
.claude/agents/ig-reels-qa.md
.claude/agents/ig-highlight-writer.md
.claude/agents/ig-highlight-qa.md
.claude/agents/ig-highlight-designer.md
.claude/agents/yt-shorts-publisher-qa.md
```

## 置換ルール

| 旧パス | 新パス |
|---|---|
| `_exam-packs/技術士総監/` | `cem/exam-packs/` |
| `_exam-packs/1級土木/` | `civil-1/exam-packs/` |
| `_exam-packs/2級土木/` | `civil-2/exam-packs/` |
| `_exam-packs/{試験}/` | `{exam}/exam-packs/` |
| `_exam-packs/` (残余) | `cem/exam-packs/` |

## 完了確認

```bash
# 残存チェック（0件になればOK）
rg "_exam-packs" .claude/ --files-with-matches
```

## 今回完了済みのもの（再作業不要）

- `scripts/generate-exam-pack-dirs.mjs` — `OUTPUT_BASE` 更新済み
- `scripts/bulk-generate-exam-packs.mjs` — `--exam=cem|civil-1|civil-2` 追加済み
- `.claude/skills/social/{yt-shorts-create,ig-reel-create,ig-post-create,publish-ig-bs,ig-carousel-restyle}/SKILL.md` — SKILL.md 更新済み（scripts/ は未）
- `docs/reference/ig-carousel-skill.md` — 更新済み（一部残存あり要確認）
- `docs/sns/instagram/README.md` — 更新済み
