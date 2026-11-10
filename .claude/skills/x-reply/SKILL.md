---
name: x-reply
category: social
description: >
  技術士・土木施工管理・コンクリートなど資格横断で X の返信候補を集め（Yahoo!リアルタイム検索を 120 時間分さかのぼり、X のフォロー中・おすすめ・検索を内蔵ブラウザで読む）、相手の最新の投稿を確認して下書きを作り、人が 1 件ずつ承認したものを送る（EXP-059・DN-1037）。Use when user says "返信候補", "X の返信", "次の返信". 無人では送らない。
disable-model-invocation: true
argument-hint: ""
domain: sns
---

# x-reply — X の返信を人の承認つきで送る

ルールの正本は [x-post-policy.md](../../knowledge/reference/x-post-policy.md) の §10・§11.3。上限と、資格ごとの検索語・照合語（`topics`）は `config/x-reply-trial.json`。資格を足すときは `topics` に 1 行足すだけでよい（id・label・qualifications〔qualification-registry の id〕・queries・match）。

## 手順

1. **前回の確認**: 内蔵ブラウザで X の通知と返信タブを読む。返信した相手から質問が来ていたら、答えの下書きも作って運営者に諮る（送るときは手順 8 の検査を `--check --answer`、記録を `--kind answer` にする）。ロック・機能制限・電話番号の確認が出ていたら止めて運営者に伝える。
2. **X の画面を読む**（内蔵ブラウザ・読むだけ）: `npm run x-reply-screens -- --list` の画面を上から順に読む。画面は `config/x-reply-trial.json` の `xScreens`（ホームのフォロー中・おすすめ）と、話題ごとの X の検索（最新・`xSearch`）。1 画面ごとに次を行う。
   - `navigate` で URL を開き、3 秒待つ
   - `npm run x-reply-screens -- --js <id>` が出すスクリプトを `javascript_tool` で実行する（タブの切り替え・スクロール・資格の投稿の絞り込みまでスクリプトが行う）
   - 返った JSON の文字列を `npm run x-reply-screens -- --save <id>` の標準入力に渡して保存する（`.tmp/x-outreach/x-posts/<id>-<時刻>.json`。120 時間より古いファイルは読まれない）。読んだ投稿が 0 件なら exit 1 で止まるので、ログイン切れや画面の構造の変化を確かめる

   X の検索はアカウントの表示名にも当たるので、表示名に「技術士」などがある受験者の、本文に資格の語が無い投稿（「筆記通った」など）も拾える。返信した相手からの質問は手順 1 の通知で読む（この道具では読まない）。
3. **候補を集める**: `npm run x-reply-candidates`（2 分ほどかかる）。Yahoo!リアルタイム検索を話題ごとの語で引き、続き（10 件ずつ）を 120 時間前まで古い方へたどる（1 ページ目は約 40 件で止まり、「技術士」だけで 8 時間分にしかならないため）。手順 2 の保存分とまとめ、資格（話題）に振り分けて判定する。本文に資格の語が無くても、表示名に資格の語があり本文が試験の話（`nameContextWords`）なら振り分ける。出力の検索語ごとの「何時間分」と止めた理由（読み切り・上限で打ち切り・続きの取得に失敗）、「資格ごとの件数」「どの資格にも当たらない」の数を読む。上限で打ち切りが出たら `limits.yahooMaxPages` を上げる。
4. **1 件ずつ読む**: 候補ごとに元の投稿、プロフィール、最新の投稿を内蔵ブラウザで読み、`.tmp/x-outreach/screen.json` にまとめて `x-reply-drafter` エージェントへ渡す（仕分けと下書きはエージェント、最終判断は親と運営者）。次のどれかなら見送る。
   - 結果のあとに状況が変わった（失格の判明、強い落ち込み）
   - 趣味のアカウントなど、試験の話をする場ではない
   - 講座や添削の販売を批判している
   - 講座や添削・教材・アプリ・クイズを出す側、情報発信のアカウント（「〜ナビ」「毎朝一問」など。語だけでは外れないのでプロフィールで見る）
   - 投稿の資格が `topics` のどれでもない（建築・電気の施工管理、行政書士など）

   見送った相手は `npm run x-reply-log -- --skip --user <screenName> --reason situation|offtopic|supplier|not-self|other` で記録する。次回から候補に出ない。
