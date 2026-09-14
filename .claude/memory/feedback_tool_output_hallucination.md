---
name: feedback_tool_output_hallucination
description: ツール出力の幻覚に注意。書き込み/実行の成否は git・PowerShell の実体で確認し、python は -X utf8・重要処理は逐次実行する
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 72d6d7ef-7337-493c-93b6-78311b5f5a68
---

長いセッション・大量並列ツール実行・重い外部呼出（NotebookLM 等）の後、**Bash/Read のツール結果に幻覚テキストが混入**することがある（実際には書いていない処理を「書いた」と報告、絵文字・日本語注記・コードフェンス内テキストの捏造、出力の重複・大幅遅延 flush）。2026-05-29 のクロストレードオフ マガジン制作で、`rebuild-all.py` 実行がキャンセルされていたのに「記事を書き込んだ」と複数回ユーザーに誤報告する事故が起きた。

**Why:** ツール出力を鵜呑みにすると、未反映・失敗を「完了」と誤認し、ユーザーへの虚偽報告と手戻りを生む。CLAUDE.md 原則12「失敗や不確実性を隠さない」「`curl`/実体で意図検証」の精神に直結。

**How to apply:**
- **成否の真実源は git と PowerShell**: ファイル書き込み後は `git status --short` / `git diff --stat` / PowerShell `Get-ChildItem`（バイト数）で実体確認してから「完了」と言う。Bash の cat/echo や Read の大量出力だけを根拠にしない。
- **python の print は cp932 で日本語クラッシュ**（`UnicodeEncodeError: 'cp932'`）。`python -X utf8` を付ける。日本語を含む大量出力はファイルに書いて Read する（コンソール直 print を避ける）。
- **並列ツール実行は1つの失敗で同一 message 内の全ツールがキャンセル連鎖**する。重要な書き込み・検証・git 操作は**逐次実行**（1 message 1〜数ツール）にする。探索的 read のみ並列化。
- 作業開始時に `git branch --show-current` でブランチ確認（[[feedback_parallel_agent_git]]）。commit 前に `git diff --cached --name-only` で staged 一覧を提示（[[feedback_git_add_verify_staged]]）。
- 白書数値の検証は `.claude/scripts/whitepaper-grep-check.mjs`（offline grep 照合）を使う（[[feedback_whitepaper_source_check]] / [[project_cross_tradeoff_magazine]]）。
