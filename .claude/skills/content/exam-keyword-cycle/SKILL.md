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

> **モデル方針**: このスキルは Orchestrator として動作し、評価・生成は既存のサブエージェント・スキルに委譲する。親エージェントの判断力が必要なため Opus inherit で動作。

## 用途

ランダムな校正ではなく **「試験で問われた論点」を起点**にすることで、受験者にとって実用的な品質向上を系統的に進める。関連キーワード群をまとめて扱い、PR でユーザーが一括レビューできる形にする。

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

いずれも任意。引数なしで呼ばれた場合は、会話内で対象を特定する。

### `--auto` の動作

`--auto` 指定時は `scripts/select-next-question.mjs` を実行し、次に扱う過去問を自動決定する:

```bash
node .claude/skills/content/exam-keyword-cycle/scripts/select-next-question.mjs --pretty
```

出力（JSON）:

```json
{
  "exam": "pe-comprehensive-management-r07-primary",
  "question": "1-1",
  "reason": "未カバー最優先: pe-comprehensive-management-r07-primary の若番 1-1"
}
```

選択アルゴリズム:
1. `.claude/state/exam-keyword-cycles/progress.json` の `covered` を走査
2. 最新年度（R07 → R06 → ...）で未カバーの設問を若番順に探索
3. 全設問がカバー済みなら、`date` が 180 日以上前の設問を再訪候補として選ぶ
4. 該当なしなら `{ exam: null }` を返す（その場合は手動指定を促す）

選択結果をユーザーに提示し、承認後に Phase 1 へ進む。

## 前提条件

- `src/config/exam-question-keywords.json` と `src/config/past-exam-backlinks.json` が最新（必要なら `npm run build-backlinks` で再生成）
- 対象過去問の MDX が存在し、`<RelatedKeywords>` が設定されている
- `cem-qa` エージェントが利用可能
- dev server が起動している（`npm run dev` で 3020 ポート）— 視覚検証に使用

### cem-qa 閾値（exam 別）

| exam | 閾値 | 理由 |
|---|---|---|
| `pe-comprehensive-management-r03-primary` | **2.5** | 2026-07 受験直結、運営者自身が直接使用する |
| `pe-comprehensive-management-r04-primary` | **2.5** | 同上 |
| その他 | 2.0 | 合格水準 |

閾値は `scripts/lib/umbrella-builder.mjs` の `STRICT_THRESHOLD_EXAMS` が真実源。変更はそこで行う。

## フェーズ構成（6 段階）

### Phase 1: 起点過去問の特定と論点抽出

