---
title: 1級土木 アフィリエイト拡張 ＆ SEO 改善
description: 1級土木 guide 系の流入を換金可能化し、CTR を引き上げて母数を増やすための実行計画と進捗管理
created: 2026-05-25
status: クローズ（書籍・講座アフィリは2026-06-25廃止／転職アフィリ部分は継続）
---

# 1級土木 アフィリエイト拡張 ＆ SEO 改善

<!-- audit:2026-08-18 -->
> [!note] 未チェック記法の位置づけ（2026-08-18 実査）
> Phase 4 以降は**トリガー条件付き**（効果検証後に判断）。成立するまで backlog へ起票しない。アフィリの提携申請は収益方針（転職一本）の Red Line に触れるため、起票前に affiliate-operations.md を確認する。

> [!warning] 2026-06-25: 書籍・講座アフィリは廃止
> 本計画の **BookCard（書籍）配置・SAT/独学サポート（講座/教材/添削）配置は完全廃止**（note 有料商品とのカニバリ回避）。以下の `[x]` 完了ログのうち書籍・講座に関する項目は歴史記録。**転職アフィリ（GKS インライン・サイドバー）部分は現行も継続**。真実源は `.claude/knowledge/reference/affiliate-operations.md`。

## 背景（2026-05-25 計測）

GSC 2026-04-15〜05-13（4週間）/ GA4 2026-05-03〜05-16（2週間）の突合結果：

| 指標 | 1級土木 | 総監(PE) | 全体 |
|---|---|---|---|
| GSC clicks | **17** | 110 | 145 |
| GSC impressions | **1,161** | 1,481 | 2,784 |
| GSC CTR | 1.5% | 7.4% | 5.2% |
| GA4 activeUsers（2週間） | **65** | 467 | 573 |
| GA4 sessions（2週間） | **107** | 838 | 1,020 |

**読み取り**:
- 1級土木は impression 構成比 42% に対し clicks 構成比 12% ＝ CTR が総監の 1/5。タイトル/description リライトで母数を伸ばす余地が大きい。
- 1級土木 guide 系の Top 流入ページ（`guide-strategy` / `guide-earthwork-key-points` / `guide-concrete-key-points` / `guide-law-key-points`）に **書籍アフィ・講座アフィ どちらも未配置**。最大の取りこぼし。

## 戦略判断（2026-05-25）

- 有料 note（記述式模範解答）は **母数 500 users/月 達成までトリガー保留**（現状 月130 users 推定）
- アフィリエイト拡張（労力小・即効）と SEO/CTR 改善（労力中）を並行で進める
- 書籍は **ページ文脈に合わせた固定ペア**（ランダム表示は CLS・計測解像度低下のため不採用）

## 配置設計

### 最終配置（page.tsx 条件分岐、2026-05-25 確定）

| 対象 | 1冊目 | 2冊目 |
|---|---|---|
| `civil` × `guide`（4ページ）| 合格ガイド（4798176834）| 一次過去問マスター解説集（4297154099）|
| `civil` × `textbook` | 合格ガイド（4798176834）| ナツメ第1次徹底図解（4816378243）|
| `civil` × `secondary` | 二次問題解説集（4886154557）| ナツメ第2次徹底解説（4816378561、経験記述70パターン）|
| `civil` × `primary`（新規分岐）| 過去問マスター解説集（4297154099）| 地域開発研究所 第一次解説集（4886154530、過去7年）|
| `pe` × `keyword` / `guide` / `pastExam` | （既存維持）| — |

---

## Phase 1: アフィリエイト拡張（労力小・即効）

### 1.1 guide 系4ページに BookCard 配置

**実装場所**: `src/app/docs/[...slug]/page.tsx`（カテゴリ × docGroup 分岐に追加）

- [x] 1.1.a `civil-construction-1` × `guide` 分岐を追加（合格ガイド 4798176834 を配置）— 2026-05-25
- [x] 1.1.b 一次過去問の payload 取得後、2冊目を併置（4297154099 過去問マスター解説集）— 2026-05-25

**コミット**: develop 直 push（コード変更だが軽微、CLAUDE.md 性質別運用ガイド準拠）

### 1.2 affiliate-books.json に1級土木4冊追加

ユーザー作業（もしも管理画面で「かんたんリンク」生成 → payload を取得 → JSON 追加）。

- [x] 1.2.a **一次過去問マスター解説集** ASIN 4297154099（技術評論社、最優先 — guide 4ページ用）— 2026-05-25
- [x] 1.2.b 1級土木施工管理 第一次検定 問題解説集 ASIN 4886154530（地域開発研究所、primary 用）— 2026-05-25
- [x] 1.2.c 1級土木施工管理 第2次検定 徹底解説テキスト&問題集 ASIN 4816378561（ナツメ社、secondary 用、経験記述70パターン）— 2026-05-25
- [x] 1.2.d 2026年版 1級土木施工 第1次検定 徹底図解テキスト&問題集 ASIN 4816378243（ナツメ社、textbook 用、R6追加分野対応）— 2026-05-25
- ~~CIC 第二次検定 テキスト＆過去問題集~~（合格ガイドと訴求被りのため除外）

