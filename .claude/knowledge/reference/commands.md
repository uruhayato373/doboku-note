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
npm run refresh-indexes   # 静的インデックス再生成（backlinks + cross-exam + tags + pillar問題 + popular記事[GA4] + 頻出論点 + note 記事カタログ）
npm run content-ledger    # 管理画面「コンテンツ台帳」（/content/ledger）の索引を作る（.claude/state/content-ledger.json・git 管理外）。記事・出品ごとに前回から変わったものだけ読み直し・照合し直す（原稿は git の中身のハッシュが鍵＝worktree を替えても読み直さない／照合は鍵が変わった・前回ずれ・取得失敗・24 時間経過のものだけ）。初回は約 5 分・以後は 1 分前後。`--refresh` で全件照合・`--no-live` で照合しない。npm run admin の起動時に 6 時間より古ければ裏で作り直す（DN-0438）
npm run admin             # 運営管理画面 Next.js 版（ローカル専用・http://127.0.0.1:3021・計測/エージェント/スキル/ギャラリー/SNS状態/記事/売上/品質/ジョブ/TODO/**プロジェクト**/**ライフサイクル横断 `/content/lifecycle`**/**動画パック `/content/video`**・tools/admin-app）
npm run test:e2e:admin    # 管理画面の E2E（Project↔TODO の相互リンク・日本語パス・トラバーサル404・レスポンシブ。admin は dev 専用なので CI の e2e には載せない）
npm run check-career-separation:built  # 学習系ナビ（data-nav-list="exam-guide"）に career 記事が混ざっていないかを out/ の HTML で見る。**要 `npm run build`** で ci.yml の build 後に置く。走査先は out/{exam,practice,standards,topics}（2026-09 の URL 分割前は out/docs だった）。ナビ一覧 0 箇所は検査不成立＝exit 1
npm run check-e2e-targets      # E2E が叩くサイト内 URL が out/ に実在するか（`_redirects` の転送元を叩くと dev で必ず 404 になり、検査が成立しないまま赤が放置される）。**要 `npm run build`** なので quality:audit ではなく ci.yml / e2e.yml の build 後に置く。exit 2=検査不成立
npm run check-production-ssr # deploy 後の本番 SSR 検証（exit 0=正常 / 1=壊れている / **2=検査不成立＝接続できていない**。会社PCの HTTP 000／プロキシのブロック HTML をサイト障害と誤読しない・手打ち curl で代用しない）。/deploy と cloudflare-deploy.yml の公開後に実行。社内回線から接続できない場合は同workflowの verify_only=true で再デプロイせず外部検査。
npm run check-production-sweep # 本番 sitemap 全 URL を実際に叩く（200・自己 canonical・<main>・noindex 無し・og:image 200・セキュリティヘッダ）。deploy 後と日曜に CI（production-sweep.yml）が自動。手元は `-- --sample 50`。exit 1=本番異常 / 2=検査不成立
npm run test:e2e:a11y        # axe（WCAG 2.1 A/AA）を代表 8 ページ×light/dark で実行。critical 0 かつ serious が e2e/a11y-baseline.json を超えないことがゲート。基準更新は :baseline（修正を確認してから・減らす方向のみ）
npx lhci autorun --config=lighthouserc.json  # Lighthouse を build 成果物（npm run serve）に対し代表4ページ（home/KW記事/過去問/ツール）で実行。**要 `npm run build`**。accessibility/seo ≥0.95・best-practices ≥0.9 は error（マージ不可）、performance ≥0.7 は warn（job summary のみ・lab の揺れが大きいためゲートしない）。PR（lighthouse.yml）で自動実行。**閾値の SSOT は lighthouserc.json**（本番 field 監視の config/psi-config.json とは目的が違うため意図的に別の値・二重管理しない。役割: lighthouserc=マージ前 lab ゲート／psi-config=本番後 field 監視+回帰検出）
npm run check-command-guidance # 検査やスクリプトが案内するコマンド（npm run / node パス）が実在するか。**正典ドキュメント（CLAUDE.md / AGENTS.md / この一覧 / .claude/rules）の案内も対象**（記載はあるが package.json に無い `npm run serve` を 2026-08-30 まで放置していた再発防止）
npm run schedule-view     # 予約・計画・期日の横断ビュー（読み取り専用・JST。exam-calendar/x-campaigns/x-status/ig-status/youtube-schedule/backlogを集約。DN-0131のような超過を横断で surface する）
```

## 記事・MDX の検査

```bash
npm run check-mdx-dates      # 記事の created/dateModified が frontmatter に揃っているか（sitemap lastmod と JSON-LD datePublished の真実源。欠けるとビルドが git 履歴へフォールバックし、公開 SEO 信号がリネームや履歴書換えで動く状態へ逆戻りする。書き込みは pre-commit の backfill-mdx-dates --staged）
npm run lint:ja               # 日本語校正（textlint + prh）。staged の content/site/**/*.mdx だけの表記ゆれ・全角英数を検出（pre-commit と quality:audit:ci に同梱・DN-0239）。辞書は prh.yml、ルール定義は .textlintrc.json
npm run lint:ja:all           # 全件 report（1,280 ファイルを 100 件ずつバッチ実行・OOM 回避。ゲートしない。件数を減らしたいときは辞書 prh.yml に語を足す）
npm run check-bold-rendering # 太字が実際に描画されるか（remark で実パースし text に ** が残る＝崩壊を検出・サイト MDX と note 記事が対象・quality:audit に同梱）
npm run check-note-duplicate-images # note 記事で同じ画像を 2 回使っていないか（2 枚目は CDN 確定せず全文更新が中断する・pre-commit の note-lint 規則 10 と同じ判定・quality:audit ci）
npm run check-note-inline-code      # note 記事の本文にインラインのバッククォートが無いか（note は `〇〇` を記号のまま出す・目印は【〇〇】・pre-commit の note-lint 規則 11 と同じ判定・quality:audit ci）
npm run check-note-content-type     # note記事の役割5分類（product/index/learning/career/editorial）の必須・語彙・総合案内/career UTM整合を全件検査（quality:audit ci）
npm run migrate-note-content-type:write # 未分類の既存note記事を5分類へ初回移行（確認だけは末尾`:write`なし。移行後はfrontmatterがSSOT）
npm run fix-bold-rendering   # 上の崩壊のうち機械的に安全な形だけ修正（dry-run 既定・--commit で適用）
npm run check-table-rendering # GFM テーブルが実際に table になるか（remark 実パースでデリミタ行が text に残る＝生パイプ表示を検出。原因〔改行 \r\r\n 破損／ヘッダとデリミタのセル数不一致〕を問わず症状で拾う・pre-commit --staged ＋ quality:audit）
npm run check-table-references # 本文が指す「表N.M」のキャプションが実在するか（転記由来の宙に浮いた参照）
npm run check-published-vs-redirects # 統合済み記事の再公開を止める（published:true なのに `_redirects` で 301 の転送元＝ページは在るのに別ページへ飛ぶ。統合の記録は frontmatter に無く _redirects にしかないので目視では気づけない。pre-commit --staged ＋ quality:audit）
npm run check-year-staleness   # title/seoTitle/description に残る前年度以前の年度表現を warn 列挙（過去問・年度別記事は主題なので除外・report）。年度切替（毎年1月）直後だけ quality-audit.mjs の ci フラグを true へ上げ、0 件になったら戻す（DN-0426）
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
npm run check-git-binary-policy # 生成物・著作権物・巨大blob・拡張子偽装・同一原本の二重生成の**新規追跡**を baseline ラチェットで止める（設定 config/git-binary-policy.json・pre-commit --staged ＋ quality:audit・DN-0111 Phase 1）
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
npm run auth:refresh          # A8/もしも/KDP/note/ココナラのログイン維持（Mac・Windows）。stats47 の共用 state（~/.local/share/asp-sessions）を取り込み、切れていれば OS の資格情報ストア（キーチェーン／資格情報マネージャー）で 1 回だけログイン。`--export`・`--dispatch-due`（Mac のみ。定期収集が 24h 以内なら直後に起動）。`--no-login` は取り込みと status だけ。失敗印 metadata/<service>.autologin-failed を消すまで再試行しない
npm run auth-refresh:install  # 上を Mac は launchd（毎日 17:45＝stats47 の 17:30 直後・ログイン時。登録直後にも 1 回走る）、Windows はタスクスケジューラ（毎日 17:45・本体 checkout から登録・worktree からは拒否）に登録。`-- --status` / `-- --run-now` / `-- --uninstall`
npm run check-content-taxonomy # 分類語彙（領域×資格×記事型×テーマ×タグ）の整合。group が許可外・未登録タグは赤、別名綴り・構造タグ不整合は baseline ラチェット（`:ci`）、topic 三方向の 0 件は WARN。規則は content-taxonomy.md・pre-commit --staged ＋ quality:audit
npm run check-content-expansion # 全教材の論点→記事/図/SNS対応・未確認・原典待ち・成果物変更を検査（管理画面 /materials・週次/月次で確認）
npm run check-content-expansion:linked # backlogIds を持つ論点に要作業・原典待ち・再確認が残れば exit 1（backlog の [検証:] 用・無印は常に緑）
npm run check-domains          # 領域の正本（config/domains.json）とスキル/エージェントの domain:・文書の割り当ての整合（バックログの [領域:] は check-backlog-schema）
npm run ci-data -- <save|restore|add|latest|path|put> # ワークフローが記録を develop へ書き戻すときの共通処理。変わったファイルを git status から拾って退避・復元し（save/restore）、実在するパスだけを add する。latest/path は台帳の id からパスを出す。YAML にデータのパスを書かないための道具（main の YAML が develop の置き場の変更に追従できるように）。罠: 依存（zod）を読むので npm ci の後で使う。node_modules の無い別 worktree では checkout 側から --root で対象を指す
npm run check-datasets         # 設定（config/）・記録（data/）の git 管理下の全ファイルが台帳 scripts/lib/datasets.mjs のちょうど 1 つのデータセットに当たるか、宣言だけのデータセットが無いか、型（scripts/lib/dataset-schemas.mjs の zod）のあるものは型に合うか。CI ゲート＋pre-commit。管理画面 管理＞設定／データ がこの台帳を並べる。罠: 新しい設定・記録を足すときは先に台帳へ 1 行足す（まだ 1 件も無い置き場は planned: true）。手元だけの生データは local: true で、git 管理に入ると違反
npm run check-generated-indexes # refresh-indexes を実際に回し、生成物がコミットと一致するか（一致しなければ書き換わったファイルをコミットする。生成時刻だけの差分は出ない）
```

## 公的基準（共通仕様書の章記事・ページ画像）

```bash
npm run build-standard-articles # 公的基準の逐語文字起こし→編・章・節の構造化章記事を生成（`content/site/standards-articles/`。章は PDF 分冊でなく原本の柱＝編・章で切る。対象と canonical 機関は config/standards-structure.json）
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

