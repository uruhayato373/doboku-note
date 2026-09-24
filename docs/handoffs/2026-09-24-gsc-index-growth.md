# 引き継ぎ：GSC の登録済みページを増やす作業（ローカルで再開）

> [!note]
> **2026-09-24 時点**：PR #597〜#600 は develop にマージ済み・**main（本番）には未反映**。
> 残りのタスクは backlog の DN-0287 / DN-0291 / DN-0292 にある。この文書は再開手順と順番だけで、
> 手順を終えたら削除する（記録は git 履歴と `gsc-management.md` の 2026-09-24 エントリ）。

## ローカルで再開する

```bash
git switch develop
git pull origin develop
npm run check-note-site-utm                    # note 原稿の旧 /docs リンク 0 件（旧 URL は error になった）
npm run check-playwright-auth-wiring:strict    # google.request-indexing の配線
```

依存パッケージの追加は無い（`package.json` は scripts に `fix-legacy-site-links` を足しただけ）。
`node_modules` が無い場合だけ `npm install --legacy-peer-deps`。

## 次にやる順番

1. **`/deploy`（develop → main）**。本番に出るもの：
   - `/standards/` の逐語分冊 part-N を sitemap に復帰（sitemap 約 1,435 → 1,568 件）
   - `sitemap-legacy.xml`（旧 `/docs` 1,312 件・robots.txt に掲載・2026-11-30 で自動終了）
   - `gsc-request-indexing.yml`（self-hosted runner 未設定の間は警告だけで何もしない）

   deploy 後に `npm run check-production-ssr` が exit 0、`https://doboku-note.com/robots.txt` の末尾に `sitemap-legacy.xml` の行があること、本番 sitemap の `<loc>` が約 1,568 件であることを見て **DN-0287** を閉じる。
2. **DN-0292**：note 674 本の本文を再公開（`ops-write.yml` の `note.update-body`）。外向きの大量更新なので本数・間隔・順番を決めてから。`配合計算-実戦演習` は本番で 404 のリンクが 2 本あるので先に。
3. **DN-0291**：Mac を self-hosted runner に登録し、`google.request-indexing` の `selfHostedRunsOn` を設定して試験運転 2 回。workflow は main 版で動くので 1 の後。

## 注意

> [!warning]
> registry（`playwright-auth-profiles.json`）の google を **`enabled:true` にしない**。hosted runner の `login-collectors.yml` が Google の認証を復元し、Google が Mac 側まで全面失効させる（2026-09-21 実測・`measurement-incidents.md`）。登録リクエストの CI は self-hosted runner 限定の別経路（`gsc-request-indexing.yml`）で動かす。

- note 原稿に旧 `https://doboku-note.com/docs/...` を書くと pre-commit で止まる。張り替えは `npm run fix-legacy-site-links -- --write`（UTM は保持）。
- X の予約済み投稿（`status.json`）は旧 URL のまま残している（承認 hash を壊さないため）。`check-x-utm` は警告だけ出す。
- 次の週次計測（`index-coverage.yml`・水曜）は sitemap が増えた分だけ indexed_ratio が数 pt 下がる見込み。part-N を除いた `/exam/` の索引率で比べる。
