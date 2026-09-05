# Instagram Reels 品質ポリシー

技術士・総合技術監理および 1 級土木施工管理技士の **Instagram Reels**（`reels/script.json` + `reels/caption.txt` + `reels/video.mp4`）を、agent が 1 パックずつ執筆・採点するための品質基準。`ig-reels-writer`（Generator）と `ig-reels-qa`（Evaluator）の両方がこの文書を真実源とする。

関連:
- SNS 戦略 v7（IG 一次・YT 派生） → [`docs/marketing/01_SNS集客戦略.md`](../../../docs/marketing/01_SNS集客戦略.md)
- カルーセル側の真実源 → [`.claude/knowledge/reference/ig-carousel-policy.md`](./ig-carousel-policy.md)
- パック構造・ファイル配置 → [`.claude/knowledge/reference/ig-carousel-skill.md`](./ig-carousel-skill.md)
- Reels モード分岐の設計 → [`.claude/knowledge/design-system/instagram-carousel-tokens.json`](../design-system/instagram-carousel-tokens.json) の `slides.cover.swipeTextReels`
- **figure-*.svg 静止画を Reels に流用する場合**（過去問パック動画とは別ルート） → [`.claude/knowledge/reference/sns-image-policy.md §13`](./sns-image-policy.md)（4:5 figure を 9:16 中央配置）
- **figure カルーセルパックを「ナレーション付き解説リール」動画化する場合** → `node scripts/figure-reel-create.mjs --pack <topic>`（carousel/img の 4:5 PNG を 9:16 白パディング＋`reels/script.txt`を VOICEVOX TTS＋ffmpeg 合成）。**ただし「カルーセル貼り＋読み上げ」は discovery リールとしては薄く、§7（角度駆動リール）方針で量産停止**＝同テーマの重複回避はリール側を角度駆動に振る。本ルートは限定利用（2026-06-24 新設・2026-06-26 §7 で量産停止）。
- **6 切り口の角度でフックを立てる discovery リールを作る場合**（推奨・新方針） → 本ドキュメント §7（`ig-reels-writer` を `mode:"angle"` で流用・記事資産起点）。

最終更新: 2026-06-26（v3: §7 角度駆動リールを追加）

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

`.claude/knowledge/design-system/instagram-carousel-tokens.json` の `slides.cover.swipeTextReels` で **「答えは動画内で発表」**（または相当文言）を定義。`quiz-slides.mjs` の `buildQuizCover` が `height >= 1920`（Reels サイズ）の場合に自動分岐する。

**禁忌**: narration や caption.txt に「スワイプで4問にチャレンジ」「スワイプで答えを見る」等のカルーセル前提 CTA を残してはいけない。Reels はスワイプではなく自動再生のため、視聴者の行動と矛盾する。

### cta の actionTitleReels（フォロー誘導分岐）

`slides.cta.actionTitleReels` / `actionSubtitleReels` / `actionIconReels`（＋）で **保存→フォロー誘導**を定義。`buildQuizCta` が `height >= 1920`（Reels サイズ）で自動分岐し、action カード（白カードの視覚アンカー）を「フォローして毎週／過去問解説が届く」に切替える。Carousel（保存ストック）は `actionTitle`「保存ボタンを押して」を維持。見出し（doboku-note で全問解説）は note 導線として両フォーマット共用（従）。

