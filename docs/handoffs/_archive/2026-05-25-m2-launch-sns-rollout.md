---
title: 2026-05-25 M2 白書R7 launch + SNS rollout セッション handoff
date: 2026-05-25
session_focus: M2 公開後の SNS 集客（X 自動投稿基盤の修正 + Tweet 01-06 投稿 + 07-08 予約）と IG カルーセル準備
prior_handoffs:
  - docs/handoffs/2026-05-25-whitepaper-r7-free-lead-magnet.md (M2 戦略転換)
---

# 2026-05-25 M2 launch + SNS rollout 引き継ぎ

## 何が起きたか（1 行）

M2「白書R7完全対応集」を note 無料公開（https://note.com/dobokunote/n/n60efbccd728b、2026-05-25）し、X 自動投稿基盤 (publish-x.ts) の Windows/UI 由来 3 大バグを修正、Tweet 01-06 を即時投稿、Tweet 07-08 を予約投稿、IG カルーセル 14 PNG + caption 完成。

## 達成事項

### A. M2 公開と SoT 反映

- M2 article.md に frontmatter 追加（noteUrl/noteId/notePublishedAt 等）
- `.claude/state/note-published.json` に M2 エントリ追加
- noteコンテンツ計画.md ダッシュボード「投稿済 2026-05-25 (n60efbccd728b)」
- M4 article.md の M2 placeholder → 実 URL 置換

### B. publish-x.ts 永続改善（3 大バグ修正）

| バグ | 修正内容 |
|---|---|
| **Windows ペースト不発** | `Meta+V` → `ControlOrMeta+V`（Mac は影響なし）|
| **文字数 silent reject** | 重み付き 280 超で fail-fast guard 追加（旧実装は disabled button をクリックして false success）|
| **tweetButton 投稿不発** | `Ctrl+Enter` 経路を主に、button click は fallback。`{ force: true }` は onClick 不発で投稿されなかった |
| **成功判定偽陽性** | 旧 2 秒固定待機 → URL 遷移 or textarea 消失を最大 8 秒待機して判定 |

### C. M2 公開告知 X 投稿

| Tweet | 状態 | 時刻（JST） | 文字数 |
|---|---|---|---|
| 01 単発告知 | ✅ posted | 15:32 | 228 |
| 02-06 深掘り 5 投 | ✅ posted | 15:46-15:51 | 173-237 |
| 07 ペルソナ別模範論文 | 📅 scheduled | 2026-05-26 21:00 | 177 |
| 08 試験 6 週間前の使い方 | 📅 scheduled | 2026-05-27 08:00 | 200 |

- 表示問題: ▶ (U+25B6) が X 上で見えない → 全 tweet で `・` に置換済
- Tweet 02 のみ CTA なし（連投順序設計時のミス、修正不能で残置）

### D. Instagram カルーセル素材

- `docs/sns/instagram/2026-05-25-白書R7完全対応集/`
- slide-data.json（cover + 5 board + cta = 7 スライド）
- carousel/img/ × 7 PNG (1080×1350) + reels/img/ × 7 PNG (1080×1920)
- caption.md（投稿文 + ハッシュタグ + 配信時刻提案）
- **未投稿**（ユーザーが note 投稿後に手動 IG アップロード予定）

## 次セッションで対応すべきこと

### 1. Tweet 07/08 自動発火確認（必須）

- 2026-05-26 21:00 JST: Tweet 07（ペルソナ別模範論文 CTA）
- 2026-05-27 08:00 JST: Tweet 08（試験 6 週間前の使い方）
- 確認方法: `.tmp/x-list-scheduled.ts` または X UI で profile 確認
- 失敗していたら手動 immediate 投稿で代替

### 2. M3 R8予想問題集 が note 公開済（要 SoT 確認）

- 確認: `src/lib/note-magazines.ts` で `r8-essay-forecast` が `published: true`, `noteUrl: 'https://note.com/dobokunote/m/m6854c7437d4d'`
- 対応:
  - M2 article.md 末尾 CTA セクション「R08 で出る可能性の高い 6 大テーマのフル模範論文が欲しい方」の placeholder を実 URL に置換
  - M4 article.md 同様の置換
  - noteコンテンツ計画.md ダッシュボード更新

