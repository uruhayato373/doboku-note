# ハンドオフ: トップ「note有料教材」セクションのヒーロー化（Option B）

作成: 2026-07-07 / 状態: **画像生成待ち（別PCで生成予定）**

## 背景・決定

トップページ最下部の「note有料教材」ブロックは現在**完全テキスト**（Premium eyebrow + 見出し + 1行 + `LinksHubTile`）＝ページ内で一番ビジュアルが弱い。note有料は収益の主エンジンなので、**Option B＝ブランド背景画像＋HTMLの訴求見出し＋琥珀CTAボタン**のヒーローに刷新する。

- 参照イメージ: re-lifework.com/adsense-revenue-chart の「冒頭を強い具体ビジュアルで掴む」原則のみ借用（収益チャートは価値訴求とズレるので中身は使わない）。
- **文字は焼き込まない**（brand-image-system.md の鉄則）＝画像は背景のみ、見出し/ボタンはHTML。
- `/links` は**全資格横断**ハブなので tint は資格色でなく**editorial accent `#2a5f96`**。CTAボタンは HTML で琥珀 `#d4a017`。

## ユーザー作業: Codex で背景画像を生成（プロキシ外の別PCで）

会社PCは社内プロキシが `chatgpt.com/backend-api/codex/responses` を **503 でブロック**（Google API・GitHub GraphQL と同じ遮断）。→ **自宅Wi-Fi / Mac / テザリング等プロキシ外**で生成する。

**保存名**: `~/Downloads/brand-note-hero-wide.png`（別リポに吐かれないよう保存先明示）
**比率**: 2.4:1 wide（approx 2400×1000）。左1/3を明るい余白＝HTML文字ゾーン。

### 推奨プロンプト（教材モチーフ）

```
Clean, modern, LIGHT and airy brand image for a Japanese civil-engineering exam-prep site. Almost-white bright background, soft daylight, subtle translucent blueprint / technical line overlays. Low-contrast, uncluttered, editorial. Gently color-graded toward #2a5f96 (a calm editorial navy-blue). Photorealistic-meets-clean illustration. NO text, no letters, no numbers, no logos, no people, no watermark. Ultra-wide 2.4:1 landscape (approx 2400×1000). Composition: keep the LEFT third almost empty and bright — a clean airy zone reserved for a headline and a button that will be added later in HTML; place the subject in the right two-thirds. Scene: a calm, aspirational premium study still-life for civil-engineering exam preparation — neatly arranged rolled engineering drawings, a clean white hard hat, a drafting triangle and pen, and a tidy stack of plain notebooks and document folders on a bright wooden desk, warm soft side-light, shallow depth of field. All papers and notebooks are completely blank with no readable text.
```

### 代替プロンプト（アスピレーション訴求）

接頭は同一。Scene のみ差替:
```
Scene: an aspirational, serene wide vista of completed Japanese civil infrastructure in soft daylight — a graceful long bridge and a clean roadway curving into the distance under a bright sky, calm and premium, evoking achievement and career growth. Keep the LEFT third bright and open for text.
```

## 生成後: Claude の実装手順（画像が `~/Downloads/` に来たら）

1. webp化 → `public/images/cta-bg/note-hero.webp` へ配置（`src/lib/exam-brand.ts` の cta-bg 系統に倣う）
2. **HTMLオーバーレイ CTA コンポーネント**を新規作成し、`src/app/page.tsx` 最下部の現行「note有料教材」ブロック（`LinksHubTile` の text 版）を置換:
   - 背景 = note-hero.webp（`object-cover`・左1/3に文字）
   - 見出し（案）「記述式・経験記述をここで固める」＋サブ「模範答案集・精読ガイドをまとめています」
   - 琥珀CTAボタン「教材を見る →」・`href="/links"`・**`data-cta="note"`**（AnalyticsProvider 計測に乗る＝note ファネル効率 KPI）
   - design-system.md トークン準拠（生hex禁止・`rounded-card-*`/`shadow-card-*`・dark:border）
3. localhost:3020 で `<main>`＋描画確認 → **feature ブランチ + PR**（base develop・ホームページ＝コード変更のため）
4. **焼き込みバナー回帰はしない**（LinksHubTile が旧 `links-hub-sidebar.webp` を意図的に画像レス化した経緯を尊重＝背景写真＋HTML文字はOK、文字入り焼き込み画像はNG）

## 注意・関連

- **ワークツリー共有中**: 並行セッションが `feature/admin-dashboard`（運営管理画面・commit済 `12042d791`）で作業中。同一 working tree をブランチ切替で共有＝localhost がブランチ次第で揺れる。実装着手時は worktree 分離を検討。
- **PR #379**（guide-cover 写真プール廃止＝猫画像除去・`feat/drop-guide-cover-pool`）が未マージ。同じ `src/app/page.tsx` を触るので、**#379 マージ後にこのヒーロー実装を積む**とコンフリクトを避けられる。
- 真実源: [brand-image-system.md](../reference/brand-image-system.md) §5、[design-system.md](../design-system/design-system.md)、収益KPIは monetization-strategy SKILL の note ファネル効率。
