# ハンドオフ: 1級土木 完全攻略パック 100本 公開完了 → 仕上げ（別PC継続用）

**日付**: 2026-06-30
**状態**: **100本すべて note 即時公開済み（fail=0）**。frontmatter 書き戻しは develop に commit/push 済み。
**前ハンドオフ**: [2026-06-30-civil1-flagship-publish.md](2026-06-30-civil1-flagship-publish.md)（公開手順本体）。本書はその**公開後の続き**。

> [!note] 結論
> 100本の本番公開は完了。残るは **マガジン収録 → SKU 公開 → deploy** の3工程でパック完成。その後に PDF・目次・予約投稿修復など。

---

## 1. 完了済み（develop 反映済み）

- **工事01〜100 を note 即時公開**（全 `notePricing: paid` / `price: 1280` / `paidBoundary: 品質管理`）
  - frontmatter に `noteUrl`/`noteId`/`notePublishedAt`/`noteStatus: published` 書き戻し済み（commit `076b2144a` ほか）
  - **実体検証**: サンプル（工事98-100 等）で `price=1280` / `can_read=false`（paywall 有効）/ 冒頭CTAマガジンカード figure 化 を確認＝偽成功なし
- **段落 reflow 済み**（≤120字・note 可読化、commit `8d75c240f`）
- マガジン枠 `https://note.com/dobokunote/m/m8290970a7f05`（**収録待ち**）

---

## 2. 残作業（この順で・別PCで実行）

### 2-1. マガジン `m8290970a7f05` へ100本収録
```bash
node scripts/note-magazine-add-articles.mjs --target <マガジンkey/設定> --from <packDir> --commit
#   既定 dry-run。--probe で1記事目のボタン文言ダンプ。引数の正確な対応は scripts header 参照（--target/--from/--notes/--limit）
#   packDir = docs/note/1級・2級土木/1級土木/magazines/1級土木-経験記述-完全攻略パック
```
- 100本の noteId は各 `工事NN-*/article.md` の frontmatter にあり（収録対象の真実源）

### 2-2. SKU を published:true（パック完成）
- `src/lib/note-magazines.ts` の `civil-1-keiken-complete-pack`（現在 `published: false`・noteUrl=m8290970a7f05・¥9,800）を **100本収録完了後に `published: true`** へ
- commit → push

### 2-3. /deploy
- `develop` → `main`（`/deploy` スキル）→ 本番反映。`curl` で 200 + `<main>` 確認

---

## 3. 後続（パック完成後・優先度順）

1. **目次挿入**: note-publish では native 目次が入らない。各記事を note エディタで開き CTA 直後にネイティブ目次ブロック挿入（H2 が5管理ぶん）。`publish-note/references/editor-operations.md` Phase 4.5
2. **PDF ダウンロード**（技術士と同型・高ニーズ＝経験記述は手書き練習用に有効）
   - **PDF生成は Windows 必須**（Mac は Chrome `--print-to-pdf` がハングして不可・[[workflow-concurrency-and-mac-pdf]]）
   - 手順: ① civil 用 pdf-spec を設計（include=`## 〔想定工事の概要〕`〜`## 環境対策` の答案、exclude=導入CTA/置換ガイド/早見表）② source に PDF導入文ブロック追記（PDF範囲外の太字）③ `magazine-to-pdf.mjs` で100本生成（Windows）④ `note-attach-magazine-pdfs.mjs --commit` で有料エリアに一括添付（paywall 非破壊検証つき）
   - 真実源: `note-essay-review-checklist.md` Step 6e ／ `note-attach-pdf` skill
3. **無料23本へ CTA live 反映**: PR でソース配線済みだがライブ未反映。`note-append-cta.mjs --note <id> --text "<冒頭CTA>" --url https://note.com/dobokunote/m/m8290970a7f05 --before-first-h2 --commit`
4. **予約投稿の selector 修復**（今後の定期コンテンツ用）: `note-publish.mjs --schedule` は**現行 note UI で未動作**（公開設定の予約コントロールに到達できず「有料エリア設定」画面で停止＝`opened=false`）。`.tmp/np-sched-*.png` を見て date/time picker・予約投稿ボタンの selector を作り直す。安全弁（日時確定不可なら即時公開せず下書き退避）は動作確認済み

---

## 4. 後始末・既知の注意

- **stray 下書きの削除**（未公開のゴミ・note 下書き一覧から削除）:
  - `n3e2475d0b6d5`（工事01 DRAFT試走）
  - `na5b4cef4fcfe`（工事10 予約試走・予約UI未動作で draft 退避）
  - `nfc608702b477`（工事26 cover アップロード timeout の失敗試行）
  - **網羅確認法**: 公開済み100本の noteId 集合（各 article.md frontmatter）に**無い** note 下書きが孤児 → 削除
- **既知の flakiness**: cover `setInputFiles` の transient timeout で**バッチは失敗時に停止**する仕様。再実行で**冪等 skip → 続きから再開**（今回 9→25→50→100 と分割再実行で完遂）。安定回線なら基本スムーズ
- **このMacは即時公開が安定**（account ゲート・本文paste・CTAカード化・有料境界検証=品質管理・更新まで実証）。予約投稿のみ未対応（上記 3-4）
- **偽成功に注意**: 「公開できた」ログを信用せず、note 公開ページ/API で price/can_read(=false)/CTAカード を実査してから完了とする

---

## 5. 関連
- 真実源: `docs/note/1級・2級土木/noteコンテンツ計画.md`（戦略）／`src/lib/note-magazines.ts`（SKU）
- ツール: `note-publish.mjs`・`note-publish-magazine.mjs`・`note-magazine-add-articles.mjs`・`note-attach-magazine-pdfs.mjs`・`magazine-to-pdf.mjs`・`note-append-cta.mjs`
- 公開順マニフェスト: `…/完全攻略パック/_publish-order.txt`
