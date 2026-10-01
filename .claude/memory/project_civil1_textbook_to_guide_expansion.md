---
name: civil1-textbook-to-guide-expansion
description: 1級土木 textbook(公開禁止SSOT)を根拠にオリジナル散文guideを横展開。安全管理を基準器化(2026-07-02)、Aギャップ章が残
metadata: 
  node_type: memory
  type: project
  originSessionId: 56930560-96cf-4ea1-a0b9-2940ad200983
---

1級土木施工管理技士の内部テキスト（`docs/textbook/１級土木施工管理技士/テキスト（施工管理・法規編／土木一般編）`）を**事実根拠SSOTとしてのみ**参照し、逐語複製せずオリジナル散文で `civil-construction-1/guide-*` を新規/補強する横展開プロジェクト。テキストは市販スキャンOCRで**公開禁止（著作権）**＝逐語コピー・章構成なぞり・書籍図クロップ埋込は禁止（[[no-verbatim-book-reflection]] 準拠）。

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

**バッチ実行の実務知見**: 生成→修正は Workflow で。ただし6並列×2段=ストール（[[feedback_workflow_concurrency_and_mac_pdf]]）→ **2本ずつのチャンク処理**（`for i+=2 { pipeline(slice) }`）で回避。args は必ず `JSON.parse` ガード。**fact-checkは必須**＝AI執筆が実際に事実誤りを多数混入（解体の静的破砕剤の因果逆転・ケーソン深度根拠・鋼巻尺検定温度・水準測量読定単位・施工体制台帳基準額R6改正 等をWebSearchで是正）。zshは`for s in $VAR`をワード分割しない→配列必須。

**How to apply**: 新章はチェックリストで生成→`guide-fact-checker`（必須）→`guide-rewriter`。Generatorは sonnet 委譲。フェイブルは事実忠実性・構造制約で不適（初回相談で確定）。関連: [[project_civil_construction_quality_cycle]]。
