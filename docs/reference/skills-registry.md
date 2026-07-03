---
title: スキル ガバナンス記録
---

# スキル ガバナンス記録

`.claude/skills/` の設計変更・退役ログ・カテゴリ変更履歴の唯一の真実源。

**スキルの一覧・用途・トリガー** は `docs/reference/skills-guide.md` を参照。
**スキル設計原則・作成手順** は `docs/reference/skills-design-guide.md` を参照。

---

## カテゴリ構造（件数の SSOT＝`find .claude/skills -name SKILL.md` 実数）

> このツリーがスキル件数の**唯一の真実源（SSOT）**。CLAUDE.md など他 doc は件数を重複記載せずここを指す。スキルを追加/削除したら同一 commit でここを更新する（`/doc-declutter` → `doc-curator` でドリフトを棚卸し）。

```
.claude/skills/
├── authoring/       # 11 — 記事を作る
├── conversion/      # 5 — 形式変換（MDX / OGP 画像 / 紙用 PDF）＋ OGP 意匠の素案試作
├── quality/         # 14 — MDX・note 公開前品質検査
├── management/      # 14 — 計画・分析・戦略
├── dev/             # 13 — 開発・CI/CD
├── analytics/       # 2 — サイト分析
├── social/          # 22 — SNS 投稿
├── metrics/         # 1 — 売上記録
└── ui/              # 1 — UI/UX デザイン
```

合計 **83 スキル**（9 カテゴリ・SKILL.md 実数）。Phase 2 待機 6 本（`skills-guide.md` 末尾）は**計画のみ＝ファイル未作成**なのでこの数に含めない。

> 2026-07-04 退役（棚卸し）: `authoring/exam-guide`（＋`authoring/templates/exam-guide/` 全5テンプレ＝`_schema.md`/`_new-exam-template.md`/`civil-construction-1.md`/`civil-construction-2.md`/`pe.md` と親 `templates/README.md`）を退役。合計 `84→83`・`authoring/ 12→11`。退役理由＝(1) テンプレが旧 Docusaurus アーキ（`:::note[]` admonition・`content/general/…` source_paths・`docs/exam/…` 旧 URL・`sidebar_slug`/`sidebar_label`）のまま死んでいた、(2) 実運用の新規ガイド生成は `group: guide` の品質サイクル（`guide-qa`／`guide-rewriter`／`guide-fact-checker`）主導のオリジナル散文フローに移行済み（2026-07-03 civil1 textbook→guide 13章展開は `/exam-guide` を経由していない＝commit `279760cb5` 等）。以後の新規ガイドは同サイクルへ一本化。退役の詳細行は「退役ログ」節も参照。

> 2026-07-03 件数是正（棚卸し）: `management/ #13→#14`・合計 `81→84` に是正（実数 `find .claude/skills -name SKILL.md` = 84 と突合）。ドリフト根因＝`check-doc-coupling` は SKILL.md 追加/削除時に registry を **staged にしたか** は強制するが **中の件数が正しいか** は検証しないため、追加時にファイルは触られても件数が更新されず放置されていた。`skills-guide.md` は用途別クロス掲載のため行数＝件数ではない（総数は記載しない方針）。

> 2026-07-01 新設（content-line 配線ドリフト ガード）: `scripts/check-magazine-wiring.mjs`（pre-commit・機械）＝keiken マガジンを答案マーカーで内容判定し `keiken-charcount.mjs` の探索フィルタでカバーされない dir を落とす。あわせて `keiken-charcount.mjs` を pre-commit ゲート化（`--staged --strict`・従来は建設部門 BK 限定 `check-note-charlimits` のみで**土木 keiken は字数ゲート無防備**だった）＋探索フィルタに「想定工事バンク」を追加。`civil-keiken-essay-writer` に4種目（想定工事バンク・工事軸）追記＋`agents-registry` 同期、`sales-recorder` に `civil-2-koji-bank` マッピング追加、`note-magazines.ts` に新マガジン配線チェックリストを明文化。SSOT は `docs/reference/information-architecture.md`「SSOT と参照規律」ドリフトガード表（配線行）。背景: 2026-07-01 想定工事バンク36本が dir 名に「経験記述」を含まず一括字数チェックを全スキップしていた修正漏れの再発防止（[[feedback_new_magazine_wiring_gate]]）。スキル/エージェント件数は不変（ゲート追加のみ）。
> 2026-06-19 新設（GSC 継続管理の統合再設計）: `management/gsc-review`（月次 GSC **index coverage** レビューのオーケストレータ・user-invocable）。あわせて **新エージェント `gsc-index-auditor`（Evaluator・sonnet・audit-only）** ＝URL Inspection から coverage_state 7バケット分類・`indexed_ratio`・履歴差分・原因バケット（権威性/技術/hygiene）を診断（performance を見る `metrics-analyzer` と直交）。取得は CI `index-coverage.yml`（月次 cron・全 sitemap URL を URL Inspection→`url-inspection/*.json`＋`index-coverage-history.json` を develop commit）、履歴追記は `scripts/append-coverage-history.mjs`（冪等・creds 不要）、母集合生成は `scripts/list-sitemap-urls.mjs`（公開 sitemap・creds 不要）。**SSOT は `docs/reference/gsc-management.md`**（分業表・閾値〔indexed_ratio 警戒<60%・目標≥80%〕・判断マトリクス・観測/判断ログ。memory `reference_gsc_diagnosis_toolkit` を移植）。**休止中 `seo-auditor` を退役**（責務を coverage/performance/CWV に分割・参照15箇所を再配線）。背景: 2026-06-19 のトラフィック減調査で「サイト約半分が未 index（原因はドメイン権威性）」が真因と判明したが継続追跡の担当が無かった。スキル件数 80→81・management 12→13、agent 件数は不変（+gsc-index-auditor / −seo-auditor）。
> 2026-06-18 新設（SVG 図版監査・外科修正・目視ギャラリー）: 新エージェント `svg-figure-auditor`（Evaluator・sonnet・audit-only）＝site（`.local/r2/posts/**/img/*.svg`）と note（`docs/note/**/img/figure-*`）を横断で図版 SVG を 4 軸監査（site=`svg-tokens.json`/`image-policy.md`/`principles.md`、note=`note-svg-policy.md`。機械 svg audit P1-P8 の上の意味層＝概念伝達・alt・可読性・本文結線）。`svg-figure-rewriter`（Generator・sonnet）＝指摘を SVG ソースに外科適用（色 token 化/font 引上げ/矢印 marker 統一/必須属性補完/重なり調整。site は `audit.mjs` で HIGH=0 自己確認・note は figure-*.svg 修正後に render で PNG 再生成）。**旧 `note-figure-auditor` を吸収し退役**（守備範囲を site/note 横断へ拡張）。あわせて `npm run svg-gallery`（`scripts/svg-gallery.mjs`）＝site/note 図版を1枚 HTML で目視確認（**site/note タブ＋タブ内 資格別フィルタ**・`ogp-gallery` パターン＋site は `svg-audit.json` 重大度バッジ。`--all` は後方互換 no-op＝note は常にタブ表示）。既存 `build-gallery-comment.mjs`（GitHub コメント用 Markdown）は用途別で残置。配線替え: `/note-prepublish-review` Phase 2 の図版監査・`/create-svg` の skills-guide 行・`check-mdx` SKILL のギャラリー節を更新。agents-registry 件数 50→51（スキル件数は不変）。
> 2026-06-17 追加（ドキュメント ライフサイクル監査）: `dev/doc-declutter`（doc の**肥大化棚卸し**＝完了 handoff の退避・古い行の trim・重複 doc の統廃合）。あわせて **新エージェント `doc-curator`（Evaluator・sonnet）** を新設＝候補 doc を KEEP/TRIM/ARCHIVE/DELETE/CONSOLIDATE に分類（**親が渡した外部実体の検証済みシグナルに基づき判定・doc の自己申告で done と決めない**・自動修正/退避はしない）。機械 surfacer `scripts/check-doc-lifecycle.mjs`（`npm run check-doc-lifecycle`・鮮度/orphan/PR・commit 言及で候補を非ブロッキングに列挙）も新設し、pre-commit hook `check-doc-sync.sh` に「active handoff が一定数を超えたら `/doc-declutter` を促す」nudge を追加。**`/doc-sync`（コード変更起点の prose 陳腐化）とは守備範囲が直交**（こちらは doc 自体のライフサイクル）。安全則は今セッションの handoff 整理の実体験から導出＝①外部実体（PR merged・published:true・deploy・ファイル実在）を検証してから処分、未確認なら DELETE せず ARCHIVE ②退避≠削除（恒久 SSOT が内容を完全保持する時のみ DELETE）③参照は同一 commit で `_archive/` パス or SSOT へ張り替え（`check-doc-refs` ゲート）④`git commit -- <pathspec>` で並行セッションを巻き込まない ⑤memory も同期。`user-invocable: true`（退避/削除/参照更新の副作用が大きい）。
> 2026-06-24 拡張（`--scanned` 経路B＋図品質ループ）: `conversion/pdf-to-mdx --scanned` に **経路B＝PyMuPDF 単ページ**を追加（pdfimages/ImageMagick が無い環境・「1 PDF ページ＝1 書籍ページ・正立」のスキャン本用。`scripts/scanned/` に render_pages / ocr_fanout.workflow / proofread.workflow / concat_chapters / prep_figures / figure_bbox.workflow / crop_embed_figures / prep_audit_jobs / figure_crop_audit.workflow / apply_deltas_recrop / trim_placeholders を新設、runbook = `scripts/scanned/README.md`）。**図クロップは locate 単発で終わらせず audit/refine ループで締める**設計に修正＝**新 Evaluator `scanned-figure-crop-auditor`（sonnet・audit-only）** を新設（実クロップ PNG を4軸〔クリップ純度45/図完全性30/正図同定15/alt10〕で採点し `adjust_bbox` 相対調整値を返す。`civil-exam-figure-auditor` のスキャン教材版）。`apply_deltas_recrop --damp`（提案デルタ減衰で振動抑制＝反復削減）。**落とし穴**: 新規作成エージェントは同一セッションで agentType 解決不可（定義はセッション開始時ロード）→ `figure_crop_audit.workflow.js` の args に `agentType:"general-purpose"` で代用可（プロンプトに4軸内包）。解像度2200px(OCR)/2600px(crop)/800px(thumb)・候補窓＋groupSize順次でレート制限回避・確信度しきい値も収録。1級土木 施工管理・法規編327p/図135（パイロットで図タイト化）・土木一般編385p/図320 で実証。[[project_civil1_textbook_transcription]]
> 2026-06-17 追加: `metrics/record-sales`（note 販売履歴を SSOT `sales-log.json` に記録するスキル。ダッシュボードペーストから正規化追記＋月次集計。Generator `sales-recorder` 新設）。運用ドキュメント `docs/reference/sales-tracking.md` と同時新設。
> 2026-06-16 追加: `conversion/ogp-design-explore`（OGP 画像 1200×630 の**意匠の新方向を aidesigner / Canva の MCP で素案として試作**する ideation 専用スキル）。`/ogp-create`（satori 決定論テンプレで量産）の**前段**を担い、採用方向を `ogp-templates.mjs`＋`ogp-prompts.md`（SSOT）に落として `npm run ogp` で量産する流れ。**量産・本番生成・per-article 生成はしない**（それは `/ogp-create`）。両 MCP は claude.ai OAuth 経由で会社 PC プロキシでも到達するが、**aidesigner は無料枠クレジット制限あり＝生成前に `get_credit_status` 確認＋ユーザー判断**、CI/headless では不可。`user-invocable: true`（外部 API 費用が発生）。素案は `.tmp/` に出し本番 `ogp.png` を上書きしない。文脈 [[project_ogp_design_ssot]]。
> 2026-06-14 追加（スキャン書籍取り込み）: `conversion/pdf-to-mdx` に **`--scanned` モード**を追加（テキスト層なしスキャン書籍を視覚 OCR で内部リファレンス `docs/textbook/**.md` ＋図に変換）。手順は `references/scanned-image-pipeline.md` に分離（pdfimages 抽出 → 90°回転/見開き分割 → 並列 OCR → 章分割 → 図 bbox 判定・精密クロップ埋め込み）。あわせて **新エージェント `scanned-textbook-transcriber`（Generator・sonnet）** を新設＝スキャンページ画像の逐語 OCR ファンアウトワーカー（Read 画像＋Write のみ・Bash 不可）。図 bbox は `civil-exam-figure-extractor` と同型 Generator を流用。落とし穴も収録（macOS bash3.2 の `declare -A` 不可・zsh 未クオート非分割 `${=var}`・`pdfimages -j` が pdftoppm より高速＋ネイティブ・ディスク逼迫 ENOSPC で静かに truncate→破損ページはスプレッド直接クロップで救済）。旧メモリ `reference_scanned_pdf_pipeline`（pdftoppm 方式）を pdfimages 方式へ更新。技術士建設部門「論文対策キーワード」168 見開き → 7 章 .md（約312k字）＋図31点で実証。[[project_pe_construction_secondary]]

