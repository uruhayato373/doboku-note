# Instagram Stories 品質ポリシー

技術士・総合技術監理および 1 級土木施工管理技士の **Instagram Stories**（4 枚連投 + ハイライト集約）を、agent が 1 パックずつキュレーション・採点するための品質基準。`ig-stories-writer`（Generator）と `ig-stories-qa`（Evaluator）の両方がこの文書を真実源とする。

関連:
- SNS 戦略 v7（IG 一次・YT 派生） → [`docs/project/03_SNS/01_SNS集客戦略.md`](../../../docs/project/03_SNS/01_SNS集客戦略.md)
- パック構造・4 枚選別の機械処理 → [`.claude/knowledge/reference/ig-carousel-skill.md`](./ig-carousel-skill.md)
- Reels 側真実源 → [`.claude/knowledge/reference/ig-reels-policy.md`](./ig-reels-policy.md)
- カルーセル側真実源 → [`.claude/knowledge/reference/ig-carousel-policy.md`](./ig-carousel-policy.md)
- **figure-*.svg 静止画を Stories に直接使う場合**（Reels 派生の 02-04 枚とは別ルート） → [`.claude/knowledge/reference/sns-image-policy.md §13`](./sns-image-policy.md)（4:5 figure を 9:16 中央配置）

最終更新: 2026-05-28（v1: 戦略 v7 化に伴う新設）

---

## 1. 4 枚連投の役割（build-stories.mjs が機械選別）

| # | ファイル | reels 由来 | 役割 | 推奨ステッカー |
|---|---|---|---|---|
| 01 | `01-cover.png` | **独立生成**（`data.mode === 'stories'`）| 興味喚起・新パック告知 | （任意） |
| 02 | `02-problem.png` | `reels/img/01-problem.png` (copyFileSync) | Q1 を見せて「解いてみて」 | **投票**（1〜5） |
| 03 | `03-answer.png` | `reels/img/02-answer.png` (copyFileSync) | Q1 の解答「答え合わせ」 | **質問**（双方向） |
| 04 | `04-cta.png` | `reels/img/09-cta.png` (copyFileSync) | 「全パックはフィードへ」誘導 | **リンクスタンプ**必須 |

### cover の独立生成（v7 で確立）

01-cover.png のみ Reels からのコピーではなく `build-stories.mjs` が `renderSlide({ slide: { type: 'quiz-cover', data: { mode: 'stories', ... } } })` で独立生成する。`quiz-slides.mjs` の `buildQuizCover` が `data.mode === 'stories'` を判定して `tokens.json` の `swipeTextStories`（「まずは1問やってみる」）に分岐する。

**禁忌**: cover を Reels からのコピー（`copyFileSync(reels/img/00-cover.png, ...)`）に戻すと、Reels 用「答えは動画内で発表」または Carousel 用「スワイプで4問にチャレンジ」が Stories に流入する。これは Stories（1 問抜粋の試食）の文脈と矛盾するため、`ig-stories-qa` の軸 1 で **-2 重大減点**される。

残り 3 枚（02-problem / 03-answer / 04-cta）は Reels と完全同一なのでコピーで足りる。

---

## 2. stories/caption.txt スキーマ

各スライドに重ねる「テキストオーバーレイ」案 + ステッカー文言を 1 ファイルにまとめる（IG アプリで手動コピペ）。

```
## ① 01-cover.png
🆕 令和3年度 択一式 過去問 #1（経済性管理）
今日のテーマで挑戦してみて 👇

## ② 02-problem.png
🤔 Q1：政策評価で最も適切な記述は？
[投票ステッカー] 1 / 2 / 3 / 4 / 5

## ③ 03-answer.png
✅ 正解は 5：回収期間法の限界
[質問ステッカー]「投資評価の論点、復習しますか？」

## ④ 04-cta.png
📚 残り 3 問はフィードのカルーセル投稿で
[リンクスタンプ] doboku-note.com/docs/pe-comprehensive-management/r03
```

### ルール

- **絵文字**: 1〜3 個まで。4 個以上は軸 1（コピー力）-1
- **文言**: 各スライドの本文は **3 行以内** が目安（IG アプリのテキスト枠で読みやすい）
- **年度・管理分野・パック番号**: 必ず具体値（テンプレの「令和7年度」が残っていたら -1）

---

## 3. stories/note.md スキーマ

投稿手順書。Writer が build-stories.mjs 初版を以下の点で仕上げる：

1. **リンクスタンプ URL 確定**
   - 02-problem: 対応カルーセル投稿 URL（投稿後に追記。Writer の段階では「カルーセル投稿 URL（投稿後追記）」プレースホルダで可）
   - 04-cta: doboku-note.com の該当年度ハブページ URL（例: `https://doboku-note.com/docs/pe-comprehensive-management/r03`）

2. **ハイライト先確定**
   - ハイライト名: `R<年> 過去問`（例: 「R03 過去問」「R07 過去問」）
   - 1 ハイライトに同年度の全パックを集約

3. **推奨投稿時刻**
   - 朝 07:00 JST（通勤・始業前）または夜 21:00 JST（帰宅後）
   - 火・金が高 reach（戦略 v7 §2 Instagram）

---