`npm run note-character-covers -- --source-root /path/to/source-checkout --output-root /path/to/isolated-output` — V5 キャラクターカバーを独立出力先へ全件生成し照合用 manifest を残す（新デザインの全件確認用。note への登録は下の週次）。通常の記事・マガジン生成は `node scripts/generate-note-covers.mjs [dir]` / `node scripts/generate-magazine-covers.mjs [id]` で、同じ描画・同じポーズ割当（[仕様](../design-system/note-cover-character-v5.md)）。文言が枠に入るかは `npm run check-note-cover-fit`（pre-commit は `--staged`・実測幅）。

`npm run note-sync-plan` — 公開済み note 記事ごとの反映計画（本文・カバー・タグのどれが未反映か、止まっている理由と直し方）をオフラインで出す。`-- --json` は管理画面 `/content/note-sync` 用、`-- --out list.txt` は週次と同じ順（本文なし → 画像なしの本文 → 画像ありの本文）で反映待ちを書き出す。判定の実装は `scripts/lib/note-sync-plan.mjs`（週次・CI・管理画面で共通）。

`npm run check-note-sync` — 上の計画に note の公開 API で読んだ今のカバー（消えた・別の画像になった）とマガジンのカバーを足し、全部反映済みかを判定する（読み取りだけ・約 900 回 API を読むので 5〜8 分）。exit 1＝反映待ちか止まっている記事あり／2＝検査不成立。CI の `note-sync-live.yml` が週次で回す。

