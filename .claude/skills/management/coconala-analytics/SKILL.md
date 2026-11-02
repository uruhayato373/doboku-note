---
name: coconala-analytics
description: >
  ココナラ「サービス・ブログ分析」の収集済み記録（kpi.json・analytics.json）を読んで報告し、鮮度・欠測を検査する（読み取り専用・数値は累計）。Use when user asks to [ココナラの数字を見る, 閲覧数を確認, /coconala-analytics].
user-invocable: true
domain: product
---

# /coconala-analytics — ココナラ分析の記録を読む

真実源は [coconala-operations.md §4](../../../knowledge/reference/coconala-operations.md)。
このファイルには手順だけを書く。

## 前提

- **取得は土曜の Mac 収集（`weekly-collect` の coconala 段）だけ**。セッションではログインしない・ブラウザを開かない（`coconala-analytics` はセッションでは動かない）
- 取得側は収益アカウント。`assertAccount`（sellerName=dobokunote）を全操作の前に通す read-only（メモ追加・期間変更・出品操作はしない）

## 手順

1. `data/coconala/analytics.json` の取得日と `data/coconala/kpi.json` の最新 `weekOf` を読み、**最終取得日を報告の冒頭に書く**
2. 古い（`npm run check-coconala-analytics` が鮮度で FAIL）、または空なら、数値を埋めず **「未取得」** と書く。取り直しは次の土曜の収集を待つか、運営者が収集用 worktree（`.claude/worktrees/weekly-collect`）の端末で `node scripts/weekly-collect.mjs --only coconala` を実行する
3. 鮮度以外の検査（欠測・マスク値・kpi.json 整合）は読み取りだけで確かめられる

```bash
npm run check-coconala-analytics             # 鮮度・欠測・マスク値・kpi.json 整合（記録を読むだけ）
```

運営者が取り直すときのフラグ（収集用 worktree の端末）: `--no-services`（全体＋ブログのみ）／`--headless`／`--append-kpi` なしなら snapshot のみ。

出力は `data/coconala/analytics.json`（実体）と
`data/coconala/kpi.json` の `weekly` / `blogsWeekly`（週次台帳・`weekOf`+`serviceId` で upsert＝再実行しても二重計上しない）。

## 読み方（ここを間違えると数字が嘘になる）

1. **累計であって週次増分ではない**。画面の既定は「過去30日間」のローリング累計。
   `weekly` 行の `cumulative: true` と `period` はそのための印で、前週との引き算をしてはいけない。
2. **`0000` は 0 ではない**。セラーサクセス未加入の「表示数」はマスク表示。`null` + `masked` で記録する。
   検査は「マスクなのに 0 で記録されている」を FAIL にする。
3. **`ok:false` は 0 件ではなく欠測**。取得できなかったサービスは数値を書かない。
4. 数値はココナラ側で**午前0〜1時頃に更新**される。当日分は未確定。

## 取得対象

- 全体累計（`/mypage/analytics`）: 表示数（マスク）/ 閲覧数 / 販売数 / 販売額 / お気に入り数
- サービス別（`/mypage/analytics/{n}`・`{n}` はカタログ `serviceUrl` の数値と同一）: 表示数 / 閲覧数 / 販売数 / お気に入り数
- ブログ別（同一ページ内 `.c-blogs`）: 閲覧数 / 公開状態 / 投稿日

**対象は `listed` のサービスだけ**。アーカイブ済み（`paused`）は分析ページが構造的に存在せず、
失敗に数えると毎回赤いゲートになる（＝赤が意味を失う）。除外は `skipped` として snapshot に残す。

## ガードレール

1. **partial を成功と呼ばない**。1件でも取れなければ exit 2。件数は必ず「対象 N / 取得 M / 除外 K」で報告する
2. **listed なのに分析ページが無い**のは異常。出品がライブに実在しない（アーカイブ/削除）疑いなので、
   公開ページ（`serviceUrl`）を実査してカタログ status を是正する。検査はこれを名指しで FAIL にする
3. **推測で埋めない**。読めない値は `null`
4. UI が変わって selector が効かないときは、盲目的に新しい selector を作らず probe（read-only）してから直し、
   結果を operations.md §4 に追記する

## 完了条件

- 報告に最終取得日が書かれている（古ければ「未取得」と明記）
- `npm run check-coconala-analytics` が exit 0（または FAIL の内容がカタログ側の是正待ち・取得待ちとして報告されている）

## 参照

- 収集（土曜の Mac 収集が呼ぶ）: `scripts/coconala-analytics.mjs`（`npm run coconala-analytics`）
- 検査: `scripts/check-coconala-analytics.mjs`（`npm run check-coconala-analytics`）
- 運用 SSOT: [coconala-operations.md](../../../knowledge/reference/coconala-operations.md) §2.4 / §4
- 隣接スキル: `/coconala-status`（撤退ライン判定・受注突合）・`/coconala-publish`（出品操作）・`/coconala-blog`（ブログ執筆・公開）
