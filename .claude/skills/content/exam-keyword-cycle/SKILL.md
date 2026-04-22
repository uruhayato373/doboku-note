---
name: exam-keyword-cycle
description: >
  過去問 1 問を起点に、その設問の `<RelatedKeywords>` に挙がる全キーワードページを
  cem-qa 評価・本文リライト・相互リンク網羅まで一貫処理する Orchestrator スキル。
  primary 1 つに絞る運用は不可（構造的に禁止）。PR・サイクルログ・Umbrella sync は
  持たず直接コミット。`--year <slug> --batch` で 1 年度分を一気通貫処理。
  Use when user asks to [過去問起点の校正, キーワードサイクル, 過去問で校正, /exam-keyword-cycle, 夜間バッチ校正].
---

# /exam-keyword-cycle — 過去問起点キーワード校正サイクル

## 目的と粒度

**「最低限の品質向上」の正しい解釈**（2026-04-23 明確化）:

| 分類 | 対象 |
|---|---|
| **実施する（削らない）** | cem-qa 5 軸評価 / 視覚検証（Playwright） / **全 RelatedKeywords の処理** / 相互リンク網羅 / 既存本文のリライト |
| **省く（運用オーバーヘッド）** | PR 作成 / サイクルログ md / Umbrella sync / キーワード別コミット |

「**最低限**」は **品質作業をスキップする合図ではない**。中身はしっかりやり、**PR/ログ/Umbrella の運用オーバーヘッドだけを削る** という意味。

## 核心原則: 全 RelatedKeywords の処理

### 過去問 1 問のサイクルは、その設問の **全キーワード** が処理対象

真実源は `src/config/exam-question-keywords.json` の `[{exam-full-slug}][{question}].slugs` 配列。過去問 MDX の `<RelatedKeywords items={[...]}>` と一致するはずだが、ズレがあれば catalog を優先。この配列に含まれる全 slug が処理対象であり、**primary 1 つに絞る運用は不可**。

**❌ NG 例**（2026-04-23 に発生した事象）:
> R04 Ⅰ-1-12（slugs: 4 件）で stress-check-system のみ cem-qa 評価 → rewrite →
> progress.json に `keywords: ["stress-check-system"]` と記録 → commit
>
> → verify-cycle-completeness.mjs が 3 件 missing を返し FAIL。
>   cycle は完了していない。

**✅ OK 例**:
> R04 Ⅰ-1-12 の 4 件（stress-check-system / mental-health-care /
> occupational-safety-act / health-management）全て cem-qa 評価 → 結果に応じて
> リライトまたは相互リンク追加 → 全 4 件 edit → progress.json に 4 件全て記録 →
> verify-cycle-completeness.mjs が PASS → commit

## 引数

```
/exam-keyword-cycle [--exam <slug>] [--question <anchor>] [--year <slug>] [--batch] [--auto]
```

| 引数 | 用途 |
|---|---|
| `--exam` + `--question` | 単一サイクル。例: `--exam r04-primary --question 1-11` |
| `--year <slug>` + `--batch` | 年度バッチ。未カバー全問を順次処理 |
| `--auto` | state から次の未カバー 1 問を自動選択 |

## 運用方針（必読）

- **新規キーワードページは作らない**。`keyword-2026/article.mdx` のカタログが真実源。カタログ外の用語が過去問で出現しても、既存ページでの言及で済ませる（memory: no-new-keyword-pages, 2026-04-18）
- **PR は作らない**。develop または main ブランチに直接 push
- **ログ md は作らない**。commit message と diff + cem-qa スコアで十分
- **Umbrella Issue 同期は行わない**。GitHub Issue での進捗管理から撤退済

## フェーズ構成（6 段階）

### Phase 1: 起点過去問の読取と対象 slug 確定

1. `.local/r2/posts/pe-comprehensive-management/{exam-slug}/article.mdx` から `## Ⅰ-{anchor}` セクションを抽出
2. 問題文・選択肢 5 つ・正答・解説・誤答トラップを構造化
3. **対象キーワード slug を catalog から取得**（真実源）:
   ```bash
   jq -r '.["pe-comprehensive-management-{exam-slug}"]["{question}"].slugs' \
     src/config/exam-question-keywords.json
   # → ["stress-check-system", "mental-health-care",
   #    "occupational-safety-act", "health-management"]  # N 件
   ```
4. 論点配列を作成（過去問解説の核心論点を配列化）

**サイクル開始条件**: Phase 2-5 で扱うキーワード slug 数 N を Phase 1 で確定し、以降ブレさせない。

### Phase 2: 全 N 件の cem-qa 評価（並列）

**N 件全ての cem-qa を単一メッセージ内で並列起動する**（primary のみ評価は不可）。

```
Agent(subagent_type: cem-qa, prompt: "Evaluate .../stress-check-system/article.mdx ...")
Agent(subagent_type: cem-qa, prompt: "Evaluate .../mental-health-care/article.mdx ...")
Agent(subagent_type: cem-qa, prompt: "Evaluate .../occupational-safety-act/article.mdx ...")
Agent(subagent_type: cem-qa, prompt: "Evaluate .../health-management/article.mdx ...")
```

各キーワードについて取得する情報:
- 5 軸スコア（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）
- 合格閾値 2.0 を下回る軸
- 論点カバレッジ（過去問で問われた論点 × 本文）
- 相互リンクの欠落

### Phase 3: 全 N 件のリライト計画

全 slug について視点タグを付与し、処理内容を決める:

