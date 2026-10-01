---
name: project_civil1_textbook_to_guide_expansion
description: "1級・2級土木 textbook(公開禁止SSOT)を根拠にしたオリジナル散文guide横展開と品質サイクルの統合記録。安全/環境新規11ページ・法規是正・textbook文字起こし・2級サイト拡充・CEM/1級品質サイクルの知見"
metadata:
  type: project
---

1級土木施工管理技士の内部テキスト（`docs/textbook/１級土木施工管理技士/テキスト（施工管理・法規編／土木一般編）`）を**事実根拠SSOTとしてのみ**参照し、逐語複製せずオリジナル散文で `civil-construction-1/guide-*` を新規/補強する横展開プロジェクト。テキストは市販スキャンOCRで**公開禁止（著作権）**＝逐語コピー・章構成なぞり・書籍図クロップ埋込は禁止（[[feedback_no_verbatim_book_reflection]] 準拠）。

**基準器**: `guide-safety-management`（安全管理）を C→A のパイロットとして 2026-07-02 作成。guide-qa 初回 weighted 2.15（条件付きYES）→ 指摘1〜5反映で基準器化（commit 8c35609e0→192861ad5）。sibling の見本は `guide-quality-management`（ただし §26/§20 は 2026-06-21 追加の新基準で、quality は未準拠なので真似しすぎない）。

**横展開チェックリスト（guide-qa 由来・量産時に必須）**:
1. 末尾は §20 承認パターン固定＝`## 次のステップ`＋`<SeeAlso>` 1〜2件（「まとめ」名称・箇条書き5件羅列は禁止）
2. リードは §26 読者ベネフィット型（共感/問題提起ファースト。事実ファースト禁止）
3. 各 H2 散文 ≥200字（箇条書き＋導入1文だけの薄いH2を作らない。「なぜ/引っかけ」を散文で補強）
4. §24 文末3連続を lint で潰す（非ブロッカーでもパイロット基準で0に）
5. 公開前ゲート＝`check-guide-length`(≥3000字)＋`guide-fact-checker`／WebSearch で試験統計・法令数値を一次照合（LLMは外す。実例=死傷割合を令和2年11%→直近18%で「十数％」に是正、出題数は guide-four-management FAQ内部SSOTと整合）

**進捗（2026-07-03 A+B 完遂・13章コンプリート）**:
- A新規6本 完成コミット `a8d2107b3`（施工計画/環境保全/建設機械/基礎工/測量/解体）。安全管理基準器と合わせ7本。全 lint HIGH 0・3000字超・fact-check済。
- B既存5本 リード§26化コミット `1eca76bb3`（工程/品質/土工/法規/コンクリート。法規は欠落リード新設＋重複見出し是正）。**末尾は温存**（下記発見）。
- reviewStatus: A6本は needs-review（個別 guide-qa 未実施・lint+fact-checkは通過）。

**Phase C 完了（2026-07-03 コミット `68b8aa4ed`）**: A7本にリッチ末尾（`## 過去問で確認しよう`＋`## テキスト参照`）をバックポート。区分は正しく紐付け＝施工管理系(安全/施工計画/環境保全)=問題B(primary-*-**b**)+第2次、土木一般系(建設機械/基礎工/測量/解体)=問題A(primary-*-**a**)。**primary-*-a=問題A(土木一般・専門土木・法規)/-b=問題B(施工管理)** が確定事実。実在slugのみ(check-sns-urls通過)。追記は `writeMdxFile`(戻り値は`{raw,eol}`)で。

**既知の軽微drift(未修正)**: `guide-earthwork-key-points` の過去問リンクが primary-*-**b** だが土工は問題A寄り→ -a が整合的(ただし土工は問題Bにも登場し断定不可)。スコープ外で保留。

**末尾パターン標準**: guide末尾は §20「次のステップ(SeeAlso)」→ `## 過去問で確認しよう`(第1次 正区分5年+第2次)→ `## テキスト参照`(トピック別textbook表)。これが civil guide のリッチ末尾標準。

**バッチ実行の実務知見**: 生成→修正は Workflow で。ただし6並列×2段=ストール（[[feedback_workflow_orchestration_gotchas]]）→ **2本ずつのチャンク処理**（`for i+=2 { pipeline(slice) }`）で回避。args は必ず `JSON.parse` ガード。**fact-checkは必須**＝AI執筆が実際に事実誤りを多数混入（解体の静的破砕剤の因果逆転・ケーソン深度根拠・鋼巻尺検定温度・水準測量読定単位・施工体制台帳基準額R6改正 等をWebSearchで是正）。zshは`for s in $VAR`をワード分割しない→配列必須。

