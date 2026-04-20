---
date: 2026-04-20
type: session-handoff
topic: civil-textbook-cycle
status: round_1_score_complete_awaiting_gh_auth
---

# 次セッション クイックスタート — civil-textbook-cycle Round 1

1級土木施工管理技士（civil-construction-1）の textbook/guide 品質サイクルを新設し、**Round 1 の初回採点（40件）が完了**した状態。次は gh CLI 認証 → umbrella issue 作成 → リライト着手の順。

## まず Read すべき 3 ファイル

1. **本ファイル** — Round 1 の現在位置と次の作業
2. **`.claude/state/civil-quality-scores.json`** — 40件分の評価結果（真実源）
3. **`.claude/state/civil-issue-draft.md`** — GitHub umbrella issue の draft（そのまま貼り付け可）

## 現在の状態

### 実装物（完成・未コミット）

| 種別 | パス |
|---|---|
| Generator エージェント | `.claude/agents/civil-textbook-rewriter.md` |
| Evaluator エージェント（既存） | `.claude/agents/civil-construction-review.md` |
| スキル SKILL.md | `.claude/skills/content/civil-textbook-cycle/SKILL.md` |
| オーケストレータ | `.claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs` |
| merge-scores | `.claude/skills/content/civil-textbook-cycle/scripts/merge-scores.mjs` |
| log-rewrite | `.claude/skills/content/civil-textbook-cycle/scripts/log-rewrite.mjs` |
| state I/O | `.claude/skills/content/civil-textbook-cycle/scripts/lib/civil-state.mjs` |
| prompts | `.claude/skills/content/civil-textbook-cycle/scripts/lib/civil-prompts.mjs` |
| レジストリ更新 | `.claude/reference/agents-registry.md`, `.claude/reference/skills-registry.md`, `CLAUDE.md` |

### Round 1 採点結果（40件）

- **平均 weighted**: 2.35 / 3.0
- **スコア分布**: 満点 9 / 合格(2.0-2.9) 21 / 要修正(1.0-1.9) 10 / 不合格(<1.0) 0
- **弱点軸の頻度**（score ≤ 1 の出現件数）: reference 11 / mobile 6 / figures 2 / structure 0 / principle 0
- **リライト候補（weighted < 2.5、11件）**:
  - Guide 6件（全て mobile+reference 両軸 0 点）: `guide-concrete-key-points` / `guide-concrete-maintenance` / `guide-earthwork-key-points` / `guide-four-management` / `guide-law-key-points` / `guide-strategy`
  - Textbook 5件: `textbook-explosives-act` / `textbook-law-compliance` / `textbook-standard-contract` / `textbook-surveying-basics`（reference 0 点）、`textbook-quality-overview`（全軸 2 点レベル）
- **満点 9件**（リライト時の参考実装）: `textbook-crane` / `textbook-demolition` / `textbook-distance-angle` / `textbook-grader-compaction` / `textbook-leveling` / `textbook-loader` / `textbook-network-schedule` / `textbook-shovel-excavator` / `textbook-tractor-bulldozer`

### 重要な構造的発見

- **`## 参考資料` 節の欠落が最頻問題**（40件中11件=27.5%）。特に guide 6件すべてが同じ weak_axes（mobile+reference）で、同一テンプレ起因の横展開問題
- **Guide の特徴**: 表のモバイル視認性（3列×長セル、4列以上）＋参考資料節欠落の2軸が共通
- **Textbook の特徴**: 参考資料節欠落のみが主要欠陥、それ以外は概ね合格水準

## 次のアクション（順序厳守）

### Step 1: `gh auth login`（1回だけ、ユーザー本人が実行）

gh は `C:\Program Files\GitHub CLI\gh.exe` にインストール済みだが PATH 外・認証未済。次のいずれかを実行:

```bash
# git-bash から（パス指定）
"/c/Program Files/GitHub CLI/gh.exe" auth login

# または PowerShell から（PATH 解決済み）
gh auth login
```