### 1.3 講座アフィリエイト 申請＋配置

- [x] 1.3.a SAT 通信講座 300×250 サイドバー配置（既提携 SAT のクリエイティブを利用、PE 系全種類 + 1級土木 guide / secondary に横断配置）— 2026-05-25
  - mat: `4B3RUZ+6Y22UQ+5TRO+5YZ75`
  - SAT は技術士・1級土木 両方の講座を提供しているため資格を跨いだ配置が可能
  - 1級土木 textbook / primary は既存独学サポートと住み分け（docGroup で排他）
- [x] 1.3.a' サイドバー広告を **上部（マガジン CTA 直下、TOC 上）へ移動** — 2026-05-25
  - インプレッション最大化（first-view 内に入る）
  - 自社マガジン CTA の優先位置は維持
- [x] 1.3.d SAT 1級土木 商品リンク（記事末 CTA）配置 — 2026-05-25
  - mat: `4B3RUZ+6Y23MI+5TRO+BWGDT` / pixel: `www17.a8.net`
  - 配置: `civil × (guide | textbook | primary)` の BookCard 直下
  - 教材セット写真で「書籍 + 通信講座」のセット訴求
  - secondary は既存独学サポート + SAT サイドバーがあるため除外（押し売り回避）
- [ ] 1.3.b アガルート 土木施工管理（A8.net、新規申請）
- [ ] 1.3.c ヒューマンアカデミー「たのまな」（バリューコマース、要新規 ASP 登録）

承認後の配置案:
- アガルート: 経験記述添削の選択肢として secondary 系（独学サポートと併置）

### 1.4 キャリア/年収/試験概要 guide を新設し GKS 転職導線を強化（2026-06-01）

GKS（施工管理 転職支援・無料登録/面談で成果）への導線を増やすため、「無料でできること（求人・想定年収の確認）」を訴求するキャリア/年収/試験概要の guide 記事を新設。各記事は `group: guide` のため記事末 `CivilCareerCTA` バナーが自動表示され、加えて本文中に `CareerAffiliate`（テキストカード・登録無料訴求）をインライン配置（「インライン＋記事末」の 2 点導線）。

- [x] 1.4.a `civil-construction-2-guide-exam-overview` — 2級 試験概要（受験資格・科目・合格率・日程）＝ 流入の母数を取る informational
- [x] 1.4.b `civil-construction-1-guide-exam-overview` — 1級 試験概要（同上）
- [x] 1.4.c `civil-construction-1-guide-salary-up` — 土木施工管理で年収を上げる方法（昇進・資格手当・転職・独立）＝ 最も転職 intent が高い
- [x] 1.4.d `civil-construction-2-guide-salary` — 2級の年収・手当（既存 guide-career のメリット訴求と差別化し年収特化）
- [x] 1.4.e `civil-construction-2-guide-career-change` — 未経験から施工管理への転職（GKS の未経験・資格支援訴求と直結）
- [x] 1.4.f `refresh-indexes` 実行＋ dev サーバー curl 検証（全 5 ページ HTTP 200 / `<main>` / インライン+末尾 CTA の nofollow sponsored・PR 表示・「無料で」訴求を確認）

配置方針は [affiliate-operations.md](../../.claude/knowledge/reference/affiliate-operations.md)「6. 配置ポリシー」が真実源。creative の mat・URL・出し分け条件は `src/config/affiliate-mats.json` と `src/config/affiliate-creatives.ts`。

- [x] 1.4.g カード `points` に GKS 公称値を掲載し数値訴求を強化（2026-06-01）— 提携3,000社以上・内定率86%・定着率97%（全 5 カード）＋ 未経験記事のみ 入社2年後 平均年収470万円。末尾「（サービス公表値）」明示・本文編集記述には不掲載（広告/編集分離）
- [x] 1.4.h guide 追加 3 本（2026-06-01・同じインライン CareerAffiliate 数値訴求版）— `civil-construction-2-guide-study-plan`（2級 勉強法・母数）/ `civil-construction-1-guide-study-plan`（1級 勉強法・guide-strategy と差別化）/ `civil-construction-2-guide-job-reality`（施工管理の仕事・将来性・きつい？＝未経験/転職 intent）。計 8 guide にインライン導線
- [x] 1.4.i 過去問ページの設問間に GKS インラインを一括挿入（2026-06-01）— primary 34（1級24＋2級10）＋ secondary 年度別 10（1級5＋2級5）＋ テーマ別 secondary past-problems 4（1級 concrete/construction-plan/earthwork/quality-management）＝ 計48ページ × 2枚（前半/後半）。`*-basics`（散文・設問構造なし）と experience-writing（既 CourseAffiliate）は対象外。
- [x] 1.4.j textbook ページの本文末（`## 参考資料` 直前）に GKS インラインを1枚挿入（2026-06-01）— civil-1 textbook-* 34ページ（civil-2 に textbook 無し）。短い散文のため2枚→1枚。end=SAT のため pixel 同梱。`.tmp/insert-career-textbook.mjs`（CRLF 保持）。textbook は「本文末 GKS＋記事末 SAT」の併存に`.tmp/insert-career-mid.mjs`（writeMdxFile・EOL保持・冪等）。ピクセルは1ページ1発火（1級は末尾GKS無しのため前半カードに同梱、2級は末尾GKS発火のためmidは無し）。1級 primary は「mid=GKS＋末尾=SAT」併存（住み分けは記事末のみ維持）

