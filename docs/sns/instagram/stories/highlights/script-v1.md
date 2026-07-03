---
title: Instagram ストーリーズ ハイライト 原稿 v1
purpose: bio 直下に固定する 5 ハイライトの Story コピー + 視覚スペック（Level 2 仕様）
canvasCover: 1080x1080 (円形トリミング前提)
canvasStory: 1080x1920 (9:16)
designTokens: docs/design-system/instagram-carousel-tokens.json
appliesTo: Instagram @dobokunotecom プロフィールのハイライト 5 枠
lastUpdated: 2026-05-27
relatedDocs:
  - docs/sns/instagram/profile.md
  - docs/reference/sns-image-policy.md
  - docs/reference/links-hub.md
---

# Instagram ストーリーズ ハイライト 原稿 v1

bio から流入したユーザーに「目的別」の入口を提供する 5 ハイライトの Story 原稿。コピー + 視覚スペック（背景色 / レイアウト / フォント）まで定義し、実画像化は Canva 等で行うか、後日 `sns-common` の renderer を 1080×1920 対応に拡張して自動生成する。

## 0. 共通仕様

### キャンバス・フォント

| 項目 | 値 |
|---|---|
| Cover キャンバス | 1080×1080（IG が円形にトリミング） |
| Story キャンバス | 1080×1920（9:16） |
| 安全領域（Story） | y: 250–1620（上 250 = プロフィール表示、下 300 = DM/反応バー） |
| 日本語フォント | NotoSansJP（500/700/800/900） |
| 英数フォント | Manrope（500/700/800） |
| カラートークン | `docs/design-system/instagram-carousel-tokens.json` の `brand.presets` / `ink` / `surface` を使用 |

### ハイライトごとの brand-color 割当

| 順 | Highlight ID | テーマ | brand preset | primary |
|---|---|---|---|---|
| ① | civil-construction | 1級土木 | warmRed | #D9533F |
| ② | pe-comprehensive | 技術士総監 | default (blue) | #1858B5 |
| ③ | note-free | note 無料 | teal | #0F766E |
| ④ | note-paid | note 有料 | violet | #4338CA |
| ⑤ | youtube | YouTube | (ink-strong 基調) | #14191F |

### UTM 共通フォーマット

すべての Link Sticker URL に下記を付与:

```
?utm_source=ig&utm_medium=highlight&utm_campaign={highlight_id}&utm_content={story_name}
```

例: `https://doboku-note.com/docs/civil-construction-1-keyword-2026?utm_source=ig&utm_medium=highlight&utm_campaign=civil&utm_content=hero`

### Story 共通レイアウト規約

```
y:    0 ───────── 250  IG UI が被るゾーン（テキスト禁止）
y:  250 ───────── 320  eyebrow（カテゴリ・小見出し）
y:  400 ───────── 700  title（最大の見せ場、NotoSansJP 900）
y:  900 ─────── 1380  本文 / リスト / ビジュアル
y: 1500 ─────── 1620  CTA テキスト（"タップで開く →" 等）
y: 1620 ─────── 1920  IG UI が被るゾーン（Link Sticker はここに配置 = IG アプリ側で重ねる）
```

---

## ① civil-construction（1級土木）

### Cover (1080×1080)

```yaml
bg: warmRed.primary (#D9533F)
layout:
  - eyebrow:
      text: "doboku-note"
      font: Manrope 800 / 36px
      color: onDark.secondary (rgba(255,255,255,0.7))
      align: center, y: 140
  - title:
      text: "1級\n土木"
      font: NotoSansJP 900 / 280px
      color: white
      lineHeight: 0.9
      align: center, y: 380
  - sub:
      text: "施工管理技士"
      font: NotoSansJP 700 / 60px
      color: onDark.secondary
      align: center, y: 880
```

### Story-01: Hero

