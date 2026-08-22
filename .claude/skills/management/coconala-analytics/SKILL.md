---
name: coconala-analytics
description: ココナラ「サービス・ブログ分析」を Playwright で read-only 収集し、kpi-log.json へ週次 upsert するスキル。全体累計（閲覧/販売/販売額/お気に入り）・サービス別（listed 全件を URL 直打ちで走査）・ブログ別閲覧数を analytics-snapshot.json に落とし、check-coconala-analytics で鮮度・欠測・マスク値・kpi-log 整合を検査する。数値は対象期間の累計（既定30日ローリング）であって週次増分ではない。セラーサクセス未加入の表示数は 0000 とマスクされるため null 記録。取得のみで書き込み（メモ追加・設定変更・出品操作）はしない。撤退ライン判定と受注突合は /coconala-status、出品操作は /coconala-publish が担当で守備範囲が異なる。Use when user asks to [ココナラの数字を取る, ココナラKPIを自動取得, ココナラ分析を記録, 閲覧数を記録, /coconala-analytics].
user-invocable: true
---

# /coconala-analytics — ココナラ分析の自動取得と記録

真実源は [coconala-operations.md §4](../../../knowledge/reference/coconala-operations.md)。
このファイルには手順だけを書く。

## 前提

- **実行はローカルのみ**（ログイン済みプロファイル `.local/playwright-coconala-profile` があるマシン）
- **収益アカウント**。`assertAccount`（sellerName=dobokunote）を全操作の前に通す
- **read-only**。メモ追加・期間変更・出品操作はしない（画面を読むだけ）

## 手順

```bash
npm run coconala-analytics -- --append-kpi   # 収集 → snapshot → kpi-log へ upsert
npm run check-coconala-analytics             # 鮮度・欠測・マスク値・kpi-log 整合
```

補助フラグ: `--no-services`（全体＋ブログのみ）／`--headless`／`--append-kpi` なしなら snapshot のみ。

出力は `.claude/state/coconala/analytics-snapshot.json`（実体）と
`.claude/state/coconala/kpi-log.json` の `weekly` / `blogsWeekly`（週次台帳・`weekOf`+`serviceId` で upsert＝再実行しても二重計上しない）。

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

- `npm run check-coconala-analytics` が exit 0（または FAIL の内容がカタログ側の是正待ちとして報告されている）
- `kpi-log.json` に当該 `weekOf` の行が入り、`updatedAt` が更新されている
- 変更した `kpi-log.json` / `analytics-snapshot.json` が commit されている

## 参照

- 収集: `scripts/coconala-analytics.mjs`（`npm run coconala-analytics`）
- 検査: `scripts/check-coconala-analytics.mjs`（`npm run check-coconala-analytics`）
- 運用 SSOT: [coconala-operations.md](../../../knowledge/reference/coconala-operations.md) §2.4 / §4
- 隣接スキル: `/coconala-status`（撤退ライン判定・受注突合）・`/coconala-publish`（出品操作）・`/coconala-blog`（ブログ執筆・公開）
