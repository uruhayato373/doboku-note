---
name: project_ig_exam_packs_exam_axis
description: IG _exam-packs は試験軸ディレクトリで全資格対称配置（技術士総監/1級土木/2級土木）。総監のレガシー直下は2026-06-02に廃止
metadata: 
  node_type: memory
  type: project
  originSessionId: d1769fb2-37dd-4e1d-a6ea-3ebfa5e8b1ec
---

IG 過去問パックの格納規約: `docs/sns/instagram/_exam-packs/{試験}/{年度}/pack-NN/`。試験軸 = `技術士総監`（既定）/ `1級土木` / `2級土木`（将来）。

2026-06-02（commit 1909b6f23）に技術士総監を旧レガシー直下 `_exam-packs/{年度}/` から `_exam-packs/技術士総監/{年度}/` へ git mv して対称化。

**Why:** 総監だけ exam 軸が暗黙（直下）で、1級土木追加により非対称化。2級追加でさらに歪むため。

**How to apply:**
- `ig-post-create.mjs` / `ig-reel-create.mjs` / `yt-shorts-create.mjs` は `--exam-dir` 省略時に `技術士総監` を既定で解決。1級・2級は `--exam-dir 1級土木` 等で明示。
- 1級土木は全12年度228パック・carousel のみ完成（slide-data+PNG+caption）。reels/stories/_summary は未整備。生成器=[[project_civil1_ig_pack_campaign]] 参照（generate-civil-1-pack.mjs + generate-caption.cjs は exam 別対応済み）。
- 2級土木は全10回123パック生成済み（2026-06-02, c862f4302）。前期/後期分離（案1）で年度コード r05z(前期)/r05k(後期)。生成器 parse-civil-2-questions.mjs + generate-civil-2-pack.mjs。2級MDXは表記ゆれ多数（正答「正解:(N)」/解説「(N)〜」/設問選択肢の太字 **(N)**/見出しカテゴリ名混入/CRLF）に対応済み。carousel のみ（reels/stories 未生成）。緑#2A7050試験識別カバー。
- concat.txt は別マシン絶対パスの再生成専用アーティファクト（実行毎に上書き）なので移行時に中身更新不要。
- SoT: docs/reference/ig-carousel-skill.md のディレクトリ規約 callout。

**カバー意匠（試験識別カバー exam-cover-ig）の適用状況（2026-06-02, 337faade7）:**
- 問題/解答/CTA スライドは quiz-slides.mjs 共通テンプレで全試験同一（古くない）。差が出るのはカバーのみ。
- 総監42パックの **carousel カバー**を旧 quiz-cover → exam-cover-ig（紺帯+「技術士/総合技術監理部門」+年度）に統一済み。slide-data に _meta.exam=pe-comprehensive/examDir=技術士総監/fmtLabel=択一式 過去問 を付与し cover を title=年度/subtitle=形式/sectionTag=過去問 に変換。
- **テンプレ実装は完了（2026-06-02, 5a659072c）**: exam-cover-ig.mjs を format(carousel|reels|stories)対応に拡張（LAYOUTS 分岐、carousel 座標は厳密温存＝バイト一致確認済み）。ig-post-create は examCover を carousel+reels に適用（format=size.name 渡し）。build-stories は _meta.exam があれば stories カバーを exam-cover-ig(stories)で描画。総監 r07-pack-01 でパイロット描画・目視OK（PNG はコミット未含、revert 済み）。
- **reels/stories カバーPNG も更新済み（2026-06-02, b66151447）**: 総監42パックの reels/img/00-cover.png + stories/img/01-cover.png を新試験識別カバーに再生成。carousel(337faade7)と合わせ静止カバーは全フォーマット新デザイン。
- **残（要フォロー・エンジン有環境）**: ① reels video.mp4 の1枚目が旧カバーのまま（ffmpeg/VOICEVOX 不在で再生成不可）。IG Reels はカスタムカバー指定可なのでサムネは新PNGで運用可、mp4完全一致は `ig-reel-create --exam {年}-pack-NN` をエンジン有環境で実行時に解消。② r03-r06 reels の 09-cta.png が旧テンプレ世代のまま（r07 は更新済み）→ `ig-post-create --size reels` 再描画で差分化する既知の世代ドリフト、要別途統一。1級土木は reels 自体未生成なので新規生成時に自動で新カバー。
