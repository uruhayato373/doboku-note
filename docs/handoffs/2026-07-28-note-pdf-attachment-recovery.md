# 引き継ぎ: note PDF 添付の復旧（202件・夜間 / 別PC）

**作成**: 2026-07-28 / **想定作業**: 別PCで夜間に3晩 / **1晩あたり**: 100件・約2〜3時間

---

## 進捗（2026-07-28夜・このMacで実施）

**202件中95件解消・残107件。** 内訳:

- 「先に片づける: PDF商品5本」（下記）は**完了**
- 本体バッチ `--limit 95 --commit` で **90件成功**
- バッチ失敗5件中4件（`na84b001e827e`・`n793523a059e5`・`ndaa4a6d2aec3`・`nf5ce8808ee55`）を個別リトライで解消。1件（`n155093f42183`）は5本セットの側で先に解消済み

全量ライブ実測（`check-note-attachments.mjs --live`）で **充足172 / 不足107** を確認済み。`.claude/state/note-attach-done.json` と `.claude/state/note-attachments-missing.json` は commit 済み（`1d44c197e6`）。

**実アップロード数は本日で約98件**（100件上限にほぼ到達）。**本日はこれ以上の新規添付を行わない。** 残107件は翌日以降、`note-attach-batch.mjs --commit`（`--limit`省略で既定100）をそのまま再実行すれば done-log から続きが進む。

> [!warning] `note-attach-batch.mjs` は既定の境界regex（`試験問題|予想問題`）しか使わない
> frontmatter に独自の `paidBoundary` を持つ記事（PDF単体商品・「直前暗記ノート」型）はバッチが境界検証NGで安全中断する（**アップロードはされるが再公開されない**ため実害なし）。バッチが `exit=8` または `exit=null` で失敗した記事は、個別に `--boundary-regex` を指定して手動リトライする:
> ```bash
> node scripts/note-attach-file.mjs --note <noteId> --file <pdf> --boundary-regex "<frontmatterのpaidBoundary>" --commit
> ```
> `exit=null`（タイムアウト等でクラッシュ）は再実行するだけでよい場合が多い（アップロード自体は完了しており「既存PDFカード=true」で再公開のみになる）。

---

## 何が起きているか

**PDF を売っている note 記事 202 本で、PDF がライブから消えている**。購入者が代金を払っても受け取れない。

全279本（ディスクに PDF がある公開記事）を著者ログインで実測した結果（取得失敗0）:

```
充足  77 件
欠落 202 件
  ├ 今日 note-update-body で全文置換した記事  179 件  ← 是正作業で消した
  └ 今日触っていない記事                        23 件  ← 元から未添付
```

内訳は建設部門 193・総監模範論文 6・1級/2級土木 3（¥1,980 の一次過去問PDF、直前暗記ノート2本）。

**原因**: `note-update-body` は本文を Ctrl+A → Delete → paste で全文置換する。note の PDF 添付カードは本文の中にあり、SoT の markdown には一行も存在しないので、置換すると消えて paste では戻らない。2026-07-28 の建設部門 送客リンク是正で 196 本を全文置換したのが直撃した（是正作業そのものが商品を壊した）。

売上ログ142件のうち**建設部門が74件**。6月の購入者は当時ダウンロードできたが、今は消えている。

---

## 今夜やること

### 実行前の3点

> [!warning] 別PCでは note のログインセッションが無い
> Playwright の永続プロファイル `.local/playwright-note-profile/` は `.gitignore` されており git に入らない（`.gitignore:75`）。**先に1回だけ手動ログインする**:
> ```bash
> npm run note-edit-session
> ```
> ヘッド付き Chrome が開くので画面で note にログインする（パスワードはスクリプトが扱わない）。以後は永続化され自動で再利用される。

> [!caution] タグ同期と同時に走らせない
> [2026-07-28-note-live-tag-sync.md](2026-07-28-note-live-tag-sync.md) の `note-sync-tags` と**同じ Playwright プロファイルを使う**ため、並行実行するとプロファイルロックで片方が落ちる。**必ず順番に**流す。先にこちら（添付復旧）を優先する —— タグは流入を増やす作業だが、添付は購入者が既に払った対価が届いていない状態なので。

