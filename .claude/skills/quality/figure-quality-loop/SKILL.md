---
name: figure-quality-loop
description: >
  記事図クロップ（content/site/**/img の png/webp）の品質を「機械で検出→目視で判定→切り直し／元PDFから切り出し直し→再検査→判定台帳に記録」で1周回すループスキル。
  判定は画像のハッシュつきで台帳に残るので、回すほど判定待ちが減り 0 で止まる。/loop で自走させる前提。
  単発の写り込み除去は /figure-recrop、1級土木 過去問1次のページ単位の再抽出は /civil-figure-rework。
  Use when user asks to [図クロップの品質ループ, 図の品質チェックと改善, 切れた図を直す, /figure-quality-loop].
user-invocable: true
domain: site
---

# /figure-quality-loop

記事に載っている図クロップを 1 周ぶん（最大 8 枚）判定し、直せるものは直して、判定を台帳に記録する。`/loop /figure-quality-loop` で繰り返すと、判定待ちが 0 になったところで止まる。

```
検出（機械）: figure-review-queue.mjs ─ 画素検査（EDGE_CUT / STRAY_*）＋ OCR の needs − 判定済み
  → 判定・修正（figure-crop-worker を並列）: ok ／ 写り込みを切り直す ／ 図本体が切れている（needs-source）
  → 親の QA（書き換えた図と suspect を目視＋ check-figure-crop-integrity --file）
  → 記録（figure-review-queue.mjs record: 画像のハッシュつき・MDX の寸法も合わせる）→ commit
needs-source の図は次の段（stage=reextract）で元 PDF のページから切り出し直す。原典が無ければ source-unavailable（入手待ち）
```

真実源: 判定待ちと台帳の仕組み＝`scripts/figure-review-queue.mjs`・`scripts/lib/figure-review.mjs`、台帳＝`.claude/state/quality/figure-review-ledger.json`、図の出所と needs＝[figure-provenance.md](../../../knowledge/reference/figure-provenance.md)。

## 1 周の手順

### 0. 前提
- ブランチは `develop`（図と記事はコンテンツ＝develop 直 push）。`git fetch -q` して遅れていれば `git merge --ff-only origin/develop` してから始める。
- 作業ファイルは `.tmp/figure-loop/` に置く。

### 1. 集計して次の一括を決める
```bash
node scripts/figure-review-queue.mjs
```
- exit 2（検査不成立）→ 止めて原因を報告する（`/loop` も止める）。
- `⚠ OCR 未監査 N 枚` が出たら先に `npm run audit-figures`（OCR・数分）を実行してから集計し直す（答え・本文の写り込みの兆候が欠けるため）。
- **「判定待ち・切り出し直し待ちとも 0」なら完了**。残数を報告して終わる（`/loop` 中なら次を予約せず止める）。

判定待ちがあれば判定待ちを、無ければ切り出し直し待ちを取る:
```bash
mkdir -p .tmp/figure-loop
node scripts/figure-review-queue.mjs --next 8 --json > .tmp/figure-loop/batch.json
# 判定待ちが 0 のとき: --stage reextract --next 4
```

### 2. ワーカーを並列で回す
```
Workflow({ scriptPath: ".claude/skills/quality/figure-recrop/scripts/figure-crop-batch.workflow.mjs", args: <batch.json の配列> })
```
各図を `figure-crop-worker`（sonnet）が処理する。判定の規則（何を切り、何を残し、いつ needs-source にするか）は worker の定義が唯一の正本。

### 3. 親の QA（Evaluator）
対象は **画像を書き換えた図（crop / reextract）** と **`selfVerify: suspect` の図**。それぞれ:
1. `node scripts/check-figure-crop-integrity.mjs --file <img>` で `STRAY_SLIVER` が無く、新しい `EDGE_CUT`（図本体の切断）を作っていないこと。
2. png に変換して Read し、写り込みが消えて図本体が欠けていないこと。reextract は旧画像（`git show HEAD:<img>`）と並べて、同じ図で欠けが戻っていること。

不合格（切り過ぎ・写り込み残り・別の図）は原画に戻し（`git checkout -- <追跡中の png> <webp>`。未追跡の png を pathspec に混ぜると全体が止まる）、その図は**記録しない**（次の周で再判定される）。`ok` で `clean` の図はそのまま記録する。

