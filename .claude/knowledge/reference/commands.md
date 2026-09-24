---
title: 頻用コマンド一覧
---

# 頻用コマンド一覧

CLAUDE.md の「頻用コマンド」表から 2026-09-08 に移設した全一覧（CLAUDE.md には日常の最小限だけ残す）。各行の括弧書きは「なぜそのコマンドを使うか／使うときの罠」で、`check-command-guidance` がこのファイルの `npm run X` を package.json と突合する（案内はあるが実在しないコマンドを止める）。新しい script を package.json に足したら、ここへ用途別に 1 行追加する。

## 開発・ビルド・横断品質

```bash
npm run dev               # 開発サーバー（ポート 3020）
npm run build             # 本番ビルド
npm run serve             # out/ をローカル配信（既定 3025・`_redirects` の 301 も適用）。**E2E の既定ターゲット**でもある（dev だとルートの初回コンパイルでテストが実行ごとにランダムに落ち、旧 /category/ /docs/ は dev に存在せず検査できない）。要 `npm run build`
npm run type-check        # TypeScript チェック
npm run lint              # ESLint チェック（no-console: warn/error のみ許容）
npm run quality:audit     # コード・記事・画像/SVGの機械チェックを横断実行→.claude/state/quality/audit-latest.md（:ci でCI gate厳格版。GitHub Actionsでは失敗名と要点を検査結果の注釈にも出す。:ops で運用アラート区分〔ops:true＝配信・転記の遅れ〕だけ実行＝ops-audit.yml が日次で回し automation-failure Issue channel ops へ。--ci/--report-only/--ops は排他・0 件実行は exit 2）
npm run refresh-indexes   # 静的インデックス再生成（backlinks + cross-exam + tags + pillar問題 + popular記事[GA4] + 頻出論点）
npm run admin             # 運営管理画面 Next.js 版（ローカル専用・http://127.0.0.1:3021・計測/エージェント/スキル/ギャラリー/SNS状態/記事/売上/品質/ジョブ/TODO/**プロジェクト**/**ライフサイクル横断 `/content/lifecycle`**/**動画パック `/content/video`**・tools/admin-app）
npm run test:e2e:admin    # 管理画面の E2E（Project↔TODO の相互リンク・日本語パス・トラバーサル404・レスポンシブ。admin は dev 専用なので CI の e2e には載せない）
npm run check-career-separation:built  # 学習系ナビ（data-nav-list="exam-guide"）に career 記事が混ざっていないかを out/ の HTML で見る。**要 `npm run build`** で ci.yml の build 後に置く。走査先は out/{exam,practice,standards,topics}（2026-09 の URL 分割前は out/docs だった）。ナビ一覧 0 箇所は検査不成立＝exit 1
npm run check-e2e-targets      # E2E が叩くサイト内 URL が out/ に実在するか（`_redirects` の転送元を叩くと dev で必ず 404 になり、検査が成立しないまま赤が放置される）。**要 `npm run build`** なので quality:audit ではなく ci.yml / e2e.yml の build 後に置く。exit 2=検査不成立
npm run check-production-ssr # deploy 後の本番 SSR 検証（exit 0=正常 / 1=壊れている / **2=検査不成立＝接続できていない**。会社PCの HTTP 000／プロキシのブロック HTML をサイト障害と誤読しない・手打ち curl で代用しない）。/deploy と cloudflare-deploy.yml の公開後に実行。社内回線から接続できない場合は同workflowの verify_only=true で再デプロイせず外部検査。
npm run check-production-sweep # 本番 sitemap 全 URL を実際に叩く（200・自己 canonical・<main>・noindex 無し・og:image 200・セキュリティヘッダ）。deploy 後と日曜に CI（production-sweep.yml）が自動。手元は `-- --sample 50`。exit 1=本番異常 / 2=検査不成立
npm run test:e2e:a11y        # axe（WCAG 2.1 A/AA）を代表 8 ページ×light/dark で実行。critical 0 かつ serious が e2e/a11y-baseline.json を超えないことがゲート。基準更新は :baseline（修正を確認してから・減らす方向のみ）
npm run check-command-guidance # 検査やスクリプトが案内するコマンド（npm run / node パス）が実在するか。**正典ドキュメント（CLAUDE.md / AGENTS.md / この一覧 / .claude/rules）の案内も対象**（記載はあるが package.json に無い `npm run serve` を 2026-08-30 まで放置していた再発防止）
npm run schedule-view     # 予約・計画・期日の横断ビュー（読み取り専用・JST。exam-calendar/x-campaigns/x-status/ig-status/youtube-schedule/backlogを集約。DN-0131のような超過を横断で surface する）
```

