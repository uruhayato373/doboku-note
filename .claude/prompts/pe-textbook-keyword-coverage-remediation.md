# Claude Code 一括実行プロンプト

以下のコードブロックをそのままClaude Codeへ渡す。

```text
総監標準テキスト5管理の内容が、doboku-noteの「総合技術監理 キーワード集2026」と個別キーワードページに過不足なく反映されているか完全監査し、対応表・不足バックログ・再監査スクリプトを作成してください。

最初のセッションでは分析と計画だけを行い、記事本文の修正・新規ページ作成・deployはしないでください。完全対応表を作ってから実装対象を確定します。

最初に次を全文で読んでください。

1. CLAUDE.md
2. .claude/state/pe-textbook-keyword-coverage.json
3. .claude/plans/pe-textbook-keyword-coverage-remediation-2026-07-24.md
4. .claude/knowledge/reference/content-principles.md
5. .claude/knowledge/reference/exam-content-policy.md
6. .claude/skills/authoring/keyword-page/SKILL.md
7. .claude/agents/keyword-rewriter.md
8. src/config/pe-chapters.json
9. src/config/keyword-relations.json
10. .local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx

比較元:

- docs/textbook/技術士（総監）/テキスト/総監標準テキスト/経済性管理.md
- docs/textbook/技術士（総監）/テキスト/総監標準テキスト/人的資源管理.md
- docs/textbook/技術士（総監）/テキスト/総監標準テキスト/情報管理.md
- docs/textbook/技術士（総監）/テキスト/総監標準テキスト/安全管理.md
- docs/textbook/技術士（総監）/テキスト/総監標準テキスト/社会環境管理.md

比較先:

- .local/r2/posts/pe-comprehensive-management/keyword-2026/article.mdx
- .local/r2/posts/pe-comprehensive-management/*/article.mdx
- src/config/doc-meta-index.json
- src/config/pe-chapters.json
- src/config/keyword-relations.json

作業開始時に必ず以下を行ってください。

- git branch --show-current
- git status --short
- originとの差分確認
- 既存の未コミット変更の確認
- 無関係な変更を戻さない
- 特に src/config/keyword-relations.json の既存変更を上書きしない

Phase 1ではH3・H4を概念候補として全件抽出してください。H2は構造見出しとして別管理し、独立キーワード不足数へ自動加算しないでください。

各概念について、次の情報を収集してください。

- 管理分野
- 元ファイル
- 行番号
- 見出しレベル
- 標準テキスト表記
- 正規化表記
- alias候補
- 対応する公開slug
- 対応ページtitle
- 対応ページ内のH2/H3
- 判定コード
- 判定根拠
- confidence
- 推奨対応
- 優先度
- 一次情報の再確認要否

判定コードは次の7種類だけを使用してください。

A: 独立ページ反映済み
B: 別名・略称で反映済み
C: 上位ページ本文へ十分に内包
D: 上位ページ本文へ一部だけ反映。既存ページ補強が必要
E: 本当に未反映。新規ページ候補
F: 構造見出し・法令細目など、独立化不要
G: 古い情報または最新一次情報の再検証が必要

重要ルール:

- 文字列不一致だけでEにしない。
- NPV、FMEA、MTBF、JIT、ABCなど、英語略称・日本語名称・複合ページを必ずalias照合する。
- 法律は正式名称、通称、旧称を照合する。
- 個別ページがなくても、上位ページ本文の見出しと説明が十分ならCにする。
- 上位ページに単語だけある場合はCではなくDにする。
- 1概念を細かく分割しすぎない。
- 既存ページと検索意図が重なる新規ページは作らない。
- 標準テキスト本文を公開ページへコピーしない。
- 標準テキストを公開記事の出典として掲げない。
- 法令、規格、統計、計画は公開前に最新の公式一次情報で検証する。

GeneratorとEvaluatorを分離してください。

- 親エージェントは抽出、候補生成、最終統合を担当する。
- サブエージェントを管理分野別に使って意味判定してよい。
- 各サブエージェントは同じ判定ルーブリックを使う。
- 評価担当には記事を編集させない。
- 同じ行を複数Evaluatorで判定した場合、不一致を自動で隠さずconflictとして残す。
- confidenceが0.8未満の項目は親エージェントが再確認する。

作成する成果物:

1. scripts/audit-pe-textbook-keyword-coverage.mjs
   - 既定read-only
   - 標準テキストH3/H4を抽出
   - ハブリンク、補助語、個別ページtitle/shortTitle/description/H2/H3を抽出
   - 正規化一致、alias候補、包含候補を出力
   - 記事を変更しない
   - JSON出力先を引数で指定できる

2. .claude/state/pe-textbook-keyword-coverage.json
   - 全概念のA〜G判定
   - 対応slug、根拠、confidence、推奨対応、優先度
   - 集計値
   - 生成日時

3. scripts/audit-pe-textbook-keyword-coverage.mjs
   - 5管理別のA〜G件数
   - Dの既存補強一覧
   - Eの新規候補一覧
   - Gの再調査一覧
   - alias・統合判断
   - conflict一覧
   - 次の実装バッチ案

4. package.json
   - 既存命名と重複しない場合だけ、監査コマンドを追加
   - 例: npm run audit-pe-textbook-keyword-coverage

監査スクリプトは、特定の398件をハードコードして通すのではなく、現在の標準テキストと記事群から毎回抽出してください。

優先度は次の順で判断してください。

P0:
- 過去問出題実績があり、説明先がない
- 法令・規格について誤解を招く欠落がある
- 既存ハブがリンク切れまたは誤リンク

P1:
- 標準テキストの独立見出し
- 既存ページが単語だけで説明不足
- 他の重要概念を理解する前提

P2:
- 細目だが検索意図が独立
- 補助的な説明追加で足りる

P3:
- 構造見出し
- 上位ページに十分内包
- 現時点で独立化不要

検証:

- 抽出したH3/H4件数を管理別に報告する。
- 全候補にA〜Gが入り、未判定が0であること。
- A〜Dには対応slugまたは本文位置があること。
- Eには「なぜ既存ページで足りないか」があること。
- F/Gには除外・保留理由があること。
- 対応slugが実在し、published:trueであること。
- 重複slug候補を一覧化すること。
- スクリプトを2回実行して決定的な結果になること。
- git diff --checkを通すこと。

Phase 1では次を変更しないでください。

- 個別キーワード記事本文
- keyword-2026/article.mdx
- pe-chapters.json
- keyword-relations.json
- 公開サイト
- deploy状態

Phase 1完了後、次の4点を報告してください。

1. A〜Gの管理別件数
2. Dの補強候補
3. Eの新規ページ候補
4. P0/P1の推奨実装バッチ

さらに docs/handoffs/YYYY-MM-DD-pe-textbook-keyword-coverage-audit.md を作成し、変更ファイル、実行コマンド、検証結果、未解決事項を記録してください。

git add . と git add -A は使わず、今回変更したファイルだけを明示的に扱ってください。

完全対応表が完成するまでは、記事の大量生成や一括修正に進まないでください。
```
