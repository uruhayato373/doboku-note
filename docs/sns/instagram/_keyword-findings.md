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
