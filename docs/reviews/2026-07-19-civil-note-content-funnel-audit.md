---
title: 1級・2級土木 note記事 内容・CTA・管理方式監査
date: 2026-07-19
status: proposal
scope: content/note/1級・2級土木
---

# 1級・2級土木 note記事 内容・CTA・管理方式監査

> [!warning]
> **最優先**：著者は元発注者であり、添削者・試験採点者ではない。公開記事とカバーに残る「添削する側」「採点する立場」「発注者・添削視点」は、実績を誤認させない表現へ修正する。

## 1. 結論

管理方式は次の3層に分ける。

| 層 | 管理するもの | 正規配置 |
|---|---|---|
| 記事frontmatter | 記事固有の役割・分類・参照キー | `content/note/**/article.md` |
| カタログ／config | 商品、URL、CTAテンプレ、導線規則 | `src/lib/note-magazines.ts`、`.claude/config/note-funnel.json`、新設する記事レジストリ |
| Markdown本文 | 記事固有の論旨、具体例、解説 | `content/note/**/article.md` 本文 |

**本文全体をカタログやfrontmatterへ移さない。** 長文をYAML/JSON化すると、差分レビュー、文章編集、noteへの転記、見出し構造の確認が難しくなる。カタログ化するのは、複数記事で反復し、変更時に横断同期が必要な要素だけとする。

## 2. 監査対象と現況

`content/note/1級・2級土木` 配下の `article*.md` 241件を確認した。

| 区分 | 全記事 | magazines配下 | 通常記事 | 公開判定 |
|---|---:|---:|---:|---:|
| 1級 | 141 | 134 | 7 | 122 |
| 2級 | 62 | 51 | 11 | 62 |
| 共通・キャリア・会員 | 38 | 0 | 38 | 16 |

資格別203記事のうち185記事が `magazines/` 配下で、通常の `audit-note-funnel` は仕様上これらを監査対象外としている。通常記事のソースCTAは整合していたが、公開noteのライブ監査では2級一次択一PDFの末尾もくじCTAが未反映だった。

## 3. 優先度別の指摘

### P0：著者属性と異なる表現

該当例：

- `1級土木/1級経験記述で落ちる答案/article.md`
- `2級土木/施工経験記述で落ちる答案/article.md`
- `2級土木/工事概要の書き方/article.md`
- `土木もくじ/article.md` の会員制訴求

修正対象：

- カバー `発注者・添削視点`
- H1 `添削する側から見た4つの型`
- H2 `発注者・添削する側は「密度」で見ている`
- 本文 `採点する側が～`、`また採点する立場で～`
- 商品説明 `採点者が減点する箇所`
- 会員制訴求 `採点者視点`、`マンツーマン添削`

推奨表現：

| 避ける | 置換候補 |
|---|---|
| 添削する側 | 元発注者として工事書類を確認してきた立場 |
| 採点者視点 | 読み手に伝わる整合性 |
| 採点者が減点する箇所 | 答案の説得力を下げる箇所 |
| 発注者・添削視点 | 元発注者の視点 |
| 採点は～で決まる | 答案の説得力は～で大きく変わる |

公式の採点基準を確認できない内容は断定せず、発注者として工事書類の整合性を確認した経験と、1級土木施工管理技士に合格した自身の受験経験の範囲に限定する。

### P0：ライブCTA未反映

`npm run audit-note-funnel -- --exam civil --live` の結果、次がD5になった。

- `2級土木/一次択一-過去問PDF`：末尾の土木もくじCTAがソースにはあるが公開noteへ未反映

修復は公開状態を変えるため別作業とし、`note-append-cta` または `publish-note --update` の実行前に対象note IDと有料境界を再確認する。

### P1：無料記事のCTA重複

代表的な「落ちる答案」記事では、同じ商品系列への導線が次の4か所にある。

1. 冒頭の主力パックCTA
2. 本文末の商品CTA
3. 関連リソース内の商品再掲
4. 最下部の土木もくじCTA

推奨構成：

- 冒頭：記事意図に合う主CTAを1つ
- 本文末：読後の次ステップを1つ
- 関連リソース：無料記事・サイト解説
- 最下部：土木もくじ

同一商品URLの再掲は1記事1回を基本とし、購入意図が異なる別商品を出す場合は選択基準を明示する。

### P1：商品階層が本文内で不明瞭

1級では「二次まるごとパック／完全攻略パック／完成答案集」、2級では「想定工事バンク／完成答案集／一次PDF」が同一記事内で並ぶことがある。商品名だけでなく、読者の選択基準をCTAカタログに持つ。

| 読者意図 | 推奨商品 |
|---|---|
| 1級二次をまとめて仕上げる | 二次まるごとパック |
| 1級で自分の工事に近い答案を探す | 完全攻略パック |
| 1級でまず5管理の型を見る | 完成答案集 |
| 2級で工種から答案を選ぶ | 想定工事バンク |
| 2級で頻出3管理から始める | 完成答案集 |
| 2級一次を演習する | 一次過去問PDF |

### P1：1級・2級の対記事を二重編集している

代表5組の本文5-gram類似度：

| 記事ペア | 類似度 |
|---|---:|
| 自分の現場に置換 | 54.9% |
| 落ちる答案 | 34.1% |
| 工事概要の書き方 | 33.2% |
| テーマ選び | 22.5% |
| R6新形式 | 11.6% |

本文を一つのテンプレから全生成するのではなく、著者紹介・丸写し禁止・基本原則・CTA・関連リソースなどの反復ブロックだけを共通化する。1級と2級の試験差、工事規模、技術者レベル、管理項目数、具体例は各Markdownに残す。

### P1：magazines配下のCTA監査空白

