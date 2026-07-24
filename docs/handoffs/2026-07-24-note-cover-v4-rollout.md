---
title: note カバー Crop-safe V4 全量移行＋ライブ反映 作業ログ（走行中）
date: 2026-07-24
---

# note カバー Crop-safe V4 全量移行

パイロット合格（6/6・107/108）→ ユーザー指示「全て生成して、note記事を修正」による一括移行。**ソース側は完了**（commit `bc87003d68`・G2 残 0）。**note.com ライブ反映は長時間ジョブとして走行中**（本ファイルは再開手順の SSOT）。

## 完了済み

- 全 715 記事 V4 化（機械draft 387＋agent 6バッチ 328・全件 v4FitIssues PASS）。inventory=`.claude/state/note-cover-v4-rollout.json`
- マガジン 46 spec V4 化（`.claude/config/note-cover-magazine-v4.json` 一元マップ・generator が id マージ）
- 全カバー再生成（記事 712 組＋マガジン 43）。背景=資格別ブランド写真プール（サイト OGP と共有）・タイトル固定 70px
- `check-note-3set` のサフィックス記事偽陽性（181件）をバグ修正／既存 CTA¥ 17件除去（§14-c・要ライブ本文反映=republish drift 追跡）
- blockquote 30件・UTM 欠落は既存バーンダウン（SKIP_NOTE_BQ/SKIP_NOTE_UTM で通過）→ 別トラック

## 走行中ジョブと再開手順（セッション切断時はここから）

1. **記事ライブ反映（667件・優先順27チャンク）**
   - ランナー: `node .tmp/run-v4-live.mjs`（チャンク単位で `note-update-cover --list --commit`、1件失敗で停止・進捗保存）
   - 進捗 SSOT: `.claude/state/note-cover-v4-live-progress.json`（done チャンクはスキップ＝**再実行するだけで続きから再開**）
   - チャンクリスト: `.tmp/v4-live-c01.txt` … `c27.txt`（.tmp が消えたら `node .tmp/build-v4-live-chunks.mjs` 相当を rollout.json から再構築。done 引き継ぎロジックあり）
   - 安全弁: account=dobokunote assert／有料は paywall line 読み取り検証（動かさない）／新カバー load 未確認なら保存しない／通知ダイアログなし
2. **マガジンライブ反映（36件・記事完走後）**
   - ランナー: `node .tmp/run-v4-mag-live.mjs`（`note-magazine-cover --key --dir --commit` 逐次・進捗 `.claude/state/note-cover-v4-mag-live-progress.json`）
   - key マップ: `.tmp/v4-mag-live-map.json`（**note API 実マガジン名で突合済み 36/36**・regex 由来の誤マップを排除済み。消えたら API `contents?kind=magazine` から再突合）
   - ⚠ Chrome 永続プロファイルは 1 つ＝記事ランナーと並列実行不可
3. **push / PR**: 巨大 push（PNG 1400 枚超）が低速。`git push origin feature/gsc-ga4-automation` 完了後に PR（base=develop）作成。deploy は別途 /deploy（note カバーはサイト非依存だが CTA¥ 除去等の本文修正が sitemap 等に効くため通常フロー）

## 検証（各段階）

- チャンクごと: ランナーが先頭2件を note API v3 で抜き取り検証（eyecatch 非 default・paid は price/can_read 不変）。NG なら verify-failed で停止
- 完走後: `.claude/state/note-cover-v4-live-progress.json` の全チャンク done ＋ fail 0 を確認し、任意サンプルをブラウザ実査（記事ページ/リンクカード/関連記事/マガジン一覧）

## 残課題（別トラック）

- CTA¥ 除去 17件の本文ライブ反映（check-note-republish が drift 追跡中。次回本文更新時に note-update-body 系で反映）
- blockquote 30件・UTM 欠落バーンダウン（既存）
- 未公開マガジン 10 spec（note 側にまだ無い）は公開時に `note-magazine-cover` を通常フローで

## 走行ログ

- c01: 24/25 done。skip 1=メンバーシップ「はじめに-合格ラボ」n6b66793ca20c（メンバーシップ特典記事は「公開に進む」後の設定ページ構造が通常記事と異なり note-update-cover 非対応）→ **note UI で手動カバー更新**（新カバーは生成済み `docs/note/1級・2級土木/メンバーシップ/はじめに-合格ラボ/img/cover.png`）
- c02-c04: 74/75 done。skip 2件目=「1級土木-二次まるごとパック」n824a4ea20acf（`is_public_membership_connected: true`＝合格ラボ連携記事は設定ページ未到達で非対応。**ライブは旧カバーのまま無傷**）→ note UI 手動更新（エディタに新カバーが下書き済みの可能性あり＝開いて「公開に進む→更新する」だけで完了する見込み。新カバー `docs/note/1級・2級土木/1級土木/magazines/1級土木-二次まるごとパック/img/cover.png`）。membership 連携記事は全 note 中この2件のみ
- 2026-07-24: ハーネス background task がターン境界で kill される事象が2回続いたため、記事ランナーは **nohup 常駐**（`nohup node .tmp/run-v4-live.mjs >> .tmp/v4-live-run.log 2>&1 &`）へ切替。停止=`pkill -f run-v4-live`（次回 `node .tmp/run-v4-live.mjs` で続きから）・監視=`tail -f .tmp/v4-live-run.log` と進捗 state
- 2026-07-25 原因確定: 「設定ページ未到達」は **free × membership連携** の組合せのみ（LP系4件）。**paid × membership連携は正常**（工事01・設問3序章のプローブで実証）。過剰除外した142件のうち139件を c22-c27 に再投入。真の手動対応4件=はじめに-合格ラボ / 二次まるごとパックLP / 完全攻略ガイド索引 / 2級想定工事バンク索引（いずれもライブ旧カバー無傷・state の manualFreeMembership に記録）
