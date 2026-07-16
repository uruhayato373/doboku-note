# キャラクター素材ポリシー（doboku-note 先生）

ブランドマスコット **「doboku-note 先生」** の素材ライブラリ運用 SSOT。アイデンティティ（人格・外見・ブランド）の真実源は [CHARACTER-SPEC.md](../sns/_assets/character/CHARACTER-SPEC.md)、ポーズ素材の機械可読な真実源は [`.claude/config/character-poses.json`](../../.claude/config/character-poses.json)。本ドキュメントは「どこに・どう保存し・どう生成/抽出し・どのチャネルでどう使うか」を集約する。

- **アイデンティティ（不変条件）の SoT** → `docs/sns/_assets/character/CHARACTER-SPEC.md`（設定書）
- **ポーズ素材の機械可読 SoT** → `.claude/config/character-poses.json`（manifest）
- **素材の実体** → `docs/sns/_assets/character/*.png`（透過個別）＋ `_source/`（生成元グリッド）
- **抽出ツール** → `scripts/character-extract.mjs`（`npm run character-extract`）

## 1. アイデンティティ（崩してはいけない不変条件）

設定書の要点。生成・採用時に必ず満たす（詳細は CHARACTER-SPEC.md）。

- 40代男性・土木技術者・先生役。知的で信頼感、厳しすぎず親しみやすい。低い男性ボイス（VOICEVOX speaker 13＝青山龍星）に合う大人っぽい顔。
- 白い安全ヘルメット正面に **`doboku-note`**（濃い青文字）。`どぼくらぼ` 等の誤字・読めない文字は **不採用**（設定書 §11）。
- 濃紺の作業服＋白シャツ＋ネイビーのネクタイ＋**黄色/ゴールドの反射ベスト**。色味は青系で統一。
- メガネ・短髪・軽いひげ。セミリアル寄りアニメ調。**かわいすぎ・若すぎ（20代）・写真風リアル・威圧感は NG**（§11）。
- ブランドカラー: main `#0F2742 / #16314f / #1858B5`、sub `#FFFFFF / #7FA3C7 / #FFC53D`（リールレンダラと共通）。

## 2. 素材ライブラリ（保存場所と命名）

```
docs/sns/_assets/character/
  CHARACTER-SPEC.md      # アイデンティティ設定書（SoT）
  README.md              # 素材dir 直下の案内
  <pose>.png             # 透過個別ポーズ（全身・正面・背景透過・トリム済み）
  _source/grid-*.png     # 生成元グリッド（参照マスター・抽出元）
```

- 命名は **ポーズ内容の kebab-case**（`pointing` / `whiteboard` / `congrats` 等）。一覧と分類は manifest が SoT。
- manifest の `verified:false` は **AI生成からの自動推定名**で、実物との一致が未確認のもの。本人確認後に `true` へ。
- 現状: 個別 14 ポーズ（初版 2026-06-26）＋ 生成元グリッド 3 枚。

## 3. 生成 → 抽出ワークフロー（ポーズを足すとき）

AIは「透過」「同一人物9体」を守れないため、**1ポーズ=1画像・無地背景で生成 → ツールで透過**が基本（グリッド一括生成は品質劣化で非推奨）。

1. **生成（ChatGPT 等）**: CHARACTER-SPEC.md §10 のプロンプトを土台に、毎回キャラ参照画像を添付し「完全に同一人物」を明示。1ポーズ=1画像・全身正面・**無地背景（白〜淡色）・文字/影演出なし**で出力。
2. **抽出（透過）**: 生成画像を 1 ディレクトリに集め、
   ```bash
   npm run character-extract -- --in ~/Downloads/poses --montage          # まず透過＆確認モンタージュ
   npm run character-extract -- --in ~/Downloads/poses --names "a,b,c"     # 確認後にポーズ名で本保存
   ```
   白背景を flood-fill で抜き＋トリムして `docs/sns/_assets/character/<name>.png` を生成。淡色背景や影が残る場合は `aidesigner remove_image_background`（Pro 無料枠）で AI 切り抜きに切替。
3. **登録**: `.claude/config/character-poses.json` の `poses[]` に追記（slug / file / label / category / beats）。本人確認したものは `verified:true`。
4. **コミット**: 並行セッション保護のため develop は別 worktree で。`git add` は対象 path のみ明示。

## 4. チャネル別の使い方（設定書 §7 準拠）

