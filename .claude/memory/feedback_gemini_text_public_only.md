---
name: feedback_gemini_text_public_only
description: Gemini は公開記事だけなら使ってよいが、2026-11 の試行で採点の一次振り分けは見逃しが多く不採用。画像生成も不可
metadata:
  type: feedback
---

2026-11-02 に運営者が決めた: 文章の一次採点（評価・修正の前の振り分け）に Gemini を使ってよい。ただし送るのは公開済みのサイト記事だけで、note の有料原稿・非公開教材・市販書籍の OCR は送らない。画像の生成に Gemini を使わない決定（2026-10-09）はそのまま。

経路（2026-11-02 に用意）: 課金の無いプロジェクト `doboku-note-gemini-free` の無料枠キーを `.env.local` の GEMINI_API_KEY に置き、Interactions API（`v1beta/interactions`・`{"model","input"}`）で呼ぶ。`gemini-3.5-flash-lite`・`gemini-3.8-flash` は 200。
- 既存プロジェクト `doboku-note` は前払いの課金つきで残高 0。そこにキーを作っても 402 になる（2026-11-02 に 1 度踏んだ）
- `models/…:generateContent` は新しいモデル名で本文の無い 404、gemini-2.5 系は新規に提供終了。`gemini` CLI の個人向け無料ログインは打ち切り

試行の結果（2026-11-02・DN-0939・`npm run gemini-scoring-trial`）: 流入上位の 24 記事を Claude の評価役（guide-qa・cem-qa・civil-construction-qa の校正モード）と同じ採点基準で採点させたところ、合否の一致は 87〜88% でも、Claude が 3 未満を付けた軸（直すべき軸）を Gemini が拾えたのは 31%（3.5-flash-lite）・46%（3.8-flash）だった。採用条件（完全一致 70%・検出率 70%）を満たす軸は 0 で、**採点の一次振り分けには使わない**。一致して見えたのは両方満点の軸が多かったため。無料枠の 1 日の回数はモデルごとで、3.8-flash は 20 回。新しいモデルが出たら `select`→`run --model`→`compare --model` で測り直せる。

**Why:** 公開記事なら外に出ても困らず、Claude のトークンを採点の振り分けに使わずに済む。無料枠は送った内容が学習に使われ得る。
**How to apply:** 採点の振り分けを Gemini に任せる提案はしない（測り直してから）。Gemini を呼ぶ前に、送る本文が公開記事だけかを確かめる。キーは課金の無いプロジェクトに作る（課金つきのプロジェクトに作ると 402）。試行は DN-0939。キーの値は表示しない。関連: [[feedback_opus_sonnet_split]] [[project_model_assumptions]]
