# 2026-05-17 LCP 真因診断と改善ロードマップ

## 背景
W18 GSC で site root の **field LCP = 4978ms**（Core Web Vitals "Poor"）。`next/font` は既に全削除済み（2026-04-29、`src/app/layout.tsx:2-6` コメント参照）で、フォント削減カードは使い果たし。次の改善経路を特定する必要があった。

## 計測ベースライン
- **直近 lab LCP**: 1927ms（`psi-single-2026-04-29T09-16-49.json`）
- **field LCP**: 4978ms（CrUX、28 日移動平均、低速回線含む）

→ lab と field の乖離 = 実ユーザーは LCP 候補画像が表示されるまで体感 5 秒待っている

## 真因仮説（優先度順）

### 仮説 A: AdSense afterInteractive ロード（最有力）
- **証拠**: `src/components/AdSenseScript.tsx:9` で `strategy="afterInteractive"`
- **問題**: 
  - インタラクティブ可能後すぐに `pagead2.googlesyndication.com` へ接続
  - 3rd-party origin への DNS + TLS + JS 取得が main thread を占有
  - LCP 候補画像のデコード/レンダリングが後回しになり field LCP 悪化
- **施策**: `strategy="lazyOnload"` に変更
  - ページロード完了 (window.load) 後に AdSense 読込開始
  - LCP 計測タイミング後に発火するため field LCP が大幅改善見込み
  - **副作用**: 広告表示が約 1-2 秒遅れる → 初回スクロール前の広告露出が減る可能性
  - **対策**: 折り返し下の広告のみ lazy 化、above-the-fold 広告は別途検討

### 仮説 B: `images.unoptimized: true`（中影響）
- **証拠**: `next.config.mjs:10` で `images.unoptimized: true`
- **問題**:
  - Next.js の画像最適化（WebP/AVIF 自動変換・サイズ別配信）が無効
  - LCP 候補画像が R2 から PNG/JPEG のまま配信され、転送量が大きい
- **施策**: 
  - `unoptimized: false` 化を検討（Cloudflare Pages との互換性確認必須）
  - 代替: R2 側で WebP/AVIF を事前生成（既に `generate-webp` スクリプトあり）→ 確実に WebP 配信されているか手動検証

### 仮説 C: hero 画像に `fetchpriority="high"` 不在（小影響）
- **確認方法**: 各 `<Image>` コンポーネントで LCP 候補画像に `priority` prop が付与されているか
- **施策**: site root / category top の hero 画像に `priority` を付与

## 推奨実装ロードマップ

### Step 1: AdSense lazyOnload 化（最小変更で最大効果）
**変更ファイル**: `src/components/AdSenseScript.tsx`

```diff
- strategy="afterInteractive"
+ strategy="lazyOnload"
```

または環境変数フラグで切替可能化:

```tsx
strategy={process.env.NEXT_PUBLIC_ADSENSE_EAGER === "1" ? "afterInteractive" : "lazyOnload"}
```

**期待効果**: field LCP 4978→3500ms 目標（28 日反映）

### Step 2: 画像配信の検証
```bash
curl -I https://storage.doboku-note.com/<lcp-candidate-image>.webp
# Content-Type: image/webp になっているか
# Cache-Control: max-age=31536000 になっているか
```

WebP 未配信なら `generate-webp` 再実行。

### Step 3: hero 画像 priority 付与
`src/app/page.tsx` および `category/[slug]/page.tsx` の hero `<Image>` に `priority` 追加。

### Step 4: PSI 再計測（28 日後）
- 施策実装 → デプロイ → CrUX 反映待ち
- `npm run fetch-psi-audit` で mobile/desktop ベースライン更新
- field LCP が < 2500ms に下がれば Core Web Vitals "Good" 達成

## ロールバック
- AdSense lazyOnload は環境変数フラグで切替可能化推奨
- 広告収益への悪影響が見られたら `NEXT_PUBLIC_ADSENSE_EAGER=1` で即切戻

## 関連メモリ
- [next-font-render-blocking](../../../.claude/projects/-Users-minamidaisuke-doboku-note/memory/feedback_next_font_render_blocking.md) — フォント既に削除済み
- [dynamic-server-component](../../../.claude/projects/-Users-minamidaisuke-doboku-note/memory/feedback_dynamic_server_component.md) — RSC を dynamic ラップ NG（+62% LCP 悪化実績）

## 次セッションでの実行手順
1. AdSense lazyOnload 切替 PR 作成（環境変数フラグ付き）
2. `images.unoptimized: false` 化の Cloudflare Pages 互換性確認
3. デプロイ後 PSI 計測（lab で即効果確認、field は 2-4 週後）
