---
name: doc-declutter
description: >
  ドキュメントの肥大化を棚卸しするスキル。完了済み handoff の退避・古い行の trim・重複 doc の統廃合を、
  外部実体（PR merged / published:true / deploy / ファイル実在）を検証してから安全に行う。親が機械 surfacer
  と git/grep で完了シグナルを確定し、doc-curator（Evaluator）に KEEP/TRIM/ARCHIVE/DELETE/CONSOLIDATE を
  判定させ、承認後に退避・trim・参照更新・memory 同期まで適用する。doc-sync（コード起点の prose 陳腐化）とは別。
  Use when user asks to [ドキュメント棚卸し, handoff 整理, doc 肥大化, 完了 handoff を退避, doc declutter, /doc-declutter].
user-invocable: true
argument-hint: "[handoffs|reference|all] (既定: handoffs)"
---

ドキュメントの**ライフサイクル（肥大化・完了・重複）**を棚卸しする半自動オーケストレーションスキル。
親（あなた）が**外部実体の検証**と適用を担い、**処分の判定だけ**を Evaluator サブエージェント **`doc-curator`** に委ねる。

> **3 層の役割分担（混同しない）**
> - `scripts/check-doc-lifecycle.mjs` … 棚卸し候補の機械 surfacer（鮮度・orphan・PR/commit 言及。**非ブロッキング**）
> - **本スキル + `doc-curator`** … 候補の処分判定（KEEP/TRIM/ARCHIVE/DELETE/CONSOLIDATE・LLM・棚卸し時に手動）
> - `scripts/check-doc-refs.mjs` … 退避/削除後の壊れ参照ゼロ検証（機械・pre-commit）
>
> **doc-sync との違い**: `/doc-sync` は**コード変更**で doc が旧仕様化していないか（prose 陳腐化）。本スキルは **doc 自体の処分**（完了・重複・肥大）。トリガーが違う。

## いつ回すか（発火規律）

- **回す**: `docs/handoffs/**` が蓄積した（週次 PDCA の `/weekly-review` Agent H が退避候補を surface したとき）／reference・project に重複や完了済み記述が溜まったと感じたとき。
- **回さない**: 純コンテンツ（`.local/r2/posts/**` MDX・`docs/note,sns/**` 素材）。これらは肥大化管理の対象外。

## 鉄則（今セッションで実証した安全則）

> **handoff の既定処分は extract→ARCHIVE（2026-06-23 移行）**: handoff は溜めない。生きたタスクは `docs/todo/backlog.md` へ抽出（出典に `_archive/` パス）し、本体は**残作業の有無に関わらず** `_archive/` へ退避する。**残作業がある＝KEEP ではない**（タスクは backlog が持つ）。KEEP は「当該セッションで今まさに編集中・未だ backlog 未抽出」のごく直近に限る。真実源 → `docs/reference/information-architecture.md`「handoff のライフサイクル」。reference/project doc は従来どおり完了判定で KEEP/TRIM/ARCHIVE。

1. **自己申告で完了と決めない**。doc が「完了」と書いていても、**外部実体を git/grep で検証**してから処分する（PR が merged か・成果物が `published:true`／noteUrl 付きか・参照 commit が develop/main に入っているか・ファイルが実在するか）。検証できない残作業がある doc は **DELETE せず ARCHIVE**。
2. **退避 ≠ 削除**。残détail に価値・外部残尾あり → `_archive/`。完全完了かつ恒久 SSOT が内容を完全保持 → DELETE。判断は doc-curator に出させ、親が最終決定。
3. **参照を同一 commit で張り替える**。退避/削除する doc を参照している全ファイル（`check-doc-refs` 対象のパス参照）を、`_archive/` パスへ更新（退避）か SSOT へ張り替え（削除）。漏れると pre-commit が落ちる。
4. **`git add` はしない。`git commit -- <pathspec>` で対象だけ**コミット（並行セッションの未 staged 変更を巻き込まない／CLAUDE.md §3・§10）。
5. **memory も同期**。`~/.claude/.../memory/` がその doc を参照していたら、本体 `.md` と `MEMORY.md` の索引行を実態へ更新（memory は repo 外＝commit 不要）。
6. **EOL 保持**。`docs/**` の handoff/reference は LF。trim 後に CRLF 混入していないか確認（混在は pre-commit reject）。

## 手順（親が実行）

### 1. 候補を機械で surface する

```bash
node scripts/check-doc-lifecycle.mjs            # 既定 handoffs・age>=14d or orphan
node scripts/check-doc-lifecycle.mjs --days 21  # 鮮度閾値を変える
```

orphan（参照元 0）・stale-age・言及 PR/commit が出る。**これは候補リストであって判定ではない**。

### 2. 各候補の「外部実体シグナル」を確定する（親が Bash/git/grep）

候補ごとに、doc の主張を**実体で裏取り**する。代表的な確認:

