---
name: reference_site_magazine_cta_firing
description: "サイトの note マガジン CTA 配線と発火条件。published:true でも出ない（sidebar死配線・inline 8000字ゲート・非HUBはもくじ無し）・civilはmagazine-placement.ts一元管理・careerのCTAはビルド後HTMLでしか数えられない"
metadata:
  type: reference
---
`note-magazines.ts` を `published: true` にしても、サイトの `/docs` に note マガジン CTA が
1 面も出ないことがある（2026-07-31 コンクリート診断士で実際に発生。handoff は「3面で発火」と
書いていたが 2026-07 の CTA 統一より前の記述だった）。

`src/app/docs/[...slug]/page.tsx` が実際に使う経路は次の 4 つだけ:

| 経路 | 発火条件 |
|---|---|
| `placement.top`（冒頭 CTA） | 配線があれば無条件。**確実に出せる唯一の枠** |
| `placement.inline`（中間 CTA） | group が guide/pillar/textbook/土木secondary **かつ h2>=5 かつ本文 8,000 字以上**。さらに下限枠ゲート（h2>=4 かつ 2,500 字）| 
| もくじタイル（`resolveHubCta`） | **HUB 資格のみ**。concrete 系・一次・reference は null |
| MDX 内 `<MagazineCard id=... utmContent=... />` | 置けば出る |

**`placement.sidebar` はどこからも参照されていない**（2026-07 の統一で廃止）。配線しても出ない。

**`inline` は先頭 1 誌しか描画されない**（2026-08-17 追記）。しかも `top` と別マガジンのときだけ。
つまり `inline` の 2 位以降は**優先順位リストであって面ではない**。到達検査
（`check-magazine-cta-reachability.ts`）は 2026-08-17 まで inline を全スロット credit していて、
2 位以降しか持たないマガジンを「導線あり」と誤判定していた（同期後に 5 誌が新規で赤くなった）。

**`primary` / `pastExam` は中間 CTA の対象外**。`midEligibleGroup` に含まれないので、
これらの group では **`top` を配線しない限り note CTA はゼロ**になる。この形の欠陥は
診断士(7/31)・主任技士(8/13)・総監択一(8/17)・土木 primary 29本(8/17) と 4 度再発した。

**`<MagazineCard>` の `utmContent` は必須**。省略すると URL に literal `utm_content=undefined` が
入り GA4 帰属が壊れる（型エラーにはならないので気づけない）。既存 123 件は全て指定済み。

新しいマガジンを公開したら、`published: true` にしただけで終わりにせず **dev + curl で
マガジン key（`m/xxxx`）がページ HTML に出るか実査する**。出ていなければ top を足すか
MDX に `<MagazineCard>` を置く。配線の生死は `resolvePlacement` + `getMagazine` を
tsx で直接評価すると 1 コマンドで分かる。

関連: [[reference_site_magazine_cta_firing]]（civil の CTA は magazine-placement.ts 一元管理）

---

## 1級2級土木サイトのCTA配線アーキテクチャ

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

---

## career記事のnote CTAはMDXのgrepで見えない

「career 記事（`tags: [career]`）に note 二次 CTA を置かない」は方針だが、**MDX を grep しても検出できない**。2026-09-22 に実証。

**なぜ見えないか** — note CTA には 3 つの出方があり、うち 2 つは MDX に文字列として現れない。

1. `<MagazineCard id="...">` … MDX にあるが、`NoteLink` / `cta:` / `note.com/dobokunote` のいずれにも一致しない
2. `resolvePlacement()` の `top` / `inline` … MDX に一切現れない。カテゴリと group から自動で挿入される
3. `sidebarProduct()` … 同上

**数え方** — `npm run build` 後に、career 記事の出力 HTML で `data-cta="note"` を数えるのが唯一の実測。URL は `out/exam|practice/<category>/<group>/<name>.html`（フラット slug `<category>-<group>-<name>` から組み立てる）。実際これで 44 件中 3 件を発見した。

**Why:** 改稿ゲートに `grep -cE 'NoteLink|cta:|note\.com/dobokunote' <path>` を入れて「0 件＝混入なし」と判定していたが、同じページがビルド後に note CTA を 1 つ出していた。source grep は 2 と 3 を原理的に見られない。

**How to apply:**
- career 記事の CTA 検査は**必ずビルド後 HTML で**行う。MDX の grep は補助にしかならない
- 自動配線（2・3）は `resolvePlacement` の入口 `isCareer` ガードで止まる（2026-09-22 に真実源 `isCareerDoc` へ寄せた）。カテゴリ別・slug 接頭辞別に判定を書き足さない
- MDX に著者が明示的に置いた `<MagazineCard>` はガードの射程外。機械で一律に剥がさず判断を残す（2026-09-22 時点で 2 本が該当: `pe-comprehensive-management-public-engineer-qualification-map` と `civil-construction-1-guide-consultant`。いずれも RCCM 商品）
- 関連: [[reference_site_magazine_cta_firing]]（CTA が出る/出ない条件）・[[feedback_affiliate_career_only]]

## 枠ごとの効き（2026-10-02 実測・GA4 9/4〜10/1）
冒頭 1 行 CTA（`MagazineTopBanner`）の全資格平均クリック率は 0.40%、本文の `<MagazineCard>` は 6.72%、中間 CTA は 1.47%。冒頭でも具体的で安い商品（択一 PDF 等）は 1.4〜2.5% 取れるが、高額のまとめ売り（まるごと・想定工事バンク・完全攻略）は 0.12〜0.19% で最低帯。**冒頭に高額バンドルを置かない**。冒頭バナーは長い catalog price 文字列で PC 幅のタイトルが幅 0（縦書き状）に崩れていた → 先頭金額のみ表示に是正（PR #841）。表示率の議論の前に、まず本番の描画を `a[data-cta-placement="article-top"]` の幅で実測する。
マガジン単位の到達検査（各商品 1 面以上）は、新記事の許可リスト足し忘れを素通りする → `check-magazine-cta` にページ単位ゲート（1級・2級土木・baseline `zeroPage`）を追加済み。関連 [[project_civil_niji_gakka_line]]
