---
name: project_note_magazine_cleanup
description: note 模範論文マガジンの note 非互換修正状況（河川コンサル完了、ゼネコン・環境調査が同種未対応）
metadata: 
  node_type: memory
  type: project
  originSessionId: 71a2b531-155c-450e-bff3-d2f6b202f28b
---

note マガジン `docs/note/magazines/総監模範論文-*` の模範論文は `pe-essay-draft` テンプレート由来で共通の note 非互換・品質問題を抱える: ①マークダウン pipe 表（note は描画しない）②figure-persona-profile 図版参照（手本は図版なし）③「トレードオフと解決フレームの整理」再掲節（テンプレ v1.5 で除外済み）④答案本文の箇条書き（手本=自治体道路担当は散文）。

2026-05-21 時点:
- **河川コンサル R03-R07**: 全5本修正完了（設問全文セクション追加・表箇条書き化・トレードオフ節削除・図版削除・答案散文化）。図版 `img/figure-persona-profile.{svg,png}` も削除。さらに解答字数を答案用紙の枚数制限に対し全15設問 92〜106%（健全帯）へリバランス済み（着手前は 56〜171% のばらつき）。手本は `総監模範論文-自治体道路担当` の対応年度。**2026-05-21 に note 公開済み**（マガジン m32132ecb3033、各記事 URL は frontmatter noteUrl/noteId・_meta.yaml・note-published.json に記録）。`note-magazines.ts` は published:true（次 /deploy で CTA 表示）。
- **ゼネコン R03-R07**: 全5本 **2026-05-21 に note 公開済み**（マガジン m32aaa137f22e、`note-magazines.ts` published:true）。各記事 URL は frontmatter noteUrl/noteId/notePublishedAt・_meta.yaml articles・note-published.json に記録済み（commit a52afde50）。構造修正＋字数リバランス（各設問 90〜108%）＋図版削除＋ハッシュタグ＋カバー生成も完了。
- **自治体道路担当（手本）R03-R07**: **2026-05-21 に note 公開済み**（マガジン m52186ffd12ca、`note-magazines.ts` essay-road-municipality-magazine published:true）。各記事 URL は frontmatter・_meta.yaml・note-published.json に記録済み（commit 452c2eddc）。R08-yosou のみ 2026-06 公開予定で未記録。全5本 解答字数を健全帯へリバランス完了（2026-05-21）。R03-R05 は実答案換算 ~97-105%、R06（着手前 各案 ~1,400字＝半分程度の過少）と R07（設問1/2 過少・設問3 超過）を本セッションで大幅加筆・圧縮し全設問 86〜105%。commit: R06 1dfb254cf / R07 c83c28c24。R07 設問(3)国家施策はA案・B案で共通文へ統一。
- **R08-yosou（道路担当・予想問題集）**: 構造が R03-R07 と異なる（`#### 設問（N）`＝H4、フル模範論文を 2 予想問題に内包、答案が箇条書きアウトライン形式）。note-essay-charcount.mjs は H2 設問前提のため測定不可。リバランス対象外。プロセ化／字数測定するなら別途スクリプト拡張と散文化判断が必要。
- **環境調査ペルソナ — 廃止・全削除（2026-05-21）**: 検証の結果、4ペルソナ中で最も需要が薄い（技術士の母体は建設部門に偏り環境部門は最小級、調査会社も小産業）と判断し、環境調査ペルソナを廃止。マガジン・サイト版模範論文6本・SNS素材・有料マガジン内の参照・R8 spoke 9本の `### 環境調査` 節・スキル属性キー・コードまで「固定4ペルソナ→固定3ペルソナ（ゼネコン/河川コンサル/自治体道路担当）」へ全面整合。判断記は `docs/note/noteコンテンツ計画.md`「ペルソナ再編判断記（2026-05-21）」。次の展開候補は「公務員河川担当」ペルソナ新設（task-queue T-026、検証ゲート付き）。2026-05-21 に develop→main へマージ・本番デプロイ完了（main `6343feccc`、Cloudflare Pages デプロイ success・pages.dev HTTP 200 確認）。作業ブランチは整理しローカル・リモートとも `main`/`develop` のみ。
- 散文化方針: 答案本文すべて散文化（手本準拠）。例外は SWOT 8項目（設問が列挙要求のため箇条書き維持）。
- **R06 設問(3) 視点狭小問題（2026-05-21 修正）**: R06 設問(3)は「事業や組織の枠を超えた国としての施策」を問い③で「我が国が直面する重要課題の視点を含めてよい」と明示するが、3マガジンとも旧解答が2施策ともペルソナの専門領域（建設業界・道路インフラ・河川流域）に閉じていた。修正: ゼネコン=再エネ主力電源化／カーボンプライシング（commit 73d7fde8d）、道路担当 A案B案統一=運輸部門の脱炭素化／コンパクトシティ（0b3b30aa8）、河川コンサル=自然由来の吸収源拡大／再エネ主力電源化（1e15937f1）。③に国家課題視点（エネルギー安全保障・地方の人口減少等）を追加。R07 設問(3)は3マガジンとも元から国家規模で問題なし。河川コンサル R06 は note 公開済み（n0c57fc5085c9）で、設問(3)修正の note 再アップロードも対応済み（2026-05-21）。
- **同問題の波及（2026-05-21）**: マガジンの複製元であるサイト版模範論文 `r06-essay-{general-contractor,river-consultant,road-municipality}`（`.local/r2/posts/pe-comprehensive-management/`、いずれも published:false）にも同じ狭小設問(3)が残存していたため、マガジンと同内容へ修正（commit 68a28485d）。`r06-essay-environment-survey`（森林吸収源・地熱）は国家規模で問題なし。再発防止スキル改修（commit 4a8622299）: pe-essay-draft v1.6 で設問3 国家施策例をテーマ別（CN／少子高齢化）に再構成、note-prepublish-review に section 7f（設問(3)スコープ目視喚起）追加。**これら2コミットは feat/moshimo-bookcard 上**（並行 BookCard 作業で develop へ checkout 不可のため。feat→develop マージで develop へ反映予定）。マガジン R06 修正3件は develop 済み。

関連: [[feedback_no_price_in_mdx_body]]、note レビューは `/note-prepublish-review`（pipe 表 BLOCK・blockquote は WARN・マガジン専用チェック有り）と `/pe-essay-review`（マガジン論文対応・解答字数充足率評価 v1.5）。解答字数測定は `.claude/scripts/note-essay-charcount.mjs`（設問別字数・A案/B案対応）。健全帯は答案用紙枚数上限の 85〜105%。