**役割の根拠**: Reels = フィード偶発接触のリーチ獲得器（KPI=リーチ）、Carousel = 保存ストック教材（KPI=保存数）。ファネルは Reels リーチ→プロフィール訪問→フォロー判断→note 教材（`docs/marketing/01_SNS集客戦略.md` L229-230, L247-250）。よって Reels の CTA はリーチ→フォロワー転換を主とする。

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
- **出力**: `<pack>/reels-pp/q<N>/{video.mp4, caption.txt, cover.png}` の**自己完結ディレクトリ**。caption は論点（`answer.correctText`）主役＋管理ハッシュタグ（`buildIgReelCaption`）。`cover.png` は論点カバー（先頭スライド）＝サムネ用で、`publish-ig-bs` が編集ステップで明示アップロードする（Meta 自動抽出任せにしない）。
- **公開**: `publish-ig-bs post <pack>/reels-pp/q<N> --reel --schedule …` で1本ずつ予約（編集ステップで `cover.png` をサムネ設定）。JIT は `scripts/publish-reel-jit.mjs`（生成→予約→mp4/cover削除）が1コマンド化。
- **動画・音声は JIT・git に持たない**（2026-06-09 動画 / 2026-06-18 wav も）: reel の mp4 / img(PNG) / slide-NN.mp4 / **wav** は再生成可能な派生物で **gitignore**。**コミットするのは slide-data.json + reels/script.txt + caption.txt**。wav は script.txt から VOICEVOX で再生成可、かつ `npm run drive-vault-sync -- --group sns-archived-media --commit` で Google Drive vault へ退避（真実源 [sns-archive-policy.md](sns-archive-policy.md)）。`video.mp4`・`wav` が手元に無いのは正常（JIT/流用時は R2 取得 or 再生成）。
- **採用判断**: R7 5管理×各2問=10本を 12:30/日次で感触テスト予約済（2026-06-09）。良ければ全年度ロールアウト。

## 7. 角度駆動リール（discovery・記事資産起点）2026-06-26 追加

§1-§6 の**過去問クイズリール**（知識チェック型・MOFU 現受験生向け）とは別タイプの、**6 切り口の編集角度でフックを立てる discovery リール**。カルーセル（保存カタログ・現状維持）と**同テーマでも役割が重ならない**ように、リール側を角度駆動に振る方針（2026-06-26 決定）。真実源の角度定義は [content-angle-policy.md](./content-angle-policy.md)。

### なぜ別タイプか（重複回避の核心）

カルーセル＝保存ストック（`counter`/`howto`/数字図解）、**リール＝フックで足を止めさせる発見装置**。同じテーマでも**角度を変えれば消費モードも届く相手も別**になる＝重複しない。クイズリールが「現受験生1層」にしか届かないのを補い、TOFU・公務員層を取りに行く。

### 担当（分業＝新エージェントを作らない）

**`ig-reels-writer`（Generator・`angle` 対応済み）＋ `ig-reels-qa`（Evaluator）をそのまま使う**。角度やフォーマットでエージェントを増やさない（content-angle-policy 冒頭の原則）。角度は `angle` パラメータ、本タイプは `mode: "angle"` で分岐する。

### リールに向く角度（4つに絞る）

| `angle` | リール適性 | 備考 |
|---|---|---|
| **`experience`（体験）** | ◎ **主柱** | 元発注者＝唯一無二・コモディティ化不可。`experience` リールを中心ピラーに |
| **`conclusion`（結論）** | ◎ | 言い切り＝最強の冒頭フック |
| **`counter`（反論）** | ○ | 通説否定＝足が止まる（保存版はカルーセルと併存可） |
| **`number`（数字）** | ○ | パンチのある一撃。出典必須 |
| `howto` / `reason` | ✕（カルーセル/YTへ） | 手順・展開は尺/枚数が要る＝保存系 |

### フォーマット（クイズリールと違う点）

- **尺 15-30 秒・1論点（1 角度）**。`totalDurationSec` 90-110 は適用しない。**実尺は narration 長で決まる**ので narration を絞る目安: hook ≤5秒（≈25字）・point ≤14秒（≈70字）・cta ≤5秒（≈25字）＝合計 ≤30秒。VOICEVOX 速度（既定 speaker 1）で 1 文字 ≈ 0.2 秒が目安。長いと §4 軸1 で減点。
- **冒頭 2 秒＝フック**（問い・断言）。タイトルスライドにしない。フック＝その角度そのもの。
- **source は「角度が立った手作りの記事資産」**（note 記事・公務員クラスター 8 本・トレードオフ等）。**カルーセルのスライド流用・自動要約は禁止**（薄くなる既出の教訓 §1 / content-angle-policy §1）。`figure-reel-create.mjs`（カルーセル貼り＋読み上げ）は本タイプでは使わない。
  **「お悩み相談回答」型（`counter` 角度・2026-08-28 正式化）**は記事 frontmatter の `faqs`（Q&A形式で既に全記事に存在）を source にできる——質問＝よくある誤解、回答＝反論の骨子として流用でき、新たな一次情報の取材は不要。新規モード・レンダラは追加しない（既存 `mode: "angle"` の `counter` 角度で表現）。
