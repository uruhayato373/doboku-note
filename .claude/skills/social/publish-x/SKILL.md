---
name: publish-x
description: >
  Playwright で X (Twitter) の投稿を自動実行する。docs/sns/x/draft/ 配下の tweets.md を読み取り、
  ## Tweet XX ブロックを1件ずつ投稿（即時 or 予約）。
  Use when user says "X投稿", "X予約投稿", "ツイート投稿".
  **初回実行時 or セレクタ更新後は必ず --dry-run で事前検証すること**.
disable-model-invocation: true
argument-hint: "<draft> [<YYYY-MM-DDTHH:MM>...] [--tweet N] [--immediate] [--dry-run]"
---

Playwright（永続プロファイル）で X のコンポーザを自動操作し、即時投稿または予約投稿する。

## ⚠️ 予約運用は再開（ガード必須・2026-07-07〜）

> **凍結の経緯と実因**: 旧アカウント @dobokunotecom が「platform manipulation and spam」で凍結（異議却下）。実因は**同一/類似文面の連続予約というスケジューリング失敗**。運用は新アカウント **@doboku373** で継続中（`disable-model-invocation: true` は維持＝Skill 自動起動はせず、人／明示コマンドで実行する）。
>
> **現行フロー（2026-07-07 再開）**: 予約は再開したが、凍結実因（連続・重複）を機械的に潰すため **必ず以下のガード付きフローを通す**（真実源 `x-post-policy.md` §11.5）:
> 1. `x-post-writer` で下書き（文面ユニーク・URL 分散・同一 URL ≤2）
> 2. status.json に `scheduled_at` → `npm run x-schedule-guard`（近似重複<0.62・同時刻衝突・**1 日上限 3 本**）を**緑**に
> 3. `--dry-run` でセレクタ/認証を検証（下記）
> 4. `npm run x-schedule-guard --queue`（実キュー二重チェック）緑 → `--dry-run` を外して本番
> 5. `npm run x-sync-status` で queued 実在を確認＝偽成功検証（§9）
>
> **ガードが赤なら予約しない**（280超・404 と同格のブロッキング）。一括で数十本を積まず **1 週間分ずつ**（§11.2/§11.5）。自動フォロー/いいね/リプライは使わない（§11.3）。

## ⚠️ 重要: 初回 / セレクタ更新後は --dry-run で事前検証

X の UI は頻繁に変わる。**予約モード未確認のまま投稿ボタンを押すと即時投稿が発火する**（2026-04-18 実際に発生）。

```bash
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 2026-05-09T08:00 --dry-run
```

- 成功: `.local/playwright-x-debug/` に `dry-run-scheduled-mode.png` が保存される
- 失敗: `schedule-mode-not-confirmed.png` を確認してセレクタ修正
- **dry-run 成功後**に `--dry-run` を外して本番実行

## 🧵 スレッド（[thread] マーカー・2026-07-14 追加）

**X ネイティブ予約はスレッド非対応**（実機プローブ 2026-07-14: composer に `tweetTextarea_1` を追加すると `scheduleOption` が `aria-disabled=true`）。本スクリプトは次の分業で対応する（真実源 `x-post-policy.md` §5.2.1）:

- **書式**: `## Tweet NN: タイトル [thread]`、本文内を `--- リプライ ---` 行で区切る（1部目=ヘッド、以降=リプライ）。各部が独立に 280 weighted 判定される（`check-x-length` が part 別検査）。マーカーなしブロックの `--- リプライ ---` 以降は従来どおり投稿対象外（レガシー注記互換）。
- **即時投稿**（`--immediate`）: composer で全部組んで一括投稿（`addButton` trusted click → `tweetTextarea_1..N` 入力・各部の空読み戻し検証つき）。
- **予約投稿**: **ヘッドのみ**ネイティブ予約し、リプライ本文を status.json の `thread: {parts, replies_posted_at: null}` に記録。予約時刻経過後に `node scripts/x-thread-replies.mjs --run` でライブのヘッドを特定しリプライをチェーン投稿する（`--list`=pending 確認 / `--dry-run`=ヘッド特定まで）。cron 常駐はしない（§11.3 自動化フットプリント最小化）。

