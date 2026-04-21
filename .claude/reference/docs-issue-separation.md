# 情報蓄積の 3 層分離ルール（md / Issue / JSON）

doboku-note では情報を 3 層に分離して管理する。状態（open/close の概念）を持つ情報が md に埋もれて棚卸しが起きない状態を防ぐため、情報の性質に応じて置き場を固定する。

- **真実源を一箇所に固定**し、反対側は参照リンクのみにする（転記禁止）
- 週次の `/weekly-review` Agent G が Umbrella Issue を棚卸しして drift を検出する
- 新規に「やるべきこと」を書きたくなったら、まず Issue として追加する

## 3 層モデル

| Tier | 置き場 | 用途 | 典型例 |
|---|---|---|---|
| **Tier 1** | GitHub Issue | 状態を持つ action item（open/close したい） | 週次 PDCA、session-handoff、棚卸しフォロー、レビュー待ち、単発タスク、PSI 違反、Umbrella |
| **Tier 2** | Markdown (`docs/project/`, `.claude/reference/`, `.claude/skills/**/SKILL.md`) | 固定的知識・戦略・ADR・スキル定義 | 設計思想、収益化戦略、ロードマップの Why、作業マニュアル |
| **Tier 3** | JSON (`.claude/state/*.json`, `.claude/config/*.json`) | 機械可読な構造化データ | 計測結果（PSI/GA4/GSC）、品質スコア、実験状態、サイクル進捗 |

### 判断フロー

1. 「2 ヶ月後も参照価値があるか」→ Yes なら Tier 2（md）
2. 「エージェントが programmatic に読むか」→ Yes なら Tier 3（JSON）
3. 「open/close したいか、誰かが完了判定するか」→ Yes なら Tier 1（Issue）

**md を禁止する場所**: `.claude/state/*.md`（README.md を除く）。状態を持つ情報はすべて Issue へ。

## ラベル体系

| ラベル | 用途 | Issue 例 | テンプレート |
|---|---|---|---|
| `umbrella` | 親 Issue（長期計画・複数子 Issue 追跡） | `[Umbrella] civil-textbook Round 1` | `.github/ISSUE_TEMPLATE/umbrella.md` |
| `weekly-pdca` | 週次 PDCA（計画 + レビュー一本化） | `[PDCA] 2026-W17` | `.github/ISSUE_TEMPLATE/weekly-pdca.md` |
| `session-handoff` | セッション引き継ぎ | `[Handoff] 2026-04-21 exam-keyword-cycle` | `.github/ISSUE_TEMPLATE/session-handoff.md` |
| `performance` | PSI しきい値違反 | `[PSI] しきい値割れ検知 2026-04-21` | （`psi-audit.yml` が自動起票） |
| `content-cycle` | 過去問起点の校正サイクル | `[Cycle] R07 Ⅰ-1-1` | Umbrella 流用 |
| `inventory` | 棚卸し結果のフォロー | `[Inventory] docs/project 2026-04` | Umbrella 流用 |
| `queue` | レビュー待ち・キュー | `[Queue] pe-comprehensive レビュー待ち` | `.github/ISSUE_TEMPLATE/queue.md` |
| `task` | 単発作業 | `[Task] AdSense 再申請 2026-04` | `.github/ISSUE_TEMPLATE/task.md` |
| `auto-generated` | 自動起票（必ず人がトリアージ） | 付属ラベル | - |

## 真実源マトリクス

| 情報の種類 | 真実源 | 反対側での扱い |
|---|---|---|
| Why / 背景 / 戦略 / 判断プロセス | **md**（`docs/project/`） | Issue body 冒頭にリンク（`関連ロードマップ: docs/project/NN_xxx.md`） |
| 設計書・ADR（不変の決定記録） | **md**（`docs/project/` or `docs/adr/`） | Issue からはリンクのみ |
| 実行タスクの状態（open / closed） | **Issue** | md には `追跡 Issue: #N` を 1 行書く。個別 checklist は md に書かない |
| 進捗率 / 完了タイミング | **Issue の checkbox と close** | md では言及しない |
| 実装詳細（コード・テストコマンド等） | **Issue の checklist 項目 or PR** | md は方針のみ |
| 週次 PDCA（計画 + レビュー） | **Issue** `[PDCA] YYYY-Www`（`weekly-pdca` label） | 旧 `docs/reviews/weekly/*.md` は `archive/` のみに残す |
| セッション引き継ぎ | **Issue** `[Handoff] YYYY-MM-DD <ctx>`（`session-handoff` label） | `.claude/state/session-handoff-*.md` は作らない |
| 計測生データ（PSI/GA4/GSC） | **JSON** `.claude/state/metrics/*.json`（CI が develop に直接 commit） | Issue 化しない（機械可読性が落ちる） |

迷ったら: 「2 ヶ月後も残すべき文書的価値があるか」→ Yes なら md、No なら Issue。

