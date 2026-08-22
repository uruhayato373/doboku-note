// .claude/skills/quality/quality-cycle/scripts/lib/civil-prompts.mjs
//
// Civil Textbook Cycle の subagent 呼び出し用プロンプトテンプレート。
//
// civil-construction-review（Evaluator）と civil-textbook-rewriter（Generator）への
// 厳密な JSON 出力を要求するプロンプトを組み立てる。

/**
 * civil-construction-review subagent 用プロンプト（質的評価）
 *
 * @param {string} slug
 * @returns {string}
 */
export function buildReviewPrompt(slug) {
  return `あなたは civil-construction-review エージェントです。
完全な定義は \`.claude/agents/civil-construction-review.md\` を Read で読み、それに従ってください。
品質ルーブリックの真実源は \`.claude/content-principles.md\` です。

評価対象:
  ファイル: content/site/civil-construction-1/${slug}/article.mdx

実行手順:
  1. .claude/agents/civil-construction-review.md を Read で読む
  2. 評価対象ファイルを Read で読む（frontmatter の group が textbook/guide 以外なら「対象外」を返す）
  3. node .claude/scripts/lint-mdx-mobile.mjs <評価対象ファイル> を Bash で実行
  4. 5 軸ルーブリック（構造20% / 原則20% / モバイル30% / 図表15% / 参考資料15%）で
     各軸を 0〜3 点で採点
  5. weak_axes（score ≤ 1 の軸）を特定
  6. 質的コメント（30〜100字）を付与

**重要な出力ルール（必ず守る）**:
- reasoning や説明文を一切書かない
- 最終出力は **JSON 1 行のみ**
- weighted は出力しない（呼び出し側で再計算する）
- 前置き・後置き・コードブロックフェンス（\`\`\`）は禁止
- 思考過程を書き出さず、Read/Bash 実行後は即座に JSON を返す

最終出力フォーマット（このまま 1 行で返す）:
{"slug":"${slug}","group":"textbook|guide","scores":{"structure":N,"principle":N,"mobile":N,"figures":N,"reference":N},"weak_axes":[...],"qualitative_comment":"..."}

注意:
- スコアは整数 (0/1/2/3) のみ
- weak_axes は score <= 1 の軸名（"structure"/"principle"/"mobile"/"figures"/"reference"）
- group は frontmatter から取得
- 機械的判定不能な質的観点（日本語の自然さ・論理整合・画像品質）も評価に含める`;
}

/**
 * civil-textbook-rewriter subagent 用プロンプト（リライト）
 *
 * @param {string} slug
 * @param {string} group - 'textbook' | 'guide'
 * @param {string[]} weakAxes - review が特定した弱点軸
 * @param {string[]} expansionPatterns - 推奨拡張パターン (G/I/R/B/S/P)
 * @returns {string}
 */
