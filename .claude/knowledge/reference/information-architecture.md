---
title: 情報アーキテクチャ（Knowledge-first モデル）
---

# 情報アーキテクチャ（Knowledge-first モデル）

doboku-note プロジェクトにおけるドキュメント・データの置き場ルールの真実源。

## 配置モデル

| Zone | 場所 | 役割 | 形式 | 主な閲覧面 |
|---|---|---|---|---|
| Knowledge | `.claude/knowledge/` | エージェントが読む共有知識・ポリシー・設計規約 | md / JSON | Admin `/knowledge` |
| Runtime | `.claude/state/` / `.claude/config/` | 状態・機械設定 | JSON | Admin / 各機能 |
| Capability | `.claude/skills/` / `.claude/agents/` | Claude の実行能力 | md + scripts | Admin `/skills`, `/agents` |
| Agent Content | `.claude/content/` | Claude エージェントが管理する非公開のチャネル原稿・運用SSOT | md / assets | エージェント |
| Content | `docs/` | note・SNS・教材・計画・handoff など人向け成果物と業務記録 | md / assets | 専用 Admin 画面 |

`.claude/knowledge/` の Markdown/JSON がSSOTであり、Adminは読み取り専用の人向けHTMLビューである。HTMLを別ファイルとして保存せず、二重管理を作らない。

配下は当面、既存リンクと変更履歴を保つため次の2群で管理する。

- `.claude/knowledge/reference/` — 運用手順・ポリシー・アーキテクチャ・台帳
- `.claude/knowledge/design-system/` — 画像・UI・ブランドの設計規約とトークン

## 判断フロー

1. 実行タスク・計画 → `docs/todo/`（annual / monthly / weekly）
2. 状態・設定として CI・エージェントが programmatic に読む → `.claude/state/` / `.claude/config/`（JSON）
3. エージェント間で継続参照する知識・判断・手順 → `.claude/knowledge/`
4. Claude Code の能力定義 → `.claude/skills/` / `.claude/agents/`
5. Claude エージェントが閉じて管理するチャネル専用原稿・運用SSOT → `.claude/content/{channel}/`
6. SNS 投稿管理 → `docs/sns/{instagram,x,youtube}/`
7. note 記事管理 → `docs/note/`
8. 上記いずれでもない一時メモは作らない（`.tmp/` 配下のみ）

現在の `.claude/content/` 対象は Kindle のみ。`.claude/content/kindle/strategy.md` と
`.claude/content/kindle/books/{id}/front-matter.md` は `kindle-book-composer` / `kdp-operator` が管理し、
`docs/` に Kindle 専用の管理ファイルを置かない。公開コンテンツ内の Kindle 導線や、`docs/todo/` の関連タスクは
各成果物・タスクの文脈なのでこの移管対象外。

## スキル/エージェント更新ルール

`.claude/skills/` または `.claude/agents/` を追加・修正・削除した場合は、  
**同一 commit** で以下を更新すること：

- スキル変更 → `.claude/knowledge/reference/skills-registry.md`
- エージェント変更 → `.claude/knowledge/reference/agents-registry.md`

自動チェック: `.claude/hooks/check-doc-sync.sh`（settings.json の PreToolUse に登録済み）

## todo/ ディレクトリ仕様

すべての計画・タスクの単一正源。GitHub Issue・task-queue.json は使わない。

> [!important] GitHub Issue の限定例外＝自動化の失敗記録（2026-08-06 制定）
> **`automation-failure` ラベルの Issue だけは使う**。スコープは「自動化が失敗した／沈黙した事実の記録」に限る。
> タスク・改善候補・裁定は従来どおり `docs/todo/` と各 SSOT の観測ログへ書く（Issue に逃がさない）。
>
> **理由**: job summary もクラウドルーティンの最終報告も、人が見に行かないと届かない。
> 沈黙した自動化ほど気づかれず、実際 2026-07・08 の月次カバレッジ 2 回分は CI がデータを
> commit したのに誰も分析せず、indexed_ratio が 10pt 落ちる間ずっと無記録だった。
> Issue は通知が飛び open のまま残るので、**能動的な通知チャネル**として機能する。
>
> 起票は `scripts/report-automation-failure.mjs` に集約（重複防止＝同 channel の open Issue が
> あれば新規作成せずコメント追記／**クローズは人間**＝復旧の実体検証を挟む）。
> 現在の起票元: `weekly-review-guard.yml`（記録層の沈黙）・`index-coverage.yml`（閾値の無条件異常）・
> クラウドルーティン `doboku-note GSC auto review`（実行時の【要確認】）。

ディレクトリ: `docs/todo/`

| ファイル | 粒度 | 更新タイミング |
|---|---|---|
| `annual.md` | 年（試験カレンダー × 商品投入計画） | 戦略転換時 |
| `monthly.md` | 月（今月のフォーカス + 締切） | 月初 |
| `weekly.md` | 週（今週やること 3〜5件） | 週初（Claude と協働） |

タスクマスタは `backlog.md`（上表は backlog から pull される下流の3層）。

## handoff のライフサイクル（2026-07-11〜「extract→削除」・archive 廃止）

`docs/handoffs/YYYY-MM-DD-{context}.md` は**セッション引き継ぎの途中記録**。溜めない運用に統一する:

