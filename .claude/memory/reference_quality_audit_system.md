---
name: reference_quality_audit_system
description: "品質・検査基盤の罠。quality:audit/lint-mdx-mobile ルール追加・採点census・追跡下 vs on-disk 件数・URL移行の置き去り参照(check-e2e-targets)"
metadata:
  type: reference
---
機械品質チェックの統合基盤（2026-07-14 新設）。[[reference_quality_audit_system]] [[feedback_knip_dead_code_audit]] と同系統。

**統合ランナー**: `npm run quality:audit`（report→`.claude/state/quality/audit-latest.md`）/ `quality:audit:ci`（CI gate・15チェック・fail/timeoutでexit 1）。定義は `scripts/quality-audit.mjs` の宣言的 CHECKS 配列（`{id, npm|cmd, timeout, ci:bool, skip()}`）。ci.yml は `quality:audit:ci → build` に集約済み。report-only に降格した既存債務: internal-links（concrete-chief の RelatedKeywords BROKEN_SLUG）、note-meta-lint（`node:fs/promises` の glob が Node20 未提供でクラッシュ＝要修正）。

**新規チェックの三点セット**: 閾値=`.claude/config/*`（content-rules.json/image-limits.json）、純ロジック=`#lib/*`（mdx-hygiene-rules/image-audit・ユニットテスト付）、`quality-audit.mjs` の CHECKS 登録。画像=`check-image-assets`（baseline=image-baseline.json）、SVG=detect.mjs の P13/P14/P15。

**lint-mdx-mobile.mjs にルール追加する時の罠（重要）**:
1. **rule-ID 名前空間は既存を必ず確認**: `grep "rule: '" lint-mdx-mobile.mjs` で洗い出す。7-1/7-2 は既存の太字スコープルール（装飾絵文字は 7-3 に採番して衝突回避した）。fullScan に足すと既存の未追跡ルールが露出して大量 regression 化する。
2. **block-comment `*/` 事故**: JSDoc `/* */` 内に `{/* */}` や `figure-*/ogp` を書くと `*/` がコメントを閉じて SyntaxError。ヘッダー説明では `*/` を避けて言い換える（例「波括弧スラッシュ形式」「figure- 接頭辞」）。lib は `//` 行コメントなら安全。
3. **content-rules.json 二箇所**: `defaults`（重大度）と `fullScan.rules`（全量ラチェット追跡）の両方に登録。後者に入れないと死にルール。
4. **baseline 更新は同一commit**: 追加後 `npm run update-content-quality-baseline`＋`quality-snapshot` で既存違反を grandfather。ラチェットは新規のみブロック。
5. 純関数は `(lines, findings)` シグネチャで content 相対行を push（本体が offset シフト＋applyContentRules 適用）。0-1/0-2 のみ offset 除外。

**装飾絵文字(7-3)は curated denylist**: `\p{Extended_Pictographic}` は ⭕(242)★(161)↔(15) 等の過去問正誤・強調・関係記号を誤検知（418件）。💡🔑📌⚠️等の実装飾のみ列挙する。

**過去問データ表の rule 免除（overrides）**: 多列データ表（ふるい分け・圧縮試験・配合計算・JIS規格表）は箇条書き化で2次元参照性を失うため、`content-rules.json` の `overrides[category][group]` で 1-3/1-4（＋問題文が長い exam は 15-2/15-3）を `enabled:false`。civil-construction-1 textbook/secondary（2026-07-10）・concrete-chief-engineer primary（2026-07-14）が前例。keyword/guide ページの表・散文は免除せず修正する。

**KaTeX strict 警告の監査（2026-07-14 追加）**: `npm run audit-katex`（レポート）/ `audit-katex:ci`（`--strict`）。build（rehype-katex 既定 strict:'warn'）が出す警告を build と同じ remark-math パイプラインで数式ノード抽出→ファイル/行/数式/コード単位に一覧化。純ロジック=`#lib/katex-audit.mjs`（`safeFixMath`＝数式スパン内のみ全角演算子/U+2212/% 置換・`--fix-safe`）。quality-audit の CHECKS に `katex-warnings`(ci:true) 登録済み。修正規則は content-authoring.md 数式節。**罠: `preprocessMDX`(docs.ts) は `$$` ブロック（行が正確に `$$`）と単行 inline `$...$` しか保護せず、display の区切りに単独 `$`（`$$` でない）を使うと中身の `{}` をエスケープして `\text{万円}`→`\text\{万円\}` を壊し CJK が math mode に露出する。これは remark 抽出の死角なので `detectSingleDollarBlocks`（行が正確に `$` を検出）で別途ガード**。SpecSheetList の JSX prop 内 `$...$` はランタイム katex 描画で build log 非出力＝audit 対象外。

---

## 全資格 採点カバレッジ census

全 published 記事のルーブリック採点カバレッジを一望する census 基盤（2026-07-10 新設・commit 42a32723c）。5/17 GSC急落 RCA で「内部5軸ルーブリックは本文分量軸を持たず Google の index selection/demote と直交する」「採点が総監・civil-1 に偏り他資格ゼロ」が判明したのを受けて構築。真実源は [[project_gsc_pivot_2026_04]] 系でなく本文。

