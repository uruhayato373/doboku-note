---
name: distill-proofread-learnings
description: >
  直近の校正作業（MDX/SVG の git 差分 + ユーザー指示）を分析し、
  content-principles.md・関連スキル・memory に反映すべき新ルール / 精緻化 / 嗜好を抽出する。
  校正スキルを継続的に底上げするメタスキル。
  Use when user asks to [校正スキル改善, 校正ルール更新, /distill-proofread-learnings, レビュー振り返り, 原則精緻化, 校正の学習].
---

# /distill-proofread-learnings — 校正学習の蒸留

校正作業を行った後、その経験から **普遍的ルール**・**既存原則の精緻化**・**ユーザー嗜好**・**ワークフロー改善** を取り出し、適切な保存先に反映するメタスキル。

> **モデル方針**: このスキルは判断の粒度が高く（何がルールで何が偶然か、どこに保存すべきか）、親エージェント（Opus 推奨）の思考力を必要とする。サブエージェントに委譲しない。

## 用途

校正（/improve-article, /review, キーワードページ直接編集等）を行った後、その中で起きた「次回も使える学び」を抽出して保存する。**校正スキルそのものを継続的に更新する仕組み**。

### 解決する問題

- 校正するたびに同じパターン（表記ゆれ・構造の崩れ等）を毎回発見しては忘れる
- ユーザー指摘を受けても口頭にとどまり、次回の Claude が同じミスをする
- content-principles.md が静的で、実運用で発見した知見が反映されない

## 引数

```
/distill-proofread-learnings [--since <range>] [--pages <slug,slug>]
```

- `--since`（任意）: 分析対象の期間。
  - `7d` — 直近 7 日のコミット
  - `1session` — 今セッションの編集分（デフォルト）
  - `HEAD~5` — 直近 5 コミット
  - `1cycle` — 最新の `/exam-keyword-cycle` サイクル（開始コミットから HEAD まで）
- `--pages`（任意）: 特定ページに絞る。カンマ区切りスラグ

### `--since "1cycle"` の動作

> **注記（2026-07-03）**: `/exam-keyword-cycle` は 2026-05-15 に退役（`/quality-cycle` へ一本化）。`.claude/state/exam-keyword-cycles/` は 2026-05-14 で凍結済み。以下のサイクル起点の絞込は当該 state が凍結のため実質空振り。**現行は後継 `/quality-cycle` 完了後に、または `--pages` / 手動範囲指定で使うこと**（凍結 state を読む手順は歴史記述として残置）。全面改修は棚卸し提案で判断待ち。

`/exam-keyword-cycle` 完了直後に呼ばれることを想定。最新サイクルの範囲に絞って学習抽出する:

1. `.claude/state/exam-keyword-cycles/logs/index.json` の `cycles[-1]` を読む（最新サイクル）
2. そのサイクルのログ（`.claude/state/exam-keyword-cycles/logs/YYYY-MM-DD-*.md`）から:
   - 視点タグ（網羅性・正確性・わかりやすさ・試験適合・関連付け）を抽出 → Phase 2 の分類ヒント
   - 対象キーワード slug を抽出 → `--pages` と同等に絞込対象にする
3. 開始コミットを特定: `git log --grep="claude/exam-keyword-cycle-" --format=%H | head -1` の親コミット、または サイクルログ作成時点のコミット
4. `git diff <開始コミット>..HEAD -- .local/r2/posts/` で差分を取得
5. 視点タグを Phase 2 の分類に重み付けして surface（同一タグが複数キーワードで適用されたら新規ルール候補に昇格）

出力は通常の `--since` と同じフォーマットだが、「サイクル」フィールドを冒頭に追記:

```markdown
## 分析対象
- 対象サイクル: R06 Ⅰ-1-35（2026-04-20）
- 対象視点タグ: 網羅性、関連付け
- 対象ページ: 6 件（nagoya-protocol, biosafety, ...）
```

## 前提条件

このスキルは以下を読み取れる環境で動く:
- 会話履歴（ユーザーの指示・修正指示・補足情報）
- `git log` / `git diff`（`.local/r2/posts/` 配下の MDX/SVG 変更）
- `.claude/knowledge/reference/content-principles.md`（現状のルールセット）
- `.claude/skills/` 配下の関連 SKILL.md

## 実行手順

### Phase 1: データ収集

