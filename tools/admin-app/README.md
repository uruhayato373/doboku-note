# admin-app — 運営管理ダッシュボード（Next.js 版）

「戦略・収益化」→「共通事業方針」(`/strategy/policy`) で、Obsidian vault正本(`memos/共通事業方針SSOT.md`)から配布された共通事業方針・HARMを読み取り専用表示する。全画面共通の表示ではなく、この専用ページだけに置く。入力は `.claude/shared-policy/POLICY.md`（配布物）と `application.json`（個別適用）。起動前に `npm run policy:check`、正本改定後はObsidian vault側で `npm run policy:sync`。エージェントと画面は同じ版を参照し、個別のKPI・商品・優先順位は既存戦略を維持する。

ローカル専用の運営ダッシュボード。**デプロイしない・ビルドしない・dev モード専用**。
旧 zero-dep 版（`tools/admin/`・node:http）は 2026-07-16 に退役し、本アプリへ一本化した。

```bash
npm run admin   # http://127.0.0.1:3021
```

## タブ一覧

| タブ | データソース | 備考 |
|---|---|---|
| 教材 ＞ 教材一覧（`/materials`）・棚ごとの各教材（`/materials?id=`） | `.claude/state/content-expansion.json`・参考文献台帳・成果物実体・note / Kindle 原稿（関連商品の導出） | 教材別の本文・図解・SNS対応、行を開くと判定理由・根拠・確認後の変更、`&only=attention` で要確認だけに絞る（旧 `/content/expansion` は転送）。サイドバーの棚・短い名前は `reference-sources.json` の `shelf`・`shortTitle`。制作と公開・効果を区別。`/materials` は教材ごとの展開状況の一覧、`?id=` は論点ごとの展開先（記事・SNS原稿・関連商品）と展開予定（`backlogIds`）。集計・関連商品は `scripts/lib/content-expansion.mjs`（`sourceSummary`・`linkedProductsByUnit`） |
| 事業方針と改善（`/metrics/business`） | `.claude/config/business-direction.json`・既存計測/売上・`.claude/state/metrics/business/` | 資格別の提供価値とKPI、週次/月次の期日・判断・実験参照。資格に適用しない指標は対象外として欠測へ数えない。計測/目標/レビューを同一OriginのローカルJSONフォームで追記保存。CLIと同じ検証を使用し、Git commitは運用スキルが行う。外部API・公開・任意ファイル編集はしない。 |
| 計測概観 / GA4 / GSC / PSI | `.claude/state/metrics/{ga4,gsc,psi}/*.json` | CI がコミットするスナップショットを読むだけ。**ライブ API は叩かない**（会社 PC はプロキシで Google/Meta 遮断・CI 供給が正）。`?snapshot=` で履歴切替、鮮度バッジ（週次 CI・8 日超で赤） |
| 検索順位の改善（`/metrics/seo-watch`） | `.claude/config/seo-watchwords.json`・`.claude/state/experiments.json`・GSC rank-watchのwatch/run履歴 | 資格別候補、受験意図・登録根拠・学習導線、固定クエリの7日比較、改善/待機理由、観察期限、28日の方針レビュー。同じ判定関数をCLIと共有し、読み取り専用。 |
| エージェント / スキル | `.claude/agents/*.md` / `.claude/skills/**/SKILL.md` | gray-matter で frontmatter パース。役割（Generator/Evaluator）・モデル・tools・カテゴリ |
| ナレッジ | `.claude/knowledge/**/*.{md,json}` | エージェント向けSSOTの人向け読み取り専用ビュー。全文検索・カテゴリ絞り込み・Markdown HTML表示（`lib/markdown.ts` の共有レンダラ＝TODO の詳細展開と同一パイプライン）・JSON整形表示 |
| ドキュメント（`/docs`。左ナビ表示名「方針・設計」） | `docs/**/*.md` | 恒久文書（戦略・設計・ロードマップ・レビュー・UI ギャラリー）の**読み取り専用**ビュー。全文検索に加え、目的（documentType）・対象チャネル（channel）・保持区分（retention）の 3 軸フィルタを独立させて絞り込める（URL query `documentType`/`channel`/`retention` へ保存・復元・DN-0103 Phase 02）。3 軸は `src/lib/doc-taxonomy.ts` が唯一の許可値表と既定推論（先頭ディレクトリ→目的・保持区分）を持ち、frontmatter が無い文書はディレクトリ既定値のまま表示する。frontmatter に許可値外の値があれば `unknown` へ握りつぶさず `taxonomyInvalidFields` として検出し（`tests/admin-doc-taxonomy.test.mjs` が現行 docs 全件で invalid 0 件を固定するゲート）、docs 一覧では `一時記録`（temporary）を警告色でなく専用 badge で区別する。詳細画面はタイトル直下に目的・チャネル・保持区分を小さく表示し、channel が `cross` 以外なら対応するコンテンツチャネル（channel-registry.ts）への read-only リンクを出す（画面が無効な channel は非リンクの chip のみ表示する）。Obsidian callout（`> [!note]` 等・note/tip/important/warning/warn/caution/todo の 7 種 allowlist、warn は warning の別名）は `lib/markdown.ts` の remark プラグインが `<div class="callout callout-{type}">` へ安全に変換し（sanitize schema を callout/table-wrap の class だけ狭く許可・script や `javascript:` URL は従来どおり拒否）、allowlist に無い type（例: 実在する `[!info]`）はマーカー文字列を残したまま通常の blockquote へフォールバックする。GFM table は `<div class="table-wrap">` で個別に横スクロールし、ページ全体を横スクロールさせない。同じ `renderDocument`/`renderMarkdown` を通る TODO カード本文（`.md-prose`）にも同じ callout/table 変換が及ぶ（レンダラは 1 実装のみ・仕様上の意図した副作用）。本文 HTML ＋ 右レール（目次）で、Markdown が常に SSOT＝**HTML 生成物はファイル保存しない**。編集は VS Code リンクでエディタ側。**`/project` は `/docs` へのリダイレクト**（2026-08-18 の情報アーキテクチャ移行・旧ブックマーク互換）。`content/` へ出ていくチャネル素材（`note`/`sns`/`textbook`/`coconala-blog`）は descriptor の `exclude` で外す |
| コンテンツ（`/content`） | `content/**`（site/note/sns/coconala/kindle/sources の物理チャネル） | チャネル別制作物の**読み取り専用**ビュー。8,700 ファイル規模なので**初期表示で本文を 1 行も読まない**（`statSync` の件数と bytes だけ）。チャネル → ディレクトリ → 文書の段階的ドリルダウンで、バイナリは名前とサイズのみ（本文として開けない）。Kindle は専用画面があるため、カードは KPI を先に出し `/content/kindle` へ誘導する（Kindle 管理ビュー新設） |
| コンテンツ ＞ Kindle（`/content/kindle`） | `scripts/kindle-published/catalog.json`（状態/価格/ASIN）・`.claude/state/sales/kdp-royalties.json`（月次ロイヤリティ）・`scripts/kindle-dist/`・`scripts/kindle-specs/` | KDP で販売する Kindle 本 46 冊の**読み取り専用**画面。冊数・status別件数・鮮度 stale 件数・直近月ロイヤリティの KPI、書籍ごとの表紙サムネ（`/media/kindle` 経由）・状態・価格・版・ASIN（live は amazon.co.jp へリンク）・鮮度バッジを表示する。ロイヤリティは共有KDP口座の合計を使わず、catalogに紐付くdoboku-note書籍だけを集計し、口座全体値は参考表示する。判定ロジックは `scripts/lib/kindle-catalog.mjs`（pure module）。鮮度は git log（`--name-only`）で原稿ソース・spec・builder の最終更新日と EPUB の最終更新日を比較する推定で、git 取得に失敗した冊は「不明」のまま緑にしない。A系 7 冊（buildSpec 無し）は再ビルド経路外として区別する。`.claude/config/kdp-memo.json`（accountEmail 等の秘密混じり）は読まない・画面に出さない。再ビルド・提出・状態同期・任意 CLI 実行は無く、それらは `npm run sync-kindle-dist` / `/kdp-publish` / `npm run kdp-report` の担当（画面は案内のみ） |
| 実装指示書（`/plans`） | `.claude/plans/**/*.md` | 実行中の実装契約の**読み取り専用**ビュー。完了操作・削除ボタンは置かない（完了した plan の削除は実装側の責務） |
| ギャラリー（OGP / 記事図版 / note画像 / SNS） | `content/site/**`, `content/note/**`, `content/sns/**` | 画像は `/media/{posts,sns,note}/...` 経由で配信（traversal ガード + MIME allowlist）。`loading="lazy"` + 資格/種別フィルタ |
| キャラクター素材（`/gallery/characters`） | `.claude/config/character-poses.json` | 全ポーズの用途検索・3案比較・全身/腰上/胸上のプレビュー・派生PNG保存・投稿用設定コピー。派生は `/api/character-frame/{pose}` の読み取り専用GETでメモリ上に生成し、ディスク保存や投稿はしない。原画像hash照合・要修正素材の書き出し拒否・拡大禁止はCLIと共有する |
| SNS状態板 | `content/sns/{schedule.json, instagram/**/posted.json, x/draft/**/status.json}` | IG 試験別進捗・X ドラフト状況・直近予定。IG 集計は `scripts/ig-status.mjs` を dynamic import して再利用（読み取り専用） |
| スケジュール（`/schedule`） | `scripts/lib/schedule-events.mjs`（collectScheduleEvents）＝ 12 系統: `.claude/config/{exam-calendar.json, x-campaigns/*.json}`, `content/sns/{x/draft, instagram}/**/status.json`, `.claude/state/youtube-schedule.json`, `.claude/todo/backlog.md`, note 記事 frontmatter（予約・公開日）, `scripts/kindle-published/catalog.json`（提出・公開日）, `src/lib/coconala-services.ts`（出品日）, `.claude/state/video-content-status.json`（動画パックの公開）, `.claude/state/experiments.json`（再計測期限）, `.claude/state/metrics/business/review-*.json`（次回レビュー） | 試験・商品・SNS・開発・経営をまたぐ予定の横断ビュー（**読み取り専用**・CLI版は `npm run schedule-view`）。各予定に領域（`CHANNEL_DOMAIN` が唯一の写像）を付け、`?dom=exam|product|sns|dev|business` と `?ch=` で絞り込む。日付の真実源は各ソースの原本のまま増やさない。健全性ストリップ（チャネル別件数・読取失敗の明示）→ 月グリッド → 日別ドリルダウン（`?d=`）→ 超過一覧。各領域ページ（商品ラインナップ・資格一覧・投稿状況・事業方針と改善）には同じデータから「次の予定」（`UpcomingEvents`）を出す |
| 記事 / note / マガジン（`/content/{articles,note,magazines}`） | `src/config/doc-meta-index.json`, `content/note/**`, `src/lib/note-magazines.ts` | サイト記事一覧・note 原稿・マガジン（価格/公開）。SoT を二重化せず regex/JSON 読取。note タブの**要再公開**列だけは `check-note-republish --json` を child_process 実行して読む（判定は CLI 側に残す）。**取得に失敗したら空欄ではなく「判定していません」と出す**。note タブは**タイトル 1 行**（クリックで note の公開記事を別タブ）＋レールで資格/価格/状態/**マガジン**を絞る。マガジン絞り込みのキーは frontmatter の生 `noteMagazine`、表示名は `.claude/config/note-magazine-membership.json` 経由で note-magazines.ts の shortTitle へ解決（写像が古びても絞り込みは壊れない）。`noteSeries` は使わない（別語彙＝編集上の系列マーカーで、`noteSeries: 総合案内` は note-lint のもくじ index 例外判定に使われる。200 本で `noteMagazine` と値が食い違う）。マガジンタブの**repo 記事**列は `check-magazine-membership --json` の軸 A をそのまま出す（数え直さない）。記事ラベルから辿れない 16 件が在るので、このタブは note タブのマガジン絞り込みでは代替できない |
| note 公開状態（`/content/note-status`） | `.claude/state/note/{magazines,status}-snapshot.json`, `check-magazine-membership --json` | マガジン収録の**三軸**（repo 実数=frontmatter `noteMagazine` 集計 ↔ SoT の price 件数 ↔ ライブ収録数）と記事別の公開状態。ライブの値は**週次 CI が供給する snapshot を読むだけ**（API は叩かない）。snapshot が無い/腐っている場合は緑にせず「未検査」と出し、行の判定も「一致」ではなく「repo↔SoT のみ」にする |
| 売上 | `.claude/state/sales/sales-log.json` | 台帳登録分の月次販売額 + inline SVG 棒グラフ。目標は事業KPIのtarget履歴へ集約（固定¥15k表示は撤去） |
| アフィリ | `.claude/state/metrics/affiliate/a8-report-log.json` | A8 成果の月次×プログラム集計＋EPC（確定報酬÷クリック）・日別直近31日。データ供給は `/a8-report`（`a8-ui:fetch` → `a8-ui:normalize`）。未収集時は取得コマンドを案内。`programIdMap` 未写像があれば警告表示 |
| 品質 | `.claude/state/quality/{lint-baseline,history,census}.json`, `src/config/popular-pages.json` | 違反 × 人気の優先度・ルール別・バーンダウン・採点カバレッジ census（読み取り専用） |
| TODO | `.claude/todo/*.md`, `.claude/state/todo-claims.json`, `.claude/plans/**` | **層（バックログ/週間/月間/年間）は左サイドバーの入れ子**＝行き先、**絞り込み（優先度/種類）は右ペイン**＝属性、という分担。カテゴリ軸は 2026-08-18 に廃止。カード本文は `lib/markdown.ts` の共有レンダラ（ナレッジタブと同一）で HTML 表示。**backlog カードは `DN-####` を持ち、`?id=DN-0001` で 1 枚を強調＋アンカー**。monthly/weekly は本文を複製せず ID 参照ビューで、backlog と `backlogIndex()` join してタイトル・優先度・期日を表示（台帳に無い ID は「台帳なし」赤バッジ）。backlog カードには**そのタスクを参照している Project 文書**へのリンクも出る。**状態列**（IN_PROGRESS/THIS_WEEK/THIS_MONTH/PLANNED/BACKLOG＝`deriveStatus()` の導出のみ・新台帳を持たない）・**claim 表示**（`[進行中]` カードの owner と経過時間）・**実装計画リンク**（`.claude/plans/` の unit があれば `/plans/...` へ）・**Claude Code 向け prompt 生成**（カードID・実装契約・検証コマンドを組み立ててコピーのみ、実行はしない）を DN-0093 順5 で追加。read-only・編集はカード見出しの VS Code リンク |

| コンテンツ ＞ ライフサイクル（`/content/lifecycle`） | 各チャネルの既存 SoT（`src/config/doc-meta-index.json`＋`git grep`／`content/note`／`note-magazines.ts`／`content/sns/instagram`・`x`／`youtube-schedule.json`／`coconala-services.ts`／`kindle-published/catalog.json`／`video-content-status.json`） | 全チャネルを**企画 → 下書き → レビュー → 予約 → 公開 → 停止**の共通ステージへ写像して横断集計する**読み取り専用**画面。ステージ語彙と写像は `scripts/lib/content-lifecycle.mjs`（唯一の実装・`tests/content-lifecycle.test.mjs` が実在するネイティブ値を全て写像できることを固定）で、admin 側 `lib/lifecycle.ts` は読んで数えるだけ。**各チャネルのネイティブ状態は書き換えず、第2の状態台帳を作らない**。取得できなかったチャネルは 0 件でなく「未取得」＋理由を出す（0 と検査不成立を同じ緑にしない）。写像できない値は `unknown` として赤で可視化する。真実源は `.claude/knowledge/reference/content-lifecycle.md` |
| 戦略・収益化 ＞ 資格一覧（`/strategy/qualifications`） | `.claude/config/qualification-registry.json`（資格の一覧・分類・展開状態 active/candidate/declined）＋ `exam-calendar.json`（日程）＋ `exam-stats.json`（受験者数） | 人が見る画面として、フラットな 1 表で「資格・状態・試験日・合格発表・受験者数・合格率」だけを出す**読み取り専用**画面。資格名・受験者数の列見出しで並べ替える（`?sort=name|examinees&dir=asc|desc`。受験者数は区分のうち最も多い値で比べ、無い資格は末尾）。区分（一次・二次など）ごとに日程と統計を 1 行に揃え、過ぎた日付は薄く出す。技術士第二次の総監以外の部門は日程が共通なので 1 行にまとめ、受験者数・合格率は部門別表の 20 部門合計を出す（正本は部門ごとのまま）。出典・照合記録・未確認の理由は画面に出さず、正本と `npm run exam-ssot-status`（月次レビュー）が持つ。正本の不整合（`scripts/lib/qualification-registry.mjs`・`check-exam-calendar` と同じ判定）があるときだけ警告を出す |
| 戦略・収益化 ＞ 商品ラインナップ（`/content/lineup`） | `.claude/config/product-lineup.json`（資格×試験区分の定義・id→マスの分類ルール・アプリ/PWA の手動台帳）＋ `note-magazines.ts`／`coconala-services.ts`／`kindle-published/catalog.json` | 2 段構成の**読み取り専用**画面。一覧は「資格 × 試験区分 × チャネル」の販売中件数（0 件は「未展開」、販売中以外は「準備中 n」）だけで空きを見せ、資格名から `?q=<資格id>` の詳細（その資格の商品を表紙サムネ・価格・状態つきで全件）へ進む。試験日・受験者数は資格一覧（`/strategy/qualifications`）が扱う。分類は `scripts/lib/product-lineup.mjs`（`tests/product-lineup.test.mjs`）、未分類は赤表示、読めなかったチャネルは「未検査」。停止中は既定で隠し `?retired=1` で表示 |
| コンテンツ ＞ YouTube ＞ 動画パック（`/content/video`） | `content/sns/video-packs/**/video-pack.json`＋`.claude/state/video-content-status.json` | 動画パック（DN-0110）の企画ボード。企画のみ（manifest だけ）から公開までを段階バッジ付きで一覧し、資格・段階で絞り込む**読み取り専用**画面。行の組み立ては `scripts/lib/video-content-check.mjs` の `loadPackSummaries` が唯一の実装で、CLI の `build-video-pack-index`（`content/sns/video-packs/README.md` 生成）と共有する。台本・構成の有無、独立 QA の平均点と BLOCK 数、主 CTA のカタログ id を表示し、行からパックのファイルビューと `script.md` へドリルダウンする。生成・レンダリング・投稿の UI は持たない（`npm run render-longform` と `/video-content` の担当） |

| 分析 ＞ 動画成果（`/metrics/video`） | `content/sns/video-packs/**`＋`.claude/state/video-content-status.json`＋`.claude/state/metrics/ga4/ga4-campaign-*.json`（CI 供給） | 動画パックの**公開状態 × 送客**を `utm_campaign = packId` で join する**読み取り専用**画面。派生物（通常動画/Shorts/IG/X）ごとの status・videoId、公開済み Short の関連動画欠落、パック別のセッション/ユーザーを表示する。計測は CI 供給が正（会社 PC からライブ API を叩かない）で、**スナップショット未取得は 0 でなく「未取得」＋理由**を出し送客ゼロと区別する。パックに紐づかない campaign（note・X 等の既存 UTM）は取り違え防止のため別表に併記。配線（fetcher の dimension・workflow ステップ・出力名と読み取り prefix の一致）は `tests/video-outcomes-wiring.test.mjs` が固定 |

> [!note] Shorts 台帳と動画パックは別系統
> `/sns` の「動画パック 派生物」節は `video-content-status.json` の派生物だけを出し、`.claude/state/youtube-schedule.json`（IG 過去問パック由来のレガシー 200 本・item に packId を持たない）とは表を分ける。混ぜると「動画パックの Shorts が 200 本ある」と誤読する。残る未実装は派生物ごとの公開実体の自動照合。目標仕様は `docs/marketing/06_動画コンテンツ運用設計.md`、作業契約は `.claude/knowledge/reference/video-content-policy.md` を真実源とする。編集・投稿・任意shell実行UIは追加しない。

## ルート allowlist

閲覧できるディレクトリは `src/lib/document-roots.ts` の `ROOTS` に列挙した descriptor だけ。
画面側はパスを組み立てず、root 外の参照は `document-store.ts` の prefix 検査＋ realpath 検査
（symlink 経由の脱出も拒否）と catch-all セグメントの復号を**1 箇所に閉じて**弾く。

| ルート | 物理パス | 移行期間の fallback |
|---|---|---|
| `/docs` | `docs/` | なし（恒久文書は Phase 4 で `docs/` 内を改名済み） |
| `/content` | `content/` | `content/coconala/blog` / `content/sns` / `content/note` / `content/sources/textbook` / `content/kindle` |
| `/knowledge` | `.claude/knowledge/` | なし |
| `/todo` | `.claude/todo/` | なし |
| `/plans` | `.claude/plans/` | なし |

fallback は移行が済むまでの暫定で、**Phase 11 で削除する**。契約は
`tests/admin-document-store.test.mjs` が固定する（ルート集合・二重 SSOT 警告・トラバーサル・
symlink・バイナリを本文として読まないこと・`MIGRATION_MAP` との着地点一致）。

## 設計方針

- **配置**: `tools/admin-app/`。ルートの `package.json` 依存（next / react）を再利用し、新規 `node_modules` を作らない（`next dev tools/admin-app` のディレクトリ引数）。`turbopack.root` = リポジトリルート。
- **アーキテクチャ**: RSC ファースト（全ページ Server Component が fs を直接読む）。HTTP セマンティクスが要る画像配信のみ Route handler（`src/app/media/[root]/[...path]/route.ts`）。投稿・予約などの書き込み操作は管理画面に持たせず、エージェント／スキル／CLIから実行する。
- **文書ビューの共通化**: ナレッジ／プロジェクトは `src/lib/document-store.ts` の 1 実装（列挙・検索テキスト・安全な詳細読込）を通す。パストラバーサル検査（prefix ＋ **realpath** で symlink 経由の root 外を弾く）と、catch-all セグメントの復号もここだけが持つ。Markdown → HTML と見出し目次は `lib/markdown.ts` の `renderDocument` が**同一 AST から**返すので、目次と本文の id がずれない。
- **パス解決**: `src/lib/repo-root.ts` の `findRepoRoot()`（`process.cwd()` から `package.json` name=doboku-note を上方探索）。バンドル下で不安定な `import.meta.url` は使わない。
- **チャート**: 依存追加なしのサーバーレンダー inline SVG（`src/components/charts/` の LineChart / BarChart）。
- **スタイル**: Tailwind CSS v3 + shadcn/ui 互換トークン/プリミティブ。管理画面専用 `tailwind.config.cjs` を `globals.css` の `@config` で明示し、サイト本体の Tailwind 設定と分離する。既存の集計ビュー固有スタイルは同 CSS に残す。
- **ナビ**: 左サイドバー固定（`Nav.tsx`・領域の 6 グループ＝戦略/商品/サイト/SNS/計画/管理。2026-09-26 に作業の種類別から領域別へ並べ替え、URL は不変）。チャネルは領域に置く（商品＝note・ココナラ・Kindle、サイト＝サイト、SNS＝X・Instagram・YouTube）。横断の時間軸であるスケジュールは計画、チャネル横断の点検（ライフサイクル・`すべて`＝`/content`）は管理。チャネル定義（label・route・タブ）は `src/lib/channel-registry.ts` が唯一の SSOT（fs を持たない純粋モジュール・Nav とサーバー側の双方から import する）。TODO は計画直下にバックログ/週間/月間/年間を表示し、恒久文書・実装計画も管理から参照できる。狭い画面では上部バーへ畳む。
- **テーマ**: ライト/ダーク切替（`ThemeToggle.tsx`）。色は全て `globals.css` のトークンで、ダークは `:root[data-theme="dark"]` の 1 経路だけ。初期値（保存値 or OS 設定）は `layout.tsx` の head inline script が描画前に解決する（prefers-color-scheme のメディアクエリは持たない＝パレット二重定義を避けるため）。選択は localStorage `admin-theme`。
- **セキュリティ**: `-H 127.0.0.1` 明示バインド。media route は traversal ガード + MIME allowlist。書き込み操作用の画面・APIは設けず、管理画面は読み取り専用とする。
- **依存解析**: rootのKnip解析はadminを対象外としているため、`src/lib/markdown.ts`で直接使う`hast-util-sanitize`を`knip.json`の`ignoreDependencies`へ明示する（未使用ではない）。
- **CI 影響ゼロ**: `tools/**` は root の tsconfig / eslint / knip の対象外。型チェックは `npx tsc -p tools/admin-app/tsconfig.json`。
- **テスト**: 型チェックが `tools/**` を見ないため、ロジックは root の `npm test` から tsx 経由で実モジュールを叩いて固定する
  （`tests/admin-document-store.test.mjs` = パス復号・トラバーサル・目次 id・sanitize・archive 除外、
  `tests/backlog-parity.test.mjs` = backlog パーサとの全件突合）。ブラウザ検証は `npm run test:e2e:admin`
  （`playwright.admin.config.ts`・**本体サイトの e2e とは分離**し CI には載せない＝admin は dev 専用でデプロイしないため）。
