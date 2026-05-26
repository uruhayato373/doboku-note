---
title: R8予想問題集マガジン launch ＋ noteフォロワー獲得施策 着手
date: 2026-05-25
status: handoff
---

# R8予想問題集マガジン launch ＋ noteフォロワー獲得施策 着手

## このハンドオフの目的

2026-05-25 のセッションで、R8 予想問題集マガジン（M3）の公開準備〜公開実施、各記事の品質改善、note フォロワー獲得施策の基盤整備までを 46 commits で完了。本ファイルは、6/1 以降の販売戦略実行と、別セッション・将来セッションへの引き継ぎを目的とする。

## このセッションの主な成果

### 1. R8 予想問題集マガジン 関連 全 8 件 公開（2026-05-25）

| # | 記事 | 種別 | URL |
|---|---|---|---|
| 1 | マガジン全体 | 有料 ¥2,480 | `https://note.com/dobokunote/m/m6854c7437d4d` |
| 2 | R8予想問題（リード） | 無料 | `https://note.com/dobokunote/n/n8e92e4673a99` |
| 3 | AI 社会 | 有料 ¥500 | `nb4e6f088f0e8` |
| 4 | 気候変動適応 | 有料 ¥500 | `n05314b15b375` |
| 5 | 経済安全保障 | 有料 ¥500 | `n0c52cfabab78` |
| 6 | 災害復旧 | 有料 ¥500 | `nf12d75c3e606` |
| 7 | 資源循環 | 有料 ¥500 | `n5116639ee21f` |
| 8 | 老朽化インフラ | 有料 ¥500 | `naace4eeaa230` |

### 2. 品質改善（全 7 マガジン記事＋リード記事）

- **本番再現可能な字数**：各施策 600 字以内厳守（R7 A案も超過していたが、それを基準にせず厳守）
- **散文化**：箇条書きから R7 同様の流れる散文段落へ
- **全分野横断視点**：建設業界に閉じない国家施策レベル（医療・行政・教育・金融・インフラ等）
- **設問(3) の一般技術者レベル**：EU AI Act・SBOM などの専門用語を撤去
- **note 表示崩れ対応**：マークダウン表を箇条書きへ、3 ペルソナ別アレンジ早見表を削除
- **段落分割**：80〜200 字単位でスマホ視認性向上

### 3. SVG 図版品質修正

- `scripts/render-figure-r8-forecast.mjs` を修正
- figure-01：3 テーマレイアウト → 6 テーマ縦長表へ再設計
- figure-02：左アクセント帯ラベル見切れ修正（accentW 200→280）、矢印マーカーを右向き三角形定義に修正（メモリ `feedback_svg_arrow_marker.md` に基づく）
- 全 figure：末尾余白 80px 確保（policy §6 準拠）

### 4. ドキュメント整備（永続化）

- **`docs/reference/content-principles.md`**：「note 模範論文の品質原則」セクション（5 原則＋公開前チェックリスト）追加
- **`docs/reference/note-essay-review-checklist.md`**：9 ステップ実施手順書を新規作成
- **メモリ 6 件**：feedback_essay_char_limit / q2_prose / q3_general_level / persona_label / whitepaper_source_check / project_r8_essay_magazine

### 5. note フォロワー獲得施策の基盤整備

- 全 7 記事末尾に「📅 noteのフォローで更新情報をお届け」セクション追加
- 固定記事用ナビゲーション記事「【はじめての方へ】技術士総監・R08 合格のための note ロードマップ」を新規作成（`docs/note/総監R08合格ロードマップ/article.md`、旧名「総監対策ハブ案内」から 2026-05-26 リネーム）
- プロフィール文案を提示済（300 字、コピペ可）

### 6. 販売戦略タイムライン（2026-05-25 策定）

`docs/note/noteコンテンツ計画.md` の「販売戦略タイムライン（2026-05-25 策定）」セクションに記載。

## 6/1 以降の TODO（時系列）

### 5/26〜31（試験 6 週前）：基盤整備

- [ ] **note プロフィール編集**（ユーザー作業）：自己紹介文案をコピペ反映（30 分）
- [ ] **固定記事公開**（ユーザー作業）：`docs/note/総監R08合格ロードマップ/article.md` を note にコピペ→無料公開→固定記事設定（30 分）
- [ ] **固定記事 URL を私に共有**：frontmatter に `noteUrl/noteId/notePublishedAt` 反映で 1 commit
- [ ] **既存 7 記事の note 側更新**（ユーザー作業）：markdown は更新済みだが note 上は未反映。優先度①リード記事 ②出題予想スコア上位 3 本（AI社会/資源循環/経済安全保障）③残り 3 本

