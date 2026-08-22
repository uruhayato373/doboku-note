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

## biosafety

- `reviewStatus: needs-review` が設定されており、MDX の審査が未完了。公開前に最終レビューを推奨する。

## bowtie-analysis

- `reviewStatus: needs-review` が設定されている。MDX 本文は適切に整備されているが、公開前に最終レビューを推奨する。
- 図版（ボウタイ構造図）が MDX に存在しない。IG カルーセルの figureSpec で制作指定したものを doboku-note への SVG 寄贈候補として記録する（蝶ネクタイ型：左FTA側＋右ETA側、6要素ラベル付き）。

## break-even-point

- keyword 名「損益分岐点・限界利益・優劣分岐点」は17字であり、ポリシーの「14字以内が望ましい」を超える。MDX の title と一致させる必要があるため変更せずカルーセルに記載したが、将来的にスラグと title の短縮を検討する余地がある（biosafety の findings と同趣旨の指摘）。

## business-continuity-plan

- MDX の BCP 策定手順は6段階（Timeline コンポーネント）で整理されているが、IG カルーセルでは枚数制約上省略した。試験頻出の「RTO・RLO」「BIA」「サプライチェーン全体が対象」に絞って記載した。
- 「関連テーマ記事」セクション（H2）が空のまま残っている。他キーワードと同様にセクション削除を推奨。

## business-intelligence

- `RelatedKeywords` に `ブロックチェーン・暗号資産`（blockchain-crypto）が含まれているが、BI（意思決定支援）との関連が弱い。IG カルーセルの cta.related からは除外し、`集中化と分散化` に置き換えた。MDX 側の RelatedKeywords 絞り込みを検討する余地がある。

## carbon-neutral

- img/ ディレクトリに SVG が存在せず、`figure-5-2-ccs-flow.webp`（CCS 3段階フロー）のみが配置されている。IG カルーセルの figure スライドで SVG 再利用ができないため figureSpec による新規制作指定を選択しなかった（CCS フローは webp 再利用も可能だが、ig-post-create.mjs での imagePath 対応は要確認）。CCS フロー図の SVG 版制作を SVG 寄贈候補として記録する。
- `reviewStatus: needs-review` が設定されており、MDX の審査が未完了。公開前に最終レビューを推奨する。

## carbon-pricing

- MDX の title「環境税・カーボンプライシング」は15字でポリシーの「14字以内が望ましい」を超える。IG カルーセルの keyword フィールドでは「カーボンプライシング」（10字）に中核語を絞った。MDX title の短縮も将来的に検討する余地がある。
- `reviewStatus: needs-review` が設定されており、最終レビューを推奨する。

## career-ownership

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。

## career-path

- MDX 本文「制度の背景と普及経緯」セクションは詳細な歴史解説で試験との関連が間接的。ExamPoint に含まれていない「女性活躍推進法（2015年）」「セルフ・キャリアドック」はサイト誘導論点として IG カルーセルの noteText に採用した。

## career-track-system

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。

## cash-flow-statement

- MDX の title「キャッシュ・フロー計算書」は14字でポリシーの推奨上限ちょうど。IG カルーセルの keyword フィールドでは「CF計算書」（6字）に短縮した。MDX title はそのままで問題ない。
- 3区分の増減マトリクス SVG（cf-changes-matrix.svg）が存在し、figure スライドで再利用した。

## catastrophe-bias

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。バージンバイアスとの識別論点が ExamPoint に明示されており、IG カルーセルに反映した。

## cause-and-effect-diagram

- fishbone-4m.svg が存在し、figure スライドで再利用した。
- 5M+1E・6M の拡張版について MDX 本文には「5M+1E」の記載があるが「6M」は記載なし。ExamPoint には「6M」が含まれている（MDX と ExamPoint の記述不一致）。IG カルーセルでは「5M+1E」のみを採用した。

## cdp-sbt-re100

- MDX の title「CDP・SBT・RE100」は15字でポリシーの推奨上限14字を超える。IG カルーセルの keyword フィールドでは MDX の title に忠実に「CDP・SBT・RE100」を使用した。将来的にスラグと title の短縮を検討する余地がある（antitrust-compliance・break-even-point の findings と同趣旨）。

## centralization-decentralization

