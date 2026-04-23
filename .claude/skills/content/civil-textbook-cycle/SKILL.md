---
name: civil-textbook-cycle
description: >
  1級土木施工管理技士の textbook/guide ページの品質サイクル（評価 → リライト → 再評価 → 人間レビュー）を回す統合スキル。
  Use when user asks to [1級土木の品質サイクル, textbook バルクリライト, guide バルク評価, /civil-textbook-cycle].
---

## 用途

1級土木施工管理技士（civil-construction-1）の **textbook / guide ページ**（計 40 件前後）に対して、品質サイクルを継続的に回すためのオーケストレータ。CEM 側の `/quality-cycle` スキルの civil 版。

対象件数が少ない（40件）ため、CEM 版の 6 モードのうち **screen / flagship を省略** し、4 モード（score / rewrite / verify / review）＋ report のみで構成する。

## 設計原則

1. **civil-construction-review エージェントが品質ルーブリックの唯一の真実源**
2. **Generator/Evaluator 厳密分離**: `civil-textbook-rewriter` ≠ `civil-construction-review`
3. **人間ゲート必須**: AI リライト後は `reviewStatus: needs-review` でマーク
4. **データは git 管理**: `.claude/state/civil-*.json` をリポジトリにコミット
5. **PDF 照合は別系統**: PDF 原典との網羅率検証は `civil-construction-qa` が担当（重い処理なのでサイクルには組み込まない）

## サブモード一覧

| モード | 役割 | 出力 |
|---|---|---|
| `score` | civil-construction-review subagent で全 40 件評価（既評価はキャッシュ） | `.claude/state/civil-quality-scores.json` |
| `rewrite` | weighted < 2.5 のページを civil-textbook-rewriter で改訂 | 改訂された article.mdx + state 更新 |
| `verify` | リライト後を civil-construction-review で再評価 | state 更新 |
| `review` | 人間レビュー待ちリスト出力 | `.claude/state/civil-review-queue.md` |
| `report` | ダッシュボード出力（スコア分布・弱点軸頻度・状態分布）| コンソール |
| `issue` | リライト候補から GitHub umbrella issue draft 生成（`--create` で gh 作成）| `.claude/state/civil-issue-draft.md` |

## 引数

| 引数 | 説明 | 例 |
|---|---|---|
| `--mode <mode>` | 必須。実行モード | `--mode score` |
| `--threshold <X.X>` | rewrite モード時、リライト対象の weighted score 上限 | `--threshold 2.5` |
| `--min-weighted <X.X>` | rewrite モード時、スコア下限 | `--min-weighted 1.5` |
| `--max <N>` | rewrite モード時、1セッション処理上限 | `--max 5` |
| `--batch <N>` | rewrite モード時、並列度（参考値）| `--batch 3` |
| `--order <weakest\|newest>` | rewrite モードの選定順序 | `--order weakest` |
| `--slug <slug>` | 特定スラッグだけを対象にする | `--slug textbook-crane` |
| `--round <N>` | issue モード時のラウンド番号（未指定なら日付）| `--round 1` |
| `--create` | issue モード時、gh CLI で実際に issue 作成（gh 必須・認証必要）| `--create` |
| `--dry-run` | 何もせず、対象とアクションだけ表示 | `--dry-run` |

## 実行例

### 初回サイクル（全40件評価から）

```bash
# Step 1: 全 textbook/guide を civil-construction-review で評価（subagent 並列）
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode score
# → タスクリスト JSON 出力 → Claude Code 側で並列 subagent 起動
# → 各 subagent の JSON を /tmp/civil-score-results.json に集約
node .claude/skills/content/civil-textbook-cycle/scripts/merge-scores.mjs /tmp/civil-score-results.json
# → .claude/state/civil-quality-scores.json

# Step 2: スコア分布を確認
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode report

# Step 3: weighted < 2.5 のページをリライト
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode rewrite --threshold 2.5 --max 5
# → タスクリスト JSON → Claude Code 側で civil-textbook-rewriter 並列起動
# → 各 subagent の JSON を /tmp/civil-rewrite-results.json に集約
node .claude/skills/content/civil-textbook-cycle/scripts/log-rewrite.mjs /tmp/civil-rewrite-results.json
# → .claude/state/civil-quality-cycle-state.json

# Step 4: リライト後を再評価
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode verify
# → タスクリスト JSON → subagent 並列 → merge-scores.mjs で取り込み

# Step 5: 人間向けレビュー待ちリスト
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode review
# → .claude/state/civil-review-queue.md
```

### umbrella issue の生成

```bash
# draft 生成のみ（dry-run・stdout 出力）
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode issue --round 1 --dry-run

# draft をファイルに保存（.claude/state/civil-issue-draft.md）
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode issue --round 1

# gh CLI で GitHub に実際に issue 作成（gh auth login 済み前提）
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode issue --round 1 --create
```

gh CLI が未インストール or 未認証の場合は draft のみ生成。`.claude/state/civil-issue-draft.md` を GitHub issues/new に手動で貼り付けて作成する。

