---
name: feedback_youtube_cover_teacher_pop
description: YouTube の表紙は全資格・全改訂で先生のキャラクターの POP。図解だけの表紙は作らない。照合は「台帳どおり」と「絵柄が揃う」を分けて報告する
metadata:
  type: feedback
---

YouTube の表紙（サムネイル）は、どの資格・改訂でも先生のキャラクターの POP に揃える（2026-11-11 運営者の指示「揃える」）。図解だけの表紙は作らない。

**Why:** 2026-10-19 の 2級土木の改訂（#1123）が図解だけの表紙を `validateCoverSpec` の例外で通し、「題材選び」（ftCIz94eEgk）が図解の表紙で公開されていた。運営者が Studio のダッシュボードで気づいた。直前の表紙の照合で私は「台帳どおり＝すべて正しい」と報告し、絵柄の違いに触れなかった（台帳そのものが図解の表紙を採用していた）。

**How to apply:**
- 表紙の照合を報告するときは、「台帳と一致」と「チャンネルの意匠（先生の POP）に揃っている」を別に書く。台帳一致だけで「正しい」と言わない
- 機械の検査は `npm run check-youtube-covers`（CI・設計の character 必須と、投稿へ進んだ通常動画の表紙＝設計の採用画像）と `--live`（週次・公開中の表紙を画素で比べる。公開側 JPEG は同じ表紙でも平均差 3〜4、別の表紙は 100 超）
- 投稿済みの表紙の差し替えは `npm run registry -- replace-youtube-cover`（手元で `--stage-r2` → youtube-single-publish の `replace-cover`）。公開後の差し替えは台帳の `thumbnail.update` に残り、`pub.media.cover`（投稿入力・R12 の照合）は変えない
- 2級土木の図解版（diagram-led）の未投稿 3 本（安全・品質・土工）は、本文は図解のまま、表紙は先生の POP で出す
- 関連 [[feedback_verify_your_excuses]]