```yaml
bg: warmRed.primary (#D9533F)
layout:
  - eyebrow:
      text: "1級土木施工管理技士"
      font: NotoSansJP 700 / 40px
      color: onDark.secondary
      y: 280
  - title:
      text: "合格ノートを\n無料公開中"
      font: NotoSansJP 900 / 140px
      color: white
      lineHeight: 1.05
      y: 460
  - bulletList:
      font: NotoSansJP 700 / 44px
      color: white
      lineGap: 28
      y: 1080
      items:
        - "・過去問 R3〜R7 解説"
        - "・キーワード索引 34章"
        - "・直前対策 2026"
  - cta:
      text: "タップで開く →"
      font: NotoSansJP 700 / 48px
      color: white
      align: center, y: 1560
linkSticker:
  label: "1級土木 入口"
  url: https://doboku-note.com/docs/civil-construction-1-keyword-2026?utm_source=ig&utm_medium=highlight&utm_campaign=civil&utm_content=hero
```

### Story-02: 直前対策ピックアップ

```yaml
bg: surface.page (#FFFFFF)
layout:
  - brandBar:
      side: top, width: 1080, height: 14
      color: warmRed.primary
  - eyebrow:
      text: "PICK UP"
      font: Manrope 800 / 32px / letterSpacing 0.12
      color: warmRed.primary
      y: 220
  - title:
      text: "直前対策 2026"
      font: NotoSansJP 900 / 100px
      color: ink.strong
      y: 320
  - description:
      text: "試験 30 日前から\n何をすればよいか\nを逆算で整理"
      font: NotoSansJP 500 / 44px
      color: ink.body
      lineHeight: 1.6
      y: 560
  - visualPlaceholder:
      box: y 880–1380, width 1080-144=936（左右マージン 72）
      content: "guide-last-minute-2026 ページのスクショ or 過去問サムネを配置"
  - cta:
      text: "リンクで全文 →"
      font: NotoSansJP 700 / 48px
      color: warmRed.primary
      align: center, y: 1560
linkSticker:
  label: "直前対策ガイド"
  url: https://doboku-note.com/docs/civil-construction-1-guide-last-minute-2026?utm_source=ig&utm_medium=highlight&utm_campaign=civil&utm_content=last-minute
```

---

## ② pe-comprehensive（技術士総監）

### Cover (1080×1080)

```yaml
bg: brand.default.primary (#1858B5)
layout:
  - eyebrow:
      text: "doboku-note"
      font: Manrope 800 / 36px
      color: onDark.secondary
      align: center, y: 140
  - title:
      text: "総監"
      font: NotoSansJP 900 / 380px
      color: white
      align: center, y: 380
  - sub:
      text: "技術士・総合技術監理"
      font: NotoSansJP 700 / 48px
      color: onDark.secondary
      align: center, y: 880
```

### Story-01: Hero

```yaml
bg: brand.default.primary (#1858B5)
layout:
  - eyebrow:
      text: "技術士・総合技術監理部門"
      font: NotoSansJP 700 / 36px
      color: onDark.secondary
      y: 280
  - title:
      text: "5管理 × 過去問\n完全網羅"
      font: NotoSansJP 900 / 130px
      color: white
      lineHeight: 1.05
      y: 460
  - statCards:
      layout: horizontal, gap 48, centered, y 1020
      cardStyle:
        bg: onDark.subtleBg (rgba(255,255,255,0.08))
        border: onDark.subtleLine
        radius: 16
        padding: [28, 36]
      items:
        - { num: "640", numFont: "Manrope 800 96px", unit: "問", unitFont: "NotoSansJP 700 36px", label: "PRACTICE", labelFont: "Manrope 700 22px" }
        - { num: "5",   numFont: "Manrope 800 96px", unit: "管理", unitFont: "NotoSansJP 700 36px", label: "SCOPE",    labelFont: "Manrope 700 22px" }
  - cta:
      text: "タップで開く →"
      font: NotoSansJP 700 / 48px
      color: white
      align: center, y: 1560
linkSticker:
  label: "総監対策 入口"
  url: https://doboku-note.com/docs/pe-comprehensive-management-whitepaper-study-map?utm_source=ig&utm_medium=highlight&utm_campaign=pe-cem&utm_content=hero
  _verifyUrl: "whitepaper-study-map が総監 hub として最適か要確認（他候補なければこのまま）"
```

