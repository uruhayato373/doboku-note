# Phase 5–6 実装詳細

## Phase 5: 実装と記録

### 5.1 作業ブランチ（既定: develop 直接）

**既定**: `develop` で直接作業する（feature ブランチ不要）。CLAUDE.md「性質別運用ガイド」でバルク content は develop 直 push が既定。worktree / feature ブランチ / PR のオーバーヘッドを排除する。

```bash
git switch develop  # 既に develop にいることを確認
git pull --ff-only  # origin/develop を最新化
```

**例外: `--pr` オプション指定時のみ** feature ブランチを切る。複数サイクルをまとめて視覚確認したい、変更範囲が想定より大きい、等の場合に使用:

```
claude/exam-keyword-cycle-YYYY-MM-DD-{exam-slug}-{question-anchor}
```

例: `claude/exam-keyword-cycle-2026-04-20-r06-primary-1-35`

### 5.2 キーワードごとにコミット

視点タグをコミットメッセージに明記（1 キーワード = 1 コミット）:

```
content(pe): nagoya-protocol を校正（R06 Ⅰ-1-35 起点）

視点: 網羅性・関連付け
- 遺伝資源の利用に関する具体例を追加（原則 1）
- R06 Ⅰ-1-35 へのインラインリンク追加（原則 11）
- cem-qa スコア: 2.1 → 2.6

Co-Authored-By: Claude Opus 4.7 (1M context) <noreply@anthropic.com>
```

MDX 編集は `.claude/scripts/lib/mdx-io.mjs` の `writeMdxFile` を使用（CRLF 保持、CLAUDE.md の MDX 書込規約に準拠）。

### 5.3 サイクルログ作成

`.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-{exam-slug}-{question-anchor}.md`:

```markdown
---
date: YYYY-MM-DD
exam: r06-primary
question: 1-35
theme: 生物多様性・CITES
keywords_count: 6
---

# 過去問起点校正サイクル: R06 Ⅰ-1-35

## 起点過去問の論点
- 名古屋議定書の採択年・発効年
- CITES と LMO の違い
- ...

## キーワード別ログ

### 1. nagoya-protocol

**視点タグ**: 網羅性・関連付け
**cem-qa スコア**: 2.1 → 2.6

**Before**:
> （現状の本文抜粋）

**After**:
> （修正後の本文抜粋）

**根拠**: R06 Ⅰ-1-35 では「遺伝資源の利用」が問われるが、本文に具体例がなかった。

---

### 2. biosafety
...

## 発見事項（次サイクル以降の改善候補）

### 採点軸（rubric）への気づき
<!-- cem-qa 5 軸で評価できなかった項目・lint で検出できなかった違和感を列挙 -->

### リライト方法論（method）への気づき
<!-- Phase 2-5 の処理で違和感があった箇所・拡張パターン A-F で不足を感じた点を列挙 -->

### 起票候補
<!-- 2 回以上浮上したパターン → メタ Issue 起票推奨。1 回のみは次サイクルで再観察 -->
```

### 5.4 インデックス更新

`.claude/state/exam-keyword-cycles/logs/index.json` に追加:

```json
{
  "cycles": [
    {
      "date": "YYYY-MM-DD",
      "exam": "r06-primary",
      "question": "1-35",
      "theme": "生物多様性・CITES",
      "keywords": ["nagoya-protocol", "biosafety", "..."],
      "pr": null,
      "log": "YYYY-MM-DD-r06-primary-1-35.md"
    }
  ]
}
```

### 5.5 state 更新

`.claude/state/exam-keyword-cycles/progress.json` に追加:

```json
{
  "covered": {
    "pe-comprehensive-management-r06-primary": {
      "1-35": {
        "date": "YYYY-MM-DD",
        "pr": null,
        "status": "in_review",
        "keywords": ["nagoya-protocol", "biosafety", "convention-on-biodiversity", "cites", "ipbes", "kunming-montreal-framework"]
      }
    }
  },
  "last_cycle": { "exam": "r06-primary", "question": "1-35" }
}
```

`status` enum:
- `in_review` — PR 作成済・未マージ
- `committed` — ローカルコミットのみ
- `full_cycle_complete` — Phase 5.6 で verify 通過済（完了判定の唯一の条件）

`full_cycle_complete` 以外はすべて「未完了」扱い。中間状態（partial 等）は存在しない。

### Phase 5.5: Umbrella Issue 同期

Phase 5 で `progress.json` を更新した直後に、該当年度の Umbrella Issue と親 Umbrella の checkbox・進捗%を同期する。

```bash
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --exam <exam-slug>
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --parent
```

- `progress.json.umbrella_issues.<exam-slug>` に Issue 番号が記録されている必要がある
- body は毎回丸ごと再生成される（手動編集禁止）
- 差分なしなら gh API を叩かない

**初回セットアップ**:

```bash
for exam in r07 r06 r05 r04 r03; do
  node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs \
    --exam pe-comprehensive-management-${exam}-primary --create
done
node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs --parent --create
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --all
```

### Phase 5.6: 完了検証（full-cycle gate）

```bash
node .claude/skills/quality/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
  --exam <exam-slug> --question <anchor> --json
```

検査内容:
1. **slugs 突合**: catalog `exam-question-keywords.json[exam][anchor].slugs` ⊆ `progress.json.covered[exam][anchor].keywords`
2. **status 突合**: `status === 'full_cycle_complete'`
3. **cem-qa 突合**: logs 内の記録値 ≥ 閾値（R03/R04 は 2.5、他は 2.0）

判定:
- `completed: true`（exit 0）→ Phase 6 へ
- `completed: false`（exit 1）→ `missing_slugs` を surface し、Phase 2 に戻る

status 更新は verify `true` 確認後に手動で書き換える（自動更新なし）。

---

## Phase 6: 反映（既定: develop 直接 push / 例外: PR）

### 既定: develop に直接 push

Phase 5.6 の verify で `completed: true` を確認してから:

```bash
git push origin develop
```

- `pr` フィールドは `null` のまま
- 視覚確認は localhost（`npm run dev`）で実施

### 例外: `--pr` 指定時のみ PR 作成

`/pr-create --base develop` を呼出。PR body テンプレ:

```markdown
## 起点過去問
- **R06 Ⅰ-1-35**: 生物多様性・CITES・LMO 等を扱う問題
- [該当過去問ページ](/docs/pe-comprehensive-management-r06-primary#1-35)

## 対象キーワードと視点

| キーワード | 視点タグ | cem-qa スコア | ログ |
|---|---|---|---|
| nagoya-protocol | 網羅性・関連付け | 2.1 → 2.6 | [詳細](.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-r06-primary-1-35.md#1-nagoya-protocol) |

## 変更サマリー（視点別）
- 網羅性: N 件 / 正確性: N 件 / わかりやすさ: N 件 / 試験適合: N 件 / 関連付け: N 件

## 検証
- [ ] `npm run build` 通過
- [ ] cem-qa 再評価で全キーワード ≥ 閾値
- [ ] `verify-cycle-completeness.mjs --exam <slug> --question <anchor>` が exit 0 で通過

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

PR 作成後、`index.json` / `progress.json` の `pr` フィールドに PR 番号を追記。
