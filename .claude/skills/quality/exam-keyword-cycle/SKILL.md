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
node .claude/skills/quality/exam-keyword-cycle/scripts/select-next-question.mjs --pretty
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
| `pe-comprehensive-management-r03-primary` | **2.5** | 運営者の合格体験ストーリーで直接参照する直近年度 |
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

> **重要**: Phase 1 で特定した `exam-question-keywords.json[exam][anchor].slugs` の **全件**が Phase 2〜5 の処理対象となる。1 件だけ・数件だけの処理は **禁止**（verify gate が未完了と判定し `[x]` 付与されない）。全 slugs を cem-qa 閾値（R03/R04 は 2.5、他は 2.0）に到達させるまでサイクルは完了しない。中間状態はスキルに存在しない（`full_cycle_complete` or 未完了のバイナリ判定）。

catalog slugs 全件ごとに以下を並列で実施（複数の Agent 並列起動は独立性確保のため推奨）:

1. **cem-qa 評価**:
   - `cem-qa` エージェントを呼出
   - 5 軸スコア（構造 30% / モバイル 25% / 原則 20% / 参考資料 15% / 関連付け 10%）を取得
   - 合格閾値（R03/R04 は **2.5**、他年度は **2.0**）を下回るなら要修正

2. **論点カバレッジ判定（auditor 出力経由、2026-05-11 改修）**:
   - `exam-keyword-mapping-auditor` エージェントを起動し、設問の論点が現紐づけ slug 群でカバーされているか semantic に判定する
     - 入力: `exam_slug`、`anchor`、`current_slugs`（Phase 1 で取得済み）
     - 出力 JSON の `evaluation.covered` / `partial` / `uncovered_issues` を Phase 2 のカバレッジ判定として採用
   - 旧方式の **4 カテゴリ別 grep**（年号 / 法令番号 / 数値 / 比較軸）は廃止。auditor の semantic 評価が同等以上のカバレッジで論点 coverage を判定する
   - 補完用途で本文中の固有名詞を確認したい場合のみ `Grep` を補助的に使う（既定では auditor 出力で十分）
   - `uncovered_issues` が空 → coverage OK。空でない場合は本文補強の指示として Phase 3 に伝搬

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

**個別ではなくサイクル全体を 1 PR で承認**する方式。catalog slugs **全件**分のキーワードをテーブルに並べる。件数不足での承認オプションは存在しない（中間状態なし）。会話内で以下のサマリを提示:

```markdown
## サイクル承認 — R06 Ⅰ-1-35「生物多様性・CITES」

**catalog slugs**: 6 件 ／ **処理対象**: 6 件（全件、必須）
**目標スコア**: 2.0（R06 は通常閾値）

### 対象キーワード（全 6 件）
| # | キーワード | 現状 → 目標 | 視点タグ | 変更量 |
|---|---|---|---|---|
| 1 | nagoya-protocol | 2.1 → 2.6 | 網羅性・関連付け | 中 |
| 2 | biosafety | 1.9 → 2.5 | 網羅性・正確性 | 大 |
| 3 | convention-on-biodiversity | 2.3 → 2.7 | わかりやすさ | 小 |
| ... | ... | ... | ... | ... |

### 承認: 一括 OK / 個別修正指示 / 却下
```

- **一括 OK** → Phase 5 へ（全 slugs 処理）
- **個別修正指示** → 該当キーワードのみ方針を調整して再提示
- **却下** → Phase 5 スキップ、サイクル終了（state 更新なし）

### Phase 5: 実装と記録

#### 5.1 作業ブランチ（既定: develop 直接）

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

## 発見事項（次サイクル以降の改善候補）

### 採点軸（rubric）への気づき
<!-- cem-qa 5 軸で評価できなかった項目・lint で検出できなかった違和感を列挙 -->
- 例: 「SVG 図版の質が cem-qa の構造軸に含まれているが、評価しきれていない」
- 例: 「mobile 軸の lint で検出されない『縦書き表』が問題化」

### リライト方法論（method）への気づき
<!-- Phase 2-5 の処理で違和感があった箇所・拡張パターン A-F で不足を感じた点を列挙 -->
- 例: 「Phase 2 の NLM 照合で『類似手法との違い』論点が拾えない」
- 例: 「視点タグ『わかりやすさ』に SVG 生成が含まれているが、独立タグ化検討」

### 起票候補
<!-- 2 回以上浮上したパターン → メタ Issue 起票推奨。1 回のみは次サイクルで再観察 -->
- 該当なし / または [Rubric] / [Method] テンプレで起票
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
- `in_review` — PR 作成済・未マージ（作業メタデータ）
- `committed` — ローカルコミットのみ（作業メタデータ）
- `full_cycle_complete` — Phase 5.6 で verify 通過済（Umbrella で `[x]` 表示対象、完了判定の唯一の条件）

