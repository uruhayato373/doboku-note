
---

## 実装進捗（2026-07-20 セッション）

- **#418 concrete** → develop マージ済み（7 exam タグ確定）
- **P0a 完了**: config雛形4本（x/ig/coconala/brain-competitors.json）+ check-competitor-scan-due 全チャネル化。動作確認済み
- **P0b 完了**: skill/agent/09 リネーム（30ファイル機械置換・残存0）+ 07/09 軸分担明記 + registry同期。PR #419（develop向け・未マージ）
- **scout 方針の実測知見**:
  - ココナラ公開検索は curl で SSR HTML 取得可だが **Nuxt devalue 難読化でパース不可** → 既存 coconala-research.mjs（Playwright DOM）拡張が正道
  - Chrome + .local/playwright-coconala-profile / playwright-x-profile / playwright-ig-bs-profile は存在
- **残（次セッション・要ユーザーマシン）**: P1 ココナラscout / P2 Xscout(監督必須・凍結リスク) / P3 IGscout / P4 Brain probe / P5 配線+初回スキャン+分析
