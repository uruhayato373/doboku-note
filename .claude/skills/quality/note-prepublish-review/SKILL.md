---
name: note-prepublish-review
description: >
  note 公開用ドラフト（docs/note-drafts/{NN-...}/article.md）を公開前に統合チェックする Orchestrator スキル。
  inline checks（markdown 互換性・404・文字化け）+ 3 並列エージェント（link-injector / figure-auditor / fact-checker）で品質ゲートを通す。
  Use when user asks to [note 公開前レビュー, note ドラフトチェック, note 出版前確認, /note-prepublish-review].
user-invocable: true
---

# /note-prepublish-review — note 公開前統合レビュー

`docs/note-drafts/{NN-...}/article.md` を note.com に公開する前の **品質ゲート** スキル。inline 機械チェック + 3 専門エージェント並列実行で、リンク導線・図版品質・事実性を一括検証する。

## 引数

```
/note-prepublish-review {NN-...} [--audit-only] [--external-fact]
```

| 引数 | 説明 |
|---|---|
| `{NN-...}` | 対象ドラフトディレクトリ名（例: `90-総監択一式17年分分析`）。`NN` 数値だけでも可（先頭一致で解決） |
| `--audit-only` | リンク注入を行わず、すべて監査モードで実行（編集なし） |
| `--external-fact` | ファクトチェックのスコープ D（外部一次資料突合）を有効化（デフォルト OFF） |

デフォルトは **link-injection 自動適用 ON / figure-auditor & fact-checker は audit-only**。

## 実行フロー

```
/note-prepublish-review {NN-...}
  │
  ├─ Phase 1: inline checks（軽量・機械的・高速）
  │   ├ ファイル存在: article.md / 参照画像
  │   ├ markdown 互換性: pipe 表 0 / blockquote 0 / U+FFFD 0
  │   ├ frontmatter（あれば）: 必須項目
  │   ├ リンク 404 防止: 各 slug が `.local/r2/posts/.../{slug}/article.mdx` で `published: true`
  │   ├ 文字数バンド: free 2,000〜3,000 / paid 4,000〜6,000
  │   └ ハッシュタグ: hashtags.txt 存在 / 99 行以下 / 純粋ハッシュタグ / 重複なし（未生成は warn）
  │
  ├─ Phase 2: 3 エージェント並列実行
  │   ├ note-link-injector（Generator, Sonnet）— 全 occurrence リンク化（--audit-only 指定時はスキップ）
  │   ├ note-figure-auditor（Evaluator, Sonnet）— note-svg-policy 準拠監査
  │   └ note-fact-checker（Evaluator, Sonnet）— A+B+C スコープのファクトチェック
  │
  └─ Phase 3: 結果集約・最終判定
      ├ inline 違反 1 件以上 → BLOCK（ブロッカー）
      ├ 各エージェントの加重スコア集計
      ├ 合格基準: inline 違反 0 件 + 3 エージェント全て加重スコア 2.0+
      └ 公開可否判定 + 修正アクション一覧
```

## Phase 1: inline checks（実装詳細）