1. **対象過去問 MDX を Read**:
   ```
   .local/r2/posts/pe-comprehensive-management/{exam-slug}/article.mdx
   の `## Ⅰ-1-{NN-NN}` セクションを抽出
   ```

2. **本文構造化**: 問題文・選択肢 5 つ・正答・解説・誤答トラップを抽出

3. **対象キーワード slug を特定**:
   - 優先: 過去問 MDX 内の `<RelatedKeywords items={[...]}>` から抽出
   - 補助: `src/config/exam-question-keywords.json` とも突合（欠落検出）

4. **論点配列の作成**: 解説から「試験で問われている具体論点」を配列化
   - 例: R06 Ⅰ-1-35 なら `["名古屋議定書の採択年", "CITES と LMO の違い", "昆明・モントリオール枠組の目標"]`

**出力**: 構造化コンテキスト（問 + 選択肢 + 正答 + 論点配列 + キーワード slug 配列）

### Phase 2: キーワード別ギャップ分析（全 slugs 対象・必須）

> **重要**: Phase 1 で特定した `exam-question-keywords.json[exam][anchor].slugs` の **全件**が Phase 2〜5 の処理対象となる。1 件だけ・数件だけの処理は **禁止**（後段 `verify-cycle-completeness.mjs` で `partial` 扱いとなりサイクル未完了）。全 slugs を cem-qa 閾値（R03/R04 は 2.5、他は 2.0）に到達させるまでサイクルは完了しない。

catalog slugs 全件ごとに以下を並列で実施（複数の Agent 並列起動は独立性確保のため推奨）:

1. **cem-qa 評価**:
   - `cem-qa` エージェントを呼出
   - 5 軸スコア（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）を取得
   - 合格閾値（R03/R04 は **2.5**、他年度は **2.0**）を下回るなら要修正

2. **論点カバレッジ判定（4 カテゴリ別 grep）**:
   - Phase 1 で抽出した論点配列を以下 4 カテゴリに分解し、各キーワード MDX に対し `Grep` で存在確認する
     | カテゴリ | 例 | パターン |
     |---|---|---|
     | 年号 | 1999, 2015 | `(19\|20)\d{2}` |
     | 法令番号 | 第 12 条, 法律第 56 号 | `第\s*\d+\s*条\|法律第\s*\d+\s*号` |
     | 数値 | 50%, 100 億円, 30 日 | `\d+(\.\d+)?\s*(%\|円\|億\|日\|年\|件\|名)` |
     | 比較軸 | 論点配列で名指しされた固有名 | 各設問個別 |
   - 欠落カテゴリを surface。全カテゴリ grep ヒットまたは「該当なし」と判断されれば coverage OK

3. **相互リンクチェック**:
   - 過去問側の `<RelatedKeywords>` に catalog slugs が全件含まれるか（過去問 MDX の欠落検出）
   - キーワード本文から過去問への参照は `<PastExamBacklinks>`（`past-exam-backlinks.json` から自動レンダリング）に任せ、インラインリンクの有無は問わない

**出力**: キーワードごとの分析レポート
```
{
  "keyword": "nagoya-protocol",
  "cem_qa_score": 2.1,
  "missing_points": ["遺伝資源の利用の具体例"],
  "broken_links": [],
  "needs_link_to": "pe-comprehensive-management-r06-primary#1-35"
}
```

### Phase 3: 修正方針の提案（視点タグ付き）

各修正候補に以下の**視点タグ**を付与して一覧化:

| タグ | 意味 | 修正例 |
|---|---|---|
| **網羅性** | 過去問で問われた論点が本文に欠けている | 具体例・定義・周辺概念の追加 |
| **正確性** | 事実誤認・OCR エラー・年号間違い | PDF 原文突合による修正 |
| **わかりやすさ** | 構造・表・図で改善可能 | 比較表化・SVG 追加・段落分割 |
| **試験適合** | 誤答選択肢の罠の明示 | ExamPoint に誤答パターンを明記 |
| **関連付け** | インラインリンク・RelatedKeywords 欠落 | 相互リンク追加 |

### Phase 4: ユーザー一括承認

**個別ではなくサイクル全体を 1 PR で承認**する方式。catalog slugs **全件**分のキーワードをテーブルに並べる。件数不足（partial）で承認する場合はユーザーの明示的な同意が必要。会話内で以下のサマリを提示:

```markdown
## サイクル承認 — R06 Ⅰ-1-35「生物多様性・CITES」

**catalog slugs**: 6 件 ／ **処理対象**: 6 件（全件）
**目標スコア**: 2.0（R06 は通常閾値）

### 対象キーワード（全 6 件）
| # | キーワード | 現状 → 目標 | 視点タグ | 変更量 |
|---|---|---|---|---|
| 1 | nagoya-protocol | 2.1 → 2.6 | 網羅性・関連付け | 中 |
| 2 | biosafety | 1.9 → 2.5 | 網羅性・正確性 | 大 |
| 3 | convention-on-biodiversity | 2.3 → 2.7 | わかりやすさ | 小 |
| ... | ... | ... | ... | ... |

### 承認: 一括 OK / 個別修正指示 / partial 承認 / 却下
```

- **一括 OK** → Phase 5 へ（全 slugs 処理）
- **個別修正指示** → 該当キーワードのみ方針を調整して再提示
- **partial 承認** → 全件に満たない件数で進める。Phase 5.6 の verify gate で `status = 'partial'` が記録され Umbrella に `_(partial)_` 表示。次回追加処理が前提。**ユーザーが理由を添えて承認した場合に限り許可**
- **却下** → Phase 5 スキップ、サイクル終了（state 更新なし）

### Phase 5: 実装と記録

#### 5.1 ブランチ作成

```
claude/exam-keyword-cycle-YYYY-MM-DD-{exam-slug}-{question-anchor}
```

例: `claude/exam-keyword-cycle-2026-04-20-r06-primary-1-35`

#### 5.2 キーワードごとにコミット

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

#### 5.3 サイクルログ作成

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
```

