---
name: r8-hit-trust-assetization
description: R8的中の信頼性資産化を全面実施。的中の帰属は設問(3)バンク（予想問題集は虚偽帰属で禁止）。資格クレジットを全画像テンプレへ
metadata: 
  node_type: memory
  type: project
  originSessionId: 0f276a5a-3c55-4ad4-af40-cd08c2c67357
---

R8総監本試験（2026-07-19）の記述式I-2「地方創生」的中を信頼性資産として全面展開（2026-07-20 実施・9コミット）。

**最重要ファクト**: 的中したのは**設問(3)国家施策バンク（¥2,980・6/1公開）**の「地方創生・東京一極集中」回（施策6案）。**R8予想問題集（6テーマ・¥3,480）に地方創生は無い**——「予想問題集が的中」と書くのは購入者検証可能な虚偽帰属で**禁止**。表現ガイドは note-funnel-architecture.md と ogp-prompts.md 変更履歴、実装計画 `~/.claude/plans/r8-codex-twinkling-ritchie.md` に記録。

**実施済み**:
- テキスト面: note-magazines.ts（バンクdescription/ctaCatch）・R8関連記事の的中注記（live反映・API検証済）・マガジン説明live更新・author.ts bio・llms.txt・note/X/IG bio文案・ココナラbio
- 画像面: OGP左下＋noteカバーG2ロゴ直下に**時事非依存の資格クレジット**（SSOT=`ogp-templates.mjs` の `AUTHOR_CREDENTIAL_OGP/G2`）を実装し全面再生成（OGP1,113+カバー717）。civil含む全資格に総監資格が載る=信頼転移。`award` アイコン新設・R8関連5カバーに的中チップ＋live差し替え済
- 新規記事「白書連動分析の的中プロセス」（n021d95a51f24・無料）=外した側も開示する信頼の実演

**実機反映済み（Playwright）**: note プロフィール bio（settings/profile の `textarea[name=editBiography]`・保存確認済）・ココナラ profile（スクリプト修復して反映）

**残タスク**: X的中投稿（draft 080・7/21以降1本・bio更新と同日にX実機で手動＝凍結歴アカのため自動化しない）・IG bio 貼り付け（手動・107字新版）・main への deploy（R2同期）

**知見**:
- note-append-cta の挿入は**直後ブロックのスタイルを継承**（目次/区切り直前アンカーだと見出し化。段落が続くアンカーを選ぶ）
- ABORT後は下書きに挿入が残る→`--save-only`で publish フローのみ再実行
- 設問3バンク序章は live が有料記事設定（frontmatter free とドリフト・`--keep-boundary` で更新可）
- ココナラ /mypage/user はインライン編集型（鉛筆 `.d-profileItemControlButton` で展開）＝2026-07-20 スクリプト対応済み
- note プロフィール編集は `note.com/settings/profile` の `editBiography`（140字）・保存ボタンで単純 fill 可（.tmp/note-profile-update.mjs パターン）
- tankan topCta「本番直前の総仕上げ」が試験後に陳腐化=R9シフト要判断（新記事は topCtaExcludeDirs で回避）