## 記事・MDX の検査

```bash
npm run check-mdx-dates      # 記事の created/dateModified が frontmatter に揃っているか（sitemap lastmod と JSON-LD datePublished の真実源。欠けるとビルドが git 履歴へフォールバックし、公開 SEO 信号がリネームや履歴書換えで動く状態へ逆戻りする。書き込みは pre-commit の backfill-mdx-dates --staged）
npm run check-bold-rendering # 太字が実際に描画されるか（remark で実パースし text に ** が残る＝崩壊を検出・サイト MDX と note 記事が対象・quality:audit に同梱）
npm run check-note-duplicate-images # note 記事で同じ画像を 2 回使っていないか（2 枚目は CDN 確定せず全文更新が中断する・pre-commit の note-lint 規則 10 と同じ判定・quality:audit ci）
npm run fix-bold-rendering   # 上の崩壊のうち機械的に安全な形だけ修正（dry-run 既定・--commit で適用）
npm run check-table-rendering # GFM テーブルが実際に table になるか（remark 実パースでデリミタ行が text に残る＝生パイプ表示を検出。原因〔改行 \r\r\n 破損／ヘッダとデリミタのセル数不一致〕を問わず症状で拾う・pre-commit --staged ＋ quality:audit）
npm run check-table-references # 本文が指す「表N.M」のキャプションが実在するか（転記由来の宙に浮いた参照）
npm run check-published-vs-redirects # 統合済み記事の再公開を止める（published:true なのに `_redirects` で 301 の転送元＝ページは在るのに別ページへ飛ぶ。統合の記録は frontmatter に無く _redirects にしかないので目視では気づけない。pre-commit --staged ＋ quality:audit）
npm run check-ogp-line-count   # OGP タイトルが何行に折れるかを実測（既定は surfacer で判定しない。`--max=N` / `check-ogp-line-count:done` で完了判定になる。check-ogp-title-fit はフォントサイズしか見ない）
npm run check-keiken-answer-split # 施工経験記述の解答欄の割り振りが級と合っているか（1級=(1)に検討項目/(2)対応処置・評価、2級=(1)課題/(2)検討項目と対応処置。2級式を1級教材へ使うと(2)に3要素が乗り1区画約200字に収まらない。**note 原稿だけでなく退避される模試の生成 markdown も走査**）
npm run check-content-layout   # content/ の 6 チャネルに実体があるかを観測（件数・容量。空チャネル＝移行の取りこぼしで fail）
npm run check-internal-links-vs-gsc # 公開ページが GSC 404/リダイレクト URL を指していないか（旧URL件数を減らす唯一のレバー）
```

## 画像・アセット・R2・Google Drive

