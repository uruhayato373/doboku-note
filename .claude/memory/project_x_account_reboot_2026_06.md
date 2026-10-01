---
name: project-x-account-reboot-2026-06
description: 凍結後の新Xアカ再開。予約前ゲートx-schedule-guard+_archive隔離で再発防止、直前カウントダウンWeek1を仕込み済
metadata: 
  node_type: memory
  type: project
  originSessionId: b25bfe98-8d18-4c79-beae-27389d0a9077
---

2026-06-21、前アカ凍結（[[feedback_x_suspension_guardrail]]）後にユーザーが**新 X アカウントで再開**を決定。技術士建設部門（筆記7/20）・総監（必須7/19）の**1ヶ月前カウントダウン**、1日2投稿（建設1＋総監1）、主軸「再受験コスト（受験料¥14,000＋もう1年）＞合格を今買う」。

**再発防止設計（ブランチ feat/x-schedule-guard・develop ベース、未 push）**:
- **予約前ゲート** `npm run x-schedule-guard`（`scripts/x-schedule-guard.mjs`）: 全 status.json(SSOT) を読み、同時刻衝突／near-dup(正規化トライグラムJaccard≥0.62)／1日上限超 を BLOCK(exit1)、時刻ジッタ無／同一URL反復 を WARN。`--queue` で X実キュー(Playwright)突合し既存予約と重複なら BLOCK。新規期は `--max-per-day 2`。
- **アカウント境界**: 旧アカ32ドラフトを `docs/sns/x/draft|published/_archive-old-account/` へ隔離。`_`接頭辞は guard / x-schedule-view / x-sync-status がスキャン除外＝新アカはクリーン台帳から。旧 status を新アカで publish しない物理防壁。
- 分業フロー＝writer→`x-post-qa`(§11ゲート採点)→status.json記入→**guard緑**→`publish-x --tweets N-M`(範囲限定で誤爆防止)→`x-sync-status`(偽成功実査)。週次小分け。真実源 `x-post-policy.md` §11.5、publish-x SKILL にもゲート配線済。
- **状態ライフサイクル** `scheduled`(計画・未投入)→`queued`(キュー投入済・x-sync-statusが実在確認して昇格＝§9検証兼ねる)→`posted`。guardの`--queue`二重チェックは`queued`を除外するので**後日バッチを積んでも緑を維持**（2026-06-21、Day1-2投稿後に既queued誤検出する穴を修正）。

**Week1 仕込み済**: `060-pe-construction-countdown-w1` / `061-pe-comprehensive-countdown-w1`（各7本、2本/日×6/22-6/28、時刻ジッタ済）。x-post-qa 採点 2.75/2.50・§11 PASS、指摘反映済（6/28販売重複を総監側無料化・総監フック/タグ分散・コスト表現は¥14k実額で誇張なし）。販売CTA5/14(36%)。

**ログイン済（2026-06-21）**: 凍結アカの旧セッションを wipe し `.local/playwright-x-profile/` を新アカで再ログイン（`.tmp/x-login.ts`＝headed systemChrome ランチャ。認証入力はユーザー手動）。`x-schedule-guard --queue` がヘッドレスでセッション再利用→実キュー空を確認済＝永続プロファイル機能を実証。

**新アカ = @doboku373**（2026-06-21 確認・`.tmp/x-whoami.ts` で x.com/home 認証済を実査）。

**2026-06-24 進捗**: Day1-2 が posted 昇格を実査確認（投稿成功＝「うまくいっている」）。**残り Week1（tweets3-7・両campaign計10本/6/24-28）を publish-x でキュー投入・x-sync-status で queued昇格10件実査一致**（commit 525cbe3e7）。**Week2-4 下書き43本を新規生成済**（建設22本=062/064/066・総監21本=063/065/067、試験日まで全網羅、commit でdevelop）。全57本 文字数0違反・near-dup最大20%・CTAローテ（note有料/無料/リンク無分散・実在slug検証）・当日応援はリンク無。

**週次キュー投入の段取り（要ローカル＝.local/playwright-x-profile のあるMac限定。クラウドルーチン不可）**: 各週の go-live 前に `x-schedule-guard --queue --max-per-day 2`緑→`publish-x <dir> --tweets 1-7 <日時×7>`（時刻は±ジッタ・両campaign同時刻回避）→`x-sync-status`で queued昇格数=投稿数を実査。**Week2(062/063)=6/28までに / Week3(064/065)=7/5までに / Week4(066/067)=7/12までに投入**。下書きは status.json 無し＝投入時に publish-x が生成。一括投入は§11「数十本積むな」で非推奨、週次小分け厳守。

**残**: プロフィール/links-hub への @doboku373 配線、Week2-4 の週次キュー投入（上記段取り）、ブランチ feat/x-schedule-guard の PR/deploy 判断。**注意**: §11.3 ban evasion リスク（同一端末/IPで新アカも凍結されうる）を承知の上での再開。投稿表示をプロフィールで時々目視。
