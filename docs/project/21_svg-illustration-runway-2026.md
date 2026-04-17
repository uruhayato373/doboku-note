# 総監キーワードページ SVG 図版整備ランウェイ 2026

**作成日**: 2026-04-17
**対象**: 技術士総合技術監理部門（pe-comprehensive-management）のキーワードページ
**狙い**: 受験（2026-07）までに、図解で理解が深まるキーワード15本に自作SVG図版を追加し、L2〜L3コンテンツ品質を押し上げる

## Context

`quality-control` ページで QC 七つ道具の一覧 SVG を作成したところ、概念の全体像が一目で伝わり説明効率が上がった（`.local/r2/posts/pe-comprehensive-management/quality-control/img/qc-seven-tools.svg` 参照）。他にも「本質が図で示せるキーワード」が多数あるが、現状は単発対応で散発的に増えているだけで、優先順位と進捗が見えない。

本プランは、**受験までの 3 ヶ月で Tier 1 を完走**するために、(1) 候補の優先順位付け、(2) 週次の投下計画、(3) 進捗可視化、(4) スタイルの一貫性確保を仕組み化する。既に 72 個の SVG が存在するため、**新規作成より「空白の頻出キーワードを埋める」方針**とする。

## Scope

- **対象**: `pe-comprehensive-management` キーワードページのみ（civil-construction-1 は対象外）
- **規模**: Tier 1 = 15 本（受験までに完走）。必要に応じ Tier 2 へ拡張
- **担当**: Claude（下書き）→ ユーザー（ブラウザでレビュー）→ 承認後 commit
- **ペース**: 週 2〜3 本バッチ。約 5〜7 週で完走

## Selection Criteria（Tier 1 判定基準）

以下 3 条件を全て満たすキーワードを Tier 1 とする：

1. **視覚的本質**: 概念の核心が空間配置・時系列・階層・マトリクスで表現できる
2. **頻出**: 総監過去問・キーワード集で言及頻度が高い
3. **SVG 未整備**: 該当ページの `img/` 配下に既存 SVG がない

## Tier 1 候補リスト（15本）

| # | slug | 図解の核心 | 管理分野 | ステータス |
|---|---|---|---|---|
| 1 | `process-capability-index` | 規格幅（LSL/USL）と工程分布のヒストグラム重ね合わせ | 品質管理 (2.2) | ⬜ 未着手 |
| 2 | `design-review` | DR0〜DR4 のマイルストーン帯グラフ | 経済性 (2.1) | ⬜ 未着手 |
| 3 | `front-loading` | 時系列 × 投入工数 のカーブ（従来型 vs フロントローディング） | 経済性 (2.1) | ⬜ 未着手 |
| 4 | `concurrent-engineering` | 直列 vs 並行の工程タイムライン比較 | 経済性 (2.1) | ⬜ 未着手 |
| 5 | `pdca-cycle` | P→D→C→A の循環ダイアグラム（矢印閉ループ） | 品質管理 (2.2) | ⬜ 未着手 |
| 6 | `gantt-chart` | 実例としての小規模ガントチャート | 工程管理 (2.3) | ⬜ 未着手 |
| 7 | `control-limits` | UCL/CL/LCL と管理図データ点 | 品質管理 (2.2) | ⬜ 未着手 |
| 8 | `activity-abc` | ABC 3層累積グラフ（80/15/5） | 原価管理 (2.4) | ⬜ 未着手 |
| 9 | `fmea` | S×O×D の RPN 計算フロー＋リスクマトリックス | 安全 (5.2) | ⬜ 未着手 |
| 10 | `hazop` | ガイドワード × プロセスパラメータのマトリクス | 安全 (5.2) | ⬜ 未着手 |
| 11 | `heinrich-law` | 1:29:300 の三角形（重大・軽微・ヒヤリ） | 安全 (5.1) | ⬜ 未着手 |
| 12 | `redundancy-safety` | 直列系・並列系・多重系の信頼性ブロック図 | 安全 (5.3) | ⬜ 未着手 |
| 13 | `swot-analysis` | 2×2 マトリクス（強み・弱み・機会・脅威） | 経済性 (2.1) | ⬜ 未着手 |
| 14 | `maslow-hierarchy-of-needs` | 5 層ピラミッド | 組織 (6.1) | ⬜ 未着手 |
| 15 | `herzberg-two-factor-theory` | 動機付け要因 vs 衛生要因の2軸配置 | 組織 (6.1) | ⬜ 未着手 |

ステータス凡例: ⬜ 未着手 / 🟨 下書き中 / 🟦 レビュー中 / ✅ 完了

## 週次ワークフロー

**Step 1（Claude）**: 週初めに 2〜3 本を選び SVG 下書きを作成
- `.local/r2/posts/pe-comprehensive-management/{slug}/img/{slug}-diagram.svg` に配置
- 該当 `article.mdx` に `<ArticleImage>` タグで挿入（キャプションなし、alt のみ）
- `@resvg/resvg-js-cli` で PNG にレンダリングしセルフチェック（`npx -y @resvg/resvg-js-cli input.svg output.png`）

