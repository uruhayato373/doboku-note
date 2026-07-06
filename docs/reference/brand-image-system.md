---
title: ブランド画像システム（資格別・多フォーマット・色統一）
---

# ブランド画像システム

資格別の「雰囲気写真」を **少数のマスター原版**から全フォーマット（hero / OGP / note カバー / ホームカード / 広告バナー）へ展開し、**サイトの色スキームと統一**する運用の真実源（SSOT）。

> [!note] 設計原則（2 層モデル）
> - **写真＝雰囲気レイヤー**：明るく低コントラスト、資格色へ"ゆるくトーン寄せ"。文字は焼き込まない。
> - **正確な色＝UI トークン**：厳密なブランド色は `--exam-*` 等のトークン（バー/アクセント/CTA）が担う。
> - → 写真は柔らかく調和し、色の主張はトークンで正確に出る。両者を混ぜない。

## 1. 色スキーム SSOT（画像生成の色ターゲット）

真実源は `src/styles/globals.css`。画像は各資格の **dominant tint = 資格色**、**base = 明るく通気感のある地（`--paper` #ffffff / `--bg` #fafafa 相当）**で生成する。

| exam-key | 資格 | dominant tint (light hex) | 系統 |
|---|---|---|---|
| `civil-1` | 1級土木施工管理技士 | `#1e73c8` | 青 |
| `civil-2` | 2級土木施工管理技士 | `#2a7050` | 緑 |
| `pe-comprehensive` | 技術士（総合技術監理）※第一次も共有 | `#16365c` | 濃紺 |
| `pe-construction` | 技術士（建設部門） | `#33356b` | 藍 |
| `concrete-chief` | コンクリート主任技師 | `#0f6e6e` | ティール |
| `concrete-diagnosis` | コンクリート診断士 | `#6e3a8c` | 紫 |

editorial 基調：`--accent #2a5f96` / `--ink #181a1f` / CTA=`--color-warn #d4a017`（琥珀）。（2026-07 Soft Editorial で accent を紺のまま 1 段明るく調整。写真の色ターゲットは `--exam-*` 側で不変のため OGP／カバー等の再生成は不要。）写真には青焼き（technical blueprint）線を淡く重ねるとサイトの図面モチーフと揃う。

## 2. マスター原版（資格ごとに 2 枚）

全フォーマットは 2 つの原版から `object-cover` クロップで賄う（36枚量産しない＝AI のばらつきを避け統一感を保つ）。

| 原版 | 比率 | 生成サイズ目安 | 賄うフォーマット |
|---|---|---|---|
| **wide**（横長）| 2.4:1 | 2400×1000 | hero(2.4:1) / OGP(1.9:1) / note カバー(1.91:1) / ホームカード(16:9) |
| **square**（近正方）| 1.2:1 | 1200×1000 | 広告バナー 300×250(1.2:1) / About 図版 / IG(1:1 は中央クロップ) |

- **クロップ規約**：`object-cover` 中央。**重要被写体は中央〜やや広めに置く**（wide→16:9 は左右トリム、square→1:1 は左右トリム）。文字を置く"余白ゾーン"を上か下に確保。
- **文字は常に非焼き込み**：OGP/note カバーは satori、hero/カードは HTML で重ねる（写真は文字なしで生成）。

## 3. フォーマット → どの原版 → 配置先

| 面 | 比率 | 原版 | 配置先（Claude が変換・配線）|
|---|---|---|---|
| トップ hero | 2.4:1 | wide | `public/images/hero-home.webp` |
| ホームカード | 16:9 | wide | `public/images/card-<category>.webp` |
| OGP 背景 | 1.9:1 | wide | `.claude/config/ogp/backgrounds/<exam-key>.png` |
| note カバー背景 | 1.91:1 | wide | note カバー renderer（フォールバック系に背景配線が前提・未実装）|
| 広告バナー | 300×250 | square | `public/images/ads/<exam-key>-300x250.*`（自社ハウスバナー/ディスプレイ広告用の予備素材。サイト内の note CTA タイルは焼き込み画像を廃し `public/images/cta-bg/<exam>.webp` イラスト＋HTML 文字でデータ駆動＝`src/lib/exam-brand.ts`。2026-07）|

## 4. 生成→保存→反映パイプライン

1. **生成（Codex・ユーザー）**：下記プロンプトで各資格 wide + square を生成。
2. **保存先**：`~/Downloads/` に **`brand-<exam-key>-wide.png` / `brand-<exam-key>-square.png`** の名前で保存（Codex が別リポに吐く癖があるので保存先を明示）。
3. **反映（Claude）**：webp 化 → 上表の配置先へ配線 → **軽いカラーグレード（資格色へのトーン寄せ）で色統一** → OGP/カード/hero を再生成 → 検証 → PR → デプロイ。コストは webp/グレードともローカル無料。

## 5. Codex 生成プロンプト

**全プロンプト共通の接頭**（各シーン文の前に付ける）：

> Clean, modern, LIGHT and airy brand image for a Japanese civil-engineering exam-prep site. Almost-white bright background, soft daylight, subtle translucent blueprint / technical line overlays. Low-contrast, uncluttered, editorial. Gently color-graded toward {TINT}. Photorealistic-meets-clean illustration. NO text, no letters, no numbers, no logos, no people, no watermark. {RATIO}. Scene:

`{RATIO}` は wide=「Ultra-wide 2.4:1 landscape (approx 2400×1000)」、square=「Near-square 1.2:1 (approx 1200×1000), subject centered」。`{TINT}` は上表の hex。

| exam-key / tint | wide シーン | square シーン |
|---|---|---|
| **civil-1** `#1e73c8` | large civil construction site — tall tower cranes and a viaduct under construction with formwork, earthwork in foreground | a single tower crane / bridge pier under construction, centered, plenty of sky |
| **civil-2** `#2a7050` | road embankment under construction with a compaction roller and a small excavator, grassy slope | a compaction roller on a fresh embankment, centered |
| **pe-comprehensive** `#16365c` | elevated panoramic view of integrated infrastructure — roads, a river, bridges and structures seen from above | an aerial view of a single river-crossing bridge and its surroundings, centered |
| **pe-construction** `#33356b` | a signature long-span cable-stayed bridge in soft daylight | the pylon of a cable-stayed bridge, centered, low angle |
| **concrete-chief** `#0f6e6e` | a concrete viaduct with visible concrete surface texture and exposed reinforcing bar | close view of a concrete column with reinforcing bar, centered |
| **concrete-diagnosis** `#6e3a8c` | a concrete structure under inspection — fine surface cracks, maintenance/diagnosis motif | close view of a concrete surface with a hairline crack, centered |

## 6. 運用メモ・未実装

- **note カバーの写真化**：`generate-note-covers.mjs` は OGP と同一 renderer を使うが、mono-tag フォールバック系に `resolveBackgroundImage` を渡す配線が未実装（低工数）。G2 カラーカバー（`cover:` ブロック・マスコット付き）は別デザインで写真化は設計判断。
- **広告 300×250**：AdSense 枠は Google 配信で自画像は載らない。本システムは**自社ハウスバナー/ディスプレイ広告クリエイティブ**用途を想定。
- **pe-first-stage**：OGP は exam-key `pe-comprehensive` を共有。ホームカードのみ独自画像可。
- **再生成トリガー**：背景差替時は OGP 全再生成（`npm run ogp -- --all --force`）。カバー/カードは対応スクリプトで再生成。
- 真実源：色＝`src/styles/globals.css`、OGP 実装＝[ogp-prompts.md](ogp-prompts.md)、写真ポリシー＝[image-policy.md](image-policy.md)。
