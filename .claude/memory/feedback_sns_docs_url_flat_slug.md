---
name: feedback_sns_docs_url_flat_slug
description: "SNS/MDX本文/note原稿の/docs/リンクは本番フラットslug(カテゴリ-ディレクトリ)必須。RelatedKeywordsはcivilでcivil-construction-1-接頭辞必須。check-sns-urlsがpre-commitで検証"
metadata:
  type: feedback
---

## /docs/ リンクはフラット slug 必須
SNS 投稿（docs/sns/**: X tweets.md / IG caption・script 等）の `doboku-note.com/docs/{slug}` は、本番ルートが「カテゴリ-ディレクトリ」のフラット slug のため、ページのディレクトリ名だけで組むと404。
- 誤 `/docs/primary-r03-kouki` → 正 `/docs/civil-construction-2-primary-r03-kouki`。曖昧例 `/docs/keyword-2026` は総監/土木1級の両方に存在→文脈で確定（civil なら `civil-construction-1-keyword-2026`、総監なら `pe-comprehensive-management-keyword-2026`）。slug の真実源は `src/config/doc-meta-index.json` の `docs` キー。
- **Why:** 2026-06、X 投稿149件（560+ impressions）が接頭辞欠落で全リンク切れ。投稿済みライブツイートの URL は遡及修正不可（delete+repost か返信で正リンク補足のみ）なので投稿前検出が必須。
- **How to apply:** `node scripts/check-sns-urls.mjs`（docs/sns 全走査）/ `--staged`（pre-commit 組込済・broken は commit 不可）。テンプレ行（`<year>`/`{年度}`/`｛｝`）は検証スキップ。
- **MDX 本文も同じ罠（2026-06-09）**: `.local/r2/posts/**/*.mdx` の bare `/docs/{slug}` markdown リンクもフラット slug 必須（誤 `/docs/r07-required` → 正 `/docs/pe-construction-r07-required`）。旧 slug 40件が滞留→クリーンアップ済み。`--staged` が staged の MDX も検査、全件は `--mdx`。
- **docs/note も対象（2026-06-10 実装済 42a6f877b）**: BK-01道路の関連リンクが `/docs/r0X-road`（正 `/docs/pe-construction-r0X-road`）で404のまま pre-commit をすり抜けていた。docs/note/**.md は bare URL `doboku-note.com/docs/` と markdown `](/docs/)` の両形式を検査（note.com プレースホルダーは自動スキップ）。拡張で既存の壊れリンク140件が表面化→`838f9ee1e` で BK-02〜11・BK-I 全155記事の関連セクションを正規形に統一＋総監ガイド2件是正（全410ファイル0件）。`/docs/pe-construction`（存在しない過去問索引）等の生成ミスは散文マガジン案内へ置換。`--staged` が docs/note/*.md も検査、全件は `--note`（ビルド成果物 `.next/server/app/docs/{slug}.html` でも実在確認可）。
- **2026-09-24 以降（DN-0288）**: 2026-08-22 の URL 移行で `/docs/{slug}` は 301 になった。note・SNS の新原稿は新 URL（`https://doboku-note.com/exam/{資格}/{種別}/{slug}` 等・対応は `public/_redirects`）。check-sns-urls は新 URL も `_redirects` の転送先と突合し、資格以降をハイフンでつないだ打ち間違い（`/exam/<資格>/textbook-mix-design`＝404）に正 URL を提案。check-note-site-utm は note 原稿の旧 `/docs/` を `[legacy-url]` で止め、張り替えは `npm run fix-legacy-site-links -- --write`。フラット slug の規則は MDX 本文の相対 `/docs/{slug}`（描画時に張り替わる）と既存原稿の互換にだけ当てはまる。
- 関連: [[feedback_publish_x_false_success]] [[feedback_prevention_over_patching]]

## RelatedKeywords は civil で `civil-construction-1-` 接頭辞を明示
`src/components/ui/RelatedKeywords/RelatedKeywords.tsx` の `buildHref` は `pe-comprehensive-management-` または `civil-construction-1-` で始まる slug はそのまま、それ以外は**無条件で `pe-comprehensive-management-` を補完**する。PE ページは bare slug でよい。**civil ページは必ず `civil-construction-1-` を明示**（bare だと PE 配下を指す URL で404）。
- **Why:** 2026-05-16 `fix-civil-related-keywords-prefix.mjs` が「bare slug 規約」を根拠に civil 42ページから接頭辞を機械的に剥がし240リンクが全て404化（lint 9-9 が PE 用規約を civil に誤適用）。2026-05-17 復旧コミット `79b00f8d3`。lint 9-9 は `civil-construction-1-` を REDUNDANT_PREFIXES から除外済み。
- **How to apply:** civil-construction-1 配下の MDX に `<RelatedKeywords>` を書く/自動生成するときは接頭辞必須。「bare slug が規約」とするスクリプト・doc は civil 適用前提を疑う。「内部リンク密度」「PE と同パターン」を理由に civil 用自動化を派生させるときはコンポーネントの fallback 仕様を先に確認。