- MDX の RelatedKeywords に含まれる「可用性（Availability）」「クラウドコンピューティング／オンプレミス」「エッジコンピューティング」「RASIS」は情報管理の核心と整合しており、IG カルーセルの cta.related にも採用した。
- 集中処理と分散処理の比較表（7軸）は図版として整理すると理解が進む論点であり、figureSpec で比較表図を制作指定した。doboku-note への SVG 寄贈候補として記録する。

## chemical-substances-review-act

- 化審法の5区分（第一種特定→第二種特定→監視→優先評価→一般）は段階図として図示すると規制強度と要件の対応が直感的に理解できる。figureSpec で段階図を制作指定した。doboku-note への SVG 寄贈候補として記録する。
- MDX の ExamPoint に「少量新規制度：全国合計年間1トン以下は簡易手続き」が明記されており、試験頻出論点として IG カルーセルに反映した。

## child-rearing-support-act

- 特記なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。

## childcare-nursing-leave-act

- 旧 v1 slide-data.json は board が1枚のみで、産後パパ育休・介護休業・その他制度の各論が欠落していた。v2 では5スライド構成で全制度を網羅した。
- 1000人超企業の取得状況公表義務（2022年改正）は ExamPoint に明記されているが旧 v1 カルーセルには含まれていなかった。v2 の noteText に組み込み済み。

## child-support-act

- ExamPoint の記述で「認定区分：1号（教育）」と「2号（保育・3歳以上）、3号（保育・3歳未満）の3区分」が別行に分断されており、ExamPoint items の配列構造が途切れた形になっている。MDX レンダリング上の問題を引き起こす可能性があり、items の統合を推奨する。

## circular-economy

- 特記なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。物質フロー図（figure-5-6-material-flow.webp）は webp 形式のみで SVG が存在しない。IG カルーセルでは board のみで構成した。

## circular-society-basic-act

- 旧 v1 の stickyText が「3Rの優先順位:」で途中切れていた。v2 では「Reduce優先 / 個別7法 / 都市鉱山」に修正した。
- 旧 v1 は board が1枚のみで3Rの優先順位以外の論点（法体系・建設リサイクル法・都市鉱山）が欠落していた。v2 では5スライド構成で全論点を網羅した。

## cites

- 旧 v1 の board.body に CITES の英語正式名称（Convention on International Trade in Endangered Species of Wild Fauna and Flora）が全文含まれており、120字超過の懸念があった。v2 では英語略称のみ記載し日本語解説に集中した。
- 「ワシントン条約は条件が整えば学術目的・商業目的の国際取引が可能」（R02 Ⅰ-1-34 の正答）は附属書 I / II / III の3段階理解が前提であり、IG カルーセルで附属書ごとの規制内容を明示した。

## citizen-participation

- arnstein-ladder.svg が img/ ディレクトリに存在し、IG カルーセルの figure スライドで再利用した。
- 旧 v1 の board.body にアーンスタインの梯子の全文（7行改行入り）が含まれており、字数大幅超過かつ改行記号による棒読み構造になっていた。v2 では figure スライドで図を提示し、board スライドで3カテゴリの解説に集中する構成に再設計した。

## civil-protection-act

- 旧 v1 が v2 スキーマ非対応（cover/board/cta のフラット構造で slides 配列なし）。v2 で全スライドを新規執筆した。
- 警報発令主体（対策本部長＝内閣総理大臣）と「発信しなければならない」（義務）は R01 出題の核心。MDX の Callout に詳細があり ExamPoint にも明記されており整合は良好。

## clearance-level

- 旧 v1 が v2 スキーマ非対応。v2 で全スライドを新規執筆した。
- 主要核種のクリアランスレベル（Co-60: 0.1 Bq/g、H-3: 100 Bq/g 等）の数値は試験に出る可能性があるが ExamPoint には記載がない。IG カルーセル board に反映済み。MDX の ExamPoint への数値追加を検討する余地がある。
- section が 6.2（地域環境問題）だが、安全管理・経済性管理・情報管理が交差する論点であり、総監 5 管理の横断論点として ExamPoint に明示すると試験対策として有用。

## climate-change-adaptation-act

- 旧 v1 が v2 スキーマ非対応。heavy-rainfall-trend.svg を figure スライドで再利用した。
- 警戒レベル 4 の「避難指示」一本化（旧：避難勧告＋避難指示緊急）は令和 3 年改定の核心。MDX 本文に正確に記載あり。

## climate-change-international

