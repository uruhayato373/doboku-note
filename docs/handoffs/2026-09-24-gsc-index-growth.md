# 引き継ぎ：GSC の登録済みページを増やす作業（ローカルで再開）

> [!note]
> **2026-09-24 時点**：PR #597〜#600 は develop にマージ済み・**main（本番）には未反映**。launchd（`gsc-local`）と sitemap の API 送信は別 PR（`feature/gsc-local-routine`）。
> 残りのタスクは backlog の DN-0287 / DN-0292 / DN-0293 にある。この文書は再開手順と順番だけで、
> 手順を終えたら削除する（記録は git 履歴と `gsc-management.md` の 2026-09-24 エントリ）。

## ローカルで再開する

```bash
git switch develop
git pull origin develop
npm run check-note-site-utm                    # note 原稿の旧 /docs リンク 0 件（旧 URL は error になった）
npm run check-gsc-sitemaps                     # sitemap の送信・読み込み状況（金曜の fetch-metrics が記録するまでは「記録が無い」で DUE）
```

依存パッケージの追加は無い（`package.json` は scripts を足しただけ）。`node_modules` が無い場合だけ `npm ci`
（`.npmrc` に legacy-peer-deps を入れたので素の `npm ci` が通る・#601）。

## 次にやる順番

1. **`/deploy`（develop → main）**。本番に出るもの：
   - `/standards/` の逐語分冊 part-N を sitemap に復帰（sitemap 約 1,435 → 1,568 件）
   - `sitemap-legacy.xml`（旧 `/docs` 1,312 件・robots.txt に掲載・2026-11-30 で自動終了）
   - `fetch-metrics.yml` の sitemap 送信（`gsc-sitemaps`）と `weekly-review-guard.yml` の `check-gsc-sitemaps`（workflow 定義は main 版で動く）

   deploy 後に `npm run check-production-ssr` が exit 0、`https://doboku-note.com/robots.txt` の末尾に `sitemap-legacy.xml` の行があること、本番 sitemap の `<loc>` が約 1,568 件であることを見て **DN-0287** を閉じる。
2. **DN-0292**：note 674 本の本文を再公開（`ops-write.yml` の `note.update-body`）。外向きの大量更新なので本数・間隔・順番を決めてから。`配合計算-実戦演習` は本番で 404 のリンクが 2 本あるので先に。
3. **DN-0293**：Mac に `npm run gsc-local:install`（launchd・毎日 10:30）を入れ、`-- --run-now` で登録リクエストと develop への push を確かめる。self-hosted runner はこのリポジトリが公開のため使わない。

## 注意

> [!warning]
> registry（`playwright-auth-profiles.json`）の google を **`enabled:true` にしない**。hosted runner の `login-collectors.yml` が Google の認証を復元し、Google が Mac 側まで全面失効させる（2026-09-21 実測・`measurement-incidents.md`）。ログインが要る GSC 作業は Mac の launchd `gsc-local` で回す。

- note 原稿に旧 `https://doboku-note.com/docs/...` を書くと pre-commit で止まる。張り替えは `npm run fix-legacy-site-links -- --write`（UTM は保持）。
- X の予約済み投稿（`status.json`）は旧 URL のまま残している（承認 hash を壊さないため）。`check-x-utm` は警告だけ出す。
- 次の週次計測（`index-coverage.yml`・水曜）は sitemap が増えた分だけ indexed_ratio が数 pt 下がる見込み。part-N を除いた `/exam/` の索引率で比べる。