- **CTA は IG ネイティブ**（保存・フォロー）。「スワイプ」禁忌は §3 と共通。
- **リンク機構（重要）**: リール／フィードのキャプションは**クリック不可**（押せるリンクは Stories のリンクスタンプと bio リンクのみ）。よって**リールから note/サイトへ直接送客はできない**。動線は必ず **リール → プロフィール → bio リンク（`/links` ハブ・[links-hub.md](./links-hub.md)）→ note/サイト**。CTA は「プロフィールのリンクから」とし、**キャプションに URL を貼って「ここから」と書かない**（押せない）。リールは直接コンバージョンでなく**リーチ＆フォロー獲得が主**なので、**主 CTA は「フォロー」**（フォロー→bio リンクで後追いコンバージョン）。送客先の出し分け（experience/conclusion→note、howto/reason→サイト）は **bio の `/links` 側で分岐**する。

### script.json（mode: "angle"）

格納先は `content/sns/instagram/cem/angle-reels/<packId>/reels/script.json`（caption.txt も同階層）。**SoT は script.json + caption.txt のみ**、PNG/wav/video/cover は JIT・gitignore。

各スライドは **画面表示用フィールドと `narration`（読み上げ）を分ける**＝narration 全文はスライドに載せない（punch だけ表示）。type 別フィールド（すべて任意・`narration` のみ必須）:
- **hook**: `chip`（上部チップ）/ `lead`（白の前振り）/ `punch`（アクセント＋下線の決め句）/ `sub`（灰の緊張サブ）/ `anchor`（巨大な薄い1字＝視線誘導, 例 `?`）
- **point**: `label`（小見出し, 例「答え」）/ `big`（アクセントの reveal 語, 例「安全管理」）/ `onScreen`（本文・濃色）
- **cta**: `onScreen`（行・URL は書かない）＋ フォローボタン自動。`\n` で改行。
- **共通（任意）**: `character`（ブランドマスコット合成）= slug 文字列 `"pointing"` か `{ "pose":"explaining", "side":"left"|"right", "scale":0.42 }`。下隅にフェードイン＋せり上がりで登場。slug は [`.claude/config/character-poses.json`](../../config/character-poses.json)（真実源 [character-asset-policy.md](character-asset-policy.md)）。テキスト密度の高い point は片側・控えめ scale、hook はキネティック干渉を避け原則なし。

```jsonc
{
  "packId": "<topic>-<angle>",          // 例: civil-servant-blindspots-experience
  "mode": "angle",
  "angle": "experience",                 // experience / conclusion / counter / number
  "totalDurationSec": 23,                // 15-30（尺は実際はナレ長で決まる・目安）
  "source": "content/note/技術士総監/…/article.md#section",  // 角度が立った起点資産（必須・要手作り）
  "slides": [
    { "type": "hook",  "chip": "体験談｜発注者", "lead": "発注者の私が\n総監択一で", "punch": "一番落とした\n分野は？", "sub": "…たぶん、あなたの予想と違います", "anchor": "?",
      "narration": "発注者だった私が、総監の択一で一番落とした分野。たぶん、あなたの予想とは違います。" },
    { "type": "point", "label": "答え", "big": "安全管理", "onScreen": "「現場の安全は施工者の仕事」\nその発注者感覚が、罠になる",
      "narration": "答えは、安全管理。…（1 論点だけ展開・断片まで）" },
    { "type": "cta",   "onScreen": "盲点はあと2つ\nプロフィールのリンクから\nフォローで毎週",
      "narration": "続きはプロフィールから。フォローで毎週届きます。" }
  ]
}
```

> **ストーリー設計**: hook で**問いを立てて answer を見せない**（tease）→ point で `big` に reveal → cta でフォロー。フックの型は角度で替える（experience＝当事者告白・conclusion＝言い切り・counter＝通説否定・number＝数字）。

### レンダラ（角度リール専用・新設）

