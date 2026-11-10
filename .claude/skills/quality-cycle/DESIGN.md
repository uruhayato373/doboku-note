# quality-cycle 設計思想（DESIGN）

> **位置づけ**: `/quality-cycle` スキルの **Why / 設計判断記録（ADR）** の真実源。
> 現行の仕様（モード一覧・パス・コマンド）は `SKILL.md` を参照すること。
> 本書は時間が経っても価値が落ちない「なぜこの設計か」のみを残す。
>
> **初版**: 2026-04-14（CEM 単独設計として作成（当初は当時の docs/project 配下の別ファイル、本 DESIGN.md に統合））
> **2026-04-23**: civil-textbook プロファイルを統合した汎用スキルに拡張（`--profile {cem|civil-textbook}`）
> **2026-04-27**: 当時の `docs/project/13` を本書に集約し削除

---

## 設計の動機

- 700 ページ規模のサイトを 1 人で運営するため、品質維持を**人手だけ**で回すのは不可能
- 既存ハーネスは「1 ページずつ作成・1 ページずつ評価」の単発ツール（`/keyword-page` + `cem-qa`）で、全体俯瞰がない
- AdSense 不合格を受け、品質ばらつきを継続的に検出・改善する仕組みが必要
- 将来的には 1級土木・他分野コンテンツへも拡張可能な汎用基盤としたい（→ `--profile` 拡張で実現済）

---

## 設計原則

1. **Evaluator エージェントが品質ルーブリックの唯一の真実源**
   Pure JS で再実装しない。質的判定（文章のわかりやすさ・独自性）は LLM でなければ判定不能であり、Pure JS は機械的指標の集計（既存 lint で十分）のみ。

2. **2 段階スコアリング**
   - **Tier 1（機械的・全件）**: 高速・低コスト。文字数・lint 違反を数えるだけ。全ページに実行。
   - **Tier 2（質的・選抜のみ）**: 低速・中コスト。Tier 1 の上位候補を Evaluator subagent で深く評価。

3. **Generator/Evaluator 厳密分離**
   - **Generator**: profile 別のリライトエージェント（`keyword-rewriter` / `civil-textbook-rewriter` 等）
   - **Evaluator**: profile 別の評価エージェント（`cem-qa` / `civil-construction-qa` 等）
   - 同一エージェントが両方を担うことを禁じる（自己評価バイアス回避）

4. **人間ゲート必須**
   AI がリライトしたら必ず `frontmatter.reviewStatus = "needs-review"` を付与。承認は人間のみ。`reviewStatus = "approved"` になるまで「未完成」とみなす。

5. **データは git 管理**
   `.claude/state/*.json` はリポジトリにコミット。スコアの履歴・状態遷移を追跡可能にする。

6. **べき等性**
   何度実行しても同じ結果。再実行コストが低い（キャッシュ活用）。

---

## Tier 1 候補スコア式

機械的事前ふるいで全ページに付与するスコア。Tier 2 へ送る上位 N 件を選抜する用途。

```
candidate_score = log10(body_chars / 100) * 2.0
                + (description_length >= 50 ? 2.0 : 0.0)
                + (lint_high == 0 ? 3.0 : -lint_high * 1.0)
                + (lint_medium == 0 ? 1.0 : 0.0)
                + (image_count > 0 ? 2.0 : 0.0)
                + (related_keyword_links > 3 ? 1.0 : 0.0)
```

**意図**:
- 文字数は対数で効かせる（短すぎは強く減点、長文の差は鈍く）
- lint 違反は HIGH を強く減点
- description / 画像 / 内部リンクは「最低限の体裁」として加点
- 係数は経験値で調整可能。真実源は `scripts-*/quality-cycle.mjs` の実装

---

## 拡張パターンカタログ（Generator 入力）

弱いページに Generator が適用する「拡張パターン」のカタログ。weak_axes に応じて 1〜2 つを自動選択する。

