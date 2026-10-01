---
name: reference_civil_site_cta_architecture
description: 1級2級土木サイト(/docs)の有料マガジン/会員CTA配線アーキテクチャ。magazine-placement.ts一元管理・末尾画像カード＋二次系は冒頭MagazineTopBanner
metadata:
  node_type: memory
  type: reference
  originSessionId: 007dd616-fdf1-4d4b-ba54-ea6e058032e8
  modified: 2026-07-23T06:23:23.423Z
---

doboku-note サイト（/docs 記事ページ）の note 有料マガジン/メンバーシップ CTA 配線。**手書きCTAは無くソースの `src/lib/magazine-placement.ts` `resolvePlacement(slug, docGroup)` が全て決める**（2026-07-04 監査確認）。

**外部チャネル（ココナラ。Brainは2026-09-26撤退）の記事内 CTA は別 SoT `src/lib/offsite-cta.ts`（2026-07-23 新設）**＝note の magazine-placement.ts と直交。`resolveOffsiteCta(slug)` が高適合ページにのみ listed 商品を返し、`ArticleFooter` が note もくじ直後に `OffsiteCta` で描画。RULES 対応（1級/2級は slug prefix で PDF 出し分け・1ページ最大3枚）: 経験記述→診断+添削+Brain経験キット／二次年度別過去問(r0X)→kakomon+gakka PDF／学科分野別(1級)→gakka PDF／入門・直前(getting-started・last-minute)→moshi+bunseki PDF／総監essay・二次→sokan-bunseki PDF+Brain施策バンク。sakusei/kanseitoan/civil-keiken-kit は /links のみ（意図的・クロップ回避）。listed のみ発火・UTM 非付与・クリックは `data-cta="coconala"|"brain"`（AnalyticsProvider 登録済み）。真実源: coconala-operations.md §2.1（対応表）／brain-operations.md §4。

**描画位置は2種**:
1. **記事末尾（画像カード）**＝`inline`+`sidebar` を統合した `footerMagazines`（page.tsx）→ `SidebarMagazineList`（`sidebarImageUrl` を持つマガジンのみ・300×250）。2026-06-26 に全CTAを末尾画像に統一・**サイドバーからnote CTAは削除**（最上部は転職アフィリ枠）。
2. **記事冒頭（1行テキスト）**＝`ResolvedPlacement.top`（2026-07-04 新設）→ `MagazineTopBanner`（badge+shortTitle+price+矢印）。ArticleHeader と prose の間に描画。**二次系(secondary)＋直前対策guideの高intentページのみ** top を設定。末尾画像と重複可（形が違う）。

**civil guide の出し分け**（bare slug＝`civil-construction-{1,2}-`剥ぎで判定）:
- `CIVIL_EXAM_PREP_GUIDES` セット該当（試験系「重要ポイント」等）→ 会員lead+完成答案+旗艦。**このセットに漏れると guide は CTAゼロ**（2026-07-04 に施工計画/基礎工/安全管理/測量/建設機械/環境保全/keyword-2026 等10件の漏れを是正）
- `CIVIL_SECONDARY_ADJACENT_GUIDES`（直前対策・civil-1のみ）→ 旗艦led
- career/年収/転職・比較 residual → **EMPTY（note CTA出さない・意図的）**。転職アフィリ専任（[[feedback_affiliate_career_only]]）。ここに二次商品を出すのは二重ミスマッチで禁止
- **2級は secondary catch-all が無い**（1級はL438にあり）。civil-2の新secondary slugは明示ブランチ追加が必要

**会員ラボ** `civil-membership-lab` は `published:false`＋noteUrl空 → `getMagazine()`(note-magazines.ts) が null → 全箇所で防御的に非表示。**ローンチ(published:true+noteUrl)で全配置が自動点灯**（wire-ahead 済）。[[project_civil_membership_design]]

**注意**: note.com記事内funnel（`wire-note-funnel-cta`／note-funnel-architecture.md）は**別サブシステム**でサイトのmagazine-placementとは無関係。混同しない。デザインは design-system.md のコンポーネント表に記載。