`node scripts/angle-reel-create.mjs --pack cem/angle-reels/<packId> [--speaker N] [--png-only]` が、本 script.json から **hook/point/cta の縦型スライドを自前 SVG→PNG で描画**（ブランド色・NotoSansJP）し、VOICEVOX TTS ＋ ffmpeg で 9:16 短尺リールに合成する。`--png-only` は VOICEVOX 不要のビジュアル確認用。**カルーセル貼りの `figure-reel-create` とは別物**（あちらは §7 非推奨）。投稿は `publish-ig-bs post <pack> --reel`（`cover.png`＝hook をサムネ設定）。

- **モーション**: 各スライドに**緩いズーム（偶奇でイン/アウト交互）＋冒頭フェードイン**を付与して合成（静止スライドショーに見せず Reels アルゴリズムの動画判定に効かせる）。写真/汎用ストックは使わない（ブランドはクリーンな text-on-color・調達摩擦/可読性の問題。リッチ化が要れば AI 背景アートを文字なし＋スクリムで選択的に・課金要確認）。
- **キネティック・フック**: hook に `lead` と `punch` が揃うとき、**lead 先行→ punch/anchor が reveal 時刻（ナレの約42%・最大2.2秒）に α フェードイン**する段階表示を自動適用（base/punch を別レイヤーで描画し overlay）。カバーは punch まで入った完成フック。
- **声（speaker）**: 優先順 `--speaker` > script.json の `speaker` > 既定 **13（青山龍星・成熟男性）**。一人称の体験談には男性声が合う。VOICEVOX エンジンは `~/voicevox_engine_dl/macos-arm64/run`（Docker/アプリ無し環境のローカル起動）。
- **VOICEVOX 未起動なら `--png-only`** でビジュアルだけ先に確認できる。
- **キャラ合成（doboku-note 先生）**: スライドに `character: "<pose>"` を指定するとブランドマスコットを重ねられる（登場演出）。pose は [`.claude/config/character-poses.json`](../../config/character-poses.json) の slug、beat（hook/point/cta）に合うものを選ぶ。素材・追加手順・不変条件は [character-asset-policy.md](character-asset-policy.md)。声は同キャラの speaker 13 で統一。

### 採点（ig-reels-qa・本タイプの軸読み替え）

§4 の 5 軸を本タイプ向けに読み替える（合否＝平均 4.0 以上かつ全軸 3 以上は共通）:

| 軸 | angle リールでの観点 |
|---|---|
| 1. 尺適正 | **15-30 秒**・hook 2-3 秒・1 論点に収束（>35 秒は -2） |
| 2. 読み上げ完結性 | 既存どおり（体言止め禁止・自然読み上げ） |
| 3. キャプション/タグ | 既存どおり（3 階層 mix） |
| 4. 音声↔画面整合＋**角度純度** | フックが冒頭・**1 投稿 1 角度**（混在は減点）・カルーセル流用 CTA 無し |
| 5. 導線＋**Red Line** | **主 CTA＝フォロー**・送客は「プロフィールのリンクから」（bio `/links` 経由）。**キャプションにクリック不可リンクを貼る／「ここから」と URL を載せる＝-2**（リールのキャプションは押せない）。加えて **`experience`＝断片まで（受験記フル放出 -2）／`number`＝出典必須・捏造厳禁／送客の出し分けは bio 側**（howto/reason→サイト・experience/conclusion→note）。content-angle-policy §5 準拠 |

### 進め方

1. **`experience` 角度 × 公務員クラスター記事**から試作 1 本で型を確立。
2. リーチ/保存/フォロー転換を既存カルーセルと比較してから角度を広げる。クイズリール（§1-6）は当面継続、薄い `figure-reel-create` 量産は停止。

## 改訂履歴

- v1（2026-05-28）: 初版。SNS 戦略 v7 化に伴い、Reels の Generator/Evaluator 分離を正式運用化。Reels モード分岐の禁忌（カルーセル流用 CTA）を明文化。
- v2（2026-06-09）: §6「1問1リール（per-problem, `--ig-mode`）」を追加。
- v3（2026-06-26）: §7「角度駆動リール（discovery・記事資産起点）」を追加。カルーセル＝保存／リール＝角度フックの役割分担を明文化。新エージェントは作らず `ig-reels-writer`/`ig-reels-qa` を `mode:"angle"` で流用（分業原則＝媒体×機能）。`figure-reel-create` の薄い量産は停止方針。
