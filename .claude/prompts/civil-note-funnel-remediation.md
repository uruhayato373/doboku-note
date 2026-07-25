# Claude Code 一括実行プロンプト：1級・2級土木 note導線修正

以下をClaude Codeへ一括で貼り付ける。

```text
このリポジトリで、1級・2級土木のサイト→note、note→note導線の修正を、ソース変更・公開note反映・検証・引き継ぎ記録まで完了してください。

最初に必ず次を全文で読んでください。

1. CLAUDE.md
2. .claude/knowledge/reference/note-funnel-architecture.md
3. .claude/plans/civil-note-funnel-remediation-2026-07-24.md
4. .claude/config/note-funnel.json
5. .claude/skills/social/audit-note-funnel/SKILL.md
6. .claude/skills/social/publish-note/SKILL.md
7. .claude/skills/social/publish-note/references/update-mode.md
8. .claude/agents/note-funnel-auditor.md
9. .claude/agents/note-operator.md
10. src/lib/note-magazines.ts
11. src/lib/brain-products.ts

この作業の真実源は .claude/knowledge/reference/note-funnel-architecture.md です。今回の詳細な完成仕様とURLは .claude/plans/civil-note-funnel-remediation-2026-07-24.md にあります。独自判断で別の導線へ変えず、矛盾を見つけた場合は真実源を優先し、矛盾点を報告してください。

作業開始時:

- git branch --show-current、git status --short、originとの差分を確認する。
- 既存の未コミット変更はユーザーまたは他エージェントのものとして保存し、無関係な変更を戻さない。
- 対象3記事、note-funnel.json、監査結果の変更前スナップショットを確認する。
- npm run audit-note-funnel と npm run audit-note-funnel -- --live を実行して、変更前のD1/D5/D6を記録する。

実装対象:

- docs/note/1級・2級土木/経験記述-AI設計-無料/article.md
- docs/note/1級・2級土木/1級土木/一次択一-過去問PDF/article.md
- docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md
- .claude/config/note-funnel.json

必須実装:

1. note-funnel.json
   exams.civil.topCtaExcludeDirs に次の3ディレクトリを重複なく追加する。
   - 経験記述-AI設計-無料
   - 1級土木/一次択一-過去問PDF
   - 2級土木/一次択一-過去問PDF

2. AI設計記事 n0171b3105e2d
   - marker `<!-- cta:civil-ai-kit -->` でBrain商品CTAを商品説明直後へ追加する。
   - URLは https://brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY
   - marker `<!-- cta:civil-mokuji -->` で末尾に土木もくじを追加する。
   - 土木もくじURLは https://note.com/dobokunote/n/n4fde0f62dc20
   - 価格は本文へハードコードしない。

3. 1級一次PDF n155093f42183
   - 現在の `cta:pack-top` と二次まるごとパック md29a34906314 のCTAを削除する。
   - marker `<!-- cta:civil-1-primary-ronten -->` で、1級一次 出る順合格ノートへのCTAに置換する。
   - URLは https://note.com/dobokunote/n/nec34238ca6d6
   - 末尾の土木もくじCTAは維持する。

4. 2級一次PDF n4963f45bd6f8
   - 現在の `cta:pack-top` と2級想定工事バンク m8554e87ca6ec のCTAを削除する。
   - 一次向け代替商品がないため、冒頭の商品CTAは追加しない。
   - 末尾の土木もくじCTAは維持する。

記事へ入れる正確な文面は .claude/plans/civil-note-funnel-remediation-2026-07-24.md の「4. ソース実装」を使ってください。マーカーとURLは冪等にし、同一URLを重複させないでください。

サブエージェント:

- ソース編集前または編集後に note-funnel-auditor を起動し、対象3記事と土木もくじの意味監査をさせる。
- このサブエージェントはEvaluatorとして監査だけを行い、ファイルを編集させない。
- 必要なら note-operator に、既存の更新スクリプト・公開note・SoTの整合確認だけをさせる。
- 同じファイルを複数エージェントへ編集させない。
- 親エージェントが最終判断と編集を担当する。

ソース検証:

- 対象3記事へ node scripts/note-lint.mjs を個別実行する。
- npm run audit-note-funnel
- npm run check-note-funnel
- npm run check-note-republish
- review surfacerを含め、civil対象だけを明確に報告する。他カテゴリの既存違反と混同しない。
- 必要なら監査スクリプトに回帰テストを追加するが、この3記事だけを通すハードコードはしない。

公開note反映:

- ソース検証に合格してから行う。
- Playwrightの既存スクリプトと永続ログインプロファイルを使う。MCP Playwrightはnote更新に使わない。
- まずdry-runし、対象記事ID、アカウントdobokunote、本文長、有料境界を確認する。
- AI無料記事は通常更新する。
- 1級・2級の有料PDFは価格とpaidBoundaryを絶対に変えない。原則として scripts/note-update-body.mjs と --keep-boundary を使い、安全条件が満たせなければ保存せず中断する。
- 全選択削除＋pasteは禁止。
- 更新通知は必ず「いいえ」。フォロワー・購入者へ更新通知を送らない。
- 一件失敗したら続行せず、状態を実査してから再開する。

公開後検証:

- npm run audit-note-funnel -- --live
- 公開APIまたはブラウザで次を確認する。
  - n0171b3105e2d に Brain URL と n4fde0f62dc20 がある。
  - n155093f42183 に nec34238ca6d6 と n4fde0f62dc20 があり、md29a34906314 がない。
  - n4963f45bd6f8 に n4fde0f62dc20 があり、m8554e87ca6ec がない。
  - 1級一次の価格1980円、2級一次の価格1480円が維持されている。
  - 有料境界が維持されている。
  - civilのD1/D5/D6がゼロ。

完了時:

- docs/handoffs/YYYY-MM-DD-civil-note-funnel-remediation.md を作成し、変更、実行コマンド、結果、公開note実査、残件を記録する。
- 既存の無関係な変更を含めない。
- git add . と git add -A は使わない。
- deploy、価格変更、新商品作成、他資格の修正は行わない。
- 最終報告は「変更したもの」「公開noteへ反映したもの」「検証結果」「未解決」の4点を簡潔にまとめる。
- 途中で質問して止まらず、安全かつスコープ内で判断できることは進める。ただしアカウント不一致、有料境界を保証できない、公開記事本文が空または異常に短い場合は保存せず停止して報告する。

完了条件をすべて満たすまで、ソース変更だけで完了扱いにしないでください。
```