### 3. 既存 X draft 監査結果と戦略再設計

194 件中の状態:
- **152 件（78%）が 280 文字超過で投稿不能**（旧実装の silent reject が原因）
- 125 件（004-028 キーワード解説）は **戦略 v6 で「キーワード解説要約は X 廃止」判定** に違反
- 即流用可能なものは事実上ゼロ

優先順位（次セッション）:
- B. 030 magazine-flow 21 件を M9 単独 → M2/M5-8 混在に更新（1 時間）
- A. 001-003 過去問クイズ 60 件を 280 字以内に圧縮（2-3 時間）
- C. M2/M4/R8予想問題集からスレッド掘り出し（各記事 1 時間）
- D. 合格者ポジション活用の単発投稿新規（戦略 v6 強化）

### 4. 試験 2 ヶ月前の毎日投稿フレームワーク

- 試験まで約 51 日（試験は 2026-07 中旬）
- 戦略: 1 日 2-3 投稿で 100-200 投総計
- コンテンツミックス（戦略 v6 準拠）:
  - 過去問クイズ 25%
  - 模範論文・テンプレ告知 10%
  - 受験生応援・体験談 10%
  - note 新記事告知 5%
  - **キーワード解説は X 廃止**（IG/YT 担当）
- 配信時刻ローテーション: 朝 8 時 / 昼 12 時 / 夜 20-21 時

### 5. YouTube Shorts 未着手

- VOICEVOX 起動 + M2 用テンプレ新設が必要
- 既存 yt-shorts-create はキーワード MDX 専用
- 半日〜1 日の追加投資要

## 残った懸念点・既知の問題

| 項目 | 状態 |
|---|---|
| Tweet 02 が CTA なしで公開済み | 教育コンテンツとして残置（削除推奨せず）|
| 既存 draft の status.json が虚偽 scheduled | 旧 publish-x のバグで「失敗→ scheduled 誤更新」していた。新規投稿時は無視 |
| publish-x.ts 修正の commit 未実施 | Windows 対応改善は資産だが今日中の commit はスキップ。次セッションで commit 推奨 |
| `.tmp/` 配下のデバッグスクリプト | x-login / x-verify-post / x-inspect-schedule / x-debug-post / x-list-scheduled が散在。再利用可能だが整理推奨 |

## 関連 commit / artifact

| commit | 内容 |
|---|---|
| 6230f5d3a | M2 戦略転換 commit |
| 04100e183 | M2 ディレクトリ移設 + assets |
| 38a561a98 | M2 SVG品質修正 + markdown表19個変換 |
| 39c0ba1a7 | M2 ワークシート7章 polish |
| 89c618d20 | M4 解答テンプレ3D 移設 + assets |
| 5ebbc83f2 | M4 章立てコードブロック→箇条書き |
| e8235eee9 | M2 章末 CTA ピュア URL 化 + M4 末尾 CTA セクション追加 |
| 8d7f7a183 | M2 公開記録（noteId n60efbccd728b、2026-05-25）|
| 99eee1461 | M2 SNS 公開告知素材一式（X draft 031 + IG カルーセル）|
| **未 commit** | publish-x.ts 修正（Windows対応・文字数 guard・Ctrl+Enter・成功判定強化）|

## このセッションで学んだ教訓

1. **Windows と Mac のキーボードショートカット差を最初に検査する** (`Meta+V` ≠ Windows のペースト)
2. **silent failure を避けるため成功検出を二重化する**（X UI の disabled button click が成功扱いされていた問題）
3. **無料記事（リード磁石）でも CTA 配置と文字数監査が必須**
4. **既存資産の継承を信頼しすぎない**（status.json の "scheduled" が嘘だった例）
5. **大量の連投はリスクあり**（X のスパム判定、フォロワー疲労）→ 予約配信でドリップ化が安全
