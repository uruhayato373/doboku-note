---
title: スキル ガバナンス記録
---

# スキル ガバナンス記録

`.claude/skills/` の設計変更・退役ログ・カテゴリ変更履歴の唯一の真実源。

**スキルの一覧・用途・トリガー** は `docs/reference/skills-guide.md` を参照。
**スキル設計原則・作成手順** は `docs/reference/skills-design-guide.md` を参照。

---

## カテゴリ構造（Phase D 完了時）

```
.claude/skills/
├── authoring/       # 8 — 記事を作る
├── conversion/      # 3 — 外部形式から MDX への変換
├── quality/         # 12 — MDX・note 公開前品質検査
├── management/      # 11 — 計画・分析・戦略
├── dev/             # 11 — 開発・CI/CD
├── analytics/       # 2 — サイト分析
├── social/          # 6 — SNS 投稿
└── ui/              # 1 — UI/UX デザイン
```

合計 **54 スキル**（Phase 2 待機を除く）。

---

## 複数資格対応のテンプレート駆動化

**核心原則**: 新試験追加時はスキル本体を変更せず、`templates/{exam-id}.md` を追加するのみ。

| テンプレート管理ディレクトリ | 用途 | 対応試験 |
|---|---|---|
| `authoring/templates/exam-guide/` | 試験ガイド生成 | civil-construction-1 / pe |
| `conversion/pdf-to-mdx/templates/` | PDF→MDX 試験別ルール | general / cem / civil-construction-1 |
| `conversion/exam-questions-import/templates/` | 過去問取込 | civil-primary / civil-secondary / pe-primary |
| `quality/quality-cycle/templates/` | 品質サイクル プロファイル | cem / civil-textbook |

新試験追加時の手順:
1. 該当テンプレートディレクトリに `{new-exam}.md` を新規作成
2. スキル側は変更なし
3. 動作確認 → PR

---

## 退役記録

削除したスキルのログ。代替コマンドがある場合は明記。

| 退役日 | スキル | カテゴリ | 代替 |
|---|---|---|---|
| 2026-04-15 | `/pe-exam-guide` | content | `/exam-guide --exam pe` |
| 2026-04-23 | `/allow-tool` | dev | ユーザー直接指示 |
| 2026-04-23 | `/reset-git-history` | dev | ランブック移譲 |
| 2026-04-23 | `/find-x-accounts` | marketing | Playwright MCP 直接指示 |
| 2026-04-23 | `/related-articles` | ui | `docs/ui/related-articles.md` に移動 |
| 2026-04-23 | `/seo-audit` | analytics | `/check-mdx --rules seo` + `/fetch-gsc-data` 連携 |
| 2026-04-23 | `/add-exam-answers` | content | `/exam-questions-import --mode add-answers` |
| 2026-04-23 | `/fix-design-manual-figures` | content | `/improve-article` に吸収 |
| 2026-04-23 | `/note-desumasu` | content | `/social-post note desumasu {path}` |
| 2026-04-23 | `/x-post` | marketing | `/social-post x {question\|keyword} ...` |
| 2026-04-23 | `/note-post` | marketing | `/social-post note {analysis\|guide\|keywords} ...` |
| 2026-04-23 | `/aidesigner-frontend`（トップレベル孤立） | — | ui/ に移動（Phase A） |
| 2026-04-24 | `/check-mdx`（旧 content 配下） | content | `/check-mdx --rules syntax`（Phase B で quality/ へ） |
| 2026-04-24 | `/check-frontmatter` | content | `/check-mdx --rules frontmatter` |
| 2026-04-24 | `/check-links` | content | `/check-mdx --rules links` |
| 2026-04-24 | `/audit-staging` | content | `/check-mdx --rules staging` |
| 2026-04-24 | `/audit-exam-explanations` | content | `/check-mdx --rules explanations` |
| 2026-04-24 | `/audit-svg` | content | `/check-mdx --rules svg` |
| 2026-04-24 | `/check-related-keyword-inline` | content | `/check-mdx --rules related-keyword` |
| 2026-04-24 | `/check-legal-citations` | content | `/check-mdx --rules legal-citations` |
| 2026-04-24 | `/pdf-to-mdx`（旧 content 配下） | content | `/pdf-to-mdx --exam general`（Phase C で conversion/ へ） |
| 2026-04-24 | `/cem-pdf-to-mdx` | content | `/pdf-to-mdx --exam cem` |
| 2026-04-24 | `/civil-construction-1-pdf-to-mdx` | content | `/pdf-to-mdx --exam civil-construction-1` |
| 2026-04-24 | `/clean-pdf-artifacts` | content | `/pdf-to-mdx` Step 6 自動実行 |
| 2026-04-24 | `/exam-questions-import`（旧 content 配下） | content | `/exam-questions-import --exam civil-primary --year <year>` |
| 2026-04-24 | `/exam-questions-2-import` | content | `/exam-questions-import --exam civil-secondary --year <year>` |
| 2026-04-24 | `/qa-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/verify-pdf-mdx` | content | `/improve-article <path> --mode verify` |
| 2026-04-24 | `/ogp-create`（旧 content 配下） | — | `/ogp-create`（Phase C で conversion/ へ移動） |
| 2026-04-24 | `/civil-textbook-cycle` | content | `/quality-cycle --profile civil-textbook`（Phase D で統合） |
| 2026-04-24 | `/quality-cycle`（旧 content 配下） | content | `/quality-cycle --profile cem`（Phase D で quality/ へ） |
| 2026-05-09 | `sns/publish-x`（caption-file 形式） | sns（廃止） | `social/publish-x`（tweets.md 形式の現行版） |
| 2026-05-15 | `/exam-keyword-cycle` | quality | `/quality-cycle --mode auto-loop`（過去問起点 → キーワード起点に方針転換、サイクルを一本化） |

