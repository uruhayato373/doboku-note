# キーワード MDX 改善 Findings

ig-carousel-writer が MDX を読む過程で気づいた doboku-note 側の改善候補。MDX は直接編集しない。別途まとめて反映する。

---

## process-capability-index

- stickyText の「3%\n4%」（旧 v1 データ）は不正確な数値。正規分布の包含確率は「68.3% / 95.4% / 99.7%」であり、本文の記述と齟齬がある。IG カルーセルでは正しい数値に修正済みだが、今後 v1 の slide-data を参照するスクリプトがあれば注意が必要。

## maslow-hierarchy-of-needs

- マズローが晩年に追加した「自己超越欲求（第6段階）」について、MDX には言及があるが「試験に出るかどうか」の記載がない。ExamPoint にも含まれておらず、受験者が混乱する可能性がある。補足 Callout（info 型）で「自己超越欲求は試験範囲外の補足知識」と明示することを検討。

## concurrent-engineering

- 1986 年の IDA 報告書 R-338 の参照は学術的に正確だが、総監試験での出題実績が不明。MDX の「発展の経緯と概念の確立」セクションは詳細すぎる可能性があり、ExamPoint に含まれていない論点が歴史解説として長文化している。試験頻出論点（1製品の各工程を並行・複数製品の同時開発ではない）との比重バランスを再検討する余地がある。

## pdca-cycle

- MDX 本文が定義（H2「定義」）・図・参照リンクのみで実質的に薄い。「関連概念」「メモ」セクションが空のままで ExamPoint も未設置。試験論点（4段階の意味・Act で何を「改善」するか・KPI/ISO との接続）が整理されていない。IG カルーセル執筆では一般知識から補完したが、MDX 側に ExamPoint と本文の肉付けを行うことを推奨。

## accident-cost

- v1 の `noteText` が「直接費 : 間接費 ≒ 1 : 4（ハインリッヒの法則）」と表記していたが、これは用語の混同である。1 : 4 はハインリッヒが提唱した「災害コスト比率」であり、ハインリッヒの法則（重大災害1 : 軽傷29 : 無傷害300 の件数比率）とは別の知見である。ig-carousel-writer では v2 で「ハインリッヒの災害コスト比率」として正確に区別して記述した。MDX 本文の記述は正確だが、過去問演習や ExamPoint に「ハインリッヒの法則と混同しない」旨の注意 Callout を追加することを検討する。

## front-loading

- ものづくり白書 2020 の参照 URL がタイトルと一致していない（「2020年版ものづくり白書の概要」とあるが URL は RIETI の 2006 年 BBL イベントページを指している）。参考資料 URL の実在確認と差し替えを推奨。

## accounting-systems

- MDX の `RelatedKeywords` に `api`（API）と `blockchain-crypto`（ブロックチェーン・暗号資産）が含まれているが、財務・管理会計システムとの関連が弱い。IG カルーセルの cta.related では除外し、`balance-sheet`・`income-statement`・`agile`・`api` の4件に留めた。MDX 側でも RelatedKeywords の絞り込みを検討する余地がある。

## after-service

- MDX に `published: false` が設定されており、未公開ページである。IG カルーセルの投稿タイミングまでに公開設定を確認すること。

## agenda-21

- description フィールドに「5管理トレードオフ・過去問演習リン。技術士総合技術監理キーワード集2026（社会環境管理）。5管理トレードオフ・過去問演習リンク付き。」と重複・途切れが生じている。description の修正を推奨。

## agile

- RelatedKeywords に `accounting-systems`・`api`・`blockchain-crypto` が含まれているが、アジャイル開発との関連が弱い。IG カルーセルでは `waterfall`・`design-thinking`・`pmbok` を中心に構成した。MDX 側の RelatedKeywords 絞り込みを検討する余地がある（`accounting-systems` の findings と共通の指摘）。

## aging-infrastructure

- 「スマート保安」（`smart-safety`）は RelatedKeywords に含まれているが、MDX 本文テキストリンクでのみ触れられており ExamPoint には含まれない。IG カルーセルの cta.related には含めなかった。MDX 側で RelatedKeywords に正式追加するかどうかを検討する余地がある。

## air-pollution-control-act

- 「総合技術監理における位置づけ」セクションの冒頭に空行が入っており、表示上の問題が発生する可能性がある。軽微だが修正推奨。

## alarp-principle

- 「関連テーマ記事」セクション（H2）が空のまま残っている。MDX レンダリング上の問題を引き起こす可能性があり、セクション削除を推奨。

## alps-treated-water

- 廃炉完了目標として MDX 本文に「2051年」と記載されているが、廃炉工程表は東京電力が複数回見直しており、最新情報での確認を推奨。IG カルーセルでは MDX 本文の記述（2051年）に忠実に記載した。

## antitrust-compliance

- キーワード名「独占禁止法とコンプライアンス」は15字でポリシーの推奨上限14字を超える。MDX の title と一致させる必要があるため変更はせずカルーセルに記載したが、将来的にスラグとtitleの短縮を検討する余地がある。