> 2026-05-29 追加: `authoring/civil-keiken-magazine`（1級・2級土木 施工経験記述 マガジン模範答案の生成・採点。Generator `civil-keiken-essay-writer` ＋ Evaluator `civil-keiken-essay-qa`）。
> 2026-05-30 追加: `management/routines`（クラウドルーティン /schedule の一覧・監査。重複・残骸 one-shot・平文シークレット・cron 衝突を検出。weekly-review 重複作成事故[2026-05-30]の再発防止。create 前 list-first を運用ルール化）。
> 2026-06-02 更新: 経験記述3点（`authoring/civil-keiken-magazine` skill ＋ `civil-keiken-essay-writer`/`civil-keiken-essay-qa` agents）を当セッションの実体験事故から hardening。①散文形式の明文化（ⅰ）型完結文・断片「N.ラベル：文」禁止）②法定/規格の固定値はリテラル保持（現場固有値のみ〇〇。酸欠18%誤置換事故）③圧縮ガードレール（注釈/問題文/概要の削除・blockquote化での字数回避禁止）④想定工事①②③ 対称構造のテンプレ化（2級選択制は同一工事表記）⑤inter-article 重複検査を既存note全体へ拡張＋テーマ×工事マトリクス台帳（単位は工事=プロジェクト、工種=作業種別と区別）⑥量産パイプライン（writer→charcount --strict→qa→親commit）。詳細は各 .md。
> 2026-06-02 追加: `quality/keiken-charcount`（1級・2級土木 施工経験記述マガジン答案を**解答欄しきい値で字数チェック**する決定論的スクリプト `scripts/keiken-charcount.mjs` ＋ 真実源 config `.claude/config/keiken-answer-sheet-limits.json`）。`**(N)` マーカー型／`### 記述例` 型／`### 〔設問〕(N)` 見出し型を両対応で抽出、リスト記号除去・中身算入、答案直後の太字注釈ラベル（`**○○か△○か**：…`）は除外。Evaluator `civil-keiken-essay-qa` の**必須ゲート**として `--strict` 連携、圧縮は Generator `civil-keiken-essay-writer`。総監記述式用 `note-essay-charcount.mjs`（原稿用紙マス・答案枚数上限）とは**別系統**（こちらは土木の設問別解答欄字数）。
> 2026-06-02 追加: `magazine-banner` テンプレ（`ogp-create` lib）に `accentColor` 任意プロパティを追加し、`generate-magazine-covers.mjs` に土木1級/2級 施工経験記述6マガジンの cover spec を追加（資格別配色 1級青#155293/2級緑#1C5038）。未生成だった `civil-*-essay-cover.webp`（note-magazines.ts imageUrl 参照先）を生成し欠落を解消。既定はネイビー/シアンで後方互換。
> 2026-06-02 更新: しきい値を Web調査で出典ベース確定（罫線方式）＋**級別化**（`grades.civil-1`/`civil-2`、パスから級判定）。**1級**=現行R06〜各欄8行×25字=200字／旧形式(1)9行(2)11行(3)7行。**2級**=問題文に文字数規定なし（マス目でもない）、通説目安『1項目約250字・1行20〜25字・解答欄8割充足』に基づき各欄250字（doboku-koji/建設データ/知恵袋一致。1級200字とは別物で2級の方が項目あたり目安は大きめ）。`severity` 4分類（ok/borderline+10%/要圧縮/大幅×1.3超）。1級13記事・2級6記事の超過答案を圧縮し全件 ×/✗ 0 を確認済（※2級は当初210基準で一部過剰圧縮、後に250基準へ是正）。
> 2026-06-08 追加: `quality/pe-first-stage-audit`（技術士第一次試験 R01〜R07 全21ページの3軸監査スキル。正答照合＝正答.pdf PyMuPDF抽出と MDX 正答を突合、原典視覚突合＝問題PDF 150dpi PNG化×エージェント目視、構造検査＝ExamPoint/details タグ数・frontmatter・設問連番。記録先 `.claude/state/pe-first-stage-audit/`。初回実施で10問の正答誤りを発見・修正済）。
> 2026-06-09 更新: SKILL.md を第2弾修正セッションの知見で改訂。①PNG 解像度を 150dpi に修正（200dpi は誤記）②年度ディレクトリは小文字（r01 等）と明記③summary.json を schema_version 2.0（`answer_fail_detail`・`fix_log` フィールド追加）に更新④監査後の修正フロー（audit→fix→commit→re-audit サイクル）を新設⑤fix エージェントへの課題上限を「1エージェントあたり最大5件」と明記⑥MDX書き込みは `writeMdxFile` 必須（Python `write_text()` 禁止）を修正ルールに追加。2026-06-08〜09 第2弾で正答誤り8件・視覚突合誤記75件以上・欠落図9点を修正完了（全21ページ answer_fail = 0）。
> 2026-06-10 更新: マガジン設定の SoT を **`note掲載文.txt` 一本化**へ移行開始。`scripts/lib/note-meta.mjs`（■ セクション＋機械ブロックの共有パーサ/ジェネレータ）＋ `npm run note-meta-lint`（文字数ゲート 30/400/250）＋ `npm run note-meta-to-txt`（_meta→txt 変換）を新設。`_meta` のみ18本を txt 化し、lint 15違反を是正（説明/アピールは段落境界トリム・タイトルは note 実名へ短縮）→ 全33本緑化。`note-edit-magazine` を txt 読み（`--dir`/`--txt`）へ改修。**未完: `_meta.yaml` 全廃**（civil-keiken/pe-essay/pe-note-plan 等 authoring 系8スキル/エージェントが _meta を SOP 参照中のため、それらを note掲載文.txt 生成へ改修してから削除。完全パック _meta は includedMagazines/relaunchPlan 保持で残置）。
> 2026-06-10 追加: `authoring/pe-secondary-yosou`（技術士建設部門2次 選択科目の R8予想を**1科目分まるごと**公開可能品質まで仕上げる統括オーケストレーション。生成 `pe-secondary-exam-writer`（forecast）→ **外部事実照合 `pe-secondary-exam-factcheck`（新設・WebSearch 接地）** → 6軸採点 `pe-secondary-exam-qa` → 梱包（カバー/ハッシュタグ/PDF）→ SoT 登録 → pathspec commit。**クラウド（claude.ai/code）から1科目1指示で回す前提**＝会社PCプロキシで WebSearch が遮断されるため factcheck はクラウド/CI/Mac 実行必須。BK-04〜11 は全て運営者の合格科目外＝発注者経験フレーミング・冒頭回遊なし。予想を先に（試験7月中旬の時限商品）、過去問15記事は試験後の常緑在庫。新エージェント `pe-secondary-exam-factcheck`＝数値/基準値/法令条番号/制度名/技術用語分類を国交省・e-Gov・各学会基準書に照合し likely_wrong を must_fix 化、合格科目外の専門ハルシネーション捕捉。[[project_pe_construction_bk_magazines]]）。
> 2026-06-10 追加: `social/note-edit-magazine`（Playwright × システム Chrome で **note 有料マガジン設定＋収録記事単品価格を `_meta.yaml` 駆動で編集→保存**）。`publish-x` の channel:'chrome'/永続プロファイル/dry-run/偽成功ガードを踏襲。**サブエージェント化しない判断**＝編集は完全に決定的（URL遷移→入力→ボタン→API検証）で原則5「コードで決定できるものはサブエージェントに委ねない」に該当、ブラウザ自動化は全て skill+script（publish-x/note/ig-bs）という既存系譜に合わせた。実機で確定したノウハウ: ①マガジン編集 `/m/{key}/edit`（input[type=text]=タイトル/textarea[0]=説明/[1]=アピール/input[number]=価格/「更新」）②**文字数制限: タイトル≈30字・アピール≤250字**（超過で更新ボタン disabled=保存不可。アピール超過は abort）③fill() だけでは更新ボタンが有効化しない→input/change dispatch＋enabled 確認後クリック④記事価格は `editor.note.com` 公開フロー（公開に進む→価格→有料エリア設定→更新する）⑤保存後 note API で price/title 実体検証。R8予想問題集を ¥2,480→¥3,480・単品¥780→¥700 にライブ反映で実証（[[project_note_write_automation]]・真実源 `docs/reference/note-api-verification.md`）。
> 2026-06-11 改訂（予想問題＝テーマ別記事・1記事1ディレクトリ標準化）: `authoring/pe-secondary-yosou` を道路パイロットの知見で全面改訂。**予想問題の生成単位を「区分1ファイル全選択肢網羅（年度ミラー型）」→「テーマ別の独立記事（テーマ網羅型）」に転換**。理由＝選択科目は本番が選択問題で「自分が書けるテーマに当たるか」が合否を分ける＋競合「予想問題N解答案」(¥500/記事・テーマ別)が同型で実証済み。確定事項: ①テーマは `{subject}-exam-themes` 記事から抽出。III=出題可能性の高いNテーマを各1記事(道路は脱炭素/4車線化/事前防災/xROADの4)、II-1=4カテゴリ1記事(当面)、II-2=計画系/施工系(防災施工系=道路啓開/床版取替を必ず含む)。②**1記事1ディレクトリ**(`R08-yosou/{dir}/article.md`+img/cover.png+hashtags.txt+PDF。dir名=`II-1/`/`III-1_脱炭素/`等)。③**記事内テーマ別ブロック構成(h2)**=予想問題→なぜこのテーマが出るか(予想の根拠)→論述の骨子(設問構成と方針)→フル模範解答→採点ポイント＋冒頭テーマ網羅シリーズ案内。④過去問(R03-R07)は区分1ファイル据え置き(本番再現)。⑤generate-note-covers は再帰探索+article.md対応済で新構造を自動サポート、pdf-specは各記事dirを参照(include=`## 予想問題`→`## なぜこのテーマ`/`## フル模範解答`→`## 採点ポイント`)。道路BK-01でcommit済(article-III分割→4記事→1記事1dir再編、pdf-spec更新)。**残**: pe-secondary-exam-writer/qa の forecast節を「テーマ別記事」へ正式改修(現状は親プロンプトで補う)、II-2拡張、価格設計(テーマ別単品)、他10科目展開。skills-guide.md同時更新済。[[project_pe_construction_bk_magazines]]
> 2026-06-11 追加: `social/note-magazine-sync`（note.com 公開マガジン一覧と SoT `note-magazines.ts` の同期ズレを検出・自動修正する照合スキル。`node scripts/verify-note-magazines.mjs --contents` 駆動。SoT 側の未配線/価格ドリフトは `note-magazines.ts` を Edit → commit まで自動。note.com 側の空マガジン/異質記事混入は残件報告。**`npm run` は Windows intermittent 失敗あり → `node` 直接呼びを指定**。真実源 `docs/reference/note-api-verification.md`、`note-edit-magazine` の `読取照合` 参照先も本スキルへ更新）。
> 2026-06-15 追加: `social/note-publish`（note 有料記事を Playwright で**下書き作成→公開**する Windows 決定的パブリッシャ。`scripts/note-publish.mjs`）。`publish-note`(browser-use=Mac) の Windows 版＝`note-magazine-add` と同じ channel:'chrome'＋永続プロファイル＋proxy＋ignoreHTTPSErrors で社内プロキシ(TLS傍受)越え。**実証**: Windows でも記事のフル投稿（カバー/タイトル/本文 markdown 変換/価格 `#price` JS setter/タグ）が可能＝「投稿=Mac 必須」は browser-use 固有の話だった。**有料境界の自動化を初実装**（既存 `publish-note` が punt した uncharted 領域＝scheduling.md「自動化未確定」）＝有料エリア設定画面で「試験問題/予想問題」H2 直前の「ラインをこの場所に変更」を DOM順で特定→クリック→`boundaryBeforeExam` 検証ゲート（NG なら公開中断）。**安全弁**: account=dobokunote assert／既定 draft・`--commit` のみ公開／公開前境界検証／公開後 実体検証。**リンクカード化も自動化（type 方式・2026-06-15 確定）**＝note の埋め込み検出は `keyboard.type`（実入力）で起動、synthetic `ClipboardEvent` paste では起動しない（paste/Enter 系 v1〜v5 全失敗 → v6/v7 で type 確定）。実装: bulk paste 後の各プレーンURL行を Range選択→Delete→type→Enter で「その場」カード化（周囲テキスト保持）。真実源 `docs/reference/note-api-verification.md` L101・[[feedback_note_link_card]]。**publishing はユーザー起動限定**（`disable-model-invocation: true`）＋サブエージェント化しない（決定的フロー＝原則5）。文脈 [[project_note_write_automation]]、真実源 `docs/reference/note-api-verification.md`。
> 2026-06-15 追加: `social/note-magazine-create`（note 有料マガジンを `note掲載文.txt` 駆動で**新規作成**。`scripts/note-magazine-create.mjs`）。`note-edit-magazine`(編集専用)・`note-magazine-add`(収録) が扱わない「新規作成」を担う＝note マガジン操作の役割三分が完成。実機確定フロー: `/magazines/new` → タイトル input・説明 textarea を fill → **「有料(単体)」クリックで 価格(input[type=number] 100〜100,000)・アピール textarea・カテゴリ select が出現** → セット価格・アピール・カテゴリ=キャリア を fill/select → 読み戻し検証（title/price 一致）→「作成」→ `/m/{key}` 取得。メタは `scripts/lib/note-meta.mjs` の `parseNoteText`（文字数 30/400/250 は txt 側で担保）。安全=既定 probe（ダンプのみ）/`--commit` で作成/作成前読み戻し検証。**ユーザー起動限定**（`disable-model-invocation`）＋サブエージェント化しない（原則5）。実績: BK-02 `mba17c3f8b894` を¥2,980で作成→18記事収録（note-magazine-add）→SoT published:true（verify-note-magazines: SoTズレ0）。[[project_note_write_automation]]・真実源 `docs/reference/note-api-verification.md`。
> 2026-06-15 追加: `social/note-magazine-add`（既存 note 記事を別マガジンへ**収録（追加）**するブラウザ CLI。`scripts/note-magazine-add-articles.mjs`・`npm run note-magazine-add`）。`note-edit-magazine` が扱わない「収録マガジンへの追加」専用＝役割分離。**追加対象は note 公開 API の差分で自動算出**（`toAdd =（--from 群の収録記事 ∪ --notes）− ターゲット現収録`・手動列挙なし・冪等）。`note-edit-session`/`note-edit-magazine` と同じ channel:'chrome'＋永続プロファイル。**安全既定: --commit が無い限り dry-run**・`--probe` で実DOMのダイアログ button 文言ダンプ＋`.tmp/note-add-*.png`・追加後 note API で収録実体検証（偽成功ガード）。**Windows(会社PC)で動作確認済（2026-06-15）**＝channel:'chrome'＋ignoreHTTPSErrors で社内プロキシ(TLS傍受)越え（「Mac必須」は誤りだった・Mac も可）。**確定フロー**: 記事ページ`/n/{key}`の「記事を追加」ボタン→ダイアログ「記事を追加」（全マガジン一覧・各行 追加/追加済 トグル）→ターゲット行直後ボタンで判定→押す。**サブエージェント化しない**（決定的フロー＝原則5）。**実績: 完全パック m171222175fac へ9ペルソナ63記事を投入（53→116）。一過性の取りこぼし1件は再実行で冪等回収**。残: 精読の収録（計算問題同梱の是非をユーザー確認）→ ¥14,800改定。文脈 [[feedback_essay_pack_ssot_adr]]・[[project_note_write_automation]]、手順 `docs/handoffs/_archive/2026-06-15-essay-pack-2tier-relaunch.md`（archive 済）、真実源 `docs/reference/note-api-verification.md`。
> 2026-06-16 追加: `social/note-magazine-cover`（`scripts/note-magazine-cover.mjs`）＋ `social/note-attach-pdf`（`scripts/note-attach-file.mjs`〔1記事〕＋ `scripts/note-attach-magazine-pdfs.mjs`〔1マガジン直列バッチ〕）。note マガジン公開パイプラインの**未自動化2工程**を埋めた＝役割分業が `create→cover→publish→attach-pdf→add→SoT→verify` に拡張。**note-magazine-cover**: マガジン見出し画像を `_cover.png`(1280×670) から `/m/{key}/edit` の「ファイルを選択→この画像を使う→更新」で設定。`note-magazine-create` が**作成時にカバーを付けない systematic 欠落**を補う（全29マガジン監査でコアパック等が note デフォルト見出し画像のまま＝API `cover` が cloudfront `default_magazine_header` を返すため単純非null判定は誤報→`isDefaultCover` ガードで検証）。**note-attach-pdf**: 公開済み記事の本文末尾(有料エリア内)へ印刷用 PDF をダウンロードカードとして添付し再公開（従来「半手動・stats47 未到達領域」を自動化）。note の公開ボタンは公開設定ページに無く**有料エリア設定ビューに出現**／既存有料線は「このラインより先を有料にする」バーで表示されその位置に変更ボタンは無い→**試験問題直前の制御がバーなら触らない・変更ボタンなら寄せる**（さもないと正しい線を動かす）。冪等（既添付は再公開のみ）・偽成功ガード・account ゲート polling・有料エリア描画待ち・バッチ最大2回試行。**実績**: BK-02 河川砂防・BK-03 都市計画 各18記事添付＋両カバー設定（公開ページで有料維持＋ダウンロードカード実在を全件実査）。**ユーザー起動限定**（`disable-model-invocation`）＋サブエージェント化しない（決定的フロー＝原則5）。`publish-note`(browser-use=Mac)の該当「半自動」記述・`note-magazine-create` の作成後フローも同期更新。[[project_note_write_automation]]・[[project_pe_construction_bk_magazines]]、真実源 `docs/reference/note-api-verification.md`。
> 2026-06-05 更新（計測 framing 統一）: `management/weekly-review`・`weekly-plan`・`weekly-improve`・`nsm-experiment` の4スキルで「`.env.local` creds が計測の**前提**・未達なら『計測基盤未整備』スキップ／スナップショットは**fallback**」という誤 framing を是正。**計測は CI/CD 供給（`fetch-metrics.yml` 金06:00JST／`psi-audit.yml` 日次）が正で、`.claude/state/metrics/` のコミット済みスナップショット読みが既定経路。ライブ fetch は creds＋外部到達性がある環境（macOS等）限定の任意経路**に統一。会社 PC は社内プロキシ（Digital Arts/Palo Alto）で外部 API 遮断のためライブ不可。恒久ルールの真実源は `docs/reference/measurement-incidents.md`（2026-06-05 エントリ）。スキルの description/一覧は不変のため skills-guide.md は変更なし。
> 2026-06-02 更新（過去問QA是正セッション）: 経験記述3点を実体験から追加 hardening（skill `authoring/civil-keiken-magazine` ＋ agents `civil-keiken-essay-writer`/`civil-keiken-essay-qa`）。①**ⅰ）型の列挙マーカーは字数算入**（`1.`リストはカウンタが行頭記号を除去するが ⅰ）は本文インライン算入。`1.`→ⅰ）体裁統一で旧形式(3)対応処置175字が溢れやすく、変更後 `keiken-charcount --strict` 再実行必須）を writer/qa に明記。②**note タグは別ファイル `hashtags.txt` が SoT**（既存全 note 記事の規約。`/note-hashtags`・単一行 space 区切り・最大99・80–90個目安。**本文には入れない**）を writer/skill/qa に明記（当初 body 末尾節と誤記したが既存 `hashtags.txt` 規約に合わせ即訂正。1級過去問5本の hashtags.txt を15→90個へ更新）。③**マガジン公開後の URL 反映フロー**（note-magazines.ts `published:true`＋`noteUrl`／本文プレースホルダ→マガジンURL単独行リンクカード／_meta `magazineUrl`）を skill に新設。併せて qa gate「本文 note URL 直書き=0」を**導線リンクカード URL は許可**へ是正（[[feedback_note_link_card]] との矛盾解消）、改変前提キーワードを同義表現（雛形・改変前提のテンプレート等）可へ緩和。
> 2026-06-09 更新（動画 JIT 化・ストレージ削減）: IG リール動画を**在庫として git に持たない**運用に変更。`scripts/publish-reel-jit.mjs`（生成→Business Suite 予約→mp4 削除）を新設し、reel の **mp4 / img(PNG) / slide-NN.mp4 を gitignore**（再生成可能な派生物）。**SoT は slide-data.json + reels/wav** のみコミット。`reels/video.mp4`(444MB)・`reels/img`(485MB)・`slide-NN.mp4`(218MB) を git rm で作業ツリーから除去（累計約1.15GB削減・今後の肥大停止）。注: `--from-reels`(legacy) を使う時は ig-reel-create で reels/img・slide-NN.mp4 を先に再生成。`.git` 履歴圧縮(filter-repo/force-push)は並行作業中の衝突リスクのため未実施。**`video.mp4` が無いのは正常**。
> 2026-06-18 更新（wav も R2 退避＝上記 wav-commit を一部更新）: 上記 2026-06-09 では wav を「コミットする SoT」としたが、wav（700件・596MB）は git 肥大が大きく、2026-06-10 の editorial-reels glob で実際には `.gitignore` 済みだった（doc と gitignore が矛盾＝untrack 漏れで tracked のまま残存）。**wav も R2 退避方針に統一**：`reels/wav` を git 追跡から除去（`git rm --cached`）し、`npm run upload-sns-r2`＋`sns-archive-auditor`（新設 Evaluator）で R2 退避。**コミットする SoT は slide-data.json + reels/script.txt + caption.txt のみ**。wav は script.txt から VOICEVOX 再生成可＋R2 バックアップで復元可（JIT/流用時は手元に無ければ取得・再生成）。真実源 `docs/reference/sns-archive-policy.md`。
> 2026-06-12 追加（ドキュメント同期ガード3層）: `dev/doc-sync`（コード/設定変更 diff × 候補 doc を `doc-sync-auditor`〔新設 Evaluator〕で突合し prose・表・コマンド・件数・閾値の**意味的陳腐化**を検出→親が適用）。あわせて決定論ガード `scripts/check-doc-coupling.mjs`（スキル/エージェントの追加・削除・description 変更に skills-guide/registry・agents-registry の更新が伴うかを pre-commit で検証＝**capability ドリフト**の機械検知）を新設し pre-commit に配線（`install-pre-commit.mjs`／`npm run check-doc-coupling`）。役割分担＝`check-doc-refs`(壊れ参照)・`check-doc-coupling`(台帳もれ)＝機械／`/doc-sync`＝意味的ズレ（LLM・節目に手動）。発火規律＝`src/**` `scripts/**` `.claude/**` `package.json` 等「ドキュメント化された面」変更時のみ、純コンテンツ MDX 編集では回さない。CLAUDE.md §8 に protocol 追記。「使いながら改善」前提の v1（誤検知/拾い漏れを見て抽出範囲・grep・判定基準を更新）。
> 2026-06-09 更新: `social/yt-shorts-create` の `per-problem-shorts.mjs` に **`--ig-mode` / `--questions`** を追加し、IG 用「1問1リール」を生成可能に（実測 36-45 秒）。出力は `reels-pp/q<N>/{video.mp4, caption.txt}` の**自己完結ディレクトリ**＝`publish-ig-bs --reel <q-dir>` を**無改修**で1本ずつ予約できる。素材は YT 短ナレ wav（`.tmp/yt-gen/narration`）＋既存 `reels/wav`＋カバーキャッシュを流用＝**新規 TTS ゼロ**。PNG は ytMode（カルーセルチャーム抑止）流用、caption は論点（`correctText`）主役＋管理ハッシュタグ（`buildIgReelCaption`）。背景: 従来のフル reel（全4問・138-295秒）が IG には長すぎた。R7 5管理×各2問=10本を 12:30/日次で感触テスト予約（2026-06-09）。
> 2026-06-09 更新: `social/publish-ig-bs` に **リール予約投稿（`--reel`）** を追加。`reels/video.mp4`+`reels/caption.txt` を読み、ホーム「リール動画を作成」→ reels_composer（3 ステップ: 作成→編集→シェアする）を駆動。実測差分: ①動画 filechooser ＋処理待ち（自動生成サムネ出現で判定）②ステップ送りは右下「次へ」を座標 click（サムネ送りの ZWSP「次へ」誤爆回避）③予約は「日時を指定」→日付/時刻（カルーセルと共通の spinbutton/aria-valuenow）→「公開日時を指定」で確定。日付/時刻入力を `fillDateTimeFields` に共通化。実機で 1 本予約成功を Planner 確認 → 削除済み（2026-06-09）。
> 2026-06-09 追加: `social/publish-ig-bs`（Playwright × Meta Business Suite で **Instagram カルーセル予約投稿**。`publish-x` の永続プロファイル/システム Chrome/dry-run 必須/偽成功ガードを踏襲）。役割分担=**即時は `scripts/publish-ig.mjs`〔Graph API・公式〕／予約は本スキル**（Graph API は予約非対応）。実機検証で確定した実測ノウハウ: ①投稿先ドロップダウンで FB ページ `role=option`/`aria-selected` を外し **IG 単独化**（その際メディアボタンが「写真を追加」→「写真・動画を追加」に変化）②時刻欄は `role="spinbutton"` で値は `aria-valuenow`（`.fill` 不可・`keyboard.type`＋aria 検証）③確定後の成功モーダルを Meta が複数文言で出し分け（「日時が指定されました」/「時間を節約」）→ 共通「後で」ボタンで検知。**ToS グレー（API 外自動操作）＋ローカル GUI 前提（CI 不可）**ゆえ初回 `--dry-run` 必須・プランナー実体確認を運用ルール化。ユーザーが規約リスク理解の上で採用（2026-06-09）。
> 2026-06-17 退役（Graph API IG 投稿を全廃）: Instagram 投稿を Business Suite（`social/publish-ig-bs`）に一本化。Graph API 経路を全削除＝`scripts/publish-ig.mjs`（即時投稿）／`.claude/scripts/instagram/{post-from-schedule.cjs,upload-to-r2.mjs,ig-login-token.mjs,README.md,SETUP-mac.md}`／`.claude/scripts/{meta-auth.mjs,get-meta-token.mjs}`（Graph トークン取得）／`.claude/scripts/lib/sns-common/media-uploader.mjs`（唯一の consumer が publish-ig.mjs＝孤児化）／cron ワークフロー `post-instagram-scheduled.yml`・`upload-instagram-assets.yml`／schedule state `instagram-schedule.json` を撤去。背景: `npm ci` の secrets 未設定で cron が連日失敗＝不要機能、かつ予約は publish-ig-bs が担う方針確定。**役割分担は解消＝IG 投稿（即時 `--now`／予約 `--schedule` とも）は `publish-ig-bs` のみ**。残置（コンテンツ生成・Business Suite が利用）: `generate-caption.cjs`・`build-stories.mjs`・`build-highlight-materials.mjs`。理由: ユーザー決定「IG は Meta Business で投稿」。同期更新: `docs/sns/instagram/README.md`・`docs/reference/measurement-incidents.md`・`docs/project/04_運営/04_自動化マップ.md`・skills-guide.md。
> 2026-06-08 追加: `social/x-repost`（X 引用リポスト curation。`discover`=Playwright で技術士総監/1級・2級土木の高エンゲージツイートを `min_faves` 検索収集 → サブエージェント `x-repost-curator`〔Pro/Max 枠・API 課金なし〕で安全ゲート＋引用コメント生成 → `exec`=Playwright で引用RP）。`publish-x` の永続プロファイル/システム Chrome/偽成功ガードを踏襲。**規約グレー（ToS は API 外自動操作を禁止）＋ローカル実行のみ（X セッションはローカル、datacenter IP はボット判定→クラウド cron 不可、定期は `/loop`）＋完全自動はコメント無検閲**ゆえ、初回 `--dry-run` 必須・`PAUSED` キルスイッチ・config.blocklist と curator の二重安全ゲート・reposted-log.json 重複防止で hardening。ユーザーが規約リスクを理解の上で採用判断（2026-06-08）。

