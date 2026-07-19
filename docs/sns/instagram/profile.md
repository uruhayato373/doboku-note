---
title: Instagram プロフィール文案
purpose: Instagram アカウント (`@dobokunotecom`) のプロフィール欄に貼り付ける本文の SSoT。ハンドル等の機械可読 SSOT は `.claude/config/ig-account.json`
characterLimit: 150
lastUpdated: 2026-05-26
appliesTo: Instagram のプロフィール欄（自己紹介）
personaQualifications:
  - 1級土木施工管理技士
  - 1級舗装施工管理技術者
  - コンクリート主任技士
  - コンクリート診断士
  - 技術士（建設部門）
  - 技術士（総合技術監理部門）
relatedDocs:
  - docs/sns/x/draft/033-pinned-profile/tweets.md  # X プロフィール + 固定ポスト草案
  - docs/note/プロフィール.md  # note プロフィール (140 字)
  - src/config/author.ts  # サイト側 AUTHOR SSoT
---

# Instagram プロフィール文案

Instagram アカウント `@dobokunotecom`（運用中・X と同一ハンドル）のプロフィール欄に貼り付ける本文を管理する。

> [!note]
> **ハンドルの真実源**: 実アカウントは `@dobokunotecom`。機械可読 SSOT は [`.claude/config/ig-account.json`](../../../.claude/config/ig-account.json)（スクリプト/スキルはここを読む）。本ファイルは人間向けのプロフィール文案 SoT。旧版の「`@doboku_note` 想定（未開設）」は誤りで、`verify-ig-status`/`publish-ig-bs` は `dobokunotecom` を使う。

## 仕様

| 項目 | 上限 | 備考 |
|---|---|---|
| 表示名 (Name) | 30 字 | 検索インデックス対象（最重要） |
| ユーザー名 | 30 字 | `@dobokunotecom`（X と統一済み・運用中） |
| 自己紹介 (Bio) | **150 字** | X (160) より 10 字きつい |
| リンク欄 | 1 個（複数化は Linktree または自前 `/links`） | doboku-note.com/links を採用 |

## チャネル役割（戦略 v6）

- IG = **SEO・カタログ動線**（→サイト→note）
- ストック教材として「保存して試験前日に見返す」が独占ジョブ
- bio は「保存」「見返す」のキーワードを優先（IG ユーザー動機との一致）

詳細: `docs/project/03_SNS/01_SNS集客戦略.md` v6 §2

---

## 推奨セットアップ

### 表示名（30 字以内）

```
doboku-note｜技術士総監・1級土木 対策
```

文字数: 21 字。検索で「技術士」「総監」「1級土木」が拾える。

### ユーザー名

```
@dobokunotecom
```

X と同一ハンドルで統一済み（運用中アカウント）。機械可読 SSOT は `.claude/config/ig-account.json`。

### リンク欄

```
https://doboku-note.com/links
```

自前リンクハブ（2026-05-26 リリース）。doboku-note ドメインパワー集約・GA4 完全分析。詳細: `docs/reference/links-hub.md`。

---

## Bio 採用版（107 字・2026-07-20〜 R8的中実績入り）

```
保存して試験前に見返す｜技術士総監・1級土木の図解カルーセル
発注者視点で「ここだけで合格」を支援
元・地方自治体土木職（発注者）退職、6資格保有
R8総監の記述テーマは6/1公開教材で事前収録
詳細はリンクから↓
```

**構成**:
1. キャッチコピー（保存価値 + 提供物）
2. 提供価値（差別化）
3. 経歴 + 資格数（信頼根拠）
4. 的中実績（帰属は6/1公開教材＝設問(3)バンク。「予想問題集が的中」とは書かない＝虚偽帰属禁止）
5. リンク誘導

### 旧採用版（案A・138 字・資格列挙型・〜2026-07-19）

```
保存して試験前に見返す｜技術士総監・1級土木の図解カルーセル
発注者視点で「ここだけで合格」を支援
元・地方自治体土木職（発注者）退職、6資格保有
（技術士〔建設・総監〕／1級土木／1級舗装／コンクリート主任技士・診断士）
詳細はリンクから↓
```

---

## 予備版

### 案B（note 誘導強化・140 字）

```
技術士総監・1級土木の試験対策ハブ
元・地方自治体土木職（発注者）退職、6資格保有
保存して試験前日に見返す図解カルーセル＋短尺解説を投稿
無料note『白書R7完全対応集』34,000字 公開中
詳細→ doboku-note.com
```

無料 M2 を bio で明示したい時期（試験 W-7 〜 W-3）の選択肢。

### 案C（シンプル・キャッチー・110 字）

```
技術士総監・1級土木の試験対策｜発注者視点
元・地方自治体土木職（発注者）退職、6資格保有
保存版の図解カルーセル＋短尺解説を投稿
過去問・キーワード・模範論文はリンクから↓
```

文字数の余裕を取りたい・bio に絵文字を後付け追加する余地を残したい時の選択肢。

---

## ストーリーズハイライト構成（推奨）

bio 直下に固定表示できる丸アイコン。プロフィール訪問者の目的別ナビとして機能。
最大 5 個までフィード可視（それ以上は横スクロール）。1 ハイライトあたり最大 100 ストーリー収納可能。

### 推奨 5 ハイライト構成（v2 / 2026-05-27 更新）

**詳細スペック（Story 単位のコピー + 視覚仕様）は [stories/highlights/script-v1.md](./stories/highlights/script-v1.md) を参照**。

