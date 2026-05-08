---
notePricing: paid
noteSeries: 総監テキスト精読ガイド
utmCampaign: 99-economic-management
---
# 総監テキスト「経済性管理」精読ガイド｜択一・記述直結キーワードリンク付き

**この記事でわかること**

- 経済性管理の7章を試験優先度順に読む方法
- 択一式で繰り返し問われる論点と出題パターン
- 各キーワードの詳細解説ページへの直リンク（クリックで即確認）

---

経済性管理は、5管理の中で**項目数が最も多い分野（テキスト第1章は81項目）**です。事業企画・品質管理・工程管理・原価管理・財務会計・設備管理・数理的手法という7大エリアにまたがり、計算問題と定義問題の両方が出題されます。

全81項目を均等に勉強するのは非効率です。**「投資判断・品質管理・工程管理・財務諸表」の4エリアを最優先し、残りは必要に応じてリンク先で確認する**のが効率的な学習法です。本記事では、テキスト第1章の骨格を活かしながら、択一・記述式の出題視点でポイントを絞り直します。

## 1. 事業企画（優先度: 高）

事業のアイデア発掘から計画策定までの業務です。**投資判断（NPV／回収期間／ROI）と PFI 法のリスク分担**は経済性管理で最も出題頻度が高い論点です。

### 1.1 フィージビリティスタディと需要予測