**検証ポイント（Phase 3 で計測）**: 試験概要 2 本は informational で母数を取り、年収/転職/未経験 3 本は transactional でクリック・無料登録 CVR を取る設計。数値訴求版のクリック/CVR を計測し、効果が薄ければ汎用訴求へ戻す／LP 更新時は公称値を追従。

---

## Phase 2: SEO/CTR 改善（労力中・効果遅延）

目標: 1級土木 GSC CTR 1.5% → 5.0%（impression 1,161 維持で clicks 17 → 58）

### 2.1 guide 系の title / description リライト

事前 position 計測（GSC 2026-04-15〜05-13）：

| ページ | impr | CTR | pos | 対応 |
|---|---|---|---|---|
| guide-law-key-points | 72 | 2.8% | 6.1 | リライト |
| guide-strategy | 55 | 1.8% | 8.6 | リライト（最優先）|
| guide-concrete-key-points | 46 | 4.3% | 9.0 | リライト |
| guide-earthwork-key-points | 14 | 7.1% | 7.6 | 健全につき未着手 |

- [x] 2.1.a `guide-strategy` — 「捨て問27問・最低39問で合格」具体数字へ — 2026-05-25
- 2.1.b `guide-earthwork-key-points` — CTR 7.1% 健全につき未着手
- [x] 2.1.c `guide-concrete-key-points` — 「毎年5〜8問の頻出論点」出題数で重要性訴求 — 2026-05-25
- [x] 2.1.d `guide-law-key-points` — 「12問中8問選択」を seoTitle 先頭へ — 2026-05-25
- [x] 2.1.e リライト後 `npm run refresh-indexes` 実行 — 2026-05-25

### 2.1.x primary-r07-a/b CTR リライト

GSC で `primary-r07-a` は **impr 119 / CTR 0.8% / pos 7.4** ＝ guide より大きい流入なのに CTR 最低。
最新年度ペア（r07-a / r07-b）を先行リライト。効果検証後に r06 以前へ展開判断。

- [x] 2.1.x.a `primary-r07-a` seoTitle/description リライト（「全61問」「無料」追加）— 2026-05-25
- [x] 2.1.x.b `primary-r07-b` seoTitle/description リライト（「全35問必須」「無料」追加）— 2026-05-25
- [ ] 2.1.x.c r06-a / r06-b / r05-a 等への展開（効果検証後に判断）

### 2.2 1級土木 内部リンク強化

- [x] 2.2.a primary-r07-a/b の末尾「関連コンテンツ」を `<RelatedKeywords>` で7リンクに拡充（旧3リンク→7リンク。同年度・隣接年度・guide 4ピラー・経験記述ガイドへ）— 2026-05-25
- [x] 2.2.b guide-strategy の壊れた「テキスト参照リンク」セクションを削除（既存「分野別 学習優先度」と重複・リンクラベル不一致）— 2026-05-25
- 2.2.c guide ↔ secondary 双方向リンク確認 — guide-earthwork/concrete/law は既存（「過去問で確認しよう」「テキスト参照」充実）。strategy は「分野別 学習優先度」+ 「過去問リンク」で代替済み。今回は範囲外
- 2.2.d 残 primary 14 ページ（r06〜h26）の関連コンテンツ拡充 — Phase 3 効果検証後に判断（テンプレ化スクリプトで一括処理候補）

---

## Phase 3: 計測検証（4週後）

### 3.1 効果検証

- [ ] 3.1.a GSC 再計測（clicks / impressions / CTR / position）
- [ ] 3.1.b GA4 再計測（activeUsers / sessions / 1ユーザー当たり page views）
- [ ] 3.1.c A8 + もしも管理画面でクリック・成約数集計
- [ ] 3.1.d 母数 500 users/月 達成判定 → 達成なら Phase 4（有料 note）着手判断

### Phase 4 トリガー条件（保留中）

| 条件 | 状態 |
|---|---|
| 1級土木 月間 activeUsers ≥ 500 | 未達（現状 推定 130/月）|
| 講座アフィ 月間成約 ≥ 1件 | 未測定 |
| Web 月収 ¥15k 達成 | 未達 |

3 条件 2 つ以上達成で、1級土木 記述式模範解答 有料 note 化を再評価。

---

## 関連ドキュメント
- アフィリエイト提携状況: [affiliate-operations.md](../../.claude/knowledge/reference/affiliate-operations.md)
- 書籍台帳: [.claude/knowledge/reference/book-list.md](../../.claude/knowledge/reference/book-list.md)
- 収益化戦略: [01_戦略/04_収益化戦略.md](../strategy/04_収益化戦略.md)
- note コンテンツ計画: [content/note/技術士総監/noteコンテンツ計画.md](../../content/note/技術士総監/noteコンテンツ計画.md)
