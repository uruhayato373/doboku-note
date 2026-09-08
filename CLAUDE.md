# doboku-note - 土木・建設系試験対策ハブ

土木・建設系の実務資格受験者向け試験対策サイト。1級土木施工管理技士と技術士（総合技術監理部門）を中心に整備中。Next.js + MDX + Cloudflare Pages で構築。

## プロジェクトコンテキスト

**設計思想** — ユーザーが「ここだけで合格できる」体験を資格ごとに提供する試験対策ハブ。Obsidian（ステージング）→ doboku-note（プロダクション）→ PWA 過去問演習アプリ（資格別 PWA × 共通エンジン）の流れでコンテンツを管理。収益モデルは note 有料記事 + YouTube + PWA 過去問アプリ。詳細: `docs/strategy/02_設計思想.md`、`docs/strategy/03_事業戦略.md`、`docs/products/06_PWA過去問アプリ設計方針.md`

**技術スタック** — Next.js 16 + next-mdx-remote / JavaScript (ESM) + MDX / 数式は KaTeX（remark-math + rehype-katex）/ 図表は SVG・PNG を R2（`storage.doboku-note.com`）から配信 / 検索は Pagefind（ビルド時 `out/pagefind`）/ GA4（gtag: G-8VXJ1RL1HG）/ ホスティング Cloudflare Pages。**デプロイ**は `main` push で GitHub Actions が自動実行、`develop` → `main` は `/deploy` スキル経由でユーザーが判断する

**ディレクトリ**

```
content/site/                # サイト記事 MDX（civil-construction-1/ は Convention A: 個別ファイル名、pe-comprehensive-management/ は Convention B: article.mdx）
content/{note,sns,kindle,coconala,brain,sources}/  # チャネル別の制作物と入力（kindle は非公開原稿・Git 管理・Web 配信外）
src/                         # コンポーネント・CSS・レイアウト
docs/                        # 人が読む恒久文書（strategy / editorial / marketing / operations / products / design）
.claude/rules/               # パス条件付きルール（paths: 必須。該当ファイルを Read/Edit したときだけ読み込まれる）
.claude/knowledge/reference/ # 作業マニュアル（全索引は同ディレクトリの README.md）
.claude/todo/                # タスク台帳 4 層（backlog/weekly/monthly/annual・閲覧は admin /todo）
.claude/skills/ .claude/agents/  # スキル・サブエージェント定義（件数の SSOT は各 registry）
scripts/ tools/admin-app/    # 検査・自動化スクリプト／運営管理画面（ローカル専用・npm run admin）
```

**URL**: 公開 URL は検索意図別に `/exam/`（資格試験）・`/practice/`（土木施工実務）・`/standards/`（共通仕様書・実務参考資料）・`/topics/`（横断トピック）へ分割する。旧 `/docs/*` は対応する正規 URL へ 1 対 1 で恒久転送。詳細 → [05_情報アーキテクチャ.md](docs/strategy/05_情報アーキテクチャ.md)

**頻用コマンド**（全一覧と各コマンドの罠 → [commands.md](.claude/knowledge/reference/commands.md)）

```bash
npm run dev               # 開発サーバー（ポート 3020）
npm run build             # 本番ビルド
npm run serve             # out/ をローカル配信（3025・E2E の既定ターゲット・要 build）
npm run type-check        # TypeScript チェック
npm run lint              # ESLint（no-console: warn/error のみ許容）
npm run test              # node --test tests/*.test.mjs
npm run refresh-indexes   # MDX 変更後の静的インデックス再生成
npm run quality:audit     # 機械検査を横断実行（:ci は CI gate 版）
npm run admin             # 運営管理画面（http://127.0.0.1:3021）
npm run sync-codex-compat # CLAUDE.md + .claude/rules + skills → AGENTS.md / .agents を再生成
npm run check-doc-refs    # doc 参照の実在（pre-commit でも staged を検査）
npm run check-command-guidance # 案内している npm run / node パスの実在
npm run check-claude-md-size   # CLAUDE.md ≤150 行・rules の paths: 必須
```

## リファレンス索引