## ロードマップ md の標準構成

`docs/project/NN_xxx-roadmap.md` の推奨セクション（上から順）:

1. **冒頭メタ**: 策定日、ステータス、**追跡 Issue: #N**（Umbrella Issue への 1 行リンク）
2. **現状（完了分）**: 何が実装済みか。MVP 等
3. **Why / 設計思想 / 方針**: 各 Phase の目的・戦略を散文で記述（タスク列挙はしない）
4. **中止判定基準**: 続行 / 中止 / 方針転換の条件
5. **関連**: 参照文書・他 md・関連スキルへのリンク集

**書かない**:
- Phase N-1 / N-2 等の細分化された実装タスクの checklist（Issue 側に置く）
- 所要時間つき優先順位テーブル（Issue の checklist の並び順で表現）
- 「未実施」「TODO」等の状態表現

## Umbrella Issue の標準形

### タイトル

`[Umbrella] <ロードマップ短名>`（例: `[Umbrella] exam-keyword-cycle Phase 2/3 実装`）

### ラベル

- `umbrella` — 必須。ロードマップ追跡を示す
- 追加ラベルは任意（`auto-generated` 等、既存運用に合わせる）

### Body 構造

```markdown
## 関連ロードマップ
[`docs/project/NN_xxx-roadmap.md`](docs/project/NN_xxx-roadmap.md)

## Phase N タスク
- [ ] タスク 1（1 行で完了条件が判定できる粒度）
- [ ] タスク 2

## Phase N+1 タスク
- [ ] タスク ...

## 完了判定
全 checkbox が checked になったら close。close 時に md の「追跡 Issue」行から該当を外す or 新 Umbrella に差し替え。
```

**粒度の目安**: 1 チェックボックス = 1 PR / 1 コミット相当。これ以上細かくしない。

## メンテナンス原則

- **週次棚卸し**: `/weekly-review` Phase 1 Agent G が `gh issue list --label umbrella --state open` を走査し、以下を surface
  - 2 週間以上更新なしの Umbrella（停滞）
  - 全項目 checked なのに open（close 漏れ）
  - 対応する md が見当たらない Umbrella（孤立）
- **ロードマップ追加時**: md の冒頭に `追跡 Issue: #N` を必ず書く。Issue 側の Body 冒頭にも md パスを書く（双方向リンク）
- **Issue close 時**: 対応する md の「追跡 Issue」行を確認し、後継 Umbrella があれば差し替え、なければ削除

## 既存運用との整合

- `/civil-textbook-cycle` は既に `gh issue create --body-file` で Umbrella Issue を作成している。本ルールに沿わせる場合、タイトルを `[Umbrella] civil-textbook Round N` に、ラベルを `umbrella` に統一
- PSI 違反 Issue（`auto-generated`, `performance` ラベル）は個別 Issue であり Umbrella ではない。対象外

## 週次 PDCA Issue 運用（2026-04 〜）

`/weekly-review` が毎週日曜に `[PDCA] YYYY-Www` Issue を 1 本作成する。

- **タイトル**: `[PDCA] YYYY-Www`（例: `[PDCA] 2026-W17`）
- **ラベル**: `weekly-pdca`（+ 任意で `auto-generated`）
- **Body**: Agent A〜G（weekly-review SKILL.md の 7 サブエージェント）の出力を見出し別に統合。`/weekly-plan` は同じ Issue に「来週の計画」セクションを追記
- **close 条件**: 翌週の新 `[PDCA]` Issue が作成されたら自動的に前週は close（または手動 close）。未完了アクションは次 Issue の「計画」セクションへ引き継ぐ
- **archive**: `docs/reviews/weekly/` は Issue 一本化後は新規書き込みをしない。W16 以前は `docs/reviews/weekly/archive/` に移動
- **テンプレート**: `.github/ISSUE_TEMPLATE/weekly-pdca.md`

## Session-handoff Issue 運用

長時間タスクの途中停止時、次セッションに状態を引き継ぐ場合は md でなく Issue を使う。

- **タイトル**: `[Handoff] YYYY-MM-DD <context 短名>`
- **ラベル**: `session-handoff`
- **Body**: 前提・現状・未コミット差分・次 Read すべきファイル・次アクション・ブロッカー
- **close 条件**: 次セッションが Issue を Read して作業を引き継いだタイミング（または `supersedes` 新 Issue が作成されたタイミング）
- **禁止事項**: `.claude/state/session-handoff-*.md` の新規作成（既存はすべて Issue へ移行済み・削除済み）
- **テンプレート**: `.github/ISSUE_TEMPLATE/session-handoff.md`

## Pilot → 全面運用（2026-04-21 〜）

本ルールは 2026-04-21 より全 `docs/project/*.md` と `.claude/state/` 配下で運用開始。摩擦が出た場合のみスキル化（`/docs-issue-sync` 等）を検討する（現時点では手運用で十分）。
