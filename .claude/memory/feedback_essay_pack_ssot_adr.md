---
name: feedback_essay_pack_ssot_adr
description: 総監記述式パックの構成/価格/ロスターを触る前に ADR 総監マガジン構成_決定2026.md を必ず読む（note-magazines.ts のコメントは下位）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 5a34ab89-161b-4cb8-ab3a-744357143895
---

総監記述式パック（完全パック/コアパック）の**構成・価格・ペルソナ数の真実源は `docs/note/技術士総監/総監マガジン構成_決定2026.md`（ADR、`noteコンテンツ計画.md` M13 の上位）**。`src/lib/note-magazines.ts` のコメントや description は下位で、しばしば陳腐化している。

**Why:** 2026-06-15、ADR を読まずに note-magazines.ts の完全パック description を「14ペルソナ/¥42,660」に書き換えコミットしてしまった。実際は ADR が「2段ラダー（上段 全記事パック¥14,800＋下段 コアパック¥5,480）」と決定済で、現行¥7,980パックは上段へ育てる途中段階。「全ペルソナ＋精読が揃うまで存在しない¥14,800/拡張構成を広告しない」(§4-2) に違反したため revert した。

**How to apply:** 着手前に ADR を Read。確定事項=(1) 2段ラダー（上段¥14,800/下段¥5,480を2026-06-15に今季実行決定）、(2) ロスターは実体**14**（受注者4＋自治体10。ADR初版の17は実在しない自治体3分野含む旧値）、(3) 単品合計=上段¥44,640・下段¥7,940（精読¥1,980＋型¥1,980＋設問3¥2,480＋R8¥3,480＝コア4）、(4) 公開ゲート=note収録(残9ペルソナ＋精読)完了まで SoT/ロードマップを¥14,800表記にしない。実行手順は `docs/handoffs/2026-06-15-essay-pack-2tier-relaunch.md`。完全パック実体は `npm run verify-note-magazines` スナップショット(`.claude/state/note/magazines-snapshot.json`)で実査。関連: [[project_persona_donsen_hub]]・[[feedback_no_price_in_mdx_body]]・[[feedback_note_prepublish_verify_not_proxy]]。