### 4. 判定を記録する
結果を下表で判定に直して `.tmp/figure-loop/verdicts.json`（配列）に書き、記録する:

| worker の action | 親の QA | verdict | action |
|---|---|---|---|
| `ok` | — | `ok` | `none` |
| `crop` | 合格 | `ok` | `recrop` |
| `needs-source` | — | `needs-source` | `none` |
| `reextract` | 合格 | `ok` | `reextract`（`source: {pdf, page, dpi}` 必須） |
| `source-unavailable` | — | `source-unavailable` | `none` |
| `error`・QA 不合格 | — | 記録しない | — |

各要素は `{ figKey, verdict, action, reason, source? }`（reason は worker の reason を基に、何を直したか・何が切れているかを具体的に）。
```bash
node scripts/figure-review-queue.mjs record .tmp/figure-loop/verdicts.json
```
台帳は今の画像のハッシュで記録し、直した図は記事 MDX の `width`/`height` を新しい寸法に合わせる。台帳を手で編集しない。

### 5. commit して進捗を出す
```bash
npm run check-image-assets:ci               # 画像サイズの上限（config/image-limits.json・webp 150KB 等）。超えたら縮小して record し直す（CI の audit がここで落ちる）
npm run refresh-indexes                     # MDX の寸法を変えたときだけ
grep -c "�" <変えた MDX>                     # 文字化け 0
git add <書き換えた png/webp> <変えた MDX> .claude/state/quality/figure-review-ledger.json   # 明示指定（git add -A 禁止）
git commit -m "content(figures): 図クロップ品質ループ N 枚（ok a・切り直し b・切り出し直し c・要切り出し直し d・原典なし e）"
git fetch -q && git rev-list --count HEAD..origin/develop   # 0 でなければ下の載せ直しをしてから
git push origin develop                     # 載せ直し・検証とは別の呼び出しにする
node scripts/figure-review-queue.mjs        # 残数を 1 行で報告
```
- MDX の寸法を変えると pre-commit の lint-ja がその記事全体を見るので、既存の表記ゆれ（「締め固め」「打ち込み」等）でコミットが止まることがある。設問の選択肢を引用した行は原文として除外されるので、止まった行は自前の解説。設問の表記に合わせて直してから同じコミットに入れる（`--no-verify` で飛ばさない）。
- `develop` が先に進んでいたら、作業ツリーに他のセッションの変更があっても `git reset --keep origin/develop` → `git cherry-pick <自分の sha>` で載せ直し、元のパッチと同じか確かめてから push する（`git rebase` は他人の未コミットの変更で拒否される・stash は共有なので使わない）。

## /loop での回し方

`/loop /figure-quality-loop`（間隔なし＝自走）。1 回の起動で 1 周回し、手順 1 で「判定待ち・切り出し直し待ちとも 0」なら止める（ScheduleWakeup の `stop`）。外部の状態を待つ処理は無いので、次の周は 60 秒後に予約してよい。検査不成立（exit 2）・push の失敗・同じ図が 2 周続けて QA 不合格のときも止めて報告する。

完了条件（決定的）: `node scripts/figure-review-queue.mjs` が「判定待ち・切り出し直し待ちとも 0」。`source-unavailable` は残ってよい（入手待ち。provenance では `rescan-need-source` として見える）。

## 鉄則

- **判定は目視**。機械の兆候（`signals`）は疑う場所の手がかりで、EDGE_CUT の大半は罫線・写真・機材イラストが縁に接しているだけ（正当）。兆候があるというだけで切らない。
- **二度切り厳禁**（やり直しは原画に戻してから）・**過去問の図に正答・解説を写し込まない**・**過去問のデータグラフを SVG に描き直さない**（図の幾何が答え＝誤答誘発。[figure-provenance.md](../../../knowledge/reference/figure-provenance.md)）。
- worker は MDX・台帳・git に触らない。記録・MDX・commit は親が直列で行う（同じ記事の MDX に複数の図があるため）。
- provenance（`.claude/state/figure-provenance.json`）は台帳を読んで needs を上書きする。毎周の再生成は不要で、OCR 未監査の警告が出たときに `npm run audit-figures` で作り直す。
