# Memory Index

## 作業スタイル・運用規律
- [feedback_skip_confirmations.md](feedback_skip_confirmations.md) — 確認をスキップして作業を最後まで進める
- [feedback_prevention_over_patching.md](feedback_prevention_over_patching.md) — 再発バグもエージェント自身の誤読・誤操作も自動検知で仕組み化（機械化は §9 の決定的ゲート基準を満たすときだけ・行動規範は CLAUDE.md §12）
- [feedback_gate_zero_coverage_false_pass.md](feedback_gate_zero_coverage_false_pass.md) — 「異常0件」と「検査0件」は同じ緑。偽赤（構造的に必ず赤い/取得不能をFAIL）も同じ害。**否定を1回の観測で断定すると待ち不足の偽陰性**。緑は実検査数、赤はゲート自身の欠陥を先に疑う
- [feedback_spec_from_measurement_not_catalog.md](feedback_spec_from_measurement_not_catalog.md) — 仕様はカタログの自己申告でなく既存成果物の実測から取る。誤った仕様で発注すると Generator/Evaluator 分離でも検出されない
- [feedback_out_of_expertise_needs_independent_qa.md](feedback_out_of_expertise_needs_independent_qa.md) — 合格科目外の分野は法令・告示レベルの誤りが混入する。分離QA＋WebSearchが実際にBLOCKを捕捉
- [feedback_platform_only_artifacts_destroyed_by_bulk_ops.md](feedback_platform_only_artifacts_destroyed_by_bulk_ops.md) — SoTに無いライブ固有の成果物(note PDF添付)は一括操作が黙って壊す。逃げ道オプションが要る＝既定を逆にすべきサイン
- [feedback_handoff_extract_before_delete.md](feedback_handoff_extract_before_delete.md) — handoff棚卸しは/doc-declutter経由・前送りタスク抽出してから削除・_archive廃止済み・check-handoff-extractionが素通り防止
- [feedback_deploy_discipline.md](feedback_deploy_discipline.md) — ブランチ運用真実源=CLAUDE.md。docs=develop直push/コード・バルク=PR
- [feedback_deploy_cadence.md](feedback_deploy_cadence.md) — 毎回本番デプロイしない。develop/:3020で反復、昇格はユーザー明示時のみ
- [feedback_deploy_mechanics_parallel_safe.md](feedback_deploy_mechanics_parallel_safe.md) — develop→main昇格の安全手順。ff昇格はorigin ref同士、CI権威ゲート
- [feedback_multi_session_concurrent_git.md](feedback_multi_session_concurrent_git.md) — 複数セッション並行が常態。push前にorigin/develop..HEAD巻き込み確認、pathspec厳守
- [feedback_shared_index_commit_safety.md](feedback_shared_index_commit_safety.md) — 並行時は共有index汚染。pathspec+plumbing原子ガード
- [feedback_pr_squash_bundles_unpushed_commits.md](feedback_pr_squash_bundles_unpushed_commits.md) — 先行developからbranch切るとsquashが未pushを巻込む。reset禁止、stash→merge→pop
- [feedback_parallel_agent_git.md](feedback_parallel_agent_git.md) — 並行時、想定外ファイルをgit checkoutで復元しない
- [feedback_git_add_verify_staged.md](feedback_git_add_verify_staged.md) — commit前にgit diff --cached --name-onlyで staged提示
- [feedback_metrics_cicd_supplied.md](feedback_metrics_cicd_supplied.md) — 計測はCI/CD供給が正。会社PCはプロキシで外部API遮断、ローカルcreds不要
- [feedback_tool_output_hallucination.md](feedback_tool_output_hallucination.md) — ツール出力幻覚注意。git/PowerShellで実体確認、python -X utf8
- [feedback_mdx_component_registration_build_invariant.md](feedback_mdx_component_registration_build_invariant.md) — MDX新規componentは本体+loader登録+使用の3点同時commitが本番build不変条件
- [feedback_mdx_script_frontmatter_safety.md](feedback_mdx_script_frontmatter_safety.md) — MDX一括スクリプトはfrontmatter分離してからregex(YAML indent破壊防止)

