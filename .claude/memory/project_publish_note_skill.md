---
name: project_publish_note_skill
description: "note.com自動投稿スキル publish-note を stats47 から doboku-note へ適応移植(2026-06-10, f0e4cf87e)。browser-use CLI・Mac実行・dobokunote照合ゲート"
metadata: 
  node_type: memory
  type: project
  originSessionId: 2b549401-7f9e-4686-a8ee-d4e93b588727
---

note.com 自動投稿スキル `.claude/skills/social/publish-note/` を stats47（`uruhayato373/stats47`、公開リポジトリ）から doboku-note へ適応移植（2026-06-10, commit f0e4cf87e）。

**核心事実**:
- **ツールは browser-use CLI（Playwright ではない）**。LLM駆動ブラウザ自動化。`browser-use --headed --profile "$NOTE_PROFILE" <command>`。stats47 では `$HOME/.browser-use-env/` に導入済み
- **実行は Mac 推奨**。会社PC（Windows）はプロキシで browser-use の LLM バックエンド等を遮断する見込み＋未導入。note 投稿は Mac で（IG と同根 [[project_ig_api_posting_setup]]）
- **アカウント＝note.com/dobokunote 固定**。Phase 1 で決定論的文字列照合ゲート必須（stats47 で 2026-05-20 に別アカウント誤公開した事故の再発防止）

**リンクカードの真実**: stats47 でも完全自動化していない。本文は一括 ClipboardEvent paste（H2/太字変換できる唯一の方法）だが URL は plain text のまま貼られる。**URL→OGPカード化は半手動**（URL行クリック→行末 Enter→4秒待ち）。自動化（paste後 text node 発見→Selection API→Enter dispatch）は stats47 で未実装TODO。

**半自動の境界**: 価格設定（Shadow DOM の `<input id=price>` に JS 上書き）までは自動。**有料エリア境界の選択・特典PDF添付・リンクカード化は手動**。doboku-note も同運用。

**stats47→doboku-note 差分**（SKILL.md に差分マップ）: パス=`docs/note/技術士総監/magazines/総監模範論文-<persona>/<RXX>/article.md`、frontmatter=`notePricing`/`price`、有料境界=`## 試験問題` 直前、タグ=`hashtags.txt`、カバー=`img/cover.png`、特典=`模範論文-*.pdf`、URL記録=記事frontmatter `noteUrl` ＋ `note-magazines.ts`。

**references** は note.com 共通ノウハウとして stats47 から流用（冒頭に「差分はSKILL.md先読み」バナー付与）。`.claude/scripts/note/inject-magazine-url.cjs` も doboku-note 版に書換（persona引数・`{{MAGAZINE_URL}}`＋旧「※公開後…予定」変種対応・冪等・CRLF保持）。

**未検証**: doboku-note 規約での実走（Mac・browser-use・dobokunote ログイン）は未実施。Phase 0 ローダの実装と note.com 現行 DOM でのセレクタ確認が次段階。偽成功検証（[[feedback_publish_x_false_success]]）必須。クローンは C:\tmp\stats47-inspect（掃除済み or 残置）。
