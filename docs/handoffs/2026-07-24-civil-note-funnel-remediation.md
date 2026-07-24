---
title: 1級・2級土木 note導線修正（一次/AI記事 CTA 再設計）作業ログ
date: 2026-07-24
---

# 1級・2級土木 サイト→note / note→note 導線修正

一次検定PDF記事に二次経験記述パックCTAが付いていた検索意図不一致と、AI設計無料記事に購入導線／回遊がなかった問題を是正。**ソース・公開note・監査結果を一致させて完了**。作業票 `.claude/plans/civil-note-funnel-remediation-2026-07-24.md`／真実源 `docs/reference/note-funnel-architecture.md`。

## 変更したファイル（自分の変更のみ・明示 stage）

- `.claude/config/note-funnel.json` — civil `topCtaExcludeDirs` に3 dir 追加
- `docs/note/1級・2級土木/経験記述-AI設計-無料/article.md`（n0171b3105e2d・無料）
- `docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md`（n155093f42183・有料¥1980）
- `docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md`（n4963f45bd6f8・有料¥1480）
- `.claude/state/note-republish-hashes.json` — 上記3記事＋土木もくじの再公開ハッシュを in-sync 化（+ updatedAt）
- `docs/note/1級・2級土木/土木もくじ/article.md` — L2もくじ「そのほかの1級教材」に1級一次PDF逆引きリンクを追加（回遊対称化・追加対応）

## CTA の変更内容

| 記事 | 冒頭CTA | 末尾/回遊 |
|---|---|---|
| AI設計(無料) | Brain「施工経験記述 設計キット」`b5EDO3UjMgoTZsNWa0JXY`（商品説明直後・新設） | 土木もくじ `n4fde0f62dc20`（新設） |
| 1級一次PDF | 旧: 二次まるごとパック `md29a34906314` → 新: 1級一次「出る順 合格ノート」`nec34238ca6d6` | 土木もくじ `n4fde0f62dc20` |
| 2級一次PDF | 旧: 2級想定工事バンク `m8554e87ca6ec` → **削除（一次向け代替商品なし）** | 土木もくじ `n4fde0f62dc20` |

- config: `topCtaExcludeDirs` に `経験記述-AI設計-無料` / `1級土木/一次択一-過去問PDF` / `2級土木/一次択一-過去問PDF` を追加（汎用 `cta:pack-top` の自動注入対象から除外）。
- マーカー: 1級冒頭=`cta:civil-1-primary-ronten` / AI冒頭=`cta:civil-ai-kit` / 共通末尾=`cta:civil-mokuji`。Brain価格は本文にハードコードしない。

### 有料2記事の mokuji 配置（重要な設計判断）

有料記事の末尾 `cta:civil-mokuji` は**有料エリア内**（購入者のみ可視）にあり、匿名の note 公開APIが無料プレビューしか返さないため **D5「末尾もくじ」が構造的に消えない**ことを実機API（`remained_file_num`/`can_read=false`）で確認。ユーザー判断で **回遊 mokuji を無料プレビュー内（有料境界H2「PDF のダウンロードと使い方」の直前）へ配置**（有料エリアの著者オーソリティ閉じは凍結・不可侵）。ソースは「無料プレビューに簡易mokuji＋有料エリアに既存の詳細mokuji」の2箇所構成で live と一致。

## 実行した正確なコマンド

```bash
# 変更前 baseline
npm run audit-note-funnel                 # civil D1=1(AI) D6=0
npm run audit-note-funnel -- --live       # civil D5=3(1級/2級/AI)

# ソース検証（各3記事）
node scripts/note-lint.mjs "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md"
node scripts/note-lint.mjs "docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md"
npm run audit-note-funnel                 # ドリフトなし（civil D1/D6=0）
npm run check-note-funnel                 # exit 0
npm run check-note-republish              # 3記事が本文drift→live反映後 in-sync

# 公開note反映
# AI(無料)= 全文置換で安全 → note-update-body
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md"           # dry-run
node scripts/note-update-body.mjs --article "docs/note/1級・2級土木/経験記述-AI設計-無料/article.md" --commit  # 反映

# 有料2記事= 添付PDF保護のため全文置換不可 → 無料プレビュー限定の外科的編集（Phase U-B・一回限り）
node .tmp/note-civil-primary-freeedit.mjs                          # dry-run（自己検証PASSまで）
node .tmp/note-civil-primary-freeedit.mjs --commit --only n155093f42183   # 1級
node .tmp/note-civil-primary-freeedit.mjs --commit --only n4963f45bd6f8   # 2級

npm run audit-note-funnel -- --live       # civil D1/D5/D6=0（残D5は全て tankan・別セッション）
```