## 4. 3 軸ルーブリック（ig-stories-qa が採点）

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. コピー力** | 3 秒で意味取り・絵文字抑制・具体値反映 | 全 4 枚で具体値・絵文字 1〜3 個・3 行以内 |
| **2. リンク導線整合** | 04-cta URL 実在・02-problem 手順明記・IG 表現遵守 | 「概要欄」等 YT 用語なし・URL 実在 |
| **3. ステッカー双方向性** | 02 投票・03 質問の正配置 | 投票 1 + 質問 1 が正しく配置 |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **重大減点**:
  - 軸 2 で 04-cta リンク先が 404 → **-2 点**
  - 軸 3 で 02 と 03 のステッカー誤配置（02 質問・03 投票） → **-2 点**

---

## 5. ハイライト戦略（3 系統）

ハイライトは現在 **3 系統**で運用する。それぞれ役割と着地点が異なる。

### 系統 A: 固定 6 種（戦略 v7.1 §2 のプロフィール訪問者用）

| # | 名前 | 役割 | 着地点 |
|---|---|---|---|
| 1 | まず読む | 運営者経歴・「ここでわかること」 | プロフィール / サイト |
| 2 | カルーセル目次 | 5 管理別代表 Carousel への入口 | フィード Carousel |
| 3 | Reels まとめ | 直近代表 Reels 5 本への入口 | フィード Reels |
| 4 | FAQ | 受験相談の定型回答 5 件 | プロフィール |
| 5 | お知らせ | 新記事公開・キャンペーン・受験期スポット情報 | フロー型・随時更新 |
| 6 | **教材** | note プロフィール → 無料記事 → 有料マガジン | **二段ロケット動線**（下記参照） |

新規プロフィール訪問者の **3 秒判断通過**用。Carousel 4-5 本投稿後に 1 回まとめて整備、四半期更新。

### 系統 B: 過去問試食（年度別、Stories の二次活用）

- 1 ハイライト「R<年> 過去問」に **同年度の全 9 パック × 4 枚 = 36 ストーリー**を集約（IG 上限 100）
- IG プロフィール訪問者が「タップ 1 回で R<年>全パックの試食」可能
- 試食 → フィードへの「全 10 枚」誘導 → サイトへの最終誘導
- 拡張: 全年度完成時は「年度別」+「テーマ別」（経済性管理ハイライト等）の 2 軸構成も検討

### 系統 C: 教材（v7.1 で新設、note 二段ロケット）

系統 A の 6 種目に対応する Stories シリーズ。雛形は `docs/sns/instagram/highlights/06_materials/` に。他の 5 種も `docs/sns/instagram/highlights/{01_intro, 02_carousel-index, 03_reels-roundup, 04_faq, 05_announcement}/` に整備済み（数値プレフィックスは戦略 v7.1 §2 の 1〜6 種の順序に対応）。

**6 枚構成**:

| # | 役割 | テキスト案 | リンクスタンプ |
|---|---|---|---|
| 01-cover | 興味喚起・中立フレーミング | 「合格者の本棚（note）」 | （任意） |
| 02-author | 運営者の信頼性訴求 | note プロフィール画面のスクショ + 「実際に書いている人」 | note プロフィール URL |
| 03-essay | 模範論文マガジン紹介 | M5 / M6 / M8 の表紙 3 枚並べ + 「合格後に書いた」 | note マガジン（無料記事 1 本がトップに） |
| 04-readguide | 精読ガイド紹介 | 精読ガイド 5 本（¥500×5 or ¥1,980 セット）の表紙 + 「論点 + 択一頻出 + 解説リンク」 | note マガジン（無料記事 1 本がトップに） |
| 05-sample | 無料記事誘導 | 「ここからまず読める →」+ 無料記事の冒頭スクショ | note 無料記事 URL（直接） |
| 06-cta | 着地点 | 「迷ったらまず無料記事から」+ note プロフィール URL | note プロフィール URL |

**重要原則: 二段ロケット動線**
- **直接 note 有料リンクは置かない**。最終着地点は **note 無料記事 or note プロフィール**
- note 内部リンク（無料記事 → マガジン目次 → 有料記事）で自然遷移させる
- 「note マガジン買ってください」直球フレーミングは避け、「合格者の本棚」「私が書いた教材」の中立表現
- これは戦略 v7.1 §2 で明文化（売り込み感によるフォロワー離脱を回避）

### 系統 A / B / C の使い分け

| 系統 | 整備タイミング | 更新頻度 | 着地点の主軸 |
|---|---|---|---|
| A 固定 6 種 | Phase 1 開始 2 週間後 | 四半期 | プロフィール内・フィード投稿 |
| B 過去問試食 | パック投稿のたび追加 | 随時（パック追加時） | フィード Carousel → サイト |
| C 教材 | A と同時整備 | 半年（note 商品追加時） | **note 無料記事 → 有料マガジン** |

---

## 6. 担当境界

| 工程 | 担当 |
|---|---|
| 4 枚選別・初版テンプレ生成 | `build-stories.mjs`（機械処理） |
| caption.txt / note.md 最終キュレーション | `ig-stories-writer` |
| 3 軸採点 | `ig-stories-qa` |
| IG アプリでの実投稿（テキスト・ステッカー・リンク手動） | 人手 |

## 改訂履歴

- **v2（2026-05-28）**: §5 ハイライト戦略を 2 系統 → **3 系統**に拡張。系統 C「教材」（note 二段ロケット動線）を新設、6 枚構成テンプレを明文化。系統 A の固定 5 種 → 6 種化（戦略 v7.1 と同期）。系統 B 過去問試食はそのまま維持
- v1（2026-05-28）: 初版。SNS 戦略 v7 化に伴い、Stories の Generator/Evaluator 分離を正式運用化。