`npm run note-update-body -- --sync --list <file> --commit` — 記事単位の同期。記事ごとに未反映の部品（本文・カバー・タグ）だけを 1 回のエディタ操作で反映し「更新する」は 1 回。本文を触らない記事は有料境界・試し読みラインを動かさない。配布 PDF は貼り直す（手元に無ければ本文を触らず止まる）。止まっている記事（中断・会員特典の公開範囲未指定など）は飛ばす。部品を明示するなら `--parts cover,tags`。会員特典マガジン内の無料記事は frontmatter `memberTrial: bottom|lock` で公開範囲を決める。

`npm run standardize-civil1-note-intro` — 1級土木 note の冒頭（最初の ## より前）を標準形へそろえる（著者画像POP・説明文2段落・ココナラ・収録元＋上位マガジン・失格注意。記事固有の文は残す）。既定 dry-run・`--apply`。割り当ては `config/note-intro-standard.json`。

`npm run note-replace-intro` — 公開済み記事の冒頭だけを原稿で貼り直し、末尾の撤退済み導線を消して 1 記事 1 回で公開する（全文置換しない・PDF 添付の件数を前後で照合）。`--list <paths> --commit`。note は途中の編集を自動保存しないので、失敗した記事は下書きも汚れない。

`npm run note-magazine-delete -- --keys m1,m2 [--commit]` — note マガジンを削除する（既定 PROBE・収録記事は消えない・削除後に公開 API の 404 を確認）。記事の削除は `node scripts/note-delete-note.mjs --notes k1,k2 --commit`（一覧を下へ読み進めて古い記事も探す）。

`npm run product -- list|show|set|add-member|fmt|gen` — 商品の正本 `content/products/` を読み書きする（JSON を手で書かない。`gen` で `note-magazines.ts` の生成ブロックを更新・`gen --check` は差分で exit 1。初回の移行は `import-note --qualification <id> --commit`・DN-0492）

`npm run check-products` — 商品の正本のゲート（型・id・参照先・生成ブロックの一致・収録の意図×コミット済みの収録記録。ネットワーク不使用・ci:true）

`npm run product:db -- --query "<SQL>"` — 正本・収録記録・販売ログから検索用 SQLite `.tmp/products.db`（生成物・Git 管理外・sql.js）を作って問い合わせる。`--check` は書き出さずに完走だけ確かめる

`npm run note-sync:install` — Mac の launchd に note の週次同期を入れる（毎週日曜 3:00・寝ていた週は起床時に 1 回）。専用 worktree（`.claude/worktrees/note-sync`・lock 済み）で `scripts/note-sync-routine.mjs` が、反映計画の順に最大 200 記事を `note-update-body --sync` で 1 記事 1 回更新し（配布 PDF は Drive から取り寄せる）、マガジンのカバーも登録して、台帳・実行記録（`data/note/sync-log.json`）・R2・Drive を更新して develop へ push。`-- --status` / `-- --run-now` / `-- --uninstall`。前提は note にログイン済みのプロファイル。計画だけ見るなら `npm run note-sync-routine -- --dry-run`（どの checkout でも可）。試験直前に 1 資格だけ先に流すなら `bash scripts/scheduled/note-sync.sh --only 'content/note/1級・2級土木/1級土木/'`（専用 worktree で同じ手順・マガジンのカバーは触らない）。手で `note-update-body --list` を流さない（PDF 取り寄せ・台帳 push・二重起動の防止を通らない）。罠: 見た目を変えたら `note-cover-tokens.json` の `designVersion` を上げないとカバーは再登録されない。上げると全件が数週に分けて登録し直される。

