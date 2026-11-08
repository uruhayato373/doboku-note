---
name: x-reply
description: >
  技術士・土木施工管理・コンクリートなど資格横断で X の返信候補を集め（Yahoo!リアルタイム検索と X のタイムライン・検索）、相手の最新の投稿を確認して下書きを作り、人が 1 件ずつ承認したものを送る（EXP-059・DN-1037）。Use when user says "返信候補", "X の返信", "次の返信". 無人では送らない。
disable-model-invocation: true
argument-hint: ""
domain: sns
---

# x-reply — X の返信を人の承認つきで送る

ルールの正本は [x-post-policy.md](../../../knowledge/reference/x-post-policy.md) の §10・§11.3。上限と、資格ごとの検索語・照合語（`topics`）は `config/x-reply-trial.json`。資格を足すときは `topics` に 1 行足すだけでよい（id・label・qualifications〔qualification-registry の id〕・queries・match）。

## 手順

1. **前回の確認**: 内蔵ブラウザで X の通知と返信タブを読む。返信した相手から質問が来ていたら、答えの下書きも作って運営者に諮る（送るときは手順 8 の検査を `--check --answer`、記録を `--kind answer` にする）。ロック・機能制限・電話番号の確認が出ていたら止めて運営者に伝える。
2. **X のタイムラインと検索を読む**（内蔵ブラウザ・読むだけ）: 次の画面を開き、2〜3 回スクロールしてから [references/extract-x-posts.js](references/extract-x-posts.js) を `javascript_tool` で実行し、返った配列を `.tmp/x-outreach/x-posts/<画面>.json` に保存する（120 時間より古いファイルは読まれない）。
   - ホームの「フォロー中」（`https://x.com/home` で「フォロー中」タブ）
   - 話題ごとの検索の「最新」（`https://x.com/search?q=<topics の queries の 1 語目>&f=live`）。少なくとも資格ごとに 1 画面
   - 通知（返信した相手からの質問を拾う。手順 1）
3. **候補を集める**: `npm run x-reply-candidates`。Yahoo!リアルタイム検索（話題ごとの検索語）と手順 2 の保存分をまとめ、資格（話題）に振り分けて判定する。出力の「資格ごとの件数」と「どの資格にも当たらない」の数を読む。
4. **1 件ずつ読む**: 候補ごとに元の投稿、プロフィール、最新の投稿を内蔵ブラウザで読み、`.tmp/x-outreach/screen.json` にまとめて `x-reply-drafter` エージェントへ渡す（仕分けと下書きはエージェント、最終判断は親と運営者）。次のどれかなら見送る。
   - 結果のあとに状況が変わった（失格の判明、強い落ち込み）
   - 趣味のアカウントなど、試験の話をする場ではない
   - 講座や添削の販売を批判している
   - 講座や添削・教材・アプリ・クイズを出す側、情報発信のアカウント（「〜ナビ」「毎朝一問」など。語だけでは外れないのでプロフィールで見る）
   - 投稿の資格が `topics` のどれでもない（建築・電気の施工管理、行政書士など）

   見送った相手は `npm run x-reply-log -- --skip --user <screenName> --reason situation|offtopic|supplier|not-self|other` で記録する。次回から候補に出ない。
5. **下書き**（`x-reply-drafter` が書く）: ねぎらいを先に置く。答案は見えないので、褒めるのは投稿に書かれた行動だけ。助言は方法を尋ねている人にだけ添える。リンク・商品名・ハッシュタグは入れない。体験は `src/config/author.ts` と記事で確かめられる事実だけ書く。
6. **確認画面**: `.tmp/x-outreach/round.json` に下書きを書き、`npm run x-reply-sheet`。`preview_start` の `x-outreach` で開く。
7. **運営者の承認**: 採用された案だけを送る。画面の判断は `window.__state()` で読む。
8. **送信**: 1 件ごとに次を通す。
   - `npm run x-reply-log -- --check --user <screenName>` が OK（exit 0）
   - 元の投稿を開き直し、新しい投稿がないことを確かめる
   - 返信欄に入力し、入力された本文が承認された本文と一致することを確かめる
   - 送信し、自分の返信タブで表示を確かめる
9. **記録**: `npm run x-reply-log -- --add --user <screenName> --target <元の投稿の ID> --reply <自分の返信の ID> --kind ask|pass|fail|study|answer --text "<送った文面>"`。文面は相手への @ を除いた本文で、次回の下書きが言い回しの重なりを避けるのに読む。`data/x/reply-log.json` だけをコミットする。

## 承認済みの分を時間差で送る

1. 運営者が相手と文面を 1 件ずつ承認する（1 回 5 件まで）
2. 承認された分を `.tmp/x-outreach/queue.json` に書く。形は `{ "approvedAt": <UTC>, "items": [{ "user", "targetId", "kind", "text" }] }`
3. 運営者が `/loop` で 5 分おき以上の実行を始める（間隔の下限は `config/x-reply-trial.json` の `minIntervalMinutes`）
4. 毎回、先頭の 1 件だけを手順 8・9 で送り、`queue.json` から消す
5. 次のときは送らない。新しい投稿で状況が変わった、`x-reply-log --check` が BLOCK、承認から 24 時間を超えた。止めた分は運営者に返す
6. `queue.json` が空になったら `/loop` を止める

## 止める条件

- `x-reply-log --check` が BLOCK を返したら送らない
- X からロック・機能制限・確認の要求が出たら、その場で止めて運営者に伝える
- 相手からブロック、または不快だという反応があったら、その日の返信を止める

## 試行の判定

`config/x-reply-trial.json` の期間が終わったら、`npm run x-reply-log -- --report` と `npm run metric-status` の `xUsers` を見て、EXP-059 を続けるかやめるかを決める。
