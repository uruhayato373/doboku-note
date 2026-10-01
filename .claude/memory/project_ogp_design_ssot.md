---
name: project_ogp_design_ssot
description: "OGP(mono-tag)デザインのSSOT=docs/reference/ogp-prompts.md、noteカバーG2(試験=色/系列=濃淡・配色SoT note-cover-tokens.json)、OGP画像のR2同期ギャップと予防ゲート"
metadata:
  type: project
---

OGP デザインは「継続的に相談・改善」する方針（2026-06-16 ユーザー指示）。触る前に必ず真実源を読む。

**デザイン SSOT**: `docs/reference/ogp-prompts.md`（レイアウト・配色・テーマ色・変更履歴）。運用（コマンド/引数/改行/トラブル）は `.claude/skills/conversion/ogp-create/SKILL.md`。OGP デザインを変えたら**両方を同一コミットで更新**。

**現行 mono-tag ダーク既定（2026-06-29〜・`renderMonoTagDark`）**: 深紺グラデ地＋資格テーマ色。最上段＝資格名 kicker（左・**46px**）＋種別バッジ（右・**26px**）／中央＝主題（白・最大88px）＋サブタイトル（淡色・×0.46）／左下ドメイン（**21px・不透明度0.52**）。資格名はタイトルから除去し kicker に一本化。地＝**radial グラデ（左上寄り・資格テーマ色）のみ＝完全クリーン**（装飾なし）。**16px テーマ色外枠は2026-06-29撤去**（radial 化後に残った左上の小四角＝外枠の角だったため。コーナー装飾化も試作したがユーザー判断でミニマル採用）。分野色は radial 地の色味＋kicker＋バッジで担保（ライト/note カバーは外枠継続）。**「左上の四角」は satori が linear-gradient(135deg) の原点コーナーをブロック塗りするアーティファクトが原因→2026-06-29 に radial-gradient へ変更して解消**（grid/border ではない。md5でgrid有無=出力不変と実証）。全面グリッドは satori が描画しない no-op だったため同日 dead code 整理で撤去（無影響・ライト/note-coverは継続）。旧・左上の浮いた固定シアンバー80×4も同日撤去。試作の「資格名左バー」は「1級」の1と紛れ不採用。ライト旧配色は `--light` で再現可。

**過去問 per-page 規約（2026-06-29確定・真実源=ogp-prompts.md「過去問ページの per-page 規約」）**: 同じ過去問でも資格の構造で主題が変わる（揃えないのが正解）。下位区分があればそれを主題1行＋年度サブ（A3）、無ければ年度+種別を1段。建設部門 選択科目=A3（科目名1行・`\n`なし、サブ「令和X年度 選択科目 過去問」）／必須科目I=「必須科目I」＋年度／技術士第一次=科目区分（基礎/適性/専門科目（建設部門））＋年度／総監=shortTitle1段（科目軸なし・サブ無し）／コンクリ主任=分野名＋過去問解説／1級2級土木=title自体に資格名を含めず自動導出で重複しないため手動指定なし。全過去問の資格名重複は解消済。

**og:title 分離（2026-06-29・page.tsx:165）**: ソーシャルカードの `og:title`/`twitter:title` は `seoTitle` でなく素の `doc.meta.title`（資格名重複＋「｜…キーワード集」接尾辞をカード上で出さない）。`<title>`（検索）は引き続き `seoTitle`。

**テーマ色**: `docs/design-system/note-cover-tokens.json` の `exams[].base` を note カバーと**共用**（色の二重管理をしない）。`ogp-create.mjs` の `CATEGORY_TO_EXAM_KEY` + `resolveAccentColor()` が解決。新カテゴリ追加時は CATEGORY_TO_EXAM_KEY + note-cover-tokens.json + ogp-prompts.md の3点を更新。

**note-cover-g2 は別系統**: note 記事カバーは中央630セーフ幅(590px)を厳守（note フィード1:1クロップ対策）。mono-tag の全幅化と混同しない。`--debug-safety` は630赤枠を重ねる現役機能だが mono-tag では枠超過が正常＝目視は gallery を使う。