1. handoff の**生きたタスク・恒久ノウハウは然るべき SSOT へ抽出**（タスク→`docs/todo/backlog.md`／手順・runbook→`.claude/knowledge/reference/` の該当 doc／個人知見→memory）。
2. 抽出が終わった handoff 本体は**削除**（`git rm`）。**記録は git 履歴が持つ**＝いつでも復元可能。旧 `_archive/` ディレクトリは廃止（2026-07-11 に77本を削除・ユーザー決定）。
3. 過去 handoff への出典引用（`docs/handoffs/**` パス）は削除後も正当（point-in-time 記録）。`check-doc-refs` は `docs/handoffs/**` を参照先チェックから除外する。

**残作業の有無は `handoffs/` に残す理由にならない**（タスクは backlog が持ち、月初→`monthly`・週初→`weekly` へ落ちる）。`handoffs/` は原則ほぼ空。週次 PDCA（`/weekly-review` の Agent H）が抽出漏れを surface し、`/doc-declutter`（`doc-curator`）が外部実体を検証して抽出→削除を適用する。**鉄則＝外部実体（PR merged・published:true・deploy・ファイル実在）を検証してから削除・未確認なら削除しない**。

**機械ゲート**（`scripts/check-handoff-extraction.mjs`・pre-commit）: この規律の「無意識の素通り」だけを塞ぐ。handoff 直下 `*.md` の削除コミットで前送りマーカー（🔴🟡/残タスク/次アクション/別PC 等）を検出し backlog が同一コミットに無ければ止める／`_archive/` への追加を無条件で止める。backlog 同梱は「抽出の証明」でなく「思い出させる強制注意」で、判定の質は `/doc-declutter`（`doc-curator`）が担う。回避は `SKIP_HANDOFF_EXTRACT=1`（2026-07-14 の退避事故＝未抽出のまま `_archive` 復活の再発防止・[[feedback_handoff_extract_before_delete]]）。

## review のライフサイクル（2026-07-25〜）

`docs/reviews/` は恒久知識の保存先ではない。レビュー完了後は次のように処理する。

1. 未完タスクは `docs/todo/backlog.md`、恒久ルール・知見は `.claude/knowledge/`、機械判定データは `.claude/state/` へ抽出する。
2. 実装中タスクが詳細な根拠・受入条件を直接参照しているレビューだけを一時的に残す。
3. 実装完了、別SSOTへの置換、後続レビューによる上書きが確認できたレビューは削除する。履歴はgitが持つ。
4. `docs/reviews/weekly/` は最新レビューと次週計画の作業中セットだけを保持し、次回生成時に旧週分を抽出確認して削除する。

再実行可能な監査はスクリプト＋JSONをSSOTとし、Markdownレポートは現役の実装判断に必要な期間だけ保持する。

## .claude/ の構成

`.claude/` には共有知識、Claude 管理コンテンツ、実行能力、機械データを置く：

```
.claude/
  knowledge/        # 共有SSOT（Admin /knowledge でHTML閲覧）
  content/          # エージェント管理の非公開チャネル原稿・運用SSOT
  skills/           # 実行能力
  agents/           # 実行能力
  state/            # 状態（JSON のみ）
  config/           # 機械設定（JSON のみ）
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
2. **価格・リリースカレンダー・ロードマップは指定 SSOT のみに置く**。散在させない（note は各 `docs/note/{試験}/noteコンテンツ計画.md`、Kindle は `.claude/content/kindle/strategy.md`）。
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
| handoff | `scripts/check-handoff-extraction.mjs` | handoff 直下 `*.md` を削除するコミットで前送りマーカー（🔴🟡/残タスク/次アクション/別PC 等）があるのに backlog 未同梱＝残タスク抽出もれ／`_archive/` への追加＝廃止機構の復活（2026-07-14 退避事故の再発防止） | pre-commit（機械） |
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
- `docs/reference/` — 2026-07-24 に `.claude/knowledge/reference/` へ移行 <!-- doc-ref:ignore -->
- `docs/design-system/` — 2026-07-24 に `.claude/knowledge/design-system/` へ移行 <!-- doc-ref:ignore -->
- `.claude/reference/` — 削除済み（2026-05-14）。移行先は `.claude/knowledge/reference/`
- `.claude/content-principles.md` — 移行先は `.claude/knowledge/reference/content-principles.md` <!-- doc-ref:ignore -->
- `.claude/design-system/` — 移行先は `.claude/knowledge/design-system/`
- `.claude/reference/docs-issue-separation.md` — 削除済み。本ドキュメントに統合 <!-- doc-ref:ignore -->
- GitHub Issue — 廃止。タスクは `docs/todo/` に集約（**例外**: `automation-failure` ラベル＝自動化の失敗記録のみ・上記「限定例外」参照）
- `task-queue.json` + `build-todo-view.mjs` + `npm run build-todo` — 廃止完了（2026-06-11）。CI 3本の自動起票・lib スクリプト・全スキル/エージェント参照を撤去し `docs/todo/`（手動運用）へ一本化。CI の違反検出は「CI 失敗 → GitHub 通知 → 手動起票」に置換
- `docs/project/TODO.md` — 廃止（自動生成ビューは不要と判断）。task-queue.json 撤去で生成元も消滅 <!-- doc-ref:ignore -->