**使い方**: `npm run quality-census`（`.claude/scripts/build-quality-census.mjs`）→ `.claude/state/quality/census.json` を生成。`src/config/doc-meta-index.json`（published 真実源）× 全 `*quality-scores.json` を突合し、資格×group×{採点済み/未採点/不合格(weighted<2.0)/薄層} を集計。admin 品質タブ冒頭にも表示（`npm run admin` → `/api/quality-census`）。

**薄層(thin)の機械補完**: keyword/guide/textbook かつ 本文実質<3,000字（`check-guide-length` と同じ `body.replace(/\s/g,'').length` 計測=raw MDX・componentタグ込み）。ルーブリックを改変せず body_chars で demote リスクを可視化する設計。

**新 profile 追加の作法（重要）**:
- スコアは `.claude/state/quality/{profile}-scores.json` に既存2ファイル（`quality-scores.json`=cem/`civil-quality-scores.json`=civil-1）と同型で置く: `{version, categories:["<category>"], scored_at, pages:{<bare-slug>:{slug,group,scores,weighted,weak_axes,qualitative_comment,scored_at}}}`
- **top-level `categories` 必須**（census が bare slug→full slug を解決するため。既存2ファイルは LEGACY_SOURCES にハードコード）
- pages のキーは category を除いた bare slug（例 `guide-career`、full は `pe-construction-guide-career`）

**採点の実行パターン**: quality-cycle スキルの scripts-{profile}/ を新規に作らなくても、Evaluator エージェント（guide→`guide-qa` / 過去問→`past-exam-qa` / textbook→`civil-construction-review` / keyword→`cem-qa`・いずれも全資格横断）を直接 6〜9本/エージェントで並列起動し、census 互換 JSON を返させて親が {profile}-scores.json を書けば census が拾う。**weighted はエージェントが返す値を信用せず scores から決定論的に再計算**（0軸→1.0クランプ・textbookは mobile 0.3 重み。エージェント間でクランプ運用にブレがあるため）。均質な問題文アーカイブ群（pe-construction二次84本等）は少数サンプルで採点を確認後、残りをプログラム生成しても実採点と一致した。

**現況(2026-07-10)**: 採点 **1,064/1,064（100%）**。不合格 **75→8** に消化（Phase2 完遂に近い）。civil-1 secondary 8本は (A)規格表 override 免除（`content-rules.json` overrides.civil-construction-1.secondary で 1-3/1-4 無効化・真実源 exam-content-policy.md）＋検証済みURLパレット参考資料＋ArticleImage 121枚移行＋OCR修復＋**表2.11列崩壊の算術照合是正**で全合格。死リンク実測: sekokan-net.jp=NXDOMAIN→ejcm.or.jp、jiban.co.jp=web到達不能（パレットは in-repo 実績でも rot する＝**追加前に curl 実測必須**）。**最終残8=全て要外部照合/authoring**: civil-1 h27-a/h28-a（港則法・**spawnedセッション削除済＝宙に浮き・要再手配**）・r06-b/r07-b（マーク矛盾精査）・civil-2 r06-kouki（正答矛盾）・総監h28-30-secondary（解答方向性authoring）。処理は3系統: (A)構造規約ギャップ=ExamPoint/RelatedKeywords 一括付与でpe-first-stage 21・concrete 8・civil-2 4 を機械合格化 (B)**ルーブリック不適合はユーザー決定「正しいEvaluatorで再採点」で解消**=pillar/keyword/data/模範論文ハブ 9本を cem-qa・civil-construction-review で再採点し正当合格（である調ハブは linking/reference 軸が適合・内容mangling不要）(C)真の内容バグは source照合/authoring 要でLLM推測厳禁。

**再採点の重要教訓**: census weighted は各 `*-scores.json` の**保存 weighted 値をそのまま読む**（build-quality-census.mjs L110・軸名不問）。だから「正しい Evaluator を当てて axes 差し替え→weighted 再計算→保存」で misfit を解消できる。**ただし過去問扱いの解説ページ（civil-1 secondary 7本）は再採点しても不合格＝reference=0+4列超表+生img の真の多軸ギャップ**（misfit と誤分類していた）。**Phase3 の宿題=census を group→Evaluator の自動ルーティングに拡張**（今回は手動で当てた）。残15=civil-1 primary 4(h27-a/h28-a spawned・r06-b/r07-b マーク精査)+civil-1 secondary 7(多軸rewrite)+civil-2 r06-kouki(正答矛盾)+総監 h28-30-secondary(実際に薄い・authoring要)。分類詳細=`docs/todo/backlog.md`。総監keyword662は再採点しない。RCA真実源 `docs/reference/gsc-management.md`。[[feedback_content_structure]] と整合。

---

## untrack 後は on-disk 件数検査がローカルだけ緑