## GA/計測基盤・CI
- [feedback_ga_ssr_not_client_gate.md](feedback_ga_ssr_not_client_gate.md) — GAはSSR描画のまま(client-gatingで本番GA停止/PR#350)。除外はgtag呼出側でガード
- [reference_scheduled_workflow_default_branch.md](reference_scheduled_workflow_default_branch.md) — scheduled(cron) workflowはmain版で走る→CI workflow変更はmainへdeployしないと週次に効かない
- [project_operator_pe_comprehensive_pass.md](project_operator_pe_comprehensive_pass.md) — 運営者ペルソナ=自治体土木退職+10資格。SSoT=src/config/author.ts

## note 公開・価格・SoT
- [feedback_note_article_three_set_dod.md](feedback_note_article_three_set_dod.md) — note記事=article.md+img/cover.png+hashtags.txt の3点セット
- [feedback_note_prepublish_verify_not_proxy.md](feedback_note_prepublish_verify_not_proxy.md) — note公開前は代理指標でなく実条件検証。公式KW数=published_keywords(650)
- [feedback_note_publish_phantom_id_gate.md](feedback_note_publish_phantom_id_gate.md) — note公開fail=0は偽成功しうる。noteId実在照合+verify-note-status二層ゲート(PR#314)
- [feedback_reflow_alt_text_bug.md](feedback_reflow_alt_text_bug.md) — reflow後はgit diffで![行確認。note公開は必ずprepublish-review経由
- [feedback_note_paragraph_length.md](feedback_note_paragraph_length.md) — note段落は1〜2文・~120字。note-reflowで是正
- [feedback_note_link_card.md](feedback_note_link_card.md) — note内リンクはURL単独行でカード化(CTR高)
- [feedback_note_cta_no_price_linkcard.md](feedback_note_cta_no_price_linkcard.md) — noteマガジンCTAは価格書かない+URL単独行+短段落
- [feedback_mokuji_index_cta_format.md](feedback_mokuji_index_cta_format.md) — もくじindexは主力=導入文+カード/ロングテール=列挙温存・¥禁止・L1は資格ルーター薄型化(2026-07-06刷新)
- [feedback_no_price_in_mdx_body.md](feedback_no_price_in_mdx_body.md) — note価格・IDはMDX直書き禁止。SoT=note-magazines.ts、白書=whitepapers.ts
- [feedback_note_price_three_layer_drift.md](feedback_note_price_three_layer_drift.md) — 価格は doc/frontmatter/live の3層。全層に当てないとドリフト、frontmatter↔live照合だけでは両方誤りを検出不能
- [feedback_note_magazine_url_injection.md](feedback_note_magazine_url_injection.md) — マガジンURL反映はinject-magazine-url.cjs(手作業sedはCRLF破壊)
- [feedback_new_magazine_wiring_gate.md](feedback_new_magazine_wiring_gate.md) — 新マガジンはnote-magazines.ts登録だけでは未配線。check-magazine-wiring
- [feedback_essay_pack_ssot_adr.md](feedback_essay_pack_ssot_adr.md) — 総監記述パック構成/価格はADR 総監マガジン構成_決定2026.md を先に読む(上¥14,800/下¥5,480)
- [feedback_essay_magazine_meta_yaml_retired.md](feedback_essay_magazine_meta_yaml_retired.md) — ペルソナ別_meta.yamlは廃止。SoT=note-magazines.ts/pdf-specs/frontmatter
- [feedback_content_deprecation_cross_lineage.md](feedback_content_deprecation_cross_lineage.md) — コンテンツ廃止決定は全article系統に横展開+note-lint機械ゲート化
- [feedback_sns_docs_url_flat_slug.md](feedback_sns_docs_url_flat_slug.md) — SNS+MDXの/docs/リンクは本番フラットslug必須(check-sns-urls.mjs)
- [reference_note_selling_structures.md](reference_note_selling_structures.md) — note内部「売れる構成9型」SSOT=note-selling-structures.md。funnelとは直交
- [project_note_write_automation.md](project_note_write_automation.md) — note編集自動化(channel:chrome)。読取=verify-note-magazines/書込=note-edit-session
- [project_publish_note_skill.md](project_publish_note_skill.md) — publish-note skill(browser-use/Mac)。リンクカード/有料境界は半手動・実走未検証
- [project_paid_note_scope.md](project_paid_note_scope.md) — 精読ガイド5本=論点整理中心。論述指南は別商品
- [project_paid_note_pricing.md](project_paid_note_pricing.md) — note価格はyamlが真実源。総監精読¥500×5→セット¥1,980

## 模範論文(総監essay)品質軸
- [feedback_essay_char_limit.md](feedback_essay_char_limit.md) — 各施策600字以内を最優先軸で最初に提示
- [feedback_essay_q2_prose.md](feedback_essay_q2_prose.md) — 設問(2)は散文化(箇条書き禁止)
- [feedback_essay_q3_general_level.md](feedback_essay_q3_general_level.md) — 設問(3)は一般技術者レベル(法制度/ICT専門用語回避)
- [feedback_essay_persona_authentic_seat.md](feedback_essay_persona_authentic_seat.md) — ペルソナは著者の真実の経験座(元自治体土木=発注者)に限定
- [feedback_essay_persona_field_label.md](feedback_essay_persona_field_label.md) — 専門分野枠は正しい技術士選択科目に対応(建設科目を流用しない)
- [feedback_essay_persona_label.md](feedback_essay_persona_label.md) — 立場ラベルは越権施策を生まないシンプルな肩書き
- [feedback_whitepaper_source_check.md](feedback_whitepaper_source_check.md) — 白書出典は章構成/原表現をWebSearchで確認してから書く
- [project_cem_essay_agent_pair.md](project_cem_essay_agent_pair.md) — 総監記述note専任ペア cem-essay-writer/qa。5軸ランブック=note-essay-review-checklist.md

## キーワード/過去問ページ品質
- [feedback_no_pe_construction_application.md](feedback_no_pe_construction_application.md) — 総監に教材外実務応用H2を追加しない(lint 9-7)
- [feedback_cem_5kanri_scope.md](feedback_cem_5kanri_scope.md) — 5管理トレードオフH3は現場判断KW限定、歴史/政策こじつけない
- [feedback_tradeoff_structure.md](feedback_tradeoff_structure.md) — 管理間トレードオフは管理の核同士の対称関係で書く
- [feedback_proofread_exam_callout_check.md](feedback_proofread_exam_callout_check.md) — 校正時PEは過去問逆引きで未カバー引っかけをCallout提案
- [feedback_content_structure.md](feedback_content_structure.md) — 図表は本文統合/数式÷でSVG化/歴史は出なければ省く
- [feedback_no_redundant_overview_tables.md](feedback_no_redundant_overview_tables.md) — 冒頭重複のキーバリュー概要表を作らない
- [feedback_bold_scope.md](feedback_bold_scope.md) — 概念定義の太字は核心KWのみ30字以下
- [feedback_article_image_caption.md](feedback_article_image_caption.md) — <ArticleImage>のcaptionは使わない(altのみ)
- [feedback_exam_pdf_cross_reference.md](feedback_exam_pdf_cross_reference.md) — 過去問MDXは生成/修正とも全問原典PDF視覚突合が必須
- [feedback_pdf_filename_year_verify.md](feedback_pdf_filename_year_verify.md) — 再配布過去問PDFはファイル名/表紙年度入替あり。import前PyMuPDF視覚確認
- [feedback_url_verification.md](feedback_url_verification.md) — 参考URLはWebSearch→WebFetchで実在確認
- [feedback_url_fabrication_avoid.md](feedback_url_fabrication_avoid.md) — 新規URLはWebFetch実在確認必須(連番URL捏造事故)

## SVG/OGP/画像・SNS
- [project_svg_figure_governance.md](project_svg_figure_governance.md) — 図版SVGガバナンス5層。SVG監査校正を触る前に読む
- [feedback_svg_visual_qa_before_commit.md](feedback_svg_visual_qa_before_commit.md) — IG図(docs/sns)はaudit対象外→PNG目視が唯一QA(ig-figure-pack Step0)
- [feedback_svg_arrow_marker.md](feedback_svg_arrow_marker.md) — SVG矢印は右向き三角形で定義(orient=autoが崩す)
- [feedback_title_autofit.md](feedback_title_autofit.md) — 大型タイトル改行は段階フォントauto-fit(fit-title.mjs)
- [feedback_ig_keyword_pack_color.md](feedback_ig_keyword_pack_color.md) — IGキーワードパック配色は総監統一色(#1a3a5c/#a36b2c)。既存SVG確認必須
- [feedback_ig_pack_posted_json.md](feedback_ig_pack_posted_json.md) — IGパック公開記録=各パック直下posted.json、予約=status.json
- [feedback_x_hashtag_count.md](feedback_x_hashtag_count.md) — Xハッシュタグ1-3個最適(IG/noteは20+で別系統)
- [feedback_x_base_hashtags.md](feedback_x_base_hashtags.md) — X総監ベースタグ=#技術士 #総監
- [feedback_publish_x_false_success.md](feedback_publish_x_false_success.md) — publish-x予約完了ログは偽成功あり。全件ダンプで実査
- [project_ogp_design_ssot.md](project_ogp_design_ssot.md) — OGPデザインSSOT=ogp-prompts.md(全幅・資格別色)。QA=npm run ogp-gallery
- [project_ogp_r2_sync_gap.md](project_ogp_r2_sync_gap.md) — 外部リンクカード出ない=og:imageがR2で404。生成+gh workflow run r2-sync
- [project_affiliate_mat_ssot.md](project_affiliate_mat_ssot.md) — アフィリmat SSOT=affiliate-mats.json+check-affiliate-mats
- [project_affiliate_3asp_site_guard.md](project_affiliate_3asp_site_guard.md) — 3ASP横断アフィリ。運用SSOT=.claude/knowledge/reference/affiliate-operations.md・afb既定stats47→asp-site-guardが例外で停止
- [project_sns_v7_pivot.md](project_sns_v7_pivot.md) — SNS戦略v7/v7.1(IGメイン化・YT派生・ハイライト6種)

## 環境・制約・ツール
- [reference_note_image_cdn_settle_timeout.md](reference_note_image_cdn_settle_timeout.md) — note本文画像のCDN確定が会社PCプロキシで既定90秒超→NOTE_IMG_SETTLE_*で延長。保存はされず破損なし
- [reference_gh_jq_msys_path_mangling.md](reference_gh_jq_msys_path_mangling.md) — gh の --jq 内の "/" を Git Bash が Windows パスに化かす→監視ループが無言で空。--template を使う
- [reference_tailwind_transform_broken.md](reference_tailwind_transform_broken.md) — Tailwind transform変種(rotate/translate)が本buildで無効→回転等はglobals.css素CSS(.disclosure-chevron)
- [reference_browser_transition_measure_artifact.md](reference_browser_transition_measure_artifact.md) — ブラウザペインのgetComputedStyleはtransition中の開始フレームを返す→transition無効化で最終値測定
- [reference_local_build_io_bound.md](reference_local_build_io_bound.md) — ローカルビルドはCPUでなくファイル数律速(EDRが1ファイル20-45ms)。遅い時はout/とpublic/を数える。CIは無関係
- [reference_gdrive_binary_limit.md](reference_gdrive_binary_limit.md) — Google Drive MCPはバイナリ不可(base64 25K超)。回避=ブラウザ/OAuthスクリプト
- [reference_gmail_mcp_only.md](reference_gmail_mcp_only.md) — GmailはMCPでのみ読める(Playwrightはブロック)。接続はuruhayato373のみ→0件は「宛先が見えていない」。ココナラ運営通知/Brainは別宛先
- [reference_git_gc_concurrent_commit_corruption.md](reference_git_gc_concurrent_commit_corruption.md) — gc --prune=now 走行中のcommitはtree欠損で破損。gcは前景で完走／復旧=reset --mixed→再commit
- [reference_git_show_ref_path_false_pass.md](reference_git_show_ref_path_false_pass.md) — git show <ref>:<path> はパスが壊れexit128・0バイト→grepで偽PASS。ref上の検査は git grep <ref> -- <path>
- [reference_admin_worktree_turbopack.md](reference_admin_worktree_turbopack.md) — admin-app worktree検証でTurbopackがnode_modules junction拒否→turbopack.root親へ広げる/junctionはrmdirで外してから削除
- [reference_next_dev_single_instance_per_dir.md](reference_next_dev_single_instance_per_dir.md) — Next16は同一dirのdev serverを2つ起動不可(ポート変更でも不可)。npm run adminのkill-portが他セッションを殺す
- [reference_bash_heredoc_crlf_broken.md](reference_bash_heredoc_crlf_broken.md) — BashツールのheredocはCRLFで終端不一致→ファイル生成はWrite/python(newline='')
- [reference_worktree_node_modules_and_crlf_tests.md](reference_worktree_node_modules_and_crlf_tests.md) — worktreeはnode_modules欠落＋gitignore生成物(doc-meta-index.json)欠落で偽失敗（junction共有と本体コピー→rmdirで撤去）。CRLF作業ツリーは`
`固定regexテストをWindows限定で壊す
- [project_ig_api_posting_setup.md](project_ig_api_posting_setup.md) — IG API予約は会社PCプロキシがgraph.facebook.com遮断→Mac/Actions
- [feedback_pdf_on_demand_only.md](feedback_pdf_on_demand_only.md) — マガジン紙用PDFは必要時のみ生成。検証はspec妥当性+見出し存在
- [project_obsidian_sync_routines.md](project_obsidian_sync_routines.md) — Obsidian同期の実体はobsidian repoのGitHub Actions(3時間おき)。**旧Claude Schedule routineは消滅**／commits APIはsha無しだとmainのみ＝develop取りこぼしの罠

## 進行中/最近の案件（完了は退役検討）
- [project_brain_civil_essay_kit.md](project_brain_civil_essay_kit.md) — Brain商品①施工経験記述設計キット。**Brain公開申請済(Playwright全自動・¥7,980・審査待ち)**＋ココナラlisted。Brain自動化ノウハウ収録
- [project_brain_r8_policy_bank.md](project_brain_r8_policy_bank.md) — Brain商品②総監 施策バンク。**R6/R7統制run完了(R6=3/3・R7=1/3=K=11設計の実証)→Brain公開申請済(¥9,800・審査待ち)**＋ココナラPDF listed
- [project_buildjob_impressions_campaign.md](project_buildjob_impressions_campaign.md) — ビルドジョブ露出最大化(PR#378+note11本公開:既存8+N7-N9)。8/31期限・9/1 GKS自動復帰・GA4登録済(07-07)・note投稿はこのPCで可・残=A8 EPC月末
- [project_competitor_genba_career.md](project_competitor_genba_career.md) — genba-career.com=運営者ペルソナが重なる唯一の競合。同一広告主で成果競合・差は網羅でなく一人称の具体性
- [project_civil1_h29_corpus_drift.md](project_civil1_h29_corpus_drift.md) — primary-h29-a は原典と26/60問ずれ。原典本のH29以降スキャンが欠損、代替=dobokujira.com＋git履歴復元
- [project_civil1_shikou_law_expansion.md](project_civil1_shikou_law_expansion.md) — 1級土木 施工管理・法規編→サイト拡充(新規11ページ)。緊急=法規5,000万/労基就業制限表
- [project_civil_membership_library_pivot.md](project_civil_membership_library_pivot.md) — 土木セコカン合格ラボ=ライブラリ内包(完成答案/過去問OK・FLOWのみ一線)。PR#327
- [project_coconala_tensaku_channel.md](project_coconala_tensaku_channel.md) — ココナラ第3チャネル。**初売上08-04→教材3段はしご＋添削つきプレミアム¥15,000へ再構成・廃止5件archived・不在中は全件休止(8/17復帰)**
- [project_civil1_flagship_pack.md](project_civil1_flagship_pack.md) — 1級土木 経験記述¥9,800旗艦パック+3層戦略(PR#294)
- [project_civil1_ig_pack_campaign.md](project_civil1_ig_pack_campaign.md) — 1級土木IGカルーセル全12年度228パック完成。残=reels/stories/採点
- [project_civil1_combo_essay.md](project_civil1_combo_essay.md) — 1級土木「2テーマ組合せ大全」30答案。残=カバー/公開
- [project_civil_keiken_note_compat.md](project_civil_keiken_note_compat.md) — 1級2級 施工経験記述noteをnote互換化+カバー完了。残=published:true
- [project_author_authority_banner.md](project_author_authority_banner.md) — 著者オーソリティ汎用バナー(総監=分析力/元発注者=採点眼/施工管理技士=当事者)。土木note195記事配置・SSOT=author-authority-banner.md・残=カバー超過36本/textual展開/再パブリッシュ
- [project_civil2_keiken_essay_line.md](project_civil2_keiken_essay_line.md) — 2級土木 施工経験記述展開。Phase1/2完成、配線deferred
- [project_keiken_charcount_gate.md](project_keiken_charcount_gate.md) — 経験記述字数チェック/keiken-charcount新設(解答欄超過を公開前圧縮)
- [project_setsumon3_policy_bank.md](project_setsumon3_policy_bank.md) — 「設問3国家施策バンク」11テーマ(draft,¥2,480)。残=SoT登録/公開
- [project_pe_construction_note_funnel.md](project_pe_construction_note_funnel.md) — 建設部門noteファネル(もくじ12+無料16本)。論点KW6本hold
- [project_persona_donsen_hub.md](project_persona_donsen_hub.md) — 総監14ペルソナ導線ハブ完了。残=note実公開/deploy
- [project_essay_persona_water_municipality.md](project_essay_persona_water_municipality.md) — 総監模範論文 全11ペルソナ公開品質化完了。残=note実公開
- [project_cross_tradeoff_magazine.md](project_cross_tradeoff_magazine.md) — クロストレードオフ有料6記事published。残=note-magazines.ts登録/図
- [project_r8_essay_magazine.md](project_r8_essay_magazine.md) — R8予想問題集6記事改善(AI社会完了、残5)
- [project_note_magazine_cleanup.md](project_note_magazine_cleanup.md) — 模範論文マガジンnote非互換修正(河川完了、ゼネコン/環境未対応)
- [project_secondary_q1_cta_policy.md](project_secondary_q1_cta_policy.md) — 二次問1経験記述は書き方置かずCTA。全10ページ適用、未deploy
- [project_note_live_cta_drift.md](project_note_live_cta_drift.md) — note CTAがソースにあるがライブに出ないドリフト。ライブ照合=note API v3
- [project_note_cover_g2.md](project_note_cover_g2.md) — noteカバーG2刷新(試験=色/系列=濃淡)。1級2級パイロット完了
- [project_svg_illustration_runway.md](project_svg_illustration_runway.md) — 総監KW SVG図版ランウェイ(Tier1=15本・週2-3本)
- [project_ios_app_design.md](project_ios_app_design.md) — iOSアプリ設計5ドキュ完成。買い切り¥1,800・着手はWeb¥15k達成後
- [project_river_design_import.md](project_river_design_import.md) — 河川砂防技術基準(設計編)PDF→MDX変換進捗
- [project_skill_templates.md](project_skill_templates.md) — スキルテンプレート化。新資格追加時スキル追加不要へ
- [project_video_content_pipeline.md](project_video_content_pipeline.md) — DN-0110動画パック基盤Phase0-3完了(企画33/pilot4=qa_passed)。残=mp4生成(Mac:VOICEVOX+ffmpeg)とユーザー承認

## 退役した案件（完了。索引から外し、ファイルは残す。必要なら名前で Read）

[project_civil1_textbook_transcription](project_civil1_textbook_transcription.md), [project_pe_construction_bk_magazines](project_pe_construction_bk_magazines.md), [project_note_dir_reorg_by_exam](project_note_dir_reorg_by_exam.md), [project_sales_log](project_sales_log.md), [project_x_multi_exam_agents](project_x_multi_exam_agents.md), [project_x_30days_campaign](project_x_30days_campaign.md), [project_ig_exam_packs_exam_axis](project_ig_exam_packs_exam_axis.md), [project_yt_shorts_quality_campaign](project_yt_shorts_quality_campaign.md), [project_ig_carousel_quality_campaign](project_ig_carousel_quality_campaign.md), [project_cem_youtube_strategy_ssot](project_cem_youtube_strategy_ssot.md), [project_character_assets](project_character_assets.md), [project_pe_first_stage_audit](project_pe_first_stage_audit.md), [project_civil_textbook_cycle](project_civil_textbook_cycle.md), [project_issue29_internal_links](project_issue29_internal_links.md), [project_strategy_docs](project_strategy_docs.md), [project_multi_exam_expansion](project_multi_exam_expansion.md), [project_admin_app_consolidation](project_admin_app_consolidation.md)
