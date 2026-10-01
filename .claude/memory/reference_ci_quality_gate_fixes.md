---
name: ci-quality-gate-fixes
description: develop CI赤(quality:audit:ci)の2ゲート修復手順=content-quality-ratchet(baseline更新)とnote-funnel(wire-cta)。模範解答コミットはSKIP_NOTE_PARA
metadata: 
  node_type: memory
  type: reference
  originSessionId: 8d9ca99c-eaab-4581-8871-6676ed4fc66a
  modified: 2026-07-23T07:27:49.024Z
---

`Pre-merge check` の `build` が赤い時、多くは `npm run quality:audit:ci` の個別チェック失敗。個別再現＝各 npm script を直接実行（`quality-audit.mjs` の `npm:` フィールド参照）。2026-07-23 に頻出2ゲートを修復した手順:

**content-quality-ratchet**（`check-content-quality:ci` = `lint-mdx-mobile.mjs --all --baseline --ci`）
- 新年度の過去問（例 r08-primary/secondary）が baseline 比で新規違反（1-3=4列表／3-1=入れ子リスト／15-3=300字超段落）を出す。
- **過去問データ表・模範解答の散文は全年度（h21〜r05）が既に baseline 受容済み**（r04-primary は 1-3:13）。≤3列へ崩すのは他年度と不整合＝**`node .claude/scripts/lint-mdx-mobile.mjs --all --update-baseline` で新年度も同様に受容**（差分は当該記事の数エントリのみのはず）。

**note-funnel**（`check-note-funnel` = `audit-note-funnel.mjs --ci`・source のみ）
- 公開記事(noteStatus:published)に冒頭/末尾 CTA 欠落＝D1。修復は `npm run wire-note-funnel-cta -- --exam <key> --apply`（先に `--apply` 無しで dry-run）。
- **罠**: wire-cta は既存の手書き「〜もくじ」ブロックを検知せず**重複追記する**→適用後に重複を目視除去して1本化する。
- checker(`check-note-magazine-cta`)は `<!-- cta:pack-top -->` 域の markdown リンクを**免除済み**なので §14-c は問題にならない。実際に pre-commit を止めるのは**模範解答本文の段落200字超（note-lint B5）**＝散文答案は仕様免除なので `SKIP_NOTE_PARA=1 git commit` で通す（[[feedback_pe_essay_template_axis]]）。

**共有ワークツリーでの安全な実施**: origin/develop に隔離 worktree を切り、`ln -sfn <main>/node_modules` で script を回す→`quality:audit:ci` が pass N/fail 0 を確認→`git push origin HEAD:develop`（FF）。他セッションの未コミット変更を触らない。

**CTA のライブ反映**: `check-note-republish` は**CTA 変更を drift 除外**（本文drift=0のまま）＝ソースCTAは自動再公開されない。既存公開記事へライブ反映するなら `note-append-cta`（単一URLカード追記・別形式）だが、多リンク blockquote CTA は忠実再現できない→**記事側の次回 republish（note-update-body）に載せるのが本筋**。関連: [[reference_note_republish_drift]] / [[reference_note_funnel_cta_lint_conflict]] / [[reference_quality_audit_system]]