### Story-02: 5 管理 早見

```yaml
bg: surface.page (#FFFFFF)
layout:
  - brandBar:
      side: top, width: 1080, height: 14
      color: brand.default.primary
  - eyebrow:
      text: "5 MANAGEMENT"
      font: Manrope 800 / 32px / letterSpacing 0.12
      color: brand.default.primary
      y: 220
  - title:
      text: "5管理 早見表"
      font: NotoSansJP 900 / 100px
      color: ink.strong
      y: 320
  - list:
      font: NotoSansJP 800 / 56px
      color: ink.strong
      gap: 36
      y: 560
      items:
        - "経済性管理"
        - "人的資源管理"
        - "情報管理"
        - "安全管理"
        - "社会環境管理"
  - cta:
      text: "全マネジメント解説 →"
      font: NotoSansJP 700 / 48px
      color: brand.default.primary
      align: center, y: 1560
linkSticker:
  label: "5管理 解説"
  url: https://doboku-note.com/docs/pe-comprehensive-management-whitepaper-study-map?utm_source=ig&utm_medium=highlight&utm_campaign=pe-cem&utm_content=5mgmt
```

---

## ③ note-free（note 無料）

### Cover (1080×1080)

```yaml
bg: teal.primary (#0F766E)
layout:
  - eyebrow:
      text: "FREE"
      font: Manrope 800 / 56px / letterSpacing 0.18
      color: onDark.secondary
      align: center, y: 140
  - title:
      text: "無料\nnote"
      font: NotoSansJP 900 / 280px
      color: white
      lineHeight: 0.9
      align: center, y: 380
  - sub:
      text: "完全公開"
      font: NotoSansJP 700 / 60px
      color: onDark.secondary
      align: center, y: 880
```

### Story-01: M2 完全無料

```yaml
bg: teal.primary (#0F766E)
layout:
  - eyebrow:
      text: "完全無料"
      font: NotoSansJP 700 / 40px
      color: onDark.secondary
      y: 280
  - title:
      text: "白書R7 完全対応\n34,000 字"
      font: NotoSansJP 900 / 130px
      color: white
      lineHeight: 1.05
      y: 460
  - description:
      text: "国土交通白書 × 5管理\n× 過去問適用の決定版\nリード磁石として無料公開"
      font: NotoSansJP 500 / 44px
      color: onDark.secondary
      lineHeight: 1.6
      y: 980
  - cta:
      text: "note で読む →"
      font: NotoSansJP 700 / 48px
      color: white
      align: center, y: 1560
linkSticker:
  label: "白書R7 無料記事"
  url: https://note.com/dobokunote/n/n60efbccd728b?utm_source=ig&utm_medium=highlight&utm_campaign=note-free&utm_content=m2
```

### Story-02: なぜ無料か（信頼形成）

```yaml
bg: surface.page (#FFFFFF)
layout:
  - brandBar:
      side: top, width: 1080, height: 14
      color: teal.primary
  - eyebrow:
      text: "WHY FREE"
      font: Manrope 800 / 32px / letterSpacing 0.12
      color: teal.primary
      y: 220
  - title:
      text: "なぜ無料公開？"
      font: NotoSansJP 900 / 100px
      color: ink.strong
      y: 320
  - body:
      text: |
        白書 R7 は試験頻出。
        まず無料記事で
        品質を確かめてから
        有料マガジンを
        検討してください。
      font: NotoSansJP 500 / 44px
      color: ink.body
      lineHeight: 1.65
      maxChars: 18
      y: 560
  - quoteBlock:
      text: "「無料でここまで読める」を約束"
      font: NotoSansJP 800 / 40px
      color: teal.deep
      bg: teal.tint (#E6F3F1)
      padding: [24, 32]
      radius: 16
      y: 1280
  - cta:
      text: "まず無料記事を →"
      font: NotoSansJP 700 / 48px
      color: teal.primary
      align: center, y: 1560
linkSticker:
  label: "白書R7 無料記事"
  url: https://note.com/dobokunote/n/n60efbccd728b?utm_source=ig&utm_medium=highlight&utm_campaign=note-free&utm_content=trust
```

