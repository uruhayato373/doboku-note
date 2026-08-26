# content/brain

Brain（brain-market.com）で販売する Claude Code キット商品の**販売投入本文・販売画像・配布物**の SSOT。

- 価格・status・URL は `src/lib/brain-products.ts` が真実源（ここには置かない）。
- 公開操作は `/brain-publish`（`scripts/brain-publish.mjs`）、配線検査は `npm run check-brain-wiring`。
- `dist/` の R2 object key は `brain/dist/{filename}` のまま不変（ローカルの置き場所が変わっても動かない）。
- secret・アカウント情報・token を置かない（`.claude/config/brain-account.json` はここへ移さない）。

運用・スキーマ・安全弁の全体像は [.claude/knowledge/reference/brain-operations.md](../../.claude/knowledge/reference/brain-operations.md) を参照。