- 旧 v1 の stickyText が「2020年\n8%\n0%」と意味不明な数値のみで試験論点を伝えていなかった。v2 で全面再設計した。
- IPCC AR6 報告書の「疑う余地がない」断定、パリ協定の 2℃/1.5℃ 目標、NDC の 5 年更新、ロス＆ダメージ（COP27 合意・COP28 運用開始）がすべて試験頻出論点であり、v2 で 5 スライドに整理した。
- ロス＆ダメージ基金の運用開始（COP28・2023 年・ドバイ）は最新情報。MDX 本文に記載あり。

## cloud-on-premises

- MDX の title「クラウドコンピューティング／オンプレミス」は 18 字で IG カルーセルの keyword フィールド推奨 14 字を大きく超える。v2 カルーセルでは「クラウド／オンプレミス」（12 字）に短縮した。MDX title の短縮も将来的に検討する余地がある（carbon-pricing・break-even-point 等と同趣旨）。
- figure-1.svg（IaaS・PaaS・SaaS 責任分界表）が存在し figure スライドで再利用した。
- R03 出題誤答「PaaS はメール等アプリ機能を提供」（正：SaaS）は MDX の Callout に明示されており、v2 board の noteText に反映した。

## club-of-rome

- 旧 v1 が v2 スキーマ非対応。v2 で全スライドを新規執筆した。
- cta.related の MDX RelatedKeywords には酸性雨・アジェンダ 21・生物多様性基本法・バイオセーフティが含まれるが、ローマクラブの文脈では「持続可能な開発目標（SDGs）」「プラネタリー・バウンダリー」のほうが思想的連続性が高いため、v2 では後者 2 件と入れ替えた。MDX 側の RelatedKeywords 見直しを検討する余地がある。

## cluster-analysis

- 旧 v1 が v2 スキーマ非対応。v2 で全スライドを新規執筆した。
- 3 手法対比（クラスター分析・因子分析・主成分分析）は MDX 本文の「3 手法の対比」表が充実しており、v2 最終スライドに反映した。試験ではこの 3 手法の目的・出力の違いの識別が重要。
- description フィールドに「5管理トレードオフ・過去問演習リン。技術士総合技術監理キーワード集2026（情報管理）。5管理トレードオフ・過去問演習リンク付き。」と重複・途切れが生じている（agenda-21 と同種の問題）。description の修正を推奨。

## collective-intelligence

- ExamPoint の items 配列内に「集約メカニズム（投票」「市場、アルゴリズム等）がなければ知識は活用されない」が2要素に分断されており、MDX レンダリング上の不整合がある。items を統合することを推奨。
- 集合知の4条件（多様性・独立性・分散性・集約メカニズム）を図示する SVG（4条件の相互関係図）があると理解が深まる。IG カルーセルでは board スライドで説明したが、doboku-note 側への SVG 寄贈候補として記録する。

## common-criteria

- EAL1〜7の7段階を視覚的に整理した段階図（縦軸：保証レベル、横軸：商用/政府向け区分）があると試験直前の暗記に有効。figureSpec での制作を将来的に検討する。

## communication-control

- MDX「コントロール手法」の表（5手法）と「コントロールの対象」の表（5対象）は同一ページに縦に並んでいるが、相互の対応関係が明示されていない。「正確性の監視にはフィードバック収集が有効」等の対応マップを Callout で補足すると試験対策として有用。

## communication-planning

- MDX コミュニケーション・マトリクスの建設現場事例（発注者・監理技術者・下請業者・近隣住民の4行）は具体的で有用だが、ExamPoint には含まれていない。試験で問われる可能性があるため ExamPoint への追加を検討する。

## competency-evaluation

- MDX の ExamPoint items に「情意考課」の3分野の1つという記述がなく、三分野の位置づけが本文本体に分散している。ExamPoint の summary が長く（72字）、policy 推奨（簡潔）を若干超えている。summary の短縮を検討する余地がある。

## competency-hr

- MDX の `dateModified` は 2026-04-23 だが `lastRewrittenAt` は 2026-05-17T08:39:10Z で、本文が最近更新されている。コンピテンシーモデルの構築ステップ（4ステップ）と氷山モデルの両方を ExamPoint に明示的に含めると試験対策として有用。現状 ExamPoint には4ステップの一覧が含まれていない。

## confidentiality

- R04 Ⅰ-1-24「クレジットカード番号の盗聴防止＝電子署名は誤答」という引っかけが MDX 本文に記載されているが、ExamPoint には含まれていない。過去問論点として ExamPoint に追加することを推奨。
- 個人情報保護法の「仮名加工情報・匿名加工情報」の区分整理（2022年改正）は MDX 本文に記載があるが ExamPoint には未収録。最新改正論点として追加を検討する余地がある。

