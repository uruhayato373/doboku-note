// .claude/skills/quality/quality-cycle/scripts/lib/cem-qa-prompt.mjs
//
// Quality Cycle の subagent 呼び出し用プロンプトテンプレート。
//
// cem-qa（Evaluator）と keyword-rewriter（Generator）への
// 厳密な JSON 出力を要求するプロンプトを組み立てる。

/**
 * cem-qa subagent 用プロンプト（Tier 2 質的評価）
 *
 * @param {string} slug
 * @returns {string}
 */
export function buildCemQaPrompt(slug) {
  return `あなたは cem-qa エージェントです。
完全な定義は \`.claude/agents/cem-qa.md\` を Read で読み、それに従ってください。
品質ルーブリックの真実源は \`.claude/content-principles.md\` です。

評価対象:
  ファイル: content/site/pe-comprehensive-management/${slug}/article.mdx

実行手順:
  1. .claude/agents/cem-qa.md を Read で読む
  2. 評価対象ファイルを Read で読む
  3. node .claude/scripts/lint-mdx-mobile.mjs <評価対象ファイル> を Bash で実行
  4. 5 軸ルーブリック（構造30% / モバイル25% / 原則20% / 参考資料15% / 関連付け10%）で
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
{"slug":"${slug}","scores":{"structure":N,"mobile":N,"principle":N,"reference":N,"linking":N},"weak_axes":[...],"qualitative_comment":"..."}

注意:
- スコアは整数 (0/1/2/3) のみ
- weak_axes は score <= 1 の軸名（"structure"/"mobile"/"principle"/"reference"/"linking"）
- 機械的判定不能な質的観点（独自性・読みやすさ・著者の声）も評価に含める`;
}

/**
 * keyword-rewriter subagent 用プロンプト（リライト）
 *
 * @param {string} slug
 * @param {string[]} weakAxes - cem-qa が特定した弱点軸
 * @param {string[]} expansionPatterns - 推奨拡張パターン (A〜F)
 * @returns {string}
 */
export function buildRewriterPrompt(slug, weakAxes, expansionPatterns) {
  const hasG = expansionPatterns.includes('G');
  const gInstructions = hasG ? `

**G パターン（モバイル視認性修正）の実行ルール**:

mobile 軸が weak_axes に含まれているため、既存の以下の表を **情報量を保持したまま** 階層化箇条書きに変換すること:

変換の対象:
- 4列以上の表
- 3列表のいずれかのセルが 15字超のもの

変換の対象外（触らない）:
- 2列の表
- 3列表で全セルが 15字以内（2軸比較として成立）
- コード例や数式を含む表

変換形式:
- 1行目のセル 1 をマーカー化: \`- **{セル1}**: {セル2} — {セル3}\`
- 列が 4 つ以上ある場合は 2 階層箇条書き（親: 列1 + 列2、子: 列3 + 列4）
- 情報量を 1対1 で保持する（セル文言を要約・削除しない）
- 変換後の直前に導入文を入れる
- 表ヘッダーの列名情報は導入文や階層マーカーで補う

G パターン時の禁止事項:
- 2軸比較として成立する表を壊さない（列ヘッダが「観点/A/B」で全セル15字以内のもの）
- セル内容の要約や削除は禁止
- 列数が減った場合、削られた列の情報を近接する箇条書きに必ず含める
- 既存の ExamPoint・参考資料・H3 見出しは無改変
` : '';

  return `あなたは keyword-rewriter エージェントです。
完全な定義は \`.claude/agents/keyword-rewriter.md\` を Read で読み、それに従ってください。
コンテンツ原則の真実源は \`.claude/content-principles.md\` です。

リライト対象:
  slug: ${slug}
  ファイル: content/site/pe-comprehensive-management/${slug}/article.mdx
  弱点軸: ${JSON.stringify(weakAxes)}
  推奨拡張パターン: ${JSON.stringify(expansionPatterns)}
${gInstructions}
実行手順:
  1. .claude/agents/keyword-rewriter.md を Read で読む
  2. 対象ファイルを Read で読む
  3. 既存本文を尊重しつつ、推奨拡張パターン（1〜2 個）を適用
  4. A/D/E/F 等の追加系パターン: ページ末尾の「総合技術監理における位置づけ」と「参考資料」の間に新セクション（H2）を追加
  5. G パターン: 既存の該当する表を箇条書きに変換（既存構造の in-place 変更）
  6. frontmatter に以下を追加（既存値があれば上書き）:
     - reviewStatus: needs-review
     - lastRewrittenAt: ${new Date().toISOString()}  // ISO 8601 秒単位（並行作業検出用）
     - revisionCycle: 1（既存値があれば +1）
  7. 改行コードは元ファイルを保持（.claude/scripts/lib/mdx-io.mjs を必ず使う）
  8. Edit ツールで書き戻し
  9. 文字化け（U+FFFD）が混入していないか Grep で確認
  10. 再度 node .claude/scripts/lint-mdx-mobile.mjs を実行し、G 適用時は mobile 関連 MEDIUM が減っていることを確認

絶対にしてはいけないこと:
  - 既存本文を一から書き直す
  - frontmatter の title/category/section/published を変更
  - 既存の 2軸比較表（3列×全セル15字以内）を削除または変換
  - <ExamPoint> を新規追加（content-principles.md §5: 1ページ最大2個）
  - 「誤り選択肢パターン」のような禁止表現
  - 過去問判定記号（❌、✅、正答：）を本文に書く

完了後、以下の JSON で結果を返してください:

\`\`\`json
{
  "slug": "${slug}",
  "applied_patterns": ${JSON.stringify(expansionPatterns)},
  "added_sections": [],
  "converted_tables": 0,
  "added_chars": 0,
  "before_chars": 0,
  "after_chars": 0,
  "frontmatter_changes": [],
  "lint_high_before": 0,
  "lint_high_after": 0,
  "lint_medium_before": 0,
  "lint_medium_after": 0,
  "mojibake": false
}
\`\`\``;
}
