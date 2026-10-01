---
name: feedback_note_magazine_cover_display
description: "noteマガジン運営: カバーは共用前に一覧/ヘッダー/リンクカードの実表示を確認・URL反映は専用スクリプト・収録増はsnapshot再生成・新マガジンは実行系の配線チェックリスト"
metadata:
  type: feedback
---

## マガジンカバーを記事と共用する前に実表示を確認する（2026-09-28）
記事とマガジンに同じ POP レイアウトを使ってマガジン試作を作ったが既存の表示面調査を確認していなかった。過去の調査は `.claude/knowledge/design-system/note-cover-crop-safe-v4.md` §9: フル1280×670、マガジン一覧の中央1280×454、狭いヘッダーの中央1280×216、リンクカード320×168をプレビュー対象。
- note 公式ヘルプ「登録画像の推奨サイズ一覧」: マガジンヘッダー推奨比率1.91:1、一覧等では1280×454の範囲を表示。2026-09-28 に公開中の案内記事 `https://note.com/dobokunote/n/n89b3048e5d24` を PC ブラウザで実測すると、マガジンリンクカード全体は620×152px、画像枠は220×150px、画像は `background-size: cover; background-position: 50% 50%` で、元の1280×670から左右が各約148px切れる。端末・表示面で比率が変わるので仕様書の1つの寸法だけで安全と判定しない。
- 次回は既存調査と現行カードを読んでから、マガジン固有の視覚階層を設計し、主商品名を中央の狭いヘッダーとリンクカードの両方で読める位置に置く。原寸だけで完成判定しない。

## マガジン URL の本文反映は専用スクリプト（手作業置換禁止）
本文プレースホルダー `{{MAGAZINE_URL}}` への反映は sed/perl/Edit でなく:
`node .claude/scripts/note/inject-magazine-url.cjs <persona> <マガジンURL>`（例 `... 自治体技術基準担当 https://note.com/dobokunote/m/mf9f281e2cb32`・persona はディレクトリ名の `総監模範論文-` を除いた部分・付きでも可・配下の全 RXX/article.md を一括処理）。
- **Why:** (1) CRLF/LF を元ファイルから保持（MSYS `sed -i` は CRLF を LF に壊し git が「LF will be replaced by CRLF」警告）(2) `{{MAGAZINE_URL}}` 以外の旧バリアント（「※note 公開後に…予定」等）も吸収 (3) 冪等。2026-06-11 Opus が既存スクリプトを探さず perl で手置換し、その前段で MSYS sed が CRLF を一度破壊した。frontmatter の `noteUrl:`/`noteId:`（個別記事 URL・各記事公開後に記入）は非対象。
- **How to apply:** 着手前に `docs/reference/note-essay-review-checklist.md` Step10 と `.claude/skills/social/publish-note` を Read（CLAUDE.md「書く前に読む」）。本文で `{{...}}` を見たら手で埋めず `.claude/scripts/note/` の対応スクリプトを探す。docs/note の .md 一括置換が必要でも `sed -i` でなく CRLF 保持手段（perl binmode / Node で元 EOL 保持）。プレースホルダーは単独行＝リンクカード化の前提（[[feedback_note_cta_no_price_linkcard]]）。

## 収録を増やしたら同じ commit で snapshot 再生成（2026-09-24）
`note-magazine-add-articles --commit` で収録を増やしたら `npm run verify-note-magazines -- --contents --json` で `data/note/magazines-snapshot.json` を作り直して commit する。
- **Why:** 2026-09-24 に会員お題ラボへ W9・W10 を収録（8→10）したが snapshot を直さず、`check-magazine-membership`（CI ゲート）が「ライブ 8」で赤になり無関係な PR #608・#609 の build まで落ちた。ライブの収録数は snapshot 経由でしか CI に見えない。
- **How to apply:** 収録・会員特典の収録を触ったら snapshot 再生成→`npm run check-magazine-membership` 緑→commit まで1セット。SoT の件数表記（`src/lib/note-magazines.ts`）が変わる場合も同 commit。カードを閉じる前の docs 参照確認は todo-complete の doc-refs 検査（PR #611）が止める。関連: [[feedback_multi_session_concurrent_git]]

## 新マガジン追加は note-magazines.ts 登録だけでは実行系に配線されない（2026-07-01）
2026-07-01 の2級 想定工事バンクで顕在化した修正漏れ: `keiken-charcount.mjs` の探索フィルタが「経験記述」substring 限定で dir 名に含まない想定工事バンクを一括スキップ（36本の解答欄字数チェックが素通り）／`check-note-charlimits`（pre-commit 字数ゲート）は建設部門 BK 限定で土木 keiken は対象外／essay-writer/qa の型リスト・sales-recorder の productId マッピングも未追記。check-doc-coupling は skill/agent の追加削除・description 変更しか見ず「新コンテンツ型が既存の実行系に配線されたか」は無防備だった。
- **配線チェックリスト**（`note-magazines.ts` の MAGAZINES_RAW 直前コメントに明文化）: 1. cover: `generate-magazine-covers.mjs` / `generate-magazine-sidebar-banners.mjs` に定義 2. 売上: `sales-recorder.md` の productId マッピング 3. keiken 系なら `keiken-charcount.mjs` の探索フィルタに判別語追加（`check-magazine-wiring.mjs` が pre-commit で漏れを機械検知＝本命の再発防止） 4. Generator/Evaluator の対応型: `civil-keiken-essay-writer.md` 等＋`agents-registry.md` 5. `/doc-sync` を1回。
- `keiken-charcount.mjs` は `--staged --strict` で pre-commit ゲート化済み（土木 keiken 全体をカバー）。`check-magazine-wiring.mjs` が「答案マーカーを持つマガジンが字数ツールの探索対象に入っているか」を機械検証。[[feedback_prevention_over_patching]] の具体適用。