| チャネル | 使い所 | 備考 |
|---|---|---|
| サイト | プロフィール画像・記事内吹き出し・アイキャッチ・FAQ | 吹き出しは表情系（smile/thinking/surprised）＋ gesture の explaining |
| **サイト note CTA** | ヒーロー CTA バナー（`MagazineHeroCta`）の円形アバター | `npm run character-avatars` で `public/images/character/avatar-{pose}.webp` を派生。pose は商品ごとに `note-magazines.ts` の `ctaPose` で指定（pointing=論点提示／good-sign=完成・合格訴求／smile=伴走・入門） |
| YouTube | チャンネルアイコン・サムネ・解説ナビ・Shorts 立ち絵・冒頭/締め | サムネは指差し系＋文字スペース確保 |
| Instagram | カルーセル・まとめ・過去問解説・暗記ポイント | カルーセルは管理別色テーマと併用 |
| **IG/YT リール** | 角度駆動リールにキャラを合成（登場演出） | beat（hook/point/cta）に応じ pose を選ぶ。詳細 → [ig-reels-policy.md](ig-reels-policy.md) §7 |
| 音声/VOICEVOX | 先生・講師役のナレーション立ち絵 | speaker 13（低め男性）で統一 |

リール合成では manifest の `beats` を目安に pose を選ぶ（hook=つかみ／point=解説／cta=締め）。pose 選択は manifest 引きの**決定的処理**で足りるため専用エージェントは設けない。

## 5. 管理（SSOT とツールの役割分担）

| 対象 | 真実源 / ツール |
|---|---|
| 人格・外見・ブランド・避けたい表現・ロードマップ | `CHARACTER-SPEC.md`（設定書） |
| ポーズ一覧・分類・beat・file 配線（機械可読） | `.claude/config/character-poses.json` |
| **サイト CTA で使うポーズの選定** | 同 manifest の **`siteCta: true`**（ここが唯一の真実源。スクリプトも型もこれに従う） |
| 保存場所・命名・生成/抽出手順・チャネル運用 | 本ドキュメント |
| 透過抽出（追加ポーズ） | `scripts/character-extract.mjs`（`npm run character-extract`） |
| 円形アイコン（紺グラデ背景・SNS プロフィール用マスター） | `scripts/generate-character-icons.mjs`（`npm run character-icons`）→ `icons/{pose}-{800,400,180}.png` |
| サイト CTA 配信アバター（上記アイコンの派生） | `scripts/build-character-avatars.mjs`（`npm run character-avatars`）→ `public/images/character/avatar-{pose}.webp` |
| 上記 3 者の整合ゲート | `scripts/check-character-avatars.mjs`（`npm run check-character-avatars`・`quality:audit` の ci ゲート） |

- 円の意匠（トリミング・紺グラデ）の真実源は `generate-character-icons.mjs` に一本化し、`build-character-avatars.mjs` は**サイズ/形式を落とす派生層**に徹する（意匠の二重管理を避ける）。

### サイト CTA にポーズを追加する手順

`siteCta` を真実源にし、列挙を複製しない。**manifest → 画像 → 型**の順で進める（逆順にすると本番でアバターが 404 になる）。

1. `.claude/config/character-poses.json` の該当 pose に `"siteCta": true` を追記（未登録のポーズなら先に生成→`npm run character-extract`→登録）
2. `npm run character-icons {pose}` → `npm run character-avatars`（生成対象は manifest から自動導出。列挙を書き足す必要はない）
3. `src/lib/note-magazines.ts` の `ctaPose` union に `| '{pose}'` を追加（型に literal が要るためここだけ手書き。他所に列挙を増やさない）
4. `npm run check-character-avatars` で manifest ⇔ webp ⇔ union の三者整合を確認 → 生成物と併せて commit

このゲートは `og:image` の 404 を防ぐ `check-ogp-coverage` と同クラスの予防。`type-check` は manifest と実ファイルを見られないため独立ゲートにしている。

- **エージェントは作らない**: pose 選択・抽出はいずれも決定的処理（manifest 引き＋スクリプト）。[[mechanical-task-direct]] に従い、判断不要の処理をエージェントに委ねない。生成（ChatGPT）と切り抜き（magick/aidesigner）が成果物を作り、本 SSOT が配線する。
- 採用品質の主観評価が要るとき（新ポーズが設定書 §11 の NG に触れないか等）のみ、人手 or 既存の画像系 Evaluator を都度使う。

## 6. ロードマップ（設定書 §12）

- 第1段階: プロフィール画像（サイト/YT/IG）・記事内吹き出し用表情素材。
- 第2段階: YT サムネ/IG カルーセルテンプレ・Shorts 立ち絵・**VOICEVOX ナレーション動画素材（角度リール合成）**。
- 第3段階: 資格別衣装差分・スタンプ風素材・教材表紙/案内役。

---

関連: [CHARACTER-SPEC.md](../sns/_assets/character/CHARACTER-SPEC.md)（設定書）／[ig-reels-policy.md](ig-reels-policy.md)（リール合成）／[sns-image-policy.md](sns-image-policy.md)（SNS 画像）
