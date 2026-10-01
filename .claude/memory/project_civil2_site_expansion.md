---
name: civil2-site-expansion
description: 2級土木サイト(civil-construction-2)の学習ガイド拡充プロジェクト。P2完了・P1(専門土木)残。2級はテキストスキャン無し
metadata: 
  node_type: memory
  type: project
  originSessionId: 405ff704-c019-4985-baf7-c04779f7b0bb
---

2級土木施工管理技士サイト（civil-construction-2）の第一次学習コンテンツ拡充プロジェクト（2026-07-02 着手）。

**真実源（現状分析＝ギャップの SSOT）**: `docs/project/02_コンテンツ/07_2級土木サイト現状分析.md`（在庫棚卸し×出題範囲カバレッジ×1級ベンチ）。

**需要窓(2026-07-14確認)**: 2級後期 二次検定=**2026-10-27**(申込受付開始2026-07-08)。申込窓オープン直後に経験記述完成答案が売れ始めた＝この時期が2級後期の買いシーズン立ち上がり。在庫/note SKU/CTA配線は全て完成・published:true 済み（[[project_civil_membership_design]]）ため、この窓での増強レバレッジは新規作成でなく流入(SNS送客・認知)。

**重要な制約**:
- **2級はテキスト本のスキャンが存在しない**（`docs/textbook/２級土木施工管理技士/` は過去問PDF R03-R07 のみ）。1級の内部テキスト（土木一般編/施工管理・法規編）は施工管理系が2級と範囲重複するので**事実照合の根拠**に使えるが、**専門土木（河川砂防/道路舗装/構造物/ダムトンネル/上下水道）は内部にも1級サイトにも体系ソースが無く WebSearch 前提**。
- 内部テキストは著作権上**公開禁止**＝逐語転載せず独自文章で書き起こす（[[affiliate-career-only]] とは別軸の制約）。

**進捗**:
- P2 完了（2026-07-02）＝基礎工 guide-foundation-key-points / 施工計画 guide-construction-plan-key-points / 安全管理 guide-safety-management を新設・公開。土木一般=三本柱完成、施工管理法=4本(施工計画/工程/安全/品質)完成。第一次11論点中 4→8 が充足。
- **残**: P1 専門土木ブロック（5論点まるごと空白・WebSearch grounding 必須）、法規の深さ(guide-law-key-points 1本圧縮=△)。P3=過去問zenki5本のExamPoint補完(kouki のみ有りの非対称)、P4=科目guideの図表不足。

**新規guide作成の実証済みパイプライン**: 執筆(独自文章)→check-guide-length(3000字下限・[[guide-min-3000-chars]])→guide-qa(sonnet Evaluator)で採点→改善→OGPは `node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug>`（bare `npm run ogp` は引数必須）→generate-webp→refresh-indexes→明示パスでcommit。SeeAlso は本番実在ページのみ（未公開の兄弟記事へは張らない＝check-sns-urls で落ちる）。
