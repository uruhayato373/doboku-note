---
name: project_note_cover_g2
description: note カバー画像 G2 デザイン（試験=色/系列=濃淡）導入＋点検基盤（ギャラリー/溢れゲート/banner規約の実態整合）。全114→484枚に拡大
metadata: 
  node_type: memory
  type: project
  originSessionId: 6c895d21-3742-4084-a7d0-e394ecfbe599
---

note 記事カバーを claude.ai/design handoff「G2 全幅バナー帯」案へ刷新（2026-05-29）。**試験区分=ベース色 / 系列(notePricing)=濃淡** の二軸で 1級土木=青 `#1E73C8` / 2級土木=緑 `#2A7050` / 総監=濃紺 `#16365C` / 共通=ブロンズ `#9A6B1E` を判別。

実装（真実源）:
- design-system: `docs/design-system/note-cover-tokens.json`（値）+ `note-cover.md`（仕様）
- テンプレ: `ogp-templates.mjs` の `renderNoteCoverG2`（satori、icon は SVG data-URL）
- ジェネレータ: `scripts/generate-note-covers.mjs` — dir から試験解決、`cover:` ブロックあれば G2、無ければ mono-tag フォールバック。バナー文言は中央630セーフ幅590pxへ自動フィット
- frontmatter `cover:` ブロック（leadIn/hi/hiSuffix/banner/meta/tone/chips×3）が G2 のデータ源

**完了**: 1級土木6記事 + 2級土木3記事に cover: 追加・再生成・目視検証済（青/緑で判別確認）。Skill/config/reference/skills-guide も更新。総監は単体記事・マガジン記事とも**全件 G2 化済み**（2026-06-02 に残っていたマガジン27記事=精読ガイド5/模範論文ゼネコン河川自治体16/R8予想6 に cover: 追加・再生成、commit 37b265d20、find で cover欠落0件確認）。paid→deep tone 自動解決で総監濃紺に統一。

**2026-06-02 全面完了**: note 全114記事が v2(G2)・試験別色分け完備（`find docs/note -name article.md` 全件で cover:ブロック＋cover.png 確認、未0）。総監74/1級14/2級11/主任技師5/診断士8/共通2。色は実SVG帯色で検証済（総監paid #0E2645・無料 #16365C／1級 #155293／2級 #1C5038／主任技師 #0A4F4F／診断士 #522A69、いずれも paid→deep・無料→base が正しく作動）。コンクリート主任技師(小論文5)・診断士(記述式8)は本セッションで cover: 追加＋note互換修正も実施（commit 9e4bbc57f）。

**2026-06-02 マガジンカバー試験色適用 完了**: `magazine-banner` テンプレ（`ogp-templates.mjs`）に `accentColor` 任意プロパティを追加（バッジ背景＋下部アクセント線、既定ネイビー/シアンで後方互換）。`generate-magazine-covers.mjs` に土木1級/2級 施工経験記述6マガジン spec を追加し **1級青#155293/2級緑#1C5038** で生成。`note-magazines.ts` の imageUrl が参照していた `civil-*-essay-cover.webp`（未生成だった＝note棚/サイト導線MagazineCardの画像欠落）を解消。commit 9f43371ae。総監等の既存マガジンカバーはネイビー据置（色適用するなら同テンプレに accentColor 指定で可能）。

**2026-06-02 マガジンカバー 資格色ベタ背景化 完了**: `magazine-banner` テンプレに `fillBg` variant を追加（背景全体を資格色で塗り＋文字を白系へ反転＋白グリッド、未指定は淡色のまま後方互換）。`generate-magazine-covers.mjs` で **土木6（1級青#155293/2級緑#1C5038）＋総監8（ネイビー#16365C）= 14マガジン**を塗り背景に。public/ webp ＋ マガジンdir/`_cover.png`（generatorが magazineDir フィールドで両出力）を再生成。commit b11772a04（土木）/384b314b4（総監）。**未塗り（任意で残置・ユーザー了承済）**: 総監テキスト精読ガイド・総監メリット完全マップ・コンクリート系(cd-essay #522A69/cce-essay #0A4F4F/tankan)は generator 未収録のため淡色のまま。

