# 3点セット（完全パック＋R8予想＋読み方ガイド）横展開 実行計画

**作成**: 2026-06-23 / **スコープ確定**: 建設部門フル3点 ＋ 土木は読み方ガイドのみ（ユーザー選択）

## 背景・前提（検証済み）

総監記述式の「完全パック＋R8予想＋読み方ガイド」3点セットが sales-log で**実証**（売上TOP3独占）：

| 3点 | productId | 実績（`.claude/state/sales/sales-log.json`） |
|---|---|---|
| 完全パック | `essay-complete-pack` ¥9,800 | 6件 **¥47,880（売上1位）** |
| R8予想 | `r8-essay-forecast` ¥3,480 | **11件（件数1位）** ¥30,280 |
| 読み方ガイド | `tankan-reading-guide` | 8件 ¥15,840 |

型の本質＝**安価な読み方ガイド（funnel入口）→ R8予想（次試験フック）→ 完全パック（上位束ね）**の3層ファネル。コンテンツは資格ごとに違うが**ファネル構造を複製**する。

## 原資レディネス（横展開コストの実測・ここが要）

### 建設部門（二次・論文）= フル3点

| 3点 | 原資の現状 | コスト評価 |
|---|---|---|
| **読み方ガイド** | `docs/textbook/技術士（建設部門）/論文対策キーワード/`（6テーマ markdown・各約12K字）＋ `docs/textbook/技術士論文の書き方.pdf`。site連動先＝pe-construction キーワード/ガイドページ | **再包装（中）**。総監 `tankan-reading-guide`（doboku-note連動・約7万字）の型を踏襲 |
| **R8予想** | `BK-01_道路/R08-yosou`（9記事）＋ `BK-I_必須科目I` R08（6記事）の**2科目のみ完成**。残10科目（河川砂防/都市計画/土質基礎/鋼コン/施工計画/建設環境/港湾空港/電力土木/鉄道/トンネル）は**未着手** | **新規生成（大）**。当初「再包装」見立ては誤り。`pe-secondary-exam-writer` forecast モードで10科目生成が必要 |
| **完全パック** | 科目別11マガジン＋必須I が全公開済（note-magazines.ts に24エントリ・全LIVE） | **束ねるだけ（小）**。note-magazines.ts に上位パック追加＋note.com で束ね（手動） |

### 土木（二次・施工経験記述＋学科）= 読み方ガイドのみ

- **読み方ガイド**: 原資あり＝site `secondary-experience-writing-guide`（1級2級）＋ `docs/note/1級・2級土木/{1級,2級}/工事概要の書き方`。**再包装（中）**
- **R8予想は持ち込まない**: 2026-06-12 確定の二刀流（予想＝メンバーシップのフロー価値）と矛盾するため（[noteコンテンツ計画.md](../note/1級・2級土木/noteコンテンツ計画.md)）

## 推奨実行順（ROI×受験期×コスト）

1. **建設部門 完全パック**（小・即・上位ラダー）— note-magazines.ts に published:false でエントリ追加。価格は収益戦略（段階値上げ¥4,980〜・[[note-revenue-strategy-2026]]）に整合。noteUrl はユーザーが note.com で束ね後に埋める
2. **建設部門 読み方ガイド**（中）— 論文対策キーワード6テーマ＋論文の書き方を「doboku-note連動 論文対策精読ガイド」として組成
3. **土木 読み方ガイド**（中）— 既存ガイドを note 読み方ガイド商品に組成
4. **建設部門 R8予想 横断商品化**（大）— 道路＋必須I の2科目で**先行ローンチ可能**（受験期7月・最優先seller型）。残10科目は `pe-secondary-exam-writer` forecast で順次拡張（要GO判断＝生成コスト大）

## 担当エージェント / スキル

- R8予想生成: `pe-secondary-exam-writer`（forecast:true）→ `pe-secondary-exam-qa` + `pe-secondary-exam-factcheck`
- 読み方ガイド組成: 既存 markdown 再構成（Generator）→ note-publish-enhancement.md の10工程
- カバー: `note-cover-writer` / OGP不要（note商品）
- 配線: note-magazines.ts（published:false → ユーザー公開 → noteUrl 埋め）
- ファクト: `guide-fact-checker`（試験制度・統計）

## 制約・未確定

- **note.com 公開は手動**（ユーザーのみ）。本プログラムの成果物＝content＋note-magazines.ts配線（published:false）まで。公開→noteUrl埋めはユーザー作業
- 各 完全パック/読み方ガイドの**価格は収益戦略の確認が必要**（本計画は構造のみ確定、価格は未確定）
- R8予想10科目の生成は**コスト大→着手前にユーザーGO**