```bash
# プロジェクトルートからの絶対パスで実行する（cd で相対パスを壊さない）
ROOT="/Users/minamidaisuke/doboku-note"
F="$ROOT/docs/note-drafts/{NN-...}/article.md"

# 1. ファイル存在
test -f "$F" || exit 1

# 2. 図版参照と実ファイルの整合（article 直下の img/ を絶対パスで解決）
ART_DIR="$(dirname "$F")"
grep -oE '!\[[^]]*\]\(\.\/img\/[^)]+\)' "$F" | sed -E 's/.*\((\.\/[^)]+)\).*/\1/' | while read ref; do
  test -f "$ART_DIR/${ref#./}" || echo "MISSING: $ref"
done

# 3. markdown 互換性
echo "pipe=$(grep -c '^|' "$F") blockquote=$(grep -c '^>' "$F") U+FFFD=$(grep -cP '\xef\xbf\xbd' "$F")"

# 4. リンク 404 防止（絶対パスで .local/r2/ を解決）
grep -oE '/docs/pe-comprehensive-management-[a-z0-9-]+' "$F" | sort -u | while read url; do
  slug=${url#/docs/pe-comprehensive-management-}
  src="$ROOT/.local/r2/posts/pe-comprehensive-management/$slug/article.mdx"
  if [ ! -f "$src" ]; then
    echo "404 RISK: $slug (file not found)"
  elif ! grep -q '^published: true' "$src"; then
    echo "404 RISK: $slug (not published)"
  fi
done

# 5. 文字数（参考）
chars=$(wc -m < "$F")
echo "文字数: $chars"

# 6. ハッシュタグ（hashtags.txt）
H="$ART_DIR/hashtags.txt"
if [ ! -f "$H" ]; then
  echo "HASHTAGS WARN: hashtags.txt 未生成 → /note-hashtags {NN-...} で生成"
else
  total=$(wc -l < "$H" | tr -d ' ')
  hashlines=$(grep -cE '^#' "$H")
  blanks=$(grep -c '^$' "$H")
  comments=$(grep -cE '^#[[:space:]]' "$H")
  dups=$(sort "$H" | uniq -d | wc -l | tr -d ' ')
  echo "HASHTAGS: 行数=$total / # 開始=$hashlines / 空行=$blanks / コメント=$comments / 重複=$dups"
  if [ "$hashlines" -gt 99 ]; then echo "HASHTAGS WARN: 99 個超え（$hashlines 個）"; fi
  if [ "$blanks" -gt 0 ] || [ "$comments" -gt 0 ]; then
    echo "HASHTAGS WARN: 純粋ハッシュタグになっていない（空行/コメント混入）→ コピペで失敗する可能性"
  fi
  if [ "$dups" -gt 0 ]; then echo "HASHTAGS WARN: 重複 $dups 件"; fi
fi
```

**注意**: `cd` を使うと `.local/r2/` への相対パスが壊れるので、必ず `$ROOT` を絶対パスで保持する。

## Phase 2: エージェント並列起動

3 つのエージェントを **同一メッセージ内** で Agent ツール multiple invocation により並列起動する:

- `note-link-injector` — `subagent_type: note-link-injector`
- `note-figure-auditor` — `subagent_type: note-figure-auditor`
- `note-fact-checker` — `subagent_type: note-fact-checker`

各エージェントへのプロンプトは「対象記事のフルパス」+「目的」+「報告フォーマット」を含む自己完結型にする（エージェントは会話履歴を持たないため）。

`--audit-only` 指定時は note-link-injector の起動をスキップし、現状リンクの検証のみ行う。

## Phase 3: 結果集約

各エージェントの報告を以下の構造で集約:

```
## /note-prepublish-review 結果

対象: docs/note-drafts/{NN-...}/article.md
実行モード: {default | audit-only}
実行時刻: YYYY-MM-DD HH:MM:SS

---

### Phase 1: inline checks

| 項目 | 結果 | 備考 |
|---|---|---|
| ファイル存在 | ✅ | |
| markdown 互換性 | ✅ | pipe=0 blockquote=0 U+FFFD=0 |
| リンク 404 防止 | ✅ | 全 N slug が published |
| 図版ファイル存在 | ✅ | N 枚すべて確認 |
| 文字数 | ⚠️ | N 字（free 範囲 2k〜3k に対し N 字） |

---

### Phase 2: agent reports

#### note-link-injector
（agent からの報告をそのまま転記）

#### note-figure-auditor
（同上）

#### note-fact-checker
（同上）

---

### 総合判定

- inline 違反: 0 件 ✅
- agent 加重スコア:
  - link-injector: N1（追加リンク数）
  - figure-auditor: N2 / 3
  - fact-checker: N3 / 3
- **公開可否: GO / NO-GO**

### 修正アクション（NO-GO の場合のみ）

1. ...
2. ...
```