```bash
npm run kdp-report        # Kindle 月次ロイヤリティを KDP レポートから取得→data/kdp/royalties.json（読み取り専用・当月/前月のみ・定期取得は login-collectors.yml）
npm run kindle-preview -- --id <id[,id]>   # EPUB を 600×800 のページ画像に描画→.tmp/kindle-preview/<id>/（--status ready で一括）。管理画面 /content/kindle/<id> で表紙と並べて目視確認。Kindle 実機の描画とは近似。EPUB を作り直したら再生成（画面が「EPUB が更新されています」と出す）
npm run check-kdp-report-freshness # KDPロイヤリティ台帳の期限とdoboku-note LIVE全冊（対象月末までに出版した本）のcatalog紐付けを検査（共有口座の他サイト書籍は除外。16日以降=前月確定、28日以降=当月推計。quality:auditのops区分が日次通知）
npm run note-traffic-fetch # note ダッシュボード「アクセス状況」を read-only 取得→data/note/{referrers,articles-pv}/YYYY-MM.json（--month は今月/先月のみ・--commit で保存・--check は fixture で正規化の完走確認＝quality:audit ci・ログイン要・DN-0249）。流入元は自己閲覧を含み、サイト経由は PR #511 deploy 前は no referrer に含まれる
npm run note-sales-fetch  # note 売上履歴を read-only 取得→検算OKでdata/note/sales.jsonの当月を差し替え（--month YYYY-MM --commit・ログイン要・DN-0018）。パスワード再確認は資格情報 `doboku-note-auth-note`（CI は Secrets）で 1 回だけ自動で通す。`--no-auto-reauth` で人が通す。失敗印 `metadata/note.reauth-failed` は確認後に人が消す。前月の売上は note が翌月 2 日に確定するまで集計中で、その間は exit 8（PENDING・書き込みなし）
npm run record-net-receipts # 月の受取額（NSM）を事業の計測記録へ。note は売上管理の月別詳細の「手数料控除後売上」をブラウザで read-only 取得（パスワード再確認は資格情報 `doboku-note-auth-note` で 1 回だけ自動・通らなければ人）、KDP は data/kdp/royalties.json の catalog 対象・確定値、ココナラは `--coconala <円>`（控除後・クローズ日計上）。`--month YYYY-MM`、既定 dry-run・`--commit` で記録。3 つそろい KDP 確定のときだけ complete（欠測を 0 にしない）
npm run check-magazine-cta # 公開マガジンがサイトで1面以上CTAとして出るか（top/中間CTA/MagazineCard・quality:audit に同梱）
npm run audit-sns-landing-cta # SNS原稿・X予約のリンク先（転職・practice除く）に note 導線が冒頭側にあるか（ソース静的判定・quality:audit に同梱・DN-0364）
npm run check-sales-freshness # data/note/sales.json の転記停止（updatedAt）と、毎月5日以降に前月noteアクセス取得・月次売上表示との金額一致を検査（quality:audit の **ops 区分**＝ops-audit.yml が日次で Issue へ。取得自体は認証が要るのでローカル専用）
npm run check-weekly-review-due # 週次レビュー（ローカル実行・土曜）の忘れを催促（土曜 09:00 JST 以降に今週分、月〜金は先週分の *-review.md が無ければ exit 1・SessionStart フックが呼ぶ。最終 backstop は月曜の weekly-review-guard）
npm run check-note-public-view # note 公開記事を未ログインの読者の見え方で検査。全件は公開 API（添付 PDF の本数・価格・カバー・無料記事の全文会員限定・本文の画像が配信サーバーにあるか）。`-- --review` で代表ページ（資格×記事の種類ごと 1 本）を note のブレイクポイントの帯ごとの画面幅（config/public-view-breakpoints.json）でブラウザ検査（画像・リンクカード・はみ出し）・撮影し、CSS の切り替わり幅の変化も WARN。週次 note-public-view.yml は `--review`。全件をブラウザで開く `-- --all-pages` は手元向け（CI からは note が途中で 403 を返し続けて終わらない・2026-09-23 実測）。`-- --api-only` で API 層だけ。手元はシステム Chrome、CI は同梱 Chromium。5xx は 1 回やり直し、それでも 5xx なら「開けない」に数える。例外台帳は .claude/config/note-public-view.json
npm run check-youtube-public-view # YouTube の台帳で公開の動画の視聴ページに非公開・削除・再生不可が出ていないか（公開状態の API 照合は verify-yt-status）。`-- --review` で代表動画（Shorts・通常ごと 1 本）を YouTube のブレイクポイントの帯ごとの画面幅で撮影。週次 note-public-view.yml に同居
npm run fetch-note-public-view-shots # 週次 note-public-view の目視確認用の画像（note・YouTube の代表ページ × 画面幅）を .tmp/note-public-view-review/<runId>/ へ取る（/weekly-review でエージェントが見る）。exit 2 は未確認（run 無し・成果物切れ）。`-- --run <id>` で任意の run
npm run verify-note-status # frontmatter noteStatus ↔ note ライブ公開状態の照合（read-only・note-live-audit.yml 週次）。`-- --fix` はライブ published に合わせ既存 noteStatus 行だけ是正し、実際に書き換わった本数を「是正」と数える（CRLF 記事で 1 バイトも変わらず是正済みと数えた偽成功が 2026-09-19 にあり・書き換え不能は UNFIXED で exit 1）
npm run note-reconcile-title-price # note 商品の題名・価格を公開中の note と照合する（原稿が正・既定 dry-run・`-- --commit`・週次 note-live-audit.yml が回す）。食い違いは原稿へ取り込まず「note へ未反映」に戻す（題名＝titleHashes を外す→Mac note-sync-routine が title 部品で反映／価格＝metaHashes を外す→同期計画で止まり note-article-price-sweep で反映）。原稿の中では公開済みの title / price の欠けを埋め、見出し 1 を title に揃える。`--adopt-live` は note を正として原稿を書き換える一回きりの整理用（2026-10-01 に使用）
npm run check-membership-drip # 会員配信ドリップの遅れ・実体欠落（真実源＝メンバーシップ/README.md の配信表。予定日を1日以上過ぎた未配信は赤。日付をカードへ複製すると必ずずれるので複製しない・quality:audit の **ops 区分**＝PR は赤くせず ops-audit.yml が日次で Issue へ。2026-09-18 まで ci 区分に居て 30 日に 13 回 Pre-merge を落としていた）
npm run check-rccm-essay  # RCCM 問題III 模範論文の出題条件（模範論文 1,200〜1,600 字・指定用語「」4 語以上・①②見出し・問題再現節なし・paidBoundary 実在）。対象は content/note/RCCM/** の rccmKeywords 付き article.md。--staged は pre-commit、--strict は推奨帯外も違反（writer/qa の返却前ゲート）。対象 0 件は exit 2＝検査不成立（quality:audit に同梱）
npm run check-cce-essay   # コンクリート主任技士 小論文テーマ別教材の型（SSOT `config/cce-essay-history.json` の answerModel＝(1)表題〜(4)展望・(3)に8立場・字数帯・cceSourceYears と出題年の一致・必須見出し・問題文再現節なし・価格直書きなし・出題予測の断定なし）と、サイト/note の出題履歴ブロック（`cce-essay-history:start` マーカー間）が SSOT の生成結果と一致するか。--fix で履歴ブロックを再生成、--staged は pre-commit（SSOT が staged なら全件）。対象 0 件は exit 2（quality:audit に同梱）
npm run check-kindle-epub-leak # 配布EPUBに章名 article.mdx / YAML frontmatter が印字されていないか＋ソースMDXのBOM検査（BOMで frontmatter の ^--- が外れるのが真因。pre-commit は --bom-only・quality:audit に同梱）
npm run check-kdp-category-coverage # 新刊(buildSpec持ち)のid接頭辞がKDPカテゴリー(config/kdp-memo.json categoryAssign)へ明示登録されているか（未登録は警告なく既定「技術士」へ入稿される。2026-08-28 g-01実測の再発防止・quality:audit に同梱）
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
```

## ココナラ

