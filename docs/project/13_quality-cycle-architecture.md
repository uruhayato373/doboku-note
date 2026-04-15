# 13. Quality Cycle アーキテクチャ

> **作成日**: 2026-04-14
> **目的**: キーワードページ品質の継続的改善サイクル（スコアリング → リライト → 検証 → 人間レビュー）を仕組み化する。
> **関連ドキュメント**: `12_adsense-resubmission-strategy.md`（緊急対応の文脈）, `01_設計思想.md`（コンテンツ品質の方針）

---

## 設計の動機

- 700 ページ規模のサイトを 1 人で運営するため、品質維持を**人手だけ**で回すのは不可能
- 既存ハーネスは「1 ページずつ作成・1 ページずつ評価」の単発ツール（`/keyword-page` + `cem-qa`）で、全体俯瞰がない
- AdSense 不合格を受け、品質ばらつきを継続的に検出・改善する仕組みが必要
- 将来的には 1級土木・他分野コンテンツへも拡張可能な汎用基盤としたい

---

## 設計原則

1. **cem-qa エージェントが品質ルーブリックの唯一の真実源**  
   Pure JS で再実装しない。質的判定（文章のわかりやすさ・独自性）は LLM でなければ判定不能であり、Pure JS は機械的指標の集計（既存 lint で十分）のみ。

2. **2 段階スコアリング**  
   - **Tier 1（機械的・全件）**: 高速・低コスト。文字数・lint 違反を数えるだけ。全 700 ページに実行。
   - **Tier 2（質的・選抜のみ）**: 低速・中コスト。Tier 1 の上位候補を cem-qa subagent で深く評価。

3. **Generator/Evaluator 厳密分離**  
   - **Generator**: `keyword-rewriter` エージェント（リライトのみ）
   - **Evaluator**: `cem-qa` エージェント（評価のみ）
   - 同一エージェントが両方を担うことを禁じる（自己評価バイアス回避）

4. **人間ゲート必須**  
   AI がリライトしたら必ず `frontmatter.reviewStatus = "needs-review"` を付与。承認は人間のみ。`reviewStatus = "approved"` になるまで「未完成」とみなす。

5. **データは git 管理**  
   `.claude/state/*.json` はリポジトリにコミット。スコアの履歴・状態遷移を追跡可能にする。

6. **べき等性**  
   何度実行しても同じ結果。再実行コストが低い（キャッシュ活用）。

---

## アーキテクチャ全体図

```
┌──────────────────────────────────────────────────────┐
│  /quality-cycle  (新規スキル)                        │
│    --mode screen | score | rewrite | verify | review │
└──────────────────────────────────────────────────────┘
       │
       ├─► [Tier 1] 機械的事前ふるい
       │     scripts/quality-cycle.mjs (mode: screen)
       │     - lint-mdx-mobile.mjs を全ページに実行
       │     - 文字数・lint違反を集計
       │     - 候補スコアを算出
       │     → .claude/state/mechanical-screen.json
       │
       ├─► [Tier 2] 質的詳細評価
       │     scripts/quality-cycle.mjs (mode: score)
       │     - 候補上位 N 件 (デフォルト200) を選抜
       │     - 各ページに対し Task subagent で cem-qa 呼び出し
       │     - バッチ並列実行
       │     → .claude/state/quality-scores.json
       │
       ├─► [Generator] keyword-rewriter エージェント (新規)
       │     .claude/agents/keyword-rewriter.md
       │     scripts/quality-cycle.mjs (mode: rewrite)
       │     - 入力: slug + 弱点軸 + 拡張パターン候補
       │     - 出力: 改訂版 article.mdx
       │     - frontmatter に reviewStatus: needs-review 付与
       │
       ├─► [Evaluator 再実行] cem-qa
       │     scripts/quality-cycle.mjs (mode: verify)
       │     - リライト後を再評価
       │     - 改善確認 → state 更新
       │
       └─► [Output]
             scripts/quality-cycle.mjs (mode: review)
             → .claude/state/review-queue.md (人間レビュー待ちリスト)
```

---

## データフロー

