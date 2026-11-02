---
name: feedback_gemini_text_public_only
description: Gemini は文章の一次採点にだけ使ってよい（公開済みサイト記事のみ送る）。画像生成は不可。無料枠キー＋Interactions API で呼ぶ
metadata:
  type: feedback
---

2026-11-02 に運営者が決めた: 文章の一次採点（評価・修正の前の振り分け）に Gemini を使ってよい。ただし送るのは公開済みのサイト記事だけで、note の有料原稿・非公開教材・市販書籍の OCR は送らない。画像の生成に Gemini を使わない決定（2026-10-09）はそのまま。

経路（2026-11-02 に用意）: 課金の無いプロジェクト `doboku-note-gemini-free` の無料枠キーを `.env.local` の GEMINI_API_KEY に置き、Interactions API（`v1beta/interactions`・`{"model","input"}`）で呼ぶ。`gemini-3.5-flash-lite`・`gemini-3.8-flash` は 200。
- 既存プロジェクト `doboku-note` は前払いの課金つきで残高 0。そこにキーを作っても 402 になる（2026-11-02 に 1 度踏んだ）
- `models/…:generateContent` は新しいモデル名で本文の無い 404、gemini-2.5 系は新規に提供終了。`gemini` CLI の個人向け無料ログインは打ち切り

**Why:** 公開記事なら外に出ても困らず、Claude のトークンを採点の振り分けに使わずに済む。無料枠は送った内容が学習に使われ得る。
**How to apply:** Gemini を呼ぶ前に、送る本文が公開記事だけかを確かめる。キーは課金の無いプロジェクトに作る（課金つきのプロジェクトに作ると 402）。試行は DN-0939。キーの値は表示しない。関連: [[feedback_opus_sonnet_split]] [[project_model_assumptions]]