---

## ④ note-paid（note 有料）

### Cover (1080×1080)

```yaml
bg: violet.primary (#4338CA)
layout:
  - eyebrow:
      text: "PREMIUM"
      font: Manrope 800 / 56px / letterSpacing 0.18
      color: onDark.secondary
      align: center, y: 140
  - title:
      text: "有料\nnote"
      font: NotoSansJP 900 / 280px
      color: white
      lineHeight: 0.9
      align: center, y: 380
  - sub:
      text: "5 マガジン"
      font: NotoSansJP 700 / 60px
      color: onDark.secondary
      align: center, y: 880
```

### Story-01: 5 マガジン一覧

```yaml
bg: violet.primary (#4338CA)
layout:
  - eyebrow:
      text: "総監記述式 攻略"
      font: NotoSansJP 700 / 40px
      color: onDark.secondary
      y: 280
  - title:
      text: "模範論文\n5 マガジン"
      font: NotoSansJP 900 / 140px
      color: white
      lineHeight: 1.05
      y: 460
  - magazineList:
      font: NotoSansJP 700 / 36px
      color: white
      gap: 22
      y: 1000
      items:
        - "・5管理 テキスト精読ガイド"
        - "・建コン 河川・砂防 5年分"
        - "・ゼネコン 5年分"
        - "・自治体 道路 R3-R7+R8予想"
        - "・R8 予想問題集 6テーマ"
  - cta:
      text: "リンクから一覧へ →"
      font: NotoSansJP 700 / 48px
      color: white
      align: center, y: 1560
linkSticker:
  label: "note 有料マガジン"
  url: https://doboku-note.com/links?utm_source=ig&utm_medium=highlight&utm_campaign=note-paid&utm_content=list
```

### Story-02: 推奨入口（R8 予想）

```yaml
bg: surface.page (#FFFFFF)
layout:
  - brandBar:
      side: top, width: 1080, height: 14
      color: violet.primary
  - eyebrow:
      text: "RECOMMENDED"
      font: Manrope 800 / 32px / letterSpacing 0.12
      color: violet.primary
      y: 220
  - title:
      text: "R8 受験者向け\n推奨入口"
      font: NotoSansJP 900 / 100px
      color: ink.strong
      lineHeight: 1.1
      y: 320
  - description:
      text: |
        令和 8 年度 総監記述式
        R8 予想問題集
        6 テーマ × 模範論文
      font: NotoSansJP 500 / 44px
      color: ink.body
      lineHeight: 1.6
      y: 600
  - highlightCard:
      bg: violet.tint (#EEEDFB)
      border: violet.line
      radius: 18
      padding: [32, 40]
      y: 1080
      content:
        - { text: "自治体 道路担当", font: "NotoSansJP 800 40px", color: violet.deep }
        - { text: "R3-R7 + R8予想 セット", font: "NotoSansJP 700 32px", color: ink.body }
  - cta:
      text: "/links から開く →"
      font: NotoSansJP 700 / 48px
      color: violet.primary
      align: center, y: 1560
linkSticker:
  label: "R8 予想問題集"
  url: https://doboku-note.com/links?utm_source=ig&utm_medium=highlight&utm_campaign=note-paid&utm_content=r8-forecast
```

---

## ⑤ youtube（YouTube）

