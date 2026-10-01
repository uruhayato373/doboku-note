---
name: quality-census
description: "全資格 採点カバレッジ census。npm run quality-census で資格×group×{採点/未採点/不合格/薄層}を可視化。新profileはcategoriesフィールド必須（2026-07-10 Phase0）"
metadata: 
  node_type: memory
  type: reference
  originSessionId: 0074550d-29e4-42a9-98e2-75e7510f3bb6
---

全 published 記事のルーブリック採点カバレッジを一望する census 基盤（2026-07-10 新設・commit 42a32723c）。5/17 GSC急落 RCA で「内部5軸ルーブリックは本文分量軸を持たず Google の index selection/demote と直交する」「採点が総監・civil-1 に偏り他資格ゼロ」が判明したのを受けて構築。真実源は [[project_content_resurrection]] 系でなく本文。

**使い方**: `npm run quality-census`（`.claude/scripts/build-quality-census.mjs`）→ `.claude/state/quality/census.json` を生成。`src/config/doc-meta-index.json`（published 真実源）× 全 `*quality-scores.json` を突合し、資格×group×{採点済み/未採点/不合格(weighted<2.0)/薄層} を集計。admin 品質タブ冒頭にも表示（`npm run admin` → `/api/quality-census`）。

**薄層(thin)の機械補完**: keyword/guide/textbook かつ 本文実質<3,000字（`check-guide-length` と同じ `body.replace(/\s/g,'').length` 計測=raw MDX・componentタグ込み）。ルーブリックを改変せず body_chars で demote リスクを可視化する設計。

**新 profile 追加の作法（重要）**:
- スコアは `.claude/state/quality/{profile}-scores.json` に既存2ファイル（`quality-scores.json`=cem/`civil-quality-scores.json`=civil-1）と同型で置く: `{version, categories:["<category>"], scored_at, pages:{<bare-slug>:{slug,group,scores,weighted,weak_axes,qualitative_comment,scored_at}}}`
- **top-level `categories` 必須**（census が bare slug→full slug を解決するため。既存2ファイルは LEGACY_SOURCES にハードコード）
- pages のキーは category を除いた bare slug（例 `guide-career`、full は `pe-construction-guide-career`）

**採点の実行パターン**: quality-cycle スキルの scripts-{profile}/ を新規に作らなくても、Evaluator エージェント（guide→`guide-qa` / 過去問→`past-exam-qa` / textbook→`civil-construction-review` / keyword→`cem-qa`・いずれも全資格横断）を直接 6〜9本/エージェントで並列起動し、census 互換 JSON を返させて親が {profile}-scores.json を書けば census が拾う。**weighted はエージェントが返す値を信用せず scores から決定論的に再計算**（0軸→1.0クランプ・textbookは mobile 0.3 重み。エージェント間でクランプ運用にブレがあるため）。均質な問題文アーカイブ群（pe-construction二次84本等）は少数サンプルで採点を確認後、残りをプログラム生成しても実採点と一致した。

**現況(2026-07-10)**: 採点 **1,064/1,064（100%）**。不合格 **75→8** に消化（Phase2 完遂に近い）。civil-1 secondary 8本は (A)規格表 override 免除（`content-rules.json` overrides.civil-construction-1.secondary で 1-3/1-4 無効化・真実源 exam-content-policy.md）＋検証済みURLパレット参考資料＋ArticleImage 121枚移行＋OCR修復＋**表2.11列崩壊の算術照合是正**で全合格。死リンク実測: sekokan-net.jp=NXDOMAIN→ejcm.or.jp、jiban.co.jp=web到達不能（パレットは in-repo 実績でも rot する＝**追加前に curl 実測必須**）。**最終残8=全て要外部照合/authoring**: civil-1 h27-a/h28-a（港則法・**spawnedセッション削除済＝宙に浮き・要再手配**）・r06-b/r07-b（マーク矛盾精査）・civil-2 r06-kouki（正答矛盾）・総監h28-30-secondary（解答方向性authoring）。処理は3系統: (A)構造規約ギャップ=ExamPoint/RelatedKeywords 一括付与でpe-first-stage 21・concrete 8・civil-2 4 を機械合格化 (B)**ルーブリック不適合はユーザー決定「正しいEvaluatorで再採点」で解消**=pillar/keyword/data/模範論文ハブ 9本を cem-qa・civil-construction-review で再採点し正当合格（である調ハブは linking/reference 軸が適合・内容mangling不要）(C)真の内容バグは source照合/authoring 要でLLM推測厳禁。

**再採点の重要教訓**: census weighted は各 `*-scores.json` の**保存 weighted 値をそのまま読む**（build-quality-census.mjs L110・軸名不問）。だから「正しい Evaluator を当てて axes 差し替え→weighted 再計算→保存」で misfit を解消できる。**ただし過去問扱いの解説ページ（civil-1 secondary 7本）は再採点しても不合格＝reference=0+4列超表+生img の真の多軸ギャップ**（misfit と誤分類していた）。**Phase3 の宿題=census を group→Evaluator の自動ルーティングに拡張**（今回は手動で当てた）。残15=civil-1 primary 4(h27-a/h28-a spawned・r06-b/r07-b マーク精査)+civil-1 secondary 7(多軸rewrite)+civil-2 r06-kouki(正答矛盾)+総監 h28-30-secondary(実際に薄い・authoring要)。分類詳細=`docs/todo/backlog.md`。総監keyword662は再採点しない。RCA真実源 `docs/reference/gsc-management.md`。[[feedback_guide_min_3000_chars]] と整合。
