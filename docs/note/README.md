# note 記事 SSOT（試験別）

このディレクトリが note.com 記事の唯一の真実源（SSOT）です。**2026-05-29 に試験別ディレクトリへ再編**しました。

## 構造

```
docs/note/
  README.md                 # このファイル（試験別インデックス）
  プロフィール.md            # 著者プロフィール（全試験共通・note アカウント用）
  技術士総監/
    noteコンテンツ計画.md     # 総監 note 戦略・進捗 SSOT
    {slug}/article.md        # 単発記事（img/ に図版・cover）
    magazines/{magazine}/{記事}/article.md   # 有料マガジン記事
  1級土木/
    {slug}/article.md
  2級土木/
    2級土木施工経験記述プラン.md  # 2級 施工経験記述 展開 SSOT
    magazines/{magazine}/{記事}/article.md
  共通/                       # 複数資格にまたがる横断記事
    {slug}/article.md
```

## 試験別インデックス

### 技術士総監（`技術士総監/`）

- **単発記事**: 29 本（学習戦略・公務員受験・民間技術者受験・戦略コスト分析・総監択一/記述 等）。一覧は `技術士総監/` を参照。
- **有料マガジン**（`技術士総監/magazines/`）:
  - 総監テキスト精読ガイド（5管理）
  - 総監メリット完全マップ
  - 総監記述式-5管理クロストレードオフ
  - 総監記述式-R8予想問題集
  - 総監模範論文-ゼネコン / 総監模範論文-河川コンサル / 総監模範論文-自治体道路担当
- **戦略 SSOT**: `技術士総監/noteコンテンツ計画.md`

### 1級土木（`1級土木/`）

- **単発記事**: 1級土木をAIで勉強する

### 2級土木（`2級土木/`）

- **有料マガジン**（`2級土木/magazines/`）:
  - 2級土木-施工経験記述-完成答案集（安全・品質・工程）
- **戦略 SSOT**: `2級土木/2級土木施工経験記述プラン.md`

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
- 投下スケジュールは各試験の SSOT（総監=`技術士総監/noteコンテンツ計画.md` / 2級=`2級土木/2級土木施工経験記述プラン.md`）を参照
- 図版ポリシーは `docs/reference/note-svg-policy.md` を参照
- 公開前チェックリストは `docs/reference/note-publish-enhancement.md` を参照

## 関連ツール（パス前提）

- 公開記事インデックス: `node .claude/scripts/build-note-published-index.mjs`（`docs/note/{exam}/...` を走査）
- 紙用 PDF 変換: `node scripts/magazine-to-pdf.mjs --spec scripts/pdf-specs/<magazine>.json`
- カバー画像生成: `node scripts/generate-note-covers.mjs [slug部分一致]`（再帰走査・試験別構造に自動対応）
- UTM 付与: `node scripts/add-note-utm.mjs <slug|prefix>`
- 図版 render: `scripts/render-figure-*.mjs`（出力先は `docs/note/技術士総監/...`）