#### 5.4 インデックス更新

`.claude/state/exam-keyword-cycles/logs/index.json` に追加:

```json
{
  "cycles": [
    {
      "date": "YYYY-MM-DD",
      "exam": "r06-primary",
      "question": "1-35",
      "theme": "生物多様性・CITES",
      "keywords": ["nagoya-protocol", "biosafety", ...],
      "pr": null,
      "log": "YYYY-MM-DD-r06-primary-1-35.md"
    }
  ]
}
```

#### 5.5 state 更新

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
- `in_review` — PR 作成済・未マージ（Phase 5.6 の verify 前）
- `committed` — ローカルコミットのみ
- `partial` — catalog slugs 全件ではなく一部のみ処理（追加処理待ち）
- `full_cycle_complete` — Phase 5.6 で verify 通過済（Umbrella で `[x]` 表示対象）

### Phase 5.5: Umbrella Issue 同期

Phase 5 で `progress.json` を更新した直後に、該当年度の Umbrella Issue と親 Umbrella の checkbox・進捗%を同期する。

```bash
# 対象年度の Umbrella を更新（該当行が [x] に変わる）
node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --exam <exam-slug>

# 親 Umbrella の全体進捗%・年度別進捗を更新
node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --parent
```

- `progress.json.umbrella_issues.<exam-slug>` に Issue 番号が記録されている必要がある（未記録なら警告スキップ）
- body は毎回丸ごと再生成される。人間が手動で触った checkbox は上書きされる（手動編集禁止の注意書きを body に載せてある）
- 差分なしなら gh API を叩かない

**初回セットアップ**（Umbrella Issue がまだ無い場合）:

```bash
# 年度 Umbrella 5 本を作成（R07〜R03 primary）
for exam in r07 r06 r05 r04 r03; do
  node .claude/skills/content/exam-keyword-cycle/scripts/generate-umbrella.mjs \
    --exam pe-comprehensive-management-${exam}-primary --create
done

# 親 Umbrella を作成（年度 Issue 番号を参照するため最後）
node .claude/skills/content/exam-keyword-cycle/scripts/generate-umbrella.mjs --parent --create

# 既存の covered を初期反映
node .claude/skills/content/exam-keyword-cycle/scripts/sync-umbrella.mjs --all
```

### Phase 5.6: 完了検証（full-cycle gate）

`progress.json` と Umbrella 同期が終わった直後、完了状態を機械的に検証する。

```bash
node .claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
  --exam <exam-slug> --question <anchor> --json
```

検査内容:
1. **slugs 突合**: catalog `exam-question-keywords.json[exam][anchor].slugs` ⊆ `progress.json.covered[exam][anchor].keywords`
2. **status 突合**: `status === 'full_cycle_complete'`
3. **cem-qa 突合**: logs 内の記録値 ≥ 閾値（R03/R04 は 2.5、他は 2.0）

判定:
- `completed: true`（exit 0）→ そのまま Phase 6 へ
- `completed: false`（exit 1）→ `missing_slugs` を surface し、ユーザーに以下 2 択を問う
  - (a) `status = 'partial'` で確定してサイクル終了（Umbrella に `_(partial)_` 表示、次回追加処理対象）
  - (b) Phase 2 に戻って `missing_slugs` を追加処理する

初回処理で verify が `true` になるのは、**全 catalog slugs の MDX が cem-qa 閾値に到達し、status が `full_cycle_complete` に更新されている場合のみ**。status 更新は本 Phase の `true` 判定を確認してから手動で書き換える（自動更新は行わず、ユーザー承認後に反映）。

### Phase 6: PR 作成

`/pr-create --base develop` を呼出（CLAUDE.md「ブランチ運用ルール」に準拠）。PR body は HEREDOC で以下のテンプレに従う:

