# Claude Code 指示プロンプト：note カバー Clarity V3

以下を Claude Code の新しいセッションに、そのまま貼り付けて使う。

```text
note記事カバーに「Clarity V3」を実装してください。

最初に必ず次を全文読んでください。
- CLAUDE.md（存在する場合）
- .claude/knowledge/design-system/note-cover-clarity-v3.md
- .claude/knowledge/design-system/note-cover.md
- .claude/knowledge/design-system/note-cover-tokens.json
- .claude/knowledge/reference/note-svg-policy.md
- .claude/skills/conversion/ogp-create/SKILL.md
- .claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs の note-cover-g2 実装
- scripts/generate-note-covers.mjs
- scripts/add-note-cover.mjs
- scripts/check-note-cover-fit.mjs
- .claude/agents/note-cover-writer.md

目的:
note一覧の小さいサムネイルでも「何の記事か・何が得られるか」が約0.5秒でわかるカバーにする。ただし既存G2を一括変更せず、cover.variant: clarity の記事だけに適用する。

今回の対象:
- 実装は opt-in の Clarity V3 variant
- 実データでの適用は次の1記事だけ
  docs/note/1級・2級土木/1級土木/1級経験記述で落ちる答案/article.md
- note.comへのアップロード・公開・ライブカバー更新は行わない
- 他記事のcover frontmatterや生成画像は変更しない

代表記事の正規cover spec:

cover:
  variant: clarity
  leadIn: "1級土木｜施工経験記述"
  headline: "落ちる答案"
  hi: "4"
  hiSuffix: "つの型"
  alert: "知らないと減点"
  banner: "元発注者の視点で解説"
  meta: "無料記事"
  character: thinking
  tone: base

重要な実装制約:
1. cover.variant が無い既存G2は、出力ロジックも見た目も変えない。
2. renderNoteCoverG2 の入口で clarity へ分岐する。新しい外部template IDは増やさない。
3. Clarity V3の主要情報 headline / hi+hiSuffix / banner は中央630×630の内側、実用幅590pxに全文を収める。
4. chipsはClarity V3では使用しない。既存G2では引き続き3個必須。
5. 文字を切り詰めたり暗黙に二行化しない。最小フォントで収まらない場合は検証エラーにする。
6. 色、座標、フォントサイズは .claude/knowledge/design-system/note-cover-tokens.json をSSoTにする。rendererへの重複直書きを最小化する。
7. 既存キャラクター素材を使い、新しい画像生成はしない。キャラクターは補助装飾で、主見出しより目立たせない。
8. article.mdの本文とcover以外のfrontmatterを変更しない。改行コードを壊さない。
9. dirty worktreeの既存変更はユーザーのものとして保持し、無関係な整形・削除・巻き戻しをしない。
10. debug safety版を確認した後、通常版を最後に再生成し、赤枠を成果物に残さない。

変更対象:
- .claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs
- .claude/knowledge/design-system/note-cover-tokens.json
- scripts/add-note-cover.mjs
- scripts/check-note-cover-fit.mjs
- .claude/agents/note-cover-writer.md
- .claude/knowledge/design-system/note-cover.md
- 代表記事のarticle.mdとimg/cover.svg、img/cover.png

設計書に書かれた座標・優先順位・フィット関数・検証条件を実装してください。実装中に設計書と現行コードが衝突した場合は、後方互換と中央クロップ安全性を優先し、勝手にスコープを広げず差異を報告してください。

検証:
- node scripts/generate-note-covers.mjs "1級経験記述で落ちる答案"
- node scripts/generate-note-covers.mjs "1級経験記述で落ちる答案" --debug-safety
- 通常版を再生成
- npm run check-note-cover-fit
- npm run note-cover-gallery
- node --test tests/*.test.mjs
- git diff --check
- git status --short

目視確認:
- フル1280×670
- 中央630×630クロップ
- 幅320px相当
- 「落ちる答案」「4つの型」「元発注者の視点で解説」が欠けずに読める
- キャラクターと警告ラベルが主要情報に重ならない

最後の報告には次を含めてください。
- 実装した構造と後方互換の説明
- 変更ファイル一覧
- 実行した検証コマンドと各結果
- 目視確認した画像と判断
- 未実施事項（note.comへのライブ反映）
- 残課題または設計書からの差異

完了後は handoff-logger の指示に従い、docs/handoffs/ に作業ログを残してください。
```
