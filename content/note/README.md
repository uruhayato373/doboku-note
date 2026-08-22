# note 記事 SSOT（試験別）

このディレクトリが note.com 記事の唯一の真実源（SSOT）です。2026-05-29 に試験別ディレクトリへ再編、**2026-06-11 に戦略 SSOT の体系を整理**しました。

本書は **note チャネルの資格別実行 SSOT**（価格・リリース・マガジン・メンバーシップ）です。全資格共通の**横断戦略**（プロダクト・設計思想・事業・収益化方針）は [../project/01_戦略/README.md](../../docs/strategy/README.md) を参照。

## 戦略 SSOT の体系（どこを読むか）

| トピック | 真実源 |
|---|---|
| 総監 note 戦略・進捗・価格企画 | `技術士総監/noteコンテンツ計画.md`（マガジン構成の決定記録は `技術士総監/総監マガジン構成_決定2026.md`） |
| 建設部門 note 戦略・価格企画 | `技術士建設部門/noteコンテンツ計画.md` |
| 1級・2級土木 note 戦略（メンバーシップ含む） | `1級・2級土木/noteコンテンツ計画.md`（買い切りマガジンの実装詳細は各級プランへ委譲） |
| 実価格・noteUrl・公開状態 | `src/lib/note-magazines.ts`（照合は `npm run verify-note-magazines`） |
| 記事・マガジンへの回遊/購入導線（資格別 3 層） | `.claude/knowledge/reference/note-funnel-architecture.md`（監査は `npm run audit-note-funnel`、機械可読は `.claude/config/note-funnel.json`） |
| 両資格リリース計画 | `技術士総監/noteコンテンツ計画.md` の「📅 統合リリースカレンダー 2026-07〜12」 |
| 価格の競合対比妥当性 | `docs/strategy/09_販売チャネル競合分析.md`（判断記録） |

## 構造

```
content/note/
  README.md                 # このファイル（試験別インデックス）
  プロフィール.md            # 著者プロフィール（全試験共通・note アカウント用）
  技術士総監/
    noteコンテンツ計画.md          # 総監 note 戦略・進捗 SSOT
    総監マガジン構成_決定2026.md   # 2段ラダー決定記録（ADR、2026-06-10）
    {slug}/article.md             # 単発記事（img/ に図版・cover）
    magazines/{magazine}/{記事}/article.md   # 有料マガジン記事
  技術士建設部門/
    noteコンテンツ計画.md     # 建設部門 note 戦略 SSOT
    magazines/BK-01〜11_{科目}/R0X/article-*.md
  技術士一次/                # 2026-07-11 新設（Kindle 択一の note 従チャネル）
    一次択一-過去問PDF/article.md   # 基礎・適性・専門 全560問 PDF（単発有料）
  1級・2級土木/                  # 2026-06-12 統合: 1級土木・2級土木を級サブdirへ集約
    noteコンテンツ計画.md     # 1級・2級横断の戦略 SSOT（メンバーシップ含む）
    メンバーシップ説明文.md
    経験記述-落ちる答案診断-無料/  # 無料リードマグネット
    1級土木/
      1級土木施工経験記述プラン.md   # 会員ベース層コンテンツ制作プラン
      1級土木-集客記事クラスター.md  # 無料集客記事クラスター（A層）
      {slug}/article.md
      magazines/{magazine}/...
    2級土木/
      2級土木施工経験記述プラン.md   # 会員ベース層コンテンツ制作プラン
      2級土木-集客記事クラスター.md  # 無料集客記事クラスター（A層＋B層）
      2級経験記述-添削テンプレ.md    # 添削半自動化テンプレ
      {slug}/article.md
      magazines/{magazine}/...
  コンクリート主任技士/
    magazines/{magazine}/...
  コンクリート診断士/
    magazines/{magazine}/...
  共通/                       # 複数資格にまたがる横断記事
    {slug}/article.md
```

## 試験別インデックス

### 技術士総監（`技術士総監/`）

- **単発記事**: 30 本超（学習戦略・公務員クラスター・民間メリット・トレードオフ思考・R8予想 等）。一覧は `技術士総監/` を参照。
- **有料マガジン**（`技術士総監/magazines/`）: コア4（テキスト精読ガイド / 5管理クロストレードオフ / 設問3国家施策バンク / R8予想問題集）＋ 模範論文 17 ペルソナ（ゼネコン・河川コンサル・道路橋梁コンサル・都市計画コンサル＋自治体 13 分野）＋ 完全パック（2段ラダー: コアパック ¥5,480 / 全記事パック ¥9,800）
- **無料リード磁石**: 白書R7完全対応集・総監メリット完全マップ・R8予想問題・ハブ記事「17ペルソナ診断」（設計済・執筆待ち）
- **戦略 SSOT**: `技術士総監/noteコンテンツ計画.md`

### 技術士建設部門（`技術士建設部門/`）