### エージェント退役

| 退役日 | エージェント | 代替 |
|---|---|---|
| 2026-04-23 | `aidesigner-frontend` | 直接 Claude 指示 or AIDesigner MCP 直接 |
| 2026-04-23 | `ui-visual-qa` | `/design-review --visual`（スキル層に統合） |
| 2026-04-23 | `cem-advisor` | Generator は `keyword-rewriter`、Evaluator は `cem-qa` |

### スキルバージョン更新履歴

| 更新日 | スキル | バージョン | 変更概要 |
|---|---|---|---|
| 2026-05-20 | `pe-essay-draft` | v1.1 → v1.2 | 設問制約リスト作成ステップ新設・施策数厳守・5管理正式名と禁止語・施策間トレードオフ多様性・年度固有数値生成を必須ルール化（20本評価結果から5つの欠陥を修正） |
| 2026-05-20 | `pe-essay-review` | v1.1 → v1.2 | 横断チェック観点（数値一致・フレーム語句・施策構造）を追記 |
| 2026-05-20 | `pe-essay-draft` | v1.2 → v1.3 | 必須ルール「設問3はペルソナ一貫性の例外＝国家スケール」を追加（R07 模範論文の設問3が業界内に閉じていた欠陥を修正）。設問制約リストにスコープ／視点要件の抽出を追加 |
| 2026-05-20 | `pe-essay-review` | v1.2 → v1.3 | 視点1「視点の広さ」を「設問3 が事業・組織・業界の枠を超え国家スケールか」を含む形に再定義（同欠陥の見逃しを修正）。設問チェックリストにスコープ要件を追加 |
| 2026-05-20 | `pe-essay-draft` | v1.3 → v1.4 | 必須ルール「文体は である調 で統一する」を追加（設問3 revise 時に ですます調 が混入し設問1・2 と割れた欠陥を修正） |
| 2026-05-20 | `pe-essay-draft` | v1.4 → v1.5 | 「トレードオフと解決フレームの整理」節をテンプレートから削除（設問本文と重複する再掲節のため） |
| 2026-05-21 | `pe-essay-review` | v1.3 → v1.4 | 評価対象に note マガジン論文（`docs/note/magazines/`）を追加。Phase 1 ターゲット解決を サイト模範論文 slug / note マガジンパス の2系統に拡張 |
| 2026-05-21 | `note-prepublish-review` | （バグ修正） | 図版存在チェックの正規表現を `../img/`（マガジン共用図）対応に拡張。従来 `./img/` のみで マガジン論文の共用図を素通りしていた問題を修正 |
| 2026-05-21 | `note-prepublish-review` | （判定緩和） | blockquote を BLOCK 対象から WARN へ緩和。note.com は `>` を引用ブロックとして正しく描画するため、マガジン論文（pe-essay-draft テンプレ由来で `>` を使用）を誤 BLOCK していた |
| 2026-05-21 | `note-prepublish-review` | （機能追加） | マガジン模範論文 専用 inline チェック section 7 を追加（試験問題セクション存在・トレードオフ再掲節の不在・設問別解答字数・答案本文の散文化・図版なし）。新スクリプト `note-essay-charcount.mjs` を Phase 1 で実行。散文化チェックは管理分野ラベル等の既知アンチパターンを positive 検出（SWOT・工程表・TF メンバーの箇条書きは誤検知しない） |
| 2026-05-21 | `pe-essay-review` | v1.4 → v1.5 | 解答字数の充足率評価を追加（健全帯 85〜105%・過少も過多も欠陥として扱う）。Phase 1 で `note-essay-charcount.mjs` を実行、設問チェックリスト・視点3・出力フォーマットに反映 |
| 2026-05-21 | `pe-essay-draft` | v1.5 → v1.6 | 設問3 国家施策ガードレール（v1.3）の例示が少子高齢化テーマに偏り、CN（R06）で業界・流域に閉じた施策が生成された欠陥を修正。設問3 国家施策例を**テーマ別**（CN／少子高齢化）に再構成し「複数省庁にまたがる国家政策として説明できるか」を判定基準として明示 |
| 2026-05-22 | 共有スクリプト `note-essay-charcount.mjs` | （大幅拡張） | 答案用紙の枚数上限を年度別に試験問題から自動抽出し、設問別＋組合せ（施策／方法）別に OK/WARN/NG を判定する形へ拡張。`### 設問` H3 構造（R8予想問題集）に対応、組合せ検出を見出し型／散文型／序数型×施策／方法に拡張、字数を原稿用紙マス数推定（全角1・半角2字で1マス）へ変更、exit code 追加。検証で R8予想問題集6本は全件適合、既存模範論文マガジン（M5-M8）は枚数超過の疑い多数を surface（要・別途精査）。当初 `verify-essay-length` 新規スキルとして着手したが既存スクリプトとの重複を検出し統合（新規スキルは破棄） |
| 2026-05-22 | `note-prepublish-review` | （記述更新） | `note-essay-charcount.mjs` 拡張に追従。section 7c の解答字数判定の説明を「制限文言の突合」から「script が年度別上限を自動抽出し OK/WARN/NG 判定・NG は失格相当・過少は85%未満で WARN」へ更新 |
| 2026-05-22 | `pe-essay-review` | v1.5 → v1.6 | `note-essay-charcount.mjs` 拡張に追従。解答字数の記述を script の判定結果（NG=上限超過=失格相当）利用へ、字数基準を markdown 込みプロキシ値から原稿用紙マス数推定へ更新 |
| 2026-05-21 | `note-prepublish-review` | （機能追加） | マガジン専用チェックに section 7f を追加。設問(3) が「事業や組織の枠を超えた国としての施策」を問う年度で、各施策がペルソナ業界・所管インフラに閉じていないかの目視確認を喚起（grep で設問文言を検出して WARN 出力） |
| 2026-05-21 | `pe-essay-draft` | v1.6 → v1.7 | 環境調査ペルソナ（`environment-survey`）を廃止。属性キー表を 4 種 → 3 種に変更し、使用例を river-consultant に差し替え |
| 2026-05-21 | `pe-essay-cycle` | （属性整理） | 環境調査ペルソナ廃止に伴い、受験者属性を 4 種 → 3 種（general-contractor / river-consultant / road-municipality）に変更 |
| 2026-05-21 | `pe-note-plan` | （属性整理） | 環境調査ペルソナ廃止に伴い、属性 × 年度マトリクスを 4 属性 → 3 属性に変更 |
| 2026-05-21 | `lint-mdx-mobile.mjs` | （配列整理） | 環境調査ペルソナ廃止に伴い、`R8_SPOKE_ALLOWED_PERSONAS` から `'環境調査'` を除去（4 固定ペルソナ + 業界外救済 → 3 固定ペルソナ + 業界外救済） |
| 2026-05-27 | `ig-carousel-restyle` | v1.0（新規） | AIDesigner 新意匠の tokens.json 真実源化に伴い新設。`docs/design-system/instagram-carousel-tokens.json` 更新後に `_exam-packs/**` の PNG を一括再生成するラッパー。引数 `--pack`/`--year`/`--all`。内部で `scripts/bulk-generate-exam-packs.mjs` を呼ぶ |
| 2026-05-27 | `quiz-slides.mjs` | （全面書き換え） | AIDesigner プロト準拠の新意匠に書き換え。5管理別カラーテーマ（MGMT_THEME 5 セット）を廃止し、単一 brand + semantic（green 正答 / coral 誤答 / navy CTA）に統一。フォントを NotoSansJP-Bold/Inter-Bold → Manrope（latin）+ NotoSansJP（jp）に変更。tokens.json から値を import |
| 2026-05-27 | `ig-post-create` / `slide-render.mjs` | （フォント拡張） | `@fontsource/manrope` + `@fontsource/noto-sans-jp` を npm 導入し、Satori `fonts` 配列に Manrope 500/700/800 + NotoSansJP 500/700/800/900 を追加（既存 Inter 700 / Noto Sans JP 700 は互換維持） |
| 2026-05-27 | `ig-carousel-qa` | v2.0（軸追加） | テキスト 5 軸に加え、過去問パック専用「デザイン統一性」第 6 軸を追加。PNG を Read tool で読み tokens.json と照合する |
| 2026-05-27 | `ig-carousel-writer` | （ガード追加） | slide-data.json に色・フォント・余白を書かないルールを明記。5管理別配色は廃止済みで識別は cover-title テキストで行う旨を追記 |
| 2026-05-27 | `quiz-slides.mjs` | （4 段階圧縮モード） | normal/dense/compact/ultra の 4 段階を総文字数で自動判定。`MGMT_THEME` 完全廃止 + reelsWrapper（1920 中央寄せ）追加 + buildTable / buildLists 汎用ビルダー追加 |
| 2026-05-27 | `slide-data.json` スキーマ | （拡張） | problem に `lists`/`table` フィールド、answer に `optionExplanations[5]`/`pointText` 必須化。`explanationLines` 廃止 |
| 2026-05-27 | `ig-reel-create` | v1.0（新規） | カルーセル PNG ベースの Reels 動画生成スキル。`--exam <pack-id>` で 1080×1920 PNG → VOICEVOX TTS → ffmpeg 連結 → mp4。旧 YT Shorts (142 dir / 37 mp4) を全削除して新設 |
| 2026-05-27 | `lint-exam-pack-structure.mjs` | v1.0（新規） | 構造違反検出 lint。E1 (列挙散文化) / E2 (markdown 表残骸) / W1 (プレースホルダ残存)。bulk-generate-exam-packs.mjs に pre-check として統合 |
| 2026-05-27 | `generate-caption.cjs` | （拡張） | `--format carousel\|reels` オプション追加。caption.txt を `<pack>/carousel/caption.txt` と `<pack>/reels/caption.txt` の 2 ファイルに分離。Reels 用は正答ネタバレなし + エンゲージメント CTA |
| 2026-05-27 | デザイントークン | （多数調整） | qText 700→600 / cover 補助拡大 (tag 32, page 28, meta 38) / brandUrl 28 / cover-swipe chip 化 / cta-action 拡大 (title 32, subtitle 26, icon 72 brand 塗) / CTA 文言「全章→全問」「All章→5管理 SCOPE」/ cover-tag「総監択一クイズ→総監過去問」/ Q ロゴ right -20→40 / 装飾円を pageBadge/brand バッジ化 |
| 2026-05-27 | cover-title 統一 | （仕様確定） | cover-title を「令和X年度 ／ 択一式 過去問 #N」固定文言に統一。`titleLine1` / `titleLine2Template` をトークン化し、パック横断で管理混在問題が表面化しない構造に変更（pack-05 が「経済性管理」ラベルだが社会環境問題を含む問題を契機に確定） |
| 2026-05-27 | `ig-reel-create` | v1.1 | `--script-only` モード追加。VOICEVOX/ffmpeg 環境が未準備でも `reels/script.txt` の TTS 台本のみを先行生成可能に。Cover 台本テンプレを「令和X年度の択一式過去問、N番です。スワイプして4問にチャレンジしましょう。」に統一 |
| 2026-05-27 | `build-stories.mjs` | v1.0（新規） | `.claude/scripts/instagram/build-stories.mjs` 新設。`reels/img/` から 4 枚（00-cover / 02-problem / 03-answer / 09-cta）を `stories/img/` にコピー + `stories/caption.txt` + `stories/note.md`（投稿手順）を生成。42 パック × 4 枚 = 168 PNG 整備 |
| 2026-05-27 | summary 系スライド | v1.0（新規） | 年度目次カルーセル（`_summary/`）新設。`buildSummaryCover` / `buildSummaryPackList` / `buildSummaryCta` 3 ビルダー追加、`slide-render.mjs` の dispatcher と `ig-post-create.mjs` の `SLIDE_TYPE_MAP` に `summary-*` 系を追加。1 ストーリー → 目次カルーセル → 個別パックの 3 階層誘導を実現 |
| 2026-05-27 | `generate-caption.cjs` | （文言確定） | カルーセル先頭行を「【令和X年度 択一式 過去問】R0X 過去問 #N」に固定。caption と cover-title を完全同期 |
| 2026-05-28 | `yt-shorts-create` | v1.0 → v2.0（破壊的変更） | **戦略 v7 化に伴い `--slug` モード（MDX 直結）廃止 → `--from-reels <pack-id>` 一本化**。IG Reels パックの `slide-{00,01,02,09}.mp4` を ffmpeg concat で 30-60 秒に派生。`buildMeta` を別途 `buildMetaFromReels` に分岐し、UTM を `utm_source=youtube&utm_campaign=exam-pack-<pack-id>` に。`--slug` 呼出時は deprecation エラーで exit 1。MVP では字幕焼き込み未対応（Phase D2 で対応予定）。SKILL.md 全面書き換え |
| 2026-05-28 | `quiz-slides.mjs` | （Reels モード分岐追加） | `buildQuizCover` で `height >= 1920` を判定し `SLIDES.cover.swipeTextReels`（"答えは動画内で発表"）に分岐。tokens.json に `swipeTextReels` フィールド追加。「スワイプで4問にチャレンジ」がカルーセル流用バグで Reels に残っていた問題を構造的に解消 |
| 2026-05-28 | `quiz-slides.mjs` + `build-stories.mjs` | （Stories モード分岐追加） | Stories cover の独立生成を導入。`build-stories.mjs` が Reels の 00-cover.png をコピーするのを止め、`renderSlide({ slide: { type: 'quiz-cover', data: { mode: 'stories', ... } } })` で独立生成。`buildQuizCover` は `data.mode === 'stories'` を最優先判定し `SLIDES.cover.swipeTextStories`（"まずは1問やってみる"）に分岐。Reels と同サイズ（1080×1920）のため height では区別不可、mode 明示が必要。tokens.json に `swipeTextStories` フィールド追加。再発防止: 3 フォーマット同時再生成ルールを ig-carousel-restyle スキルに明記 |
| 2026-05-28 | `ig-carousel-restyle` | v1.0 → v2.0（3 フォーマット対応） | tokens.json / quiz-slides.mjs 変更後の再生成範囲を Carousel 単独から **Carousel + Reels + Stories の 3 フォーマット必須**に変更。手順 §3 で 3 ステップ連続実行（Carousel → Reels → Stories の順、Stories は Reels に依存）を明文化。1 フォーマットだけ再生成して他に古い PNG が残るインシデント（v7 Phase B で Stories cover が古いまま残った）の再発防止 |

### カテゴリ変更履歴

| カテゴリ | 変更 | 日付 |
|---|---|---|
| `marketing` | 廃止 → `social/` に統合 | 2026-04-23（Phase A） |
| `quality` | 新設 | 2026-04-24（Phase B） |
| `conversion` | 新設 | 2026-04-24（Phase C） |
| `authoring` | 新設 | 2026-04-24（Phase D） |
| `content` | 廃止（解体） | 2026-04-24（Phase D） |
