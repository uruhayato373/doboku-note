# 引き継ぎ：GSC の登録済みページを増やす作業（ローカルで再開）

> [!note]
> **2026-09-24 時点**：PR #597〜#600 と #602（launchd `gsc-local`・sitemap の API 送信・#599 の取り下げ）は 2026-09-24 に main（本番）へ反映済み（part-N の sitemap 復帰も完了）。Search Console のサービスアカウント 2 つは「フル」権限を確認済み。
> 残りのタスクは backlog の DN-0293 / DN-0298 / DN-0300 にある。この文書は再開手順と順番だけで、
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

1. ~~`/deploy`（develop → main）~~ 2026-09-24 済み（本番 sitemap 1,568 件・part-N 133 件・robots.txt に sitemap-legacy.xml・check-production-ssr exit 0）。
2. ~~note の PDF なし 27 本を再公開~~ 2026-09-24 夜に Mac で済み（太字の記号・重複バナー・`配合計算-実戦演習` の 404 を反映）。張り替えだけの 546 本は 301 等価で再公開不要（check-note-republish の 301 等価判定・PR #604）。PDF 付きほか残りは **DN-0300**、旧 URL が正規に選ばれた 17 URL の追跡は **DN-0298**。
3. **DN-0293**：Mac に `npm run gsc-local:install`（launchd・毎日 10:30）を入れ、`-- --run-now` で登録リクエストと develop への push を確かめる。self-hosted runner はこのリポジトリが公開のため使わない。

## 注意

> [!warning]
> registry（`playwright-auth-profiles.json`）の google を **`enabled:true` にしない**。hosted runner の `login-collectors.yml` が Google の認証を復元し、Google が Mac 側まで全面失効させる（2026-09-21 実測・`measurement-incidents.md`）。ログインが要る GSC 作業は Mac の launchd `gsc-local` で回す。

- note 原稿に旧 `https://doboku-note.com/docs/...` を書くと pre-commit で止まる。張り替えは `npm run fix-legacy-site-links -- --write`（UTM は保持）。
- X の予約済み投稿（`status.json`）は旧 URL のまま残している（承認 hash を壊さないため）。`check-x-utm` は警告だけ出す。
- 次の週次計測（`index-coverage.yml`・水曜）は sitemap が増えた分だけ indexed_ratio が数 pt 下がる見込み。part-N を除いた `/exam/` の索引率で比べる。