---

## 複数資格対応のテンプレート駆動化

**核心原則**: 新試験追加時はスキル本体を変更せず、`templates/{exam-id}.md` を追加するのみ。

| テンプレート管理ディレクトリ | 用途 | 対応試験 |
|---|---|---|
| `conversion/pdf-to-mdx/templates/` | PDF→MDX 試験別ルール | general / cem / civil-construction-1 |
| `conversion/exam-questions-import/templates/` | 過去問取込 | civil-primary / civil-secondary / pe-primary / pe-first-stage |
| `quality/quality-cycle/templates/` | 品質サイクル プロファイル | cem / civil-textbook |

新試験追加時の手順:
1. 該当テンプレートディレクトリに `{new-exam}.md` を新規作成
2. スキル側は変更なし
3. 動作確認 → PR

### 付属 QA スクリプト（`conversion/exam-questions-import/scripts/`、2026-06-04 追加）

| スクリプト | 用途 | SKILL.md |
|---|---|---|
| `check-option-dup.mjs` | 過去問 MDX の重複選択肢検出（組合せ問題で2選択肢が完全一致＝転記ミス確定） | Step 5.6 |
| `check-answer-consistency.mjs` | `正答：N` と ✅/❌ バッジ位置の整合・正答欠落・ExamPoint内バッジ混入を検出 | Step 5.6 |

