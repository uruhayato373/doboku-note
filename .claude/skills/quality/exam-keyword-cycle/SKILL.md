---
name: exam-keyword-cycle
description: >
  過去問 1 問を起点に、その問題が参照している関連キーワード群を横断的に校正し、
  変更の視点（網羅性・正確性・わかりやすさ・試験適合・関連付け）を明示した PR として
  ユーザーレビューに回す Orchestrator。受験者視点での品質を系統的に底上げする。
  Use when user asks to [過去問起点の校正, キーワードサイクル, 過去問で校正, /exam-keyword-cycle, 論点カバレッジ校正].
---

# /exam-keyword-cycle — 過去問起点のキーワード校正サイクル

過去問 1 問を起点に関連キーワード群をまとめて校正し、1 つの PR で記録・ユーザーレビューする Orchestrator スキル。

> **モデル方針**: Orchestrator として動作し、評価・生成は既存のサブエージェント・スキルに委譲する。親エージェントの判断力が必要なため Opus inherit で動作。

## 用途

**「試験で問われた論点」を起点**にすることで、受験者にとって実用的な品質向上を系統的に進める。関連キーワード群をまとめて扱い、PR でユーザーが一括レビューできる形にする。

### 解決する問題

- 個別キーワード校正では「試験でどう問われるか」視点が抜けがち
- 1 つの論点に関わる複数キーワードの整合性が取れない
- 変更の根拠（どの過去問起点か、どの視点か）が記録に残らない
- キーワードごとの承認は重すぎる → PR 単位で軽量化

## 引数

```
/exam-keyword-cycle [--exam <exam-slug>] [--question <anchor>] [--auto] [--dry-run]
```

| 引数 | 用途 | 例 |
|---|---|---|
| `--exam` | 起点過去問の exam slug | `r06-primary`, `r07-primary` |
| `--question` | 起点過去問の anchor（設問番号） | `1-35`, `1-38` |
| `--auto` | state ファイルから自動選択 | 未カバー優先 |
| `--dry-run` | 変更を加えず候補リストのみ出力 | 計画確認用 |

### `--auto` の動作

`scripts/select-next-question.mjs` を実行し次に扱う過去問を自動決定する:

```bash
node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs --pretty
```

選択アルゴリズム:
1. `progress.json` の `covered` を走査
2. 最新年度（R07 → R06 → ...）で未カバーの設問を若番順に探索
3. 全設問がカバー済みなら 180 日以上前の設問を再訪候補として選ぶ
4. 該当なしなら `{ exam: null }` を返す（手動指定を促す）

## 前提条件

- `src/config/exam-question-keywords.json` と `past-exam-backlinks.json` が最新（必要なら `npm run build-backlinks` で再生成）
- 対象過去問の MDX が存在し、`<RelatedKeywords>` が設定されている
- `cem-qa` エージェントが利用可能
- dev server が起動している（`npm run dev` で 3020 ポート）

### cem-qa 閾値（exam 別）

| exam | 閾値 |
|---|---|
| `pe-comprehensive-management-r03-primary` | **2.5** |
| `pe-comprehensive-management-r04-primary` | **2.5** |
| その他 | 2.0 |

閾値の真実源: `scripts/lib/umbrella-builder.mjs` の `STRICT_THRESHOLD_EXAMS`。

## フェーズ構成

| Phase | 内容 |
|---|---|
| 1 | 起点過去問の特定と論点抽出 |
| 2 | キーワード別ギャップ分析（全 slugs 対象・必須） |
| 3 | 修正方針の提案（視点タグ付き） |
| 4 | ユーザー一括承認 |
| 5 | 実装と記録 → 詳細: [phase-5-6-implementation.md](references/phase-5-6-implementation.md) |
| 6 | 反映 → 詳細: [phase-5-6-implementation.md](references/phase-5-6-implementation.md) |

### Phase 1: 起点過去問の特定と論点抽出

1. **対象過去問 MDX を Read**: `.local/r2/posts/pe-comprehensive-management/{exam-slug}/article.mdx` の `## Ⅰ-1-{NN-NN}` セクションを抽出
2. **本文構造化**: 問題文・選択肢 5 つ・正答・解説・誤答トラップを抽出
3. **対象キーワード slug を特定**: 過去問 MDX 内の `<RelatedKeywords items={[...]}>` から抽出、`exam-question-keywords.json` と突合
4. **論点配列の作成**: 解説から「試験で問われている具体論点」を配列化

**出力**: 構造化コンテキスト（問 + 選択肢 + 正答 + 論点配列 + キーワード slug 配列）

### Phase 2: キーワード別ギャップ分析（全 slugs 対象・必須）

> **重要**: Phase 1 で特定した `exam-question-keywords.json[exam][anchor].slugs` の **全件**が Phase 2〜5 の処理対象。1 件だけ・数件だけの処理は **禁止**（verify gate が未完了と判定）。全 slugs を cem-qa 閾値に到達させるまでサイクルは完了しない。