## conformity-bias

- 内容は充実しており構造上の問題はなし。IG図版として「情報的影響と規範的影響の2経路を示した図」があると概念の定着に有用（figureSpec候補）。

## consensus-instruments

- 「4手法の比較マトリクス（規制的・経済的・合意的・情報的）」の図版があると試験対策として視覚的に理解しやすくなる（figureSpec候補）。経団連環境自主行動計画（1997年）・低炭素社会実行計画（2013年以降）の時系列は試験で問われる可能性がある論点だが ExamPoint には未収録のため追加検討を推奨。

## construction-plan

- 工事計画の5要素（施工方法・仮設計画・工程計画・安全衛生計画・環境対策）と5管理（品質・工程・原価・安全・環境）の対応関係を示す図があると理解が深まる（figureSpec候補）。MDX の ExamPoint は3項目で適切。

## consumer-product-safety-act

- PSCマーク制度の2区分（特別特定製品4品目vs特定製品8品目）の対比表は MDX に詳細に記載されており内容は充実。reviewStatus: approved で問題なし。特定保守製品が2021年に2品目に絞られた事実は引っかけ論点として重要で、ExamPoint にも正確に記載されている。

## consumer-safety

- reviewStatus: approved で内容は充実。設置主体の引っかけポイント（R03 Ⅰ-1-25）が Callout で明示されており試験対策として優れた構成。特に問題なし。

## content-process

- reviewStatus: needs-review。シャインの3支援モデル（専門家モデル・医師＝患者モデル・プロセス・コンサルテーション）の対比を視覚化した図があると理解が深まる（figureSpec候補）。R02 Ⅰ-1-16 の引っかけ論点が MDX 末尾の総監位置づけセクションに記載されているが、ExamPoint には収録されておらず追加を推奨。

## contingency

- MDX 本文が3セクション（定義・類型・対応プロセス）と薄く、BCP・BCMとの関係性や「不測事態と緊急事態の違い」が ExamPoint items に収録されているが本文での説明が簡潔すぎる。IG カルーセルでは MDX の ExamPoint items を参照して補完した。MDX 本文への「緊急事態との概念的違い」の説明追加を推奨。

## continued-employment-system

- 70歳就業確保の5類型（定年引上げ・継続雇用・定年廃止・業務委託・社会貢献事業）を段階図として SVG 化すると IG figure スライドとして再利用できる。現状 SVG なし。doboku-note への SVG 寄贈候補として記録する。
- MDX 本文の「建設部門における課題と対応」セクション（体力的負荷・技能伝承・安全管理・処遇設計）はキーワード試験より記述式答案向けの内容であり、ExamPoint には収録されていない。試験頻出度に応じて ExamPoint への追加を検討する余地がある。

## convention-on-biodiversity

- 旧 v1 の board.body は定義1文のみで、3目的・主要議定書・昆明・モントリオール枠組みのいずれも欠落していた。v2 で5スライド構成に全面再設計した。
- ExamPoint の items 配列（第2・3項目）が「持続可能な利用、遺伝資源の利益の公正な配分（ABS）」と1行にまとまっており、3目的がすべて同一 items として整理されていない。ExamPoint の items 分割を推奨（3目的をそれぞれ1行ずつに分割）。
- CBD の3目的の体系図（CBD→カルタヘナ議定書→名古屋議定書、ラムサール・ワシントン条約は並列の別系統）は試験で問われる構造理解に直結する。doboku-note SVG 寄贈候補として記録する。

## copyright

- authors-rights-structure.svg が存在し、著作者人格権（3種）と著作財産権（11種）の二層構造が視覚化されている。IG figure スライドで再利用した。
- 「AI 学習用データ収集は著作権制限規定（30条の4）で原則許諾不要」（2018年改正）は MDX 本文に詳細があるが ExamPoint には未収録。近年の AI 規制議論を背景に試験で出題される可能性が高まっており、ExamPoint への追加を強く推奨する。
- 放送事業者の著作隣接権（複製権・再放送権・テレビジョン放送の伝達権）の保護期間は50年であり、実演家・レコード製作者の70年と異なる。この差異が引っかけとして出題される可能性がある。ExamPoint への追加を検討する。

## corrective-maintenance