```bash
npm run coconala-orders   # ココナラ受注＋購入前DMの実体を read-only 収集→orders-snapshot.json（Playwright・書き込みなし・定期取得は login-collectors.yml）
npm run coconala-talkroom -- <talkroomId> # トークルーム1件のメッセージと添付（原寸・docx は本文 .txt も）を .tmp/coconala/talkrooms/{id}/ へ取得（Playwright・送信なし・開くと既読になる）。添付はホバーで出るボタンの download イベントから署名URLを受けて取得＝saveAs を使わない。exit 2=添付の取りこぼし
npm run coconala-dm -- <dmId>        # DM 1件の全メッセージ（「過去のメッセージを読み込む」を増えなくなるまで展開）と添付を .tmp/coconala/dm/{id}/ へ取得（thread.txt・messages.json・attachments/）。Playwright・送信なし・開くと既読になる。DM の ID は orders-snapshot.json の inquiries[].dmId。添付はトークルームと違い .uploaded_files の通常リンク。exit 2=0件・展開しきれない・添付の取りこぼし
npm run check-admin-ui-debt          # 管理画面ページの生 card クラス・インライン style の件数をページごとの基準値（.claude/config/admin-ui-debt-baseline.json）と比べ、増えたら exit 1（新規ページは 0 件）。減らしたら --update で基準値を下げる。部品は tools/admin-app/src/components/ui/*・layout.tsx（DN-0432）
npm run check-shadcn-parity          # 管理画面の components/ui/*.tsx を shadcn/ui 公式の保存物（.claude/config/shadcn-reference）と data-slot・cva の variant ごとのクラス集合で比べる。差は .claude/config/shadcn-parity-allow.json に理由付きのものだけ許し、古い例外・参照の無い部品・ページでの Badge/Button/TabsTrigger の大きさの上書きも exit 1（DN-0432）
npm run sync-shadcn-reference -- [name]  # shadcn/ui 公式（new-york-v4 registry）から ui/<name>.tsx を取り直して .claude/config/shadcn-reference に保存（curl --ssl-no-revoke）。公式の更新を取り込むとき・新しい部品を足すときだけ手で実行し、差分を見てから部品側を追従させる
npm run check-coconala-orders # 上記 snapshot ↔ orders.json をオフライン突合（記録漏れ・金額ズレ・返信期限〔48h自動キャンセル〕・DM要対応）
npm run check-tensaku-reply -- <返信文> --source <提出原稿> --grade 1 # 添削・診断・作成の顧客返信文を送信前に検査（3000字・外部誘導・合格保証・下書き注記・書き換え例の（N字）表記と解答欄・原稿に無い工事の数値）。--source なしは exit 2（未検査を緑にしない）。意味の評価は civil-keiken-tensaku-qa
npm run check-kosshi-sheet -- <骨子シート> --source <ヒアリングシート> # S3 指導の骨子シートを送信前に検査（「」引用と数値がヒアリングシートに実在・引用の外の地の文は1行60字以内で句点なし＝答案の文章を書かない・各テーマに（1）（2）の区画・1引用30字以内・外部誘導/合格保証/下書き注記）。exit 0/1/2（2=--source なし）。civil-keiken-tensaku-qa が mode=kosshi で実行
npm run coconala-analytics # ココナラ分析画面（全体/サービス別/ブログ別）を read-only 収集→data/coconala/analytics.json（--append-kpi で kpi.json へ週次 upsert・定期取得は login-collectors.yml・Playwright・書き込みなし）
npm run check-coconala-analytics # 上記の鮮度・欠測・マスク値（0000は0でない）・kpi.json 整合をオフライン検査
npm run check-coconala-wiring # カタログ↔listings↔商品画像↔受注/KPI/売上の整合と、PDF の価格ルール（note 基準×1.1 以上）を検査（pre-commit --staged＋CI）
npm run check-coconala-live # ココナラ公開ページ（ログイン不要の構造化データ）の価格・タイトル・キャッチ・本文・出品者・販売状態をカタログ／listings と、出品者プロフィールの職業・アピール・自己紹介文を coconala-account.json と突合（exit 1=食い違い・2=取得失敗が過半で検査不成立・日次 ops-audit）
npm run coconala-pause    # ココナラ出品の受付休止/再開/アーカイブ（--resume --absence で不在明け一括復帰・既定 dry-run）
```

## SNS・動画

```bash
npm run check-video-content    # 動画パック（DN-0110）の整合ゲート（manifest/sourceRef 漏洩/CTA・UTM/storyboard/逐語転用/status。契約 SSOT は config/video-content.json と video-content-policy.md。exit 2=検査不成立・quality:audit に同梱）
npm run render-longform        # 動画パックの 16:9 通常動画レンダラー（storyboard→1920×1080 PNG＋ASS 字幕＋VOICEVOX/ffmpeg mp4。出力は .tmp/video-render/・音声環境無しは --skip-tts で PNG/ASS まで。VOICEVOXとffmpegがあればWindows/Macでmp4生成可・生成用Actionsは未設置）
npm run check-video-publication # 公開済み派生物の実体照合が回っているか（未照合・鮮度切れ・記録の孤児・実査ドリフト）。実査本体は verify-video-publication＝CI 週次(verify-yt-status.yml)で creds 必須・**対象0件は明示してPASS**・quality:audit に同梱
npm run x-own-metrics     # 自投稿の反応（いいね/RT）を採取→型×時間帯×導線の表（data/x/own-posts/・**中央値で読む**。impressions/replies は CLI が返さず取得不可）
npm run check-x-posted-live  # 投稿済み X の生存確認。posted_url を持つものだけログイン不要の oEmbed で照合（DN-0276・週次 link-audit.yml）。404=凍結/削除の疑い、posted_url が無い投稿済みの件数も出す（検査ゼロを PASS にしない）。posted_url は publish-x.ts が投稿直後にベストエフォートで書く
```

## Instagram・Cloudflare（CI 取得・freshness）

