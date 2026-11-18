---
title: Mac で行う商品の公開・出品の手順（引き継ぎ）
updated: 2026-11-18
---

# Mac で行う商品の公開・出品の手順

> [!note] 状態（2026-11-18）
> クラウドのセッションで原稿・文面・正本までを仕上げた。ここに挙げるのは、ログイン済みのブラウザが要るので運営者の Mac でしかできない作業だけ。1（管工事の予想の公開）と 2（ココナラのヘルプの確認）は 2026-11-18〜19 に終えた。3 が終わったらこの文書は削除する（残りはカード DN-1235 が持つ）。

## 0. 前提

- Mac の作業ツリーを `develop` の最新にする。
- ログインが切れていたら運営者が入り直す: `npm run auth:login -- --service note`、`npm run auth:login -- --service coconala`。

## 3. 伴走の告知を出す（2027-01-08 の合格発表の直後・DN-1235）

- 先に、翌年度の延長の渡し方をココナラの運営へ問い合わせる（文面は `content/coconala/products/coconala-civil-banso/listing-draft.md` の「運営への問い合わせ」・送信は運営者）。
- 告知の文面は `content/coconala/products/coconala-civil-banso/listing-draft.md` の末尾。ココナラのプロフィールと、サイトの 1級二次のページに出す。出品はしない（決済しない）。
- 予約の希望はココナラのメッセージで受け、件数を DN-1235 に書く。2027-02-28 に判定する。

## 4. 7 月上旬に出品する（DN-1235）

- 下書き: `content/coconala/products/coconala-civil-shuchu/listing-draft.md`（短期集中 ¥18,000）、`content/coconala/products/coconala-civil-banso/listing-draft.md`（伴走 ¥60,000）。
- `config/products.json`（channel coconala）と `config/coconala-listings.json` に登録してから、`/coconala-publish` で下書き → `--commit`。`npm run check-coconala-wiring` を通す。