export function buildRewriterPrompt(slug, group, weakAxes, expansionPatterns) {
  const hasG = expansionPatterns.includes('G');
  const hasI = expansionPatterns.includes('I');
  const hasR = expansionPatterns.includes('R');
  const hasB = expansionPatterns.includes('B');

  const patternInstructions = [];

  if (hasG) {
    patternInstructions.push(`
**G パターン（モバイル視認性修正）の実行ルール**:

既存の以下の表を **情報量を保持したまま** 階層化箇条書きに変換する:

変換の対象:
- 4列以上の表
- 3列表のいずれかのセルが 15字超のもの

変換の対象外（触らない）:
- 2列の表
- 3列表で全セルが 15字以内（2軸比較として成立）
- コード例や数式を含む表

変換形式:
- \`- **{セル1}**: {セル2} — {セル3}\`
- 列が 4 つ以上ある場合は 2 階層箇条書き
- 情報量を 1対1 で保持する（セル文言を要約・削除しない）
- 変換後の直前に導入文を入れる
`);
  }

  if (hasI) {
    patternInstructions.push(`
**I パターン（画像コンポーネント移行）の実行ルール**:

本文中の生 \`<img>\` を \`<ArticleImage>\` に置換する:
- alt は ≤80字、caption は**帰属情報のみ（≤60字）**。説明型 caption は禁止（\`.claude/content-principles.md\` §8）
- CC/PD 画像なら \`{/* source: URL, license */}\` コメントを \`<ArticleImage>\` の直前に付ける
- 画像ファイル（public/posts/... または R2）の存在確認はしなくてよい（既存 src を維持）
- 元の \`<img>\` の alt / caption に長い説明がある場合、説明は本文に散文化して移し、caption は帰属情報だけに短縮する
`);
  }

  if (hasR) {
    patternInstructions.push(`
**R パターン（参考資料節補完）の実行ルール**:

\`## 参考資料\` 節が欠落している or 不足している場合、末尾に追加または補強する:
- **公的（go.jp / or.jp / ac.jp）＋民間（Wikipedia・業界団体・ブログ等）の両方を最低1件ずつ**
- **書籍（著者名＋書名＋出版社）は記載禁止** — Web リソースのみ
- 本文中の法令名（建設業法、労働基準法、道路法、河川法、港則法、クレーン等安全規則 等）が未リンクなら e-Gov 内部リンクに差し替える
- URL は推測禁止。確信が持てる公式 URL のみ記載
`);
  }

  if (hasB) {
    patternInstructions.push(`
**B パターン（過去問バックリンク追加・guide 限定）の実行ルール**:

group === 'guide' の場合のみ実行:
- H2 セクション単位で、対応する過去問ページへのインラインリンクを追加
- 過去問スラッグ: \`civil-construction-1-primary-h26-a\` 〜 \`primary-r07-b\`、\`civil-construction-1-secondary-r03\` 〜 \`secondary-r07\`、\`civil-construction-1-secondary-{分野}-past-problems\`
- 実在確認: \`content/site/civil-construction-1/\` 配下のディレクトリ名に対応するもののみ
- 形式: \`関連過去問: [H29 第1次 問XX](/docs/civil-construction-1-primary-h29-a)\` 等
`);
  }

  const extraInstructions = patternInstructions.join('\n');

  return `あなたは civil-textbook-rewriter エージェントです。
完全な定義は \`.claude/agents/civil-textbook-rewriter.md\` を Read で読み、それに従ってください。
コンテンツ原則の真実源は \`.claude/content-principles.md\` です。

リライト対象:
  slug: ${slug}
  group: ${group}
  ファイル: content/site/civil-construction-1/${slug}/article.mdx
  弱点軸: ${JSON.stringify(weakAxes)}
  推奨拡張パターン: ${JSON.stringify(expansionPatterns)}
${extraInstructions}
実行手順:
  1. .claude/agents/civil-textbook-rewriter.md を Read で読む
  2. 対象ファイルを Read で読む（before_chars を記録）
  3. 既存本文を尊重しつつ、推奨拡張パターン（最大2個）を適用
  4. frontmatter に以下を追加（既存値があれば上書き）:
     - reviewStatus: needs-review
     - lastRewrittenAt: ${new Date().toISOString()}  // ISO 8601 秒単位（並行作業検出用）
     - revisionCycle: 1（既存値があれば +1）
  5. 改行コードは元ファイルを保持（\`.claude/scripts/lib/mdx-io.mjs\` の readMdxFile/writeMdxFile を使う）
  6. Edit ツールまたは Write + mdx-io で書き戻し（after_chars を記録）
  7. 文字化け（U+FFFD）が混入していないか Grep で確認
  8. 再度 node .claude/scripts/lint-mdx-mobile.mjs を実行し、G 適用時は mobile 関連 MEDIUM が減っていることを確認

絶対にしてはいけないこと:
  - 既存本文を一から書き直す
  - frontmatter の title/seoTitle/category/tags/published/group を変更
  - 既存の 2軸比較表（3列×全セル15字以内）を削除または変換
  - 既存の <ExamPoint>・<ArticleImage>・<details>・参考資料を削除
  - 過去問判定記号（❌、✅、正答：）を本文に書く
  - 装飾絵文字を本文に残す（P 適用時は除去対象）
  - <ArticleImage> の caption に長文の説明を書く

完了後、以下の JSON を **1 行のみ** で返してください（前置き・コードブロック禁止）:

{"slug":"${slug}","applied_patterns":${JSON.stringify(expansionPatterns)},"added_sections":[],"converted_tables":0,"migrated_images":0,"before_chars":0,"after_chars":0,"added_chars":0,"frontmatter_changes":[],"lint_high_before":0,"lint_high_after":0,"lint_medium_before":0,"lint_medium_after":0,"mojibake":false}`;
}