## ⚠️ 重要: 「予約投稿完了」ログを信用せず予約キューを実体検証（2026-05-29）

`✅ 予約投稿完了` ログは投稿成功の証拠にならない。実際に X 予約キュー（`https://x.com/compose/post/unsent/scheduled`）を開き、仮想スクロールで全セルをロードして本文・送信時刻の実在を確認するまで「完了」と報告しない。プロフィール（`x.com/<handle>`）のポスト数で即時投稿の誤爆も併せて確認する。検証パターンは [[feedback_publish_x_false_success]] / `.tmp/verify-final.mjs`（cellInnerDiv 末尾 scrollIntoView で全件ロード→regex マッチ＋時刻ヒストグラム）。

> **2026-05-29 事故**: 9 件を予約したつもりが 0 件しか入っていなかった。原因は予約確定の `tweetButton.click()` が React onClick を発火できず compose が閉じない（=保存されない）のに、その手前の `予約モード確認OK` だけで success を返していたこと。下記の通り Ctrl+Enter 確定＋compose 閉鎖検証に修正済み。

## ⚠️ 重要: 凍結回避（投稿頻度・間隔・自動化フットプリント）

> **2026-06-12 凍結事故**: 運用 X アカウントが「platform manipulation and spam」で凍結された。Playwright 自動投稿は本質的に bot 的で、一括予約・同時刻・連投・重複文面・同一リンク反復は spam/自動化として検知されやすい。真実源は [`x-post-policy.md` §11](../../../../docs/reference/x-post-policy.md)。本スキルは予約**補助**であり、全量を機械投稿に寄せない。

予約・投稿の前に必ず守る（policy §11）:

- **1 日 3〜5 本まで**。新規・低フォロワー期は 2〜3 本に絞る。
- **同時刻一括予約を避ける**。日時引数は毎日同じ `08:00` で並べず、±30〜90 分ジッタを入れて分散する（例: `08:10` / `12:40` / `19:20` …）。
- **一度に数十本積まない**。1 回の予約は数本に留め、予約キューが機械的な等間隔列に見えないようにする。
- **バースト連投をしない**（最低 60〜90 分間隔）。
- **自動フォロー / 自動いいね / 自動リプライ系は使わない**（規約直撃）。リプライは人が手動で（policy §10）。
- ドラフトが near-duplicate テンプレ／同一 URL 反復になっていないか、投稿前に `x-post-qa` の凍結リスク・ゲート（§11）を通す。
- 凍結・ロック時は SMS 認証など正規手順で解除し、回避目的の新規アカウント量産（ban evasion）はしない。

## 🛡 予約前ゲート / 予約後の実査（必須・機械検査）

`x-post-qa`（人/エージェント採点）に加え、**予約実行の直前後に機械ゲートを必ず通す**（真実源 [`x-post-policy.md` §11.5](../../../../docs/reference/x-post-policy.md)）:

```bash
# ① 予約前: 同時刻衝突・near-dup・1日上限・古い予約残存を機械 BLOCK。緑でなければ予約しない
npm run x-schedule-guard -- --queue --max-per-day 2
# ② publish-x で予約（このスキル。--tweets N-M で対象を絞る＝誤って全件投稿しない）
# ③ 予約後: キュー実在を実査し scheduled→queued へ昇格（偽成功検証 §9。投稿数=queued昇格数を突合）
npm run x-sync-status
```

- **状態ライフサイクル**: `scheduled`（計画・未投入）→ `queued`（キュー投入済・`x-sync-status` が実査昇格）→ `posted`（送信済）。guard の `--queue` 二重チェックは `queued` を除外するので、**週次小分けで次バッチを積むときも誤検出で赤にならない**。
- **週次運用**: 1 週間分（2 本/日）ずつ。次バッチは未投入の `scheduled` のみを `--tweets` で対象化する。

## 使い方

```bash
# 1. 利用可能な draft を確認
ls docs/sns/x/draft/

# 2. dry-run（初回必須）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 2026-05-09T08:00 --dry-run

# 3a. 即時投稿（特定ツイート）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 --tweet 1 --immediate

# 3b. 予約投稿（全ツイート、日時をツイート数分並べる）
npx tsx .claude/skills/social/publish-x/publish-x.ts 004 \
  2026-05-09T08:00 \
  2026-05-10T08:00 \
  2026-05-11T08:00 \
  2026-05-12T08:00 \
  2026-05-13T08:00
```