| ID | パターン | 内容 | 適用例 |
|---|---|---|---|
| A | 具体例・ケーススタディ | 実務での使われ方を 1〜2 件 | BCP、リスク評価 |
| B | 計算例・ワークスルー | 数式・手順を実数で | MTBF、減価償却 |
| C | 比較・対比表 | 類似概念との違い | フェールセーフ vs フェールソフト |
| D | 歴史・背景 | なぜこの概念が必要になったか | ISO 14000、独占禁止法 |
| E | 試験での問われ方 | 過去問での出題傾向 | 全頻出概念 |
| F | mermaid 図解 | フロー・概念図 | プロセス系 |

**意図**: AI 生成シグナルを抑えつつ独自性を足すため、パターンを多様化。バルクリライトで全ページに同じ構造が出ることを避ける。

---

## ワークフロー状態遷移

```
unscored → scored → rewriting → needs-review → verified → approved
                                              └→ needs-rework → rewriting (loop)
                                              └→ rejected (human decision)
```

**意図**:
- `verified` と `approved` を分離することで、AI による「再評価でスコア上昇」と「人間による公開承認」を別ゲートとして区別
- `needs-rework` ループにより、AI が改善できなかったケースを明示的に検出

---

## 設計上の判断記録（ADR）

### Q1. なぜ Pure JS rubric を作らないのか

- Evaluator の質的判定は LLM でしか再現できない
- Pure JS で書ける部分は既存 `lint-mdx-mobile.mjs` でカバー済み
- 二重実装は エージェント定義 と quality-rubric.mjs の同期コストが発生
- 真実源を 1 つに保つ原則に違反

### Q2. なぜ 2 段階スコアリングか

- 700 件全件を Tier 2（subagent）で評価するとコスト・時間が膨大
- Tier 1 で機械的に上位を絞ることで、Tier 2 を実用範囲に収める
- Tier 1 の判定基準は調整可能（候補スコア式）

### Q3. なぜ Generator/Evaluator を分離するか

- 自己評価バイアスを構造で回避
- AdSense 不合格の根因の一つが「AI 一括生成 + 自己評価」パターンの可能性
- ハーネス設計原則 1（CLAUDE.md）に準拠

### Q4. なぜ `.claude/state/` を git 管理するか

- スコアの履歴を追跡可能
- 「いつ・誰が・何を承認したか」を git log で見られる
- レビューの透明性確保
- 環境依存ではない（CI でも動く）

### Q5. なぜ reviewStatus を frontmatter に置くか

- 公開ページのレンダリング時には剥がされるので外部に露出しない
- ファイル単位で独立して管理できる
- git diff で変更が見える
- 将来 sitemap や index 生成スクリプトでフィルタ可能

---

## リスクと対応

| リスク | 対応 |
|---|---|
| Tier 2 のコストが高い | 上位 N 件に絞る、キャッシュ活用 |
| Subagent が想定外の出力をする | プロンプトで JSON 形式を厳密指定、parse 失敗時はリトライ |
| バルクリライトが AI 生成シグナル | バッチ分割コミット、拡張パターン多様化、人間レビュー必須 |
| state JSON が肥大化 | 古い history はトリム |
| Evaluator エージェント定義のルール変更時 | quality-cycle 側はプロンプトで参照のみ → 自動追従 |

---

## 関連リソース

- `SKILL.md` — 現行スキル仕様（モード・引数・パス）の真実源
- `templates/cem.md` / `templates/civil-textbook.md` — profile 別テンプレート
- `.claude/agents/cem-qa.md` / `civil-construction-qa.md` — Tier 2 評価ルーブリックの真実源
- `.claude/agents/keyword-rewriter.md` / `civil-textbook-rewriter.md` — Generator 真実源
- `.claude/knowledge/reference/content-principles.md` — コンテンツ原則の真実源
- `.claude/scripts/lint-mdx-mobile.mjs` — Tier 1 機械的判定
- このシステムが使われた最初の文脈（AdSense 再申請、2026-04。関連ドキュメントは廃止）
- Cycle 2 の handoff 履歴（関連ドキュメントは廃止）
