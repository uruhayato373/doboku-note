---
name: project_kettei2026_r8_evergreen
description: 決定2026（06-12）=ペルソナ模範論文evergreen純化・per-persona R8廃止。ただし2026-06-16にユーザー判断で部分撤回→全14ペルソナをR03-R07＋R8予想2記事(計7)に均一化。R8予想2の公開は現在は正
metadata: 
  node_type: memory
  type: project
  originSessionId: 44b905d2-d23e-4bc4-9325-9da26f0eda2d
---

総監記述式 note マガジンの **決定2026**（2026-06-12 運用反映、origin commits `c3491e629`+`749780b3c`）:

- **ペルソナ模範論文マガジン = 過去問 R03-R07 の evergreen に純化**。per-persona R8 予想章は**持たせない**（新規ペルソナ=R03-R07 の5記事のみ）。
- **R8 予想 = 横断フラッグシップ「R8予想問題集」(6テーマ) に一本化**（カノニカル）。各ペルソナの教材導線は「過去問5年分(¥2,480) ＋ 横断R8問題集(¥3,480)」と**分離表記**する。
- 2026-06-09 の「7記事化標準（過去問5＋R8予想2＝計7記事）」は**反転・退役済み**。「計7記事」「per-persona R8二記事化」表記は旧仕様。
- SoT: `docs/note/技術士総監/総監マガジン構成_決定2026.md` §3-3、運用ランブック `docs/reference/note-essay-review-checklist.md`（冒頭に決定2026バナー）。

**Why:** 2026-06-13、決定2026 の3時間前の古い merge-base から枝分かれしたセッションが、これを知らず道路担当 R08二記事化・note-magazines.ts 7記事化・doc-syncでの7記事伝播を実施＝**廃止済みコンテンツを別系統で復活**させかけた（origin が参照する `feedback_content_deprecation_cross_lineage` の再発）。develop 直 push 不可（modify/delete 競合）で発覚、PR #245 で evergreen 互換分（道路R03-R07品質・回遊A/B/C・ハブ記事）だけ salvage、逆行分は破棄した。

**【重要・2026-06-16 部分撤回】** 上記 06-12 の「evergreen のみ・R8章は持たせない」原則は、**2026-06-16 にユーザー判断で部分撤回**された（SoT: `総監マガジン構成_決定2026.md` §3-3 冒頭「方針転換（2026-06-16 追補）」）。根拠＝14ペルソナ中12が既にR8予想を同梱、未同梱はゼネコン・河川コンサルの2つだけ→「2つ剥がす」より「2つに足す」方が安い。**現在の標準＝全14ペルソナを「R03-R07 ＋ R8予想2記事＝計7記事」に均一化**。よって per-persona の R08-yosou-1/2 を公開・パック収録するのは**現在は正しい作業**（2026-06-20 に自治体道路担当 R08-yosou-1/2 を公開）。完全パックは R8 が per-persona と横断R8予想問題集で二重に入るが、不整合解消を優先する判断（横断R8予想問題集はカノニカル併存）。

**How to apply:** 総監ペルソナ模範論文を触る前に決定2026 SoT §3-3（**06-12 原則 → 06-16 部分撤回 の両方**）と note-essay-review-checklist 冒頭バナーを読む。最新は「R03-R07＋R8予想2＝計7記事」が正。着手前に `git fetch && git log HEAD..origin/develop` で古いベースでないか確認（[[feedback_session_start_git_sync]]）。関連: [[project_note_revenue_strategy_2026]] [[project_pe_hub_article_design]]