```markdown
## 起点過去問
- **R06 Ⅰ-1-35**: 生物多様性・CITES・LMO 等を扱う問題
- [該当過去問ページ](/docs/pe-comprehensive-management-r06-primary#1-35)

## 対象キーワードと視点

| キーワード | 視点タグ | cem-qa スコア | ログ |
|---|---|---|---|
| nagoya-protocol | 網羅性・関連付け | 2.1 → 2.6 | [詳細](.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-r06-primary-1-35.md#1-nagoya-protocol) |

## 変更サマリー（視点別）
- 網羅性: N 件
- 正確性: N 件
- わかりやすさ: N 件
- 試験適合: N 件
- 関連付け: N 件

## 検証
- [ ] `npm run build` 通過
- [ ] cem-qa 再評価で全キーワード ≥ 閾値（R03/R04 は 2.5、他は 2.0）
- [ ] 過去問側の `<RelatedKeywords>` と突合（欠落なし）
- [ ] `verify-cycle-completeness.mjs --exam <slug> --question <anchor>` が exit 0 で通過（full_cycle_complete）

🤖 Generated with [Claude Code](https://claude.com/claude-code)
```

PR 作成後、`index.json` と `progress.json` の `pr` フィールドに PR 番号を追記。

## 重大な発見の扱い

サイクル中に以下のような**重大な問題**を発見した場合、PR とは別に Issue を起こす:

- 過去問 MDX 自体に OCR エラーがある（設問文・選択肢の破損）
- 過去問の解答表（`/add-exam-answers`）の反映漏れ
- キーワードページが存在すべきなのにない

Issue ラベル: `content-quality`, `auto-generated`（PSI 違反 Issue と同パターン）

## 参照

- `src/config/exam-question-keywords.json` — 過去問→キーワード slug 一覧（Phase 1 の入力）
- `src/config/past-exam-backlinks.json` — キーワード→過去問一覧（双方向確認、自動生成）
- `.claude/skills/content/exam-keyword-cycle/scripts/lib/umbrella-builder.mjs` — Umbrella body 共通ビルダー＋ catalog/progress 読込 util（閾値定義 `STRICT_THRESHOLD_EXAMS` の真実源）
- `.claude/skills/content/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs` — Phase 5.6 の full-cycle gate
- `.claude/skills/content/exam-backlinks/SKILL.md` — exam-backlinks の保守スキル
- `.claude/skills/content/verify-exam-coverage/SKILL.md` — 論点カバレッジ監査（Phase 2 で利用）
- `.claude/skills/content/improve-article/SKILL.md` — 単一記事の校正ループ
- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価
- `.claude/skills/dev/pr-create/SKILL.md` — PR 自動作成
- `.claude/skills/management/distill-proofread-learnings/SKILL.md` — サイクル完了後の学習抽出
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `.claude/content-principles.md` — 校正ルールの真実源
- `.claude/state/exam-keyword-cycles/logs/` — 本サイクルのログ蓄積先
- `.claude/state/exam-keyword-cycles/progress.json` — カバー状況の永続化
- CLAUDE.md ハーネス設計原則 — Generator/Evaluator 分離（本スキルは Orchestrator）

## 段階実装計画

### MVP（実装済み）
- 手動起動・引数指定 or 会話内での対象特定
- 1 サイクル実施→ PR 作成まで通す

### Phase 2（実装済み 2026-04-20）
- `--auto` 自動選択ロジック: `scripts/select-next-question.mjs`
- weekly-review Agent F として組込み済み
- `/distill-proofread-learnings --since "1cycle"` 連動済み

### Phase 3（GitHub Actions スケジュール化）
- ワークフロー定義: `.github/workflows/exam-keyword-cycle.yml`（週 2 回、月・木 JST 22:00）
- remote trigger 実装は Claude Code remote trigger 仕様確定後に接続（現状は workflow_dispatch 手動のみ稼働）

### Phase 4（full-cycle 化・実装済 2026-04-23）
- 「過去問 1 問 = 全 catalog slugs を処理するまで未完了」ルールを明文化
- `status` enum を拡張（`full_cycle_complete` / `partial` を追加）
- `verify-cycle-completeness.mjs` で Phase 5.6 の gate を自動化
- R03/R04 は cem-qa 閾値 2.5（受験直結）
- `umbrella-builder.mjs` で DRY 化（checkbox 判定・進捗計算の共通化）