### 単一スラッグの再評価・再リライト

```bash
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode score --slug textbook-crane
# merge-scores.mjs で取り込み後
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode rewrite --slug textbook-crane
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode verify --slug textbook-crane
```

### 対象ページの確認（dry-run）

```bash
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode score --dry-run
# → 対象スラッグ一覧のみ表示
```

## データファイル

| ファイル | 内容 | 生成タイミング |
|---|---|---|
| `.claude/state/civil-quality-scores.json` | Tier 質的評価結果（全 40 件）| `--mode score` → `merge-scores.mjs` |
| `.claude/state/civil-quality-cycle-state.json` | 各ページの状態遷移履歴 | `--mode rewrite/verify` → `log-rewrite.mjs` |
| `.claude/state/civil-review-queue.md` | 人間向けレビュー待ちリスト | `--mode review` |

## 品質ルーブリック（5 軸・重み）

真実源: `.claude/agents/civil-construction-review.md`

| 軸 | 重み | 判定の要点 |
|---|---|---|
| **構造 (structure)** | 20% | frontmatter 必須6項目・H2/H3 階層整合・`/check-mdx --rules syntax` OK |
| **テキスト原則 (principle)** | 20% | content-principles.md §1-5,7 準拠（絵文字なし、太字 ≤30字、1文1段落、ExamPoint 位置OK）|
| **モバイル視認性 (mobile)** | 30% | `lint-mdx-mobile` HIGH/MEDIUM 件数、4列以上表なし、3列表セル ≤15字、表前導入文 |
| **図表の適切性 (figures)** | 15% | `<ArticleImage>` 使用、caption は帰属情報のみ ≤60字、alt ≤80字、出典コメント、画像ファイル実在 |
| **参考資料・関連付け (reference)** | 15% | `/check-mdx --rules links` OK、`## 参考資料` 節に公的＋民間両方、法令 e-Gov リンク、過去問バックリンク（guide） |

加重合計 ≥ 2.0 で合格、< 2.5 でリライト候補。0 点軸があれば即不合格（weighted を 1.0 にクランプ）。

## 拡張パターン（civil-textbook-rewriter が適用）

| ID | パターン | 対象軸 |
|---|---|---|
| G | モバイル視認性修正（表 → 階層化箇条書き）| mobile |
| I | 画像コンポーネント移行（`<img>` → `<ArticleImage>`）| figures |
| R | 参考資料節補完 | reference |
| B | 過去問バックリンク追加（guide 限定）| principle/figures (guide) |
| S | 構造整理（frontmatter 補完・階層修正）| structure |
| P | テキスト原則修正（絵文字削除、太字スコープ、段落分割）| principle |

1ページ最大 2 パターン、優先度 G > I > R > B > P > S で選定。

## 状態遷移

```
unscored → scored → rewriting → needs-review → verified → approved
                               └→ needs-rework → rewriting (loop)
                               └→ rejected (human decision)
```

## 注意事項

- **人間レビューは必須**: AI リライト後は必ず `reviewStatus: needs-review`。`approved` への変更は人間のみ
- **バッチ分割コミット推奨**: 40件を 1 コミットにまとめると AI 生成シグナルが強くなる。5 件ずつコミット推奨
- **拡張パターンの多様化**: `civil-textbook-rewriter` は各ページに違うパターンを選ぶよう設計されているが、目視確認推奨
- **コスト**: `score` モードは 40 件 × civil-construction-review で数分〜10 分程度（親 Opus 時）
- **べき等**: 一度評価したページは `score` モードでキャッシュされる。再評価は `--slug` で個別指定
- **改行コード**: リライト時は必ず `.claude/scripts/lib/mdx-io.mjs` 経由で書き込む（pre-commit フック対策）

## 連携スキル・エージェント

| コンポーネント | 関係 |
|---|---|
| `civil-construction-review` エージェント | score/verify モードで subagent として呼び出し（評価のみ）|
| `civil-textbook-rewriter` エージェント | rewrite モードで subagent として呼び出し（リライトのみ）|
| `civil-construction-qa` エージェント | PDF 照合は別系統。本サイクルには含まない |
| `lint-mdx-mobile.mjs` | review/rewriter が内部実行（機械的指標）|
| `mdx-io.mjs` | ファイル I/O（CRLF 保持）|
| `/civil-construction-1-pdf-to-mdx` | 新規変換は別系統。サイクルはバルク改訂専用 |

## コンテンツ変更後のインデックス再生成

rewrite モード完了後は `npm run refresh-indexes` で静的インデックスを更新すること（本番 `npm run build` では自動）。

## 参照

- `.claude/agents/civil-construction-review.md` — Evaluator（真実源）
- `.claude/agents/civil-textbook-rewriter.md` — Generator
- `.claude/agents/civil-construction-qa.md` — PDF 照合担当（本サイクルとは別系統）
- `.claude/content-principles.md` — 品質ルールの真実源
- `.claude/reference/content-authoring.md` — MDX 実装規約
- `.claude/skills/content/quality-cycle/SKILL.md` — CEM 版の姉妹スキル
