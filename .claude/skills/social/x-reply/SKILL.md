---
name: x-reply
description: >
  X の返信候補を集め、相手の最新の投稿を確認して下書きを作り、人が 1 件ずつ承認したものを送る（EXP-059・DN-1037）。Use when user says "返信候補", "X の返信", "次の返信". 無人では送らない。
disable-model-invocation: true
argument-hint: ""
domain: sns
---

# x-reply — X の返信を人の承認つきで送る

ルールの正本は [x-post-policy.md](../../../knowledge/reference/x-post-policy.md) の §10・§11.3。上限と検索語は `config/x-reply-trial.json`。

## 手順

1. **前回の確認**: 内蔵ブラウザで X の通知と返信タブを読む。ロック・機能制限・電話番号の確認が出ていたら止めて運営者に伝える。
2. **候補を集める**: `npm run x-reply-candidates`。Yahoo!リアルタイム検索を読むだけで、X のアカウントを使わない。
3. **1 件ずつ読む**: 候補ごとに元の投稿、プロフィール、最新の投稿を読む（Yahoo の `ID:<screenName>` で読める）。次のどれかなら見送る。
   - 結果のあとに状況が変わった（失格の判明、強い落ち込み）
   - 趣味のアカウントなど、試験の話をする場ではない
   - 講座や添削の販売を批判している
   - 講座や添削を売る側
4. **下書き**: ねぎらいを先に置く。答案は見えないので、褒めるのは投稿に書かれた行動だけ。助言は方法を尋ねている人にだけ添える。リンク・商品名・ハッシュタグは入れない。体験は `src/config/author.ts` と記事で確かめられる事実だけ書く。
5. **確認画面**: `.tmp/x-outreach/round.json` に下書きを書き、`npm run x-reply-sheet`。`preview_start` の `x-outreach` で開く。
6. **運営者の承認**: 採用された案だけを送る。画面の判断は `window.__state()` で読む。
7. **送信**: 1 件ごとに次を通す。
   - `npm run x-reply-log -- --check --user <screenName>` が OK（exit 0）
   - 元の投稿を開き直し、新しい投稿がないことを確かめる
   - 返信欄に入力し、入力された本文が承認された本文と一致することを確かめる
   - 送信し、自分の返信タブで表示を確かめる
8. **記録**: `npm run x-reply-log -- --add --user <screenName> --target <元の投稿の ID> --reply <自分の返信の ID> --kind ask|pass|fail`。`data/x/reply-log.json` だけをコミットする。

## 止める条件

- `x-reply-log --check` が BLOCK を返したら送らない
- X からロック・機能制限・確認の要求が出たら、その場で止めて運営者に伝える
- 相手からブロック、または不快だという反応があったら、その日の返信を止める

## 試行の判定

`config/x-reply-trial.json` の期間が終わったら、`npm run x-reply-log -- --report` と `npm run metric-status` の `xUsers` を見て、EXP-059 を続けるかやめるかを決める。
