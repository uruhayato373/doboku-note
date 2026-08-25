---
taskId: DN-0100
type: implementation-plan
createdAt: 2026-08-22
deleteOnComplete: true
---

# DN-0100 note回遊導線の緊急修復

## 目的

2026-08-20 の導線監査で判明した3つの不具合を、ソースとnoteライブの両方で閉じる。

1. 技術士総監の共通CTAが、本試験後も「本番直前・R8最終予想」を訴求している
2. 新規有料記事74本の無料プレビュー内に、同資格L2「土木もくじ」への帰路がない
3. 公開4本で、正しいソースCTAがnoteライブへ未反映

作業を「ローカル修復」と「外部ライブ反映」に分け、後者は必ずユーザー承認後に行う。

## SSOT

- `AGENTS.md`
- `.claude/skills/social/audit-note-funnel/SKILL.md`
- `.claude/skills/social/publish-note/SKILL.md`
- `.claude/knowledge/reference/note-funnel-architecture.md`
- `.claude/skills/social/publish-note/references/update-mode.md`
- `.claude/config/note-funnel.json`
- `src/lib/note-magazines.ts`
- `src/lib/hub-cta.ts`
- `src/lib/magazine-placement.ts`
- `scripts/audit-note-funnel.mjs`
- `scripts/wire-note-funnel-cta.mjs`
- `scripts/wire-note-paid-cta.mjs`

## Scope

### 含む

- 総監の試験後CTA文面とサイト側L2タイル文面
- 総監キーワードhubの商品順序
- 意味監査候補10本の冒頭CTA分類
- 1級50本・2級24本のL2帰路と、civil二次記事末尾のメンバーシップCTA
- 公開4本と有料74本のnoteライブ反映
- 同型事故を検知するテストまたは検査モード

### 含まない

- 新商品の作成、価格変更、マガジン新設
- R9予想問題集の制作
- note記事の削除・非公開化
- mainへのマージ、deploy
- DN-0101のL1/L2大規模再編

## 確定設計

### 1. 総監の試験後CTA

- `.claude/config/note-funnel.json` の `tankan.topCta` は、年号・「本番直前」・予想的中を主語にしない次のevergreen文面へ変更する

```markdown
<!-- cta:pack-top -->
> 記述式の型、5管理のトレードオフ、設問(3)の国家施策を一つの流れで固めるなら、[記述式コアパック](https://note.com/dobokunote/m/m6e7de5e4ea3d)から始められます。無料記事や立場別の模範論文を比較したい方は、[総監もくじ](https://note.com/dobokunote/n/n3ed4c77ceed6)で現在地に合う教材を選べます。
```

- 第一リンクは記述式コアパック `m6e7de5e4ea3d`、比較・無料回遊は総監もくじ `n3ed4c77ceed6` に委ねる
- R9商品は未作成なので、存在しない商品・価格・公開予定を約束しない
- `src/lib/hub-cta.ts` の総監平時タイルはURLを変えず、`title1: '記述式・5管理対策'`、`title2: '状況別に教材を選ぶ'` とする
- `src/lib/magazine-placement.ts` の総監キーワードhubは `tankan-reading-guide` を最初の実描画候補にし、試験後のR8予想を先頭・sidebarから外す。完全パックは次点に残してよい

### 2. 総監10記事の意味分類

`KEEP` は新しいevergreen CTAへ同期する。`LIGHTWEIGHT` と `EXCLUDE` は `topCtaExcludeDirs` に追加し、既存の厳密な `<!-- cta:pack-top -->` ブロックを除去する。

| 判定 | 記事ディレクトリ | 実装 |
|---|---|---|
| KEEP | `再受験対策` | evergreen CTA |
| KEEP | `白書R7完全対応集` | evergreen CTA |
| KEEP | `総監マガジンの歩き方` | evergreen CTA |
| KEEP | `総監受験コスト比較` | evergreen CTA |
| LIGHTWEIGHT | `公務員の総監学習設計` | `cta:pack-top-light` で総監もくじを1リンクだけ提示 |
| LIGHTWEIGHT | `総監コスト公務員版` | `cta:pack-top-light` で総監もくじを1リンクだけ提示 |
| EXCLUDE | `一般部門との違い` | 冒頭商品CTAなし |
| EXCLUDE | `公務員が総監を取るメリット` | 冒頭商品CTAなし |
| EXCLUDE | `総監をAIで勉強する` | 冒頭商品CTAなし |
| EXCLUDE | `自治体技術職員の資格地図` | 冒頭商品CTAなし |

