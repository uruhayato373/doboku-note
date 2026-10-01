---
name: note-competitor-intel-pipeline
description: 競合の価格・品揃えを機械取得→時系列SSOT→drift→09反映する四半期パイプライン。全チャネル横断(note/X/IG/coconala。Brainは2026-09-26撤退)。/competitor-review
metadata: 
  node_type: memory
  type: project
  originSessionId: 7d6c7a6f-dcde-44c7-b1ea-2fec69de18a8
  modified: 2026-07-20T10:47:13.120Z
---

競合を機械調査するパイプライン（2026-07-20 新設・note版は develop→main デプロイ済み）。**同日に多チャネル横断へ一般化**（PR #419 merged to develop）。

**多チャネル到達点(2026-07-20)**: 稼働=note(16社・公開API)＋**coconala**(`scout-coconala-competitors.mjs`＝profileの販売実績header + market-research.jsonの価格ハイブリッド。ちゃんさと技師866/303geos603。09§D充填済)。未実装(次S・要ユーザーマシン)=X(`scout-x-competitors.mjs`未・実アカPlaywright・**凍結リスクで監督必須**)/IG(自セッションPlaywright・probe先行)/Brain(probe先行・競合実在未確認)。改名=`/competitor-review --platform`・`competitor-analyst`(全ch名寄せ)・`09_販売チャネル競合分析.md`(§A note+§D coconala充填/§B§C§E スケルトン)。置き場=カタログ`.claude/config/{ch}-competitors.json`+時系列`.claude/state/{ch}/history/`(ZoneC機械)／09=docs(ZoneA・Obsidian可視)。coconala知見=profileの出品カードは推薦カルーセルと同一DOM(他社混入)→販売実績のみclean・価格はmarket-research由来。ちゃんさと=note低価格入口/coconala高単価本体の2ch階段。白地=学科記述/模試/年度別/2級専業。関連: [[note-competitive-analysis-2026]]

**構成（機械取得＋判断の分離）**:
- `npm run scout-note-competitors` … note 公開 API から 12社のマガジン/単品/価格/スキ数/更新頻度を取得。**日付つき時系列 `.claude/state/note/history/competitors-YYYY-MM-DD.json`（コミット下 SSOT）＋前回比 drift 検出**（価格改定/新商品/休眠/新規参入）。最新ポインタ=`competitors-snapshot.json`。ad-hoc は `-- --handle x,y`、深掘り `-- --note-pages 20`/`--contents`。
- `note-competitor-analyst`（Evaluator・sonnet・audit-only）… snapshot の `drift[]` 起点で 4観点評価＋**「09 反映パッチ」**（そのまま貼れる節別文案）を出力。09 は直接書かない（親がユーザー承認後 Edit）。
- `/note-competitor-review`（management スキル）… scout→analyst→09反映 の3段。
- `npm run check-competitor-scan-due` … 四半期90日の期限 surfacer。weekly-review Agent B が DUE を surface。定期性は新規cron無し＝surfacer＋`docs/todo/annual.md`四半期定例で担保。

**ハンドル SSOT**: `.claude/config/note-competitors.json`（12社。urlname は note ユーザー検索 API `api/v3/searches?context=user&q=` で確認。例: P.E.Jp=vast_flax7410 / TechPro史=chic_vole6176）。

**制約**: 有料本文は paywall 取得不可＝タイトル/価格/スキ数/投稿日まで（中身の質は「未読」扱い）。取得は公開ページのみ・creds不要（`curl --ssl-no-revoke`）で計測API ローカル禁止とは別枠。

**分析真実源**: `docs/project/01_戦略/09_note競合分析2026.md`（判断記録・実価格の真実源は `note-magazines.ts`）。関連: [[note-competitive-analysis-2026]]（前回手動調査）。
