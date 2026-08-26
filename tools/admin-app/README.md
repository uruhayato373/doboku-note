# admin-app — 運営管理ダッシュボード（Next.js 版）

ローカル専用の運営ダッシュボード。**デプロイしない・ビルドしない・dev モード専用**。
旧 zero-dep 版（`tools/admin/`・node:http）は 2026-07-16 に退役し、本アプリへ一本化した。

```bash
npm run admin   # http://127.0.0.1:3021
```

## タブ一覧

| タブ | データソース | 備考 |
|---|---|---|
| 計測概観 / GA4 / GSC / PSI | `.claude/state/metrics/{ga4,gsc,psi}/*.json` | CI がコミットするスナップショットを読むだけ。**ライブ API は叩かない**（会社 PC はプロキシで Google/Meta 遮断・CI 供給が正）。`?snapshot=` で履歴切替、鮮度バッジ（週次 CI・8 日超で赤） |
| エージェント / スキル | `.claude/agents/*.md` / `.claude/skills/**/SKILL.md` | gray-matter で frontmatter パース。役割（Generator/Evaluator）・モデル・tools・カテゴリ |
| ナレッジ | `.claude/knowledge/**/*.{md,json}` | エージェント向けSSOTの人向け読み取り専用ビュー。全文検索・カテゴリ絞り込み・Markdown HTML表示（`lib/markdown.ts` の共有レンダラ＝TODO の詳細展開と同一パイプライン）・JSON整形表示 |
| ドキュメント（`/docs`） | `docs/**/*.md` | 恒久文書（戦略・設計・ロードマップ・レビュー・UI ギャラリー）の**読み取り専用**ビュー。全文検索・分類絞り込み。詳細は本文 HTML ＋ 右レール（目次）で、Markdown が常に SSOT＝**HTML 生成物はファイル保存しない**。編集は VS Code リンクでエディタ側。**`/project` は `/docs` へのリダイレクト**（2026-08-18 の情報アーキテクチャ移行・旧ブックマーク互換）。`content/` へ出ていくチャネル素材（`note`/`sns`/`textbook`/`coconala-blog`）は descriptor の `exclude` で外す |
| コンテンツ（`/content`） | `content/**` ＋ 移行前の `docs/{coconala-blog,sns,note,textbook}`・`content/kindle` | チャネル別制作物の**読み取り専用**ビュー。8,700 ファイル規模なので**初期表示で本文を 1 行も読まない**（`statSync` の件数と bytes だけ）。チャネル → ディレクトリ → 文書の段階的ドリルダウンで、バイナリは名前とサイズのみ（本文として開けない）。旧ルートは「移行前」バッジ付きで、着地点は `scripts/lib/repository-paths.mjs` の `MIGRATION_MAP` から導出する。新旧の両方に同じ着地点があれば**警告し、暗黙にどちらも優先しない** |
| 実装指示書（`/plans`） | `.claude/plans/**/*.md` | 実行中の実装契約の**読み取り専用**ビュー。完了操作・削除ボタンは置かない（完了した plan の削除は実装側の責務） |
| ギャラリー（OGP / 記事図版 / note画像 / SNS） | `content/site/**`, `content/note/**`, `content/sns/**` | 画像は `/media/{posts,sns,note}/...` 経由で配信（traversal ガード + MIME allowlist）。`loading="lazy"` + 資格/種別フィルタ |
| SNS状態板 | `content/sns/{schedule.json, instagram/**/posted.json, x/draft/**/status.json}` | IG 試験別進捗・X ドラフト状況・直近予定。IG 集計は `scripts/ig-status.mjs` を dynamic import して再利用（読み取り専用） |
| スケジュール（`/schedule`） | `scripts/lib/schedule-events.mjs`（collectScheduleEvents）＝ `.claude/config/{exam-calendar.json, x-campaigns/*.json}`, `content/sns/{x/draft, instagram}/**/status.json`, `.claude/state/youtube-schedule.json`, `.claude/todo/backlog.md` を集約 | 予約・計画・期日の横断ビュー（**読み取り専用**・CLI版は `npm run schedule-view`）。日付の真実源は各ソースの原本のまま増やさない。健全性ストリップ（チャネル別件数・読取失敗の明示）→ 月グリッド（月曜始まり・exam は全文ラベル pill・他チャネルは色ドット件数バッジ）→ 日別ドリルダウン（`?d=`）→ 超過一覧（YouTube は月をまたぐ集約1行＝DN-0131）。`?m=YYYY-MM&d=YYYY-MM-DD&ch=x\|instagram\|youtube\|todo\|exam` |
| 記事 / note / マガジン（`/content/{articles,note,magazines}`） | `src/config/doc-meta-index.json`, `content/note/**`, `src/lib/note-magazines.ts` | サイト記事一覧・note 原稿・マガジン（価格/公開）。SoT を二重化せず regex/JSON 読取。note タブの**要再公開**列だけは `check-note-republish --json` を child_process 実行して読む（判定は CLI 側に残す）。**取得に失敗したら空欄ではなく「判定していません」と出す**。note タブは**タイトル 1 行**（クリックで note の公開記事を別タブ）＋レールで資格/価格/状態/**マガジン**を絞る。マガジン絞り込みのキーは frontmatter の生 `noteMagazine`、表示名は `.claude/config/note-magazine-membership.json` 経由で note-magazines.ts の shortTitle へ解決（写像が古びても絞り込みは壊れない）。`noteSeries` は使わない（別語彙＝編集上の系列マーカーで、`noteSeries: 総合案内` は note-lint のもくじ index 例外判定に使われる。200 本で `noteMagazine` と値が食い違う）。マガジンタブの**repo 記事**列は `check-magazine-membership --json` の軸 A をそのまま出す（数え直さない）。記事ラベルから辿れない 16 件が在るので、このタブは note タブのマガジン絞り込みでは代替できない |
| note 公開状態（`/content/note-status`） | `.claude/state/note/{magazines,status}-snapshot.json`, `check-magazine-membership --json` | マガジン収録の**三軸**（repo 実数=frontmatter `noteMagazine` 集計 ↔ SoT の price 件数 ↔ ライブ収録数）と記事別の公開状態。ライブの値は**週次 CI が供給する snapshot を読むだけ**（API は叩かない）。snapshot が無い/腐っている場合は緑にせず「未検査」と出し、行の判定も「一致」ではなく「repo↔SoT のみ」にする |
| 売上 | `.claude/state/sales/sales-log.json` | 月次集計 + inline SVG 棒グラフ（¥15k マイルストーン線） |
| アフィリ | `.claude/state/metrics/affiliate/a8-report-log.json` | A8 成果の月次×プログラム集計＋EPC（確定報酬÷クリック）・日別直近31日。データ供給は `/a8-report`（`a8-ui:fetch` → `a8-ui:normalize`）。未収集時は取得コマンドを案内。`programIdMap` 未写像があれば警告表示 |
| 品質 | `.claude/state/quality/{lint-baseline,history,census}.json`, `src/config/popular-pages.json` | 違反 × 人気の優先度・ルール別・バーンダウン・採点カバレッジ census（読み取り専用） |
| TODO | `.claude/todo/*.md`, `.claude/state/todo-claims.json`, `.claude/plans/**` | **層（バックログ/週間/月間/年間）は左サイドバーの入れ子**＝行き先、**絞り込み（優先度/種類）は右ペイン**＝属性、という分担。カテゴリ軸は 2026-08-18 に廃止。カード本文は `lib/markdown.ts` の共有レンダラ（ナレッジタブと同一）で HTML 表示。**backlog カードは `DN-####` を持ち、`?id=DN-0001` で 1 枚を強調＋アンカー**。monthly/weekly は本文を複製せず ID 参照ビューで、backlog と `backlogIndex()` join してタイトル・優先度・期日を表示（台帳に無い ID は「台帳なし」赤バッジ）。backlog カードには**そのタスクを参照している Project 文書**へのリンクも出る。**状態列**（IN_PROGRESS/THIS_WEEK/THIS_MONTH/PLANNED/BACKLOG＝`deriveStatus()` の導出のみ・新台帳を持たない）・**claim 表示**（`[進行中]` カードの owner と経過時間）・**実装計画リンク**（`.claude/plans/` の unit があれば `/plans/...` へ）・**Claude Code 向け prompt 生成**（カードID・実装契約・検証コマンドを組み立ててコピーのみ、実行はしない）を DN-0093 順5 で追加。read-only・編集はカード見出しの VS Code リンク |

> [!note] 動画コンテンツ管理は未実装
> `DN-0110` で `/content/video` を追加し、動画パック・通常動画・Shorts・IG/X派生・QA・公開・計測をread-onlyでjoinする。現行SNS状態板は `.claude/state/youtube-schedule.json` を動画パック単位では読まない。目標仕様は `docs/marketing/06_動画コンテンツ運用設計.md`、作業契約は `.claude/knowledge/reference/video-content-policy.md` を真実源とする。編集・投稿・任意shell実行UIは追加しない。

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
- **ナビ**: 左サイドバー固定（`Nav.tsx`・6 グループ＝発信/計画/運用/分析/収益/管理）。TODO は計画直下にバックログ/週間/月間/年間を表示し、恒久文書・制作物・実装計画も管理から参照できる。狭い画面では上部バーへ畳む。
- **テーマ**: ライト/ダーク切替（`ThemeToggle.tsx`）。色は全て `globals.css` のトークンで、ダークは `:root[data-theme="dark"]` の 1 経路だけ。初期値（保存値 or OS 設定）は `layout.tsx` の head inline script が描画前に解決する（prefers-color-scheme のメディアクエリは持たない＝パレット二重定義を避けるため）。選択は localStorage `admin-theme`。
- **セキュリティ**: `-H 127.0.0.1` 明示バインド。media route は traversal ガード + MIME allowlist。書き込み操作用の画面・APIは設けず、管理画面は読み取り専用とする。
- **CI 影響ゼロ**: `tools/**` は root の tsconfig / eslint / knip の対象外。型チェックは `npx tsc -p tools/admin-app/tsconfig.json`。
- **テスト**: 型チェックが `tools/**` を見ないため、ロジックは root の `npm test` から tsx 経由で実モジュールを叩いて固定する
  （`tests/admin-document-store.test.mjs` = パス復号・トラバーサル・目次 id・sanitize・archive 除外、
  `tests/backlog-parity.test.mjs` = backlog パーサとの全件突合）。ブラウザ検証は `npm run test:e2e:admin`
  （`playwright.admin.config.ts`・**本体サイトの e2e とは分離**し CI には載せない＝admin は dev 専用でデプロイしないため）。