| タグ | 修正例 |
|---|---|
| **網羅性** | 過去問で問われた論点が欠けている → 具体例・定義追加 |
| **正確性** | 事実誤認・OCR エラー → 原文突合で修正 |
| **わかりやすさ** | 構造・表・図で改善 → 比較表化・段落分割 |
| **試験適合** | 誤答選択肢の罠の明示 → Callout や ExamPoint に追記 |
| **関連付け** | 過去問インラインリンク・相互リンク欠落 → 追加 |

**リライトの強度（最低ライン）**:
- cem-qa スコア < 2.0 の軸がある keyword → **必ずスコア改善するリライト** を行う
- cem-qa スコア全軸 ≥ 2.0 の keyword → **過去問インラインリンク追加 + 相互リンク追加** は必須（リライトは任意）
- どの keyword も「何もしない」は不可

**相互リンクは対称的に**（A→B と B→A の両方）。

### Phase 4: 実装と視覚検証

1. MDX 編集（元ファイルの改行コード CRLF/LF を保持）
2. 絵文字禁止（CLAUDE.md）、`<Callout>` で代替
3. **過去問インラインリンク形式**: `[R04 Ⅰ-1-N](/docs/pe-comprehensive-management-r04-primary#N-N)` （アンカー先頭ハイフン無し、2026-04-22 修正）
4. mojibake チェック: `grep -c "$(printf '\xef\xbf\xbd')"` で 0 確認
5. dev server（`npm run dev` で 3020 ポート）で実ページを確認:
   - HTTP 200
   - 新追記内容が描画されている
   - 過去問リンクのアンカーが target の `id="N-N"` と一致

### Phase 5: 完了判定ゲート（必須）

**commit 前に必ず実行する**。primary-only 完了を構造的に防ぐ機械検証。

```bash
node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
  --exam r04-primary --question 1-12 --pretty
```

出力例（合格）:
```json
{
  "complete": true,
  "exam": "pe-comprehensive-management-r04-primary",
  "question": "1-12",
  "expected_slugs": ["stress-check-system", "mental-health-care",
                     "occupational-safety-act", "health-management"],
  "keywords_with_link": ["stress-check-system", "mental-health-care",
                         "occupational-safety-act", "health-management"],
  "missing_slugs": []
}
```

**`missing_slugs` が空配列になるまで Phase 4 に戻る**。exit code 0 を確認してから Phase 6 に進む。

### Phase 6: 記録とコミット

1. `.claude/state/exam-keyword-cycles/progress.json` の `covered` に該当エントリを追加。**`keywords` は catalog の `slugs` と集合として完全一致する必要あり**:
   ```json
   {
     "1-12": {
       "date": "2026-04-23",
       "status": "committed",
       "keywords": ["stress-check-system", "mental-health-care",
                    "occupational-safety-act", "health-management"],
       "cem_qa_before": {"stress-check-system": 1.65, "mental-health-care": 2.10,
                         "occupational-safety-act": 2.65, "health-management": 2.30},
       "cem_qa_after": {"stress-check-system": 2.50, "mental-health-care": 2.30,
                        "occupational-safety-act": 2.70, "health-management": 2.40}
     }
   }
   ```
2. **1 サイクル = 1 コミット** で直接 push:
   - メッセージ: `content(pe): R04 Ⅰ-1-N — {核心論点の一言} [{全 keyword カンマ区切り}]`
   - 本文に全 keyword の視点タグ + cem-qa before/after を列挙

## バッチモード（`--year <slug> --batch`）

```
year_slug="r04-primary"
while true:
  next = select_next_uncovered(year_slug)
  if next is null: break
  run_cycle(year_slug, next.question)   # Phase 1-6 フルセット
  if verify-cycle-completeness FAIL: break   # primary-only 等のショートカット検知
  if cem_qa_after 全件 ≥ 2.0 ではない: break   # 品質未達
```

- **失敗時停止条件（2 段）**:
  1. verify-cycle-completeness.mjs が missing_slugs を返す → 即停止（全件リンクがない）
  2. cem-qa 再評価で全軸 ≥ 2.0 にならない → 停止（質が担保されていない）
- **並行実行禁止**: 同一ブランチへのバッチは同時 1 本のみ
- **中断しても再開可能**: progress.json を見て未カバーから継続

## 前提条件

- `src/config/exam-question-keywords.json` が最新（真実源）
- 対象過去問 MDX に `<RelatedKeywords>` が設定されている（catalog とズレがあれば catalog 優先）
- develop または main ブランチ上、作業ツリー clean
- `keyword-2026/article.mdx`（キーワードカタログ真実源）が最新
- dev server が 3020 ポートで起動（視覚検証用）
- `cem-qa` エージェントが呼出可能
- `verify-cycle-completeness.mjs` が実行可能

## 状態ファイル

| ファイル | 役割 |
|---|---|
| `.claude/state/exam-keyword-cycles/progress.json` | `covered` マップで重複処理を防ぐ + cem-qa スコア before/after 記録（**keywords は catalog の slugs と完全一致必須**） |

他（`logs/*.md`, `logs/index.json`, `umbrella-drafts/*.md`）は新規作成しない。

## 参照

- `.claude/content-principles.md` — 校正ルールの真実源
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `.local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx` — キーワードカタログ真実源
- `src/config/exam-question-keywords.json` — 過去問→キーワード slug 対応表（対象 slug の真実源）
- `.claude/state/exam-keyword-cycles/progress.json` — 重複処理防止
- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価エージェント
- `.claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs` — 次の未カバー問を選択
- `.claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs` — 完了判定ゲート（primary-only 検知）