対話的に:
- GitHub.com → HTTPS → "Yes" (Git operations authenticate with GitHub credentials?) → Login with a web browser
- 表示されるコードをブラウザに貼り付けて認証

### Step 2: umbrella issue を作成

```bash
cd C:/Users/m004195/doboku-note
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode issue --round 1 --create
```

**想定出力**: `https://github.com/uruhayato373/doboku-note/issues/<N>` が返る。

**gh が PATH に通っていない場合**: `PATH=$PATH:/c/Program\ Files/GitHub\ CLI` を export するか、スクリプト内で絶対パス指定するパッチを当てる。

### Step 3: まずは guide 6件のバッチリライトで効果検証

Guide は全件が同じ weak_axes（mobile+reference）なので、`civil-textbook-rewriter` に G（モバイル視認性修正）+ R（参考資料節補完）を適用する均一バッチとして最適。1件目で結果を確認してから残り5件に広げる推奨。

```bash
# 1件試行（推奨）
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode rewrite --slug guide-concrete-key-points --dry-run
# → 生成されるプロンプトを確認 → OK なら Claude Code で civil-textbook-rewriter subagent を起動

# 結果を log-rewrite.mjs で state に記録
node .claude/skills/content/civil-textbook-cycle/scripts/log-rewrite.mjs /tmp/civil-rewrite-results.json

# 再評価
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode verify --slug guide-concrete-key-points
```

### Step 4: Textbook 5件のリライト

参考資料節欠落が主要欠陥なので R パターン（参考資料節補完）中心。`textbook-quality-overview` は全軸中間なので最後に回す。

### Step 5: 全件 verify → review（人間レビュー）→ umbrella issue クローズ

```bash
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode verify
node .claude/skills/content/civil-textbook-cycle/scripts/civil-textbook-cycle.mjs --mode review
# → .claude/state/civil-review-queue.md に needs-review ページが列挙される
# → 人間が個別レビューし reviewStatus: approved に手動更新
# → 全件 approved で umbrella issue をクローズ
```

## 未コミットの変更（Round 1 作業物）

以下を1コミットにまとめるか分割するかは次セッションで判断。推奨は2段階:

**コミット A: スキル・エージェント実装**（機能追加）
- `.claude/agents/civil-textbook-rewriter.md`
- `.claude/skills/content/civil-textbook-cycle/` 全体
- `.claude/reference/agents-registry.md`（civil-textbook-rewriter 追記）
- `.claude/reference/skills-registry.md`（/civil-textbook-cycle 追記）
- `CLAUDE.md`（モデル方針表に civil-textbook-rewriter 追記）

**コミット B: Round 1 採点結果**（データ追加）
- `.claude/state/civil-quality-scores.json`（40件の評価）
- `.claude/state/civil-issue-draft.md`（umbrella issue draft）
- `.claude/state/session-handoff-civil-textbook-cycle.md`（本ファイル）

コミットメッセージ例:
```
feat(cycle): civil-textbook-cycle スキルと civil-textbook-rewriter エージェント新設

1級土木施工管理技士 textbook/guide ページの品質サイクル（score/rewrite/verify/review/report/issue の6モード）を統合。
40件前提で CEM 版 /quality-cycle から screen/flagship を省略した軽量版。
```
```
content(civil): Round 1 採点結果（40件）と umbrella issue draft

civil-construction-review subagent で全40件を評価。
平均 weighted 2.35、要修正11件（guide 6・textbook 5）。
```

## 参照

- `.claude/skills/content/civil-textbook-cycle/SKILL.md` — スキル全体仕様
- `.claude/agents/civil-textbook-rewriter.md` — Generator 拡張パターン（G/I/R/B/S/P）
- `.claude/agents/civil-construction-review.md` — Evaluator 5軸ルーブリック
- `.claude/skills/content/quality-cycle/SKILL.md` — CEM 版（姉妹スキル、設計の参照元）
- `.claude/content-principles.md` — 品質ルール真実源
