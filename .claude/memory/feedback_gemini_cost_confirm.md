---
name: gemini-cost-confirm
description: Gemini/Google画像生成API等の課金が発生するGemini利用は実行前に必ずユーザー確認を取る（2026-06-18）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 0bd2a327-f8c5-4b1a-9c7b-7802c3d639aa
---

Gemini（Google）の**課金が発生する利用**は、実行前に**必ずユーザーに確認**してから叩く。対象＝画像生成（`imagen-*` / `gemini-*-image`）、`generativelanguage.googleapis.com` への課金リクエスト、`npm run ogp-backgrounds` / `scripts/generate-ogp-backgrounds.mjs` の本生成など。`--dry-run`・ListModels・キー有無チェックなど**無料の確認系**は提示してよいが、課金が発生する生成は勝手に実行しない。

**Why:** 従量課金（画像1枚 ~$0.03-0.04）で、黙って回すと費用が積み上がる。ユーザーがコストを自分で管理・把握したい。
**How to apply:** 課金コマンドの前に「これは課金されます、実行していいですか」と一言確認してから実行。機械ガードとして `.claude/settings.json` の `permissions.ask` に Gemini コスト系コマンド（`npm run ogp-backgrounds` / `node scripts/generate-ogp-backgrounds.mjs` / `gemini`）を登録済み＝ハーネスが実行前に確認プロンプトを出す。`GEMINI_API_KEY` は `.env.local`。コスト上限は GCP の Generative Language API Quota（1日上限）で別途設定推奨（予算アラートは通知のみで止まらない）。[[no-confirmation]]（「進めて」後は確認省略）の**例外**＝課金は常に確認。