```
700 article.mdx ── lint ──> .claude/state/mechanical-screen.json (全件)
                              │
                              ▼ 上位 200 件選抜
                          cem-qa subagent
                              │
                              ▼
                  .claude/state/quality-scores.json (200件の質的評価)
                              │
                              ▼ 弱いものから 100 件選抜（flagship）
                       keyword-rewriter
                              │
                              ▼
              改訂版 article.mdx (reviewStatus: needs-review)
                              │
                              ▼
                          cem-qa 再評価
                              │
                              ▼
              .claude/state/quality-cycle-state.json (state 更新)
                              │
                              ▼
                  .claude/state/review-queue.md (人間向け出力)
```

---

## コンポーネント詳細

### A. `/quality-cycle` スキル

| 項目 | 内容 |
|---|---|
| 場所 | `.claude/skills/content/quality-cycle/SKILL.md` |
| タイプ | オーケストレータスキル |
| 内部実装 | `scripts/quality-cycle.mjs` を呼び出す |

**サブモード一覧**:

| モード | 役割 | 実行時間目安 |
|---|---|---|
| `screen` | Tier 1 機械的事前ふるい | 約 1 分（700件） |
| `score` | Tier 2 質的評価 | 約 5〜15 分（200件・並列3） |
| `rewrite` | 弱いページのリライト | 約 5〜30 分（バッチサイズ依存）|
| `verify` | リライト後の再評価 | 約 5〜10 分 |
| `review` | 人間レビュー待ちリスト出力 | 約 1 秒 |
| `report` | ダッシュボード出力 | 約 1 秒 |

### B. Tier 1: Mechanical Screen

**実装**: `scripts/quality-cycle.mjs` の `runScreen()` 関数

**動作**:
1. `lint-mdx-mobile.mjs` を全ページに実行
2. 各ページの本文文字数を測定
3. frontmatter から description 長さ・reviewStatus を抽出
4. 候補スコアを算出
5. JSON に出力

**候補スコアの計算式**（暫定）:

```
candidate_score = log10(body_chars / 100) * 2.0
                + (description_length >= 50 ? 2.0 : 0.0)
                + (lint_high == 0 ? 3.0 : -lint_high * 1.0)
                + (lint_medium == 0 ? 1.0 : 0.0)
                + (image_count > 0 ? 2.0 : 0.0)
                + (related_keyword_links > 3 ? 1.0 : 0.0)
```

**出力**: `.claude/state/mechanical-screen.json`

```json
{
  "version": 1,
  "screened_at": "2026-04-14T16:00:00Z",
  "pages": {
    "antitrust-compliance": {
      "body_chars": 3543,
      "lint_high": 0,
      "lint_medium": 0,
      "lint_low": 0,
      "description_length": 95,
      "review_status": null,
      "image_count": 0,
      "related_keyword_links": 8,
      "candidate_score": 8.5
    }
  }
}
```

### C. Tier 2: Quality Score

**実装**: `scripts/quality-cycle.mjs` の `runScore()` 関数

**動作**:
1. `mechanical-screen.json` から候補上位 N 件（デフォルト 200）を選抜
2. 既に `quality-scores.json` に評価済みのページはスキップ（キャッシュ）
3. バッチ並列（デフォルト 3 件同時）で Task subagent を呼び出し
4. 各 subagent には以下のプロンプトを渡す:

```
あなたは cem-qa エージェントです。
.claude/agents/cem-qa.md のルーブリックに従い、
.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx を 5 軸で評価してください。

手順:
1. 該当ファイルを Read で読む
2. node scripts/lint-mdx-mobile.mjs <file> を実行
3. ファイル内容と lint 結果を踏まえて 5 軸を 0-3 点で採点
4. 結果を JSON で返す:
   {
     "scores": {"structure": N, "mobile": N, "principle": N, "reference": N, "linking": N},
     "weighted": X.XX,
     "weak_axes": ["..."],
     "qualitative_comment": "..."
   }
```

**出力**: `.claude/state/quality-scores.json`

```json
{
  "version": 1,
  "scored_at": "2026-04-14T16:30:00Z",
  "pages": {
    "antitrust-compliance": {
      "scores": {"structure": 3, "mobile": 3, "principle": 3, "reference": 3, "linking": 3},
      "weighted": 3.00,
      "weak_axes": [],
      "qualitative_comment": "全軸で優秀。ベンチマーク級。",
      "scored_at": "2026-04-14T16:30:00Z"
    }
  }
}
```