```bash
npm run fetch-ig-insights          # Instagram Graph API で media+insights+SoT 照合を取得→data/instagram/insights/・.claude/state/ig-reconcile/snapshot.json（CI 週次 fetch-ig-insights.yml が実行。0 件取得は exit 2＝成果物を書かない）
npm run ig-graph-token             # IG_GRAPH_ACCESS_TOKEN のローテ（長期トークン発行→ローカルで `gh secret set` へ手動投入。ローカル専用・秘密値を出力しない）
npm run fetch-cloudflare-analytics # Cloudflare GraphQL Analytics でゾーン別日次集計を取得→data/cloudflare/zone/（CI 日次 cloudflare-metrics.yml。0 件は exit 2）
npm run fetch-cloudflare-zone-config # Cloudflare ゾーン設定（キャッシュ/圧縮/WAF/Bot Management）を取得しドリフト検知→.claude/state/cloudflare/zone-config-latest.json（CI 月次 cloudflare-config-audit.yml。**ドリフト採用は `--accept-baseline` を人が確認してから**）
npm run check-ig-insights-freshness # IG 週次取得の停止とトークン失効 7 日前を検知（quality-audit の ops 区分・snapshot 0 件は FAIL）
npm run check-cloudflare-metrics-freshness # Cloudflare 日次/月次取得の停止を検知（quality-audit の ops 区分・zone snapshot 3 日超／config 10 日超で FAIL）
npm run fetch-afb-outcomes         # afb 公式 conversion API で成果（pending/approved/rejected・報酬額）を取得→data/afb/outcomes/（日付別の最新）（`--commit` 必須で書き込み・CI 週次 fetch-metrics.yml。AFB_API_KEY 必須・提携状態スキャンとは別系統）
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
npm run fetch-ga4-cta-clicks   # CTA イベント × pagePath（28 日・CI 週次）。`--by-device` / `--by-label` / `--by-placement`（後 2 つは要カスタムディメンション・未登録は exit 0）/ `--key-events`＝pagePath × sessions/keyEvents/sessionKeyEventRate（ga4-key-events-by-page-*.json・0 行は exit 1）
npm run fetch-ga4-web-vitals  # 実ユーザー計測（RUM）: サイトの web_vitals イベント（LCP・INP・CLS）を ページの型×端末×指標×評価 の件数で取り、良好率 75%/不良 25% 超で判定して data/rum/web-vitals/*.json へ（28 日・CI 週次）。要 GA4 カスタムディメンション metric_name・metric_rating（未登録は status: dimensions-missing で exit 0）。`--check`＝fixture で完走だけ確認（CI）
npm run gsc-indexing:check     # 未登録URLをGSC URL検査で診断（dry-run／:request で登録リクエスト・上限10件/回。`-- --urls /exam/a,/standards/b` か `-- --file list.txt` で正規パス指定。旧 /docs/slug は _redirects の 301 先へ自動変換）
npm run gsc-indexing:priority  # 最新 URL 検査 batch × GSC page 実績から登録リクエストの順位表を作る（CI が週次で commit。人間は data/gsc/indexing-priority.txt を :request に渡すだけ）
npm run check-gsc-indexing-due # 表示実績のある未登録が残っているのに 7 日以上リクエスト無しなら DUE（weekly-review-guard が surface・常に exit 0）
npm run gsc-sitemaps          # 本番 robots.txt の Sitemap 行（sitemap.xml・期限内の sitemap-legacy.xml）を Search Console API で送信（`-- --submit`・要サービスアカウントの「フル」権限）し、読み込み状況を data/gsc/sitemaps.json へ（fetch-metrics.yml が週次で実行・ログイン不要）
npm run check-gsc-sitemaps    # sitemaps-latest.json を見て、記録が古い・GSC 未登録・送信失敗・エラー・14 日以上未読み込みなら DUE（weekly-review-guard が surface・常に exit 0）
npm run gsc-local:install     # Mac の launchd に GSC のブラウザ作業を登録（毎日 10:30・寝ていた日は起床時に 1 回）: 順位表の先頭から登録リクエスト 10 件＋月次の理由別 UI CSV を、専用 worktree（.claude/worktrees/gsc-local・lock 済み）で回して台帳を develop へ push。`-- --status` / `-- --run-now` / `-- --uninstall`。前提は npm run google-console:login 済み。人の checkout で scripts/gsc-local-routine.mjs を直接叩かない（ブランチに乗った HEAD では拒否する）
npm run indexnow:submit        # sitemap の lastmod が直近 7 日の URL を IndexNow（Bing 等・Google 非対応）へ通知。CI は deploy 成功後に自動（indexnow-submit.yml）。`-- --dry-run` で対象だけ。会社 PC は Node fetch がプロキシを通らず exit 2
npm run check-experiment-due   # 実験台帳の再計測/close/decide 期限と要人手（pending_user_actions）を surface（計測→記録→改善→再計測の最後の輪。2026-09-19 に旧 check-experiments-due を統合＝判定は scripts/lib/experiment-due.mjs が唯一。`-- --json` で issues も出す）
npm run check-jst-date    # 運用記録の日付が UTC で前日付になっていないか（JST 09:00 前の実行事故・pre-commit 同梱）
npm run report-buildjob-affiliate # BuildJob クリック×A8 成果の EPC レポート→data/analysis/buildjob-report.md（月次レビューが読む。`-- --check` は書かずに完走だけ＝quality-audit ci）
npm run report-site-to-sales      # 暦月×note 商品で「サイトの note_cta_click → note のサイト経由閲覧 → 販売」を突合→data/metrics/business/site-to-sales-YYYY-MM.json（既定は直近の完了月・`-- --month YYYY-MM`。台帳は追記専用なので内容が変われば `-rN` を足す。GA4 は 28 日窓しか無いと window-mismatch・note 流入元は商品別に出ない＝unresolvable。`--check` は書かずに完走だけ＝quality-audit ci）
npm run report-career-funnel      # キャリアファネル（流入→回遊→CTA→成果）→data/analysis/career-funnel.{json,md}（`--freeze` で基線凍結＝**既存があれば exit 1 で中止**し latest も書かない。撮り直しは `--refreeze`。`--json`・`--check` は書かずに完走だけ＝quality-audit ci。GA4 と GSC は窓が違うので出所を跨いで割らない）
```

## 台帳・ドキュメント整合

