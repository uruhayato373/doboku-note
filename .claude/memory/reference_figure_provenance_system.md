---
name: reference_figure_provenance_system
description: "図・画像・OGP資産の運用。図の出所/品質台帳(audit-figures)・孤児OGP検知(check-orphan-ogp)・cover/ogp全再生成の巻き込み・ガイドカバー写真とOGPスクリム・キャラ素材SSOT"
metadata:
  type: reference
---
記事図クロップの品質改善を「毎回手で辿らず」継続するための土台（2026-07-08 構築）。真実源 `docs/reference/figure-provenance.md`。

**3層**:
- `.claude/config/figure-sources.json` … 資格別ソース台帳（元素材の所在・種別・品質・再スキャン要否）。**手動SSOT**。
- `.claude/state/figure-text-audit.json` … 機械監査＝**写り込み**(OCR: leak/prose/maybe/clean)＋**画質**(ラプラシアン分散 sharp/soft/blurry)。`npm run audit-figure-text`。
- `.claude/state/figure-provenance.json` … 上2つ＋命名年度＋公開/掲載を join し各図の **needs** を算出。`npm run build-figure-provenance`。

**一括**: `npm run audit-figures`（図を直したら実行して更新）。

**needs（次アクション）**: recrop-urgent(答え漏らし)／recrop(写り込み・画質OK)／rescan(ボケ＋再スキャン可)／rescan-need-source／rescan-or-svg／ok。

**manual_needs（machine-blind 欠陥の per-figure 上書き・2026-07-09 追加）**: OCR/sharpnessで検出不能な欠陥は `figure-sources.json` の `manual_needs` 配列（`{figure:baseRel末尾, needs, reason, verified}`）に書く→build-figure-provenanceが末尾一致で needs 上書き＋`manualReason`出力→ギャラリー対応バッジ tooltip に理由表示。用途は**双方向**: ①見切れ図の upgrade（例 civil-1 工程表 r04-b/r05-b/r01-b/r07-b/r06-b-fig-02＝作業/ノード/ラベル欠落で鮮明clean判定だが `rescan-need-source`）②writein/prose 誤検出の ok 下押し（例 pe cost-variance図の(1)(2)下位図キャプション・化学式OCRノイズ・図の●凡例）。見切れは再クロップ不可＝要元スキャン。

**運用**: `npm run admin`→記事図版タブ→フィルタ「対応」で needs 別に絞る。カードに needs バッジ＋再スキャン図は source_dir ツールチップ。MDXリンクで開いて修正。

**重要な判断（この土台で確定した方針）**:
- ボケ図＝ラプラシアン分散で機械検出可（digital 800+/スキャン 18-118）。**rescan33は全てconcrete-chief**（PDF無し・書籍スキャン低品質）。civil/pe はゼロ（鮮明）。
- **過去問のデータグラフはSVG化禁止**＝図の幾何が答えそのもの・ボケ元から誤答を誘発。→再スキャンが正。SVGは構造が本文確定できる模式図のみ。
- 写り込み(recrop)は既存から再クロップで直る。答え漏らしの公開×掲載は既に0化済み [[project_civil1_figure_answer_leak]]。

**未実装の拡張**: クロップpipeline(civil-figure-rework/pdf-to-mdx)が切る時にsource PDF/page/bboxをprovenanceに書けば完全決定化。今は資格レベルのsource_dirのみ。

---

## 孤児 OGP の機械検知 check-orphan-ogp

孤児 OGP（記事 MDX が無いのに `ogp.png`/`ogp.webp` が git に残る死に資産）の機械検知は `npm run check-orphan-ogp`。`check-ogp-coverage`（記事あるがOGP無し）の逆方向。

- 実体: `scripts/check-orphan-ogp.mjs`。孤児判定は二重シグナル（①同ディレクトリに `.mdx` 同居 or ②いずれかの記事 slug の resolveOgpPath がそのディレクトリを指す）→ Convention A/B で誤検知なし。published:true/false 不問（下書きでも記事があれば正当）。
- `--fix` で孤児 OGP 削除＋空ディレクトリ掃除。`--json` あり。
- CI: `.github/workflows/r2-audit.yml`（週次 cron）に `check-ogp-coverage` の直後へ backstop 配線。pre-commit には入れていない（coverage と同じく CI-only）。
- 発端: 2026-07 に孤児掃除を試みた際、`reference-materials/{slug}/ogp.png` を「MDX無し孤児」と手動判定して削除したが**これは誤り**だった。記事は兄弟dir `reference-materials-{slug}/article.mdx`（ハイフン区切り Convention A・published:false 下書き）に実在し、OGP は `reference-materials/{slug}/ogp.png` に解決される。手動調査で `reference-materials/{slug}/` 内だけ MDX を探し兄弟dirを見落とした。→全OGP再生成(1dad48d25)で復元。
- 教訓: **check-orphan-ogp（機械）はこのケースを誤検知しない**（signal2＝resolveOgpDir が兄弟dirの slug を正しく `reference-materials/{slug}` に解決）。手動 grep より二重シグナルの機械判定が堅牢。OGP出力先dir≠記事MDX格納dir があり得る（Convention A のハイフン命名）ことに注意。[[project_gsc_pivot_2026_04]]

---

## generate-note-covers / ogp --all の巻き込み

