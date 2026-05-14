---
name: quality-cycle
description: >
  キーワードページ・教科書 MDX の品質サイクル（スコアリング → リライト → 検証 → 人間レビュー）統合スキル。
  `--profile {cem|civil-textbook}` で試験を切替。state ファイル名は profile 別に分離（既存データと互換）。
  旧 /quality-cycle（CEM）/ /civil-textbook-cycle（1級土木）を統合。
  Use when user asks to [品質サイクル, スコアリング, リライト, 品質向上ループ, /quality-cycle].
---

キーワードページ・教科書 MDX の品質サイクルを継続的に回すオーケストレータ。プロファイル別に state ファイル・Evaluator / Generator エージェント・拡張パターンが切り替わる。

## 引数

```
/quality-cycle --profile {cem|civil-textbook} --mode {screen|score|rewrite|verify|review|report|issue} [...]
```

| 引数 | 必須 | 説明 |
|---|---|---|
| `--profile` | 必須 | `cem`（総監キーワード）/ `civil-textbook`（1級土木 textbook/guide） |
| `--mode` | 必須 | 実行モード（profile によって一部異なる） |
| `--threshold <X.X>` | 任意 | rewrite モード時、リライト対象の weighted score 上限 |
| `--min-weighted <X.X>` | 任意 | rewrite モード時、スコア下限 |
| `--max <N>` | 任意 | rewrite モード時、1 セッション処理上限 |
| `--batch <N>` | 任意 | 並列度（参考値） |
| `--order <weakest\|newest>` | 任意 | rewrite モードの選定順序 |
| `--max <N>` | 任意 | improve モード時、1セッションで処理する最大記事数（既定: 5） |
| `--slug <slug>` | 任意 | 特定スラッグのみ対象 |
| `--round <N>` | 任意 | issue モード時のラウンド番号 |
| `--create` | 任意 | issue モード時、gh CLI で実際に issue 作成 |
| `--dry-run` | 任意 | 対象とアクションだけ表示 |

## プロファイル別テンプレート

| profile | 対象 | 件数 | テンプレート |
|---|---|---|---|
| `cem` | 技術士総監 キーワードページ (`pe-comprehensive-management/{slug}/article.mdx`) | ~690 件 | `templates/cem.md` |
| `civil-textbook` | 1級土木 textbook / guide (`civil-construction-1/{textbook,guide}/**`) | ~40 件 | `templates/civil-textbook.md` |

## モード一覧

| モード | cem | civil-textbook | 役割 |
|---|---|---|---|
| `screen` | ✓ | — | 機械的スクリーニング（690 件の初回絞り込み） |
| `flagship` | ✓ | — | Flagship 100 件の手動選定 |
| `score` | ✓ | ✓ | Evaluator エージェントで全件評価 |
| `rewrite` | ✓ | ✓ | weighted < threshold のページを Generator で改訂 |
| `improve` | ✓ | — | NLM照合主軸で HIGH 項目を外科的修正＋自動コミット（`keyword-rewriter` を使わない） |
| `verify` | ✓ | ✓ | リライト後を Evaluator で再評価 |
| `review` | ✓ | ✓ | 人間レビュー待ちリスト出力 |
| `report` | ✓ | ✓ | ダッシュボード出力（スコア分布・弱点軸頻度） |
| `issue` | ✓ | ✓ | リライト候補から GitHub umbrella issue draft 生成 |

**civil-textbook が screen/flagship を省略する理由**: 対象が 40 件と少ないため初回絞り込みは不要。

## 実装

プロファイルに応じて `scripts-{profile}/` 配下のスクリプトを呼び出す:

```
scripts-cem/
├── quality-cycle.mjs       # CEM プロファイルのエントリ
├── log-rewrite.mjs
├── merge-scores.mjs
└── lib/                    # cem 固有のロジック（プロンプト等）

scripts-civil-textbook/
├── civil-textbook-cycle.mjs # civil-textbook プロファイルのエントリ
├── log-rewrite.mjs
├── merge-scores.mjs
└── lib/                    # civil-textbook 固有のロジック
```

**実行例**:
```bash
# CEM プロファイル
node .claude/skills/quality/quality-cycle/scripts-cem/quality-cycle.mjs --mode score

# civil-textbook プロファイル
node .claude/skills/quality/quality-cycle/scripts-civil-textbook/civil-textbook-cycle.mjs --mode score
```

SKILL.md では `--profile` フラグを受け取って適切な scripts ディレクトリのエントリを呼び出す。

## state ファイル（profile 別に分離、既存名維持）

**重要**: 既存の state ファイル名は**変更しない**。`--profile` で正しいファイルを参照する。

| profile | scores | cycle-state | mechanical-screen |
|---|---|---|---|
| `cem` | `.claude/state/quality-scores.json` | `.claude/state/quality-cycle-state.json` | `.claude/state/mechanical-screen.json` |
| `civil-textbook` | `.claude/state/civil-quality-scores.json` | `.claude/state/civil-quality-cycle-state.json` | — |

これで既存の 690 件 CEM 進捗・40 件土木進捗が一切失われない。

## プロファイル別ルーブリック（5 軸）

詳細は `templates/{profile}.md` 参照。

### cem（総監キーワード）
| 軸 | 重み | 真実源 |
|---|---|---|
| 構造 | 30% | content-principles.md |
| モバイル視認性 | 25% | lint-mdx-mobile + review-mobile |
| コンテンツ原則 | 20% | content-principles §5・§7 |
| 参考資料 | 15% | content-principles §9 |
| 関連付け | 10% | lint 8-* |

Evaluator: `cem-qa` / Generator: `keyword-rewriter`