```bash
# 言及 PR の merged 状態（network 可能な環境で）
gh pr view <N> --json number,state,mergedAt 2>/dev/null

# 言及 commit が develop/main に入っているか（squash で SHA が変わる点に注意 → 成果物の実在で確認）
git merge-base --is-ancestor <sha> origin/develop && echo in-develop

# 成果物の実体（例: note 公開状態）
grep -nE '^(published|noteUrl|noteStatus):' <関連 article/SoT>

# この doc を参照しているファイル（張り替え対象）
grep -rl '<handoff-basename>' docs .claude --include='*.md' | grep -v '<self>'

# memory 参照
grep -rl '<handoff-basename>' ~/.claude/projects/*/memory/ 2>/dev/null
```

「完了」を裏付けられないシグナル（note 投稿・deploy・cloud 生成など外部尻尾）は**未確認として明記**する。

### 3. doc-curator に判定させる

`doc-curator`（`model: sonnet`）を spawn し、**テキストで**渡す:
- **候補 doc パス一覧**（手順 1）
- **各候補の検証済みシグナル**（手順 2：完了 / 参照 / 重複 / 鮮度 / 凍結）

候補が **12 件超**なら**複数エージェントに分割**（1 エージェント 5〜8 件）。エージェントは候補を `Read` し、`verdict（KEEP/TRIM/ARCHIVE/DELETE/CONSOLIDATE）+ 根拠引用 + confidence + 後追い` を返す。

> エージェントは Bash 不可。git/grep の確定は**必ず親が済ませて**から渡す（[[feedback_agent_bash]]）。

### 4. 提示 → 承認 → 適用

verdict を一覧提示し、ユーザー承認後に親が適用:

- **TRIM**: 完了行を Edit で除去。完了の事実は「注」で 1 行残す（誤読防止）。EOL 保持。
- **ARCHIVE**: まず handoff 内に**生きたタスク**が残っていれば `docs/todo/backlog.md` へ抽出（各タスクの出典に退避後の `_archive/` パスを明記）してから `git mv <doc> docs/handoffs/_archive/<doc>`。全参照を `_archive/` パスへ Edit。memory のポインタも更新。
- **DELETE**: `git rm <doc>`。全参照を SSOT へ張り替え。memory 同期。
- **CONSOLIDATE**: 内容を統合先へ移し、重複側を ARCHIVE/DELETE。参照は統合先へ。

```bash
# 例（退避＋参照更新を 1 commit に・pathspec で対象だけ）
git mv docs/handoffs/<doc>.md docs/handoffs/_archive/<doc>.md
# （参照ファイルを Edit で _archive/ パスへ更新）
git commit -m "docs(handoff): <doc> を _archive へ退避（…完了・真実源は …）" -- \
  docs/handoffs/<doc>.md docs/handoffs/_archive/<doc>.md <参照ファイル...>
```

### 5. 適用後の検証

```bash
npm run check-doc-refs        # 壊れ参照ゼロ（旧パス参照が残っていないか）
npm run check-doc-coupling    # 台帳もれゼロ（スキル/エージェントを動かした場合）
git show --stat HEAD          # 巻き込み確認（対象ファイルだけか）
git status --short            # 並行セッションの変更が手つかずか
```

文字化け（U+FFFD）混入・CRLF 混在もチェック。完了後、何を退避/削除/trim し・何を未確認で残したかを 1 行で報告（CLAUDE.md §12）。

## 例

- **handoff 棚卸し**: `/doc-declutter` → surfacer が orphan 4 本提示 → 各 PR の merged と成果物 published:true を確認 → doc-curator が「2 本 ARCHIVE・1 本 DELETE・1 本 KEEP（open 残）」と判定 → 承認 → 退避＋参照更新＋memory 同期を pathspec commit。
- **reference 重複**: `/doc-declutter reference` → 同じ手順を ADR と reference が二重に持つ → CONSOLIDATE（ADR を SSOT に、reference を薄いポインタへ）。

## トラブルシューティング

- **check-doc-refs が落ちる**: 退避/削除した doc への参照が残っている。`grep -rl '<basename>' docs .claude` で残存を洗い、`_archive/` パスか SSOT へ全部張り替える。
- **pre-commit が無関係ファイルで止まる**: `git add -A` していないか確認。必ず `git commit -- <pathspec>`。
- **「完了」と書いてあるのに実体は未完**: 外部尻尾（note 投稿・deploy）は repo に痕跡が出ない。`verify-note-magazines` 等で実体確認し、未確認なら DELETE せず ARCHIVE（残作業を本文に保全）。

## 連携

- Evaluator: `doc-curator`（処分判定）
- 機械 surfacer: `scripts/check-doc-lifecycle.mjs`（`npm run check-doc-lifecycle`）
- 退避後の検証: `scripts/check-doc-refs.mjs` / `scripts/check-doc-coupling.mjs`（pre-commit）
- 別系統: `/doc-sync`（コード変更起点の prose 陳腐化）
- ルール真実源: CLAUDE.md §8 / `docs/reference/information-architecture.md`「SSOT と参照規律」
