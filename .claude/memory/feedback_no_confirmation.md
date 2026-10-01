---
name: feedback_no_confirmation
description: "「進めて」の後は確認せず一気に処理。ただし課金(Gemini)・公開取消不可の送信(ココナラ評価等)は例外で必ず事前確認/下書き止め"
metadata:
  type: feedback
---

作業の途中で「続けますか？」「次に進みますか？」等の確認を挟まない。ユーザーが「進めて」と指示したら完了するまで一気に処理し、進捗は最後にまとめて報告する。ツール実行ごとの yes が煩わしいという要望（PDF取り込み・MDX作成・sidebar更新などの長い作業で Read/Write/Edit/Bash/WebFetch/Agent の各確認が手間だった）にも同じ。

**Why:** ユーザーは何度も yes と答える手間を嫌い、確認は作業の中断でしかない。
**How to apply:** 複数ステップ作業は1つ完了ごとに確認を求めず次へ自動で進む。ツール許可設定を案内・支援し、作業計画を事前に示して一括で進める。**ただし以下は例外で確認する**（破壊的 git 操作も要確認）。

## 例外1: 課金が発生する Gemini 利用（2026-06-18）
画像生成（`imagen-*` / `gemini-*-image`）、`generativelanguage.googleapis.com` への課金リクエスト、`npm run ogp-backgrounds` / `scripts/generate-ogp-backgrounds.mjs` の本生成は、実行前に必ず「課金されます、実行していいですか」と確認する。`--dry-run`・ListModels・キー有無チェックなど無料の確認系は提示してよい。従量課金（画像1枚 ~$0.03-0.04）でユーザーがコストを自分で管理したい。機械ガード: `.claude/settings.json` の `permissions.ask` に Gemini コスト系コマンド（`npm run ogp-backgrounds` / `node scripts/generate-ogp-backgrounds.mjs` / `gemini`）を登録済み。`GEMINI_API_KEY` は `.env.local`。コスト上限は GCP Generative Language API Quota（1日上限）で別途設定推奨（予算アラートは通知のみで止まらない）。

## 例外2: 公開・取消不可の送信は下書き止め（2026-09-25）
ココナラ購入者評価・公開コメントなど公開されて取り消せない投稿は、ユーザーが「もう評価する」「送って」と言っても、まず draft-first（スクリプト既定の入力止め）で文面を見せ、明示の確認を得てから `--submit`/`--commit` する。ユーザーが文面まで指定して「送信して」と明言した場合だけ直接送る。
- **Why:** 「もう評価する」を送信指示と解釈し `coconala-rate-buyer --submit` で公開評価を即送信した直後に「下書きで止めてね」と来た。評価は取消不可で文面を見せる機会を失った。「確認せず一気に処理」は取消可能な作業の話で、公開・取消不可の送信には適用しない。