1. `git pull origin develop`
2. `npm run note-edit-session`（別PC初回のみ）
3. PC がスリープしない設定にする

### コマンド

```bash
mkdir -p .tmp && node scripts/note-attach-batch.mjs --commit > .tmp/attach-night1.log 2>&1
```

既定で **100件で打ち切る**。note のファイルアップロードは **1日100件が上限**で、超えると以降が全て「ファイルカード未検出」で失敗する（2026-06-16 実証）。1晩100件×3晩で202件が終わる。

売れ筋を先に流す順序にしてある（1〜9番目が ¥1,980 一次過去問PDF・暗記ノート・総監模範論文、10番目以降が建設部門）。

事前に対象を見るだけなら `--commit` を外す。

### 翌朝の確認

```bash
grep -c "✓ 添付＋ライブ実測OK" .tmp/attach-night1.log   # 成功件数（目標 100）
tail -5 .tmp/attach-night1.log                          # 成功/失敗/残
```

**`.claude/state/note-attach-done.json` を commit すること。** これが翌晩の再開ポイントになる。1件ごとに書き出しているので、途中で落ちても同じコマンドの再実行で続きから進む。

3晩終わったら全量で確認する（約25分）:

```bash
node scripts/check-note-attachments.mjs --live
```

`.claude/state/note-attachments-missing.json` が更新されるので、これも commit する。

### 先に片づける: PDF商品5本の本文反映（添付より前）— 完了済み（2026-07-28）

PDF商品5本に「**この記事でわかること**」を追加した（購入判断材料が無く、しかも最高価格帯に欠落が集中していた）。**ソースだけ直してライブは未反映**なので、本文を反映してから添付する。

順序が重要。本文反映（全文置換）は添付を消すので、**本文 → 添付**でないと二度手間になる。うち4本は現時点で添付が生きているため、`note-update-body` の添付保護ガードが作動して中断する。ここでは**意図的に消して直後に貼り直す**ので、`--allow-attachment-loss` を付ける。

```bash
# 1) 本文反映（4本は添付を意図的に落とす → 直後に必ず 2) を実行する）
for a in "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md" \
         "docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md" \
         "docs/note/技術士一次/一次択一-過去問PDF/article.md" \
         "docs/note/技術士総監/総監択一-過去問PDF-令和/article.md" \
         "docs/note/技術士総監/総監択一-過去問PDF-平成/article.md"; do
  node scripts/note-update-body.mjs --article "$a" --allow-attachment-loss --commit
done

# 2) 添付し直し（note-attach-file はライブの添付リンク数を実測し、0 なら exit 9）
node scripts/note-attach-file.mjs --note n155093f42183 --file "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/1級土木一次択一-過去問PDF.pdf" --commit
node scripts/note-attach-file.mjs --note n4963f45bd6f8 --file "docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/2級土木一次択一-過去問PDF.pdf" --commit
node scripts/note-attach-file.mjs --note n466132e6fd74 --file "docs/note/技術士一次/一次択一-過去問PDF/技術士一次択一-過去問PDF.pdf" --commit
node scripts/note-attach-file.mjs --note nb5ebacb3e6c0 --file "docs/note/技術士総監/総監択一-過去問PDF-令和/総監択一-過去問PDF-令和.pdf" --commit
node scripts/note-attach-file.mjs --note na3ad4130a85f --file "docs/note/技術士総監/総監択一-過去問PDF-平成/総監択一-過去問PDF-平成.pdf" --commit
```

この5件もアップロード枠を消費するので、当夜のバッチは `--limit 95` で流す。

`n155093f42183` はバッチの対象リストにも入っているが、**二重添付にはならない**。`note-attach-file` は本文に `.pdf` が既にあれば再添付せず再公開のみ行う（重ねるのは `--force` を付けたときだけ）。

### 打ち切り条件

「アップロード不成立」が3連続したらバッチが自動で止まる。これは**1日100件上限に達したサイン**で、PDF 破損でもセレクタ不良でもない。翌日そのまま再実行すればよい。

---

## 再発防止（実装済み・コミット `6c82d276e` / `079b89562` / `dbaa2201b`）

添付が失われる入口は4つあり、それぞれ**その工程を実行した本人が即座に気づく位置**に置いた。横断ゲート1本では気づくのが遅いため。