```bash
npm run generate-webp     # png/jpg → webp 変換
npm run upload-images-r2  # 画像を R2 にアップロード
npm run audit-repo-assets    # リポジトリ肥大化の read-only 監査（ワークツリー/HEAD/pack の3指標を分けて計測→KEEP_GIT/R2_PUBLIC/R2_PRIVATE/REGENERATE/REVIEW へ分類。--history は要キャッシュ・DN-0111 Phase 0）
npm run prune-state-snapshots # CI が積む日付付き snapshot（psi/ga4/gsc/url-inspection/monetization/crosswalk/weekly-metrics）を寿命表で消す（既定 dry-run・`--commit`・`--family a,b`・`--check-coverage`＝未宣言の日付付きファイル 0 件か〔quality:audit ci:true〕。business/** と gsc/rank-watch/** は不変台帳で除外・seo-watchwords の evidence.source は pin。削除は書き手 workflow の commit 直前で実行し、別 commit では消さない〔reset --hard + copy-back に戻される〕）
npm run check-git-binary-policy # 生成物・著作権物・巨大blob・拡張子偽装・同一原本の二重生成の**新規追跡**を baseline ラチェットで止める（設定 .claude/config/git-binary-policy.json・pre-commit --staged ＋ quality:audit・DN-0111 Phase 1）
npm run asset-offload         # 追跡アセットを R2 へ退避（既定 dry-run・--commit で実行。upload 後に bytes と sha256 を R2 から読み直して検証してから manifest へ記録。ローカル削除と untrack はしない。**--verify** で追跡解除前の全件照合〔ローカル実体・manifest・R2 の 3 者一致〕を行い、--out に untrack できる一覧を書く。1 件でも欠ければ exit 1）
npm run asset-hydrate         # 退避したアセットを取り戻す（ローカル→cache→R2→generator の順・--offline で cache のみ・--path で部分取得）
npm run check-asset-storage   # 退避台帳の整合（公開バケット誤配置・r2Key 衝突・復元不能・秘密混入）。R2 非アクセスでオフライン完結・quality:audit に同梱
npm run drive-vault-sync      # **人か手元のスクリプトだけが使う**アセット（原本PDF・ページ画像・配布PDF・未投稿レンダー等）を Google Drive vault へ置く／取り戻す（既定 dry-run・--commit・--from-r2・--dedupe-by-sha・--verify [--deep --cloud]・--pull）。置き場は誰が使うかで決める＝サイト配信→public R2／CI→private R2／人→Drive（asset-storage-policy.md §1・/asset-route）
npm run check-drive-vault     # 置き場ルールのゲート（asset-storage.json の全 group に audience・site⇒public・ci⇒private|byVisibility・human は理由無しに R2 へ置けない）＋R2 と Drive の同一パス衝突＋drive-manifest の整合。**マウント無しは「実体検査 0 件」と明示**して設定・台帳だけで判定・pre-commit --staged-only（Drive 管轄ファイルの再追跡を検知。`coexistWithGit: true` の group＝kindle-dist は Git が正本なので対象外・2026-09-17）＋ quality:audit
npm run check-reference-sources # 参考文献台帳・記事 sources ID・出典粒度・非公開文字起こし名の漏洩・未付与 baseline ラチェットを検査（--staged は pre-commit）
npm run check-reference-sources:deep # Drive の文字起こし frontmatter↔原本台帳と、市販書籍由来記事の40文字以上の逐語一致0を実体照合（Mac・Driveマウント要）
npm run check-disk-hygiene    # ローカル容量の surfacer（macOS / Windows 両対応・他 OS 専用項目は n/a。exit 2 は「検査できるはずの項目に材料が無い」）
npm run disk-hygiene:fix      # 再生成可能な滞留物をガード付きで削除（日次実行の実体。dry-run は node scripts/disk-hygiene.mjs --dry-run）
npm run disk-hygiene:install  # macOS: launchd 日次掃除＋Git maintenance登録（-- --status / --run-now / --uninstall）
npm run disk-hygiene:install:win # Windows: タスクスケジューラ日次掃除＋Git maintenance登録（12:30・逃した回は次回起動時。ログと stamp は ~/.local/state/doboku-note/logs/。AppData 配下にしないのは MSIX アプリからの読み書きが仮想化されるため）
npm run auth:doctor           # Playwright auth root の診断（Windows は旧 %LOCALAPPDATA% と Codex(MSIX) サンドボックスの取り残しも警告）
npm run auth:migrate          # 旧置き場のプロファイルを新 root へコピー（既定 dry-run・--commit。Cookie が最新の候補を選び、キャッシュは運ばない）
npm run auth:keygen           # CI用age keypair生成。recipient未設定でのexportは拒否されるので先に実行する
npm run auth:export           # ローカルstorageStateをage暗号化しprivate R2へ書き出す。recipient未設定だと拒否される
npm run auth:ci-restore       # CI専用。暗号化stateを復元。authenticated以外はexit 2でリトライしない（人の再ログイン待ち）
npm run auth:ci-writeback     # CI専用。更新後のstorageStateをCAS（etag/generation）で書き戻す
npm run auth:ci-plan          # ops-writeのwrite planを作りDOBOKU_CI_WRITE_PLAN_SHA256を計算する
npm run check-content-taxonomy # 分類語彙（領域×資格×記事型×テーマ×タグ）の整合。group が許可外・未登録タグは赤、別名綴り・構造タグ不整合は baseline ラチェット（`:ci`）、topic 三方向の 0 件は WARN。規則は content-taxonomy.md・pre-commit --staged ＋ quality:audit
npm run check-content-expansion # 全教材の論点→記事/図/SNS対応・未確認・原典待ち・成果物変更を検査（管理画面 /content/expansion・週次/月次で確認）
```

## 公的基準（共通仕様書の章記事・ページ画像）

