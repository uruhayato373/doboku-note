# 引き継ぎ: note PDF 添付の復旧（202件・夜間 / 別PC）

**作成**: 2026-07-28 / **想定作業**: 別PCで夜間に3晩 / **1晩あたり**: 100件・約2〜3時間

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

## 関連して残っている作業

- **source層が7件検出** — BK-09電力土木・BK-10鉄道の R8予想6本と1級二次まるごとパックが「印刷用PDF」を明記しているのに PDF 実体を1つも持っていない。PDF を生成するか、記述を消すか、`.claude/config/note-attachments-allow.json` に理由付きで免除するかの判断が要る（3択なので機械化できない）
- **タグ同期 668件** — [2026-07-28-note-live-tag-sync.md](2026-07-28-note-live-tag-sync.md)。添付復旧の後に流す
- **note-live-audit の疎通確認**（🔴高）— main マージ直後に `workflow_dispatch` で1回手動実行