`full_cycle_complete` 以外はすべて「未完了」扱い。中間状態（partial 等）は存在しない。

### Phase 5.5: Umbrella Issue 同期

Phase 5 で `progress.json` を更新した直後に、該当年度の Umbrella Issue と親 Umbrella の checkbox・進捗%を同期する。

```bash
# 対象年度の Umbrella を更新（該当行が [x] に変わる）
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --exam <exam-slug>

# 親 Umbrella の全体進捗%・年度別進捗を更新
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --parent
```

- `progress.json.umbrella_issues.<exam-slug>` に Issue 番号が記録されている必要がある（未記録なら警告スキップ）
- body は毎回丸ごと再生成される。人間が手動で触った checkbox は上書きされる（手動編集禁止の注意書きを body に載せてある）
- 差分なしなら gh API を叩かない

**初回セットアップ**（Umbrella Issue がまだ無い場合）:

```bash
# 年度 Umbrella 5 本を作成（R07〜R03 primary）
for exam in r07 r06 r05 r04 r03; do
  node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs \
    --exam pe-comprehensive-management-${exam}-primary --create
done

# 親 Umbrella を作成（年度 Issue 番号を参照するため最後）
node .claude/skills/quality/exam-keyword-cycle/scripts/generate-umbrella.mjs --parent --create

# 既存の covered を初期反映
node .claude/skills/quality/exam-keyword-cycle/scripts/sync-umbrella.mjs --all
```

### Phase 5.6: 完了検証（full-cycle gate）

`progress.json` と Umbrella 同期が終わった直後、完了状態を機械的に検証する。

```bash
node .claude/skills/quality/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs \
  --exam <exam-slug> --question <anchor> --json
```

検査内容:
1. **slugs 突合**: catalog `exam-question-keywords.json[exam][anchor].slugs` ⊆ `progress.json.covered[exam][anchor].keywords`
2. **status 突合**: `status === 'full_cycle_complete'`
3. **cem-qa 突合**: logs 内の記録値 ≥ 閾値（R03/R04 は 2.5、他は 2.0）

判定:
- `completed: true`（exit 0）→ そのまま Phase 6 へ
- `completed: false`（exit 1）→ `missing_slugs` を surface し、**Phase 2 に戻って不足分を追加処理する**（中間状態での完了扱いは不可）

初回処理で verify が `true` になるのは、**全 catalog slugs の MDX が cem-qa 閾値に到達し、status が `full_cycle_complete` に更新されている場合のみ**。status 更新は本 Phase の `true` 判定を確認してから手動で書き換える（自動更新は行わず、ユーザー承認後に反映）。

### Phase 6: 反映（既定: origin/develop push / 例外: PR）

#### 既定: develop に直接 push

Phase 5.6 の verify で `completed: true` を確認してから:

```bash
git push origin develop
```

- `index.json` / `progress.json` の `pr` フィールドは `null` のまま（PR 無しのため）
- 検証は Phase 5.6 の `verify-cycle-completeness.mjs` が担う（cem-qa スコア + catalog 突合）
- 視覚確認は develop ブランチの localhost（`npm run dev`）で実施

#### 例外: `--pr` 指定時のみ PR 作成

複数サイクルをまとめて視覚確認したい場合や変更範囲が想定より大きい場合に限り、`/pr-create --base develop` を呼出。PR body は HEREDOC で以下のテンプレに従う:

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
- 過去問の解答表の反映漏れ（Phase C の `/exam-questions-import --mode add-answers` 予定、暫定で直接 Claude 指示）
- キーワードページが存在すべきなのにない

Issue ラベル: `content-quality`, `auto-generated`（PSI 違反 Issue と同パターン）

## 参照

- `src/config/exam-question-keywords.json` — 過去問→キーワード slug 一覧（Phase 1 の入力）
- `src/config/past-exam-backlinks.json` — キーワード→過去問一覧（双方向確認、自動生成）
- `.claude/skills/quality/exam-keyword-cycle/scripts/lib/umbrella-builder.mjs` — Umbrella body 共通ビルダー＋ catalog/progress 読込 util（閾値定義 `STRICT_THRESHOLD_EXAMS` の真実源）
- `.claude/skills/quality/exam-keyword-cycle/scripts/verify-cycle-completeness.mjs` — Phase 5.6 の full-cycle gate
- `.claude/skills/quality/exam-backlinks/SKILL.md` — exam-backlinks の保守スキル
- `.claude/skills/quality/verify-exam-coverage/SKILL.md` — 論点カバレッジ監査（Phase 2 で利用）
- `.claude/skills/authoring/improve-article/SKILL.md` — 単一記事の校正ループ
- `.claude/agents/cem-qa.md` — 5 軸ルーブリック評価
- `.claude/skills/dev/pr-create/SKILL.md` — PR 自動作成
- `.claude/skills/management/distill-proofread-learnings/SKILL.md` — サイクル完了後の学習抽出
- `.claude/scripts/lib/mdx-io.mjs` — MDX 読み書き（CRLF 保持）
- `docs/reference/content-principles.md` — 校正ルールの真実源
- `.claude/state/exam-keyword-cycles/logs/` — 本サイクルのログ蓄積先
- `.claude/state/exam-keyword-cycles/progress.json` — カバー状況の永続化
- CLAUDE.md ハーネス設計原則 — Generator/Evaluator 分離（本スキルは Orchestrator）