- **有料マガジン**（`技術士建設部門/magazines/`）: BK-I（必須科目Ⅰ）＋ BK-01〜11（11 専門分野の選択科目 模範解答集、R03〜R07＋R08-yosou）。**全12誌 live**（2026-06 前倒しローンチ済・6月 ¥88k 実売）
- **差別化軸**: 「元公務員（発注者）が書いた模範解答」＋合格 3 科目（道路・河川・都市計画）は「合格者が書いた」訴求
- **戦略 SSOT**: `技術士建設部門/noteコンテンツ計画.md`

### 1級・2級土木（`1級・2級土木/`・`1級土木/`・`2級土木/`）

- **横断戦略 SSOT**: `1級・2級土木/noteコンテンツ計画.md` — **ライブラリ内包メンバーシップ「土木セコカン合格ラボ」**（2026-07-01 転換）。完成答案・過去問（買い切りマガジン）を会員特典に内包＝会員読み放題＝入会の引き金／FLOW（月例予想＋毎週添削）が引き止め・LTV本体。買い切りは廃止せず¥9,800パックをアンカー化。会員＝通年プラン ¥1,480/月＋添削つきプラン **¥4,980/月**（2026-08-06 に ¥2,980 から改定）・定員 20・シーズン制。設計・級別サブ文書の索引
- **買い切りマガジン（販売継続・過去問/完成答案）**: 1級 完成答案集・2テーマ組合せ大全・過去問模範答案集・完全攻略パック／2級 完成答案集ほか（**会員特典マガジンにも内包＝会員読み放題**・買い切りは廃止せずアンカー化。制作詳細は各級プラン文書、モデルは計画 §1.4）
- **無料リードマグネット**: 模範解答サンプル＋落ちる答案診断（コールド客のトラスト導線・計画 §3.3）
- **無料集客**: 級別クラスター（1級 A層 5 本 / 2級 A層 5 本＋B層 5 本）

### 技術士一次（`技術士一次/`）— 2026-07-11 新設

- **単発有料記事**: 過去問PDF 合本（基礎・適性・専門〔建設部門〕令和元〜7年度 全560問・¥1,480）。Kindle 択一（D-00 合本）と同一原稿の A4 印刷用 PDF を有料エリアに添付した **note 従チャネル**。note 売上ゼロ層を拾う位置付け（[Kindle 管理SSOT](../../content/kindle/strategy.md)）
- **配線**: `src/lib/note-magazines.ts` の `pe1-takuitsu-pdf`（published:true・実 noteUrl）

### 択一過去問PDF 従チャネル（横断・Kindle 併売）

- Kindle 択一シリーズと同一原稿の A4 PDF を有料 note 単発記事として併売する従チャネル。対象 4 商品＝2級土木一次（`civil-2-takuitsu-pdf`・上記 1級・2級土木配下）／技術士一次（`pe1-takuitsu-pdf`）／総監 令和（`tankan-takuitsu-reiwa-pdf`）／総監 平成（`tankan-takuitsu-heisei-pdf`）。**全4商品 2026-07-12 公開済**。真実源＝`content/kindle/strategy.md`・`src/lib/note-magazines.ts`

### コンクリート主任技士（`コンクリート主任技士/`）

- **有料マガジン**（`コンクリート主任技士/magazines/`）: 四肢択一-R8予想問題集（企画）・小論文-模範答案集

### コンクリート診断士（`コンクリート診断士/`）

- **マガジン**: 下書き段階（JCI 再録の権利確認が公開前提）

### 共通（`共通/`）— 複数資格にまたがる横断記事

- AIで土木資格を攻略
- 資格活用キャリアマップ

## frontmatter 必須フィールド

```yaml
title: "..."
notePricing: free | paid
noteSeries: "..."
utmCampaign: "..."
published: true | false   # 単発記事。マガジン記事は noteUrl の有無で判定
```

## ルール

- note.com への反映は手動コピー（HTML 未対応のため Markdown をそのまま貼り付け）
- 公開済み記事は `published: true`（単発）/ `noteUrl` 設定済み（マガジン）で識別
- 投下スケジュールは「📅 統合リリースカレンダー」（`技術士総監/noteコンテンツ計画.md`）と各試験 SSOT を参照
- 図版ポリシーは `.claude/knowledge/reference/note-svg-policy.md` を参照
- 公開前チェックリストは `.claude/knowledge/reference/note-publish-enhancement.md` を参照
- 模範論文（総監記述式）のレビュー手順は `.claude/knowledge/reference/note-essay-review-checklist.md` を参照
- note 公開状態の SoT 突合は `.claude/knowledge/reference/note-api-verification.md`（`npm run verify-note-magazines`）

## 関連ツール（パス前提）

- 公開記事インデックス: `node .claude/scripts/build-note-published-index.mjs`（`content/note/{exam}/...` を走査）
- 紙用 PDF 変換: `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/<magazine>.json`
- カバー画像生成: `node scripts/generate-note-covers.mjs [slug部分一致]`（再帰走査・試験別構造に自動対応）
- UTM 付与: `node scripts/add-note-utm.mjs <slug|prefix>`
- 図版 render: `scripts/render-figure-*.mjs`
- note 公開状態の照合: `npm run verify-note-magazines`