## 公開後の管理

note 公開直後に以下の手順で「公開済み記事」として記録する。

### 1. UTM パラメータ付与（公開直前 or 直後に実行）

```bash
node scripts/add-note-utm.mjs 90        # 90- 始まりのドラフトに UTM 付与
node scripts/add-note-utm.mjs 90 --dry-run  # 変更内容のプレビュー
```

`docs/note-drafts/{NN}/article.md` 内の `https://doboku-note.com/...` 全リンクに以下を付与:
- `utm_source=note`
- `utm_medium=referral`
- `utm_campaign={frontmatter.utmCampaign}`

note → doboku-note の流入が GA4 で「Referral / note」として計測可能になる。

### 2. frontmatter に公開メタデータを記録

```yaml
---
notePublishedAt: 2026-04-29
noteUrl: https://note.com/dobokunote/n/n3bcb87efddad
noteId: n3bcb87efddad
notePricing: free                # free | paid
noteSeries: 総監択一式分析         # 任意
utmCampaign: 90-soukan-analysis   # add-note-utm.mjs が消費
---
```

### 3. 公開済みインデックスを再生成

```bash
node .claude/scripts/build-note-published-index.mjs
```

`.claude/state/note-published.json` に集計が出力される。`pricing: paid` を含む将来の有料記事や series まとめページの参照源として利用。

### 4. doboku-note サイト側に動線追加（任意・記事性質に応じて）

特に効果が大きい場合は、関連するハブページ（exam-index / category 概要など）に `<Callout type="reference">` で note 記事へのリンクを追加する。

## 既存スキル・エージェントとの関係

| 関連 | 役割 |
|---|---|
| `/social-post note analysis|guide|keywords` | note ドラフトの **生成** |
| `/social-post note desumasu` | 既存ドラフトの **トーン変換** |
| `/note-hashtags` | 公開前のハッシュタグ生成 |
| **`/note-prepublish-review`（本スキル）** | 公開前の **統合品質ゲート** |
| `scripts/add-note-utm.mjs` | 公開直前の UTM 一括付与 |
| `.claude/scripts/build-note-published-index.mjs` | 公開済み記事インデックス生成 |
| `note-link-injector` agent | リンク注入の Generator |
| `note-figure-auditor` agent | 図版品質の Evaluator |
| `note-fact-checker` agent | 事実性の Evaluator |
| `.claude/reference/note-svg-policy.md` | 図版品質ルールの真実源 |
| `.claude/skills/social/social-post/SKILL.md` | リンク注入ルールの真実源 |

## 実行例

```
/note-prepublish-review 90-総監択一式17年分分析
/note-prepublish-review 90                          # 数値だけ。先頭一致で 90-... に解決
/note-prepublish-review 02 --audit-only             # リンク注入はスキップ、監査のみ
/note-prepublish-review 14 --external-fact          # 外部ファクトチェックを opt-in
```

## ハーネス設計上の位置づけ

- **Generator/Evaluator 分離**: link-injection は Generator、figure & fact-check は Evaluator として独立
- **Opus で考え、Sonnet で実行**: 3 エージェントは全て sonnet。最終判断（公開可否）は親 Claude（Opus）が行う
- **シンプル化**: 既存の `social-post`（生成）+ 本スキル（レビュー）の 2 軸で note ワークフローが完結。新規スキル乱立を防ぐ

## 制約

- **対象は `docs/note-drafts/` 配下のみ**（doboku-note 本体の MDX は `/check-mdx` 等の別スキル管轄）
- **実行は記事 1 本ずつ**（バルク対応は別スキル `/bulk-note-review` を将来検討）
- **本スキルは編集を行いうる**（link-injector による）。`--audit-only` で抑制可能