1. **git で差分取得**:
   ```bash
   git log --since="<range>" --oneline -- .local/r2/posts/
   git diff <from>..HEAD -- .local/r2/posts/
   ```

2. **会話履歴の要点抽出**:
   - ユーザーの直接指示（「◯◯を修正して」「△△は不適切」）
   - ユーザーの修正（Claude の提案を押し戻した箇所）
   - ユーザーの肯定（「それで進めて」「良い」と認められたパターン）

3. **既存原則の読み込み**:
   - `.claude/knowledge/reference/content-principles.md` 全文
   - 対象範囲のスキル（keyword-page, create-svg, review-mobile 等）

### Phase 2: 分類

各変更・指示を以下 6 カテゴリに振り分ける:

| カテゴリ | 特徴 | 保存先 |
|---|---|---|
| **既存原則の適用** | content-principles.md 既存ルールの適用 | **記録しない**（学習不要） |
| **新規ルール候補** | 既存原則に含まれない、複数回（2 回以上）適用されたパターン | `content-principles.md` に追加 |
| **既存原則の精緻化** | 既存ルールの境界・例外・適用手順が明確化された | `content-principles.md` を修正 |
| **ユーザー嗜好** | 一般化しにくい個別の好み／ワークスタイル | `memory/` （feedback 型） |
| **ワークフロー改善** | 校正の進め方・順序・ツール使い方の改善 | 関連 SKILL.md / `workflows.md` |
| **採点・リライト議論候補** | 採点ルーブリック（cem-qa 5 軸）・リライト方法論（4 視点 × Phase 対応）の改修候補。議論を要するため **即適用せず判断を仰ぐ** | `docs/todo/backlog.md` の「🟣 判断待ち」セクションに起票 |

**採点・リライト議論候補の判定基準**:

- **採点側候補**: 採点軸の重み・閾値・新軸追加・既存軸の判定基準改修など
  - 反映先（ユーザー承認後）: `cem-qa.md` + `content-principles.md` + `templates/cem.md` の **3 ファイル同期更新が必要**
- **リライト側候補**: 視点タグ追加・Phase 対応の見直し・拡張パターン A-G 改修・NLM 照合プロンプト調整など
  - 反映先（ユーザー承認後）: `exam-keyword-cycle/SKILL.md` ほか該当 SKILL.md の修正
- **議論の置き場**: 採点・リライト方法論の改修は即適用せず、`docs/todo/backlog.md` の「🟣 判断待ち」セクションに1件として起票してユーザーの判断を仰ぐ。タスク・判断の単一正源は `docs/todo/`（**GitHub Issue は使わない**＝真実源 `.claude/knowledge/reference/information-architecture.md`）
- **2 回ルール**: 1 回限りの違和感は次サイクル再観察、2 回以上浮上したパターンのみ起票推奨

### Phase 3: 候補の surface

各候補について以下を明示:

- **対象ファイル**: 更新先のパスと該当セクション
- **Before/After**: 現状の記述と提案する変更の diff
- **根拠**:
  - 今回の校正で適用された具体例（ページスラグ + 行番号）
  - 該当するユーザー指示の引用（ある場合）
  - 複数回適用の証拠（2 回以上でないと「新規ルール」には昇格しない）
- **影響範囲**: 今後の校正でどのページ／スキルに影響するか

### Phase 4: ユーザー承認

surface した候補を Markdown レポート形式で会話に出力し、ユーザーが承認したもののみ適用する。

- ✅ 採択 → 実際にファイルを編集
- ⏸️ 保留 → ステータスを記録し次回再考
- ❌ 却下 → 学習候補から除外（理由を記録）

### Phase 5: 適用と記録

承認された変更を実際に編集し、以下に記録:

- 適用ログ: `.claude/state/proofread-learnings/YYYY-MM-DD.md`
- 採用できなかった候補（却下理由付き）も同ファイルに残し、将来の再検討に備える

## 出力フォーマット

