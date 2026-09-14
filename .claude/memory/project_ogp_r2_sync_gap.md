---
name: project_ogp_r2_sync_gap
description: OGP画像(ogp.png)はr2-syncのpathフィルタ外で自動同期されず、未生成カテゴリはog:image 404→note/X等の外部リンクカードが生成不能になる。生成は手動npm run ogp、R2反映は手動r2-sync workflow_dispatch
metadata: 
  node_type: memory
  type: project
  originSessionId: 6b6cce1e-6731-49c0-9a22-10d48494c061
---

note/X/Facebook 等の**外部リンクカードが生成されない**原因の典型は、doboku-note 側の **og:image が R2 で 404**（ページ HTML・OGP テキストタグは 200 で正常でも、画像アセットだけ欠落）。Cloudflare ボットブロックは無関係（全 UA で HTML 200 を実測確認、2026-06-12）。

**パイプラインの2つの落とし穴（2026-06-12 技術士建設部門で発覚・修正）:**

1. **OGP 生成は手動**: `ogp.png` は `.local/r2/posts/{category}/{localSlug}/ogp.png` に `npm run ogp -- --all`（`.claude/skills/conversion/ogp-create/`）で生成。新規カテゴリ/記事追加時に走らせないと 0 枚のまま。`published:false` のドラフトはスキップ仕様。pe-construction(114)/civil-2(31)/concrete系/pe-first-stage が 0 枚だった。

2. **R2 同期の path フィルタが ogp を拾わない（核心）**: R2 アップロードは `cloudflare-deploy.yml` ではなく専用 `r2-sync.yml`（`npm run upload-images-r2`）。push トリガーの path フィルタが旧 `**/img/**` 限定で、`ogp.png` は記事ディレクトリ直下（img/ の外）のため **push しても自動同期されない**。既存カテゴリの OGP は過去の手動同期で上がっていただけ。→ 2026-06-12 にフィルタへ `**/ogp.png`/`**/ogp.webp` を追加して再発防止（commit b33430063、次回 deploy で main 反映）。

**予防ゲート（2026-06-12 新設）**: `npm run check-ogp-coverage`（`scripts/check-ogp-coverage.mjs`）が published:true 記事の ogp.png 欠落を slug 解決で検知し exit 1。`r2-audit.yml`（週次+手動・main checkout）に組込済＝未生成を能動検知（diff-r2 が見れない穴を埋める）。新カテゴリ追加手順は exam-content-policy.md Part4 step7。

**手動復旧手順**（会社PCはプロキシでR2 S3 API遮断＝ローカルupload不可）:
- 生成: `npm run ogp -- --all`（既存スキップ）→ 新規 ogp.png のみ pathspec commit。
- R2反映: `gh workflow run r2-sync.yml -f dry_run=false -f images_only=true`（path フィルタ無視で全画像 upload、既存も再upload するが冪等）。
- 検証: `curl --ssl-no-revoke --retry 5 -A facebookexternalhit/1.1 .../ogp.png` が 200。プロキシ 407/000 はノイズなので retry 必須。

関連: [[feedback_metrics_cicd_supplied]]（R2/計測は CI 供給が正・ローカル creds 不要）、[[feedback_deploy_mechanics_parallel_safe]]（ff昇格は origin ref 同士）。真実源: docs/reference/measurement-incidents.md（公開エンドポイントの3到達性）。