## 引数

| パラメータ | 必須 | 説明 |
|---|---|---|
| `<draft>` | ✓ | `docs/sns/x/draft/` 配下のディレクトリ名。先頭番号のみ（`004`）でも可 |
| `[<date>...]` | - | 予約日時 JST (`YYYY-MM-DDTHH:MM`)。ツイート数と一致させる |
| `--tweet N` | - | 特定ツイートのみ投稿（1-based、省略時は全ツイート） |
| `--immediate` | - | 予約ではなく即時投稿（`--tweet` と組み合わせ推奨） |
| `--dry-run` | - | 実投稿せず予約モード到達まで確認 |

## tweets.md の形式

```markdown
## Tweet 01: タイトル

投稿テキスト本文

#技術士 #技術士総監 #<種別タグ>

---

## Tweet 02: タイトル
...
```

`## Tweet NN:` を区切りとして各ブロックを1投稿として扱う。

## 投稿テンプレ・ハッシュタグ運用ルール

本文構成・ハッシュタグ個数・推奨タグセットの真実源は **`docs/sns/x/README.md`**。

要点だけ抜粋:
- 文字数上限は既定 280 weighted chars（日本語 = 2、URL = 23 固定）。X Premium 加入済のため `[longform]` マーカー付きツイートは 25,000 まで可（短文がデフォルト＝リーチ最適・詳細は x-post-policy §2/§2.1）
- ハッシュタグは **3-4 個**（ベース 2 個 `#技術士 #技術士総監` + 種別 1-2 個）
- `#総合技術監理部門` は 17 weight と重く要点投稿限定
- 投稿前に `node .tmp/count-x-chars.mjs <tweets.md>` で文字数検証必須

## 画像

`img/tweet-{NN}-{slug}.png` が存在すれば自動添付。存在しなければテキストのみ投稿。

## 前提条件

1. **システム Chrome がインストール済み**（Playwright 組み込み Chromium は X にボット判定される）
2. **初回ログイン**: `.tmp/x-login.ts` を使って手動ログイン → セッションが `.local/playwright-x-profile/` に保存される
   ```bash
   npx tsx .tmp/x-login.ts
   # ブラウザが開くのでアカウントにログイン → x.com/home に遷移すると自動終了
   ```
3. **セッション切れ時**: 同様に `.tmp/x-login.ts` で再ログイン（`publish-x.ts` が Chrome チャンネルを使うので再ログイン後も bot 検知なし）
4. **SingletonLock エラー時**: 前回の Playwright が残っている場合は以下でクリア
   ```bash
   pkill -f "playwright-x-profile" 2>/dev/null; rm -f .local/playwright-x-profile/SingletonLock
   ```

## 実証済みセレクタ（2026-04-20 stats47 で検証）

| 操作 | セレクタ |
|---|---|
| テキスト入力 | `page.getByRole("textbox").first()` |
| 画像アップロード | `input[data-testid="fileInput"]` |
| 予約ボタン | `[role="dialog"] [data-testid="scheduleOption"]`（DOM `.click()` 必須） |
| 日時 select | `[role="dialog"] select` × 5（options 内容からロール自動判定） |
| 確認ボタン | `[data-testid="scheduledConfirmationPrimaryAction"]` |
| 予約モード検証 | `[data-testid="tweetButton"]:has-text("予約設定")` |
| 予約確定 | textbox focus → `ControlOrMeta+Enter`（`tweetButton.click()` は onClick 不発で保存されない）。確定後 compose クローズをループ検証し、閉じなければ中止＝偽成功を出さない（2026-05-29 修正） |
| 本文入力検証 | paste 後 `textbox.innerText()` を読み戻し、空なら `keyboard.insertText` フォールバック → なお空なら中止（clipboard 不発の偽成功防止、2026-05-29 追加） |

セレクタが壊れた場合は SKILL.md の表を更新すること。

## スクリプト本体

`.claude/skills/social/publish-x/publish-x.ts`