> [!warning]
> **有料PDF記事に `note-update-body`（全文置換）を使ってはいけない**。select-all→delete→paste で editor を空にするため、有料エリアの**添付PDFカードが削除される**（file 再添付ロジックなし）。2級は `remained_file_num=1`（PDF添付あり）で該当。無料プレビューだけを触る外科的編集（editor を空にしない・境界H2以降を触らない）で回避した。`--images-only` の存在がこの危険の傍証。

## 各検証の結果

- note-lint: 3記事すべて OK。U+FFFD なし。
- `audit-note-funnel`（ソース）: ドリフトなし。**civil D1=0 / D6=0**。review surfacer に対象3記事は残らず（残10件は全て tankan）。
- `check-note-funnel`（CI gate）: exit 0。
- `audit-note-funnel --live`: **civil D5=0**（残9件は全て `[tankan]`＝別セッション scope・非対象）。
- `check-note-republish`: 対象3記事は in-sync（drift 一覧から外れた）。他カテゴリ既存drift（建設部門/総監）は別scope。
- 意味監査（`note-funnel-auditor`）: **11/12**。資格セグメント整合 3/3・**一次/二次 検索意図整合 3/3（主眼＝「是正は機能している」）**・CTA文面関連性 3/3・回遊の質 2/3。一次PDF→二次パックの意図不一致は解消と判定。

## 公開note URL 実査結果（note 公開API）

| 記事 | 実査結果 |
|---|---|
| n0171b3105e2d (AI) | Brain `b5EDO3…`＝存在 / 土木もくじ `n4fde0f62dc20`＝存在。price 0 / can_read true |
| n155093f42183 (1級) | `nec34238ca6d6`＝存在 / `n4fde0f62dc20`＝存在 / `md29a34906314`＝**非存在**。price **1980** / can_read false / 「ダウンロード」非露出（境界維持） |
| n4963f45bd6f8 (2級) | `n4fde0f62dc20`＝存在 / `m8554e87ca6ec`＝**非存在**。price **1480** / can_read false / **`remained_file_num=1`＝添付PDF保持** / 「ダウンロード」非露出（境界維持） |

## 価格・有料境界・通知

- 1級 ¥1980 / 2級 ¥1480 = 維持。有料境界H2「PDF のダウンロードと使い方」= 維持（`boundaryBeforeExam=true` を保存前に検証）。添付PDF・有料エリアの中身 = 不変。
- **更新通知は送っていない**（各更新で通知ダイアログ「いいえ」を自動処理／通知ダイアログ未出＝送信なし）。account=dobokunote を全実行で assert。

## 追加対応（意味監査の指摘を解消・「全てやってほしい」）

- **土木もくじ→1級一次PDF の逆引きリンク欠落を解消**（回遊 2/3→3/3・**意味監査 12/12 化**）。もくじ「そのほかの1級教材」に `n155093f42183`（1級一次PDF）への逆引き行を追加（2級側 `n4963f45bd6f8` と対称化）。ソース追記＋`note-append-list-links --spec` で live 反映（D2手順・anchor=nec34238ca6d6）。公開API実査で `<a>`（li内）として存在を確認。もくじは無料記事のため paywall 懸念なし・更新通知なし。
- 意味監査の副次提案（「まず選ぶ1冊」「目的から逆引き」への一次軸追記）は**未実施**＝これらの `<ul>` は `note-append-list-links` で狙えない（前者は平文で非リンク／後者はアンカーIDが文書内で非一意）。反映には もくじ全文置換が要り、経験記述主題のもくじへの一次の可視性強化は score 非影響の任意ポリッシュのため見送り（リスク>便益）。

## 未解決事項

- なし（完了条件すべて充足＋意味監査の主減点も解消）。残D5 9件は tankan の別セッション作業（本タスク非対象）。参考: 有料2記事は末尾 `cta:civil-mokuji` が無料/有料で2回出る（無料プレビュー回遊＋有料エリア著者クロージング）。冗長だが役割分担があり意図的。
- 一回限りスクリプト `.tmp/note-civil-primary-freeedit.mjs` は `.tmp/`（gitignore）配下・セッション限りの生成物。有料PDF記事の無料プレビュー限定編集が再度必要なら再利用可だが、恒久ツール化は未実施。
