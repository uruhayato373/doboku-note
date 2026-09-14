---
name: Issue #29 内部リンク拡充 進捗
description: GSC ex0（検出-未登録）623件の pe キーワードページに RelatedKeywords を入れるタスク。Phase 1 + サンプル10件完了、次は Phase 2 の604ページ本番バッチ
type: project
originSessionId: 98d1f610-bd9f-4b26-80e6-a45965be9e4a
---
Issue #29「内部リンク拡充 Round 1」の進捗（2026-04-21 完了時点）:

- **Phase 1 完了** (commit f89bc116): `build-keyword-relations.mjs` / `insert-keyword-relations.mjs` 実装、サンプル 10 件に挿入。
- **Phase 2 完了** (commit 67cb3807): 580 ページに本番バッチ挿入完了。59 件は既存 RelatedKeywords 尊重でスキップ。計 639 ページで `<RelatedKeywords>` 設置済み。
- **次アクション = Phase 4（GSC 再測定）**: デプロイ後 2 週間待って Issue #28 の GSC 週次測定で ex0 減少を観察。
- **Phase 2.5 完了** (commit 8d84ce2c): 10 orphan のうち 9 件を pe-chapters.json に登録 → 再生成 → 8 件に RelatedKeywords 挿入（four-m-of-production は既存尊重でスキップ）。orphan 残存は general-overview のみ（chapter 1 未定義のため defer）。keyword-relations カバレッジ 639→648。
- **Phase 3**: civil-textbook / guide への適用（pe-chapters 相当のマスタが civil にないため別設計必要）。

**Why**: GSC Issue #28 の ex0（670 URL）のうち 623 件が pe キーワードページ。内部リンク密度不足がクロール優先度を下げている直接原因と特定された。キーワードは存在するが `<RelatedKeywords>` コンポーネントが未設置のため。

**How to apply**: Issue #29 の続き（Phase 2 以降）を再開するときは、`.claude/skills/content/exam-backlinks/SKILL.md` の "keyword-relations" セクションに全手順と引数を記載済み。`npm run insert-keyword-relations -- --slugs=<csv> --dry-run` で任意範囲のリハーサル可能。

**既知の制約**:
- pe-chapters.json 未登録の orphan slug 10 件（pdca-cycle 他）は relations 出力対象外。Phase 2 バッチで自動挿入されないため、pe-chapters.json の整備が別途必要。
- section 6.2（地域環境問題）は「ハザードマップ・グリーンインフラ・大気汚染防止法・ALPS処理水」など意味的に異質なキーワードを同一セクションに束ねており、自動生成される関連リンクに弱いものが混ざる（構造上の制約）。重み調整ではなく pe-chapters.json の section 再編で改善可能。