| 入口 | 塞ぎ方 |
|---|---|
| ① 公開して添付を忘れる | `note-publish` が記事 dir の PDF を検出したら公開後 **exit 9「未完成」**＋添付コマンドを列挙 |
| ② 添付したつもりで入っていない | `note-attach-file` が再公開後に**ライブの添付リンク数を実測**し 0 なら exit 9 |
| ③ 本文の全文置換で消す | `note-update-body` が置換前に本文の `*.pdf` を検出したら**既定で中断**（`--allow-attachment-loss` で明示解除・解除したら再添付必須） |
| ④ すり抜けた累積ドリフト | `check-note-attachments` のソース層（pre-commit＋CI）とライブ層（ローカル） |

**ライブ層を CI に載せていないのは意図的**。有料エリアの添付カードは未ログインの HTML に出ないことを実測した（添付済み記事2本とも未ログイン取得で出現0）ので、Actions からは原理的に見えない。載っているフリはさせない。

**API では添付の有無を判定できない**。`remained_file_num` は添付数ではなく、14ファイル添付済みの記事が `0` を返す。著者ログインでページを開き `a[href*="api/v2/attachments/download"]` を数えるのが唯一の実測手段。

**CI 側（r2-audit.yml）は main で走る**ので、main へ deploy するまで週次ゲートは効かない。

真実源: [note-api-verification.md](../../.claude/knowledge/reference/note-api-verification.md)「PDF 添付は『ソース』と『ライブ』の2層」

---

## 「この記事でわかること」の本文反映（添付とは別系統・同じ夜に走る）

`check-note-intro-benefit` を新設したところ、公開691本のうち **26本**に「**この記事でわかること**」が無かった。**ソースには追加済みだがライブは未反映**。

| 対象 | 本数 | 反映のしかた |
|---|---|---|
| PDF商品（有料） | 5 | 添付を持つので上の「本文 → 添付」の順序に従う（同じ節のコマンド） |
| 無料記事 | 21 | 添付を持たないので順序の制約なし。下のコマンドをそのまま流す |
| 案内・索引（もくじ・歩き方・索引） | 9 | 対象外。回遊が目的で benefit 節を持たないのが正当なため allowlist に理由つきで登録済み |

急ぎではないので、**添付202件の復旧が終わってから**でよい。

```bash
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/1級土木で市場価値が変わる-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/ビルドジョブの評判-発注者目線-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/ホワイトな建設会社の見分け方-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/公務員土木か民間か-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/年収を上げる人の違い-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/施工管理の失敗談と教訓-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/転職した方がいい施工管理-発注者視点-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/転職のベストタイミング-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/転職エージェントの使い方-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/転職エージェント比較-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/辞める前に確認すること-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-予想問題で書く練習-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-独学添削の限界-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-落ちる答案診断-無料/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/技術士総監/magazines/総監記述式-完全パック/00-はじめに/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/技術士総監/magazines/総監記述式-設問3国家施策バンク/00-序章/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/技術士総監/トレードオフ思考/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/技術士総監/出題テーマ分析-R8地方創生検証/article.md" --commit
node scripts/note-update-body.mjs --article "docs/note/技術士総監/白書R7完全対応集/article.md" --commit
```

> [!note] メンバーシップ記事は別フロー
> `はじめに-合格ラボ` は `is_limited`（メンバーシップ）記事で、「試し読みエリアを設定 → 更新する」のサブフローに入る。`note-update-body` はこのフローに対応済みだが、失敗したら手動で確認する。

反映後の確認:

```bash
node scripts/check-note-republish.mjs    # drift が解消しているか
```

## 関連して残っている作業

- **source層が7件検出** — BK-09電力土木・BK-10鉄道の R8予想6本と1級二次まるごとパックが「印刷用PDF」を明記しているのに PDF 実体を1つも持っていない。PDF を生成するか、記述を消すか、`.claude/config/note-attachments-allow.json` に理由付きで免除するかの判断が要る（3択なので機械化できない）
- **タグ同期 668件** — [2026-07-28-note-live-tag-sync.md](2026-07-28-note-live-tag-sync.md)。添付復旧の後に流す
- **note-live-audit の疎通確認**（🔴高）— main マージ直後に `workflow_dispatch` で1回手動実行
