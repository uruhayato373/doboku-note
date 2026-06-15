---
name: note-magazine-add
description: >
  既存の note 記事を別の有料マガジンへ「収録（追加）」するブラウザ CLI。追加対象は note 公開 API の
  差分で自動算出（手動列挙なし・冪等）。Playwright + システム Chrome（channel:'chrome'）で操作。
  Use when user says "マガジンに記事を追加", "完全パックに収録", "パックへ記事を入れる", "マガジン収録".
  **既定は dry-run。実追加は --commit。収益アカウントのため追加後 API 検証まで必須。会社PCはプロキシで
  note書き込み不可＝Mac実行。** note-edit-magazine（設定/価格）とは別操作。
disable-model-invocation: true
argument-hint: "--target <magazineKey> (--from <k1,k2> | --notes <n1,n2>) [--plan-only] [--probe] [--commit] [--limit N]"
---

既存記事を別マガジンへ収録する。`note-edit-magazine`（タイトル/説明/価格・記事単価）では扱わない「収録マガジンへの追加」専用。`note-edit-session` でログイン済みの永続プロファイルを再利用する。

## ⚠️ 前提

1. **Mac で実行**（会社 PC はプロキシで note 書き込み不可、[[feedback_metrics_cicd_supplied]]）。
2. **初回ログイン済み**: `npm run note-edit-session`（`channel:'chrome'` ＋ `.local/playwright-note-profile`）。
3. **実 DOM 未検証の v0.1**: note の「マガジンに追加」UI セレクタは未実走確定。**初回は必ず `--probe`（dry-run）で `.tmp/note-add-*.png` とログのボタン/メニュー文言を確認**してからセレクタを詰める。既存スキルと同じ「UI変更で誤操作し得る→必ず dry-run」原則。

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

1. `--plan-only` で件数確認。
2. **下段コアパック（3本）でパイロット** → `--probe`（dry-run）→ セレクタ確定 → `--commit` → API 検証。
3. 確定したら完全パックへ展開（`--from` に9ペルソナ＋精読を列挙、`--commit`）。

## やってはいけない

- `--probe`/dry-run を飛ばしていきなり `--commit`（UI 未検証のため誤操作リスク）。
- 追加後の **API 検証を省略**して「完了」と報告（[[feedback_publish_x_false_success]] 偽成功の罠）。
- 会社 PC での実行（プロキシで note write 不可）。

## 関連

- 読み取り照合: `npm run verify-note-magazines`（[note-api-verification.md](../../../docs/reference/note-api-verification.md)）
- ログイン入口: `npm run note-edit-session` ／ 設定・価格編集: `note-edit-magazine`
- 文脈: 2段ラダー リローンチ [docs/handoffs/2026-06-15-essay-pack-2tier-relaunch.md](../../../docs/handoffs/2026-06-15-essay-pack-2tier-relaunch.md) ・決定 [総監マガジン構成_決定2026.md](../../../docs/note/技術士総監/総監マガジン構成_決定2026.md)