### D. Generator: keyword-rewriter

**場所**: `.claude/agents/keyword-rewriter.md`

**役割**: 弱いページに「拡張パターン」を適用してリライトする

**入力**:
- slug
- weak_axes (cem-qa の評価結果から取得)
- expansion_patterns (A〜F から 1〜2 つ自動選択)

**拡張パターンカタログ**:

| ID | パターン | 内容 | 適用例 |
|---|---|---|---|
| A | 具体例・ケーススタディ | 実務での使われ方を 1〜2 件 | BCP、リスク評価 |
| B | 計算例・ワークスルー | 数式・手順を実数で | MTBF、減価償却 |
| C | 比較・対比表 | 類似概念との違い | フェールセーフ vs フェールソフト |
| D | 歴史・背景 | なぜこの概念が必要になったか | ISO 14000、独占禁止法 |
| E | 試験での問われ方 | 過去問での出題傾向 | 全頻出概念 |
| F | mermaid 図解 | フロー・概念図 | プロセス系 |

**出力**:
- 改訂版 `article.mdx`（既存内容を尊重し、拡張内容を追加）
- frontmatter に `reviewStatus: "needs-review"` と `lastRewrittenAt` を付与

**担当外**:
- スコアリング（cem-qa 担当）
- 公開判定（人間担当）

### E. Evaluator: cem-qa（既存）

**場所**: `.claude/agents/cem-qa.md`

quality-cycle の `score` モードと `verify` モードの両方で使う。
リライト後の再評価で改善が確認できれば state を `verified` に、悪化していれば `needs-rework` に。

**この設計では cem-qa は変更不要**。エージェント定義は既存のままで再利用できる。

### F. Workflow State

**場所**: `.claude/state/quality-cycle-state.json`

**スキーマ**:

```json
{
  "version": 1,
  "cycle": 1,
  "started_at": "2026-04-14T16:00:00Z",
  "pages": {
    "antitrust-compliance": {
      "status": "approved",
      "history": [
        {"date": "2026-04-14T16:30:00Z", "action": "scored", "score": 2.8},
        {"date": "2026-04-14T17:00:00Z", "action": "rewrote", "score_after": 3.0},
        {"date": "2026-04-14T17:30:00Z", "action": "verified", "score": 3.0},
        {"date": "2026-04-15T09:00:00Z", "action": "approved_by_human"}
      ]
    }
  }
}
```

**状態遷移**:

```
unscored → scored → rewriting → needs-review → verified → approved
                                              └→ needs-rework → rewriting (loop)
                                              └→ rejected (human decision)
```

### G. Human Review Queue

**場所**: `.claude/state/review-queue.md`（自動生成）

**例**:

```markdown
# レビュー待ちキーワード（45件）

## 1. pdca-cycle
- リライト前スコア: 0.95
- リライト後スコア: 2.10
- 弱点軸: principle, reference
- 主な変更: 「実務での観点」セクション追加（450字）
- ファイル: .local/r2/posts/.../pdca-cycle/article.mdx
- 確認URL: http://localhost:3020/docs/pe-comprehensive-management-pdca-cycle
- アクション:
  - [承認] frontmatter の reviewStatus を 'approved' に変更
  - [却下] frontmatter の reviewStatus を 'rejected' に変更
  - [手直し] 直接編集後、reviewStatus を 'approved' に
```

人間はこれを見ながら、ブラウザで該当ページを確認し、frontmatter を手動編集（または専用 CLI）で承認／却下する。

---

## ワークフロー全体

### 初回サイクル（AdSense 緊急対応）

```bash
# Step 1: 全ページに機械的事前ふるい
node scripts/quality-cycle.mjs --mode screen
# → .claude/state/mechanical-screen.json (全 700 件)

# Step 2: 上位 200 件を質的評価
node scripts/quality-cycle.mjs --mode score --top 200
# → .claude/state/quality-scores.json (200 件)

# Step 3: weighted < 2.5 のページをリライト
node scripts/quality-cycle.mjs --mode rewrite --threshold 2.5
# → 50〜100 件の article.mdx に reviewStatus: needs-review

# Step 4: リライト後を再評価
node scripts/quality-cycle.mjs --mode verify
# → state 更新

# Step 5: 人間向けレビュー待ちリスト出力
node scripts/quality-cycle.mjs --mode review
# → .claude/state/review-queue.md
```

