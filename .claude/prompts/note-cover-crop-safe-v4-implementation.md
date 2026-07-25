# Claude Code一括プロンプト

```text
note記事・マガジンのカバー画像について、表示面ごとのトリミングで重要文字が途切れない「Crop-safe V4」を実装してください。

最初に必ず次を全文で読んでください。

1. CLAUDE.md
2. .claude/knowledge/design-system/note-cover-crop-safe-v4.md
3. .claude/plans/note-cover-crop-safe-v4-implementation.md
4. .claude/knowledge/design-system/note-cover.md
5. .claude/knowledge/design-system/note-cover-clarity-v3.md
6. .claude/knowledge/design-system/note-cover-tokens.json
7. .claude/skills/conversion/ogp-create/SKILL.md
8. .claude/agents/note-cover-writer.md
9. .claude/skills/social/note-magazine-cover/SKILL.md
10. .claude/skills/social/publish-note/references/update-mode.md

公式仕様:
https://www.help-note.com/hc/ja/articles/360000231642-%E7%99%BB%E9%8C%B2%E7%94%BB%E5%83%8F%E3%81%AE%E6%8E%A8%E5%A5%A8%E3%82%B5%E3%82%A4%E3%82%BA%E4%B8%80%E8%A6%A7

作業開始時にgit branch、git status、originとの差分を確認し、既存の未コミット変更を保護してください。無関係なファイルを戻さず、git add .、git add -A、破壊的git操作を使わないでください。

最初は代表6件のパイロットだけを実装してください。全記事・全マガジンの一括差し替え、note.comへのcommit、deployは行わないでください。

必須要件:

- キャンバス1280×670を維持
- 中央630×454をlist-safe
- 中央630×216をcore-safe
- 主要文字の左右幅は590px以内
- headline、数字、benefit、magazineNameをどのcropでも全文残す
- V4はopt-in。既存G2を変更しない
- AI画像生成へ日本語、数字、ロゴを描かせない
- Codex MCPは文字なし背景・人物・象徴物だけを生成
- 日本語、数字、ロゴ、色、座標はSatori/SVGで決定論的に重ねる
- visualAssetが無い場合は既存背景へ安全にフォールバック

変更対象:

- .claude/knowledge/design-system/note-cover-tokens.json
- .claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs
- scripts/add-note-cover.mjs
- scripts/generate-note-covers.mjs
- scripts/generate-magazine-covers.mjs
- scripts/check-note-cover-fit.mjs
- scripts/note-cover-gallery.mjs
- .claude/agents/note-cover-writer.md
- 必要なテスト

必要なら次を新設してください。

- scripts/build-note-cover-inventory.mjs
- scripts/build-note-cover-visual-manifest.mjs
- scripts/audit-note-cover-crops.mjs
- .claude/state/note-cover-v4-inventory.json

frontmatter variant:

cover:
  variant: crop-safe-v4
  leadIn: "技術士 総監｜択一式"
  headline: "頻出テーマ"
  hi: "680"
  hiSuffix: "問分析"
  benefit: "学習の優先順位がわかる"
  meta: "無料記事"
  visualPrompt: "データ分析を象徴する抽象的なカードとグラフ"
  visualAsset: "img/cover-visual.png"
  character: thinking
  tone: base

マガジンではqualifier、magazineName、proof、benefitを使用し、magazineNameとqualifierをcore-safeへ置いてください。既存lines[]は後方互換として維持してください。

代表6件:

1. 総監無料記事
2. 総監有料記事
3. 総監マガジン
4. 1級土木記事
5. 2級土木記事
6. 土木マガジン

現在クロップ切れが目立ち、回遊または売上への影響が大きいものを選び、選定理由、article path、noteIdまたはmagazine keyを先に記録してください。

画像生成:

- Claudeが各対象の記事内容からvisualPromptを作る
- JSONL manifestを作る
- Codex MCPへ文字なし画像生成を依頼する
- 1280×670
- 中央630×454は低情報量
- 装飾は左右
- 文字、数字、ロゴ、署名、透かし、疑似文字は禁止
- 生成後に中央安全領域、画風、人物破綻、文字混入を目視する

6表示面を実画像として生成してください。

- full: 1280×670
- square: 中央630×630
- list: 中央1280×454
- core: 中央1280×216
- card: 320×168
- related: 160×110

galleryは1対象につき6面を横並びにしてください。

fit検査:

- headline幅590px以内
- hi+hiSuffix幅590px以内
- benefit幅590px以内
- magazineName幅590px以内
- 主要要素がcore-safe/list-safe外へ出ない
- V4にchipsがあれば警告
- visualAssetが存在し1280×670
- 最小フォントでも収まらない文字列は切り詰めずエラー
- debug枠が成果物へ残らない

GeneratorとEvaluatorを分離してください。生成担当とは別のサブエージェントに、クロップ耐性、0.5秒理解、内容一致、資格識別、小型可読性、ブランド一貫性を各0〜3点で採点させてください。全軸2点以上かつ合計15/18以上を合格とします。

検証:

node scripts/generate-note-covers.mjs <scope>
node scripts/generate-magazine-covers.mjs <scope>
npm run check-note-cover-fit
npm run note-cover-gallery
node --test tests/*.test.mjs
npm run type-check
npm run lint
git diff --check

既存variantなし/G2の記事を1件再生成し、意図しないピクセル差分が無いことを確認してください。

パイロットではnote.comへ保存しないでください。note-update-coverとnote-magazine-coverはdry-runまでです。アカウント、対象ID、アップロードUIを確認して終了してください。

完了時に以下を報告してください。

1. 選定した代表6件
2. 実装したV4仕様
3. Codex生成素材
4. 6crop評価
5. ルーブリック結果
6. 既存G2非回帰
7. 検証コマンドと結果
8. note.com未反映であること
9. 全件移行前の残課題

docs/handoffs/YYYY-MM-DD-note-cover-crop-safe-v4-pilot.mdへ作業ログを残してください。
```
