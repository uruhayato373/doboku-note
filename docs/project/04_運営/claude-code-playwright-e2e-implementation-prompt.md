# Claude Code指示プロンプト：Playwright E2E導入

以下をClaude CodeのFableセッションへ、そのまま渡して使用する。

```text
あなたは /Users/minamidaisuke/doboku-note の実装オーケストレーターです。

目的:
doboku-noteへ、主要ページ・回遊・note CTA・モバイルoverflowを検査する最小構成のPlaywright E2Eを導入してください。

設計SSOT:
docs/project/04_運営/12_Playwright_E2E導入設計.md

必ず最初に読むもの:
1. CLAUDE.md
2. docs/project/04_運営/12_Playwright_E2E導入設計.md
3. package.json
4. next.config.mjs（実在する設定ファイル名を確認）
5. src/app/page.tsx
6. src/app/category/[slug]/page.tsx
7. src/app/docs/[...slug]/page.tsx
8. src/app/not-found.tsx
9. src/lib/note-magazines.ts
10. .github/workflows/uptime-ping.yml

開始時の必須確認:
- git branch --show-current
- git status --short
- git fetch -q && git log --oneline HEAD..origin/$(git branch --show-current) | head
- 既存のユーザー変更と他セッションの変更を列挙し、今回触らないファイルを明確にする
- ブランチが指示と異なる、またはoriginより遅れている場合は、勝手にcheckout/reset/pullせず停止して報告する

完了条件:
- playwright.config.ts
- e2e/smoke.spec.ts
- e2e/navigation.spec.ts
- e2e/cta.spec.ts
- e2e/mobile.spec.ts
- package.jsonのtest:e2e系スクリプト
- .github/workflows/e2e.yml
- desktop Chromiumとmobile Chromiumで主要テスト成功
- npm test、npm run type-check、npm run lint、npm run build成功
- note.comへのログイン・購入・公開操作なし
- 既存ユーザー変更を巻き込まない
- /doc-sync実施
- docs/handoffs/へ実装ログ保存

オーケストレーション方針:
Fableが全体の司令塔、状態管理、コマンド実行、差分統合、最終判断を担当してください。サブエージェントへリポジトリ全体を読ませず、必要ファイル、具体的な質問、期待する出力形式、最大出力量を明示してください。

Phase 0: Fableによる決定的調査
- Fable自身がbranch、status、package.json、route、既存CIを確認する
- rg、find、テストコマンドで分かることをモデルへ委譲しない
- 実在する代表記事slugとCTAを現物から確定する
- 設計書の仮パスが存在しない場合は、同じカテゴリのpublishedな代表ページへ置換する
- 調査結果を10項目以内に圧縮してから次へ進む

Phase 1: Opusによる設計レビュー（1回のみ）
- Opusを使える場合だけ、read-onlyの設計レビュアーとして1回起動する
- 渡すものは設計SSOT、package.jsonの関連部分、route一覧、候補ファイル一覧、Fableの調査要約だけ
- リポジトリ全体の探索は依頼しない
- 質問は次の4点に限定する:
  1. 初版テストが過剰・不足でないか
  2. locatorとflake対策に問題がないか
  3. next devとstatic exportの境界が妥当か
  4. CIで危険な外部操作が発生しないか
- 出力は「BLOCKER / SHOULD / ACCEPT」の表、最大1200語相当
- Opusには実装・ファイル編集・コマンド実行をさせない
- 環境またはプロジェクト規約上、Opusサブエージェントを使用できない場合は、Fableが同じ4点をレビューし、無理にモデルを呼ばない

Phase 2: Sonnetによる実装
- Sonnet実装担当を1つだけ起動する
- 同じファイルを複数エージェントへ並列編集させない
- 渡すもの:
  - 変更可能ファイル一覧
  - 設計SSOT
  - Fableが確定した代表URLと期待する見出し／CTA href
  - OpusレビューのBLOCKERとSHOULDだけ
  - 完了条件と禁止事項
- 変更可能ファイル:
  - playwright.config.ts
  - e2e/**/*.ts
  - package.json
  - package-lock.json（依存変更が実際に必要な場合のみ）
  - .github/workflows/e2e.yml
- 原則としてsrc/**を変更しない。role、label、hrefでlocatorを作れず、data-testidが本当に必要な場合は、Sonnetは編集せずFableへ理由を返す
- @playwright/testは既に入っているため、不要な依存追加やバージョン更新をしない
- waitForTimeout、外部note遷移、認証情報、購入・公開操作、全記事クロール、visual snapshotは追加しない
- Sonnetの報告は「変更ファイル / 実装内容 / 実行コマンド / 失敗」の4節、最大1500語相当

Phase 3: Fableによる機械検証と修正
- Fableが実際の差分を読む
- package.jsonの既存testコマンドを上書きしていないことを確認する
- npm run test:e2eを実行する
- 失敗時はtraceとエラーを読み、原因を「製品不具合 / テスト不具合 / 環境不具合」に分類する
- 決定的に直せる問題はFableが外科的に修正する
- 同じ原因で2回失敗した場合のみ、Sonnetへエラー抜粋と該当specだけを渡して再修正を1回依頼する
- retryを増やして隠さない

Phase 4: Sonnet QA（read-only、1回）
- 実装担当とは別コンテキストのSonnetをread-only Evaluatorとして起動する
- 渡すものはgit diff、設計SSOTの完了条件、テスト結果要約だけ
- 次を監査する:
  1. brittle locator
  2. waitForTimeoutや不要なsleep
  3. 外部note操作
  4. 過剰なdata-testid
  5. desktop/mobileの重複と過剰テスト
  6. CI artifactとtrace設定
  7. 既存変更の巻き込み
- 出力は重大度順の指摘のみ。問題なしならPASS。最大800語相当
- QA担当はファイルを修正しない

Phase 5: Fableの最終ゲート
以下をFable自身が実行する:
- npm test
- npm run type-check
- npm run lint
- npm run test:e2e
- npm run build
- git diff --check
- git status --short
- /doc-sync

検証で既存の無関係な変更が原因の失敗を見つけた場合、勝手に修正しない。今回差分が原因かを切り分けて報告する。

トークン節約ルール:
- サブエージェントは最大3呼出し: Opus設計レビュー1、Sonnet実装1、Sonnet QA1
- 再修正は同一Sonnetへの追加指示を優先し、新規エージェントを増やさない
- コマンド出力全文をモデルへ渡さず、エラー前後80行以内に切る
- package.json全体ではなく関連scriptsとdevDependenciesだけ渡す
- git diffは対象ファイルだけ渡す
- テスト成功ログはコマンド名とexit codeだけ記録する
- ルーティング、URL存在確認、status code、grepで判定できる事項はFableかコードで処理する
- Opusをコーディング作業や定型QAに使わない
- Sonnetへ戦略の再検討をさせない
- 作業途中の長文説明を生成しない

実装要件:
- Playwright projectsはdesktop Chromiumとmobile Chromiumの2つ
- CIのみretry 1、ローカルretry 0
- screenshotは失敗時のみ
- traceはfirst retry
- videoはoff
- webServerは127.0.0.1:3020のnpm run devを使用し、ローカル既存サーバーを再利用可能にする
- console/pageerrorを監視するが、外部analytics等の既知ノイズを無制限にignoreしない
- CTAはhrefを検査し、note.comへnavigateしない
- mobile overflowはページ全体を検査し、意図的な内部スクロール領域を壊さない
- テストデータは代表ページ3資格に限定する
- locatorはrole > label > text > href > testidの順
- CIはChromiumのみinstallし、失敗時にplaywright-reportとtest-resultsをartifact保存する

禁止事項:
- git checkout、git reset --hard、git add -A、git add .
- ユーザーの既存変更の整形・修正・削除
- note.comのログイン、公開、編集、購入
- secretsの表示
- 全記事E2E
- Firefox/WebKit追加
- visual regression追加
- テストを通すためだけの長いtimeout、sleep、retry増加
- 指示外のsrcリファクタリング
- 自動deploy、push、PR作成

最終報告:
1. 実装結果
2. 変更ファイル
3. テスト結果（コマンドと成否）
4. 未解決事項
5. CIでの実行方法
6. ハンドオフのパス

完了条件を満たせなければ「完了」と言わず、原因と次の一手を報告してください。
```

## モデル分業の意図

| 担当 | 回数 | 用途 |
|---|---:|---|
| Fable | 常駐 | 調査、状態管理、コマンド、統合、最終判断 |
| Opus | 最大1回 | 初版境界とアーキテクチャの批判的レビュー |
| Sonnet実装 | 1回 | Playwright設定、spec、CIの定型実装 |
| Sonnet QA | 1回 | 差分とテスト設計の独立監査 |

Opusへコードを書かせず、Sonnetへ戦略を何度も再考させない。Fableは、シェルやテストで決定できる情報をサブエージェントへ投げない。これにより、深い推論を初回の境界判断へ集中し、実装と定型監査を低コスト側へ寄せる。