```markdown
# 校正学習の振り返り YYYY-MM-DD

## 分析対象
- 対象期間: `since="1session"`
- 対象コミット: N 件（<commit1>, <commit2>, ...）
- 対象ページ: N 件（<slug1>, <slug2>, ...）

## 分類サマリー
- 既存原則の適用: N 件（学習対象外）
- 新規ルール候補: N 件
- 既存原則の精緻化: N 件
- ユーザー嗜好: N 件
- ワークフロー改善: N 件
- 採点・リライト議論候補: N 件（採点 N 件 / リライト N 件）

## 新規ルール候補

### 1. [ルール名]

**対象**: `.claude/knowledge/reference/content-principles.md` §X
**根拠**: 
- 今回 eco-label・csr の 2 件で同パターンを適用
- ユーザー指示: 「タイプI に統一して」（発話: 2026-04-20）

**追加案**:
> [具体的な追加文]

---

## 既存原則の精緻化候補

### 1. [対象原則]

**現状**（content-principles.md §N）:
> [現在の記述]

**提案**:
> [精緻化案]

**根拠**: [今回の適用例]

---

## ユーザー嗜好

### 1. [嗜好の内容]

**保存先**: `memory/feedback_<topic>.md`
**内容**:
> [memory 記述案]

---

## ワークフロー改善

### 1. [改善点]

**対象**: `.claude/skills/{category}/<skill>/SKILL.md`
**変更**: [手順の追加・修正]

---

## 採点・リライト議論候補

### 1. [候補名]

**種別**: 採点側 / リライト側 のいずれか
**サイクル**: 2 回以上浮上（[サイクル1リンク], [サイクル2リンク]）
**観察**: [両サイクルで共通して見られた現象]
**仮説**: [採点軸の改修案 or リライト方法論の改修案]
**反映先（ユーザー承認後、Claude が同期更新）**:
- 採点側の場合: `.claude/agents/cem-qa.md` + `.claude/knowledge/reference/content-principles.md` + `templates/cem.md`（3 ファイル同期）
- リライト側の場合: `.claude/skills/quality/quality-cycle/SKILL.md` ほか該当 SKILL.md

**起票先**: `docs/todo/backlog.md` の「🟣 判断待ち」セクションに1件として記録し、ユーザーの判断を仰ぐ（即適用しない）。

---

## 次回参照
- 今回の分析ログ: `.claude/state/proofread-learnings/YYYY-MM-DD.md`
- 次回は `/distill-proofread-learnings --since "HEAD~<N>"` で差分累積を追跡可能
```

## 制約事項

- **1 回だけ現れたパターンは学習対象外**: 偶然の可能性が高い。2 回以上の適用例が必要
- **既存原則と衝突する新ルールは提案しない**: 既存を精緻化する形で surface する
- **content-principles.md の大幅な構造変更はしない**: 章立てを維持し、既存セクション内での追加・修正に留める
- **ユーザー嗜好と普遍的ルールを混同しない**: 判断に迷ったら嗜好として memory へ（可逆）
- **自動適用しない**: Phase 4 のユーザー承認を必ず経る

## ハーネス原則との整合

CLAUDE.md「ハーネス設計原則」との整合:
- **5. 新モデルが出たらハーネスを見直す** — このスキルは継続的見直しを実装化したもの
- **2. 「何を作るか」を先に合意する** — 本スキル自体が「次回の完成の定義」を更新する役割
- **1. Generator と Evaluator を分離する** — 本スキルは「ルールを作る役」（Generator ではない、むしろ Curator）。校正実行（Generator）・評価（Evaluator）と独立

## 想定される頻度

- **理想**: 校正が一区切りついたタイミング（1〜数ページ完了後）で毎回
- **現実**: 週 1 回程度、`/weekly-review` と連動させるのが実用的

将来的に `weekly-review` の Agent として組み込むことも可能（現時点ではユーザー手動呼び出し）。

## 参照

- `.claude/knowledge/reference/content-principles.md` — 校正ルールの真実源（主な更新対象）
- `.claude/knowledge/reference/skills-design-guide.md` — スキル改訂のガイドライン
- `.claude/skills/authoring/keyword-page/SKILL.md` — 総監キーワードの校正ルールを参照
- `.claude/skills/authoring/improve-article/SKILL.md` — 校正オーケストレータ
- `.claude/skills/quality/review-mobile/SKILL.md` — モバイル視認性ルール
- `.claude/state/proofread-learnings/` — 過去の学習ログ蓄積先
- `.claude/skills/quality/quality-cycle/SKILL.md` — 品質サイクルのオーケストレータ（関連スキル）
- CLAUDE.md ハーネス設計原則 — Generator/Evaluator 分離・パラメタ化優先