**QA**: `npm run ogp -- --all --force`（再生成）→ `npm run ogp-gallery`（`.tmp/ogp-gallery.html` に全 ogp.png をカテゴリ別フィルタ付き一覧）。スクリプト `scripts/ogp-gallery.mjs`。

**状態**: 2026-06-29 にダーク既定化＋上記の支援要素拡大＋過去問規約を develop へコミット済（ogp.png は全1033枚コミット済＝もう「未コミット」ではない。commit 83c91f460=テンプレ/SSOT/SKILL/frontmatter71・3ee83b639=png1033）。**push/deploy はユーザー判断で未実施**。並行セッション常態のため commit は pathspec 厳守。デザイン反復中は毎回デプロイしない（[[feedback_deploy_discipline]]）。

関連: [[project_ogp_design_ssot]]（note カバー G2 試験色分け）・[[project_ogp_design_ssot]]（og:image R2 404＝外部リンクカード不発の別問題）。

## 統合: OGP 画像の R2 同期ギャップ（旧 ogp_r2_sync_gap・2026-06-12）
note/X/Facebook の外部リンクカードが生成されない典型原因は og:image の R2 404（HTML は 200）。①OGP 生成は手動 `npm run ogp -- --all`（published:false はスキップ）②R2 同期は専用 `r2-sync.yml` の path フィルタが `ogp.png`（img/ の外）を拾わなかった→フィルタに `**/ogp.png`/`**/ogp.webp` を追加。予防ゲート `npm run check-ogp-coverage`（published:true の ogp.png 欠落を検知・`r2-audit.yml` 週次）。新カテゴリ追加手順は exam-content-policy.md Part4 step7。手動復旧: 生成→新規 ogp.png のみ pathspec commit→`gh workflow run r2-sync.yml -f dry_run=false -f images_only=true`→`curl --ssl-no-revoke --retry 5 -A facebookexternalhit/1.1` で 200（会社PCは R2 S3 API 遮断でローカル upload 不可・407/000 はノイズ）。現在 OGP は CI 供給（[[project_asset_audience_routing]]）。

## 統合: note カバー G2 とカバー運用（旧 note_cover_g2）
- note 記事カバーは G2 全幅バナー帯: **試験区分=ベース色／系列(notePricing)=濃淡**（1級土木=青 `#1E73C8`/2級=緑 `#2A7050`/総監=濃紺 `#16365C`/共通=ブロンズ `#9A6B1E`、主任技士=teal・診断士=plum）。値は `docs/design-system/note-cover-tokens.json`（配色 SoT）＋`note-cover.md`、テンプレ `renderNoteCoverG2`（satori）、生成 `scripts/generate-note-covers.mjs`、データ源は frontmatter `cover:` ブロック。**教訓: 新 exam のマガジンカバー色は generate-magazine-covers.mjs のハードコードでなく note-cover-tokens.json を必ず先に見る**（teal 衝突事故）。マガジンカバーは `magazine-banner`（`accentColor`/`fillBg`）。見た目を変えたら tokens の `designVersion` を上げる（V5 キャラカバー 2026-09-17〜）。
- 点検基盤: `npm run note-cover-gallery`、`check-note-cover-fit`（フル1280幅を超える「真の溢れ」のみ検出）。banner「7-11字推奨」は正方形630クロップの可読性目安で、462本中79%が超過しても正規（クリップのみ NG）。note カバーは中央630セーフ幅(590px)を厳守（mono-tag OGP の全幅化と別系統）。
- `cover.character:<ポーズ>` で右に先生立ち絵（opt-in・無料/入口/もくじ/学習法/答案ハウツー系39枚）。有料/過去問/キーワード/白書/magazine 内部はクリーン G2（権威性）。`generate-note-covers.mjs <slug>` は部分一致で他級まで巻き込む→dir 指定か生成後 git status。
- ライブ note カバー差替の技術（2026-06-30 無料55＋有料112 完了）は現在 `note-update-body --sync`/`--parts cover`（[[project_note_article_sync]]）。stale 検出＝`cover.png` の git 最終更新 > `notePublishedAt`（現在は台帳 coverHashes）。カバー更新は本文に触れないので有料境界は自然保持。