### cem — improve モード詳細

`/quality-cycle --profile cem --mode improve [--max N] [--dry-run]`

**`rewrite` との違い**: `rewrite` は cem-qa スコアをゲートに全文リライトするが、`improve` は NLM照合を主軸に外科的追記のみ行う。`keyword-rewriter` を使わず Claude が直接 Edit する。

#### 記事キュー選定

`.local/r2/posts/pe-comprehensive-management/*/article.mdx` から `group: keyword` の記事を `lastRewrittenAt` 昇順で並べたもの（古い順）。`reviewStatus: approved` はスキップ。`--dry-run` ではキュー一覧のみ表示して処理しない。

#### 各記事のパイプライン（per-article）

```
1. cem-qa         → 構造 broken チェック（スコアは参考値のみ）
2. NLM照合        → notebooklm-cross-query.mjs（旧 nlm cross query）で HIGH/MED 論点を特定
3. HIGH 自動修正  → 確認なしで Edit を実行：
     - 5管理横断テーブル欠落 → 総合技術監理セクションに追加
     - 背景段落欠落          → とはセクションに追加
     - Callout title なし    → title 属性を追加
     - SVG フォント < 13px   → font-size 一括置換
     - alt 属性超過          → 短縮
     - description 実態乖離  → 修正
4. frontmatter    → dateModified / lastRewrittenAt を今日の日付に更新
5. 自動コミット   → `content(pe): {slug} 品質向上`
6. 次の記事へ（--max に達したら停止）
```

#### セッション終了サマリー形式

```
=== /quality-cycle --profile cem --mode improve 完了 ===
処理記事: N 件
  ✓ {slug}  NLM HIGH N件解消
  ✗ {slug}  エラー（NLM タイムアウト）→ スキップ
残キュー: 約 N 件
```

### civil-textbook（1級土木）
| 軸 | 重み | 真実源 |
|---|---|---|
| 構造 | 20% | content-principles + check-mdx |
| テキスト原則 | 20% | content-principles §1-5,7 |
| モバイル視認性 | 30% | lint-mdx-mobile |
| 図表の適切性 | 15% | content-principles §8 |
| 参考資料・関連付け | 15% | check-mdx --rules links |

Evaluator: `civil-construction-review` / Generator: `civil-textbook-rewriter`

**共通**: 加重合計 ≥ 2.0 で合格、< 2.5 でリライト候補、0 軸があれば即不合格（weighted を 1.0 にクランプ）

## 状態遷移（共通）

```
unscored → scored → rewriting → needs-review → verified → approved
                              └→ needs-rework → rewriting (loop)
                              └→ rejected (human decision)
```

人間ゲート必須: AI リライト後は `reviewStatus: needs-review`。`approved` への変更は人間のみ。

## 旧コマンドからの移行

| 旧コマンド | 新コマンド |
|---|---|
| `/quality-cycle --mode score` | `/quality-cycle --profile cem --mode score` |
| `/civil-textbook-cycle --mode score` | `/quality-cycle --profile civil-textbook --mode score` |

## 使い方の例

```bash
# CEM: 全件評価
/quality-cycle --profile cem --mode score

# CEM: NLM照合で HIGH を外科的修正（5件）
/quality-cycle --profile cem --mode improve --max 5

# CEM: improve 対象の確認（dry-run）
/quality-cycle --profile cem --mode improve --dry-run

# CEM: スコア < 2.5 のページを 5 件リライト
/quality-cycle --profile cem --mode rewrite --threshold 2.5 --max 5

# 1級土木: 全 40 件評価
/quality-cycle --profile civil-textbook --mode score

# 1級土木: umbrella issue draft 生成
/quality-cycle --profile civil-textbook --mode issue --round 1

# 対象確認（dry-run）
/quality-cycle --profile cem --mode rewrite --dry-run
```

## プロファイル詳細

- **cem**: [templates/cem.md](./templates/cem.md)
- **civil-textbook**: [templates/civil-textbook.md](./templates/civil-textbook.md)

## 関連スキル・エージェント

| 連携先 | 役割 |
|---|---|
| `cem-qa` エージェント | CEM プロファイルの Evaluator |
| `keyword-rewriter` エージェント | CEM プロファイルの Generator |
| `civil-construction-review` エージェント | civil-textbook プロファイルの Evaluator |
| `civil-textbook-rewriter` エージェント | civil-textbook プロファイルの Generator |
| `/improve-article` | 単一記事版の品質改善（本スキルはバルク版） |
| `/exam-keyword-cycle` | 過去問起点の横断校正（本スキルと補完） |
| `/pe-essay-cycle` | 総監記述式（模範論文・note 有料記事）版のオーケストレーター（本スキルと補完、対象が記述式） |

## ハーネス設計上の位置づけ

- **Orchestrator スキル**（Opus inherit 相当で動作、判断質が重要）
- **Generator/Evaluator 厳密分離**: プロファイルごとに担当エージェントを使い分け
- **人間ゲート必須**: AI リライト後は `reviewStatus: needs-review`
- **データは git 管理**: state ファイルはリポジトリにコミット

## 参照

- `templates/cem.md` — CEM プロファイルの詳細仕様
- `templates/civil-textbook.md` — civil-textbook プロファイルの詳細仕様
- `.claude/agents/cem-qa.md` — CEM Evaluator
- `.claude/agents/civil-construction-review.md` — 1級土木 Evaluator
- `docs/reference/content-principles.md` — 品質ルールの真実源
- `.claude/scripts/lib/mdx-io.mjs` — CRLF 保持 I/O（リライト時に必須）