`scripts/generate-note-covers.mjs`（`note-cover` 系）と `npm run ogp -- --all` は**全 dir を走査して再生成**する。自分の対象だけでなく、**他記事/他マガジンのカバー(cover.png/svg)・OGP を tracked変更(` M`) や untracked(`??`) として作業ツリーに残す**（カバーはバイト差で M になることがある）。

**Why:** 並行セッション常態下で、これらを `git add -A` すると他テリトリの成果物を巻き込んで壊す（[[feedback_multi_session_concurrent_git]] と同型）。実際 note キーワード記事6本制作時、generate-note-covers が 1級2級土木 経験記述・総監 模範論文の cover を13件 ` M` 化した。

**How to apply:**
- **`generate-note-covers.mjs` は位置引数でターゲット指定できる**＝全dir再生成を回避できる（2026-07-19 確認）。`node scripts/generate-note-covers.mjs "<記事dir名の部分文字列>"`（例 `"R8解答速報"`）で1記事だけ生成。完全一致 or 部分一致で解決。**引数無しで走らせない**（585ドラフト全再生成→巻き込み）。出力は記事dir直下でなく `img/cover.png` + `img/cover.svg`。
- `npm run ogp` も slug 必須（`node .../ogp-create.mjs <fullSlug>` or `--all`）。単記事は fullSlug 指定。
- それでも全再生成した場合: コミットは**自分の対象 path のみ明示 `git add`**（`git add -A` 禁止）。`git status --porcelain` で cover.png/svg 副作用を確認し本タスク外は `git restore <path>`（日本語パスは python の porcelain -z パースで確実に）。

---

## ガイドカバー写真と OGP スクリム

**ガイドカードのカバー写真**（PR #276）: ガイド記事（group:guide・全資格123本）のカードに資格テーマの AI 生成写真を表示。
- 生成: `npm run guide-covers`（`scripts/generate-guide-covers.mjs`・Imagen 4 fast・資格×5枚=35枚・~$0.70）→ `public/images/guide-covers/<category>/<n>.webp`（16:9・public 配信）。
- 機構: `src/config/guide-cover-photos.json`（資格別プール）＋ `src/lib/guide-cover.ts` `guideCoverFor(doc)`（slug 安定ハッシュで1枚選択）。`DocCard`（CategorySections）がガイドはカバー写真・他はブランドバンドに fallback。AI生成=出典/ライセンス表記不要（CC BY-SA 流用は uncaption カバーで帰属の壁があり不採用）。

**OGP に写真を載せる時の落とし穴（2026-06-26 検証）**: 現行 OGP テンプレ（`.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`）は背景の上に **70% オフホワイトのスクリム**（`rgba(253,252,248,0.7)`）を被せ、`generate-ogp-backgrounds.mjs` 側で背景を「淡く正規化」する設計（抽象テクスチャ＋可読タイトル前提）。→ **鮮やかな写真を OGP 背景に置くと ~30% しか見えない薄いゴースト**になる。`resolveBackgroundImage(category)` は per-exam 共有（`.claude/config/ogp/backgrounds/<exam-key>.{png,webp,jpg}`）。写真前向きの OGP（写真くっきり＋白タイトル）にするには**全面スクリムをやめ下部グラデ＋オーバーレイの photo-card 型テンプレを新設**する必要があり、単なる「同じ写真の使い回し」では済まない。OGP 一括再生成は全記事 ~2038 枚に及ぶ点も注意（[[reference_figure_provenance_system]]）。関連: [[reference_aidesigner_mcp]]（socialplus 参考のデザイン改善の流れ）。

---

## マスコット「doboku-note先生」の SSOT

ブランドマスコット「doboku-note 先生」（40代男性・土木技術者・先生役）を SSOT で管理化（2026-06-26, commit 2b2ffb376）。素材保存だけだったのを「真実源＋機械可読＋再利用ツール」に。

- **アイデンティティ SoT** = `docs/sns/_assets/character/CHARACTER-SPEC.md`（設定書＝人格/外見/ブランド色/避けたい表現/ロードマップ）。不変条件: ヘルメット文字 `doboku-note`・濃紺作業着＋黄反射ベスト・メガネ・セミリアル、`どぼくらぼ` 誤字や若すぎ/写真風はNG。VOICEVOX speaker 13（青山龍星）。
- **ポーズ機械可読 SoT** = `.claude/config/character-poses.json`（slug/file/label/category/beat、`verified:false`=AI生成からの自動推定名で要本人確認）。初版14ポーズ＋`_source/`生成元グリッド3枚。
- **運用 SSOT** = `docs/reference/character-asset-policy.md`（保存/命名/生成→抽出/チャネル別使用/管理分担）。CLAUDE.md索引に登録済み。
- **抽出ツール** = `npm run character-extract -- --in <dir> [--names ...] [--montage]`（無地背景生成画像→白背景 flood-fill 透過＋トリム→ポーズ名保存）。淡色/影が残れば aidesigner remove_image_background（無料）。

**Why:** AIは「透過」「同一人物9体グリッド」を守れない→1ポーズ=1画像・無地背景で生成→ツールで透過が確定運用（[[feedback_no_confirmation]] 同様、AIに無理をさせず後処理で担保）。
**How to apply:** ポーズ追加は character-extract→manifest追記→develop別worktreeでcommit。**エージェントは作らない**（pose選択=manifest引き・抽出=決定的処理。[[feedback_workflow_orchestration_gotchas]]）。リール合成は ig-reels-policy §7 の `character:"<pose>"`。関連 [[project_sns_v7_pivot]]。
