---
title: 情報アーキテクチャ（4 ゾーンモデル）
---

# 情報アーキテクチャ（4 ゾーンモデル）

doboku-note プロジェクトにおけるドキュメント・データの置き場ルールの真実源。

## 4 ゾーンモデル

| Zone | 場所 | 役割 | 形式 | Obsidian |
|---|---|---|---|---|
| A | `docs/` | 確定知識・戦略（Why/What） | md | ✅ |
| B | `docs/reference/` | 運用手順・ポリシー（How） | md | ✅ |
| C | `.claude/state/` / `.claude/config/` | 機械データ・ツール設定 | JSON | ❌（OK） |
| D | `.claude/skills/` / `.claude/agents/` | Claude 実行能力 | md + scripts | ❌（OK） |

**追加 SSOT ディレクトリ：**
- `docs/sns/` — 全 SNS 投稿管理（instagram / x / youtube）
- `docs/note/` — note 記事管理

## 判断フロー

1. 実行タスク・計画 → `docs/todo/`（annual / monthly / weekly）
2. CI・エージェントが programmatic に読む → Zone C（JSON）
3. 2 ヶ月後も参照価値あり → Why なら Zone A（`docs/project/`）、手順なら Zone B（`docs/reference/`）
4. Claude Code の能力定義 → Zone D
5. SNS 投稿管理 → `docs/sns/{instagram,x,youtube}/`
6. note 記事管理 → `docs/note/`
7. 上記いずれでもない一時メモは作らない（`.tmp/` 配下のみ）

## スキル/エージェント更新ルール