5. **下書き**（`x-reply-drafter` が書く）: ねぎらいを先に置く。答案は見えないので、褒めるのは投稿に書かれた行動だけ。助言は方法を尋ねている人にだけ添える。リンク・商品名・ハッシュタグは入れない。体験は `src/config/author.ts` と記事で確かめられる事実だけ書く。
6. **確認画面**: `.tmp/x-outreach/round.json` に下書きを書き、`npm run x-reply-sheet`。`preview_start` の `x-outreach` で開く。相手を評価する・指図する言い方（`config/x-reply-trial.json` の `toneWords`）を含む下書きがあると、該当の相手と語を出して exit 1 で止まる。言い換えてから作り直す。
7. **運営者の承認**: 採用された案だけを送る。画面の判断は `window.__state()` で読む。
8. **送信**: 1 件ごとに次を通す。
   - `npm run x-reply-log -- --check --user <screenName>` が OK（exit 0）
   - 元の投稿を開き直し、新しい投稿がないことを確かめる
   - 返信欄に入力し、入力された本文が承認された本文と一致することを確かめる
   - 送信し、自分の返信タブで表示を確かめる
9. **記録**: `npm run x-reply-log -- --add --user <screenName> --target <元の投稿の ID> --reply <自分の返信の ID> --kind ask|pass|fail|study|answer --topic <資格の id> --text "<送った文面>"`。`--topic` は候補の `topic`（`config/x-reply-trial.json` の `topics` の id）で、答え（`--kind answer`）は最初の返信と同じ id にする。文面は相手への @ を除いた本文で、次回の下書きが言い回しの重なりを避けるのに読む。`data/x/reply-log.json` だけをコミットする。

## 承認済みの分を時間差で送る

1. 運営者が相手と文面を 1 件ずつ承認する（1 回 5 件まで）
2. 承認された分を `.tmp/x-outreach/queue.json` に書く。形は `{ "approvedAt": <UTC>, "items": [{ "user", "targetId", "kind", "text" }] }`
3. 運営者が `/loop` で 5 分おき以上の実行を始める（間隔の下限は `config/x-reply-trial.json` の `minIntervalMinutes`）
4. 毎回、先頭の 1 件だけを手順 8・9 で送り、`queue.json` から消す
5. 次のときは送らない。新しい投稿で状況が変わった、`x-reply-log --check` が BLOCK、承認から 24 時間を超えた。止めた分は運営者に返す
6. `queue.json` が空になったら `/loop` を止める

## 毎朝の承認リスト（定期タスク）

デスクトップアプリの定期タスク `x-reply-morning-list`（毎朝 6:40 ごろ開始・本文はアプリの「定期タスク」の一覧から開く。リポジトリの外にある）が、手順 3〜6 を無人で回して承認リストを出す（2026-11-11〜・件数の上限なし）。送信はしない。

- 無人の間は X に触れない。候補は Yahoo!リアルタイム検索だけ（手順 2 の X の画面は読まない）、相手の最新の投稿も Yahoo の `ID:<screenName>` で確かめる
- 無人の間は Git 管理下のファイルを書かない。下書きは `.tmp/x-outreach/round.json`、見送りの案は `.tmp/x-outreach/pending-skips.json` に置き、`x-reply-log --skip` は承認のあとで記録する
- 運営者がその実行のセッションに「全部送って」「3 と 7 を除いて送って」と返信したら、手順 8・9 で送る（相手の最新の投稿は内蔵ブラウザで読み直す）
- Mac とアプリが起動しているときだけ動く

## 止める条件

- `x-reply-log --check` が BLOCK を返したら送らない
- X からロック・機能制限・確認の要求が出たら、その場で止めて運営者に伝える
- 相手からブロック、または不快だという反応があったら、その日の返信を止める

## 続けるかの見直し

2026-11-11 に運営者の判断で、2 週間の試行（〜11/21）から終わりを決めない運用にした（`config/x-reply-trial.json` の `trial.to` を外した。止める日を決めるときは `to` を足す）。効果は `npm run x-reply-log -- --report`（種類別・資格別）と `npm run metric-status` の `xUsers` で見る。