技術士第一次試験 R元〜R7 整備（2026-06-04）で抽出した汎用ガード。視覚突合（Step 5.7）を通過したページでも誤転記を機械検出するため、全試験の過去問変換で再利用する。

---

## 退役記録

削除したスキルのログ。代替コマンドがある場合は明記。

| 退役日 | スキル | カテゴリ | 代替 |
|---|---|---|---|
| 2026-07-04 | `/exam-guide`（＋`templates/exam-guide/` 全5テンプレ＋`templates/README.md`） | authoring | `group: guide` 品質サイクル（`guide-rewriter` 生成 → `guide-qa` 評価 → `guide-fact-checker` 事実照合）。テンプレは旧 Docusaurus アーキで死亡・実運用は既にオリジナル散文フローへ移行済み |
| 2026-04-15 | `/pe-exam-guide` | content | `/exam-guide --exam pe`（**その `/exam-guide` も 2026-07-04 退役**） |
| 2026-04-23 | `/allow-tool` | dev | ユーザー直接指示 |
| 2026-04-23 | `/reset-git-history` | dev | ランブック移譲 |
| 2026-04-23 | `/find-x-accounts` | marketing | Playwright MCP 直接指示 |
| 2026-04-23 | `/related-articles` | ui | `docs/ui/related-articles.md` に移動 |
| 2026-04-23 | `/seo-audit` | analytics | `/check-mdx --rules seo` + `/fetch-gsc-data` 連携 |
| 2026-04-23 | `/add-exam-answers` | content | `/exam-questions-import --mode add-answers` |
| 2026-04-23 | `/fix-design-manual-figures` | content | `/improve-article` に吸収 |
| 2026-04-23 | `/note-desumasu` | content | `/social-post note desumasu {path}` |
| 2026-04-23 | `/x-post` | marketing | `/social-post x {question\|keyword} ...` |
| 2026-04-23 | `/note-post` | marketing | `/social-post note {analysis\|guide\|keywords} ...` |
| 2026-04-23 | `/aidesigner-frontend`（トップレベル孤立） | — | ui/ に移動（Phase A） |
| 2026-04-24 | `/check-mdx`（旧 content 配下） | content | `/check-mdx --rules syntax`（Phase B で quality/ へ） |
| 2026-04-24 | `/check-frontmatter` | content | `/check-mdx --rules frontmatter` |
| 2026-04-24 | `/check-links` | content | `/check-mdx --rules links` |
| 2026-04-24 | `/audit-staging` | content | `/check-mdx --rules staging` |
| 2026-04-24 | `/audit-exam-explanations` | content | `/check-mdx --rules explanations` |
| 2026-04-24 | `/audit-svg` | content | `/check-mdx --rules svg` |
| 2026-04-24 | `/check-related-keyword-inline` | content | `/check-mdx --rules related-keyword` |
| 2026-04-24 | `/check-legal-citations` | content | `/check-mdx --rules legal-citations` |
| 2026-04-24 | `/pdf-to-mdx`（旧 content 配下） | content | `/pdf-to-mdx --exam general`（Phase C で conversion/ へ） |
| 2026-04-24 | `/cem-pdf-to-mdx` | content | `/pdf-to-mdx --exam cem` |
| 2026-04-24 | `/civil-construction-1-pdf-to-mdx` | content | `/pdf-to-mdx --exam civil-construction-1` |
| 2026-04-24 | `/clean-pdf-artifacts` | content | `/pdf-to-mdx` Step 6 自動実行 |
| 2026-04-24 | `/exam-questions-import`（旧 content 配下） | content | `/exam-questions-import --exam civil-primary --year <year>` |
| 2026-04-24 | `/exam-questions-2-import` | content | `/exam-questions-import --exam civil-secondary --year <year>` |
| 2026-04-24 | `/qa-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/verify-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/ogp-create`（旧 content 配下） | — | `/ogp-create`（Phase C で conversion/ へ移動） |
| 2026-04-24 | `/civil-textbook-cycle` | content | `/quality-cycle --profile civil-textbook`（Phase D で統合） |
| 2026-04-24 | `/quality-cycle`（旧 content 配下） | content | `/quality-cycle --profile cem`（Phase D で quality/ へ） |
| 2026-05-09 | `sns/publish-x`（caption-file 形式） | sns（廃止） | `social/publish-x`（tweets.md 形式の現行版） |
| 2026-05-15 | `/exam-keyword-cycle` | quality | `/quality-cycle --mode auto-loop`（過去問起点 → キーワード起点に方針転換、サイクルを一本化） |