既存後半の商品リンクや末尾L2は削除しない。`cta:pack-top-light` を通常マーカーの部分一致として扱わない。

軽量CTAの文面は記事ごとに次を使う。

```markdown
<!-- cta:pack-top-light -->
> 学習計画を教材の順番まで落とし込みたい方は、[総監もくじ](https://note.com/dobokunote/n/n3ed4c77ceed6)で無料記事と教材を段階別に確認できます。
```

```markdown
<!-- cta:pack-top-light -->
> 教材費を比較してから選びたい方は、[総監もくじ](https://note.com/dobokunote/n/n3ed4c77ceed6)で無料記事と有料教材をまとめて確認できます。
```

### 3. 有料74本

対象は次の2集合だけとする。

- `content/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック/工事101-*`〜`工事150-*`: 50本
- `content/note/1級・2級土木/2級土木/magazines/2級土木-想定工事バンク/工事101-*`〜`工事124-*`: 24本

`scripts/wire-note-paid-cta.mjs` の既存仕様どおり、土木もくじ `n4fde0f62dc20` を `paidBoundary` H2直前へ、civil二次用メンバーシップCTAを有料域末尾へ置く。所属パックの冒頭リンクは維持する。

## 手順

### Phase A: 開始前確認とbaseline

1. `git branch --show-current` が `develop` であることを確認する
2. `git fetch -q` と `git log --oneline HEAD..origin/main | head` で古いベースでないことを確認する。同期が必要なら勝手にcheckout/resetせず停止する
3. `git status --short` を保存し、既存のユーザー変更へ上書きしない
4. 次を実行し、件数を作業報告へ残す

```bash
npm run audit-note-funnel
npm run audit-note-funnel -- --live
npm run check-note-paid-cta
npm run check-magazine-cta
```

期待baselineは `D1-D4/D6=0`、D5=4、有料CTA変更対象=74、サイト側baseline外0面=0。異なる場合は原因を調べ、対象を広げず報告して停止する。

### Phase B: ローカル修復

1. `note-funnel.json` と `hub-cta.ts` の試験後文面を更新する
2. `magazine-placement.ts` の総監キーワードhub順序を更新し、実描画される先頭1誌が精読ガイドになるテストを追加・更新する
3. 10記事の分類をconfigと記事本文へ適用する
4. 通常CTAの一括文面同期が必要な場合、既存 `wire-note-funnel-cta` の追加専用挙動を無理に流用しない。厳密マーカーから直後の最初のH2までを対象にした、dry-run既定・`--apply`明示・想定外構造は無変更でFAILする同期処理とテストを追加する
5. 有料74本は先にdry-runし、対象集合を確認してから適用する

```bash
node scripts/wire-note-paid-cta.mjs
node scripts/wire-note-paid-cta.mjs --apply --list .tmp/dn-0100-paid-cta.txt
wc -l .tmp/dn-0100-paid-cta.txt
```

リストが74行でない、または上記2ディレクトリ以外を含む場合はコミットせず停止する。

### Phase C: ローカル受入検査

```bash
npm run check-note-funnel
npm run check-note-paid-cta
npm run check-magazine-cta:ci
npm run check-note-site-utm
npm run check-note-link-cards
npm run type-check
npm run check-backlog-schema
git diff --check
```

さらに以下を件数付きで確認する。

- `R8最終予想` と `本番直前` が通常の総監冒頭CTAブロックに残っていない
- EXCLUDE 4本に厳密な `<!-- cta:pack-top -->` がない
- LIGHTWEIGHT 2本に通常マーカーがなく、軽量マーカーが各1つだけある
- 有料74本の `paidBoundary` より前に `n4fde0f62dc20` がある
- 1級50本・2級24本の価格、noteId、本文、画像、PDF参照を意図せず変更していない

