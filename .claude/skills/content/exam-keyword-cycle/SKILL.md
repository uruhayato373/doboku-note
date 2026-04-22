---
name: exam-keyword-cycle
description: >
  過去問 1 問を起点に、関連キーワード群を cem-qa 評価・相互リンク網羅・本文リライト
  を含む一定品質で補強する Orchestrator スキル。PR・サイクルログ・Umbrella sync
  など運用オーバーヘッドは持たず、直接コミットに集約する。`--year <slug> --batch`
  で 1 年度分の全問を一気通貫処理できる。
  Use when user asks to [過去問起点の校正, キーワードサイクル, 過去問で校正, /exam-keyword-cycle, 夜間バッチ校正].
---

# /exam-keyword-cycle — 過去問起点キーワード校正サイクル

## 目的と粒度

**「最低限の品質向上」** の正しい解釈:

- **実施する（削らない）品質作業**:
  - `cem-qa` エージェントによる 5 軸ルーブリック評価（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）
  - 視覚検証（Playwright ブラウザで実レンダリングの確認）
  - 関連キーワード間の相互リンク網羅（過去問 MDX の `<RelatedKeywords>` に挙がる複数キーワードを扱う）
  - 既存本文のリライト（論点不備・誤答パターンの明示化・既存記述の不足補強）

- **省く（運用オーバーヘッド）**:
  - PR 作成（直接コミット）
  - サイクルログ md（`logs/YYYY-MM-DD-*.md`）
  - `logs/index.json` 更新
  - Umbrella Issue 同期
  - キーワード別コミット（1 サイクル = 1 コミットに集約）

## 引数

```
/exam-keyword-cycle [--exam <slug>] [--question <anchor>] [--year <slug>] [--batch] [--auto]
```

| 引数 | 用途 |
|---|---|
| `--exam` + `--question` | 単一サイクル。`--exam r04-primary --question 1-11` |
| `--year <slug>` + `--batch` | 年度バッチ。未カバー全問を順次処理 |
| `--auto` | state から次の未カバー 1 問を自動選択 |

## 運用方針（必読）

- **新規キーワードページは作らない**。`keyword-2026/article.mdx` のカタログが真実源。カタログ外の用語が過去問で出現しても、既存ページでの言及で済ませる（memory: no-new-keyword-pages, 2026-04-18）
- **PR は作らない**。develop または main ブランチに直接 push
- **ログ md は作らない**。commit message と diff + cem-qa スコアで十分
- **Umbrella Issue 同期は行わない**。GitHub Issue での進捗管理から撤退済

## フェーズ構成（5 段階）

### Phase 1: 起点過去問の読取

1. `.local/r2/posts/pe-comprehensive-management/{exam-slug}/article.mdx` から `## Ⅰ-{anchor}` セクションを抽出
2. 問題文・選択肢 5 つ・正答・解説・誤答トラップを構造化
3. `<RelatedKeywords items={[...]}>` から対象キーワード slug を取得（**複数全部を扱う**、primary 1 つに絞らない）
4. 論点配列を作成（過去問解説の核心論点を配列化）

### Phase 2: キーワード別 cem-qa 評価

対象キーワードごとに並列で実施（**複数の Agent subagent を単一メッセージで並列起動**）:

```
Agent(subagent_type: cem-qa, prompt: "Evaluate .local/r2/posts/pe-comprehensive-management/{slug}/article.mdx against 5-axis rubric. Return scores + specific improvement points.")
```

各キーワードに対し:
- 5 軸スコア（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）
- 合格閾値 2.0 を下回る軸の特定
- 論点カバレッジ判定（過去問で問われた論点 × キーワード本文）
- 相互リンクの欠落検出

### Phase 3: リライト計画

各キーワードの修正候補に視点タグを付与:

| タグ | 修正例 |
|---|---|
| **網羅性** | 過去問で問われた論点が欠けている → 具体例・定義追加 |
| **正確性** | 事実誤認・OCR エラー → PDF 原文突合で修正 |
| **わかりやすさ** | 構造・表・図で改善 → 比較表化・段落分割 |
| **試験適合** | 誤答選択肢の罠の明示 → ExamPoint や本文へ誤答パターン追記 |
| **関連付け** | 過去問インラインリンク・相互リンク欠落 → 追加 |

**リライトの粒度**:
- cem-qa スコア < 2.0 の軸は必ず改善
- 新規節追加は論点整理のため必要な範囲で実施（比較表・対比節など）
- 相互リンクは対称的に（A→B と B→A の両方）

### Phase 4: 実装と視覚検証

1. MDX 編集（`.claude/scripts/lib/mdx-io.mjs` の writeMdxFile 相当で CRLF 保持）
2. 絵文字禁止（CLAUDE.md）、`<Callout>` で代替
3. **過去問へのインラインリンク形式**: `[R04 Ⅰ-1-N](/docs/pe-comprehensive-management-r04-primary#N-N)` （アンカー先頭ハイフン無し、本日修正）
4. mojibake チェック: `grep -c "$(printf '\xef\xbf\xbd')"` で 0 確認
5. dev server（`npm run dev` で 3020 ポート）で実ページを確認:
   - HTTP 200
   - 新追記内容が描画されている
   - 過去問リンクのアンカーが target の `id="N-N"` と一致

### Phase 5: 記録とコミット

1. `.claude/state/exam-keyword-cycles/progress.json` の `covered` に該当エントリを追加
   ```json
   {"1-N": {"date": "YYYY-MM-DD", "pr": null, "status": "committed", "keywords": [...], "cem_qa_before": [...], "cem_qa_after": [...]}}
   ```
2. **1 サイクル = 1 コミット** で直接 push
   - コミットメッセージ: `content(pe): R04 Ⅰ-1-N — {核心論点の一言} [{keywords カンマ区切り}]`
   - 本文にキーワード別変更サマリ（視点タグ + cem-qa スコア before→after）

## バッチモード（`--year <slug> --batch`）

```
year_slug="r04-primary"
while true:
  next = select_next_uncovered(year_slug)
  if next is null: break
  run_cycle(year_slug, next.question)  # Phase 1-5 フルセット
  if cem_qa_failed_after_rewrite: break  # 品質維持のため停止
```

- **失敗時停止**: cem-qa 再評価で全キーワードが ≥ 2.0 にならなければ停止
- **並行実行禁止**: 同一ブランチへのバッチは同時 1 本のみ
- **中断しても再開可能**: progress.json を見て未カバーから継続

## 前提条件

- `src/config/exam-question-keywords.json` と `past-exam-backlinks.json` が最新
- 対象過去問 MDX に `<RelatedKeywords>` が設定されている
- develop または main ブランチ上、作業ツリー clean
- `keyword-2026/article.mdx`（カタログ真実源）が最新
- dev server が 3020 ポートで起動（視覚検証用）
- `cem-qa` エージェントが呼出可能

## 状態ファイル

| ファイル | 役割 |
|---|---|
| `.claude/state/exam-keyword-cycles/progress.json` | `covered` マップで重複処理を防ぐ + cem-qa スコア before/after 記録 |

他（`logs/*.md`, `logs/index.json`, `umbrella-drafts/*.md`）は新規作成しない。

## 参照

- `.claude/content-principles.md` — 校正ルールの真実源
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx` — キーワードカタログ真実源
- `.claude/state/exam-keyword-cycles/progress.json` — 重複処理防止
- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価エージェント
- `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` — 次の未カバー問を選択
