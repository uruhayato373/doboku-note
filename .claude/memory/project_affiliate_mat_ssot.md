---
name: project_affiliate_mat_ssot
description: アフィリエイトmatのSSOT=affiliate-mats.json+check-affiliate-matsゲート。GKS脱直書き(program prop)・ビルドジョブ8/31期間切替・計測はeventNameベース
metadata: 
  node_type: memory
  type: project
  originSessionId: b6cc13d4-9be6-4de4-b464-7f47ba7f7238
---

アフィリエイト SSOT 整備（PR #253、2026-06-16）。

- **mat の SSOT** = `src/config/affiliate-mats.json`（A8 mat 8種・program/surface/expiresAt）。`scripts/check-affiliate-mats.mjs` が src/** と .local/r2/posts/** の `a8mat=` を突合し**未登録mat=ERROR / MDX(.local/r2/posts)への生mat直書き=ERROR / 失効(expiresAt経過)配置=WARN**。pre-commit installer と `npm run check-affiliate-mats` に配線済み（**ゲート有効化は各環境で `npm run pre-commit:install` が必要**、CI 未組込）。新規 mat は json に追加必須。
- **MDX の生 mat = 0（全 creative はコンポーネント/config 集約）**: GKS=`<CareerAffiliate program="gks">`、独学カード/SAT技術士=`<CourseAffiliate program="dokugaku-keiken"|"sat-gijutsusi" withPixel>`、独学インライン=`<DokugakuKeikenLink>`(新規)、独学468バナー=`<DokugakuBanner>`、SATテキスト=`<SatTextLink>`。mat変更は各component/config 1箇所で全配置反映。MDXに mat/生ピクセル<img>を直書きしない（lintがERROR）。
- **サイドバー転職枠は期間切替**: `resolveCareerSidebarAd()`（affiliate-creatives.ts）が **〜2026-08-31(JST) はビルドジョブ(無料面談¥50,000=GKSの2倍)／9-01 以降 GKS に自動復帰**。SSG のため 9/1 以降の再ビルドで反映。
- **2026-06-29 セッション(未merge・branch feat/inline-career-buildjob)**: サイト本文inline `<CareerAffiliate program="gks">`(civil 1/2＋建設部門 計162枚)も**期間連動化**＝campaign中ビルドジョブ/9-01 GKS。CareerAffiliate が program="gks" 時に `resolveCareerArticleEndCard()` 解決(href+コピー上書き)。MDX未変更。旧「inline/記事末は GKS据え置き」は是正。href のみ=ピクセルはサイドバー1発火維持。
- **note は A8 を貼れる(私の旧前提「note は A8 不可」は誤り)**: A8公式手順=「リンク先URLコピー」URL を**URL単独行→note リンクカード**(バナー画像は不可)。景表法で **PR表記必須**。**note は静的でサイトの resolveCareerSidebarAd のような期間自動復帰が無い→8/31キャンペーン終了後は手動見直し**(リンク生存・報酬は通常レート)。note記事用ビルドジョブ creative=`4B5OO5+FHBA2+5B0Y+NTJWY`(NTZCHバナーと同一プログラム別creative)。check-affiliate-mats は docs/note 非走査。branch feat/civil-note-funnel→develop merge+push 済。**キャリア無料6本(n5a823955985c/nfbff7b1469b6/n8b03a7de0c6b/n85d4b322898b/n6c68d022a56a/n96f94252c128)に PRビルドジョブカード＋末尾もくじ回遊を `npm run note-append-cta --commit` でライブ反映＋note API実体検証済(BJ✓もくじ✓×6)**。会員ツリーはexcludeDirsで除外。年収記事の段落充実はソースのみ(既公開記事の記事中ほど差し替えはclean live反映不可=/newはURL喪失)。note-append-cta=type方式追記・冪等・URL→OGPカード・通知いいえ・`.local/playwright-note-profile`(ログイン済)。**会社PCから note.com は断続不通(curl APIは HTTP 000/timeout 頻発だが Playwrightブラウザ経路は比較的堅牢)＝失敗時は冪等再実行**。**建設JOBs A/B(2026-06-29・branch feat/kensetsu-jobs-ab・未merge)**: 建設JOBs(リアルエステートWORKS・転職サイト・登録¥4,500・mat 4B41ZD+GGZS2I+4XWQ+BXB8X)を ビルドジョブ(面談¥50,000)と slug ハッシュ50/50 A/B。**サーフェスで戦略を直交**: (1)記事ページ=A/B(learn)＝resolveDocsCareerSidebarAd(category,slug)/resolveCareerArticleEndCard(slug) が fnv1a+isKensetsuJobsArm→resolveCareerSidebarAbArm で slug ハッシュ50/50(サイドバー＋モバイル記事末)。**inline 162枚はMDX内でslug持てず据え置きBuildJob固定→arm Bページは混在**(判定=建設JOBs隔離EPC vs ビルドジョブブレンドEPC)。(2)**カテゴリhub=両方表示(harvest)**＝resolveCategoryCareerAds が civil/建設部門で[建設JOBs,ビルドジョブ/GKS]2枠返し PCサイドバー縦積み＋モバイルはカード隙間。補完案件(登録¥4500 vs 面談¥50000・別行動・A8別課金)ゆえ1つに絞らない。総監はDX単独。trackLabel=KensetsuJobs-sidebar。各creative別pixel=別プログラム1回ずつ。低ボリュームで記事A/B有意差まで時間想定(期間スワップ推奨だったがユーザーがslug-hash維持選択)。
サイトinline(162枚)は **origin/main へ同期済(main==develop)＝本番ライブ確認済**(prod curl HTTP200・`<main>`有・NTZCH live・GKS mat消失=期間連動切替反映、2026-06-29)。8/31後 note リンク手動見直し(noteは静的)＋サイトは9/1再ビルドで自動GKS復帰。
- **計測**: クリックは `data-cta=affiliate` ＋ `affiliate_cta_click`(eventName)で集計。**ラベル allowlist 無し＝新ラベルは自動計測**だが GKS/BuildJob はページ単位でしか分離不可（単独CTRは customEvent 追加要）。
- **運用 SSOT = `.claude/knowledge/reference/affiliate-operations.md`**（2026-07-27 新設。旧 `docs/project/04_運営/02_アフィリエイト提携状況.md` は解体・削除＝歴史記録は git 履歴）。提携状態の機械可読な真実源は `.claude/state/ads/affiliate-catalog.json`、配線ゲートは `check-affiliate-wiring`（旧 `check-a8-wiring`）。関連 [[project_affiliate_3asp_site_guard]] [[feedback_no_price_in_mdx_body]] [[feedback_prevention_over_patching]]。