```bash
npm run build-standard-articles # 公的基準の逐語文字起こし→編・章・節の構造化章記事を生成（`content/site/standards-articles/`。章は PDF 分冊でなく原本の柱＝編・章で切る。対象と canonical 機関は .claude/config/standards-structure.json）
npm run build-takuitsu-pdf      # 択一MDXをnote配布用A4 PDFへ変換（`-- --spec <json> [--out <pdf>]`）。spec必須=`bookId/title/subtitle/sources`、自作問題は任意`creditText`で出典説明を上書き。MDXコメント除去・Callout箱化・system Chrome描画
npm run build-standards-comparison # 近畿版を基準に各地方整備局版の本文差分を章・行単位で生成（`content/site/standards-articles/comparison.json`）
npm run build-standards-data     # 構造化章記事から公開用 Markdown / JSON-LD / 索引JSONを `public/standards-data/` へ生成（派生物・Git追跡外・本番build同梱）
npm run check-standards-data     # 公開用データ全章の形式・条数・出典/加工主体分離・noindex/CORSヘッダーを検査（build-standards-dataが自動実行）
npm run build-standards-ogp     # 章記事ごとの OGP 画像を生成（章は MDX でないため `npm run ogp` の射程外。描画は ogp-create の lib を再利用し見た目をサイトと揃える。R2 供給は ogp-supply.yml が代行）
npm run check-standard-articles # 上の 15 検査（本文の取りこぼし0・全ページ割当・条番号整合・見出しレベル・SHA-256 一致・重複 indexable・**catalog 72 文書の被覆と除外理由の実データ検証**・表の可逆性・**章ごとの OGP 被覆**。exit 2=検査不成立）
npm run build-standards-page-images # 公的基準の原本PDF→**1ページ1画像+1テキスト**（270dpi/2233px JPEG＋pdftotext のページ分割）。章記事が part-NN.md（50ページ束）までしかページ情報を持たず「原本の何ページか」を機械で言えない問題を埋める。原本の同定はファイル名でなく **sha256**（Drive のファイル名は整理で動くため）。**実体は Google Drive vault の原本 PDF と同名フォルダ（隣）**、Git には manifest.json だけ
npm run check-standards-page-images # 上の provenance 整合（catalog↔manifest の原本 sha256・ページ 1..N の被覆・part 範囲・画像 sha256 のサンプル照合。実体が無い端末では manifest のみ検査しその旨を明示・quality:audit に同梱）
```

## note・会員・売上・Kindle

`npm run note-character-covers -- --source-root /path/to/source-checkout --output-root /path/to/isolated-output` — V5 キャラクターカバーを独立出力先へ全件生成し照合用 manifest を残す（全量差し替え用）。通常の記事・マガジン生成は `node scripts/generate-note-covers.mjs [dir]` / `node scripts/generate-magazine-covers.mjs [id]` で、同じ描画・同じポーズ割当（[仕様](../design-system/note-cover-character-v5.md)）。文言が枠に入るかは `npm run check-note-cover-fit`（pre-commit は `--staged`・実測幅）。

`npm run note-cover-rollout -- <reconcile|snapshot|plan|run|verify|record>` — 全量差し替えの照合（manifest↔最新原稿・差分だけ再生成）→ 公開 API の前後スナップショット → 対象/保留の決定 → 既存 CLI（note-update-cover / note-magazine-cover）への逐次投入（回線待ち・chunk 再試行・未 OK だけ再走査）→ eyecatch 変化と price/status/is_limited 不変の突合 → `.claude/state/note/cover-rollout/<date>.json` への記録。作業場は `.tmp/note-cover-rollout/`（消えると再開できない。`generated/manifest.json` と `live-before.json` は残す）。罠: CLI の「新カバー未確認」中断は coverless を防げない（削除が先に live へ書かれる・measurement-incidents 2026-09-18）ので verify で eyecatch を必ず見る。