詳細・手順は都度 Read する。**全索引 → [reference/README.md](.claude/knowledge/reference/README.md)**、docs の領域 → [docs/README.md](docs/README.md)。領域別の規約は `.claude/rules/*.md`（content-site / content-channels / assets-images / code / skills-agents / todo-plans / docs / operations）が該当ファイルを開いたとき自動で載る。

| 参照先 | いつ読むか |
|---|---|
| [content-authoring.md](.claude/knowledge/reference/content-authoring.md) | MDX を書く・編集するとき（コンポーネント・過去問構造・frontmatter テンプレ） |
| [content-principles.md](.claude/knowledge/reference/content-principles.md) | キーワードページ・ガイドの執筆と評価（ExamPoint 個数・Callout 12 種） |
| [design-system.md](.claude/knowledge/design-system/design-system.md) | コンポーネント作成・ページ改修・SVG 図版・色選定 |
| [image-policy.md](.claude/knowledge/reference/image-policy.md) | 図/写真を追加・置換するとき |
| [asset-storage-policy.md](.claude/knowledge/reference/asset-storage-policy.md) | アセットの置き場（public R2 / private R2 / Drive vault）に迷ったとき |
| [information-architecture.md](.claude/knowledge/reference/information-architecture.md) | 情報の置き場（4 領域）・SSOT 参照規律・handoff ライフサイクル |
| [skills-guide.md](.claude/knowledge/reference/skills-guide.md) / [agents-registry.md](.claude/knowledge/reference/agents-registry.md) | 使えるスキルを探す／サブエージェントの担当範囲・model |
| [workflows.md](.claude/knowledge/reference/workflows.md) | 週次 PDCA・PDF→MDX 変換フロー・ブランチ/並行セッション運用 |
| [measurement-incidents.md](.claude/knowledge/reference/measurement-incidents.md) | 計測データの異常・外部検証の罠・ローカルで API を叩く前 |
| [tools/admin-app/README.md](tools/admin-app/README.md) / `.claude/config/` | 管理画面の起動・改修／OGP・PSI・自動化ツールのルール・閾値 |
| [docs/strategy/README.md](docs/strategy/README.md) / `content/note/README.md` | 戦略の入口／note 記事 SSOT 索引（実価格は `src/lib/note-magazines.ts`） |

## 12 原則
> Karpathy's LLM coding habits — distilled for this project.

### 1. コードを書く前に考える
- **作業開始前に `git branch --show-current` でブランチ確認**。指示と異なれば作業を止めてユーザーに報告する（勝手に `git checkout` しない）
- **同時に origin との遅れを確認**: `git fetch -q && git log --oneline main..origin/main | head`。複数セッション・worktree 常態＋CI が deploy で main に自動マージするため数十コミット遅れは高頻度。遅れていれば同期してから着手し、**古いベース上のコミットを push しない**（破壊的な reset/同期はユーザー確認後。SessionStart フック `scripts/check-git-sync.mjs` が警告する。経緯 → workflows.md「ブランチ・並行セッション運用」）
- **確認を挟むのは、解釈の違いで成果物が大きく変わるときだけ**（候補を提示して選ばせる）。それ以外は自分で決めて最後まで進める。依頼に誤りがありそう・もっと良い方法があるときは一言だけ指摘してから、依頼どおりに実行する（勝手に範囲を狭めない・広げない・別のものに変えない）

### 2. シンプルさを最優先する
- 依頼されていない機能・抽象化・エラーハンドリングを足さない
- **記事規約**: 絵文字禁止（`<Callout>` で表現）・数式は KaTeX 一択・表は 2 軸比較のみ 4 列以上禁止・見出しは H2 以下（詳細は `content/site/**` を開くと content-site ルールが載る）
- **ブランチ**: doc・コンテンツは `develop` 直 push で蓄積（「1 修正 = 1 PR」禁止）。コード系のみ feature ブランチ + PR（base = `develop`）

### 3. 外科的に変更する
- 触るべき箇所だけ触る。頼まれていない周辺コード・コメントを「改善」しない
- **MDX 書き込みは `lib/mdx-io.mjs` の `writeMdxFile` 経由**（なぜ: 直接 `writeFileSync` は CRLF 混在を引き起こし pre-commit で reject される）
- **`git add` は変更したファイルだけ明示指定**（`git add -A` / `git add .` 禁止 — 並行エージェントの変更を巻き込む）
- コンテンツ編集: 1 記事の修正が完了したら**即 commit**。一時ファイルは `.tmp/` 配下に出す

