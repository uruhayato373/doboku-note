---
name: publish-x
description: X (旧 Twitter) に Playwright 経由で予約投稿する。`docs/sns-drafts/<draft-id>/x/captions/<key>-main.txt` と `img/<key>.png` を読んで compose ダイアログから予約。fail-safe で予約モード未確認時は投稿を中止する。事故履歴と再発防止は本ファイル参照。
---

# publish-x

X (Twitter) 予約投稿 + リプライ自動化を Playwright で実装。stats47 の同名スキルを doboku-note に移植 + 拡張。

## 同梱スクリプト

| ファイル | 役割 |
|---|---|
| `publish-x.ts` | 新規 tweet を予約投稿 / 即時投稿 |
| `publish-x-reply.ts` | 自分の最新 original tweet にリプライ投稿（即時） |

reply は X の構造的制約で予約不可（親 tweet が未投稿だと reply 不可）。代わりに「親が posted された後に動かす」スクリプトとして提供。

## なぜ Playwright か

X API（v2）は無料枠が月 1,500 read / 50 write と狭く、実質的に予約投稿は使えない。Premium API は $200/月。一方 Playwright + persistent profile はゼロコストで「人間が操作する compose 画面」と同じ動作になり、予約投稿の UI 機能をフルに使える。

## 使い方

### 1 件予約

```bash
npx tsx .claude/skills/sns/publish-x/publish-x.ts \
  tweet-01-eco 2026-04-30T07:00
```

### バッチ予約

```bash
npx tsx .claude/skills/sns/publish-x/publish-x.ts \
  tweet-01-eco 2026-04-30T07:00 \
  tweet-02-eco 2026-05-01T07:00 \
  tweet-03-eco 2026-05-02T07:00
```

### dry-run（初回必須）

```bash
npx tsx .claude/skills/sns/publish-x/publish-x.ts \
  tweet-01-eco 2026-04-30T07:00 --dry-run
```

### リプライ投稿（親が posted されてから）

毎朝 7:00 にメイン tweet が posted された後、~7:05 〜 任意のタイミングで:

```bash
# dry-run で照合確認
npx tsx .claude/skills/sns/publish-x/publish-x-reply.ts tweet-01-eco --dry-run

# 本番（即時投稿）
npx tsx .claude/skills/sns/publish-x/publish-x-reply.ts tweet-01-eco
```

スクリプトは:
1. 自分のプロフィール（ハンドルは SideNav から自動取得）の最新 original tweet を特定
2. 親 tweet の本文と main caption の冒頭を照合（誤爆防止）
3. reply icon クリック → answer-NN.png + reply caption を貼って即時投稿

**禁止**: 複数件を 1 回で渡さない（`tweet-01 tweet-02`）。各 reply 後に「最新」が更新されるが、安全のため 1 回 1 件で運用する。

予約モード検出まで動かして、本番投稿はせずに screenshot を `.tmp/playwright-x-debug/` に保存する。X UI 変更がないか初回確認するために必ず通すこと。

### 即時投稿（非推奨）

```bash
npx tsx .claude/skills/sns/publish-x/publish-x.ts \
  tweet-01-eco --immediate
```

## オプション

| flag | 意味 | デフォルト |
|---|---|---|
| `--draft <id>` | ドラフトディレクトリ ID | `001-択一1問1答-20問` |
| `--dry-run` | セレクタ検出のみ、実投稿せず | OFF |
| `--immediate` | 予約ではなく即時投稿 | OFF |

## 入力ファイル構造

```
docs/sns-drafts/<draft-id>/x/
├── captions/
│   └── tweet-01-eco-main.txt   # 本文
└── img/
    └── tweet-01-eco.png        # 添付画像（1 枚）
```

## 出力

- ログ: `.claude/state/sns/x-publish-log.csv`
- 失敗時 screenshot: `.tmp/playwright-x-debug/`
- ブラウザ profile: `.tmp/playwright-x-profile/`（git 対象外）

## 事故履歴と再発防止

### 2026-04-18: stats47 Sprint 1 即時投稿事故

予約投稿したつもりが 4 件全て即時投稿された。原因:
- 予約モード検出に失敗した際、フォールバックで `tweetButton` を押下していた
- 予約モードに入れていなければ `tweetButton` は即時投稿ボタンとして動作

対策:
1. **fail-safe**: 予約モード未確認なら `Escape` を 2 回送って投稿中止
2. **dry-run モード**: 初回は必ず通す
3. **失敗時 screenshot**: `.tmp/playwright-x-debug/` に保存

### 検出ロジック

予約モードに入った証拠は `[data-testid="tweetButton"]` の文字が **「投稿」→「予約設定」または「Schedule」** に変わること。8 秒間ポーリングして変化を検出、変化なしなら投稿中止。

## セレクタ仕様（2026-04 時点で動作確認済み）

- compose 画面: `https://x.com/compose/post`
- テキスト入力: `getByRole("textbox").first()` + clipboard.write + Cmd+V
- 画像アップロード: `input[data-testid="fileInput"]`
- 画像プレビュー: `[data-testid="attachments"]`
- 予約ボタン: `[role="dialog"] [data-testid="scheduleOption"]`（dialog scope 必須、inline composer の同名要素を誤クリック防止）
- 日時 select: 5 個（月/日/年/時/分）— `data-testid` なし、role を options から判定
- 確認ボタン: `[data-testid="scheduledConfirmationPrimaryAction"]`
- 投稿ボタン: `[data-testid="tweetButton"]`

## トラブルシューティング

### "日時セレクトが想定(5)未満"
X UI 変更の可能性。`.tmp/playwright-x-debug/` の screenshot を確認してセレクタ更新。

### "予約モード未確認"
- `[role="dialog"]` の DOM 構造変更
- 「予約設定」のテキストが言語設定で別のものに（"Schedule" など）→ indicators 配列に追加

### ログインを毎回求められる
プロファイル `.tmp/playwright-x-profile/` が破損 or 削除されている。再ログイン後は永続化される。

### 文字数オーバーで投稿できない
X 標準は 280 char（CJK は 2x weighting）。X Premium 加入で 25,000 char。caption 側で短縮するか Premium に上げる。

## モデル方針

実装スキル（人間が `npx tsx` で起動）。サブエージェントから呼ぶ場合は Sonnet で十分。