ここで一度停止し、変更ファイル、件数、ライブ反映対象78本、添付PDF有無、実行予定コマンドをユーザーへ提示する。

### Phase D: noteライブ反映（ユーザー承認後のみ）

1. `/publish-note` の更新モードとアカウントassertを使う。MCP Playwrightの一時プロファイルやselect-all→pasteは使わない
2. まず無料の4本を直列更新する。R8本試験模範解答例・R8解答速報は**新しい試験後CTA**を反映し、古いR8予想CTAを再投入しない。択一PDF令和・平成は末尾L2を反映する
3. 有料74本は1級と2級にリストを分け、各リストの先頭1本をcanaryとしてdry-run・スクリーンショット・有料境界・価格・添付を確認する
4. canary成功後、1バッチ最大25本、直列、`--max-consecutive-fail 3` で反映する。全文更新が必要な場合は `note-update-body --list` の添付保護を通し、PDFがある記事は `--reattach-pdf` なしで更新しない
5. 更新通知は必ず「いいえ」。価格と有料境界は変更しない
6. 各バッチ後に公開APIで無料域の `n4fde0f62dc20`、price、can_read、remained_char_numを確認する。3本連続失敗・アカウント不一致・CAPTCHA・境界不一致で残りを止める

### Phase E: 最終検証と抽出

```bash
npm run audit-note-funnel -- --live --ci
npm run check-note-paid-cta
npm run check-note-republish -- --json
git diff --check
```

`audit-note-funnel` は通常記事のD5=0を必須とする。有料74本は公開APIの無料本文にL2 noteIdがあることを別途全件検査する。既存スクリプトで全件ライブ検査できない場合は、`wire-note-paid-cta` にread-onlyの `--live` を追加し、0件検査をPASSにしないテストを付ける。

恒久ルールは `note-funnel-architecture.md` とコード近傍コメントへ抽出する。未解決事項は別backlogカードへ移し、参照がなくなったら本planとDN-0100カードを削除する。

## 停止条件

- `develop` 以外、またはorigin同期が必要
- 既存変更と対象ファイルが競合
- 74本以外へ有料CTA変更が広がる
- noteアカウントが `dobokunote` でない
- ログイン、CAPTCHA、エディタUI変更
- 有料境界、価格、PDF添付の保持を証明できない
- ライブ更新が3本連続で失敗
- 外部変更のユーザー承認がない

## Claude Code起動プロンプト

```text
DN-0100を実装してください。

最初にAGENTS.md、.claude/todo/backlog.mdのDN-0100、
.claude/plans/DN-0100-note-funnel-emergency-remediation.md、
.claude/skills/social/audit-note-funnel/SKILL.md、
.claude/skills/social/publish-note/SKILL.md、
.claude/knowledge/reference/note-funnel-architecture.mdを全文読んでください。

planのPhase Aから順番に進めてください。まずローカル修復とPhase Cの全検証まで実施し、
対象件数・変更ファイル・検証結果・noteライブ反映予定78本・添付PDF有無を報告して停止してください。
ユーザーが明示承認するまでnote.comへの更新、publish、deployは実行しないでください。

総監CTAは試験後のevergreen文面へ変更し、review候補10本はplan記載の
KEEP 4 / LIGHTWEIGHT 2 / EXCLUDE 4をそのまま適用してください。
有料CTAは1級50本と2級24本だけが対象です。74本以外へ差分が出たら適用せず停止してください。
既存の価格、paidBoundary、noteId、画像、PDF、後半CTAを壊さないでください。

承認後のPhase Dではdobokunoteアカウントをassertし、直列・canary-first・通知「いいえ」で更新してください。
select-all→pasteは禁止です。有料境界・価格・添付を保存前後に検証し、3本連続失敗で残りを止めてください。
最後にソース検査とライブ実査を再実行し、未解決事項だけをbacklogへ残してください。
```
