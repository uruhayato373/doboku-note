// scripts/lib/cem-qa-prompt.mjs
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
  ファイル: .local/r2/posts/pe-comprehensive-management/${slug}/article.mdx

実行手順:
  1. .claude/agents/cem-qa.md を Read で読む
  2. 評価対象ファイルを Read で読む
  3. node scripts/lint-mdx-mobile.mjs <評価対象ファイル> を Bash で実行
  4. 5 軸ルーブリック（構造30% / モバイル25% / 原則20% / 参考資料15% / 関連付け10%）で
     各軸を 0〜3 点で採点
  5. 加重スコア = Σ(score × weight) を算出（最大 3.00）
  6. 弱点軸（1 点以下の軸）を特定
  7. 質的コメント（30〜100字）を付与

最終出力は **必ず以下の JSON 形式のみ** で返してください。前置き・後置きは不要。

\`\`\`json
{
  "slug": "${slug}",
  "scores": {
    "structure": <0-3>,
    "mobile": <0-3>,
    "principle": <0-3>,
    "reference": <0-3>,
    "linking": <0-3>
  },
  "weighted": <0.00-3.00>,
  "weak_axes": ["<弱い軸名>", ...],
  "qualitative_comment": "<30-100字の質的コメント>"
}
\`\`\`

注意:
- スコアは整数 (0/1/2/3) のみ
- weighted は小数第2位まで
- weak_axes は score <= 1 の軸
- いずれかの軸が 0 点なら全体不合格として weighted ≤ 1.0 とする
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
  return `あなたは keyword-rewriter エージェントです。
完全な定義は \`.claude/agents/keyword-rewriter.md\` を Read で読み、それに従ってください。
コンテンツ原則の真実源は \`.claude/content-principles.md\` です。

リライト対象:
  slug: ${slug}
  ファイル: .local/r2/posts/pe-comprehensive-management/${slug}/article.mdx
  弱点軸: ${JSON.stringify(weakAxes)}
  推奨拡張パターン: ${JSON.stringify(expansionPatterns)}

実行手順:
  1. .claude/agents/keyword-rewriter.md を Read で読む
  2. 対象ファイルを Read で読む
  3. 既存本文を尊重しつつ、推奨拡張パターン（1〜2 個）を適用
  4. ページ末尾の「総合技術監理における位置づけ」と「参考資料」の間に
     新セクション（H2）を追加
  5. frontmatter に以下を追加（既存値があれば上書き）:
     - reviewStatus: needs-review
     - lastRewrittenAt: ${new Date().toISOString().split('T')[0]}
     - revisionCycle: 1（既存値があれば +1）
  6. 改行コードは元ファイルを保持（scripts/lib/mdx-io.mjs を必ず使う）
  7. Edit ツールで書き戻し
  8. 文字化け（U+FFFD）が混入していないか Grep で確認

絶対にしてはいけないこと:
  - 既存本文を一から書き直す
  - frontmatter の title/category/section/published を変更
  - 既存の表・コード・<ExamPoint>・<details> を削除
  - <ExamPoint> を新規追加（content-principles.md §5: 1ページ最大2個）
  - 「誤り選択肢パターン」のような禁止表現
  - 過去問判定記号（❌、✅、正答：）を本文に書く

完了後、以下の JSON で結果を返してください:

\`\`\`json
{
  "slug": "${slug}",
  "applied_patterns": ["A", "E"],
  "added_sections": ["## 実務での具体例", "## 試験での問われ方"],
  "added_chars": 850,
  "before_chars": 1234,
  "after_chars": 2084,
  "frontmatter_changes": ["reviewStatus", "lastRewrittenAt", "revisionCycle"]
}
\`\`\``;
}