**How to apply**: 新章はチェックリストで生成→`guide-fact-checker`（必須）→`guide-rewriter`。Generatorは sonnet 委譲。フェイブルは事実忠実性・構造制約で不適（初回相談で確定）。関連: [[project_civil1_textbook_to_guide_expansion]]。

## 統合: textbook 文字起こしの位置づけ（旧 civil1_textbook_transcription・2026-06-24）
`docs/textbook/１級土木施工管理技士/テキスト（施工管理・法規編）`（7章327p）と土木一般編（6章385p・図135＋320点クロップ埋込）を高解像度 LLM-OCR で章別 MD 化した**内部リファレンス（公開禁止・著作権）**。二次 writer・経験記述・guide 執筆の根拠 SSOT。**字句は近似**（漢字誤読・密段落の言い換え/節落ち）→条文・数値・定義は必ず原典 PDF で照合（校正 QA は省略済み・README 参照）。bbox は LLM 自動判定で隣接本文が写り込むことがある。`docs/textbook` は r2-sync 対象外。

## 統合: 施工管理・法規編の拡充計画（旧 civil1_shikou_law_expansion・2026-07-03）
真実源 `docs/todo/civil1-textbook-expansion.md`。安全7本（scaffolding/excavation-shoring/management-system/risk-assessment/machinery-crane/industrial-safety-law/work-environment）＋環境4本（noise-vibration-regulation/water-air-soil-pollution/construction-byproduct-recycle/waste-disposal-manifest）を新規作成（published:false・自前 SVG 計29点・写真ゼロ・数値 WebSearch 照合）。フェーズ0是正完了＝金額基準 4,500万→5,000万（令和7年2月改正）を12箇所、年少者/妊産婦の就業制限表追加。**残:** フェーズ3 既存深掘り（schedule-charts 工程図表7種・network-schedule NW計算・control-chart X̄-R・quality-inspection OC曲線）／published 化＋OGP は QA 後／**guide の textbook 参照11本結線は publish+deploy 後 gate（check-sns-urls が本番実在検証）**／機械系8ページの写真差替（`docs/todo/civil-machinery-photo-manifest.md`・Gemini 別環境・AI 処理→差替→commit を一体で・生画像を先行公開しない）。規約: SVG は濃色塗り+白文字NG・font≥11・概念名タイトルNG・viewBox 0 0 400 500／MDX は `）**`（太字末尾全角括弧）NG・description≤200字・新ページへの SeeAlso は publish 後。

## 統合: 品質サイクルの知見（旧 civil_construction_quality_cycle / civil_textbook_cycle / quality_cycle_history）
- 1級土木 textbook/guide 43件中30件を5軸ルーブリックでリライト済み（平均 weighted 2.91）。**content-principles §5 例外**: guide ピラー型では `<Callout type="note" title="試験のポイント">` を ExamPoint の代替として許容（1セクション1個まで・合計5-8個・ベンチマーク guide-last-minute-2026/guide-four-management/guide-law-key-points）。Group B 9件（machinery 46+50図等・article.mdx 不在）は PDF なしで推測生成しない（機械諸元のハルシネーション）→`/pdf-to-mdx --exam civil-construction-1`。
- CEM キーワード＋1級土木の thin content ゼロ化サイクル（Phase G-4〜G-8）は完結し AdSense 稼働中。`keyword-rewriter` の失敗モード＝①セクション順逆転（標準順 とは→サブ節→位置づけ→参考資料）②ExamPoint に「頻出の引っかけ」等の禁止表現が残る。bulk-score と cem-qa の採点は乖離する。採点 SoT `.claude/state/quality-scores.json`。

## 統合: 2級土木サイト拡充（旧 civil2_site_expansion・2026-07-02）
現状分析 SSOT `docs/project/02_コンテンツ/07_2級土木サイト現状分析.md`。**2級にはテキスト本のスキャンが存在しない**（過去問PDF R03-R07 のみ）→1級内部テキストは施工管理系の事実照合に使えるが公開禁止（逐語転載せず独自文章）、専門土木は WebSearch 前提（専門土木8章は 2026-09-12 に新規作成済み＝[[project_book_to_guide_expansion]]）。残: P3 過去問 zenki5本の ExamPoint 補完（kouki のみ有りの非対称）、P4 科目 guide の図表不足。新規 guide パイプライン: 執筆→`check-guide-length`（3000字下限）→`guide-qa`→OGP `node .claude/skills/conversion/ogp-create/scripts/ogp-create.mjs <fullSlug>`（bare `npm run ogp` は引数必須）→generate-webp→refresh-indexes→明示パスで commit。SeeAlso は本番実在ページのみ。
