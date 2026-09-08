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
npm run quality:audit     # コード・記事・画像/SVGの機械チェックを横断実行→.claude/state/quality/audit-latest.md（:ci でCI gate厳格版）
npm run refresh-indexes   # 静的インデックス再生成（backlinks + cross-exam + tags + pillar問題 + popular記事[GA4] + 頻出論点）
npm run admin             # 運営管理画面 Next.js 版（ローカル専用・http://127.0.0.1:3021・計測/エージェント/スキル/ギャラリー/SNS状態/記事/売上/品質/ジョブ/TODO/**プロジェクト**/**ライフサイクル横断 `/content/lifecycle`**/**動画パック `/content/video`**・tools/admin-app）
npm run test:e2e:admin    # 管理画面の E2E（Project↔TODO の相互リンク・日本語パス・トラバーサル404・レスポンシブ。admin は dev 専用なので CI の e2e には載せない）
npm run check-e2e-targets      # E2E が叩くサイト内 URL が out/ に実在するか（`_redirects` の転送元を叩くと dev で必ず 404 になり、検査が成立しないまま赤が放置される）。**要 `npm run build`** なので quality:audit ではなく ci.yml / e2e.yml の build 後に置く。exit 2=検査不成立
npm run check-production-ssr # deploy 後の本番 SSR 検証（exit 0=正常 / 1=壊れている / **2=検査不成立＝接続できていない**。会社PCの HTTP 000／プロキシのブロック HTML をサイト障害と誤読しない・手打ち curl で代用しない・/deploy Step 7.5 が呼ぶ）
npm run check-command-guidance # 検査やスクリプトが案内するコマンド（npm run / node パス）が実在するか。**正典ドキュメント（CLAUDE.md / AGENTS.md / この一覧 / .claude/rules）の案内も対象**（記載はあるが package.json に無い `npm run serve` を 2026-08-30 まで放置していた再発防止）
npm run schedule-view     # 予約・計画・期日の横断ビュー（読み取り専用・JST。exam-calendar/x-campaigns/x-status/ig-status/youtube-schedule/backlogを集約。DN-0131のような超過を横断で surface する）
```

## 記事・MDX の検査

```bash
npm run check-mdx-dates      # 記事の created/dateModified が frontmatter に揃っているか（sitemap lastmod と JSON-LD datePublished の真実源。欠けるとビルドが git 履歴へフォールバックし、公開 SEO 信号がリネームや履歴書換えで動く状態へ逆戻りする。書き込みは pre-commit の backfill-mdx-dates --staged）
npm run check-bold-rendering # 太字が実際に描画されるか（remark で実パースし text に ** が残る＝崩壊を検出・quality:audit に同梱）
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
npm run check-git-binary-policy # 生成物・著作権物・巨大blob・拡張子偽装・同一原本の二重生成の**新規追跡**を baseline ラチェットで止める（設定 .claude/config/git-binary-policy.json・pre-commit --staged ＋ quality:audit・DN-0111 Phase 1）
npm run asset-offload         # 追跡アセットを R2 へ退避（既定 dry-run・--commit で実行。upload 後に bytes と sha256 を R2 から読み直して検証してから manifest へ記録。ローカル削除と untrack はしない。**--verify** で追跡解除前の全件照合〔ローカル実体・manifest・R2 の 3 者一致〕を行い、--out に untrack できる一覧を書く。1 件でも欠ければ exit 1）
npm run asset-hydrate         # 退避したアセットを取り戻す（ローカル→cache→R2→generator の順・--offline で cache のみ・--path で部分取得）
npm run check-asset-storage   # 退避台帳の整合（公開バケット誤配置・r2Key 衝突・復元不能・秘密混入）。R2 非アクセスでオフライン完結・quality:audit に同梱
npm run drive-vault-sync      # **人か手元のスクリプトだけが使う**アセット（原本PDF・ページ画像・配布PDF・未投稿レンダー等）を Google Drive vault へ置く／取り戻す（既定 dry-run・--commit・--from-r2・--dedupe-by-sha・--verify [--deep --cloud]・--pull）。置き場は誰が使うかで決める＝サイト配信→public R2／CI→private R2／人→Drive（asset-storage-policy.md §1・/asset-route）
npm run check-drive-vault     # 置き場ルールのゲート（asset-storage.json の全 group に audience・site⇒public・ci⇒private|byVisibility・human は理由無しに R2 へ置けない）＋R2 と Drive の同一パス衝突＋drive-manifest の整合。**マウント無しは「実体検査 0 件」と明示**して設定・台帳だけで判定・pre-commit --staged-only ＋ quality:audit
npm run check-reference-sources # 参考文献台帳・記事 sources ID・出典粒度・非公開文字起こし名の漏洩・未付与 baseline ラチェットを検査（--staged は pre-commit）
npm run check-reference-sources:deep # Drive の文字起こし frontmatter↔原本台帳と、市販書籍由来記事の40文字以上の逐語一致0を実体照合（Mac・Driveマウント要）
```

## 公的基準（共通仕様書の章記事・ページ画像）

```bash
npm run build-standard-articles # 公的基準の逐語文字起こし→編・章・節の構造化章記事を生成（`content/site/standards-articles/`。章は PDF 分冊でなく原本の柱＝編・章で切る。対象と canonical 機関は .claude/config/standards-structure.json）
npm run build-standards-comparison # 近畿版を基準に各地方整備局版の本文差分を章・行単位で生成（`content/site/standards-articles/comparison.json`）
npm run build-standards-data     # 構造化章記事から公開用 Markdown / JSON-LD / 索引JSONを `public/standards-data/` へ生成（派生物・Git追跡外・本番build同梱）
npm run check-standards-data     # 公開用データ全章の形式・条数・出典/加工主体分離・noindex/CORSヘッダーを検査（build-standards-dataが自動実行）
npm run build-standards-ogp     # 章記事ごとの OGP 画像を生成（章は MDX でないため `npm run ogp` の射程外。描画は ogp-create の lib を再利用し見た目をサイトと揃える。R2 供給は ogp-supply.yml が代行）
npm run check-standard-articles # 上の 15 検査（本文の取りこぼし0・全ページ割当・条番号整合・見出しレベル・SHA-256 一致・重複 indexable・**catalog 72 文書の被覆と除外理由の実データ検証**・表の可逆性・**章ごとの OGP 被覆**。exit 2=検査不成立）
npm run build-standards-page-images # 公的基準の原本PDF→**1ページ1画像+1テキスト**（270dpi/2233px JPEG＋pdftotext のページ分割）。章記事が part-NN.md（50ページ束）までしかページ情報を持たず「原本の何ページか」を機械で言えない問題を埋める。原本の同定はファイル名でなく **sha256**（Drive のファイル名は整理で動くため）。**実体は Google Drive vault の原本 PDF と同名フォルダ（隣）**、Git には manifest.json だけ
npm run check-standards-page-images # 上の provenance 整合（catalog↔manifest の原本 sha256・ページ 1..N の被覆・part 範囲・画像 sha256 のサンプル照合。実体が無い端末では manifest のみ検査しその旨を明示・quality:audit に同梱）
```

## note・会員・売上・Kindle

```bash
npm run kdp-report        # Kindle 月次ロイヤリティを KDP レポートから取得→.claude/state/sales/kdp-royalties.json（ローカル専用・読み取り専用・当月/前月のみ）
npm run note-sales-fetch  # note 売上履歴を read-only 取得→検算OKで.claude/state/sales/sales-log.jsonの当月を差し替え（--month YYYY-MM --commit・ログイン要・DN-0018）
npm run check-magazine-cta # 公開マガジンがサイトで1面以上CTAとして出るか（top/中間CTA/MagazineCard・quality:audit に同梱）
npm run check-membership-drip # 会員配信ドリップの遅れ・実体欠落（真実源＝メンバーシップ/README.md の配信表。予定日を1日以上過ぎた未配信は赤。日付をカードへ複製すると必ずずれるので複製しない・quality:audit に同梱）
npm run check-kindle-epub-leak # 配布EPUBに章名 article.mdx / YAML frontmatter が印字されていないか＋ソースMDXのBOM検査（BOMで frontmatter の ^--- が外れるのが真因。pre-commit は --bom-only・quality:audit に同梱）
npm run check-kdp-category-coverage # 新刊(buildSpec持ち)のid接頭辞がKDPカテゴリー(.claude/config/kdp-memo.json categoryAssign)へ明示登録されているか（未登録は警告なく既定「技術士」へ入稿される。2026-08-28 g-01実測の再発防止・quality:audit に同梱）
```

## ココナラ

```bash
npm run coconala-orders   # ココナラ受注＋購入前DMの実体を read-only 収集→orders-snapshot.json（ローカル専用・Playwright・書き込みなし）
npm run check-coconala-orders # 上記 snapshot ↔ orders-log をオフライン突合（記録漏れ・金額ズレ・返信期限〔48h自動キャンセル〕・DM要対応）
npm run coconala-analytics # ココナラ分析画面（全体/サービス別/ブログ別）を read-only 収集→analytics-snapshot.json（--append-kpi で kpi-log へ週次 upsert・ローカル専用・Playwright・書き込みなし）
npm run check-coconala-analytics # 上記の鮮度・欠測・マスク値（0000は0でない）・kpi-log 整合をオフライン検査
npm run coconala-pause    # ココナラ出品の受付休止/再開/アーカイブ（--resume --absence で不在明け一括復帰・既定 dry-run）
```

## SNS・動画

```bash
npm run check-video-content    # 動画パック（DN-0110）の整合ゲート（manifest/sourceRef 漏洩/CTA・UTM/storyboard/逐語転用/status。契約 SSOT は .claude/config/video-content.json と video-content-policy.md。exit 2=検査不成立・quality:audit に同梱）
npm run render-longform        # 動画パックの 16:9 通常動画レンダラー（storyboard→1920×1080 PNG＋ASS 字幕＋VOICEVOX/ffmpeg mp4。出力は .tmp/video-render/・会社PCは --skip-tts で PNG/ASS まで、mp4 は Mac/Actions）
npm run check-video-publication # 公開済み派生物の実体照合が回っているか（未照合・鮮度切れ・記録の孤児・実査ドリフト）。実査本体は verify-video-publication＝CI 週次(verify-yt-status.yml)で creds 必須・**対象0件は明示してPASS**・quality:audit に同梱
npm run x-own-metrics     # 自投稿の反応（いいね/RT）を採取→型×時間帯×導線の表（.claude/state/x-metrics/・**中央値で読む**。impressions/replies は CLI が返さず取得不可）
```

## 計測・GSC・GA4・期日

```bash
npm run google-console:login   # GSC/GA4 用 Chrome プロファイルを headed で開き人間ログイン（ローカル専用・/google-search-growth の前提）
npm run search-growth:report   # GSC UI 正規化 ∪ API データを URL 突合して修正計画を再生成（オフライン・approval gate）
npm run check-gsc-ui-due       # GSC/GA4 UI 取得の月次期限＋前回の完全性を判定（surfacer・weekly-review が読む）
npm run check-google-ui-ssot   # UI CSV 情報の追跡 SSOT の整合ゲート（marker↔history↔urls・検査ゼロを FAIL）
npm run ga4-admin:check        # GA4 管理画面の設定を desired state と突合（dry-run／:apply で不足カスタムディメンションを作成）
npm run check-ga4-dimensions   # GA4 カスタムディメンション（event_label/cta_placement）のドリフト検知（オフライン）
npm run gsc-indexing:check     # 未登録URLをGSC URL検査で診断（dry-run／:request で登録リクエスト・上限10件/回）
npm run check-experiment-due   # 実験台帳の再計測/close 期限を surface（計測→記録→改善→再計測の最後の輪）
npm run check-jst-date    # 運用記録の日付が UTC で前日付になっていないか（JST 09:00 前の実行事故・pre-commit 同梱）
```

## 台帳・ドキュメント整合

```bash
npm run check-backlog-schema # backlog タグ行の語彙・[検証:]の実在・ID(DN-####)必須/重複・完了 prose の混入（pre-commit --staged ＋ quality:audit）
npm run check-backlog-health # 台帳の候補 surfacer（🟢に沈んだ不具合・種類の矛盾・重複候補・検証ゲート欠落。判定はせず常に exit 0）
npm run check-codex-compat   # AGENTS.md / .agents/skills が正典（CLAUDE.md / .claude/skills）の生成物と一致するか（第2SSOT再発防止・pre-commit --staged ＋ quality:audit・再生成は sync-codex-compat）
npm run check-project-task-refs # docs/ の恒久文書の廃止参照(task-queue.json)と backlog ID 参照切れ（quality:audit に同梱）
npm run check-information-architecture # 4 領域（docs/content/.claude/実装）への逆戻り検知（廃止した置き場への新規ファイル・docs への制作物混入・content への台帳混入・二重 SSOT。pre-commit --staged ＋ quality:audit）
npm run check-relative-links   # Markdown の相対リンク `](../x)` の実在（check-doc-refs はリンク**テキスト**しか見ないので、置き場を変えると href だけ黙って壊れる。pre-commit --staged ＋ quality:audit）
```