> [!warning]
> **ブロッカー**: 現状 `src/config/author.ts` に YouTube チャンネル URL が未登録。チャンネル開設後 `youtubeUrl: "https://youtube.com/@..."` を追加してから Link Sticker URL を埋める。チャンネル開設前は本ハイライトを保留し 4 枠運用とする。

### Cover (1080×1080)

```yaml
bg: ink.strong (#14191F)
layout:
  - eyebrow:
      text: "VIDEO"
      font: Manrope 800 / 56px / letterSpacing 0.18
      color: onDark.secondary
      align: center, y: 140
  - playIcon:
      text: "▶"
      font: Manrope 800 / 480px
      color: white
      align: center, y: 320
  - sub:
      text: "YouTube"
      font: Manrope 800 / 80px / letterSpacing -0.01
      color: white
      align: center, y: 880
```

### Story-01: Channel Intro

```yaml
bg: ink.strong (#14191F)
layout:
  - eyebrow:
      text: "YouTube"
      font: Manrope 800 / 40px / letterSpacing 0.12
      color: onDark.secondary
      y: 280
  - title:
      text: "解説動画\n配信中"
      font: NotoSansJP 900 / 140px
      color: white
      lineHeight: 1.05
      y: 460
  - description:
      text: |
        過去問解説 × 短尺
        試験前日の見返しに
      font: NotoSansJP 500 / 44px
      color: onDark.secondary
      lineHeight: 1.6
      y: 1000
  - cta:
      text: "チャンネル登録 →"
      font: NotoSansJP 700 / 48px
      color: white
      align: center, y: 1560
linkSticker:
  label: "YouTube チャンネル"
  url: "{YOUTUBE_CHANNEL_URL}?utm_source=ig&utm_medium=highlight&utm_campaign=youtube&utm_content=channel"
  _blocker: "src/config/author.ts に youtubeUrl 追加 → このプレースホルダを差替え"
```

---

## 着手順序（推奨）

| 順 | ハイライト | 理由 | 流用素材 |
|---|---|---|---|
| 1 | ④ note-paid | 既存 magazine cover 流用で最短起動 | `src/lib/note-magazines.ts` の cover URL |
| 2 | ③ note-free | リード磁石は流入起点として最重要 | M2 記事の図版 |
| 3 | ② pe-comprehensive | 既存 5管理コンテンツの流用が効く | IG カルーセル `{exam}/exam-packs/**/00-cover.png` |
| 4 | ① civil-construction | keyword-2026 / guide-last-minute-2026 のスクショ流用 | サイトの該当ページ |
| 5 | ⑤ youtube | チャンネル開設後に保留解除 | — |

## 検証チェックリスト

- [ ] 各 Link Sticker URL に UTM フルセット（source/medium/campaign/content）が入っているか
- [ ] Cover 画像は中央 700×700 内に主要素が収まり、円形トリミング後も読めるか
- [ ] フォントが NotoSansJP（日本語）/ Manrope（数字・英字）の token 準拠か
- [ ] Story の y:0–250 と y:1620–1920 に重要テキストを置いていないか（IG UI で隠れる）
- [ ] M2 完全無料 URL（`n60efbccd728b`）が最新か `src/app/links/page.tsx` で確認
- [ ] ② pe-comprehensive の Link Sticker URL（`whitepaper-study-map`）が総監 hub として最適か
- [ ] ⑤ youtube のチャンネル URL が `src/config/author.ts` に追加されているか

## 次フェーズへの移行条件

Level 2（このドキュメント）→ Level 3（自動 PNG 生成）に移行する条件:

1. このスペックで Canva 等で実画像化し、5 ハイライトをすべて投稿
2. 1 ヶ月運用して「どのハイライトが効くか」「コピーは妥当か」を GA4 で確認
3. 差し替え頻度が月 1 回以上になる場合に、`sns-common` の renderer を 1080×1920 対応に拡張して自動生成化（Level 3）