```bash
npm run kdp-report        # Kindle 月次ロイヤリティを KDP レポートから取得→.claude/state/sales/kdp-royalties.json（読み取り専用・当月/前月のみ・定期取得は login-collectors.yml）
npm run check-kdp-report-freshness # KDPロイヤリティ台帳の期限とdoboku-note LIVE全冊のcatalog紐付けを検査（共有口座の他サイト書籍は除外。16日以降=前月確定、28日以降=当月推計。quality:auditのops区分が日次通知）
npm run note-traffic-fetch # note ダッシュボード「アクセス状況」を read-only 取得→.claude/state/metrics/note/{referrers,articles-pv}-YYYY-MM.json（--month は今月/先月のみ・--commit で保存・--check は fixture で正規化の完走確認＝quality:audit ci・ログイン要・DN-0249）。流入元は自己閲覧を含み、サイト経由は PR #511 deploy 前は no referrer に含まれる
npm run note-sales-fetch  # note 売上履歴を read-only 取得→検算OKで.claude/state/sales/sales-log.jsonの当月を差し替え（--month YYYY-MM --commit・ログイン要・DN-0018）
npm run check-magazine-cta # 公開マガジンがサイトで1面以上CTAとして出るか（top/中間CTA/MagazineCard・quality:audit に同梱）
npm run check-sales-freshness # sales-log.json の転記停止（updatedAt）と、毎月5日以降に前月noteアクセス取得・月次売上表示との金額一致を検査（quality:audit の **ops 区分**＝ops-audit.yml が日次で Issue へ。取得自体は認証が要るのでローカル専用）
npm run check-weekly-review-due # 週次レビュー（ローカル実行・土曜）の忘れを催促（土曜 09:00 JST 以降に今週分、月〜金は先週分の *-review.md が無ければ exit 1・SessionStart フックが呼ぶ。最終 backstop は月曜の weekly-review-guard）
npm run check-note-public-view # note 公開記事を未ログインの読者の見え方で検査。全件は公開 API（添付 PDF の本数・価格・カバー・無料記事の全文会員限定・本文の画像が配信サーバーにあるか）。`-- --review` で代表ページ（資格×記事の種類ごと 1 本）を note のブレイクポイントの帯ごとの画面幅（.claude/config/public-view-breakpoints.json）でブラウザ検査（画像・リンクカード・はみ出し）・撮影し、CSS の切り替わり幅の変化も WARN。週次 note-public-view.yml は `--review`。全件をブラウザで開く `-- --all-pages` は手元向け（CI からは note が途中で 403 を返し続けて終わらない・2026-09-23 実測）。`-- --api-only` で API 層だけ。手元はシステム Chrome、CI は同梱 Chromium。5xx は 1 回やり直し、それでも 5xx なら「開けない」に数える。例外台帳は .claude/config/note-public-view.json
npm run check-youtube-public-view # YouTube の台帳で公開の動画の視聴ページに非公開・削除・再生不可が出ていないか（公開状態の API 照合は verify-yt-status）。`-- --review` で代表動画（Shorts・通常ごと 1 本）を YouTube のブレイクポイントの帯ごとの画面幅で撮影。週次 note-public-view.yml に同居
npm run fetch-note-public-view-shots # 週次 note-public-view の目視確認用の画像（note・YouTube の代表ページ × 画面幅）を .tmp/note-public-view-review/<runId>/ へ取る（/weekly-review でエージェントが見る）。exit 2 は未確認（run 無し・成果物切れ）。`-- --run <id>` で任意の run
npm run verify-note-status # frontmatter noteStatus ↔ note ライブ公開状態の照合（read-only・note-live-audit.yml 週次）。`-- --fix` はライブ published に合わせ既存 noteStatus 行だけ是正し、実際に書き換わった本数を「是正」と数える（CRLF 記事で 1 バイトも変わらず是正済みと数えた偽成功が 2026-09-19 にあり・書き換え不能は UNFIXED で exit 1）
npm run check-membership-drip # 会員配信ドリップの遅れ・実体欠落（真実源＝メンバーシップ/README.md の配信表。予定日を1日以上過ぎた未配信は赤。日付をカードへ複製すると必ずずれるので複製しない・quality:audit の **ops 区分**＝PR は赤くせず ops-audit.yml が日次で Issue へ。2026-09-18 まで ci 区分に居て 30 日に 13 回 Pre-merge を落としていた）
npm run check-rccm-essay  # RCCM 問題III 模範論文の出題条件（模範論文 1,200〜1,600 字・指定用語「」4 語以上・①②見出し・問題再現節なし・paidBoundary 実在）。対象は content/note/RCCM/** の rccmKeywords 付き article.md。--staged は pre-commit、--strict は推奨帯外も違反（writer/qa の返却前ゲート）。対象 0 件は exit 2＝検査不成立（quality:audit に同梱）
npm run check-kindle-epub-leak # 配布EPUBに章名 article.mdx / YAML frontmatter が印字されていないか＋ソースMDXのBOM検査（BOMで frontmatter の ^--- が外れるのが真因。pre-commit は --bom-only・quality:audit に同梱）
npm run check-kdp-category-coverage # 新刊(buildSpec持ち)のid接頭辞がKDPカテゴリー(.claude/config/kdp-memo.json categoryAssign)へ明示登録されているか（未登録は警告なく既定「技術士」へ入稿される。2026-08-28 g-01実測の再発防止・quality:audit に同梱）
npm run check-kindle-prices   # Kindle の spec.price と catalog.priceJpy の一致・70%帯(¥250〜¥1,650)内か。改定は spec を直して `node scripts/kdp-publish.mjs --id <id> --set-price --commit`（成功時に catalog を書き戻す・AI申告が未回答なら先に埋める・日本の実効レートが catalog.royalty と違えば止まる。KDP 上の実価格との突合は `--sync-status`）
npm run fix-legacy-site-links # note 原稿の旧 https://doboku-note.com/docs/... を新 URL（/exam/...）へ張り替える（既定 dry-run・`-- --write` で書込み・UTM 保持・対応表は public/_redirects）。原稿を変えても note 上は変わらない＝再公開は note-update-body。content/sns は対象外（X の status.json は承認 hash を持つ）
```

