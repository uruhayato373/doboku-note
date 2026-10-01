---
name: new-tool-doc-wiring
description: 新スクリプト/ツール/経路を足したら discoverability 配線＋コミット前 /doc-sync。機械ゲートは意味ドリフトを拾えない（2026-06-25）
metadata: 
  node_type: memory
  type: feedback
  originSessionId: ffdcbfc9-a4ad-4cf0-9af2-f7f9d83d62a7
---

新しいスクリプト・ツール・処理経路を追加したら、**①既存 skill/policy doc から参照を張って discoverability を確保**し、**②コミット前に `/doc-sync` を1回回す**。

**Why:** 機械ゲート（`check-doc-refs`＝壊れた参照 / `check-doc-coupling`＝台帳もれ）は「パスが実在するか」「skill/agent 台帳が同期しているか」しか見ず、**「既存の案内が別ツールを指したまま陳腐化した」という意味ドリフトは構造的に拾えない**。これは `/doc-sync`（[[reference_doc_sync_system]] の意味層 = doc-sync-auditor）専用の守備範囲。2026-06-24 に figure→reel 経路 `scripts/figure-reel-create.mjs` を新設したのに、`ig-figure-pack` SKILL.md は「Reels動画化→`ig-reel-create`」のまま（`ig-reel-create` は過去問 quiz 専用で figure 不可）＝誤案内が残存。さらに新スクリプトがどの doc からも参照されず**発見不能**で、次セッションが同じ調査をやり直す羽目になる。機械ゲートは全部 緑だった。

**How to apply:**
- `scripts/**` `.claude/skills/**` `src/**` 等「ドキュメント化された面」を変更/追加したコミットの**前に `/doc-sync`**（CLAUDE.md §8 の規律。機械ゲートが緑でも省略しない）。
- 新スクリプト/ツールは、最も近い既存 skill SKILL.md か reference policy から**1行参照を張る**（例: ig-figure-pack SKILL.md「担当外」＋ ig-reels-policy.md に figure-reel-create を明記）。「自分は知っている」で済ませず、cold で見つかる状態にする。
- 似た既存ツールがあるなら、新旧の**棲み分けを明記**（figure=figure-reel-create / 過去問=ig-reel-create のように、どちらを使うか迷わせない）。
- 「`/doc-sync` を回したか」自体は機械ゲート化が難しく**運用規律依存**＝チェックリスト化して毎回踏む。