資格別203記事の91%がmagazines配下だが、現行のD1-D5監査は対象外。全記事一律CTA必須にはせず、系列単位でポリシーを定義する。

```yaml
ctaPolicy:
  top: required | optional | none
  bottom: index | sibling | none
  previewOnly: true
```

検査時は、有料境界より前の無料プレビュー域に必要なCTAがあるかを見る。索引記事、単品販売記事、パック収録記事を同じ規則で扱わない。

### P2：カバー文字溢れ36件

`npm run check-note-cover-fit -- --all` で、1級21件・2級15件の上段文字溢れを確認した。長い正式工事名を `hiSuffix` に入れていることが主因。

系列一括で、`hi=工事番号`、`hiSuffix=短い工種名`、`banner=正式工事名` に分ける。略語辞書を使う場合は意味が変わらないものだけをレビュー付きで採用する。Clarity V3とは別バッチで修正する。

### P2：メタ監査がNode 20で起動しない

`npm run note-meta-lint -- --help` は `node:fs/promises` の `glob` export不足で起動しなかった。Node 22への統一か、Node 20対応globへの置換が必要。なお `--help` 時に監査を実行するCLIもあり、引数処理の統一余地がある。

## 4. 推奨データモデル

### 4.1 frontmatterに置くもの

frontmatterは「この記事は何で、どの導線規則を使うか」を宣言する。

```yaml
notePricing: free
noteSeries: 施工経験記述
utmCampaign: c1-essay-fail

contentRole: problem-awareness
examKey: civil-1
audienceStage: considering
primaryOffer: civil-1-experience-complete-pack
secondaryAction: civil-index
ctaProfile: civil-experience-free
contentPair: essay-fail
authorAngle: former-owner
```

推奨フィールド：

| フィールド | 意味 |
|---|---|
| `contentRole` | 入口、問題認識、比較、学習ガイド、商品説明、索引 |
| `examKey` | `civil-1` / `civil-2` / `civil-common` |
| `audienceStage` | 未認知、検討、演習、購入直前 |
| `primaryOffer` | 商品カタログのキー。URLや価格は書かない |
| `secondaryAction` | もくじ、無料ガイド、関連学習など |
| `ctaProfile` | CTA配置規則のキー |
| `contentPair` | 1級・2級の対記事グループ |
| `authorAngle` | `former-owner` 等、許可された著者属性キー |

`noteUrl`、`noteId`、公開日は現行どおり記事固有のfrontmatterに保持する。

### 4.2 カタログに置くもの

既存 `src/lib/note-magazines.ts` を商品・公開URL・価格のSSOTとして維持する。CTA側にはURLを重複保持せず、商品キーを参照させる。

新規候補：`.claude/config/note-content-catalog.json`

```json
{
  "ctaProfiles": {
    "civil-experience-free": {
      "top": "primaryOffer",
      "related": ["site-guide", "site-examples"],
      "bottom": "civil-index",
      "maxPaidOffers": 1
    }
  },
  "authorAngles": {
    "former-owner": {
      "label": "元発注者",
      "allowedClaims": ["工事書類の整合性確認", "施工計画書の確認", "自身の1級受験経験"],
      "forbiddenClaims": ["添削者", "試験採点者", "採点する立場"]
    }
  },
  "contentPairs": {
    "essay-fail": {
      "civil-1": "1級土木/1級経験記述で落ちる答案",
      "civil-2": "2級土木/施工経験記述で落ちる答案"
    }
  }
}
```

既存の `.claude/config/note-funnel.json` はL1/L2/L3の経路を担っているため、商品内容や本文共通ブロックまで肥大化させない。責務を分ける。

### 4.3 Markdownに残すもの

- H1、導入、問題提起
- 1級・2級固有の制度・設問差
- 工事規模、管理項目、技術者レベルの違い
- 悪い例・改善例
- 筆者自身の経験に基づく説明
- 記事固有の結論

共通文を外部includeで実行時展開する方式は、note公開ソースとの乖離を生みやすいため避ける。共通ブロック更新は、マーカー範囲を決定論的に書き換える同期スクリプト方式が安全。

## 5. 修正・自動化の推奨順序

| 順位 | 作業 | 工数 | 効果 |
|---:|---|---:|---:|
| 1 | 添削者・採点者を名乗る表現の横断修正 | 小 | 非常に大 |
| 2 | 2級一次PDFのライブCTA反映 | 小 | 大 |
| 3 | 無料記事の同一商品CTA重複整理 | 小〜中 | 大 |
| 4 | frontmatter参照キー＋CTA profileの小規模導入 | 中 | 大 |
| 5 | 対記事5組の反復ブロック同期 | 中 | 大 |
| 6 | magazines系列別CTA監査 | 中 | 大 |
| 7 | カバー36件のフィット修正 | 中 | 中 |
| 8 | note-meta-lintのNode互換修正 | 小 | 中 |

最初から241記事を移行しない。代表2記事（1級・2級の「落ちる答案」）でスキーマと同期方法を検証し、差分レビューと公開反映手順が安定してから横展開する。

## 6. 検証記録

実行したread-only確認：

```bash
npm run audit-note-funnel -- --exam civil
npm run audit-note-funnel -- --exam civil --live
npm run check-note-cover-fit -- --all
npm run note-meta-lint -- --help
npm run check-note-charlimits -- --help
```

結果：

- ソースCTA：ドリフト0
- ライブCTA：civil 1件D5（2級一次択一PDF）
- カバー：civil 36件がキャンバス外溢れ
- note-meta-lint：Node 20で起動失敗
- 文字数：HARD上限超過0（スクリプト全体走査）

## 7. 未実施

- 記事本文・frontmatterの修正
- カタログ／スクリプトの実装
- カバー再生成
- note.comへのCTA・本文・カバー反映
- 商品やメンバーシップの提供内容変更