catalog slugs 全件ごとに並列で実施:

1. **cem-qa 評価**: `cem-qa` エージェントを呼出、5 軸スコアを取得し閾値チェック
2. **論点カバレッジ判定（auditor 出力経由）**:
   - `exam-keyword-mapping-auditor` エージェントを起動
   - 入力: `exam_slug`、`anchor`、`current_slugs`
   - 出力の `evaluation.covered` / `partial` / `uncovered_issues` を採用
   - 旧方式の 4 カテゴリ別 grep は廃止
   - `uncovered_issues` が空 → coverage OK。空でない場合は Phase 3 に伝搬
3. **相互リンクチェック**: 過去問側の `<RelatedKeywords>` に catalog slugs が全件含まれるか確認

**出力**: キーワードごとの分析レポート（cem_qa_score / missing_points / broken_links）

### Phase 3: 修正方針の提案（視点タグ付き）

各修正候補に以下の**視点タグ**を付与して一覧化:

| タグ | 意味 |
|---|---|
| **網羅性** | 過去問で問われた論点が本文に欠けている |
| **正確性** | 事実誤認・OCR エラー・年号間違い |
| **わかりやすさ** | 構造・表・図で改善可能 |
| **試験適合** | 誤答選択肢の罠の明示 |
| **関連付け** | インラインリンク・RelatedKeywords 欠落 |

### Phase 4: ユーザー一括承認

**個別ではなくサイクル全体を 1 PR で承認**する方式。catalog slugs **全件**分をテーブルに並べる（件数不足での承認オプションは存在しない）:

```markdown
## サイクル承認 — R06 Ⅰ-1-35「生物多様性・CITES」

**catalog slugs**: 6 件 ／ **処理対象**: 6 件（全件、必須）

| # | キーワード | 現状 → 目標 | 視点タグ | 変更量 |
|---|---|---|---|---|
| 1 | nagoya-protocol | 2.1 → 2.6 | 網羅性・関連付け | 中 |
| ... | ... | ... | ... | ... |

### 承認: 一括 OK / 個別修正指示 / 却下
```

- **一括 OK** → Phase 5 へ
- **個別修正指示** → 該当キーワードのみ方針を調整して再提示
- **却下** → Phase 5 スキップ、サイクル終了（state 更新なし）

### Phase 5 & 6: 実装・記録・反映

詳細手順（ブランチ・コミット・ログ・インデックス・Umbrella 同期・完了検証・push）は:
→ **[references/phase-5-6-implementation.md](references/phase-5-6-implementation.md)**

## 重大な発見の扱い

サイクル中に以下を発見した場合、PR とは別に Issue を起こす:
- 過去問 MDX 自体に OCR エラーがある
- 過去問の解答表の反映漏れ
- キーワードページが存在すべきなのにない

Issue ラベル: `content-quality`, `auto-generated`

## 継続改善ループ

サイクルログの「発見事項」を #205（採点）/ #206（方法論）に蓄積して継続改善する。詳細:
→ **[references/continuous-improvement-loop.md](references/continuous-improvement-loop.md)**

## 段階実装計画

| Phase | 状態 | 内容 |
|---|---|---|
| MVP | 実装済み | 手動起動・引数指定、1 サイクル → PR まで通す |
| Phase 2 | 実装済み（2026-04-20） | `--auto` 自動選択、weekly-review Agent F として組込み |
| Phase 3 | 部分稼働 | GitHub Actions スケジュール化（週 2 回、月・木 JST 22:00）。remote trigger は workflow_dispatch 手動のみ稼働 |
| Phase 4 | 実装済み（2026-04-23） | full-cycle 化、`verify-cycle-completeness.mjs` の gate、R03/R04 閾値 2.5 |

## 参照

- `src/config/exam-question-keywords.json` — 過去問→キーワード slug 一覧（Phase 1 の入力）
- `src/config/past-exam-backlinks.json` — キーワード→過去問一覧（双方向確認、自動生成）
- `scripts/lib/umbrella-builder.mjs` — Umbrella body 共通ビルダー＋閾値定義の真実源
- `scripts/verify-cycle-completeness.mjs` — Phase 5.6 の full-cycle gate
- `.claude/skills/quality/exam-backlinks/SKILL.md` — exam-backlinks 保守スキル
- `.claude/skills/quality/verify-exam-coverage/SKILL.md` — 論点カバレッジ監査
- `.claude/skills/authoring/improve-article/SKILL.md` — 単一記事の校正ループ
- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価
- `.claude/skills/dev/pr-create/SKILL.md` — PR 自動作成
- `.claude/skills/management/distill-proofread-learnings/SKILL.md` — サイクル完了後の学習抽出
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `docs/reference/content-principles.md` — 校正ルールの真実源
- `.claude/state/exam-keyword-cycles/logs/` — サイクルログ蓄積先
- `.claude/state/exam-keyword-cycles/progress.json` — カバー状況の永続化
