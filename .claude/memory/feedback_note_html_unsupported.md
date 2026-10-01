---
name: note-html-unsupported
description: note.com は HTML 完全非対応（折りたたみ・テーブル拡張・カラム等不可）。クイズ・1 問 1 答系は SNS で展開する
type: feedback
originSessionId: ff31ba36-e9f0-4350-8883-c122b9d08206
---
note.com は markdown のサブセットしか受け付けず、**HTML タグ一切非対応**:
- `<details>` `<summary>` の折りたたみ → タグそのまま表示 or 中身常時展開
- `<table>` 拡張 → 機能せず
- `<div>` `<span>` `<style>` → 全て不可
- カラム・タブ・アコーディオン等の構造化 UI → 不可

**Why:** 1 問 1 答チェックリスト系のように「問題を見せて、答えは隠す → ユーザー操作で答え合わせ」という interactive な体験は note 上で成立しない。04 ドラフト（1問1答 20 問）でこの罠に嵌り、`<details>` 20 個実装したが note 投稿時に機能破綻が確定したため、SNS 媒体（X / Instagram Carousel / YouTube Shorts）へ全面移行した（2026-04-29）。

**How to apply:**
- note 記事を企画する時点で「読者操作で要素を切り替える」「答えを隠す」「動画埋め込み」等が必要なら、**note ではなく SNS / サイト本体（Next.js）を選ぶ**
- 1 問 1 答 / クイズ / 診断系コンテンツ → SNS（特に Instagram Carousel が「Q → スワイプで A」と相性◎、YouTube Shorts も「3 秒考えて → 答え」フォーマットで自然）
- インタラクティブな診断・検索・フィルタ → サイト本体（doboku-note の Next.js コンポーネント）
- note は「腰を据えて読む長文」「ストーリー」「テンプレート提供」「合格体験」に特化
- 関連: `docs/sns-drafts/` ディレクトリで SNS 用 draft を保管（README に媒体別ファイル仕様）