[フィージビリティスタディ](https://doboku-note.com/docs/pe-comprehensive-management-feasibility-study?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は、事業の実現可能性を事前調査する業務です。

**4ステップの調査順序**

1. 事業の目的に沿って事業フレーム（規模等）を具体化
2. 市場調査と需要予測
3. 予備設計で概略の期間・コストを予測
4. 事業の収支と資金調達方法を検討

需要予測では2つの統計手法が出題されます。

**[移動平均法](https://doboku-note.com/docs/pe-comprehensive-management-moving-average-method?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 過去の期間データを期間1単位ずつずらして平均値を計算（例：4〜6月、5〜7月）。期間を長くすると変動が小さく見え、直近の変化を遅れて追う傾向。

**[指数平滑法](https://doboku-note.com/docs/pe-comprehensive-management-exponential-smoothing?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 前期実績値と前期予測値に重み付けする手法。

> 次期予測 = α × 前期実績値 + (1 − α) × 前期予測値

α（平滑化係数、0≦α≦1）を1に近づけると前期実績値重視、0に近づけると過去データ重視。択一では「α=0.3 のときの予測値計算」が定番です。

### 1.2 事業投資計画

投資の時期と回収の時期には時間的ずれがあるため、貨幣の現在価値に換算する必要があります。

**現在価値（PV：Present Value）の式**

> PV = M_t / (1 + r)^t  
> （M_t：t 年後の支払い額、r：年間利率）

3手法の使い分けが経済性管理で最頻出の論点です。

**[NPV（正味現在価値法）](https://doboku-note.com/docs/pe-comprehensive-management-npv-net-present-value?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 将来キャッシュフローを現在価値に割り引いて合計し、初期投資と比較。**NPV > 0 なら投資可**。時間価値を考慮できる最も理論的に正確な手法。

**[回収期間法](https://doboku-note.com/docs/pe-comprehensive-management-payback-period-method?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 毎年の正味現金流入額で投資額を何年で回収できるかを計算。シンプルだが「**回収後のキャッシュフローを考慮しない**」のが最大の弱点。リスク重視の企業に適する。

**ROI（投資利益率法）** — 利益額 ÷ 投資額 × 100[%]。複数年の場合は平均利益額を使用。「**時間価値を考慮しない**」弱点。投資利益率 > 平均借入率なら採算性あり。

3手法の頻出比較：「**NPV ＝ 時間価値考慮・最も理論的／回収期間法 ＝ シンプルだが回収後 CF 無視／ROI ＝ 時間価値無視**」。

### 1.3 事業評価

公共政策の効果を事前評価する手法群です。

**[費用便益分析](https://doboku-note.com/docs/pe-comprehensive-management-cost-benefit-analysis?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 効果を**貨幣額**で表示し費用と比較。直接効果（内部経済効果）を対象。

**[費用効用分析](https://doboku-note.com/docs/pe-comprehensive-management-cost-utility-analysis?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 主観的な満足度（効用）を数量化して評価。すべて貨幣換算できないケースに適用。

行政評価の3指標も択一で問われます。

- **アウトプット指標** — 行政活動を実際にどの程度行ったか（道路整備延長、討論会開催回数等）
- **アウトカム指標** — 成果物によってどれだけ成果が上がったか（渋滞緩和度合い等）
- **インプット指標** — 投入する資源量（予算額が主）

### 1.4 設計管理

設計段階の用語6つが定義照合問題として出ます。

- **信頼性設計** — 与えられた条件下で規定期間中に必要機能を満たす設計
- **保全性設計** — 故障・異常を素早く検出・診断し短時間で修復できる設計
- **コンカレントエンジニアリング** — 下流工程の担当者を基本設計段階からチームに参画させ、工期短縮を図る手法
- **デザインレビュー** — 製品ライフサイクル全体の設計アウトプットと導出プロセスを品質特性の観点で組織的に審査
- **デザインイン** — メーカーが部品メーカー等と開発段階から共同で開発
- **フロントローディング** — 後工程で発生しそうな問題を初期工程で前倒し集中対応

### 1.5 マーケティングにおける指標

事業の成果測定に使う3指標。

- **KGI（重要目標達成指標）** — 最終ゴールの達成度を定量的に測る指標。例：「売上20%アップ」
- **KPI（重要業績評価指標）** — KGI を分解した中間ゴール。部署や担当者別の集客率・売上アップ率等
- **KSF（重要成功要因）** — 数値ではなく、事業を成功させるために必要な要因を**言語化**したもの

「KGI/KPI = 数値化、KSF = 言語化」の区別が択一で問われます。

### 1.6 PFI 法

**[PFI](https://doboku-note.com/docs/pe-comprehensive-management-pfi?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)**（Private Finance Initiative）は、公共施設の建設・維持管理・運営を民間の資金・経営能力・技術を活用して行う手法です。

**事業方式の3種類**

- **BTO 方式** — 建設（Build）→ 完成後に所有権移転（Transfer）→ 民間が運営（Operate）
- **BOT 方式** — 建設 → 民間が運営 → 事業終了後に所有権移転
- **コンセッション方式** — 所有権は公共主体、運営権のみ民間に設定

**[VFM（Value For Money）](https://doboku-note.com/docs/pe-comprehensive-management-vfm?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 一定の支払い（Money）に対して最も価値の高いサービス（Value）を供給する考え方。従来方式と比較して PFI で総事業費をどれだけ削減できるかを示す割合。

**リスク分担の5原則**

1. **分担する者** — リスクの顕在化をより小さな費用で防ぎ得る側、または追加支出を極力小さくし得る側が負担
2. **分担方法** — ①一方が全額／②一定割合で双方／③一定額まで一方・超過分を共担／④閾値方式の4パターン
3. **個別検討** — 選定事業ごとにリスク内容を評価して検討
4. **不可抗力リスク** — 天災等は協定で事前に分担を取り決め
5. **物価・金利・為替・税制変動リスク** — 影響度を勘案して事前協議

### 1.7 プロジェクトマネジメント

[PMBOK](https://doboku-note.com/docs/pe-comprehensive-management-pmbok?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（Project Management Body of Knowledge、米 PMI 作成）が世界標準です。

PMBOK 第7版では、プロジェクトを「**独自のプロダクト・サービス・所産を創造するために実施する有期性のある業務**」と定義しています。

**PMBOK 第7版の8パフォーマンス領域**

1. デリバリー
2. 開発アプローチとライフサイクル
3. 計画
4. プロジェクト作業
5. 測定
6. ステークホルダー
7. チーム
8. 不確かさ

第7版では従来の「プロセス中心」から「**原則中心（12 原則）**」に転換しました。

**[WBS（Work Breakdown Structure）](https://doboku-note.com/docs/pe-comprehensive-management-wbs?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — プロジェクトを「フェーズ」に分割しフェーズごとに成果物を定義。詳細作業内容を**ツリー構造**で階層的に表現したもの。スコープを目に見える形にする手法。

---

## 2. 品質管理（優先度: 最高）

品質管理（広義）は **品質方針 → 品質計画 → 品質管理（狭義）→ 品質保証 → 品質改善** の活動サイクルです。**QC7つ道具・新QC7つ道具・正規分布**は経済性管理で最も安定した高頻度出題エリアです。

### 2.1 品質方針と品質計画

**[品質方針](https://doboku-note.com/docs/pe-comprehensive-management-quality-policy?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — トップマネジメントによって正式に表明された組織の品質に関する全般的な方向付け。

**[品質目標](https://doboku-note.com/docs/pe-comprehensive-management-quality-objectives?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 品質方針の展開としての目標と、製品やプロジェクト個別の目標の2つ。

**[品質計画](https://doboku-note.com/docs/pe-comprehensive-management-quality-planning?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 品質目標の設定と達成計画の立案プロセス。組織全体の品質方針を部門ごとに展開し、活動進捗で随時見直す。

### 2.2 QC7つ道具（数値データ）

QC7つ道具は主に**数値データ**を扱うことに適した7手法です。

- **層別** — 多数のものを特徴別に層分け
- **[パレート図](https://doboku-note.com/docs/pe-comprehensive-management-pareto-chart?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 「不適合の8割は2割の特定原因に起因」という法則をヒストグラム（柱状グラフ）で可視化
- **特性要因図** — 魚の骨ダイアグラム。要因によって引き起こされる現象を魚の骨形状で示す
- **ヒストグラム** — データを区間に分け、度数を柱状グラフで表現
- **散布図** — 2種類のデータを横軸・縦軸にプロットし関係性を把握
- **グラフ・管理図** — 品質の安定性評価に管理限界線を持つグラフを使用
- **チェックシート** — 主要ポイントを予め列記し、結果（良/悪、完了/未完了）をチェック

択一の頻出は「**パレート図 ＝ 80/20 法則の可視化**」と「**特性要因図 ＝ 魚の骨**」の用途識別です。

### 2.3 新QC7つ道具（言語データ）

新QC7つ道具は主に**言語データ**を扱うことに適した7手法です。

- **連関図** — 原因・結果の項目を抽出し因果関係を矢印で表現
- **系統図** — 目的・ゴールへの手段を樹枝状に表現
- **マトリックス図** — 2要素を行・列に配置し関係を表現
- **過程決定計画図** — 対策のステップを表現したフローチャート
- **アローダイアグラム** — 作業を矢印で表した日程計画表
- **親和図** — 言語データをグループ分けし整理・分類
- **マトリックスデータ解析** — 複数データを解析して傾向把握

「QC7つ道具 ＝ 数値データ／新QC7つ道具 ＝ 言語データ」が最重要の択一論点です。

### 2.4 正規分布と工程能力指数

[正規分布](https://doboku-note.com/docs/pe-comprehensive-management-normal-distribution?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は N(μ, σ²) で表現され、平均μを中心とした左右対称形状です。

**μ ± Nσ 範囲のデータ含有率**

- **μ ± σ 範囲**：68.3 %
- **μ ± 2σ 範囲**：95.4 %
- **μ ± 3σ 範囲**：99.7 %

択一では「±σ で何 %」が定番の暗記問題です。

[工程能力指数](https://doboku-note.com/docs/pe-comprehensive-management-process-capability-index?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（Cp）は規格限度内に製品を生産できる能力を表す指標です。

> Cp ＝ (公差上限値 − 公差下限値) ÷ (6σ 等の規格限度)

標準偏差σが小さいほど Cp は大きくなり、不良品が少ない状態を示します。**Cp ≥ 1.33 が望ましい**基準値で、計算問題として出題されます。

### 2.5 検査

**全数検査** — プラント等の重要施設で不適合品の混入が認められない場合に実施。

**[抜取検査](https://doboku-note.com/docs/pe-comprehensive-management-sampling-inspection?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** — 量産品でランダムにサンプルを抽出してロット単位で合否判定。「**ロットからのランダム抽出**」が前提条件。

検査方式の性能を表す **OC 曲線（Operating Characteristic curve）** の読み方も出題されます。

### 2.6 品質保証

[品質マネジメントシステム](https://doboku-note.com/docs/pe-comprehensive-management-quality-management-system?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は国際規格 **[ISO 9000 シリーズ](https://doboku-note.com/docs/pe-comprehensive-management-iso-9000?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** に則って実施されます。

**ISO 9001:2015 の主な改訂点**

- アウトプット ＝ 製品（ハードウェア／ソフトウェア／素材製品の3カテゴリ）+ サービス
- ビジョン・使命・戦略を明示
- あらゆるプロセスで [PDCA サイクル](https://doboku-note.com/docs/pe-comprehensive-management-pdca-cycle?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management) を適用

**品質保証活動** — 企画／開発・設計／生産準備／生産／流通／販売・サービス／廃棄・リサイクルすべての段階に及びます。

### 2.7 品質改善

品質の不良は3カテゴリに分類されます。

- 設計品質の不良
- 工程管理問題に起因する不良
- 製品品質の不良

**[品質改善](https://doboku-note.com/docs/pe-comprehensive-management-quality-improvement?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)** はこれら不良をなくし、より良い品質の製品を生み出す能力を高める活動です。

### 2.8 消費者保護

製品安全（PS）マークが特定製品に表示義務化されています。

- **PSC マーク** — [消費生活用製品安全法](https://doboku-note.com/docs/pe-comprehensive-management-consumer-product-safety-act?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)
- **PSE マーク** — 電気用品安全法
- **PSTG マーク** — ガス事業法
- **PSPG マーク** — 液化石油ガスの保安の確保及び取引の適正化に関する法律

### 2.9 顧客満足（CS）

満足度の高い製品提供に加え、購入後のサービスが重要です。

- **ビフォアサービス** — 見込み客の購買意欲を高めるためのサービス
- **アフターサービス** — メンテナンス・情報提供。次回購入のビフォアサービスでもある

**サービスの4特性**

- **無形性** — 形がなく触れられない
- **同時性** — 顧客との共同作業、提供と消費が同時、元に戻せない
- **変動性** — 季節・曜日・時間帯による需要変動でサービス品質が変わる
- **消滅性** — サービス終了とともに消滅、在庫として持てない

---

## 3. 工程管理（優先度: 高）

### 3.1 PERT/CPMと工数見積り

[PERT/CPM](https://doboku-note.com/docs/pe-comprehensive-management-pert-cpm?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)はプロジェクトのスケジュール管理手法です。**クリティカルパス（最長経路）**上の作業が全体工期を決定します。クリティカルパス上の作業の余裕日数（フロート）はゼロです。

この「**クリティカルパス上はフロートゼロ**」という定義は択一での引っかけとして頻出です。ネットワーク図からクリティカルパスを特定する計算問題も出ます。

工数見積りの3手法（[類推見積り](https://doboku-note.com/docs/pe-comprehensive-management-analogous-estimation?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)・[パラメトリック見積り](https://doboku-note.com/docs/pe-comprehensive-management-parametric-estimation?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)・[三点見積り](https://doboku-note.com/docs/pe-comprehensive-management-three-point-estimation?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)）の特徴の違いも択一の定番です。

### 3.2 JIT・SCMと開発プロセス

[JIT（Just-In-Time）生産方式](https://doboku-note.com/docs/pe-comprehensive-management-jit-production?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は「必要なものを、必要なときに、必要な量だけ生産する」トヨタ生産方式の核心です。かんばん方式・プル型生産との関係が択一に出ます。

[SCM（サプライチェーン管理）](https://doboku-note.com/docs/pe-comprehensive-management-supply-chain-management?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は調達→生産→物流→販売の全プロセスを一元管理する手法です。

開発プロセスでは[ウォーターフォール](https://doboku-note.com/docs/pe-comprehensive-management-waterfall?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（要件定義→設計→実装→テストの順序固定）と[アジャイル](https://doboku-note.com/docs/pe-comprehensive-management-agile?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（短いイテレーションを繰り返す柔軟な手法）の対比が必須論点です。

---

## 4. 原価管理・財務会計（優先度: 高）

### 4.1 原価計算の種類

[標準原価計算](https://doboku-note.com/docs/pe-comprehensive-management-standard-costing?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（あらかじめ設定した標準コストと実績のギャップ＝差異分析）と実際原価計算・予定原価計算の3分類は択一での定義問題に出ます。

[活動基準原価計算（ABC）](https://doboku-note.com/docs/pe-comprehensive-management-activity-abc?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は間接費を「活動」に紐づけて配賦する手法です。「**従来の製品ベース原価計算では間接費の配賦が不適切になる問題を解決**」という文脈が択一の核心です。

[損益分岐点](https://doboku-note.com/docs/pe-comprehensive-management-break-even-point?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（売上 = 総費用となる販売量・売上高）の計算問題は毎年出ます。「損益分岐点売上高 = 固定費 ÷ (1 - 変動費率)」という公式は必須です。

### 4.2 財務三表

[貸借対照表（B/S）](https://doboku-note.com/docs/pe-comprehensive-management-balance-sheet?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（資産=負債+純資産の等式）・[損益計算書（P/L）](https://doboku-note.com/docs/pe-comprehensive-management-income-statement?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（売上高から純利益まで5段階の利益計算）・[キャッシュフロー計算書（C/F）](https://doboku-note.com/docs/pe-comprehensive-management-cash-flow-statement?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（営業・投資・財務の3活動分類）は財務三表として択一の出題頻度が高いです。

「**利益があっても資金不足で倒産するキャッシュフロー問題（黒字倒産）**」は財務管理の核心論点として記述式でも使えます。

---

## 5. 設備管理・数理的手法（優先度: 中）

### 5.1 設備保全の4分類

[予防保全](https://doboku-note.com/docs/pe-comprehensive-management-preventive-maintenance?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（定期的な点検・部品交換）と[予知保全](https://doboku-note.com/docs/pe-comprehensive-management-predictive-maintenance?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（センサーで状態を監視して最適タイミングで保全）・事後保全・改良保全の4分類が択一で問われます。

[バスタブカーブ](https://doboku-note.com/docs/pe-comprehensive-management-bathtub-curve?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は故障率の時間推移を示す曲線で「初期故障期→偶発故障期→摩耗故障期」の3段階で構成されます。「摩耗故障期に予防保全が最も有効」という論点が択一に出ます。

### 5.2 数理的意思決定手法

[モンテカルロシミュレーション](https://doboku-note.com/docs/pe-comprehensive-management-monte-carlo-simulation?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)は乱数を使って確率的な問題をシミュレートする手法で、リスク分析に用いられます。

[線形計画法](https://doboku-note.com/docs/pe-comprehensive-management-linear-programming?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（目的関数を線形制約のもとで最適化）と[AHP（階層分析法）](https://doboku-note.com/docs/pe-comprehensive-management-analytic-hierarchy-process?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（複数基準での意思決定を階層化して重み付け）は、それぞれの用途の違いを問う択一問題として出ます。

---

## 6. 記述式で使う「経済性管理 × 他の管理」トレードオフ

| トレードオフペア | 典型的な対立 | 解決の方向性 |
|---|---|---|
| 経済性 × 安全 | コスト削減 vs 安全設備投資 | 費用便益分析・ALARP適用 |
| 経済性 × 人的資源 | 人件費削減 vs 人材育成投資 | 教育ROI可視化・長期視点の人材戦略 |
| 経済性 × 情報 | 情報システム投資 vs 短期収益 | TCO分析・段階的ROI評価 |
| 経済性 × 社会環境 | コスト最優先 vs 環境対策投資 | 環境コスト内部化・LCA導入 |

このトレードオフ構造の詳細は[5管理間トレードオフ解説（無料）](https://doboku-note.com/docs/pe-comprehensive-management-management-tradeoffs?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)で確認できます。また、答案における具体的な使い方は note 有料記事「[トレードオフ思考 理論編](https://note.com/dobokunote)」で詳しく解説しています。

---

## 関連リソース

**doboku-note — 17年分の過去問 + 650キーワード解説（無料）**
https://doboku-note.com/category/pe-comprehensive-management?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management

- [経済性管理ピラーページ](https://doboku-note.com/docs/pe-comprehensive-management-economic-management-pillar?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（関連キーワードの全体マップ）
- 択一式過去問: [R07](https://doboku-note.com/docs/pe-comprehensive-management-r07-primary?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management) / [R06](https://doboku-note.com/docs/pe-comprehensive-management-r06-primary?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management) / [R05](https://doboku-note.com/docs/pe-comprehensive-management-r05-primary?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management)（経済性管理の問題を確認）
- [記述式過去問 R07](https://doboku-note.com/docs/pe-comprehensive-management-r07-secondary?utm_source=note&utm_medium=referral&utm_campaign=99-economic-management): 経済性 × 社会環境トレードオフの典型

**マガジン購入で割引（総監テキスト精読ガイド 5管理セット）**
- 経済性管理（本書）＋ 安全管理 ＋ 情報管理 ＋ 人的資源管理 ＋ 社会環境管理 = 単品合計 ¥4,900
- セット価格 **¥3,980**（19% OFF）※ 2026年順次公開予定

**著者プロフィール**
土木技術者として1級土木施工管理技士・建設部門の技術士に合格後、2026年に総合技術監理部門に挑戦。学習過程で蓄積した700キーワードの解説と17年分の過去問分析をdoboku-noteにて無料公開しています。
