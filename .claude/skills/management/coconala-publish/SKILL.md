---
name: coconala-publish
description: >
  ココナラ出品サービスを Playwright で「新規出品」「内容修正」するスキル。カタログ
  （src/lib/coconala-services.ts＝価格/状態/URL）と listings（.claude/config/coconala-listings.json
  ＝本文/カテゴリ/納期/ジャンル）を真実源に、ログイン済みプロファイルで出品フォームへ流し込む。
  安全弁＝account assert（sellerName=dobokunote）／既定は「下書きで保存」で実公開は --commit 必須／
  価格・カテゴリの充填 warning があれば公開せず下書き退避。公開成功時はカタログへ status:'listed'＋
  serviceUrl＋listedAt を書き戻す。KPI 照合は /coconala-status、受注処理は /coconala-order と別。
  Use when user asks to [ココナラに出品, ココナラ出品を修正, ココナラの価格を反映, サービスを公開, /coconala-publish].
user-invocable: true
---

## 用途

ココナラの**出品・修正の実操作**を決定的スクリプトで行う。note-publish と同思想（永続プロファイル＋
account assert＋draft-first＋`--commit` gate）。文面・価格を SoT で直し、このスキルで反映する。

```
node scripts/coconala-publish.mjs --service coconala-shindan             # 新規：下書き作成のみ（既定・安全）
node scripts/coconala-publish.mjs --service coconala-tensaku-set --commit # 新規：公開
node scripts/coconala-edit.mjs --service coconala-tensaku-set --commit    # 修正：カタログ現値をフル反映
node scripts/coconala-edit.mjs --service coconala-shindan --fields price   # 修正：価格だけ（下書き保存）
```

## 前提（最重要）

- **実行はローカルのみ**（ログイン済みプロファイル `.local/playwright-coconala-profile` があるマシン）。初回は headed で手動ログインが要る（プロファイルに保持）。
- **account assert**: `coconala-account.json` の `sellerName`（=dobokunote）がマイページ本文に含まれることを確認してから操作。別アカウントなら即中断。
- **規約**: 2026-07-18 時点で利用規約・ルールに「出品者が自分の出品をブラウザ自動化することを禁じる明示条項」は確認できず（購入者側の自動応答＝第13条2項22号は対象外）。ただし禁止行為一覧(zendesk)の1面は未確認・**bot 検知の運用リスクは残る**ため、低頻度（出品時・価格改定時）に限る。

## フロー

1. **SoT を確定**: カタログ（価格/status/title）＋ listings（本文/カテゴリ/納期/genreFacets）を Read。価格改定なら**カタログを先に直す**。
2. **下書きで検証**: まず `--commit` なしで実行 → `.tmp/coconala/publish-filled-*.png` と `ok:true`（下書き保存成功）を確認。
3. **公開**: 問題なければ `--commit` で公開。公開成功時は publish がカタログを `status:'listed'`＋`serviceUrl`＋`listedAt` に自動書き戻し。
4. **出品後の配線**: `coconala-account.json` の `profileUrl` を埋める（`check-coconala-wiring` が listed で必須）。`npm run check-coconala-wiring` で整合を確認。

## ガードレール

- **draft-first**: 既定は「下書きで保存」。公開は `--commit` を明示したときだけ。
- **偽成功を報告しない**: 送信後にフォームのバリデーションエラー（記入エラー）が出たら「公開した」と言わない（publish/edit は `ok:false` を返し下書きに退避）。
- **価格の直書き禁止**: 価格はカタログ（`priceYen`）が真実源。listings に価格を書かない。
- **代筆禁止・外部誘導禁止**: 出品文面の原則は `docs/reference/coconala-operations.md` §5・展開キット §2-3。
- **フォーム仕様がドリフトしたら**: `node scripts/coconala-discover.mjs --advance --cat 12 --sub 254 --type 764` で現行 selector/選択肢を再取得し、listings の category/genreFacets を是正。

## 商品画像（サービスサムネ）

AI で雰囲気写真（文字なし）を生成 → satori で日本語を正確に重ねる（brand-image-system 流儀）。

```
npm run gen-image-gemini -- --out .claude/config/coconala/assets/bg-civil.png --prompt "..."  # 背景（Gemini API課金）
npm run coconala-thumb                                                                          # 背景+文字を1200×900合成（THUMB_COPY）
node scripts/coconala-publish.mjs --service <id> --commit --image <thumb.png>                   # 公開と同時に画像アップロード（1商品=1実行）
node scripts/coconala-edit.mjs --service <id> --service-id <n> --image <png> --commit           # 既存商品へ画像だけ更新
```

素材は `.claude/config/coconala/assets/`（`bg-civil.png`/`bg-docs.png`／`thumb-<key>.png`）。詳細は [coconala-operations.md §8](../../../docs/reference/coconala-operations.md)。

## コンテンツ PDF 商品（C系・note→ココナラ）

note 記事を外部誘導ゼロの PDF にして納品する単発コンテンツ商品。

```
npm run coconala-content-pdf   # build-coconala-content-pdf: PRODUCTS 定義を strip-note-funnel で
                               #   funnel 除去→magazine-to-pdf→pdftotext で note URL 0件を検証
```

新 C系商品を足す配線: `build-coconala-content-pdf.mjs` の `PRODUCTS`（源記事）＋カタログ＋listings（`provisionFormat:"3"`）＋`coconala-thumb.mjs` の `THUMB_COPY`＋サムネ生成。**KDP Select ロック分（一次過去問）は不可**。`check-coconala-wiring` が listings/商品画像のカバレッジを機械検査する。

## プロフィール（出品者・カバー/アバター/自己紹介）

```
npm run coconala-cover     # 差別化タグラインのカバーバナー（satori・1600×525≈3.05:1）
npm run coconala-profile -- --commit   # account.json の profile(job/appeal/bio) を反映（dry=--commit なし）
```

profile の真実源は `coconala-account.json` の `profile`。**自己紹介に外部URL/SNS を書かない**（規約）。アバターはサイトの `public/img/author-avatar.png`。

## 制約（v1 未対応・手動）

- **QA（よくある質問）・有料オプション**は v1 では自動投入しない（listings に `faq`/`options` は保持済み）。必要なら公開後にココナラ UI で追加。
- **アバター/カバーの実アップロード**は本スキルの範囲外（アバター=クロッパ無し・カバー=クロッパ「決定」→保存。手順は operations.md §8 未収載＝手動 or 個別スクリプト）。

## 完了条件

- 下書き（または公開）が `ok:true` で保存され、`.tmp/coconala/` にスクショが出ている。
- 公開時はカタログが `listed` に書き戻り、`check-coconala-wiring` がグリーン。

## 参照

- スクリプト: `scripts/coconala-publish.mjs` / `scripts/coconala-edit.mjs` / 共有 `scripts/lib/coconala-{session,form}.mjs`
- 投入 SoT: `.claude/config/coconala-listings.json`（本文/カテゴリ/納期/genreFacets）
- 価格/状態 SoT: `src/lib/coconala-services.ts` ／ アカウント: `.claude/config/coconala-account.json`
- 運用 SSOT: `docs/reference/coconala-operations.md` ／ 戦略・文面: `docs/note/1級・2級土木/ココナラ展開キット.md`
- エージェント: `.claude/agents/coconala-operator.md` ／ KPI 照合: `/coconala-status` ／ 受注: `/coconala-order`