## Issue 駆動継続改善ループ

採点（cem-qa 5 軸）とリライト方法論（4 視点 × Phase 対応）は、本スキルを使うたびに「発見事項」が surface する。これを **既存のリファレンス Issue（#205 / #206）を最新版に update する** 形で継続改善する。

### 中核原則: Issue を増やさない

採点とリライトの議論先は **常に同じ Issue**:

- **採点ルーブリックの議論** → **#205 のコメント**で開始
- **リライト方法論の議論** → **#206 のコメント**で開始

合意した内容は Claude が #205 / #206 本文の「合意済み」セクションへ移動し、真実源（cem-qa.md / SKILL.md 等）を同期更新する。**新規 Issue は原則立てない**。

### ループ全体図

```
試走サイクル (/exam-keyword-cycle ...)
  ↓
Phase 5.3 サイクルログに「発見事項」記録
  ├ 採点軸への気づき
  ├ リライト方法論への気づき
  └ 議論開始候補（2 回以上浮上したパターンのみ）
  ↓
/distill-proofread-learnings --since "Ncycle" で横断抽出
  ↓
既存リファレンス Issue にコメント投稿（2 回ルール超え時）
  ├ 採点側 → #205 のコメントで議論開始
  └ リライト側 → #206 のコメントで議論開始
  ↓
コメント上で議論・ユーザー承認
  ↓
Claude が真実源を同期更新 + 該当 Issue 本文の「合意済み」へ移動
  ├ 採点修正: .claude/agents/cem-qa.md + docs/reference/content-principles.md + templates/cem.md（3 ファイル同期必須）+ #205 本文
  └ 方法論修正: .claude/skills/quality/exam-keyword-cycle/SKILL.md ほか該当 SKILL.md + #206 本文
  ↓
次サイクルから新ルール適用 → 改善効果を再観察 → ループ
```

### Issue 起票判断基準

| 判断 | アクション |
|---|---|
| **1 回限りの違和感** | サイクルログに「発見事項」として記録のみ。次サイクルで再観察 |
| **2 回以上浮上したパターン** | **#205 or #206 のコメント**で議論開始（新規 Issue は立てない） |
| **明らかなバグ・OCR エラー** | 別途 `content-quality` + `auto-generated` で個別 Issue（既存運用） |
| **例外: 構造的に大きな変更** | 5 軸完全リセット・拡張パターン A-G 全面改修等のレアケースのみ、`[Rubric]` / `[Method]` テンプレで新規 Issue |

### 議論場所の選択ガイド

- **採点関連**（cem-qa 5 軸の重み・閾値・新軸追加・既存軸の判定基準改修）→ **#205**
  - 例: 「SVG 図版の質を独立軸化」「mobile 軸の lint パターン追加」「閾値 2.0 → 1.9 緩和」
  - 反映先（同期必須）: `.claude/agents/cem-qa.md` + `docs/reference/content-principles.md` + `templates/cem.md` + #205 本文
- **リライト関連**（4 視点 × Phase 対応・視点タグ・拡張パターン A-G・NLM 照合プロンプト）→ **#206**
  - 例: 「視点タグに『独立性』を追加」「Phase 2 で notebooklm-research を必須化」「拡張パターン H 新設」
  - 反映先（対象スキルのみ + #206 本文）: `.claude/skills/quality/exam-keyword-cycle/SKILL.md` ほか該当 SKILL.md

### 議論クローズ条件（コメント議論の終了）

3 点すべて揃ったら、議論コメントスレッドを「決定済み」とマークする:

1. **#205 or #206 本文の「合意済み」セクションに反映** — 変更内容・適用日・効果測定方法を本文に記録
2. **真実源 commit** — cem-qa.md / SKILL.md 等を更新して commit
3. **次サイクルでの効果確認** — 新ルール適用後、改善が観察できたかをコメントで追記

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
- `status` に `full_cycle_complete` を追加（完了判定の唯一のシグナル、中間状態なし）
- `verify-cycle-completeness.mjs` で Phase 5.6 の gate を自動化
- R03/R04 は cem-qa 閾値 2.5（受験直結）
- `umbrella-builder.mjs` で DRY 化（checkbox 判定・進捗計算の共通化）