- 設備保全体系の4区分（予防保全・事後保全・改良保全・保全予防）の2×2マトリクス図（縦軸：維持/改善、横軸：予防/事後）があると試験論点の視覚的整理に有用。figureSpec で制作指定した。doboku-note SVG 寄贈候補として記録する。
- JIS Z 8115 による事後保全の正式定義（「フォールト検出後、アイテムを要求どおりの実行状態に修復させるために行う保全」）は MDX 本文に記載あり。ExamPoint には含まれていないが、JIS 定義の引用が出題された場合の備えとして追加を検討する余地がある。

## correlation-analysis

- correlation-scatter-patterns.svg（3パターン散布図）と regression-line.svg（回帰直線）が存在し、IG figure スライドで再利用した。
- MDX の ExamPoint に「相関係数は -1〜1 の値をとり、絶対値が1に近いほど線形関係が強い」「第三の変数が介在する擬似相関に注意」「相関分析は関連の強さを見る手法、回帰分析は予測式を求める手法（混同しないこと）」が揃っており、試験論点の網羅性は高い。
- スピアマンの順位相関係数（ノンパラメトリック）・ケンドールの順位相関係数（小サンプルで安定）の2種は MDX 本文に詳述されているが ExamPoint には未収録。択一問題で「ピアソン vs スピアマン」の選択が問われる可能性があるため ExamPoint への追加を検討する余地がある。

## cost-driver

- 現状 SVG なし。「間接費→活動→コストドライバー→製品」の流れ図（ABCの配賦プロセス図）を新規作成すると経済性管理の理解を助ける。figureSpec で制作指定した。doboku-note SVG 寄贈候補として記録する。
- 「ドライバーの種類が多すぎると運用コストが増大する」（選定のポイント）は MDX 本文に記載があるが ExamPoint には含まれていない。実務的な設計トレードオフとして試験で問われる可能性があり、ExamPoint への追加を検討する余地がある。

## cost-maintenance

- MDX の RelatedKeywords に「原価差異分析」（cost-variance-analysis）が含まれていない。本文テキストリンクとしては登場するが、原価維持の中核ツールであるため RelatedKeywords への追加を推奨する。IG カルーセルの cta.related には原価差異分析を追加した。

## cost-variance-analysis

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。R02 Ⅰ-1-6 の符号判定引っかけ（直接労務費差異が有利差異であることを不利と誤認）が Callout に詳細記述されており、IG カルーセルに反映した。

## cpd

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。2021年（令和3年）の技術士登録簿へのCPD実施状況記載の制度化が試験論点として出題される可能性があり、IG カルーセルに反映した。

## crisis-communication

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。「安全のための広報（迅速性優先）」と「安心のための広報（正確さ+安心感）」の二分類が IG カルーセルの中心構成として有効。

## crisis-management-manual

- 特記事項なし。MDX・ExamPoint・RelatedKeywords ともに適切に整備されている。4段階（平常時準備→事前作業→緊急事態対応→事後復旧）と策定5要件がともに IG カルーセルに収録できる内容量であった。

## crisis-priority

- MDX 本文が比較的薄い（3セクション：定義・4段階原則・トリアージ）。ExamPoint は整備されており試験論点は網羅されているが、総監5管理のトレードオフ（安全管理と経済性管理の優先順位判断）についての説明が本文に薄い。背景セクションには記述あり。

## crm-system

- MDX の RelatedKeywords が `api`・`blockchain-crypto` 等、顧客管理システムとの関連が弱いキーワードを含んでいる（accounting-systems・agile の findings と同趣旨）。IG カルーセルの cta.related では `財務会計・管理会計システム`・`ビジネスインテリジェンス（BI）`・`アジャイル`・`API` の4件を採用した。MDX 側の RelatedKeywords 絞り込みを検討する余地がある。

## cost-effectiveness-analysis

- 現状 SVG なし。「CBA・CEA・CUA の3手法比較表」（効果の単位・主要適用分野・比較指標の3行×3列）を SVG 化すると試験直前の暗記に直結する。figureSpec で制作指定した。doboku-note SVG 寄贈候補として記録する。
- ICER の式（費用差/効果差）は MDX 本文に LaTeX 数式で記載されているが、IG カルーセルでは数式の表示制約上テキストで説明した。サイト誘導で補完。
- 「CBA と CEA の使い分け：便益の貨幣換算が困難な分野では CEA を補完的に用いる」は公共事業設計の実務論点として試験に出やすい。MDX の ExamPoint に明示されており整合は良好。