### 6/1（試験 5 週前）：セットマガジン公開

- [ ] **セットマガジン作成**（ユーザー作業）：note で新マガジン「総監記述式 過去問+R8予想 完全パック」を作成
- [ ] **記事登録**（ユーザー作業）：自治体道路担当版 R03-R07 = 5 本 + R8予想 = 6 本 = **計 11 本**を登録
- [ ] **価格設定**（ユーザー作業）：¥3,480 で公開（単品合計 ¥4,960 → 30%OFF）
- [ ] **URL を私に共有**：`note-magazines.ts` に新エントリ `essay-road-municipality-full-pack`（仮称）追加で 1 commit
- [ ] **カウントダウン投稿シリーズ開始**：週 3 本ペース、note 検索流入＋フォロー獲得

### 6/15（試験 3 週前）：R8予想単品 値下げ第 1 段

- [ ] **note 価格変更**（ユーザー作業）：M3 マガジン ¥2,480 → ¥1,980
- [ ] **`note-magazines.ts` 価格同期**（私の対応）：1 commit
- [ ] **SNS 告知**（X/IG/YouTube）：「試験まで 3 週間 R8予想集が ¥1,980 へ」

### 7/1（試験 1 週前）：R8予想単品 値下げ第 2 段

- [ ] **note 価格変更**（ユーザー作業）：M3 マガジン ¥1,980 → ¥1,480
- [ ] **`note-magazines.ts` 価格同期**（私の対応）：1 commit
- [ ] **試験直前駆け込み投稿**：「持ち物」「直前チェックリスト」「メンタル」など

### 7/13 試験当日

- [ ] **「お疲れ様でした」短文記事**（無料）

### 7/14 以降：試験後 アーカイブ販売

- [ ] **R8予想単品アーカイブ価格**：¥1,480 → ¥980
- [ ] **解答速報・解説記事**（無料、フォロワー獲得最大期）
- [ ] **再現答案分析マガジン**（既存計画 R-1 の E-01 / E-02）公開準備

## 注意事項・引き継ぎ

### 並行セッションとの分業（必須確認）

このセッション中、別セッションが並行作業しており、以下のファイルが staged 状態で残っていることがあった：
- `docs/sns/x/draft/` 配下の SNS draft（一部削除作業中）
- `docs/note/解答テンプレ3D/article.md`
- `docs/design-system/README.md`
- `src/config/*.json`
- `.local/r2/posts/civil-construction-1/primary-r07-a/b/article.mdx`
- `src/lib/note-magazines.ts`（一部別作業）

**git commit 前に必ず `git diff --cached --name-only` で staged 一覧を確認**し、別セッションの作業を巻き込まないこと（メモリ `feedback_git_add_verify_staged.md` 遵守）。

老朽化インフラ commit（`327203d8b`）に SNS draft 削除 463 件を巻き込んだケースあり。amend で訂正済みだが、history は線形に残存。

### スキル定義の最重要修正（2026-05-25 反映済み）

- **note 模範論文の字数制約は「600 字以内厳守」**（R7 A案も超過していたが、それを許容範囲としない）
- `content-principles.md` 0.字数制約、`note-essay-review-checklist.md` Step 2、メモリ `feedback_essay_char_limit.md` をすべて修正済み

### note フォロワー獲得の効果測定

- 開始時：フォロワー 25 名、月販 6 件
- 6/13 試験前目標：フォロワー 100、月販 30
- 7/14 試験後目標：フォロワー 200、月販 15

## 関連ファイル

- 計画：`docs/note/noteコンテンツ計画.md`（販売戦略タイムラインセクション）
- レビュー手順：`docs/reference/note-essay-review-checklist.md`
- 品質原則：`docs/reference/content-principles.md` § note 模範論文の品質原則
- 固定記事ドラフト：`docs/note/総監R08合格ロードマップ/article.md`
- メモリ：`feedback_essay_char_limit.md` / `feedback_essay_q2_prose.md` / `feedback_essay_q3_general_level.md` / `feedback_essay_persona_label.md` / `feedback_whitepaper_source_check.md` / `project_r8_essay_magazine.md`

## このセッションの commit 数

合計 46 commits（5/25 セッション内）。