`git rm --cached` は**追跡だけ外し、ワークツリーの実体は残す**。そのため
「ディレクトリを readdir して件数を数える」検査は、untrack 後もローカルでは
元の件数を返し続け、CI（＝追跡下のファイルしか無い）だけが落ちる。
ローカルで何度 `npm test` を回しても再現しない。

2026-08-21 に実際に起きた（DN-0111 Phase 2、note カバー SVG 827 件）:

| | content/note |
|---|---|
| 手元の実ファイル | 4,722 |
| 追跡下（CI が見る） | 3,710 |
| assert | `> 4000` |

`tests/repository-paths.test.mjs` の「content の各チャネルに実体がある」が
`inventory()`（on-disk）で数えていたのが原因。追跡下（`git ls-files`）で
数えるよう変更して解消。TZ・locale・PATH を CI 相当にしても再現しないので、
**環境差を疑う前に「追跡下と手元で件数が違わないか」を先に見る**。

同種の罠を持つのは on-disk を数える全ての検査。DN-0111 Phase 4 の退避
（note -827 -586 / sns -1,997 / textbook -868）でまた表面化する。
**下限を割ったら、数字を下げる前に減った分が
`.claude/state/assets/manifest.json` に sha256 付きで載っていることを確かめる。**
確かめずに下限だけ下げると、その検査は事故を通す飾りになる。

**別型（2026-08-30 に踏んだ）: 実体があると台帳参照の経路が実行されない。**
R2 退避したアセットの被覆検査は「ローカル実体 **または** 退避台帳」で判定する。
このとき台帳の引き方を間違えても（`entries[path]` を `assets[path]` と誤る等）、
手元には実体があるので常に前者で緑になり、**台帳側の分岐を一度も実行しないまま通る**。
実体を持たない CI のクリーンチェックアウトで初めて全件赤になった（章 OGP 344 件）。

対策は 2 つ。**台帳の形状は自前で JSON を読まず `loadManifest()` を使う**（真実源を 1 つにする）。
そして**検査の出力に「台帳に載っている件数」を必ず出す**——実体で緑になっている裏で
参照が死んでいても、この数字が 0 なら気づける。検証は「実体を退避した状態を再現して
台帳経由で通ること」まで確かめる。ローカルで緑になった理由が CI と同じとは限らない。

関連: [[project_asset_audience_routing]] / [[reference_quality_audit_system]] / [[project_standards_chapters]]

---

## URL 移行で置き去りになる旧URL参照3種

2026-08-30 の IA 移行（`/docs/` `/category/` → `/exam/` 等）で、**旧 URL を叩き続ける参照が
3 箇所に残った**。旧 URL は `_redirects` の転送元として 301 を返すだけで実体が無いため、
「200 を期待する検査」は必ず落ちる。**サイトは正常なのに検査だけが恒久的に赤くなる。**

| 置き去りになった場所 | 症状 | 気づいた経緯 |
|---|---|---|
| `e2e/fixtures.ts` 等 | dev で必ず 404。smoke/navigation が長期間ずっと赤 | 2026-08-30 |
| `.github/workflows/uptime-ping.yml` | 「SSR 壊れ / body 空」を毎回誤報し Issue #477 へ追記し続けた | 2026-08-31 |
| `config/psi-urls.txt` | 22 URL 中 **20 が転送元**。field(CrUX) が構造的に 0 のまま | 2026-08-31 |

**なぜ放置されるか**: 赤が常態化すると誰も見なくなる。とくに uptime は
「本物の障害を捕まえる」のが仕事なので、オオカミ少年になった時点で**役目が空席**になる
（CLAUDE.md §9「赤いのに誰も見ていない検査は、無いのと同じ」）。

**PSI 特有の罠**: Lighthouse は 301 を追うので **lab 値は普通に出る**。だが
**CrUX(field) は要求した URL をキーに持つ**ので転送元には最初から存在しない。
`psi-config.json` は `primary_source: field` ＋ `min_field_coverage` ゲートなので、
転送元を測り続ける限り field は 0 で固定＝「実害なし」でも「判定材料なし」でもない赤になる。
**lab が出ているから計測できている、と読まない。**

**機械ゲート**: `npm run check-e2e-targets` が上記 3 種すべてを走査し、`out/` と `_redirects` に
突合して**転送元を叩いていたら redirect-source として落とす**（要 `npm run build` なので
quality:audit ではなく ci.yml / e2e.yml の build 後）。3 箇所とも故障注入で file:line を
名指しすることを確認済み。新しい置き場が増えたら `URL_LIST_FILES` に足す。

**未解決**: PSI の field 0 件は 2026-08-18 から始まっており、URL 移行（08-30）より 12 日早い。
上の修正は「移行以降 field が構造的に戻り得なかった」問題を潰しただけで、
**08-18 の断絶の原因は別**（psi-config.json は CrUX 側の供給停止と記録）。混同しない。

関連: [[project_standards_chapters]] / [[feedback_metrics_cicd_supplied]] / [[measurement-incidents]]
