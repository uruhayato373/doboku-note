---
title: 著者オーソリティ 汎用バナー 運用ポリシー
---

# 著者オーソリティ 汎用バナー（note 商品 top/bottom）

土木施工管理技士（1級・2級）系 note 商品・ココナラ出品で、**競合との差別化＝上位資格保有者による分析提供**を訴求する汎用バナーの真実源。運営者「架」が実際に保有する資格・経歴（SSOT: `src/config/author.ts`）に基づく、誇張のない信頼性訴求。

## アセット

| ファイル | 役割 |
|---|---|
| `docs/note/共通/著者オーソリティ/img/base-keyart.png` | ChatGPT 生成の文字なしキーアート（1672×941・16:9・橋＝架／5管理ヘキサゴン／ヘルメット・図面・赤チェック＝採点） |
| `docs/note/共通/著者オーソリティ/img/figure-author-authority.png` | 完成バナー（キーアート左1/3に日本語コピーを合成） |
| `scripts/render-note-author-authority.mjs` | キーアート＋コピー合成（`node scripts/render-note-author-authority.mjs` で再生成） |
| `scripts/distribute-author-authority-banner.mjs` | 各 note 商品 article.md へ画像配布＋top/bottom 挿入（冪等） |

## フレーミング（厳守・誇張禁止）

運営者は技術士（総合技術監理部門・建設部門）＋1級/2級土木施工管理技士＋元・自治体土木職（発注者）を**実際に保有**（`src/config/author.ts`）。この3点を役割分担で語る:

- **総監（技術士）＝ 上位資格の"分析力"**（5管理＝経済性・安全・人的資源・情報・社会環境の統合視点）
- **元発注者（自治体土木）＝ "採点・審査する側"の視点**
- **1級・2級 施工管理技士 ＝ 自ら合格した"当事者"**

禁止:
- 「総監だから施工管理を教えられる」的な資格の混同（総監は施工管理の教授資格ではない）。総監は"分析力の裏付け"、施工管理技士保有が"当事者性"、と役割を分ける
- R8 総監 択一の「公式正答と全40問一致」は**別軸の"解答速報の精度"**の実演であり、施工管理バナーには混ぜない（総監商品側の信頼性訴求で使う）

## 配置パターン（画像 → リンクカード）

各 article.md で:
- **top**: H1 直後に `![alt](img/figure-author-authority.png)`
- **bottom**: 本文の締め → 同バナー → 橋渡し1文 → **既存のマガジン/記事カード（URL単独行）**。カードに**価格（¥）は書かない**・URL は bare 単独行でカード化（[note-funnel-architecture.md](note-funnel-architecture.md)／content-principles §14-c）
- alt は内容説明を入れる（アクセシビリティ）
- **HTML コメントは使わない**（note paste で文字として残るため）。冪等判定は画像ファイル名の存在で行う

橋渡し文（bottom）: 「上位資格の分析力・発注者の採点眼・合格者の当事者性で、あなたの答案を合格ラインへ引き上げます。」

## 適用対象（できるもの）

- **対象**: 試験・経験記述・添削 文脈の入口ページ（`notePricing: free`）— 購入判断の手前で効く
- **除外**: 転職/キャリア系ファネル（転職エージェント比較・年収・ホワイトな会社 等）は文脈不一致のため貼らない
- 内部の答案記事まで広げるなら `--all`

```bash
node scripts/distribute-author-authority-banner.mjs        # 入口(free)のみ・キャリア系除外
node scripts/distribute-author-authority-banner.mjs --dry  # 対象確認のみ
node scripts/distribute-author-authority-banner.mjs --all  # civil note 全 article.md
```

注意: 各 article.md は独立 note 投稿。ソース挿入後、**ライブ反映には各記事の再パブリッシュ（note 編集）が必要**。

## 利用するエージェント/スキル

- `civil-keiken-essay-writer` — 経験記述系 note 記事の生成時、買い手向け入口記事に本バナーを top/bottom 配置
- `civil-keiken-tensaku-drafter` — 添削返却/案内で差別化コピーの根拠として参照
- `coconala-operator` — ココナラ S1/S2 出品文面に同コピー＋バナー画像添付（実操作＝画像アップロードはユーザー）
