---
title: Mac で行う商品の公開・出品の手順（引き継ぎ）
updated: 2026-11-18
---

# Mac で行う商品の公開・出品の手順

> [!note] 状態（2026-11-18）
> クラウドのセッションで原稿・文面・正本までを仕上げた。ここに挙げるのは、ログイン済みのブラウザが要るので運営者の Mac でしかできない作業だけ。1〜3 が終わったらこの文書は削除する（残りはカード DN-1235 が持つ）。

## 0. 前提

- PR #1648（`claude/keen-euler-0bxygy` → `develop`）を取り込み、Mac の作業ツリーを `develop` の最新にする。
- ログインが切れていたら運営者が入り直す: `npm run auth:login -- --service note`、`npm run auth:login -- --service coconala`。

## 1. 管工事の予想を note で公開する（期日 2026-12-05・DN-1236）

1. `content/note/管工事/R8予想-1級第二次/構成案.md` の「公開前の確認点」（8 点）を運営者が判断し、Mac のセッションに `article.md` へ反映させる。
2. 価格を決める。下書きは ¥2,480。既存の機器別バンク（¥1,980）と束ねるかもここで決める。
3. 下書きで確かめる: `node scripts/note-publish.mjs --article content/note/管工事/R8予想-1級第二次/article.md`
4. 公開する: 同じコマンドに `--commit`。公開後に `npm run verify-note-status` で実在を確かめる。
5. 正本を公開に切り替える: `npm run product -- set pipe-work-1-r8-yosou`（published と noteUrl）→ `npm run product -- gen`。サイトの管工事ガイドの CTA は `src/lib/magazine-placement.ts` が公開済みのときだけ予想を上に出す（配線は済み）。
6. `/deploy` で本番へ出し、管工事ガイドに予想の CTA が出ることを確かめる。

## 2. ココナラのヘルプ本文を読む（2027-01-07 まで・DN-1235）

クラウドからは help.coconala.com が読めなかった（403）。Mac のブラウザで次を読み、`docs/strategy/22_チャネル別商品設計2026-11.md` §5 の「未確認」を確定する。

| 確かめること | ヘルプ |
|---|---|
| トークルームの 120 日の上限・お届け日の上限 | https://help.coconala.com/hc/ja/articles/218723567 |
| 定期購入（継続購入）が添削で使えるか | https://help.coconala.com/hc/ja/articles/38381677475737 |
| サイト外での連絡の禁止の範囲 | https://help.coconala.com/hc/ja/articles/218179168 |
| 学習支援のカテゴリで ¥59,800・¥18,000 を設定できるか | 出品画面で価格欄を確かめる（保存しない） |

翌年度の延長の渡し方が分からなければ、ココナラの運営へ問い合わせる。

## 3. 伴走の告知を出す（2027-01-08 の合格発表の直後・DN-1235）

- 告知の文面は `content/coconala/products/coconala-civil-banso/listing-draft.md` の末尾。ココナラのプロフィールと、サイトの 1級二次のページに出す。出品はしない（決済しない）。
- 予約の希望はココナラのメッセージで受け、件数を DN-1235 に書く。2027-02-28 に判定する。

## 4. 7 月上旬に出品する（DN-1235）

- 下書き: `content/coconala/products/coconala-civil-shuchu/listing-draft.md`（短期集中 ¥18,000）、`content/coconala/products/coconala-civil-banso/listing-draft.md`（伴走 ¥59,800）。
- `config/products.json`（channel coconala）と `config/coconala-listings.json` に登録してから、`/coconala-publish` で下書き → `--commit`。`npm run check-coconala-wiring` を通す。
