---
name: note-card-doboku-note-blocked
description: noteのリンクカード化=note内部URLもtype可・外部URLも可(jctc.jp実証)。だがdoboku-note.comだけ全URL/全手段でカード化失敗(全記事0個)。OGP/画像/UAは健全→最有力仮説=noteクローラがCloudflareボット保護に弾かれOGP取得失敗(未確定・要Cloudflare確認)。直れば全リンクcard化+X/FB改善
metadata: 
  node_type: memory
  type: reference
  originSessionId: a3435774-4031-47cb-8944-40716f17b618
---

note のリンクカード(figure 埋め込み)化（2026-06-30 実機検証で確定）:

- **note.com 内部URL** = 編集画面(`notes/<id>/edit`)でも type で figure +1。`note-append-cta` の CTA カードはこれ。**browser-use のカード成功もこれ**（note内部）。
- **外部URL一般 = note はカード化する**。実証＝外部 `www.jctc.jp` を編集画面 type で figure +1。→ 「note は外部をカードにしない」「編集/typeでは不可」は**いずれも誤り**（一度そう断定したが撤回）。
- **doboku-note.com だけカード化失敗**: type/実クリップボード Cmd+V/初見クエリ付きURL どれでも +0、全公開記事のライブ本文でも doboku-note の figure カードは **0個**。これは note の限界ではなく **doboku-note 固有の不具合**。

**切り分け済み（原因ではない）**: クローラUA遮断❌（facebookexternalhit/Twitterbot 等 全ボットUAに 200+og:title+og:image）・og:image到達不可❌（R2 の ogp.png も 200/image/png/80KB、homepage の og-default.png も 200）・URLキャッシュ❌（note 初見のクエリ付きURLも +0）。

**最有力仮説（未確定・要 Cloudflare 確認・断定しない）**: note のカードクローラ（データセンターIP）が doboku-note の **Cloudflare ボット保護（Bot Fight Mode / Super Bot Fight 等）に弾かれ OGP HTML を取得できない**。residential IP の curl は素通りで 200 が返るため気づきにくい。doboku-note は Cloudflare Pages、jctc は Apache（緩い）で挙動差と整合。[[measurement-incidents]] に過去の Cloudflare Bot 事故あり。

**次の一手**: Cloudflare ダッシュボードで Bot 保護がソーシャルクローラ（note/facebookexternalhit/Twitterbot 等）をチャレンジしていないか確認→必要なら許可。**直れば全 doboku-note リンクが note でカード化＋X/Facebook の OGP カードも改善する高価値案件**。

**ツール**: `npm run audit-note-cards`（read-only）。未カード単独URL段落を INT-fixable(note内部)/DN-blocked(doboku-note・Cloudflare疑い)/EXT-fixable(他外部) に分類。2026-06-30=80本中38本に未カード52件（doboku-note 47=DN-blocked / note内部 5=INT-fixable・ただし全て有料記事で paywall 安全フロー必須）。真実源 doc=`.claude/skills/social/publish-note/references/update-mode.md`。関連 [[note-revenue-strategy-2026]]。