## annual-salary-system

- `RelatedKeywords` の5件はすべて労働法系（次世代育成・子育て・育児介護・障害者差別・障害者雇用）で年俸制との関連が間接的。賃金制度・評価制度に直結する「職務給」「業績連動型賞与制度」「目標管理制度（MBO）」との関連リンクがあるとより有用。

## api

- `RelatedKeywords` が `iot` と `blockchain-crypto` の2件のみで最小限。`cloud-computing`・`cybersecurity`（情報セキュリティ関連）が追加されるとAPIエコノミー・セキュリティの観点で補完できる。

## asbestos-issue

- `RelatedKeywords` に `バーゼル条約` が含まれているが、IG カルーセルの cta.related にも採用した。一方 MDX 本文テキストリンクにもバーゼル条約への言及があり整合性は取れている。
- レベル分類（1〜3）の説明において、レベルと危険度の対応（レベル1が最危険）が ExamPoint に明示されているが、本文中の記述が先に来ているため流れとして理解しやすい構成になっている。特に問題なし。

## asch-conformity-experiment

- 「集団思考（グループシンク）」の定義が本文中に含まれているが、グループシンクは別キーワードとして独立させると相互リンクが強化できる可能性がある。現状 RelatedKeywords にグループシンク関連キーワードが含まれていない。

## attitude-appraisal

- MDX 本文の section が `3.4`（人材開発）だが、情意考課は採用・評価制度の評価論点であり `3.4`（人材開発）より `3.3`（人事評価・賃金管理）に近い内容。セクション分類の見直しを検討する余地がある。

## backcasting

- `reviewStatus: needs-review` が設定されており、MDX の審査が未完了。IG カルーセルは本文の記述に忠実に執筆したが、公開前に MDX の最終レビューを推奨する。
- MDX 本文の R02 Ⅰ-1-38 過去問参照箇所で、同一段落に「バックキャスティング手法」と「SDGs」が混在しており、「バックキャスティングが SDGs そのものを指す」と誤解される可能性がある。整理 Callout（note 型）を追加して区別を明確にすることを検討する。

## basel-convention

- 旧 v1 の stickyText が「事前通告・同意（」で途中切れ（8字制限を意識したとみられるが文脈が失われていた）。v2 では行単位で「PIC手続き」「越境移動規制」「輸出国視点」に分割して修正した。
- MDX に「日本は有害廃棄物の輸出国としての側面が大きく、輸入量は限定的」という重要な試験論点がある。旧 v1 では本文 board に記載がなく、カルーセルのみでは伝わらない状態だった。ExamPoint には記載あり。

## bathtub-curve

- SVG が2枚（bathtub-curve-phases.svg, bathtub-maintenance-effect.svg）あり、いずれも IG カルーセルの figure スライドとして適切に再利用できる。figure を2枚含む構成にした。
- 偶発故障期を前提とした MTBF 計算は過去問（R04 Ⅰ-1-19, R02 Ⅰ-1-19）で出題実績があり、ExamPoint にも記載があるが IG カルーセルでは noteText で触れるにとどめた。詳細演習はサイト誘導で対応。

## before-service

- `published: false` が設定されており、IG 投稿タイミングまでに公開設定の確認が必要。
- 「買替え需要・買増し需要を考慮するとアフターサービスが次期購買のビフォアサービスとして機能する」という循環関係の記述は MDX に明確にあるが、ExamPoint には含まれていない。試験頻出度が高い場合は ExamPoint への追加を検討する。

## behavioral-regulation

- 行為規制とパフォーマンス規制の比較は MDX 本文で表形式で整理されているが、図版がない。IG カルーセルで figureSpec として「左右2列比較図」を指定した。doboku-note 側への SVG 寄贈候補として記録する。

## bid-rigging

- 旧 v1 の noteText に `[**独占禁止法第3条**](https://laws.e-gov.go.jp/law/322AC0000000054#Mp-At_3)` のような Markdown リンク記法が含まれており、IG レンダラーで表示崩れが起きる可能性がある。v2 では noteText をプレーンテキストに修正した。
- リニエンシー制度の減免率（1番目全額免除・2番目20%・3〜5番目10%・6番目以降5%）は MDX に明示されており、IG カルーセルにもそのまま記載した。

## biodiversity-basic-act

- 旧 v1 の board.body が空文字列（`""`）であり、実質的に未執筆の状態だった。v2 で全スライドを新規執筆。
- 30by30 目標（陸域・海域の30%以上を保護地域等で保全）は 2023-2030 戦略の核心であり、IG カルーセルに明記した。MDX 本文には記載あり。

## bioeconomy

- 2024年6月に「バイオ戦略」から「バイオエコノミー戦略」に名称が変更された事実が MDX 本文にある。旧 v1 には反映されていなかった。v2 では 2024年改定を明示した。
- 100兆円規模の市場創出目標（2030年）は MDX 本文に明記されているが、ExamPoint には含まれていない。数値目標として試験に出る可能性があるため ExamPoint への追加を検討する。
