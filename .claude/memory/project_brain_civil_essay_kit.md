---
name: project_brain_civil_essay_kit
description: Brain販売用 Claude Code「施工経験記述設計キット」商品。Phase1スキル本体をC:\tmp に構築済み・別非公開リポジトリ前提
metadata: 
  node_type: memory
  type: project
  originSessionId: e1b18328-8614-4876-a422-c360a2e90a77
---

Brain向け商品①「Claude Codeで作る 1級・2級土木 施工経験記述 設計キット」。企画SSOT=`docs/project/05_プロダクト/brain-claude-code-essay-skill/`（00-product-spec〜04-build-plan）。

**2026-07-21 Phase1「最小スキル」を構築完了**（作成先はユーザー選択=別の非公開リポジトリ。リポジトリ確定までのステージングとして `C:\tmp\claude-code-civil-essay-kit\` に独立パッケージで組んだ。doboku-note リポジトリには一切コミットしていない）。

構成: `.claude/skills/draft-civil-experience-essay/`（SKILL.md＋references civil-1/civil-2/evidence-policy/rubric＋scripts check-answer-length/check-required-fields/check-placeholders＋assets 3テンプレ）、`.claude/agents/`（civil-essay-writer=Generator / civil-essay-reviewer=Evaluator）、examples 架空サンプル4本、START-HERE.md / LICENSE.txt / DISCLAIMER.txt / .gitignore。字数上限は公開試験仕様を転用（1級=罫線25字/行 current2各200・legacy3 225/275/175、2級=1項目250目安）。内部有料本文・内部パスは非転用（漏れスキャン clean）。

検証済み: 3スクリプトを examples happy path（全 exit0）＋ scratchpad 異常系（空欄/超過/プレースホルダ全て --strict exit1）で実走確認。

**2026-07-21 追加でPhase2〜4を完走**（同日）。
- Phase2 前方テスト: 汎用サブエージェント5体に答え伏せで架空/不足/機密/級取違え/超過を実行させ全ケース合格（捏造ゼロ・不足と級空欄は停止・機密は答案除外）。指摘された曖昧点をスキルへ反映=確認チェック未チェックも停止条件化／級tie-break（入力シート優先・不明は停止）明文化／仮値（令和X年等）検知をcheck-required-fields+check-placeholdersに追加／task-id採番規則追記。examples happy path全green・新ガード発火を再検証済。
- Phase3: FAQ.md・common-failures.md・START-HERE OS差追記・START-HERE.pdf生成（137KB・日本語埋込フォント確認済）。
- Phase4: 全同梱物 secrets/内部パス漏れスキャンclean・販売ページ商品内容10項目と突合一致・thumbnail.svg作成（PNG化は環境で不可＝手動export残）・beta ZIP作成（C:\tmp\claude-code-civil-essay-kit-beta.zip・161KB/32entry）。
- **ローカルgit init済**（commit 86bfff3・31 files・C:\tmp\claude-code-civil-essay-kit）。

**2026-07-22 private移設完了**（ユーザー報告）: repo=`claude-code-civil-essay-kit`(private・既定main)。C:\tmp\claude-code-civil-essay-kit が origin。

**2026-07-22 ココナラtest展開の配線済**（commit 2adc18cf5・develop）: `coconala-civil-keiken-kit`（status:'draft'・¥2,980・provision_format=2制作物）を coconala-services.ts/listings.json/thumb(PNG生成目視OK)/operations表/sales-recorder に配線、check-coconala-wiring✓。出品文はClaude Code/PC必須の対象外明記・外部URL不使用。**公開前ゲート=(1)納品ZIPの外部URL除去版(2)/coconala-publish --commit**。客層適合は弱い前提のtest。**ゲート(1)解消済**: kit repo に `coconala-dist` ブランチ（commit ca25677）で外部URL/Brain名を除去（LICENSE中立化・nodejs.org text化）、専用ZIP=`C:\tmp\claude-code-civil-essay-kit-coconala.zip`(164KB・外部URL0)を git archive で生成。main(Brain版)は無傷。develop push済(2adc18cf5→origin)。**2026-07-22 ココナラ本公開済**: `coconala-civil-keiken-kit` ¥3,000（¥2,980は500円刻み違反でABORT→修正）→ **listed** https://coconala.com/services/4322659 。coconala-edit --service-id 4322659 --commit --image で既存draft公開（publish.mjsは/services/add＝新規重複するのでedit使用が正）。納品=購入後トークルームで `claude-code-civil-essay-kit-coconala.zip`(外部URL除去版)を送付。

note入口記事（commit cee7d7e03・`docs/note/1級・2級土木/経験記述-AI設計-無料/article.md`・無料・published:false・キット導線）。

**2026-07-22 Brain出品turnkey化**: サムネPNG生成済（sharpでSVG→PNG・日本語目視OK・`C:\tmp\{claude-code-civil-essay-kit,pe-policy-bank-kit}\thumbnail.png`・1200×630）。手順集約=`docs/project/05_プロダクト/brain-publish-playbook.md`（両商品：タイトル/販売記事02・06/価格/ZIPパス/PNG/公開前チェック/禁止条件）。**残＝Brain販売者登録・特商法・審査提出（ユーザー・手動UI推奨。Playwright自動化は既存ツールゼロ＋審査ありで2商品なら非推奨）**。

**2026-07-22 Brain公開申請 完了（Playwright全自動・審査待ち）**: 記事=https://brain-market.com/a/b5EDO3UjMgoTZsNWa0JXY ・¥7,980・紹介OFF・部数無制限・審査後すぐ公開（原則24h以内・結果はメール）。配布=R2 `storage.doboku-note.com/brain/dist/claude-code-civil-essay-kit-beta-8K93ERd_D6fR.zip`（トークン付URL・HTTP200検証済・アップロード経路=`.claude/config/brain/dist/`+`scripts/upload-brain-dist-r2.mjs`+`r2-brain-dist.yml` workflow_dispatch・commit 5d698235a・main昇格済）。カテゴリは「ビジネス」のまま（Brainには「資格」カテゴリあり→審査後に変更検討）。

**2026-07-22 エージェント化・恒久実装済（commit 75038896b・develop）**: `/brain-publish` skill＋`brain-operator` agent＋カタログSoT `src/lib/brain-products.ts`（2商品submitted）＋`brain-listings.json`＋`brain-account.json`＋`scripts/brain-publish.mjs`（draft-first/--commit/--agree gate・下記ノウハウを全て組込）＋`check-brain-wiring`（pre-commit・ファイル存在ガード付き）。**運用SSOT=docs/reference/brain-operations.md（Brain UIのクセ表含む）＝以後はそちらが正**。.tmp/brain-*.mjs は使い捨て（退役）。並行セッションのブランチ切替で dist 消失→worktree(C:\tmp\wt-brain)経由で隔離コミットした（worktreeはnode_modules junction必須＝pre-commit hookが落ちる）。

**Brain自動化ノウハウ（歴史記録・恒久版はbrain-operations.md）**: プロファイル=`.local/playwright-brain-profile`（ユーザーログイン済セッション保持）。フロー=ホーム→「記事を書く」(JSクリック・viewport外対策)→審査ガイドライン同意モーダル(ユーザー許可必須)→エディタ`/a/<id>/edit`（タイトル=textarea[placeholder*=タイトル]・本文=.tiptap.ProseMirror へ行単位insertText+Enter・メイン画像=input[type=file]#0→トリミング「適用」必須）→「販売設定に進む」（**価格等はセッション状態＝保存されない。申請と同一セッションで設定必須**・販売金額=input[name=販売金額]）→「有料エリアの設定に進む」→段落間の「ラインをこの場所に変更」(非button要素・innermost+compareDocumentPositionでマーカー直前をクリック・現在位置は「有料ライン〜」prefix表示・**assertは可視テキストbody.innerTextで**=各コントロールに非表示代替ラベルがありDOM検査は誤検知)→「公開申請する」→確認モーダル（¥表示をassert）→モーダル内「公開申請する」→`/a/complete_published`遷移=真の成功シグナル。

**残（ユーザー判断ゲート）**: ①~~移設~~完了 ②~~thumbnail PNG化~~完了 ③β価格確定（仮7,980円）④Brain販売者情報・審査提出。**販売ページ原稿=02-brain-sales-page-draft.md／公開禁止条件=採点者/添削者/合格保証の誤認・本人未経験工事の自動生成・内部有料資料混入。doboku-noteリポジトリには未反映（キットはC:\tmp独立）。**

姉妹商品②=技術士総監「出題テーマ分析・国家施策バンク」（[[project_brain_r8_policy_bank]]相当・docs/project/05_プロダクト/brain-r8-policy-prediction-skill/・バックテスト未・未着手）。著者は元発注者・1級土木施工管理技士であり添削者/採点者/Anthropic認定を名乗らない（[[project_operator_pe_comprehensive_pass]]）。
