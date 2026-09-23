---
name: feedback_sns_docs_url_flat_slug
description: SNS投稿＋MDX本文の/docs/リンクは本番フラットslug(カテゴリ-ディレクトリ)必須。dir名だけだと404。check-sns-urls.mjsがpre-commitで検証(2026-06-09 MDX本文も対象に拡張)
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2b549401-7f9e-4686-a8ee-d4e93b588727
---

SNS 投稿（docs/sns/**: X tweets.md / IG caption・script 等）に書く `doboku-note.com/docs/{slug}` は、本番ルートが「カテゴリ-ディレクトリ」のフラット slug のため、**ページのディレクトリ名だけで組むと 404 になる**。

- 誤 `/docs/primary-r03-kouki` → 正 `/docs/civil-construction-2-primary-r03-kouki`
- 曖昧例 `/docs/keyword-2026` は総監/土木1級の両方に存在 → 文脈で確定（civil campaign なら `civil-construction-1-keyword-2026`、総監なら `pe-comprehensive-management-keyword-2026`）
- slug の真実源は `src/config/doc-meta-index.json` の `docs` キー

**Why:** 2026-06、X 投稿 149 件（560+ impressions）が接頭辞欠落で全リンク切れ。投稿済みライブツイートの URL は遡及修正不可（delete+repost か返信で正リンク補足しかない）ため、投稿前の検出が必須。

**How to apply:** SNS の URL は doc-meta-index に存在する slug かを必ず照合する。`node scripts/check-sns-urls.mjs`（docs/sns 全走査）/ `--staged`（pre-commit 組込済、broken はコミット不可）で機械検証。テンプレ行（`<year>`/`{年度}`/`｛｝`）は検証スキップ対象。

**MDX本文も同じ罠（2026-06-09 拡張）:** `.local/r2/posts/**/*.mdx` の bare `/docs/{slug}` markdownリンクも同じくフラットslug必須（誤 `/docs/r07-required` → 正 `/docs/pe-construction-r07-required`）。従来 check-sns-urls は SNS（ドメイン付きURL）のみで MDX本文を未検証だったため旧slug 40件が滞留→クリーンアップ済み。`--staged` が staged の MDX も検査するよう拡張済（ファイル別に正規表現切替）。全件は `node scripts/check-sns-urls.mjs --mdx`。

**docs/note も検証対象化（2026-06-10 実装済）:** 従来 check-sns-urls は **`docs/note/**` のnoteマガジン本文(.md)を未検証**で、BK-01道路の関連リンクが `/docs/r0X-road`（正 `/docs/pe-construction-r0X-road`）で404のままpre-commitをすり抜けていた。`42a6f877b` で check-sns-urls を docs/note/**.md に拡張（docs/note は bare URL `doboku-note.com/docs/` と markdownリンク `](/docs/)` の両形式を適用、note.com プレースホルダーは非マッチで自動スキップ）。`--staged`(pre-commit) が docs/note/*.md も検査、全件は `--note`。拡張で**既存の壊れリンク140件**が表面化→`838f9ee1e` で BK-02〜11・BK-I 全155記事の関連セクションを正規形に統一＋総監ガイド2件是正（全410ファイル0件）。`/docs/pe-construction`（存在しない過去問索引）等の生成ミスは散文マガジン案内へ置換。**今後docs/note記事はpre-commitが自動検証**（ビルド成果物 `.next/server/app/docs/{slug}.html` でも実在確認可）。関連: [[feedback_publish_x_false_success]]、[[feedback_prevention_over_patching]]。

**2026-09-24 以降（DN-0288）:** 2026-08-22 の URL 移行で `/docs/{slug}` は 301 になった。note・SNS の新しい原稿は新 URL（`https://doboku-note.com/exam/{資格}/{種別}/{slug}` 等・対応は `public/_redirects`）で書く。check-sns-urls は新 URL も `_redirects` の転送先と突合し、資格以降をハイフンでつないだ打ち間違い（`/exam/<資格>/textbook-mix-design`＝404）に正しい URL を提案する。check-note-site-utm は note 原稿の旧 `/docs/` を `[legacy-url]` で止め、張り替えは `npm run fix-legacy-site-links -- --write`。上のフラット slug の規則は、MDX 本文の相対 `/docs/{slug}`（描画時に張り替わる）と既存原稿の互換にだけ当てはまる。
