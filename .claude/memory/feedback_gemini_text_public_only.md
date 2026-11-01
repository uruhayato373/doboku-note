---
name: feedback_gemini_text_public_only
description: Gemini は文章の一次採点にだけ使ってよい（公開済みサイト記事のみ送る）。画像生成は不可。手元の経路は 2026-11-02 時点で使えない
metadata:
  type: feedback
---

2026-11-02 に運営者が決めた: 文章の一次採点（評価・修正の前の振り分け）に Gemini を使ってよい。ただし送るのは公開済みのサイト記事だけで、note の有料原稿・非公開教材・市販書籍の OCR は送らない。画像の生成に Gemini を使わない決定（2026-10-09）はそのまま。

2026-11-02 時点で手元の経路はどちらも使えなかった:
- `gemini` CLI の個人向け無料ログイン（oauth-personal）は Google 側の打ち切りで UNSUPPORTED_CLIENT
- `.env.local` の GEMINI_API_KEY は前払いのプロジェクトで残高 0（402）。gemini-2.5 系は新規には提供終了（404）

**Why:** 公開記事なら外に出ても困らず、Claude のトークンを採点の振り分けに使わずに済む。無料枠は送った内容が学習に使われ得る。
**How to apply:** Gemini を呼ぶ前に、送る本文が公開記事だけかを確かめる。経路の用意（無料枠のキーか残高の追加＝課金）は運営者が決める（DN-0939）。キーの値は表示しない。関連: [[feedback_opus_sonnet_split]] [[project_model_assumptions]]
