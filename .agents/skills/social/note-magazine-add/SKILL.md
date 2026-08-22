---
name: note-magazine-add
description: >
  既存の note 記事を別の有料マガジンへ「収録（追加）」するブラウザ CLI。追加対象は note 公開 API の
  差分で自動算出（手動列挙なし・冪等）。Playwright + システム Chrome（channel:'chrome'）で操作。
  Use when user says "マガジンに記事を追加", "完全パックに収録", "パックへ記事を入れる", "マガジン収録".
  **既定は dry-run。実追加は --commit。収益アカウントのため追加後 API 検証まで必須。Windows(会社PC)で
  動作確認済（2026-06-15・channel:'chrome'＋ignoreHTTPSErrorsでプロキシ越え）・Macも可。** note-edit-magazine（設定/価格）とは別操作。
disable-model-invocation: true
argument-hint: "--target <magazineKey> (--from <k1,k2> | --notes <n1,n2>) [--plan-only] [--probe] [--commit] [--limit N]"
---

既存記事を別マガジンへ収録する。`note-edit-magazine`（タイトル/説明/価格・記事単価）では扱わない「収録マガジンへの追加」専用。`note-edit-session` でログイン済みの永続プロファイルを再利用する。

## ⚠️ 前提

1. **Windows(会社PC)で動作確認済**（2026-06-15、完全パックへ63記事を投入し API 検証）。`channel:'chrome'` ＋ `ignoreHTTPSErrors` で社内プロキシ(TLS傍受)を越える。Mac でも可。
2. **初回ログイン済み**: `npm run note-edit-session`（`channel:'chrome'` ＋ `.local/playwright-note-profile`。セッションは永続化され再利用される）。未ログインなら本スクリプトが検知して中断・案内する。
3. **確定フロー（実機検証済）**: 記事ページ `/n/{key}` の「記事を追加」ボタン → ダイアログ「記事を追加」（自分の全マガジン一覧・各行に 追加/追加済 トグル）→ ターゲットマガジン名の行の直後ボタンで状態判定 →「追加」なら押す。**UI 変更時は `--probe`（dry-run）で `.tmp/note-add-*.png` とダイアログ button 文言を確認**してからセレクタを詰める。

## 使い方

```bash
# 1) 計画だけ（ブラウザ起動せず・API差分のみ）
npm run note-magazine-add -- --target m171222175fac --from m09440aa379cf,mf0f98993407f --plan-only

# 2) dry-run + probe（1記目で実DOMダンプ・追加はしない）
npm run note-magazine-add -- --target m171222175fac --from m09440aa379cf --probe

# 3) 本番（実際に収録）
npm run note-magazine-add -- --target m171222175fac --from m09440aa379cf,mf0f98993407f,m32a8a5b3b473 --commit

# 4) 個別記事の追加（クリーンアップ: 下水道R6・道路の不足1本 等）
npm run note-magazine-add -- --target m171222175fac --notes nXXXXXXXX --commit
```

- `--target`: 収録先マガジン key（`note-magazines.ts` の noteUrl 末尾 or `verify-note-magazines`）。
- `--from`: ソースマガジン key（複数可）。各収録記事を API で取得し union。
- `--notes`: 個別記事 key（複数可）。`--from` と併用可。
- `--commit` 無し＝dry-run（安全既定）。`--probe`＝1記目で DOM ダンプ。`--limit N`＝N件だけ。

## 動作（安全段階）

1. **API 差分で計画**: `toAdd =（--from 群の収録記事 ∪ --notes）− ターゲット現収録`。冪等（既収録は skip）。
2. ログイン状態を確認（未ログインなら note-edit-session を案内し中断）。
3. 各記事ページの「…」→「マガジンに追加」→ モーダルで対象を選択。**dry-run は追加直前で停止**、各ステップ `.tmp/note-add-*.png`。
4. `--commit` 時のみ追加。完了後 **note API でターゲット収録数・対象記事の収録を実体検証**。

## 推奨手順（リスク最小）

1. `--plan-only` で件数確認（ブラウザ起動せず・API差分のみ）。
2. `--commit --limit 1` で1件だけ実追加 → API で +1 を確認（新規ターゲットや UI 変更後の安全確認）。
3. 問題なければ `--limit` を外して一括 `--commit`。**一過性のダイアログ未展開で取りこぼしが出ることがある**（2026-06-15 実績: 62件中1件）→ **同コマンド再実行で冪等に拾う**。

## やってはいけない

- 新ターゲット/UI 変更直後に `--limit 1` 確認を飛ばしていきなり全件 `--commit`。
- 追加後の **API 検証を省略**して「完了」と報告（[[feedback_publish_x_false_success]] 偽成功の罠）。
- `miss>0`（target-not-in-dialog 等）を放置して完了扱い → 必ず再実行で 0 にする。

## 関連

- 読み取り照合: `npm run verify-note-magazines`（[note-api-verification.md](../../../.Codex/knowledge/reference/note-api-verification.md)）
- ログイン入口: `npm run note-edit-session` ／ 設定・価格編集: `note-edit-magazine`
- 文脈: 2段ラダー リローンチ（経緯は git 履歴の旧 handoff `2026-06-15-essay-pack-2tier-relaunch.md`・削除済み）・決定 [総監マガジン構成_決定2026.md](../../../docs/note/技術士総監/総監マガジン構成_決定2026.md)