### 4. ゴール駆動で実行する
- タスク着手前に「何が通れば完了か」を定義してから始める
- **UI/SSR 変更**: `curl` で `<main>` + 主要キーワード（土木/技術士）を確認（なぜ: Lighthouse は SSR 破壊を捕捉できない・measurement-incidents.md 2026-W16）
- **deploy 後**: `npm run check-production-ssr` を実行し、exit 0 のときだけ「完了」と報告する。exit 1 は本番異常、exit 2 は検査不成立として別経路で切り分ける（手打ち curl で代用しない）
- **コンテンツ編集完了条件**: MDX 追加・変更後は `npm run refresh-indexes` を実行してからコミット
- **アセットの置き場は誰が使うかで決める**（サイトが配信→public R2／CI→private R2／人・手元だけ→Google Drive vault。迷ったら `/asset-route`）。画像追加・削除・OGP 供給の手順は `**/img/**` を開くと assets-images ルールが載る

### 5. モデルは判断が必要な場面だけに使う（＝ハーネス設計原則）
> 他ドキュメントから「CLAUDE.md『ハーネス設計原則』」として参照されるのはこの §5。
- **サブエージェント**: `model: sonnet` 既定。Opus は親エージェントのみ（per-agent 一覧 → agents-registry.md）
- **同時起動は原則 3 体まで**・Workflow の並行は 2 本まで。超える規模は分割して順に回す
- **worktree は複数セッションが並行するときだけ**（§10）。単一セッションでは作らない
- ルーティング・リトライ・ステータスコード処理など、コードで決定できるものはサブエージェントに委ねない
- **委任基準**: 「大きく・独立・並列化できる」作業のみ。数回のツールコールで終わる作業・自分のインライン作業の検証だけのための起動はしない（商品品質の `*-writer`↔`*-qa` 分離パイプラインは別物・維持）
- **モデル／reasoning／fork 範囲は実行時の能力**。プロバイダ固有のルーティング SSOT をリポジトリへ作らない。委任には必要最小限の直近コンテキストまたは `fork_turns: none`

### 6. トークン予算を守る
- 長時間作業の区切りに `/compact` を提案。セッション引き継ぎは `docs/handoffs/YYYY-MM-DD-{context}.md`（抽出→削除の運用は todo-plans ルール）
- **応答は簡潔に**: 前置き・但し書きは最小限。着手前に一文で宣言 → 作業中の報告は重要な発見・方針転換のときだけ → 完了時は結論から
- **書き出すドキュメント**は必要な長さに収める。埋めるための章・同内容の反復・定型の前置きで水増ししない

### 7. 矛盾するパターンを混ぜない
- **Convention A/B の共存**: 新規コンテンツは B（`article.mdx`）推奨。既存ファイルの方式を勝手に変換しない
- **UI コンポーネント**: デザイントークン（`rounded-card-*` / `shadow-card-*`）・`dark:border-*` 必須・色は `--color-*`（真実源 `src/styles/globals.css`）。詳細は `src/**` を開くと code ルールが載る
- コードベース内に複数の書き方がある場合、平均化せず、どちらを採用するか明示してから書く。同じ判定を複数箇所に実装しない（lib に集約）

### 8. 書く前に読む
- **提案・推奨の前に現物を確認する**: 「〜が無い／されていない」と断定する前に実物（`article.md`・frontmatter・既存 CTA・`note-magazines.ts`・公開状態）を Read し **file:line で裏取り**する。売上・計測データは「何が」起きたかは示すが「なぜ」は示さない。裏取りできないなら「未確認」と明示
- **情報の置き場（4 領域）**: `docs/`＝人が読む恒久判断／`content/`＝制作物とその入力／`.claude/`＝エージェント運用（knowledge・rules・plans・todo・state・config・skills・agents）／`src/ tools/ scripts/`＝実装。タスクは `.claude/todo/backlog.md`（ID `DN-####`）、**GitHub Issue は使わない**。判断フロー → information-architecture.md
- **SSOT 参照規律**: doc を移動・改名・統廃合したら参照を同一 commit で全更新（`check-doc-refs` / `check-relative-links` が止める）。スキル・エージェントの変更は同一 commit で registry を更新（`check-doc-coupling`）
- **ドキュメント同期**: `src/** scripts/** .claude/skills/** .claude/agents/** package.json` 等を変更したタスクは**コミット前に `/doc-sync` を 1 回回す**。純コンテンツ編集では回さない
- MDX を追加・編集する前に content-authoring.md を Read する。`/schedule` で定期エージェントを作る前に `/routines` で重複・cron 衝突を確認する