## CI 書き込み操作・予約投稿（ops-write・2026-09-21）

```bash
npm run ops-write:plan -- --operation <id> --args '{"...":"..."}' # plan hash を計算し内容を表示するだけ（ブラウザ・書き込みなし・カタログは .claude/config/ci-write-operations.json）。hash確認後 gh workflow run ops-write.yml へ渡す。罠: 記事や引数を確認後に変更すると hash 不一致で exec が exit 2＝何もしない
npm run ops-write -- exec --operation <id> --args '{...}' --plan-sha256 <hash> --commit # CI 専用（GITHUB_ACTIONS/CI env が無いと exit 2）。手元での動作確認には向かない
npm run x-publish-scheduled -- --commit --json # 承認済みキューから期日到来分のXを投稿（scheduled-publish.yml の cron 専用実体）。罠: 頻度ゲート（x-frequency-gate.mjs 12規則）が判定不能なものは必ず block（投稿しない）側に倒す＝「なぜ投稿されないか」は counts/blocks を読む
npm run ig-graph-publish -- --pack <pack> --format carousel --commit --json # Instagram Graph API で即時公開（**使わない**＝2026-09-23 ユーザー決定で Graph API を使わない。主経路は ops-write の instagram.publish-bs。予約不可・publish-ig-bs とは別経路）。env: IG_GRAPH_ACCESS_TOKEN / IG_BUSINESS_ACCOUNT_ID / IG_GRAPH_API_VERSION。罠: 投稿用メディアは public R2 に一時公開されるため stage-ig-media-r2 の --cleanup 実行を確認する（残すと公開URLが残置）
npm run stage-ig-media-r2 -- --pack <pack> --format carousel --cleanup # ig-graph-publish が使う一時公開/削除の単体実行（--dry-run で URL 計算だけ）
npm run brain-sales-fetch  # Brain 売上を read-only 取得（ログイン要・ローカル専用）
```

## ココナラ

```bash
npm run coconala-orders   # ココナラ受注＋購入前DMの実体を read-only 収集→orders-snapshot.json（Playwright・書き込みなし・定期取得は login-collectors.yml）
npm run check-coconala-orders # 上記 snapshot ↔ orders-log をオフライン突合（記録漏れ・金額ズレ・返信期限〔48h自動キャンセル〕・DM要対応）
npm run coconala-analytics # ココナラ分析画面（全体/サービス別/ブログ別）を read-only 収集→analytics-snapshot.json（--append-kpi で kpi-log へ週次 upsert・定期取得は login-collectors.yml・Playwright・書き込みなし）
npm run check-coconala-analytics # 上記の鮮度・欠測・マスク値（0000は0でない）・kpi-log 整合をオフライン検査
npm run check-coconala-wiring # カタログ↔listings↔商品画像↔受注/KPI/売上の整合と、PDF の価格ルール（note 基準×1.1 以上）を検査（pre-commit --staged＋CI）
npm run check-coconala-live # ココナラ公開ページ（ログイン不要の構造化データ）の価格・タイトル・キャッチ・本文・出品者・販売状態をカタログ／listings と突合（exit 1=食い違い・2=取得失敗が過半で検査不成立・日次 ops-audit）
npm run coconala-pause    # ココナラ出品の受付休止/再開/アーカイブ（--resume --absence で不在明け一括復帰・既定 dry-run）
```

## SNS・動画

```bash
npm run check-video-content    # 動画パック（DN-0110）の整合ゲート（manifest/sourceRef 漏洩/CTA・UTM/storyboard/逐語転用/status。契約 SSOT は .claude/config/video-content.json と video-content-policy.md。exit 2=検査不成立・quality:audit に同梱）
npm run render-longform        # 動画パックの 16:9 通常動画レンダラー（storyboard→1920×1080 PNG＋ASS 字幕＋VOICEVOX/ffmpeg mp4。出力は .tmp/video-render/・音声環境無しは --skip-tts で PNG/ASS まで。VOICEVOXとffmpegがあればWindows/Macでmp4生成可・生成用Actionsは未設置）
npm run check-video-publication # 公開済み派生物の実体照合が回っているか（未照合・鮮度切れ・記録の孤児・実査ドリフト）。実査本体は verify-video-publication＝CI 週次(verify-yt-status.yml)で creds 必須・**対象0件は明示してPASS**・quality:audit に同梱
npm run x-own-metrics     # 自投稿の反応（いいね/RT）を採取→型×時間帯×導線の表（.claude/state/x-metrics/・**中央値で読む**。impressions/replies は CLI が返さず取得不可）
```

## Instagram・Cloudflare（CI 取得・freshness）