### 継続的サイクル

サイクル完了後は、新規キーワードページが追加されるたび or 月次で：

```bash
node scripts/quality-cycle.mjs --mode screen
node scripts/quality-cycle.mjs --mode score --top 50  # 差分のみ
node scripts/quality-cycle.mjs --mode rewrite --threshold 2.0
node scripts/quality-cycle.mjs --mode verify
node scripts/quality-cycle.mjs --mode review
```

---

## 拡張方針

### 他のコンテンツ種別への適用

将来的には以下にも適用可能:

- **1級土木 textbook**: 専用ルーブリックを cem-qa とは別エージェントで定義
- **過去問 (past-exam)**: 解答・解説の充実度を別ルーブリックで評価
- **guide ページ**: 試験対策ガイドの構造を別ルーブリックで評価

→ 各種別ごとに `{type}-qa` エージェントを定義し、`/quality-cycle --type <type>` で切り替える設計に拡張可能。

### スコアの履歴可視化

`.claude/state/quality-scores.json` を時系列で蓄積していけば、品質改善の進捗を時系列グラフで可視化できる（将来）。

### CI 連携

`screen` モードはコストが低いので、pre-commit hook や CI で常時実行可能。
`score` モードはコストが高いので、手動 or 週次 cron 実行。

---

## 既存ハーネスとの関係

| 既存コンポーネント | quality-cycle での扱い |
|---|---|
| `cem-qa` エージェント | **そのまま再利用**（Tier 2 評価の真実源） |
| `keyword-page` スキル | 個別ページ作成・校正は引き続きこれを使う |
| `lint-mdx-mobile.mjs` | **そのまま再利用**（Tier 1 機械的判定） |
| `content-principles.md` | **そのまま参照**（品質ルールの真実源） |
| `mdx-io.mjs` | **そのまま再利用**（CRLF 対応 I/O） |
| `pre-commit-mdx.mjs` | 影響なし（コミット時の構文・改行チェック） |

新規追加するのは：
- `scripts/quality-cycle.mjs`（オーケストレータ）
- `scripts/lib/quality-state.mjs`（state I/O ヘルパー）
- `scripts/lib/cem-qa-prompt.mjs`（subagent プロンプトテンプレート）
- `.claude/agents/keyword-rewriter.md`
- `.claude/skills/content/quality-cycle/SKILL.md`
- `.claude/state/*.json` 各種

---

## 設計上の判断記録

### Q1. なぜ Pure JS rubric を作らないのか

- cem-qa の質的判定は LLM でしか再現できない
- Pure JS で書ける部分は既存 `lint-mdx-mobile.mjs` でカバー済み
- 二重実装は cem-qa.md と quality-rubric.mjs の同期コストが発生
- 真実源を 1 つに保つ原則に違反

### Q2. なぜ 2 段階スコアリングか

- 700 件全件を Tier 2（subagent）で評価するとコスト・時間が膨大
- Tier 1 で機械的に上位を絞ることで、Tier 2 を実用範囲に収める
- Tier 1 の判定基準は調整可能（候補スコア式）

### Q3. なぜ Generator/Evaluator を分離するか

- 自己評価バイアスを構造で回避
- AdSense 不合格の根因の一つが「AI 一括生成 + 自己評価」パターンの可能性
- ハーネス設計原則 1（CLAUDE.md）に準拠

### Q4. なぜ .claude/state/ を git 管理するか

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
| cem-qa.md のルール変更時 | quality-cycle 側はプロンプトで参照のみ → 自動追従 |

---

## 関連リソース

- `12_adsense-resubmission-strategy.md` — このシステムが使われる文脈
- `01_設計思想.md` — サイト全体のコンテンツ品質方針
- `.claude/agents/cem-qa.md` — Tier 2 評価ルーブリックの真実源
- `.claude/content-principles.md` — コンテンツ原則の真実源
- `scripts/lint-mdx-mobile.mjs` — Tier 1 機械的判定