`.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、  
**同一 commit** で以下を更新すること：

- スキル変更 → `docs/reference/skills-registry.md`
- エージェント変更 → `docs/reference/agents-registry.md`

自動チェック: `.claude/hooks/check-doc-sync.sh`（settings.json の PreToolUse に登録済み）

## todo/ ディレクトリ仕様

すべての計画・タスクの単一正源。GitHub Issue・task-queue.json は使わない。

ディレクトリ: `docs/todo/`

| ファイル | 粒度 | 更新タイミング |
|---|---|---|
| `annual.md` | 年（試験カレンダー × 商品投入計画） | 戦略転換時 |
| `monthly.md` | 月（今月のフォーカス + 締切） | 月初 |
| `weekly.md` | 週（今週やること 3〜5件） | 週初（Claude と協働） |

タスクマスタは `backlog.md`（上表は backlog から pull される下流の3層）。

## handoff のライフサイクル（2026-07-11〜「extract→削除」・archive 廃止）

`docs/handoffs/YYYY-MM-DD-{context}.md` は**セッション引き継ぎの途中記録**。溜めない運用に統一する:

1. handoff の**生きたタスク・恒久ノウハウは然るべき SSOT へ抽出**（タスク→`docs/todo/backlog.md`／手順・runbook→`docs/reference/` の該当 doc／個人知見→memory）。
2. 抽出が終わった handoff 本体は**削除**（`git rm`）。**記録は git 履歴が持つ**＝いつでも復元可能。旧 `_archive/` ディレクトリは廃止（2026-07-11 に77本を削除・ユーザー決定）。
3. 過去 handoff への出典引用（`docs/handoffs/**` パス）は削除後も正当（point-in-time 記録）。`check-doc-refs` は `docs/handoffs/**` を参照先チェックから除外する。

**残作業の有無は `handoffs/` に残す理由にならない**（タスクは backlog が持ち、月初→`monthly`・週初→`weekly` へ落ちる）。`handoffs/` は原則ほぼ空。週次 PDCA（`/weekly-review` の Agent H）が抽出漏れを surface し、`/doc-declutter`（`doc-curator`）が外部実体を検証して抽出→削除を適用する。**鉄則＝外部実体（PR merged・published:true・deploy・ファイル実在）を検証してから削除・未確認なら削除しない**。

## .claude/ の残留ファイル

`.claude/` には Claude の実行能力と機械データのみを置く：

```
.claude/
  skills/           # Zone D
  agents/           # Zone D
  state/            # Zone C（JSON のみ）
  config/           # Zone C（JSON のみ）
  hooks/            # Claude Code + git hooks
  commands/         # カスタムコマンド
  plans/            # 実装プラン（一時）
  pdfs/             # 参照 PDF
  scripts/          # 自動化スクリプト
  settings.json
  settings.local.json
```

## SSOT と参照規律

ドキュメントを移動・リネーム・統廃合したときに、参照していたスキル・エージェント・他 docs のパスが黙って壊れる事故（2026-06-11 に旧体系から蓄積した 47 件の壊れ参照が判明）を防ぐための恒久ルール。

### 規律

1. **1 トピック = 1 SSOT**。同じ事実を複数ファイルに重複させない。重複が必要なら「正」を 1 つ決め、他は 1 行ポインタ（`→ 最新は {path} 参照`）にする。
2. **価格・リリースカレンダー・ロードマップは指定 SSOT のみに置く**。散在させない（真実源は各 `docs/note/{試験}/noteコンテンツ計画.md`）。
3. **doc を移動・リネーム・統廃合したら、同一 commit で全参照を更新する**。検出は `npm run check-doc-refs`（下記）。
4. **揺れやすいパスより安定したインデックスを指す**。章番号付き（`04_コンテンツロードマップ.md` 等）は再編で動きやすいので、可能なら README や本ドキュメント、内容 SSOT（`noteコンテンツ計画.md` 等）を参照する。
5. **例示パスはプレースホルダで書く**（`{slug}` / `{magazine}` / `YYYY-Www` / `r0X` / `d-xx` 等）。実在ファイル参照と区別され、ガードが誤検知しない。
6. **廃止台帳・移行履歴など「死んだパスを記録として残す」行**は行末に `<!-- doc-ref:ignore -->` を付ける（このセクション直後の「廃止済み」がその例）。
7. **新しいツール/スクリプト/処理経路を追加したら、最も近い既存 skill SKILL.md か reference policy から参照を張る（discoverability）＋新旧の棲み分けを明記する**。似た既存ツールがあれば「どちらを使うか」を迷わせない。これも `/doc-sync` の対象＝**routing drift**（新ツール追加で既存の「どれを使うか」案内が旧/別ツールを指したまま陳腐化）と **discoverability gap**（新ツールがどの doc からも参照されず次セッションが再調査）。機械ガード（参照・台帳）は壊れた参照と台帳もれしか見ずこの意味ドリフトは拾えないため、追加コミット前に `/doc-sync` を回す（2026-06-25、`scripts/figure-reel-create.mjs` 新設時に `ig-figure-pack` SKILL.md が `ig-reel-create`＝過去問専用を誤案内したまま残った再発防止。[[feedback_new_tool_doc_wiring]]）。

### ガード（再発防止）— ドキュメント整合の4層

| 層 | 手段 | 検知対象 | 実行 |
|---|---|---|---|
| 参照 | `scripts/check-doc-refs.mjs` | 壊れた `.md`/`.mdx` パス参照 | pre-commit（機械） |
| 台帳 | `scripts/check-doc-coupling.mjs` | スキル/エージェントの追加・削除・description 変更に対する skills-guide/registry・agents-registry の更新もれ（capability ドリフト） | pre-commit（機械） |
| 配線 | `scripts/check-magazine-wiring.mjs` | 新 keiken マガジンが字数ツール（`keiken-charcount`）の探索対象に配線されず字数ゲートを素通りする漏れ（content-line 配線ドリフト） | pre-commit（機械） |
| クラスタ | `scripts/check-policy-anchors.mjs` ＋ `decision-doc-checkpoint.sh` | 1つの決定が複数文書（ADR/skill/checklist/戦略SoT）に散在し片方だけ更新する横展開もれ（policy ドリフト） | commit フック（機械・advisory）＋ PreCompact/SessionEnd（締め切り） |
| 意味 | `/doc-sync` ＋ `doc-sync-auditor` | コード変更で prose・表・コマンド・件数・閾値が旧仕様化（semantic staleness） | 節目に手動（LLM・sonnet） |

**参照ガード**（`check-doc-refs.mjs`）: スキル・エージェント・docs 内の `.md` / `.mdx` 参照がリポジトリ内に実在するかを検証する。

- 全体検証: `npm run check-doc-refs`
- pre-commit: staged の `.claude/skills/` `.claude/agents/` `docs/` `CLAUDE.md` を自動検査（`scripts/install-pre-commit.mjs` に登録済み）
- 対象外（実在しなくても正当）: `.claude/state/**`（生成物）・`.claude/plans/**`（一時）・`.claude/projects/**`（memory）・`docs/handoffs/**`・`docs/reviews/**`・`docs/sns/**`（point-in-time 記録）。コード参照（`src/*.tsx` 等）は build/type-check/lint が担う別系統

**台帳ガード**（`check-doc-coupling.mjs`・2026-06-12 新設）: skills SKILL.md の追加/削除/description 変更には `skills-guide.md`＋`skills-registry.md`、agents `.md` の同種変更には `agents-registry.md` が同一コミットに staged されているかを検証。違反でコミット停止。正当に不要なら `SKIP_DOC_COUPLING=1`。CLAUDE.md §8 の文章ルールに強制力を与える。

**クラスタガード**（`check-policy-anchors.mjs`・2026-06-16 新設）: 1 つの決定が複数文書に散在するクラスタ（台帳 `.claude/config/policy-anchors.json`）で、1 ファイルを staged すると同クラスタの全ファイルを「整合を確認せよ」と決定的に提示する（advisory・exit 0）。`files`/`anchor` の実在も検証し、移動・改名で台帳が腐ると exit 1（registry rot）。**意味照合はしない**（それは意味ガード `/doc-sync` の領分）＝「片方だけ更新した」横展開もれを surface する forcing function。あわせて `check-doc-sync.sh`（PreToolUse on git commit）が決定/ポリシー文書の変更時に `/doc-sync` を促し、`decision-doc-checkpoint.sh`（`PreCompact`/`SessionEnd` フック）がセッションの節目・終了時に未コミットの決定文書を締め切りチェックする。台帳の更新は決定クラスタを増減したときに行う。背景: 2026-06-16 per-persona R8 決定の横展開が 3 往復かかった再発防止（[[feedback_content_deprecation_cross_lineage]]）。

**意味ガード**（`/doc-sync`・2026-06-12 新設）: 「ドキュメント化された面」(`src/** scripts/** .claude/** package.json` 等)を変更したタスクの完了時に、変更 diff × 候補 doc を `doc-sync-auditor`（Evaluator・sonnet）で突合し、機械ガードが拾えない陳腐化を検出→適用。純コンテンツ MDX 編集では回さない。**routing drift / discoverability gap（規律 7）も検出対象**。発火トリガーとして `check-doc-sync.sh`（commit フック）が、決定/ポリシー文書の変更に加え **新規スクリプト追加（`scripts/**` への `--diff-filter=A`）でも discoverability 配線＋`/doc-sync` を促す**（2026-06-25 拡張）。

**配線ガード**（`check-magazine-wiring.mjs`・2026-07-01 新設）: keiken マガジン（施工経験記述系）を「答案マーカー（`**(N)` / `### 記述例` 等）を持つ article.md」で内容判定し、`keiken-charcount.mjs` の探索フィルタでカバーされない dir を pre-commit で落とす。台帳ガードが skill/agent の登録もれしか見ないのに対し、本ガードは **コンテンツライン（note マガジン）を依存する実行系（字数ゲート）に配線し忘れる content-line 配線ドリフト**を機械検知する。新マガジン追加時の配線チェックリスト（cover 定義・sales-recorder マッピング・字数フィルタ・essay-writer 型・/doc-sync）は `src/lib/note-magazines.ts` の `MAGAZINES_RAW` 直前コメントに明文化。背景: 2026-07-01 想定工事バンク（36本）が dir 名に「経験記述」を含まず一括字数チェックを全スキップしていた再発防止（[[feedback_new_magazine_wiring_gate]]）。

## 廃止済み

- `docs/ig-posts/` — 削除済み（2026-05-14）。SSOT は `docs/sns/instagram/`
- `.claude/reference/` — 削除済み（2026-05-14）。移行先は `docs/reference/`
- `.claude/content-principles.md` — 移行先は `docs/reference/content-principles.md` <!-- doc-ref:ignore -->
- `.claude/design-system/` — 移行先は `docs/design-system/`
- `.claude/reference/docs-issue-separation.md` — 削除済み。本ドキュメントに統合 <!-- doc-ref:ignore -->
- GitHub Issue — 廃止。タスクは `docs/todo/` に集約
- `task-queue.json` + `build-todo-view.mjs` + `npm run build-todo` — 廃止完了（2026-06-11）。CI 3本の自動起票・lib スクリプト・全スキル/エージェント参照を撤去し `docs/todo/`（手動運用）へ一本化。CI の違反検出は「CI 失敗 → GitHub 通知 → 手動起票」に置換
- `docs/project/TODO.md` — 廃止（自動生成ビューは不要と判断）。task-queue.json 撤去で生成元も消滅 <!-- doc-ref:ignore -->
