---
name: reference_note_comment_rate_limit
description: note で他人の記事へコメントすると、約 50 分で 10 件送ったところで「上限に達したため」と止まる。購入者限定の欄もある
metadata:
  node_type: memory
  type: reference
  originSessionId: 84bbbf52-9d17-4c80-b645-847064a43bb8
  modified: 2026-11-09T07:39:35.999Z
---

2026-11-09、dobokunote から他人の note 記事へコメントを 5〜6 分おきに送ったところ、10 件目（15:41〜16:33）の次で「上限に達したためご利用いただけません。しばらく時間をおいてから再度お試しください。」のトーストが出て投稿できなくなった。投稿ボタンを押しても API にコメントは増えない（`/api/v3/notes/<key>/note_comments` で dobokunote の件数を見て確かめる）。17 分後（最初の 1 件から 1 時間あまり）の 16:55 には送れ、そこから 6〜7 分おきに 7 件を続けて送っても止まらなかった。1 時間に約 10 件の枠とみられる（推測・未確認）。

2026-11-09 にコメントした相手（同じ人へ重ねないため）: ryuryuryu1126・deft_bee7273・local_kencon・easy_spirea433・kubori_sx・ibadra・gotarutaru・hironobuitabashi・clean_acacia6297・mt_pe・sane_broom3897・ripe_cosmos3147・apt_quoll6060・nagano_kensetu・saeho190・rvrvyota・pure_brg（17 人）。i_love_concrete は購入者限定の欄で送れず。

- 送る前に `/api/v3/notes/<key>` の `can_comment` を見る。`is_limited: true` の記事は購入者だけがコメントでき、欄が「購入者のコメント」になる
- 入力は textarea `placeholder="コメントする"` を focus してキー入力、送信は欄の右下の ↑ ボタン。cmd+a は欄の中を選ばない（文が二重になる）。消すときは `setSelectionRange(0, len)` のあと Delete
- 下部の固定バー（スキ・共有）のボタンを近くの送信ボタンと取り違えやすい。座標で押すときは画面で確かめる

**How to apply:** note のコメントは 1 日に数件ずつにする。上限に当たったら打ち直さず止めて、運営者に伝える。関連: [[project_x_reply_trial]] [[feedback_x_reply_peer_tone]]
