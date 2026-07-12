# R8予想 完全マトリクス — 公開ハンドオフ（2026-07-12）

> 生成・コミットは完了。以下は **実機公開（Windows/Mac のnoteログイン環境）の手順書**。試験前（総監7/19・建設7/20）に実行する。

## 完了済み（このセッション・develop にコミット済み）

- **総監 R8予想 56本**: 全14ペルソナ × R08-yosou-3(老朽化)/4(災害復旧)/5(AI社会)/6(経済安保) 新規＋既存①②QA是正。カバー画像112ファイル生成済。全数 charcount/heading/note-lint/cover-fit/UTM＋白書照合＋マトリクス整合性(persona一致・重複0)通過。
- **建設 BK-09電力土木・BK-10鉄道 R8予想 6本**: factcheck＋QA通過。
- frontmatter は全て `noteUrl/noteId/notePublishedAt: ""` ＋ `noteStatus: draft`（公開待ち）。

## 実機作業（順に実行）

### 1. note 公開（各記事 → noteUrl 取得）
- 総監56本＋建設6本を `publish-note`（Mac）/ `note-publish`（Win）で公開。ウェーブ推奨（テーマ単位）。
- 公開後、各記事の noteUrl を Claude に報告 → frontmatter writeback（`npm run note-inject-magazine-url` 系 / note-publish の writeback）。

### 2. マガジン収録
- 14ペルソナマガジンへ各 R08-yosou-3..6 を4本ずつ収録（`note-magazine-add-articles`）。
- BK-09/10 各マガジンへ R08-yosou の3本ずつ収録。

### 3. 印刷用PDF（Windows専用）
- 総監essay: `magazine-to-pdf.mjs`（`--print-to-pdf`=Chrome、Mmacはハング）→ 各記事に `note-attach-file` で添付。
- 記事本文は「印刷用PDF付き」と記載済みなので添付必須。

### 4. note-magazines.ts 更新（**公開後に**適用＝未公開content先出しでLive不整合を避ける）
- **ペルソナ14マガジン** description: 「R8予想2記事＝計7記事」→「**R8予想6記事（気候変動適応・資源循環・老朽化インフラ・災害復旧・AI社会・経済安全保障）＝計11記事**」。価格は **¥2,480 維持**（「同価格でR8予想4本増」を訴求）。ゼネコン(:89)/河川コンサル(:75)の「R8予想は横断フラッグシップに集約」旧文言は削除し他12ペルソナと同型に。
- **BK-09(:750)/BK-10(:762)**: title「（R03-R07）」→「（R03-R07＋R8予想）」、price **¥1,980→¥2,980**、記事数 15→18。
- **r8-forecast(:205)** description: 「各テーマに全14ペルソナ版の単品あり」の相互導線を追記。

### 5. sales-tracking.md productId 追記
- 総監per-persona: `article:essay-{persona}-r08-{3..6}`（既存①②命名に準拠）。
- 建設: `article:bk-power-civil-r8-yosou-{ii1,ii2,iii}` / `article:bk-railway-r8-yosou-{ii1,ii2,iii}`。

### 6. 検証
- `npm run verify-note-magazines`（収録・価格ドリフト0）。

## 重要な運用知見

- **並行書込み汚染**: cem-essay-writer を高並行で走らせると writeMdxFile 一時パス衝突で別ペルソナ内容が混入し得る（本セッションで下水道⑤がゼネコン⑤内容に汚染→是正済）。**batch commit 前に noteMagazine==dir persona ＋ MD5重複なし を必ず検査**。並行≤6推奨。
- hashtags.txt が未生成の記事あり（一部writer生成済）。公開前に `/note-hashtags` で補完。

真実源: `docs/note/技術士総監/総監マガジン構成_決定2026.md` / `docs/note/技術士建設部門/noteコンテンツ計画.md`。memory: [[project_r8_yosou_full_matrix_2026_07]]
