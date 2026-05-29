---
title: R2 コンテンツ読みフォールバック撤去（リファクタ計画）+ 2026-05-29 セッション保留事項
---

# R2 コンテンツ読みフォールバック撤去 + セッション保留事項

2026-05-29 セッションの調査で判明した「アプリの R2 コンテンツ読みは不要（デッド）」という結論と撤去手順、および同セッションで未コミットのまま保留している作業をまとめる。

---

## 1. 結論：アプリの R2 コンテンツ読みは撤去できる

> [!important] 核心
> コンテンツ（`.local/r2/posts`）は **全 840 mdx が git 追跡**されており、ローカル・CI のどの環境でもチェックアウト時に必ず存在する。アプリの実コンテンツ lib `docs.ts` は **常にローカルファイル優先**で読むため、**R2 フォールバックには到達しない**。`npm run dev` も `npm run build`（CI）も R2 を読んでいない。

### 根拠（調査結果）

- `.local/r2/posts` の mdx: **840/840 が git 追跡**（未追跡 0）。`git ls-files ".local/r2/posts/**/*.mdx" | wc -l` = 840。
- `src/lib/docs.ts`（11 箇所が import = 実コンテンツ lib）は `if (fs.existsSync(localContentDirectory))` でローカル優先、R2 は「ローカルが無い時のフォールバック」。ローカルが常在するため未到達。
- `src/lib/mdx.ts`（`NODE_ENV=production` で R2 無条件読みの別 lib）は **どこからも import されていない＝デッドコード**（`getAllPosts`/`getPostData` 等は mdx.ts 内自己参照のみ）。
- `src/lib/r2-client.ts`（`getS3Client`）の利用元は `docs.ts`（未到達）と `mdx.ts`（デッド）だけ。
- 実機検証: `.env.local` から R2 creds を完全に外して `npm run dev` を起動 → docs ページ（トップ / PE キーワード / civil-2）すべて **200**。R2 不要を確認済み。

> [!note] 由来の推測
> 旧くは R2 がコンテンツの真実源で、後から `.local/r2/posts` を git 管理へ移した際に R2 読みコードを消し忘れた名残と思われる（要 git 履歴確認）。

---

## 2. 撤去手順（リファクタ計画）

> [!todo] R2 コンテンツ読み撤去（独立タスク・PR 必須）
> 1. `src/lib/mdx.ts` を削除（デッドコード）
> 2. `src/lib/docs.ts` の R2 フォールバック分岐を削除し、ローカル読みのみに
>    - 対象関数: `getDoc` / `getAllDocSlugs` / `getDocMeta` の `getS3Client()` 呼び出し + `GetObjectCommand`/`ListObjectsV2Command`/`getS3Client` import
> 3. `src/lib/r2-client.ts` を削除（上記 2 つが消えれば未使用）
> 4. `@aws-sdk/client-s3` の依存は **残す**（`.claude/scripts/upload-images-to-r2.mjs` / `.claude/skills/dev/diff-r2/scripts/diff-r2.mjs` が独自に S3Client を生成して使用）
>
> 完了条件: `npm run build` が R2 env 無しで通る + `curl` で docs が 200。

### 効果
- アプリ（dev/build）が R2 env から完全独立 → `.env.local` の R2 削除が無条件で安全に。
- 挙動が「ローカル読みのみ」で理屈どおりになり、本ドキュメントのような混乱が起きなくなる。

---

## 3. 着手前の制約・確認

> [!warning] 今すぐ着手しない
> - これはコンテンツ読み込みの**中核リファクタ**。`docs.ts` は 11 箇所が依存。撤去後は **ローカル `npm run build` の通過確認が必須**。
> - 着手時点で別セッションが `feature/magazine-to-pdf-skill` ブランチ・同一作業ツリーで稼働していた。`src/lib/*` 編集は衝突リスク大 → **並行セッション完了後**に着手。
> - 性質上 **feature ブランチ + PR（base=develop）**。

> [!todo] 撤去前チェック
> - git 履歴 / `docs/reference/data-storage-decision.md` で「R2 読みが必要だった理由」を一瞥し、隠れた依存（iOS/Obsidian パイプラインが R2 にだけ push する等）が無いことを確定する。

---

## 4. 同セッションの保留作業（未コミット）

> [!important] 保留中の未コミット作業（branch: feature/magazine-to-pdf-skill 上）
> ユーザー判断で「保留（C）」。並行セッション完了後、**①②を明示パスで別コミット/別ブランチ化**する。並行作業（magazine-to-pdf スキル: commit `84db3c063`）には触れない。

- **① サイドバー画像オンリー化（UX）**
  - `src/app/docs/[...slug]/page.tsx`（画像オンリー描画 / 汎用キーワードページは `/links` 誘導バナー / アフィリは有料マガジン同居時のみ非表示）
  - `src/components/ui/MagazineSidebarCard/MagazineSidebarCard.tsx`（画像オンリー汎用カードに書換え）
  - `src/lib/magazine-placement.ts`（個別キーワードの sidebar を空に）
  - `src/lib/note-magazines.ts`（`sidebarImageUrl` 追加）
  - `scripts/generate-magazine-sidebar-banners.mjs`（新規・300×250 バナー生成）
  - `public/images/magazines/*-sidebar.{png,webp}`（6 マガジン分 = 12 ファイル）
- **② R2 運用修正**
  - `.claude/scripts/upload-images-to-r2.mjs`（失敗時 exit 1 + Windows パス区切り正規化）
  - `.github/workflows/r2-audit.yml`（新規・週次で diff-r2 監査、未同期/サイズ不一致/認証失敗で赤落ち）

---

## 5. 解決済み: R2 トークン失効インシデント（背景）

> [!note] 経緯（解決済み）
> R2 トークンが少なくとも 2026-05-16 から `Unauthorized`。`upload-images-to-r2.mjs` が個別失敗を握りつぶし exit 0 → `r2-sync` が「success」表示のまま約 2 週間 `Uploaded: 0`。結果、失効後に追加した画像（civil-construction-2 図版 47 枚等）が R2 未同期で本番 404。
>
> **対応済み**: ユーザーが Cloudflare で R2 トークン再発行 + GitHub Secrets 更新 → `gh workflow run r2-sync.yml` で再同期（`Uploaded: 2647, Failed: 0`）。本番画像 200 確認済み。再発防止に upload スクリプト exit 1 化（§4②）。

> [!warning] .env.local の現状
> アプリは R2 不要（§1）と判明したため、`.env.local` は R2/GSC/PSI を全てコメントアウト済み。`npm run dev` は検証済みで動作。GSC/PSI はメトリクス取得を CI 任せにしているため不要。