### エージェント退役

| 退役日 | エージェント | 代替 |
|---|---|---|
| 2026-04-23 | `aidesigner-frontend` | 直接 Claude 指示 or AIDesigner MCP 直接 |
| 2026-04-23 | `ui-visual-qa` | `/design-review --visual`（スキル層に統合） |
| 2026-04-23 | `cem-advisor` | Generator は `keyword-rewriter`、Evaluator は `cem-qa` |
| 2026-06-18 | `note-figure-auditor` | `svg-figure-auditor`（site/note 横断化して吸収） |
| 2026-06-19 | `seo-auditor` | GSC 統合再設計で分割: coverage→`gsc-index-auditor` / performance→`metrics-analyzer` / CWV→`performance-auditor` / 取得→CI。真実源 `docs/reference/gsc-management.md` |

### スキルバージョン更新履歴

| 更新日 | スキル | バージョン | 変更概要 |
|---|---|---|---|
| 2026-06-19 | `management/plan-weekly` | （新設） | docs/todo/{annual,monthly,weekly}.md + git log を読み今週の優先タスクを決定して weekly.md を直接更新する軽量週次プランナー。エージェント `todo-planner`（Sonnet 1回）が担当。既存 `/weekly-plan`（NSM・メトリクス連動・重め）とは用途が異なる（`/plan-weekly` は毎週月曜の実務タスク整理、`/weekly-plan` は戦略的 PDCA レビュー時）。Codex に振れる作業を `[Codex候補]` で明示し Pro プラン節約にも貢献 |
| 2026-06-16 | `social/audit-note-funnel` | （新設） | note 導線（ファネル）の資格別 3 層モデル（L1 全資格サイトマップ / L2 資格別もくじ / L3 記事内 CTA）の監査・修復スキルを新設。場当たりだった note CTA 設計を SSOT 化（真実源 `docs/reference/note-funnel-architecture.md`＋機械可読 `.claude/config/note-funnel.json`）。`scripts/audit-note-funnel.mjs`（D1 公開記事CTA欠落 / D2 マガジンL2未収録 / D3 L2のL1未リンク / D4 URL不一致）・`scripts/wire-note-funnel-cta.mjs`（冪等配線）・CI ゲート `check-note-funnel`（r2-audit.yml）・Evaluator エージェント `note-funnel-auditor`（意味監査）を同時新設。総監で L1/L2/L3 を実装（L1=n296a88f64ac2 / L2=n3ed4c77ceed6 / 30記事配線）、建設部門・土木の L2 は未構築 |
| 2026-06-12 | `note-prepublish-review` | （機能追加） | Phase 1 に note 品質3ゲートを追加。**4d マガジンCTA形式**（`check-note-magazine-cta.mjs`＝markdown リンク形式のマガジンURL・URL同一行の価格¥を BLOCK、§14-c）／**4e 3点セット**（`check-note-3set.mjs --require`＝cover.png+hashtags.txt を無条件 BLOCK、§14-d。hashtags 存在を WARN→BLOCK 昇格）／**4f 段落長**（`reflow-note-paragraphs.mjs --dry`＝>120字段落を WARN、§14-e）。4d/4e は `note-lint.mjs`（pre-commit）にも配線（公開状態キー）。建設部門入口16本の旧¥1,980 CTA すり抜け・公開済2本の hashtags 欠落・185/402段落 120字超 の再発防止 |
| 2026-05-20 | `pe-essay-review` | v1.1 → v1.2 | 横断チェック観点（数値一致・フレーム語句・施策構造）を追記 |
| 2026-05-20 | `pe-essay-draft` | v1.2 → v1.3 | 必須ルール「設問3はペルソナ一貫性の例外＝国家スケール」を追加（R07 模範論文の設問3が業界内に閉じていた欠陥を修正）。設問制約リストにスコープ／視点要件の抽出を追加 |
| 2026-05-20 | `pe-essay-review` | v1.2 → v1.3 | 視点1「視点の広さ」を「設問3 が事業・組織・業界の枠を超え国家スケールか」を含む形に再定義（同欠陥の見逃しを修正）。設問チェックリストにスコープ要件を追加 |
| 2026-05-20 | `pe-essay-draft` | v1.3 → v1.4 | 必須ルール「文体は である調 で統一する」を追加（設問3 revise 時に ですます調 が混入し設問1・2 と割れた欠陥を修正） |
| 2026-05-20 | `pe-essay-draft` | v1.4 → v1.5 | 「トレードオフと解決フレームの整理」節をテンプレートから削除（設問本文と重複する再掲節のため） |
| 2026-05-21 | `pe-essay-review` | v1.3 → v1.4 | 評価対象に note マガジン論文（`docs/note/magazines/`）を追加。Phase 1 ターゲット解決を サイト模範論文 slug / note マガジンパス の2系統に拡張 |
| 2026-05-21 | `note-prepublish-review` | （バグ修正） | 図版存在チェックの正規表現を `../img/`（マガジン共用図）対応に拡張。従来 `./img/` のみで マガジン論文の共用図を素通りしていた問題を修正 |
| 2026-05-21 | `note-prepublish-review` | （判定緩和） | blockquote を BLOCK 対象から WARN へ緩和。note.com は `>` を引用ブロックとして正しく描画するため、マガジン論文（pe-essay-draft テンプレ由来で `>` を使用）を誤 BLOCK していた |
| 2026-05-21 | `note-prepublish-review` | （機能追加） | マガジン模範論文 専用 inline チェック section 7 を追加（試験問題セクション存在・トレードオフ再掲節の不在・設問別解答字数・答案本文の散文化・図版なし）。新スクリプト `note-essay-charcount.mjs` を Phase 1 で実行。散文化チェックは管理分野ラベル等の既知アンチパターンを positive 検出（SWOT・工程表・TF メンバーの箇条書きは誤検知しない） |
| 2026-05-21 | `pe-essay-review` | v1.4 → v1.5 | 解答字数の充足率評価を追加（健全帯 85〜105%・過少も過多も欠陥として扱う）。Phase 1 で `note-essay-charcount.mjs` を実行、設問チェックリスト・視点3・出力フォーマットに反映 |
| 2026-05-21 | `pe-essay-draft` | v1.5 → v1.6 | 設問3 国家施策ガードレール（v1.3）の例示が少子高齢化テーマに偏り、CN（R06）で業界・流域に閉じた施策が生成された欠陥を修正。設問3 国家施策例を**テーマ別**（CN／少子高齢化）に再構成し「複数省庁にまたがる国家政策として説明できるか」を判定基準として明示 |
| 2026-05-22 | 共有スクリプト `note-essay-charcount.mjs` | （大幅拡張） | 答案用紙の枚数上限を年度別に試験問題から自動抽出し、設問別＋組合せ（施策／方法）別に OK/WARN/NG を判定する形へ拡張。`### 設問` H3 構造（R8予想問題集）に対応、組合せ検出を見出し型／散文型／序数型×施策／方法に拡張、字数を原稿用紙マス数推定（全角1・半角2字で1マス）へ変更、exit code 追加。検証で R8予想問題集6本は全件適合、既存模範論文マガジン（M5-M8）は枚数超過の疑い多数を surface（要・別途精査）。当初 `verify-essay-length` 新規スキルとして着手したが既存スクリプトとの重複を検出し統合（新規スキルは破棄） |
| 2026-05-22 | `note-prepublish-review` | （記述更新） | `note-essay-charcount.mjs` 拡張に追従。section 7c の解答字数判定の説明を「制限文言の突合」から「script が年度別上限を自動抽出し OK/WARN/NG 判定・NG は失格相当・過少は85%未満で WARN」へ更新 |
| 2026-06-05 | `social/yt-shorts-create` | （ガード追加） | カバー同期ガード `assertCoverInSync` を新設。`--from-reels` 派生前に slide-00.mp4 の1枚目と最新 img/00-cover.png を SSIM 比較し 0.90 未満で中断。カバーPNG/テンプレ刷新後に reel 動画を再生成しない desync（2026-06-02 cover刷新で video.mp4 1枚目が旧カバーのまま残った事故）の再発防止。不変条件「カバーPNGだけ更新する運用は禁止＝ig-reel-create で動画も同時再生成」を SKILL.md に明記 |
| 2026-06-05 | `social/ig-reel-create` | （バグ修正） | `--exam-dir` が parseArgs 未登録で弾かれるバグを修正（コードは `args['exam-dir']` を参照していた）。多資格（1級/2級土木）の reel 再生成が可能に。SKILL.md 引数表に追記＋`--skip-png` 誤用警告（テンプレ刷新時は付けない）を明記 |
| 2026-06-05 | 共有 `sns-common/reading-dict.mjs` | （辞書追加） | VOICEVOX が「問」を訓読みして `過去問→かことい`・`全問→ぜんとい` と誤読していたため、`過去問→かこもん`・`全問→ぜんもん` を読み辞書に追加。cover(slide-00)/cta(slide-09) ナレーションが該当。`ig-reel-create`・`yt-shorts-create` 双方の TTS に効く。`全4問`（ぜんよんもん）は数字が入るため誤読せず辞書対象外 |
| 2026-06-06 | `social/yt-shorts-create` | v2 → v3（機能追加） | `per-problem-shorts.mjs`（1パック4問の全問展開・1パック=4本）新設。YT が IG 用 PNG を流用すると「N/10」「PROBLEM 1/4」「まずは1問やってみる/次ページで解答」スワイプCTAが単発1問動画に不整合になる問題を、**YT専用描画 `ytMode`** で解消。`quiz-slides.mjs`（problem/answer/cta）と `exam-cover-ig.mjs`（cover: `hidePage`/`showCta`/`topic`）に `ytMode` を実装し、IG固有チャームを抑止。IG mp4 を流用せず slide PNG を再描画＋`reels/wav` の TTS を再利用して再合成。カバーは年度共通汎用ナレ＋問別「この動画の論点」表示。タイトルは `yt-shorts-title-writer` 出力 JSON（`--titles`）を採用 |
| 2026-05-22 | `pe-essay-review` | v1.5 → v1.6 | `note-essay-charcount.mjs` 拡張に追従。解答字数の記述を script の判定結果（NG=上限超過=失格相当）利用へ、字数基準を markdown 込みプロキシ値から原稿用紙マス数推定へ更新 |
| 2026-05-21 | `note-prepublish-review` | （機能追加） | マガジン専用チェックに section 7f を追加。設問(3) が「事業や組織の枠を超えた国としての施策」を問う年度で、各施策がペルソナ業界・所管インフラに閉じていないかの目視確認を喚起（grep で設問文言を検出して WARN 出力） |
| 2026-05-21 | `pe-essay-draft` | v1.6 → v1.7 | 環境調査ペルソナ（`environment-survey`）を廃止。属性キー表を 4 種 → 3 種に変更し、使用例を river-consultant に差し替え |
| 2026-05-21 | `pe-essay-cycle` | （属性整理） | 環境調査ペルソナ廃止に伴い、受験者属性を 4 種 → 3 種（general-contractor / river-consultant / road-municipality）に変更 |
| 2026-05-21 | `pe-note-plan` | （属性整理） | 環境調査ペルソナ廃止に伴い、属性 × 年度マトリクスを 4 属性 → 3 属性に変更 |
| 2026-05-21 | `lint-mdx-mobile.mjs` | （配列整理） | 環境調査ペルソナ廃止に伴い、`R8_SPOKE_ALLOWED_PERSONAS` から `'環境調査'` を除去（4 固定ペルソナ + 業界外救済 → 3 固定ペルソナ + 業界外救済） |
| 2026-05-27 | `ig-carousel-restyle` | v1.0（新規） | AIDesigner 新意匠の tokens.json 真実源化に伴い新設。`docs/design-system/instagram-carousel-tokens.json` 更新後に `_exam-packs/**` の PNG を一括再生成するラッパー。引数 `--pack`/`--year`/`--all`。内部で `scripts/bulk-generate-exam-packs.mjs` を呼ぶ |
| 2026-05-27 | `quiz-slides.mjs` | （全面書き換え） | AIDesigner プロト準拠の新意匠に書き換え。5管理別カラーテーマ（MGMT_THEME 5 セット）を廃止し、単一 brand + semantic（green 正答 / coral 誤答 / navy CTA）に統一。フォントを NotoSansJP-Bold/Inter-Bold → Manrope（latin）+ NotoSansJP（jp）に変更。tokens.json から値を import |
| 2026-05-27 | `ig-post-create` / `slide-render.mjs` | （フォント拡張） | `@fontsource/manrope` + `@fontsource/noto-sans-jp` を npm 導入し、Satori `fonts` 配列に Manrope 500/700/800 + NotoSansJP 500/700/800/900 を追加（既存 Inter 700 / Noto Sans JP 700 は互換維持） |
| 2026-05-27 | `ig-carousel-qa` | v2.0（軸追加） | テキスト 5 軸に加え、過去問パック専用「デザイン統一性」第 6 軸を追加。PNG を Read tool で読み tokens.json と照合する |
| 2026-05-27 | `ig-carousel-writer` | （ガード追加） | slide-data.json に色・フォント・余白を書かないルールを明記。5管理別配色は廃止済みで識別は cover-title テキストで行う旨を追記 |
| 2026-05-27 | `quiz-slides.mjs` | （4 段階圧縮モード） | normal/dense/compact/ultra の 4 段階を総文字数で自動判定。`MGMT_THEME` 完全廃止 + reelsWrapper（1920 中央寄せ）追加 + buildTable / buildLists 汎用ビルダー追加 |
| 2026-05-27 | `slide-data.json` スキーマ | （拡張） | problem に `lists`/`table` フィールド、answer に `optionExplanations[5]`/`pointText` 必須化。`explanationLines` 廃止 |
| 2026-05-27 | `ig-reel-create` | v1.0（新規） | カルーセル PNG ベースの Reels 動画生成スキル。`--exam <pack-id>` で 1080×1920 PNG → VOICEVOX TTS → ffmpeg 連結 → mp4。旧 YT Shorts (142 dir / 37 mp4) を全削除して新設 |
| 2026-05-27 | `lint-exam-pack-structure.mjs` | v1.0（新規） | 構造違反検出 lint。E1 (列挙散文化) / E2 (markdown 表残骸) / W1 (プレースホルダ残存)。bulk-generate-exam-packs.mjs に pre-check として統合 |
| 2026-05-27 | `generate-caption.cjs` | （拡張） | `--format carousel\|reels` オプション追加。caption.txt を `<pack>/carousel/caption.txt` と `<pack>/reels/caption.txt` の 2 ファイルに分離。Reels 用は正答ネタバレなし + エンゲージメント CTA |
| 2026-05-27 | デザイントークン | （多数調整） | qText 700→600 / cover 補助拡大 (tag 32, page 28, meta 38) / brandUrl 28 / cover-swipe chip 化 / cta-action 拡大 (title 32, subtitle 26, icon 72 brand 塗) / CTA 文言「全章→全問」「All章→5管理 SCOPE」/ cover-tag「総監択一クイズ→総監過去問」/ Q ロゴ right -20→40 / 装飾円を pageBadge/brand バッジ化 |
| 2026-05-27 | cover-title 統一 | （仕様確定） | cover-title を「令和X年度 ／ 択一式 過去問 #N」固定文言に統一。`titleLine1` / `titleLine2Template` をトークン化し、パック横断で管理混在問題が表面化しない構造に変更（pack-05 が「経済性管理」ラベルだが社会環境問題を含む問題を契機に確定） |
| 2026-05-27 | `ig-reel-create` | v1.1 | `--script-only` モード追加。VOICEVOX/ffmpeg 環境が未準備でも `reels/script.txt` の TTS 台本のみを先行生成可能に。Cover 台本テンプレを「令和X年度の択一式過去問、N番です。スワイプして4問にチャレンジしましょう。」に統一 |
| 2026-05-27 | `build-stories.mjs` | v1.0（新規） | `.claude/scripts/instagram/build-stories.mjs` 新設。`reels/img/` から 4 枚（00-cover / 02-problem / 03-answer / 09-cta）を `stories/img/` にコピー + `stories/caption.txt` + `stories/note.md`（投稿手順）を生成。42 パック × 4 枚 = 168 PNG 整備 |
| 2026-05-27 | summary 系スライド | v1.0（新規） | 年度目次カルーセル（`_summary/`）新設。`buildSummaryCover` / `buildSummaryPackList` / `buildSummaryCta` 3 ビルダー追加、`slide-render.mjs` の dispatcher と `ig-post-create.mjs` の `SLIDE_TYPE_MAP` に `summary-*` 系を追加。1 ストーリー → 目次カルーセル → 個別パックの 3 階層誘導を実現 |
| 2026-05-27 | `generate-caption.cjs` | （文言確定） | カルーセル先頭行を「【令和X年度 択一式 過去問】R0X 過去問 #N」に固定。caption と cover-title を完全同期 |
| 2026-05-28 | `yt-shorts-create` | v1.0 → v2.0（破壊的変更） | **戦略 v7 化に伴い `--slug` モード（MDX 直結）廃止 → `--from-reels <pack-id>` 一本化**。IG Reels パックの `slide-{00,01,02,09}.mp4` を ffmpeg concat で 30-60 秒に派生。`buildMeta` を別途 `buildMetaFromReels` に分岐し、UTM を `utm_source=youtube&utm_campaign=exam-pack-<pack-id>` に。`--slug` 呼出時は deprecation エラーで exit 1。MVP では字幕焼き込み未対応（Phase D2 で対応予定）。SKILL.md 全面書き換え |
| 2026-05-28 | `quiz-slides.mjs` | （Reels モード分岐追加） | `buildQuizCover` で `height >= 1920` を判定し `SLIDES.cover.swipeTextReels`（"答えは動画内で発表"）に分岐。tokens.json に `swipeTextReels` フィールド追加。「スワイプで4問にチャレンジ」がカルーセル流用バグで Reels に残っていた問題を構造的に解消 |
| 2026-05-28 | `quiz-slides.mjs` + `build-stories.mjs` | （Stories モード分岐追加） | Stories cover の独立生成を導入。`build-stories.mjs` が Reels の 00-cover.png をコピーするのを止め、`renderSlide({ slide: { type: 'quiz-cover', data: { mode: 'stories', ... } } })` で独立生成。`buildQuizCover` は `data.mode === 'stories'` を最優先判定し `SLIDES.cover.swipeTextStories`（"まずは1問やってみる"）に分岐。Reels と同サイズ（1080×1920）のため height では区別不可、mode 明示が必要。tokens.json に `swipeTextStories` フィールド追加。再発防止: 3 フォーマット同時再生成ルールを ig-carousel-restyle スキルに明記 |
| 2026-05-28 | `ig-carousel-restyle` | v1.0 → v2.0（3 フォーマット対応） | tokens.json / quiz-slides.mjs 変更後の再生成範囲を Carousel 単独から **Carousel + Reels + Stories の 3 フォーマット必須**に変更。手順 §3 で 3 ステップ連続実行（Carousel → Reels → Stories の順、Stories は Reels に依存）を明文化。1 フォーマットだけ再生成して他に古い PNG が残るインシデント（v7 Phase B で Stories cover が古いまま残った）の再発防止 |
| 2026-05-28 | `highlight-stories-slides.mjs` | v1.0（新規） | IG ハイライト用モダンシック意匠ビルダー（`buildHighlightStoriesSlide`）。過去問パック（quiz-slides.mjs）と意匠を切り分け、ジャンル別カラー 6 種（blue/green/purple/amber/rose/slate）+ 大型タイポ + ミニマル幾何アイコン。`slide-render.mjs` dispatcher に `highlight-stories` 追加。tokens.json に `highlightStories` セクション新設 |
| 2026-05-28 | `build-highlight-materials.mjs` | v1.0（新規）→ 汎用化 | ハイライト系統 A 6 種の Stories PNG 一括生成。`--all`（highlights/<NN_name>/ 自動列挙）/ `--dir <path>` / 既定（06_materials）。`docs/sns/instagram/highlights/{01_intro..06_materials}/` の slide-data.json → img/ に PNG 出力 |
| 2026-05-28 | `fit-title.mjs` | v1.0（新規） | 大型タイトル auto-fit 共通 util。`visualLength`（全角=1.0/半角=0.55）+ `pickTitleSize`（3 階層自動選択）+ `classifyTitle`（OK/WARN/NOTICE/ERROR）。highlight-stories-slides.mjs / quiz-slides.mjs で共有し、不適切改行を構造的に防止 |
| 2026-05-28 | `lint-stories-titles.mjs` | v1.0（新規） | title 字数 lint。highlights/*/ + _exam-packs/**/ の slide-data.json をスキャンし visualLength を 4 段階判定（OK<=7 / WARN 8-11 / NOTICE 12-16 / ERROR 17+）。Evaluator（ig-highlight-qa / ig-carousel-qa）が出力を Read して採点に引用。ERROR で exit 1 |
| 2026-05-28 | `quiz-slides.mjs` + `highlight-stories-slides.mjs` | （title auto-fit 追加） | cover-title / hero の固定サイズ（156/132px）を 3 階層 auto-fit に変更。tokens.json に coverTitle/Mid/Sm + hero/heroMid/heroSm（各 `_maxLen` 付き）追加。「文字数制限による意味希薄化」と「フォント縮小による視覚崩壊」の両ジレンマを段階フォントで吸収。ユーザー指摘「不適切改行が他 PNG/SVG でも繰り返される課題」への構造的対策 |
| 2026-05-29 | `magazine-to-pdf` | v1.0（新規・conversion） | note マガジンの article.md を「問題文＋解答」中心の A4 PDF に変換する conversion スキル。汎用 `scripts/magazine-to-pdf.mjs`（spec 駆動 include/exclude DSL、remark → Chrome --print-to-pdf）＋ `scripts/pdf-specs/*.json`。複数解答（A/B案）両収録・CTA/採点者視点/出題予想根拠を除外。新規マガジンの spec 作成は Generator `magazine-pdf-builder` に委譲。当初マガジン別の一時スクリプト 2 本で着手したが汎用化して統合 |
| 2026-06-04 | `ig-reel-create` | v1.2（多資格対応） | `--exam-dir <試験軸>` オプション追加で技術士総監以外（1級土木 / 2級土木）の Reels 生成に対応。`--exam` 正規表現を `^[hr]\d+[kz]?-pack-\d+$` に拡張し 2級の年度接尾辞（z=前期 / k=後期）を受理。cover 台本を試験軸別に分岐（土木は「{令和\|平成}X年度{前期\|後期}の第一次検定 過去問、N番です」、平成年度も対応）。中間ファイルを `.gitignore` 化（commit は video.mp4 + script.txt のみ）。1級r07・2級r07k/r07z 計44本を生成 |
| 2026-06-23 | `social/ig-figure-pack` | v1.0（新規） | site の `figure-N.svg` を IG 4 枚カルーセルパック（表紙/図解/テキスト/CTA）に変換するワンオフ用スキル。手書き SVG（`400×500`）+ resvg-js（2.7× で `1080×1350`）で slide-data.json 不要。キャプション template + Google Drive 転送手順付き。`ig-post-create --slug` の旧 notebook 系とは別系統（マクレガー X/Y 理論 カルーセルを起点に確立） |