### 9. テストは挙動だけでなく意図を検証する
- **汎用の検証指示を足さない**: 「必ず最後に検証」「ダブルチェック」「サブエージェントで検証させる」は自律検証と重複して過剰検証になる。書いてよい検証は**決定的ゲートだけ**＝実行するコマンドと合格条件が特定できるもの（`curl` で `<main>`、`refresh-indexes`、`check-*` スクリプト）
- **検査ゼロを PASS と呼ばない**: 「異常 0 件」と「1 件も検査していない」は同じ緑に見える。書くときは検査対象数と実検査数を出力し、取得失敗が支配的なら exit 1（検査不成立）。実行系も「対象 0 件」と「全部失敗」を区別する。読むときは緑を見たら「何件検査したか」を確認する（2026-07-28 に 5 スクリプトが同時に偽 PASS だった。実装側の規約は code ルール・経緯は measurement-incidents.md）
- **赤いのに誰も見ていない検査は無いのと同じ**: `ci:false`（report）の検査は誰がいつ読むかを決める。読む人がいなければ `ci:true` にするか作らない。週次・月次が読むデータを生成するスクリプトは実行可能性を CI で担保する

### 10. 重要なステップごとにチェックポイントを置く
- **複数セッションは worktree で分離する（最重要）**: 別セッションと同じ作業ツリーを共有すると、相手の `git reset --hard`／`checkout` が未 push コミットを丸ごと壊す（2026-06-11 実証・gc 復旧不能）。`git worktree add <dir> -b <feature> origin/develop` で HEAD/index/作業ツリーを分け、`develop` へは PR で集約する
- **同一ワークツリーで並行せざるを得ないとき**: push 前に `git log origin/develop..HEAD` で巻き込み確認。commit は `git commit -- <pathspec>`。他テリトリ不可侵。重要な変更は feature ブランチへ即 push して保全。`git stash` は共有スタックを他セッションが pop するので使わない
- **並行エージェント（同一セッション内）**: 各エージェントが編集したファイルを即 commit（`git status` で staged 確認）

### 11. コードベースの規約に合わせる
- **frontmatter 必須**: `title` / `seoTitle` / `description` / `category` / `tags` / `published`
- MDX 書き込み後は `U+FFFD`（`﹖`）で文字化けチェック
- 既存コードの命名規則・ファイル構成・設計思想を優先する。自分の好みで変えない
- docs/ の `.md` は Obsidian callout 運用（docs-markdown-style.md）。`docs/**` を開くと docs ルールが載る

### 12. 失敗や不確実性を隠さない
- 未検証の部分やスキップした処理がある場合は「完了」と言わずに明示する
- **deploy 後 500** は Cloudflare API token 期限切れを仮説 1 番に確認（GitHub Secrets で再発行）
- 計測データに異常がある場合は measurement-incidents.md を先に確認してから結論を出す
- **自分の失敗の後処理**: 自分の誤り（誤読・誤操作・偽の完了報告）に気づいたら (1) 同一セッション内で自分で修正する（ユーザーへ差し戻さない）(2) 原因を正典へ記録する（外部検証・CLI の罠→measurement-incidents.md／作業規律→memory の feedback）(3) **実行するコマンドと合格条件が特定できるときだけ**機械ゲート化する（§9。回帰テスト付き。特定できないものは記録まで）

<tone_preference>出力は簡潔に。実況は重要な発見・方針転換のときだけ。書き出すドキュメントは水増ししない。</tone_preference>

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
