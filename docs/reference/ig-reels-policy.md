# Instagram Reels 品質ポリシー

技術士・総合技術監理および 1 級土木施工管理技士の **Instagram Reels**（`reels/script.json` + `reels/caption.txt` + `reels/video.mp4`）を、agent が 1 パックずつ執筆・採点するための品質基準。`ig-reels-writer`（Generator）と `ig-reels-qa`（Evaluator）の両方がこの文書を真実源とする。

関連:
- SNS 戦略 v7（IG 一次・YT 派生） → [`docs/project/03_SNS/01_SNS集客戦略.md`](../project/03_SNS/01_SNS集客戦略.md)
- カルーセル側の真実源 → [`docs/reference/ig-carousel-policy.md`](./ig-carousel-policy.md)
- パック構造・ファイル配置 → [`docs/reference/ig-carousel-skill.md`](./ig-carousel-skill.md)
- Reels モード分岐の設計 → [`docs/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) の `slides.cover.swipeTextReels`

最終更新: 2026-05-28（v1: 戦略 v7 化に伴う新設）

---

## 1. script.json スキーマ

```jsonc
{
  "packId": "r03-pack-01",
  "totalDurationSec": 105,           // 必須・90-110 秒
  "slides": [
    {
      "slideIndex": 0,               // 0-based
      "type": "cover",
      "durationSec": 6,              // 必須
      "pauseSec": 0,                 // 任意・無音の追加秒
      "narration": "令和3年度の択一式過去問、第1パックです。今から4問にチャレンジしましょう。"
    },
    {
      "slideIndex": 1,
      "type": "problem",
      "qNum": 1,                     // 1-based
      "durationSec": 14,
      "pauseSec": 2,                 // problem の選択肢提示後、考える時間
      "narration": "政府や自治体の政策評価に関する次の記述のうち、最も適切なものはどれか。選択肢を読み上げます。1: …、2: …、3: …、4: …、5: …。"
    },
    {
      "slideIndex": 2,
      "type": "answer",
      "qNum": 1,
      "durationSec": 12,
      "narration": "正解は5番。回収期間法は投資回収までの期間で評価するため、回収後のキャッシュフローは考慮されません。"
    }
    // problem×3 + answer×3 + cta
  ]
}
```

### フィールド字数・秒数ルール

| フィールド | ルール | 評価軸 |
|---|---|---|
| `totalDurationSec` | 90-110 秒。pauseSec 合計も含める | 軸 1 |
| `slides[].durationSec` | cover/cta = 6-8 秒、problem = 12-16 秒、answer = 10-14 秒 | 軸 1 |
| `slides[].pauseSec` | problem の選択肢提示後に 1.5-2 秒推奨。answer/cover/cta は 0 が基本 | 軸 2 |
| `slides[].narration` | 体言止め禁止・完結文・1 文 30 字超は読点で区切る | 軸 2 |
| narration 内の選択肢列挙 | 「1: ○○、2: △△」のように **番号 + コロン + 1 文** で読み上げる | 軸 2 |

### narration の秒数見積もり

VOICEVOX の読み上げ速度を基準に **1 文字あたり 0.18-0.22 秒**で見積もる。例: 60 字 → 11-13 秒。

---

## 2. caption.txt スキーマ

```
令和3年度 択一式過去問 第1パックです 📝

経済性管理から 4 問チャレンジ！
答えは動画内で発表します。
試験前日に見返せるよう保存推奨です。

#技術士 #技術士総監 #総合技術監理 #技術士総監受験 #2026年技術士
#1級土木施工管理技士 #土木 #国家資格 #社会人勉強垢 #資格勉強
#経済性管理 #費用便益分析 #PFI #投資評価 #NPV
#技術士試験対策 #過去問演習 #資格学習 #朝活 #スキマ時間
#doboku_note #択一式 #令和3年度
```

### ハッシュタグ 3 階層 mix（20-25 件）

| 階層 | 数 | 例 | 役割 |
|---|---|---|---|
| 大（発見性） | 5-8 | `#技術士` `#国家資格` `#資格勉強` | 大規模リーチ |
| 中（関連性） | 7-10 | `#技術士総監` `#1級土木施工管理技士` `#技術士試験対策` | 関連受験者 |
| 小ニッチ（直撃） | 5-8 | `#技術士総監受験` `#2026年技術士` `#社会人勉強垢` | 直接ターゲット |

### キャプション本文ルール

- 100-200 字
- **ネタバレ禁止**: 答えの番号・解説を本文に書かない（「答えは動画内で」前提）
- 年度・パック番号・管理分野を含める
- 絵文字は 1-3 個まで（土木系の信頼感を損なわないよう抑制）
- 末尾は「フォロー推奨」相当の CTA を主にする（Reels はリーチ獲得器＝非フォロワー接触のため、保存ストックの Carousel と異なり新規フォロー誘導を優先。保存喚起は併記しても従）

---

## 3. Reels モード分岐の重要事項

### cover の swipeTextReels（v7 で追加）

`docs/design-system/instagram-carousel-tokens.json` の `slides.cover.swipeTextReels` で **「答えは動画内で発表」**（または相当文言）を定義。`quiz-slides.mjs` の `buildQuizCover` が `height >= 1920`（Reels サイズ）の場合に自動分岐する。

**禁忌**: narration や caption.txt に「スワイプで4問にチャレンジ」「スワイプで答えを見る」等のカルーセル前提 CTA を残してはいけない。Reels はスワイプではなく自動再生のため、視聴者の行動と矛盾する。

### cta の actionTitleReels（フォロー誘導分岐）

`slides.cta.actionTitleReels` / `actionSubtitleReels` / `actionIconReels`（＋）で **保存→フォロー誘導**を定義。`buildQuizCta` が `height >= 1920`（Reels サイズ）で自動分岐し、action カード（白カードの視覚アンカー）を「フォローして毎週／過去問解説が届く」に切替える。Carousel（保存ストック）は `actionTitle`「保存ボタンを押して」を維持。見出し（doboku-note で全問解説）は note 導線として両フォーマット共用（従）。

**役割の根拠**: Reels = フィード偶発接触のリーチ獲得器（KPI=リーチ）、Carousel = 保存ストック教材（KPI=保存数）。ファネルは Reels リーチ→プロフィール訪問→フォロー判断→note 教材（`docs/project/03_SNS/01_SNS集客戦略.md` L229-230, L247-250）。よって Reels の CTA はリーチ→フォロワー転換を主とする。

### YT 派生時の差替

YT Shorts 派生（`yt-shorts-create --from-reels`）では：
- 「概要欄から doboku-note へ」相当に narration の末尾を差替（IG は「プロフィール」）
- caption.txt 全体を YT 概要欄テンプレ（UTM 付き）に差替
- これらは派生スクリプトが自動処理する。**IG Reels writer は IG 用の表現で書く**

---

## 4. 5 軸ルーブリック（ig-reels-qa が採点）

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. 尺適正** | totalDurationSec / 各 durationSec の偏り | 90-110 秒範囲内・偏り無し |
| **2. 読み上げ完結性** | 体言止め禁止・句読点配置・記号棒読み無し | すべて完結文・VOICEVOX で自然読み上げ |
| **3. キャプション/タグ品質** | 字数・3 階層 mix・スパム判定回避 | 100-200 字 + 20-25 件 3 階層 mix |
| **4. 音声 ↔ 画面整合** | narration と PNG テキストが矛盾しない・カルーセル流用 CTA 無し | cover/cta/problem/answer すべて整合 |
| **5. フォロー/note 導線** | cta narration と caption の CTA 整合・フォロー誘導が主・IG 表現遵守 | 「フォロー推奨」主＋note 従・「プロフィール」等 IG ネイティブ |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **重大減点**:
  - 軸 4 で「スワイプで」等カルーセル流用 CTA → **-2 点**
  - 軸 5 で「保存ボタンを押して／試験前日に見返そう」等カルーセル流用の保存 CTA が Reels cta に主として残る（フォロー誘導が無い） → **-2 点**
  - 軸 1 で totalDurationSec > 110 秒 → **-2 点**

---

## 5. 担当境界

| 工程 | 担当 |
|---|---|
| script.json / caption.txt 執筆 | `ig-reels-writer` |
| 5 軸採点 | `ig-reels-qa` |
| Reels 用 PNG 再生成（mode 分岐込み） | `ig-post-create.mjs --size reels`（機械処理） |
| TTS + ffmpeg 連結 → video.mp4 | `ig-reel-create.mjs`（機械処理） |
| YT 派生（30-60 秒短縮） | `yt-shorts-create --from-reels` + `yt-shorts-publisher-qa` |
| slide-data.json 執筆 | `ig-carousel-writer`（共有データソース） |
| トークン JSON の修正 | design-system 担当（人手 or 別タスク） |

## 6. 1問1リール（per-problem, `--ig-mode`）2026-06-09 追加

`ig-reel-create.mjs` の**全4問フル reel（`video.mp4`、138-295秒）は IG には長すぎる**（理想 ≤90秒）。短い1問完結リールが欲しいときは YT の per-question エンジンを IG モードで流用する:

```bash
node .claude/skills/social/yt-shorts-create/scripts/per-problem-shorts.mjs \
  --ig-mode --year r07 --pack r07-pack-01 [--questions 1,2]
```

- **構成/尺**: cover → problem → answer → cta の4スライド concat、**実測 36-45 秒**。`ytMode` 流用でカルーセルチャーム（`N/10`・`PROBLEM 1/4`・スワイプCTA）を抑止＝単発リール整合。
- **素材**: 問題短ナレ `.tmp/yt-gen/narration/<key>.wav`（≈9秒）＋既存 `reels/wav`（解答/CTA）＋カバーキャッシュ `cover-<year>.wav` を流用＝**新規 TTS ゼロ**（要 ffmpeg のみ）。
- **出力**: `<pack>/reels-pp/q<N>/{video.mp4, caption.txt}` の**自己完結ディレクトリ**。caption は論点（`answer.correctText`）主役＋管理ハッシュタグ（`buildIgReelCaption`）。
- **公開**: `publish-ig-bs post <pack>/reels-pp/q<N> --reel --schedule …` を**無改修**で1本ずつ予約。JIT は `scripts/publish-reel-jit.mjs`（生成→予約→mp4削除）が1コマンド化。
- **動画は JIT・git に持たない**（2026-06-09）: reel の mp4 / img(PNG) / slide-NN.mp4 は再生成可能な派生物で **gitignore**。**SoT は slide-data.json + reels/wav** だけコミット。`video.mp4` が無いのは正常。作業ツリー約1.15GB削減・今後の肥大停止。
- **採用判断**: R7 5管理×各2問=10本を 12:30/日次で感触テスト予約済（2026-06-09）。良ければ全年度ロールアウト。

## 改訂履歴

- v1（2026-05-28）: 初版。SNS 戦略 v7 化に伴い、Reels の Generator/Evaluator 分離を正式運用化。Reels モード分岐の禁忌（カルーセル流用 CTA）を明文化。
- v2（2026-06-09）: §6「1問1リール（per-problem, `--ig-mode`）」を追加。
