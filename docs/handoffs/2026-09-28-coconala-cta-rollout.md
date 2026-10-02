# 引き継ぎ: note → ココナラ導線の公開反映（1級残り・2級）と関連カード（2026-09-28）

## 目的と正本

1級・2級土木の有料答案の冒頭（最初の見出しの直前・無料部分）に、ココナラの「添削」と「骨子」への導線を2段で置く（DN-0268）。正本は原稿の article.md で、マーカーは `<!-- cta:coconala-custom -->`。原稿は1級139本・2級69本とも反映済み（develop）。公開記事への反映が残り。

| 級 | 添削 | 骨子 | 1段目の文 |
|---|---|---|---|
| 1級 | services/4317375 | services/4317796 | 答案: 「この答案をあなたの工事に合わせて仕上げたいときは、…」／解説記事: 「自分の工事で答案を仕上げたいときは、…」 |
| 2級 | services/4418775 | services/4418781 | 答案: 1級の答案と同じ文 |

2段目の文は共通: 「まだ答案が無い人は、ヒアリングから骨子（構成）をつくるこちらへ。」。文面は原稿からそのまま取る（原稿が正本）。

## 残りの確かめ方（2026-09-29 から）

残りの一覧は書き写さない。管理画面のコンテンツ台帳で **状態「導線ずれ」** に絞ると、原稿に導線があるのに note の公開記事に出ていない・順番違い・見出しの後ろにある記事だけが出る（`/content/ledger?c=note&s=cta`。資格は右の絞り込みで選ぶ）。照合は公開 API の本文で行う（`npm run content-ledger`。導線を入れた直後は `--refresh-cta` で照合し直す）。

2026-09-29 の照合で、ココナラ導線のずれは次のとおり（この引き継ぎ書の旧記載より多い）:

| 対象 | 本数 | 内容 |
|---|---|---|
| 1級 有料答案 | 19 | 2テーマ組合せ大全10・完成答案集5・過去問4。原稿に noteStatus が無く、前回の一括反映の対象（noteStatus: published）から漏れた。公開中で導線なし |
| 1級 無料の解説 | 7 | 出ていない4・逆順2（n8b0e42784742・n34c1c35423f1＝古い文面）・見出しの後ろ1（na1f84193571a） |
| 2級 有料答案 | 69 | 旧記載の61本＋noteStatus の無い8本（完成答案集3・過去問5）。全部公開中で導線なし |
| コンクリート主任技士 小論文 | 37 | DN-0360 の照合対象（週次の同期で本文ごと反映される想定） |

注意: 解説記事は差し込むたびにパックのカード直後へ入るので、**骨子 → 添削 の順に入れる**（表示が 添削→骨子 になる）。古い文面・逆順の記事は `note-update-partial` の removeBlock で消してから入れる（spec は下）。

反映し終えて「導線ずれ」が 0 になったら DN-0268 のカードを削除する。

## 手順（コマンド）

```bash
# 1本に1段入れる（冪等。既にあれば skip）。有料は --keep-boundary、無料は付けない
node scripts/note-append-cta.mjs --note <noteId> --before-first-h2 --keep-boundary --text "<文>" --url <ココナラURL> --commit
# 確認（公開 API）。添削の位置 < 骨子の位置 なら OK
curl -s --ssl-no-revoke https://note.com/api/v3/notes/<noteId>
```

一括は、対象を索引（`.claude/state/content-ledger.json` の `ctaLive.byId["coconala-custom"].state` が ok 以外の記事）から集めて（noteStatus で集めると公開中の27本が漏れる）、上の2コマンドを1本ずつ順に回し、公開 API で 20 秒おきに最大3回確かめる小さなスクリプトで回した（`.tmp/run-coconala-cta.mjs`。この PC にしか無いので作り直す）。3本連続で失敗したら止める。

解説記事の古い導線を消す spec（`node scripts/note-update-partial.mjs --spec <file> [--commit]`。まず --commit 無しで件数確認）:

```json
{"article":"<article.md のパス>","operations":[
 {"type":"removeBlock","needle":"この答案をあなたの工事に合わせて仕上げたいときは"},
 {"type":"removeBlock","needle":"まだ答案が無い人は、ヒアリングから骨子"},
 {"type":"removeBlock","needle":"services/4317375","expected":2},
 {"type":"removeBlock","needle":"services/4317796","expected":2}]}
```

## 罠（今日踏んだもの）

- **「更新完了」でも公開されていないことがある**: 前回の実行で骨子が下書きにだけ入り、次の実行が「既にある」で skip して終わる。公開 API で骨子が無ければ `--save-only --keep-boundary --text x --url <骨子URL> --commit` で下書きを公開する（4本これで直った）
- 公開 API への反映は数十秒遅れることがある。1回の確認で失敗と決めない
- リンクカードの後ろの空段落は note が保存時に自動で足す。消しても戻る（運営者判断で今のまま）
- ページ読み込みが遅いと「account != dobokunote」で止まる。ログイン切れではない（`node scripts/playwright-auth.mjs status --service note` で確認）

## 関連カード・PR（同日）

- PR #693（CI からの X 投稿を止める・X の CI 扱いのカードの削除込み）: CI 待ちで未マージ。定期実行に効くのは main へ deploy 後
- DN-0272: 修正はマージ済み（#689）。完了条件の「冒頭 CTA を差し替える部分更新を1本実行し、見出しが h2 のまま・60字超0」を確かめたら削除
- 会員 W11（n64f9653dc30c）の特典マガジン mbe07bd5cecda への収録: 完了（2026-10-02 に API で収録 11 件を確認）
- DN-0271: 総監 施策バンク序章（n3eb135ebdff7）の公開記事に「この記事でわかること」が未反映
- DN-0234: 30日超の Codex セッション 194MB は削除済み。残り1.3GB は全部8〜30日前。保持期間を短くするか今の状態で完了とするかはオーナー判断待ち
- DN-0362: オーナー作業（各PCで `cmdkey` / `security` による note・ココナラの ID/PW 登録、`npm run auth-refresh:install`）と、週次レビューへのログイン健康診断欄が残り