| 順 | Highlights | brand-color | 主CTA先 | 素材ソース |
|---|---|---|---|---|
| ① | **1級土木** | warmRed (#D9533F) | `/docs/keyword-2026` ほか | civil-construction-1 配下のガイドページ |
| ② | **技術士総監** | default blue (#1858B5) | `/docs/whitepaper-study-map` | `{exam}/exam-packs/` カルーセル + 5管理コンテンツ |
| ③ | **note 無料** | teal (#0F766E) | M2 完全無料記事 | `note.com/dobokunote/n/n60efbccd728b` |
| ④ | **note 有料** | violet (#4338CA) | `/links`（5マガジン分岐） | `src/lib/note-magazines.ts` の cover |
| ⑤ | **YouTube** | ink-strong (#14191F) | YouTube チャンネル（**URL 未登録のため保留**） | チャンネル開設後 |

> [!warning]
> ⑤ YouTube は `src/config/author.ts` に `youtubeUrl` が未登録のため**チャンネル開設まで保留**。それまでは ①〜④ の 4 枠運用とする。

### v1（旧 plan・参考保管）

戦略 v6 初期の構成（2026-05-26）は「① はじめに / ② 総監過去問 / ③ 5管理早見表 / ④ note 商品 / ⑤ 試験まで」だったが、bio + サイトの自己紹介経路が `/about` `/links` で確保できているため「はじめに」を独立枠から外し、5 チャネル動線（1級土木・総監・note 無料・note 有料・YouTube）優先に再編。「試験まで」カウントダウンは試験 30 日前〜の期間限定で⑤YouTube枠を一時差替える運用に変更。

### 運用フロー

```
1. カルーセル（フィード）投稿
       ↓
2. 同じ素材を `--size reels` で 1080×1920 再生成
       ↓
3. IG アプリで「ストーリーに投稿」
       ↓
4. 24h 以内に「ハイライトに追加」
       ↓
5. プロフィール上部に永続表示
```

### カルーセルからのストーリー転載

過去問パック（シリーズ B）は 2 系統の素材で運用する：

```bash
# 1. 各パックの「厳選 4 枚」を抽出（reels から cover/Q1/A1/cta をコピー）
node .claude/scripts/instagram/build-stories.mjs --pack r07-pack-01
# → cem/exam-packs/r07/pack-01/stories/img/{01-cover, 02-problem, 03-answer, 04-cta}.png

# 2. 年度入口の「目次カルーセル cover 1 枚」
# 既に {exam}/exam-packs/<year>/_summary/reels/img/00-cover.png として整備済み
```

**パターン A**（年度入口）: 年度ごとに目次 cover 1 枚をストーリー投稿 → リンクスタンプで目次カルーセル投稿へ → 9 パックから選ぶ 3 階層誘導。  
**パターン B**（個別パック宣伝）: パックごとに 4 枚連投 → リンクスタンプで該当カルーセル投稿へ。試験直前の高頻度配信期はこちら。

両者を組み合わせてハイライト ② に追加。詳細: `docs/reference/ig-carousel-skill.md` §10

### カバー画像作成

ハイライトのカバー画像は **正方形 1080×1080 推奨**（IG が円形にトリミング）。
最小 161×161 で OK。中央寄せでアイコン的に作る（テキストは大きく）。

カバー画像ソース（v2 構成）:
- ① 1級土木: warmRed bg + 「1級／土木」大文字（script-v1.md §① 参照）
- ② 技術士総監: default blue bg + 「総監」大文字
- ③ note 無料: teal bg + 「無料／note」大文字
- ④ note 有料: violet bg + 「有料／note」大文字
- ⑤ YouTube: ink-strong bg + 「▶」プレイアイコン（保留中）

### 戦略的価値

- **保存性最大化**: カルーセル「保存」 + ハイライト「ピン留め」で 2 重に資産化
- **滞在時間延長**: プロフィール訪問者がハイライトを巡る習慣で IG アルゴリズム評価向上
- **note 商品 LP 化**: ハイライト ④ が note 売上の補助 CTA に
- **指名検索強化**: 「専門アカウント」の見栄えが上がる

### 着手順序（v2）

1. **まず ④ note 有料** — 既存 magazine cover を流用、最短起動
2. **次に ③ note 無料** — リード磁石（M2）は流入起点として最重要
3. **③ 技術士総監** — 既存 5管理コンテンツ（`{exam}/exam-packs/` カルーセル）の流用が効く
4. **① 1級土木** — `keyword-2026` `guide-last-minute-2026` のスクショ流用
5. **⑤ YouTube** — チャンネル開設後に保留解除（`src/config/author.ts` に `youtubeUrl` 追加が前提）

詳細な各 Story のコピー・レイアウト・Link Sticker URL は [stories/highlights/script-v1.md](./stories/highlights/script-v1.md)。

---

## 運用メモ

- 採用版を変更した場合、X 版 (`docs/sns/x/draft/033-pinned-profile/tweets.md`) と note 版 (`docs/note/プロフィール.md`) の経歴・資格表記の整合を確認する
- 「合格者」と「合格済み」の表記方針はメモリ `project_operator_pe_comprehensive_pass.md` 準拠。年度はぼかす
- IG bio リンクは 1 個のみ。複数 URL を貼りたい場合は `/links` のセクション構成を更新する（Linktree への切替は基本不要）
- IG はハッシュタグを bio に入れず、投稿側で 20-25 個運用（戦略 v5 §IG セクション）
- 採用版の文字数: 138 字（150 字制限内に 12 字の余裕。絵文字を 1-2 個追加する場合は別途文字数チェック必要）

## 文字数チェックコマンド（参考）

```bash
node -e "const bio = require('fs').readFileSync('docs/sns/instagram/profile.md','utf8').match(/```\n保存して.*?\n```/s)[0]; console.log('chars:', [...bio.replace(/```\n|\n```/g,'')].length, '/ 150');"
```