### カテゴリ変更履歴

| カテゴリ | 変更 | 日付 |
|---|---|---|
| `marketing` | 廃止 → `social/` に統合 | 2026-04-23（Phase A） |
| `quality` | 新設 | 2026-04-24（Phase B） |
| `conversion` | 新設 | 2026-04-24（Phase C） |
| `authoring` | 新設 | 2026-04-24（Phase D） |
| `content` | 廃止（解体） | 2026-04-24（Phase D） |

### 設計変更履歴

| スキル | 変更 | 日付 |
|---|---|---|
| `management/weekly-review` | 出力先を GitHub Issue 一本化 → md 保存（`docs/reviews/weekly/YYYY-Www-review.md`）へ変更。CLAUDE.md §8「Issue 廃止」と整合。Phase 3/4・運用ルール・出力フォーマットを md ベースに修正、残存 `gh issue` 参照はレガシー扱い | 2026-05-30 |
| `management/weekly-review` | Agent C3「収益カバレッジ ダッシュボード」を新設。`npm run report-monetization-coverage`（GA4 流入 × note/アフィリ CTA 配置の機械突合）で「高流入 × 無導線」ギャップを自動検出し、新セクション「## 収益カバレッジ ダッシュボード」に埋め込む。計装は `AnalyticsProvider` のデリゲートリスナー（`data-cta`）→ GA4 イベント、CI（`fetch-metrics.yml`）が page 次元 + CTA クリックを毎週 commit。手作業監査（last-minute-2026 無導線発見）の自動化 | 2026-06-06 |
| `quality/quality-cycle`（cem テンプレ）+ agent `cem-qa` | content-principles §22 を「footer 参考資料と URL 完全一致のインライン出典は冗長＝置かない」に改訂。cem-qa lint を **カテゴリ14（不足検出を footer 非重複ソース限定に緩和）＋ 14R（footer 完全重複の削除提案）** に分割。既存20ページ29 callout の重複出典を除去（commit c7b4532ed） | 2026-06-08 |
| agent `x-post-writer` + `x-post-qa` | X 投稿 `/docs/` リンクの **本番フラット slug 検証ルール**を追加（root cause: dir 名だけの URL で 149 件 404・560+ imp ロス）。writer は doc-meta-index 照合＋`scripts/check-sns-urls.mjs` 実行を執筆フローに明記、qa は軸4 導線整合に「URL 実在検証（broken なら 0 点）」を追加。新規 `scripts/check-sns-urls.mjs`（pre-commit `--staged` 組込）＋ x-post-policy §6 と連携 | 2026-06-08 |
| agent `pe-secondary-exam-writer` + note 一括是正 | クラウド生成の技術士建設部門 note 記事が markdown 表・太字内全角括弧で note-lint をブロックしていた件を解消。docs/note 全 article(-*).md 240本を一括 note 互換化（pipe表→箇条書き 194 ブロック／Pattern A 769 行、`.tmp/fix-note-tables.mjs`＋`.tmp/fix-note-bold-paren.mjs`）。**生成器 `pe-secondary-exam-writer` に「表禁止＝箇条書き・太字内全角括弧禁止・note-lint 0 確認」ルールを追加**して再発防止（civil-keiken-essay-writer/keyword-rewriter は既存ルールあり）。企画/計画 doc は表正当・ゲート対象外のため不変 | 2026-06-09 |
| 総監模範論文 公開工程ツール群（横展開前の再発防止） | 模範論文ペルソナの横展開に備え検証ツールとランブックを整備。①`scripts/essay-shisaku-charcount.mjs` に**散文性チェック**（答案ブロック内の箇条書き検出）を追加し字数＋散文の決定論ゲート化 ②`scripts/check-essay-heading-structure.mjs` **新設**（正準=自治体道路担当の構造不変条件で見出し構成を検査。R08予想の試験問題分離・A/B/C案ラベル・必須見出し欠落を機械検知。手動突合でしか見つからなかった事故の自動化。全14ペルソナでR08乖離を検出）③`scripts/magazine-to-pdf.mjs` に `--in-place`（記事別PDFを各記事dirへ直接配置＝購入特典PDF添付運用）④`note-essay-review-checklist.md` に Step 6d（見出し構成）/6e（PDF生成・配置・冒頭訴求）/10（公開後URL反映）＋**横展開ランブック**（4決定論ゲート表）を追記 | 2026-06-09 |
| `social/publish-note`（新規・stats47 から適応移植） | note.com 自動投稿スキルを stats47（`uruhayato373/stats47`）から doboku-note へ適応コピー。`browser-use` CLI（Playwright ではない）で note.com/dobokunote エディタを操作し模範論文マガジン記事を下書き/予約投稿。references（editor-operations/scheduling/troubleshooting/update-mode）は note.com 共通ノウハウとして冒頭バナー付きで流用、SKILL.md に **stats47→doboku-note 差分マップ**（アカウント=dobokunote／パス=article.md／frontmatter=notePricing・price／有料境界=`## 試験問題`直前／hashtags.txt・cover.png・特典PDF）と **dobokunote アカウント照合ゲート**（誤爆防止）を新規定義。`.claude/scripts/note/inject-magazine-url.cjs` も doboku-note 版に書換（persona 引数・`{{MAGAZINE_URL}}`＋旧プレースホルダ変種対応・冪等・CRLF保持）。**実行は Mac 推奨**（会社PCプロキシ＋ browser-use 未導入）。有料エリア境界・PDF添付・リンクカード化は stats47 でも半手動のため doboku-note でも半自動運用。偽成功検証（[[feedback_publish_x_false_success]]）必須 | 2026-06-10 |
| 模範論文マガジン `_meta.yaml` 廃止 → 掲載文 .txt ＋ 価格 SoT 明確化 | ペルソナ別マガジンの `_meta.yaml` がコード未参照の死蔵メモ＝二重管理と判明し廃止（河川/都市計画/下水道/上水道）。再発防止として真実源を更新: ①`note-essay-review-checklist.md` に **Step 6f（マガジン掲載文 `note掲載文.txt`＝タイトル≤30/説明≤400/アピール≤250・文単位段落分割・価格欄／`_meta.yaml` を作らない明記／価格 SoT 表）** を新設、Step 6d を**現行 R08 2記事化標準（`R08-yosou-1`/`-2` 各 A/B 案）**へ全面更新、6記事→7記事に是正、横展開ランブックに掲載文・価格ゲート追加 ②`pe-essay-cycle` の publish/plan/参照を checklist と新価格規約（セット=`note-magazines.ts` price／単品=記事 frontmatter `price:`）に整合 ③`pe-note-plan` の「価格 yaml が真実源」を「note-magazines.ts＋記事 frontmatter が真実源・模範論文ペルソナに `_meta.yaml` 無し」へ修正。civil-keiken/pe-secondary の `_meta.yaml`（別商品で正当使用）は不変 | 2026-06-09 |
| 模範論文ペルソナ＝過去問evergreen純化（決定2026の運用反映） | `総監マガジン構成_決定2026.md`（2026-06-10 ADR）が「R8予想＝横断フラッグシップ（R8予想問題集）に一本化／ペルソナ模範論文＝過去問R03-R07 evergreenに純化（per-persona R8章を持たせない）」と決定していたが、運用ランブック・スキル側に未反映で per-persona R8予想を再生産する状態だった（決定の系統間取りこぼし＝[[feedback_content_deprecation_cross_lineage]]）。①`note-essay-review-checklist.md` に決定2026バナー追加＋新規生成標準/Step 6d/アセットゲートを「**新規ペルソナ＝R03-R07 の5記事のみ・per-persona R8予想（`R08-yosou-*`）は作らない**／既存R8章ありは保守時のみ legacy 参照」へ改訂（前行2026-06-09 の7記事化標準を反転）②`pe-essay-cycle` の公開品質化手順・参照を同期＋決定2026参照を追加。未公開 per-persona R8予想ドラフト（ゼネコン/河川コンサル/自治体道路担当）削除・note-magazines.ts の該当説明も実態（5記事）へ修正済み | 2026-06-12 |
| `social/publish-note`（無料記事モード `--free` 追加） | 建設部門の**無料ファネル記事**（入口16本＋論点キーワード6本＝`docs/note/技術士建設部門/{theme}/article.md`・`notePricing: free`）を公開する `--free <dir>` モードを SKILL.md に新設。有料総監マガジンフローと別系統で、有料境界分割・価格設定・特典PDF・マガジン設定をスキップし全文を無料 paste。**Phase 0-free 読み込みスクリプト**（free 専用・`notePricing!=free` なら即中断の安全弁）・cover=`img/cover.png`・tags=`hashtags.txt`・公開時 frontmatter `noteUrl/noteId/notePublishedAt` 反映を定義。既定は下書き保存（`now`=即時／`M/D HH:MM`=予約）。description・argument-hint・skills-guide も同期（doc-coupling）。実 publish はユーザー実行（`disable-model-invocation`）＋アカウント照合ゲート＋偽成功検証必須 | 2026-06-14 |
| agent `pe-secondary-exam-writer` ＋ 字数ハード上限ゲート新設 | 出荷済 BK 模範解答200記事の字数監査で III の6ブロックがハード上限（答案枚数×600字＝III/必須I:1800・II-2:1200・II-1:600）超過＝手書き不可と判明（生成器の自己申告字数が実測と乖離する既知問題の取りこぼし）。**再発防止に常設チェック `scripts/check-note-charlimits.mjs`（`npm run check-note-charlimits`）を新設**し、`scripts/install-pre-commit.mjs` 経由で **pre-commit に staged BK `article*.md` の HARD 超過ブロックを追加**（`SKIP_NOTE_CHARLIMITS=1` で回避可・93%目標超過は警告のみ）。日本語は code point 実測（awk/wc 不使用）。`pe-secondary-exam-writer` Step 5 に本ゲートを明記。超過6件は論点保持で≤1770字に是正済 | 2026-06-14 |