**2026-06-15 追記（cd-essay 収録＋色SoT教訓）**: cd-essay マガジンカバーを `generate-magazine-covers.mjs` に追加し意図色 **deep plum `#522A69`** で生成（診断士の記事カバーと統一）。**教訓**: 新規 exam のマガジンカバー色は `generate-magazine-covers.mjs` のハードコード一覧ではなく **`docs/design-system/note-cover-tokens.json`（配色SoT）を必ず先に見る**。今回 SoT 未確認で teal `#155E63` を割当→コンクリ主任技師(concrete-chief hue=teal)と衝突→是正という事故あり。concrete-diagnosis=plum(base#6E3A8C/deep#522A69)・concrete-chief=teal(#0F6E6E/#0A4F4F)。残り未収録は cce-essay(#0A4F4F)/tankan。

**2026-06-29 点検基盤整備（OGP 点検と対称）**: 全 note カバー484枚を点検。内訳=G2(cover:ブロック)462／mono-tag(coverTitle)22／H1自動0、PNG欠落0。視覚的にはフルカバー1280×670で破綻なし。
- `scripts/note-cover-gallery.mjs` 新設（`npm run note-cover-gallery` → `.tmp/note-cover-gallery.html`、ogp-gallery と対称・資格×種別で絞込）。
- `scripts/check-note-cover-fit.mjs` 新設（`npm run check-note-cover-fit`・pre-commit `--staged`）: banner/hi/hiSuffix/leadIn が**フル1280幅(上段1160px)を超えて画面外で切れる "真の溢れ" のみ**検出。`renderNoteCoverG2` のレイアウト式(bannerFontSize=590安全幅へ48〜110px連続縮小／hiFontSize)をミラー。
- **banner「7-11字推奨」は正方形630クロップの可読性目安**と明確化。実態は462本中**365本(79%)が超過**＝工事名列挙・科目名等の縮められない descriptive が正規で形骸化していたため、`note-cover.md`/`note-cover-tokens.json`/SKILL.md を実態へ整合（fontSizeSteps は目安・実装は連続式 を明記）。超過≠NG、画面外クリップのみNG。
- 真の溢れ2件のみ修正(目視確認済): BK-05_鋼構造及びコンクリート/R08-yosou article-III(推定1533px→「選択科目III 予想問題＋模範解答」単行)・防災減災キーワード(1285px→「流域治水・事前防災の論点を整理」単行)。
- commit **737edddb2** on `feat/note-cover-governance`（develop派生 worktree C:/tmp/dn-notecover、node_modules はメイン worktree へ junction）。**未 push/未 PR**。install-pre-commit はソース更新のみで `pre-commit:install` 未実行（共有 `.git/hooks` を破壊しないため＝別 worktree が新スクリプト未保有のうちは走らせない。マージ後に各セッションが再 install で有効化）。注意=ローカル develop(407052caf)が origin/develop(b487f2771)より1つ先行＝PR時に OGP commit がバンドルされ得る [[feedback_pr_squash_bundles_unpushed_commits]]。

**2026-06-29 キャラ variant（cover.character opt-in）**: renderNoteCoverG2 に `cover.character:<ポーズslug>` 指定時の variant 追加（右に先生立ち絵・左カラム左寄せコピー・メタは左上kicker・バナー全幅左寄せ）。generate-note-covers が character→data URL 化して合成。**無料/入口/もくじ/学習法/答案ハウツー系 計39枚**に適用（PR#291/#292/#293、develop→main デプロイ済み）。トーン別ポーズ自動割当（explaining/pointing/thinking/good-sign/wave）。**有料/過去問/キーワード/論点/白書/magazine内部はクリーンG2維持**（権威性）。**総監系19枚は本文の既存マガジンCTA債務（markdownリンク/¥）で note-lint 通らずskip＝要CTA整理（別件）**。`cover.character` 無しは従来G2のまま＝完全opt-in。banner溢れは check-note-cover-fit が担保。

**2026-06-30 ライブ note カバー差し替え＝無料55＋有料112 完了（campaign 全完）**：当初 eyecatch 差し替えUIが掴めず「未確立」としたが**完全動作するブラウザ自動化フローを確立**。動くツール＝scratchpad `note-cover-paid.mjs`（無料WORKING版に paywall 保持ゲートを追加した最終版・Playwright channel:chrome 永続プロファイル）。**正解フロー**＝editor遷移→(カバー有れば)カバーimg(`img[src*=st-note]`top<360)click→「削除」(getByRole button exact)→**button[name=画像を追加]**click→モーダルの**「画像をアップロード」をfileChooserで受けてsetFiles**(直接input不可・モーダル経由)→トリミング「保存」(exact)→**新カバーload確認(st-note|blob|uploads,top<380,polling 10×)＝fail-safe**→公開に進む→**[有料]有料エリア設定click→「このラインより先を有料にする」line present 確認(読み取りのみ・lineは動かさない＝本文不触なので境界は元々保持)→無ければABORT**→更新する→通知いいえ。**有料112枚＝1検証+chunk28×3+27 全て fail=0**。**最終 full sweep 113/113（112有料+検証R03）: eyecatch 全件 fresh ID(>=290,1xx 当日UP)・can_read=false 全件＝paywall 1件も開かず・price 不変**（note API v3 で実体検証）。**無料 stale 57枚中55枚**も別途反映済（残2＝序章はcover非stale＝対象外）。**coverless/paywall事故 0**。**重要前提＝カバー更新は本文を一切触らない→paywall境界は自然保持**（note-update-body の全文置換と違い境界「再設定」は不要・読み取り検証で十分）。**ハマりどころ**: (1)差し替えは削除→再追加方式、(2)uploadはモーダル「画像をアップロード」→fileChooser、(3)heredocは正規表現\\がJSONで潰れる→Writeツール、(4)BOM除去、(5)永続プロファイルは1Chromeインスタンスのみ＝チャンクは**並列不可・逐次**(20-28枚×background逐次)、(6)stale検出=`cover.png` git最終更新>`notePublishedAt`。**残=ツールを scripts/note-update-cover.mjs へ正式化＋npm登録＋PR（現状 .tmp/scratchpad）。worktreeは origin/develop 派生で（メイン作業ツリーは別セッション稼働中）**。
（旧メモ）

**2026-06-30 ライブ note カバー差し替えの自動化＝（旧:未確立メモ）**：公開済み note 記事の「古いカバーが残る」ドリフトを検出する方法を確立＝**`cover.png` の git 最終コミット日 > frontmatter `notePublishedAt` なら stale**（公開後に表紙が変わった＝ライブ未反映）。実測 **stale 169枚（無料57/有料112）**。だが**自動差し替えツールは未完成**：note editor の eyecatch 差し替えは多段フロー（カバーclick→「削除」→上部グレーのプレースホルダ→アップロードモーダル→トリミング確定→更新する）で、(1) eyecatch img 検出が load タイミングで flaky、(2) **削除→再追加方式のため途中失敗で記事がカバー無しになる**リスク。6回 DOM probe しても end-to-end 収束せず（各 probe がライブ口座セッション）→ 安全のため中断。WIP 骨子＝scratchpad `note-update-cover.WIP.mjs`。本文更新の `note-update-body.mjs`（実証済み）と違い**カバー更新は未開拓**。再開時は (a) eyecatch検出を待機/リトライ堅牢化、(b) fileChooser で upload、(c) 新カバー確定を検証してからのみ更新する fail-safe、(d) 1枚 live+API実証→分割バッチ。有料112は paywall 保持も要。または無料57は手動(1枚~30秒)が確実。

**未完了（次にやる）**:
1. 各マガジンは published:false / noteUrl 空 → note 実公開でユーザーが true 化（公開後にサイト導線 MagazineCard も画像付きで有効化）。**note公開済の総監マガジン（クロストレードオフ等）はカバー変更分の再アップロードが必要**。

**注意**: feature/civil-1-experience-essay-magazine ブランチは並行エージェント作業中（過去問模範答案集がステージ済だった）。コミット時は staged 一覧確認必須 [[feedback_git_add_verify_staged]] [[feedback_parallel_agent_git]]。関連 [[project_note_dir_reorg_by_exam]] [[feedback_no_price_in_mdx_body]]