```bash
npm run fetch-ig-insights          # Instagram Graph API で media+insights+SoT 照合を取得→.claude/state/metrics/instagram/・.claude/state/ig-reconcile/snapshot.json（CI 週次 fetch-ig-insights.yml が実行。0 件取得は exit 2＝成果物を書かない）
npm run ig-graph-token             # IG_GRAPH_ACCESS_TOKEN のローテ（長期トークン発行→ローカルで `gh secret set` へ手動投入。ローカル専用・秘密値を出力しない）
npm run fetch-cloudflare-analytics # Cloudflare GraphQL Analytics でゾーン別日次集計を取得→.claude/state/metrics/cloudflare/（CI 日次 cloudflare-metrics.yml。0 件は exit 2）
npm run fetch-cloudflare-zone-config # Cloudflare ゾーン設定（キャッシュ/圧縮/WAF/Bot Management）を取得しドリフト検知→.claude/state/cloudflare/zone-config-latest.json（CI 月次 cloudflare-config-audit.yml。**ドリフト採用は `--accept-baseline` を人が確認してから**）
npm run check-ig-insights-freshness # IG 週次取得の停止とトークン失効 7 日前を検知（quality-audit の ops 区分・snapshot 0 件は FAIL）
npm run check-cloudflare-metrics-freshness # Cloudflare 日次/月次取得の停止を検知（quality-audit の ops 区分・zone snapshot 3 日超／config 10 日超で FAIL）
npm run fetch-afb-outcomes         # afb 公式 conversion API で成果（pending/approved/rejected・報酬額）を取得→.claude/state/metrics/affiliate/afb-outcomes-latest.json（`--commit` 必須で書き込み・CI 週次 fetch-metrics.yml。AFB_API_KEY 必須・提携状態スキャンとは別系統）
npm run check-afb-outcomes-freshness # afb 成果取得の停止を検知（quality-audit の ops 区分・10 日超で FAIL）
```

## 計測・GSC・GA4・期日

```bash
npm run google-console:login   # GSC/GA4 用 Chrome プロファイルを headed で開き人間ログイン（ローカル専用・/google-search-growth の前提）
npm run search-growth:report   # GSC UI 正規化 ∪ API データを URL 突合して修正計画を再生成（オフライン・approval gate）
npm run check-gsc-ui-due       # GSC/GA4 UI 取得の月次期限＋前回の完全性を判定（surfacer・weekly-review が読む）
npm run check-google-ui-ssot   # UI CSV 情報の追跡 SSOT の整合ゲート（marker↔history↔urls・検査ゼロを FAIL）
npm run ga4-admin:check        # GA4 管理画面の設定を desired state と突合（dry-run／:apply で不足カスタムディメンションを作成）
npm run check-ga4-dimensions   # GA4 カスタムディメンション（event_label/cta_placement）のドリフト検知（オフライン）
npm run gsc-indexing:check     # 未登録URLをGSC URL検査で診断（dry-run／:request で登録リクエスト・上限10件/回。`-- --urls /exam/a,/standards/b` か `-- --file list.txt` で正規パス指定。旧 /docs/slug は _redirects の 301 先へ自動変換）
npm run gsc-indexing:priority  # 最新 URL 検査 batch × GSC page 実績から登録リクエストの順位表を作る（CI が週次で commit。人間は priority-latest.txt を :request に渡すだけ）
npm run check-gsc-indexing-due # 表示実績のある未登録が残っているのに 7 日以上リクエスト無しなら DUE（weekly-review-guard が surface・常に exit 0）
npm run gsc-sitemaps          # 本番 robots.txt の Sitemap 行（sitemap.xml・期限内の sitemap-legacy.xml）を Search Console API で送信（`-- --submit`・要サービスアカウントの「フル」権限）し、読み込み状況を gsc/sitemaps-latest.json へ（fetch-metrics.yml が週次で実行・ログイン不要）
npm run check-gsc-sitemaps    # sitemaps-latest.json を見て、記録が古い・GSC 未登録・送信失敗・エラー・14 日以上未読み込みなら DUE（weekly-review-guard が surface・常に exit 0）
npm run gsc-local:install     # Mac の launchd に GSC のブラウザ作業を登録（毎日 10:30・寝ていた日は起床時に 1 回）: 順位表の先頭から登録リクエスト 10 件＋月次の理由別 UI CSV を、専用 worktree（.claude/worktrees/gsc-local・lock 済み）で回して台帳を develop へ push。`-- --status` / `-- --run-now` / `-- --uninstall`。前提は npm run google-console:login 済み。人の checkout で scripts/gsc-local-routine.mjs を直接叩かない（ブランチに乗った HEAD では拒否する）
npm run indexnow:submit        # sitemap の lastmod が直近 7 日の URL を IndexNow（Bing 等・Google 非対応）へ通知。CI は deploy 成功後に自動（indexnow-submit.yml）。`-- --dry-run` で対象だけ。会社 PC は Node fetch がプロキシを通らず exit 2
npm run check-experiment-due   # 実験台帳の再計測/close/decide 期限と要人手（pending_user_actions）を surface（計測→記録→改善→再計測の最後の輪。2026-09-19 に旧 check-experiments-due を統合＝判定は scripts/lib/experiment-due.mjs が唯一。`-- --json` で issues も出す）
npm run check-jst-date    # 運用記録の日付が UTC で前日付になっていないか（JST 09:00 前の実行事故・pre-commit 同梱）
npm run report-buildjob-affiliate # BuildJob クリック×A8 成果の EPC レポート→.claude/state/metrics/affiliate/buildjob-report-latest.md（月次レビューが読む。`-- --check` は書かずに完走だけ＝quality-audit ci）
npm run report-career-funnel      # キャリアファネル（流入→回遊→CTA→成果）→career-funnel-latest.{json,md}（`--freeze` で基線凍結＝**既存があれば exit 1 で中止**し latest も書かない。撮り直しは `--refreeze`。`--json`・`--check` は書かずに完走だけ＝quality-audit ci。GA4 と GSC は窓が違うので出所を跨いで割らない）
```