**Step 2（ユーザー）**: ブラウザで `http://localhost:3020/docs/pe-comprehensive-management-{slug}` を開いて視認確認
- モバイル表示（Chrome DevTools の縦画面エミュレーション）でも破綻しないか確認
- 概念伝達に図が貢献しているか、冗長でないかを判断

**Step 3（Claude）**: フィードバック反映 → 最終版を上書き

**Step 4（ユーザー）**: `git add` → commit（コミットメッセージ例: `content(pe): design-review SVG図版追加`）

**Step 5（ユーザーまたはClaude）**: 本プランの該当行を `✅ 完了` に更新

## SVG スタイルガイド

既存 SVG 群（特に `bathtub-curve`, `balance-sheet`, `break-even-point`, `quality-control/qc-seven-tools`）の配色・サイズ規約を踏襲する。

### 共通仕様

| 項目 | 値 | 備考 |
|---|---|---|
| viewBox | 図タイプに応じ柔軟（横長 420×240、正方形 400×400 等） | width/height 属性は省き `style="max-width:Xpx;width:100%"` を付与 |
| font-family | `sans-serif` | OS 標準フォントに委ねる |
| 本線 stroke | `#333` | 軸・主要線 |
| 補助線 stroke | `#666` | 破線・参照線 |
| グレーフィル | `#8a8a8a` | バー・ボックス |
| 赤アクセント | `#b22234` | 強調線・重要点・凡例 |
| 破線 | `stroke-dasharray="4,3"` | UCL/LCL 等 |
| 文字サイズ | 本文 9〜12px、見出し 13〜16px | モバイル可読性優先 |

### 配置ルール

- `<ArticleImage>` を使う（素の `<img>` は使わない）
- `caption` 属性は使わない（本文で説明）
- 挿入位置は「概念を説明する本文の直後」（`.claude/content-principles.md` 原則8）

### 命名規約

- ファイル: `{slug}-{purpose}.svg`（例: `design-review-dr-timeline.svg`、`pdca-cycle-loop.svg`）
- 1ページに複数 SVG を置く場合は purpose で区別

## Critical Files

修正・作成するファイル：

- `docs/project/21_svg-illustration-runway-2026.md` — 本プラン（進捗管理の正）
- `.local/r2/posts/pe-comprehensive-management/{slug}/img/*.svg` — 各キーワードの SVG（15ファイル）
- `.local/r2/posts/pe-comprehensive-management/{slug}/article.mdx` — `<ArticleImage>` タグ挿入（15ファイル）

参考にする既存資産：

- `src/components/ui/ArticleImage/ArticleImage.tsx` — SVG 対応済みの汎用画像コンポーネント
- `.local/r2/posts/pe-comprehensive-management/bathtub-curve/img/bathtub-curve-phases.svg` — 時系列チャートの手本
- `.local/r2/posts/pe-comprehensive-management/balance-sheet/img/bs-structure.svg` — ブロック構造図の手本
- `.local/r2/posts/pe-comprehensive-management/quality-control/img/qc-seven-tools.svg` — パネルグリッド型インフォグラフィックの手本
- `.claude/content-principles.md` 原則8 — 図表配置のルール

## 検証

各 SVG 追加後のチェックリスト：

- [ ] `@resvg/resvg-js-cli` で PNG にレンダリングし崩れがないか確認
- [ ] `http://localhost:3020/docs/pe-comprehensive-management-{slug}` でブラウザ表示確認
- [ ] モバイル幅（375px〜414px）で破綻しないか
- [ ] ダークモードで視認性に問題ないか
- [ ] `scripts/pre-commit-mdx.mjs` / `scripts/lint-ui.mjs` の pre-commit フックが通る
- [ ] `npm run type-check` が通る
- [ ] 文字化け（U+FFFD）がないか `Grep` で確認

全件完了後：

- [ ] `npm run build` が成功する
- [ ] 本番デプロイ後、`storage.doboku-note.com` 配下に SVG がミラーされる（`npm run upload-images-r2`）

## Tier 2（Tier 1 完走後の候補・随時追加）

校正作業の流れで追加した、あるいは追加が望ましいと判明したキーワードを記録する。優先度は Tier 1 より低いが、個別依頼があれば即対応する。

| # | slug | 図解の核心 | 管理分野 | ステータス |
|---|---|---|---|---|
| T2-1 | `progress-management` | バナナ曲線（出来高累積）+ EVM グラフ（PV/EV/AC） | 工程管理 (2.3) | ✅ 完了（2026-04-17） |

## Out of Scope

以下は本プランでは扱わない（将来別プラン化）：

- civil-construction-1（1級土木）キーワードの SVG 図版化
- 過去問 MDX の図復元（`20_primary-exam-figure-restoration.md` で別管理）
- 既存 SVG のリデザイン
- SVG の多言語対応