```bash
npm run check-backlog-schema # backlog タグ行の語彙・[検証:]の実在・ID(DN-####)必須/重複・完了 prose の混入（pre-commit --staged ＋ quality:audit）
npm run check-backlog-health # 台帳の候補 surfacer（🟢に沈んだ不具合・種類の矛盾・重複候補・検証ゲート欠落。判定はせず常に exit 0）
npm run check-codex-compat   # AGENTS.md（共通規約＋rules参照索引）/ .agents/skills / .codex/agents / .codex/hooks.json が正典（CLAUDE.md + .claude/rules / .claude/skills / .claude/agents / .claude/settings.json）の生成物と一致するか（第2SSOT再発防止・pre-commit --staged はGit blob一括取得＋変更したindexのruntime参照、通常/CIは全域走査 ＋ quality:audit・再生成は sync-codex-compat。2026-09-14 から agent toml と hooks.json も生成物＝手で編集しない）
npm run sync-codex-compat    # 正典から AGENTS.md / .agents/skills / .codex/agents/*.toml / .codex/hooks.json を再生成（孤児は削除）
npm run setup-memory-link    # Claude Code の auto-memory（~/.claude/projects/<key>/memory）を repo の .claude/memory へ junction/symlink（初回は `-- --migrate` で既存 memory を移す・`--settings <dotfiles の json>` で settings.local.json も張る・既存の実ディレクトリは消さず .bak へ退避。両 PC で同じ memory を読ませる）
npm run check-memory          # エージェントの記憶（.claude/memory）の frontmatter・名前重複・索引の網羅・MEMORY.md の読み込み上限（200 行 / 25KB。超えた分は黙って読まれない）。`-- --local` でこの PC のリンク（~/.claude/projects/<key>/memory → .claude/memory）と別同期フックも見る。SessionStart は `--session`（worktree のキーにリンクが無ければ自動で張る）。記憶だけの develop push は CI を走らせない（ci.yml paths-ignore）ので pre-commit が唯一のゲート
npm run check-claude-md-size   # CLAUDE.md（毎ターン再送される核）が 150 行 / 20KB 以下か・12 原則の見出し・.claude/rules の paths: 必須（pre-commit で CLAUDE.md / rules を stage したとき ＋ quality:audit）
npm run check-agent-descriptions # .claude/agents/*.md の description が 300 code points を超えて増えないか（81 件すべてが毎セッションの system prompt に載る。全件を上限内へ短縮済み・baseline 超過 0 件・pre-commit --staged ＋ quality:audit・`--update-baseline` で締める）
npm run session-start        # SessionStart の 9 検査（git-sync / shared-policy / plan-staleness / backlog-due / weekly-review-due / gsc-login / resources / disk-hygiene / x-sync）を 1 プロセス内で順次実行し、出力が非空の検査だけ表示（.claude/settings.json の SessionStart はこれ 1 本。各 script が export する run() を import して呼ぶので子の node は立たない・DN-0236。検査を足すときは run({ argv, quiet }) を export し scripts/lib/cli-run.mjs の sink へ書く）
npm run check-project-task-refs # docs/ の恒久文書の廃止参照(task-queue.json)と backlog ID 参照切れ（quality:audit に同梱）
npm run check-information-architecture # 4 領域（docs/content/.claude/実装）への逆戻り検知（廃止した置き場への新規ファイル・docs への制作物混入・content への台帳混入・二重 SSOT。pre-commit --staged ＋ quality:audit）
npm run check-relative-links   # Markdown の相対リンク `](../x)` の実在（check-doc-refs はリンク**テキスト**しか見ないので、置き場を変えると href だけ黙って壊れる。pre-commit --staged ＋ quality:audit）
npm run business-review       # 資格別KPI・週次/月次レビュー期日の確認（-- report --monthly で前月）
npm run fetch-business-metrics # GSC/GA4の資格別・完了週/月の集計取得（--commitで追記）。GSC確定前（終了日から4日未満）の期間だけskipし確定済みは取得、明示 --monthly が未確定なら exit 2
npm run fetch-growth-pack      # 成長パック: 前の完了週（月〜日・JST）＋直前28日基線で GA4（landing×流入元・page×イベント）と GSC（page・page×query）を全件取得 → metrics/growth/pack-YYYY-Www.json。--week で過去週。罠: GSC確定前の週は exit 2（取得しない）
npm run fetch-bing-webmaster   # Bing Webmaster API（query/page/日次traffic・直近12週）→ metrics/bing/。要 BING_WEBMASTER_API_KEY（無ければ exit 2・0と記録しない）
npm run ga4-admin-api:check    # GA4 Admin API でカスタムディメンション・キーイベント・データ保持を観測（--commit で ga4-admin/inventory-latest.json）。閲覧者で可。API未有効化/権限不足は exit 2
npm run ga4-admin-api:apply    # desired state の不足キーイベントを作成（既定 dry-run・--commit で作成）。要: サービスアカウントを GA4 編集者に
npm run growth-digest          # 機会ダイジェスト: 成長パック×収益カバレッジ×Bing×実験台帳×triage-log から週次トリアージ対象を安定ID付きで抽出 → growth/digest-YYYY-Www.json。--print で週次レビュー埋め込み用 Markdown（書かない）、--week で指定週、--check は書かずに完走確認。罠: パックが無ければ exit 2
npm run measure-experiments    # measure 仕様を持つ running/measuring 実験を前後の窓で自動計測（GA4/GSC/売上台帳）。既定 dry-run・--commit で measurements[] へ追記（冪等）。CI は fetch-metrics の publish 内で実行。罠: 売上は窓にかかる月がすべて note の確定日（翌月 2 日）以降に取得・検算された月（sales.json の months[YYYY-MM].finalized）になるまで確定扱いにせず、途中の計測しか無い窓は確定したときに測り直す
npm run growth-triage          # 週次レビュー（ローカル）で機会ダイジェストを全件処分: list [--json] → apply --decisions .tmp/growth-triage-YYYY-Www.json [--commit]（backlog/実験/watchword/裁定/束ね/却下/保留を採番・起票・triage-log 記録）。罠: DN 採番に git 全履歴が要る（shallow clone は exit 2）・全件を先に検証し 1 件でも不正なら何も書かない
npm run check-growth-triage    # 月曜 guard: 最新ダイジェストの未処分 0・レビューにマーカー（申し送りの振り分けは check-handoff-extraction）。exit 1 未反映 / 2 ダイジェスト/レビュー無しか古い
npm run check-business-direction # 事業方針・指標・履歴・追記専用の検査
npm run exam-ssot-status # 資格の正本（日程・受験者数・出題形式）の照合状態＝要対応（未確認・原文未照合・180日超・次年度日程未登録・統計が古い）と記録（発表待ち・非公表）。月次レビューが読む（`-- --json`／`-- --check` は完走だけ＝quality-audit ci）
npm run qualification-market # 資格ごとの展開の判断材料（自分で書く区分＝経験記述・論文とその受験者数・買われる時期・売上・YouTube/note/ココナラの混み具合・X/IG 追跡数）。管理画面 戦略＞資格と市場＞展開の判断と同じ実装（`-- --json`／`-- --check`）。要対応（市場スキャンの未取得・90日超・出題形式の未確認）があっても exit 0
npm run check-past-exam-inventory # 過去問の年度在庫台帳（past-exam-inventory.json）と Drive 台帳の整合。FAIL＝台帳の不整合のみ（資格 id・textbook-source-pdf に当たらないパス・取得済みなのに実体無し）。WARN＝掲載中の未取得・最古年度の消失見込み（windowYears があるとき）・Drive 未退避・試験日＋publishLagDays 経過で今年度の行が無い。月次レビューが読む。罠: CI は手元の PDF を見ないので「Drive 台帳に未登録」は WARN 止まり
npm run past-exam-fetch      # 過去問の年度在庫台帳の未取得行を公式 sourceUrl から content/sources/past-exams/{資格}/{年度}/ へ取得し acquiredAt を書く（既定 dry-run・--commit・--exam/--year で絞る）。curl --ssl-no-revoke・%PDF- 以外は不採用。手順全体は /past-exam-archive
npm run drive-browser-transfer -- plan|upload|upload-tree|resolve|verify # Drive マウントも rclone も無い端末から Playwright の Google プロファイルで Drive vault へ置き、CDP で全バイト読み戻して drive-connector-register 用 receipt を作る。フォルダ作成と一覧は Drive MCP。罠: upload の SENT は実在確認ではない（verify が確かめる）・別プロファイル Chrome 稼働中は DOBOKU_PW_ALLOW_PARALLEL=1
npm run check-qualification-market # 展開の判断材料の正本の整合（market-scan の検索語とタイトル条件・*-competitors の exams が資格 id・売上がすべて資格へ分類できる）。CI ゲート。売上の新しい productId は product-lineup.json の salesRules に足す
npm run check-qualification-ssot # 資格の名前（正式名・短い名前・ごく短い名前）・まとまり（groups）・並び順が qualification-registry.json だけにあるか。設定（.claude/config・.claude/knowledge・src/config の JSON）の写し、書き込み先（categories・home-exam-cards・tags）と registry の食い違い、コード（scripts・.claude/scripts・tools/admin-app/src・src）の資格 id（またはカバー/導線の別名キー）→ 日本語の対応表を 1 件でも止める。CI ゲート＋pre-commit。管理画面 管理＞設定 で qualification-registry.json を開くと同じ結果が出る（`-- --json`）。罠: 試験の正式名など資格名と別の属性は qualification-ssot-allow.json に理由つきで登録、コードの誤検出（名前でない日本語）は行末か直前の行に `qualification-ssot: allow <理由>`。名前は scripts/lib/qualification-names.mjs（サイトは src/lib/qualification-names.ts）で引く
npm run sync-qualification-names # registry の正式名を src/config の categories.json・home-exam-cards.json・tags.json の資格の項目へ書く（`-- --check` は食い違いで exit 1）。slug が registry の id と違う項目は `qualification:` で資格 id か group id を指す。registry の名前を変えたら実行してコミット
npm run report-competitor-watch # ココナラ競合の変化（値下げ・出品増減・累計販売 +20 件以上）と追跡外の候補（関連サービスの販売実績 20 件以上）・売上推定が一部だけの売り手。committed state を読むだけ（取得しない）。読み手＝週次レビュー。exit 2＝state が読めない
npm run report-search-opportunities # 検索キーワード戦略（config/search-strategy.json）のクラスター別の表示・1桁件数・11〜30位件数と約28日前との差、改善候補（11〜30位で表示のある検索語をページ単位に束ねたもの・観察中/起票済み/旧URLに印）。GSC の検索語×ページ集計を読むだけ。読み手＝週次（起票）・月次（推移）。exit 2＝集計が無い
npm run report-web-vitals     # 実ユーザー計測の最新記録を読み、手を打つ組（不良・要改善で件数 30 以上）を先に出す。読み手＝週次レビュー（不良が出たら改善カードを起票）。exit 2＝記録が無い・10 日超・カスタムディメンション未登録
npm run x-profile-sync    # X の自己紹介を正本 config/x-account.json の profile.bio に合わせる。既定 dry-run（差分表示）、`-- --commit` で書き換えて表示の一致を確認。ログイン中が handle 以外なら ABORT（exit 2・別アカウントは書き換えない）。上限は limits.bio
npm run check-review-wiring # 週次・月次レビューのスキルが実行するコマンドと配線の正本（.claude/config/review-wiring.json・stage と role）の一致。CI ゲート。スキルにコマンドを足したら正本にも stage・role 付きで足す。管理画面 戦略 ＞ レビュー の配線図の元
npm run review-checks -- --cadence monthly --run YYYY-MM --write # レビューの回ごとに点検（review-wiring.json の checks）を実行し、開いている Issue・Dependabot の脆弱性と一緒に data/metrics/business/checks-<回>-<時刻>.json へ追記。レポートの「点検と Issue」で全件に行き先が無いと管理画面の手順が「一部」。置き場は追記だけ（上書き・削除は check-business-direction が止める）
npm run check-monthly-review-due # 月次レビューの催促（SessionStart）。毎月 3 日（JST）以降に前月を対象にした月次レビューの記録（business/review-*.json の cadence:monthly）が無ければ exit 1 で 1 行出す。`-- --json`
npm run backlog-gate      # 週次・月次レビューのバックログの関門（読み取り専用）。`-- --weekly`＝判断待ち🟣の全件・期日切れ・直近7日の起票、`-- --monthly`＝時期の無い🟢の全件・起票から90日超・今月の🔴🟡件数。`--json` あり。運営者に諮った結果で台帳を直すのはレビュー側（判定は scripts/lib/backlog-gate.mjs）
npm run roll-backlog-when # 終わらなかったカードを翌月へ回す（`[時期:]` の終わりが今月より前のカードの終わりを今月へ延ばす・開始は残す）。既定は表示だけ、`-- --write` で backlog.md を書き換え、`-- --month YYYY-MM` で基準月。月初の月次レビューが回す。終わったカードは回さずに削除する
npm run scan-qualification-market # 資格キーワードで YouTube（yt-dlp 検索）・note（公開検索 API）を取り data/analysis/qualification-market/YYYY-MM-DD.json へ（同日の再実行は取得済みの語を飛ばす・`--force` で取り直し）。`--coconala` でココナラも（coconala-research.mjs・Playwright・四半期 1 回）。`--qualification <id>`／`--channel youtube|note|coconala`／`--dry-run`。罠: note は JSON 以外（403）が返った時点で打ち切る＝連打しない。ココナラは空きメモリが足りないと Playwright ガードで起動しない
```