## 台帳・ドキュメント整合

```bash
npm run check-backlog-schema # backlog タグ行の語彙・[検証:]の実在・ID(DN-####)必須/重複・完了 prose の混入（pre-commit --staged ＋ quality:audit）
npm run check-backlog-health # 台帳の候補 surfacer（🟢に沈んだ不具合・種類の矛盾・重複候補・検証ゲート欠落。判定はせず常に exit 0）
npm run check-codex-compat   # AGENTS.md（共通規約＋rules参照索引）/ .agents/skills / .codex/agents / .codex/hooks.json が正典（CLAUDE.md + .claude/rules / .claude/skills / .claude/agents / .claude/settings.json）の生成物と一致するか（第2SSOT再発防止・pre-commit --staged はGit blob一括取得＋変更したindexのruntime参照、通常/CIは全域走査 ＋ quality:audit・再生成は sync-codex-compat。2026-09-14 から agent toml と hooks.json も生成物＝手で編集しない）
npm run sync-codex-compat    # 正典から AGENTS.md / .agents/skills / .codex/agents/*.toml / .codex/hooks.json を再生成（孤児は削除）
npm run setup-memory-link    # Claude Code の auto-memory（~/.claude/projects/<key>/memory）を repo の .claude/memory へ junction/symlink（初回は `-- --migrate` で既存 memory を移す・`--settings <dotfiles の json>` で settings.local.json も張る・既存の実ディレクトリは消さず .bak へ退避。両 PC で同じ memory を読ませる）
npm run check-claude-md-size   # CLAUDE.md（毎ターン再送される核）が 150 行 / 20KB 以下か・12 原則の見出し・.claude/rules の paths: 必須（pre-commit で CLAUDE.md / rules を stage したとき ＋ quality:audit）
npm run check-agent-descriptions # .claude/agents/*.md の description が 300 code points を超えて増えないか（81 件すべてが毎セッションの system prompt に載る。全件を上限内へ短縮済み・baseline 超過 0 件・pre-commit --staged ＋ quality:audit・`--update-baseline` で締める）
npm run session-start        # SessionStart の 6 検査（git-sync / plan-staleness / backlog-due / resources / disk-hygiene / x-sync）を 1 プロセスから順次実行し、出力が非空の検査だけ表示（.claude/settings.json の SessionStart はこれ 1 本。node を 6 本同時起動しない）
npm run check-project-task-refs # docs/ の恒久文書の廃止参照(task-queue.json)と backlog ID 参照切れ（quality:audit に同梱）
npm run check-information-architecture # 4 領域（docs/content/.claude/実装）への逆戻り検知（廃止した置き場への新規ファイル・docs への制作物混入・content への台帳混入・二重 SSOT。pre-commit --staged ＋ quality:audit）
npm run check-relative-links   # Markdown の相対リンク `](../x)` の実在（check-doc-refs はリンク**テキスト**しか見ないので、置き場を変えると href だけ黙って壊れる。pre-commit --staged ＋ quality:audit）
npm run business-review       # 資格別KPI・週次/月次レビュー期日の確認（-- report --monthly で前月）
npm run fetch-business-metrics # GSC/GA4の資格別・完了週/月の集計取得（--commitで追記）
npm run check-business-direction # 事業方針・指標・履歴・追記専用の検査
```
