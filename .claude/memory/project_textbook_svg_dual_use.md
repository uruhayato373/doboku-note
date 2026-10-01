---
name: textbook-svg-dual-use
description: 総監標準テキスト各管理mdを「1概念=1図解SVG」化し記事+SNS両用。カルーセル不採用。svg-catalogがコレクションSSOT（2026-06-21）
metadata: 
  node_type: memory
  type: project
  originSessionId: 1613ff92-e84f-4571-9b9a-cdb8d92ab558
---

総監標準テキスト（`docs/textbook/技術士（総監）/テキスト/総監標準テキスト/{経済性,人的資源,情報,安全,社会環境}管理.md`）を SNS+記事コンテンツ化する方針（2026-06-21 確立）。

**採用方針**: md の各概念を **`create-svg` 準拠のサイト図版スタイル SVG（1概念=1枚）** にし、記事 `<ArticleImage>` 埋め込みと SNS 画像に**両用**（一石二鳥）。Instagram カルーセル（notebook デザイン・複数スライド）は「文字小・余白大・余計な情報」で**不採用**。

**進捗**:
- pe-comprehensive-management に図解SVG 48点を新規作成（5管理横断・high23＋medium/low23＋NEW知財存続期間ラダー1）。全て `.local/r2/posts/{slug}/img/figure-N.svg`。機械監査 HIGH=0、Evaluator(`svg-figure-auditor`)→不合格を `svg-figure-rewriter`/手動で是正済。
- 残り候補トリアージ済：大半は既存SVG(145点)がカバー=SKIP。jit プル/プッシュ図はEvaluatorが概念逆転検出→破棄。UPGRADE2(正規分布3σ・マズロー)は既存で実用十分=保留。→**図版ライブラリは実質完成**。
- **残作業**: Phase4=記事へ `<ArticleImage>` 埋め込み（48点は orphan=未埋込、ユーザー指示で保留中）／Phase5=SNS書き出し。
- **frame-figure レンダラー実装済（PR #270）**: `.claude/scripts/sns/render-figure-sns.mjs`・`npm run render-figure-sns`・ig-single 1080×1350/yt-thumb 1280×720。`svg-catalog` は PR #269。**両PRマージ後**にdevelopでSNSパイプライン残り（カルーセル組み/コピーGenerator/Evaluator配線）が解禁。
- 計画/候補/トリアージは `docs/sns/_plans/`（figure-candidates.json・phase3a/3c worklist・phase3b-triage.json）。

**SSOT/ガバナンス**:
- 図版アーティファクト = `.local/r2/posts/.../figure-N.svg`（サイトが真実源、SNSは派生）。色 = `docs/design-system/svg-tokens.json`。
- 図版**コレクションのSSOT** = `.claude/state/svg-catalog.json`（`npm run build-svg-catalog`で派生生成、PR #269）。concept/embedded/audit を join。`svg-gallery`(目視)・`svg-audit.json`(監査) を補完。
- **教訓**: gen-only 量産は `svg-figure-auditor` を後で必ず通す。機械監査(audit.mjs)は**濃色背景+白文字(prohibited)・allowlist外色・概念/aria-label矛盾を見逃す**→意味監査(Evaluator)が必須。文言/aria-labelの修正は rewriter 対象外（文言不変）なので親が手動。
- SVG内に「出典/総監テキスト/§/図表番号」を書かない（create-svg準拠）。法令引用(第N条/JIS)は内容として可。
