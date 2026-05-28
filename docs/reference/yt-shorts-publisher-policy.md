# YouTube Shorts Publisher 品質ポリシー（v7）

戦略 v7（Instagram 一次・YouTube 二次展開）における **YouTube Shorts 派生 mp4 + meta.json の品質基準**。`yt-shorts-publisher-qa` Evaluator がこの文書を真実源とする。

関連:
- SNS 戦略 v7 → [`docs/project/03_SNS/01_SNS集客戦略.md`](../project/03_SNS/01_SNS集客戦略.md)
- 派生スキル → [`.claude/skills/social/yt-shorts-create/SKILL.md`](../../.claude/skills/social/yt-shorts-create/SKILL.md)
- IG Reels 側真実源 → [`docs/reference/ig-reels-policy.md`](./ig-reels-policy.md)

最終更新: 2026-05-28（v1: 戦略 v7 化に伴う新設）

---

## 1. 入力前提

`yt-shorts-create --from-reels <pack-id>` が出力した `docs/sns/youtube/<date>-<pack-id>/` 配下：

| ファイル | 役割 |
|---|---|
| `shorts.mp4` | 30-60 秒の縦動画（IG Reels の slide-00/01/02/09 を concat） |
| `thumbnail.png` | 1080×1920 サムネ（IG Reels の cover を流用） |
| `meta.json` | YT Data API 投稿用メタ（タイトル・概要欄・タグ・privacyStatus・UTM 付き URL） |

字幕焼き込みは v7 MVP では未対応（Phase D2 で対応予定）。

---

## 2. meta.json スキーマ（YT Data API 互換）

```jsonc
{
  "title": "技術士総監 R03 過去問 #1（経済性管理）",      // 40 字以内、YT API videos.snippet.title
  "description": "...",                                  // 概要欄、UTM 付き URL を含む
  "tags": ["技術士", "技術士総監", "経済性管理", ...],     // YT API videos.snippet.tags
  "categoryId": "27",                                    // YT API カテゴリ ID
  "privacyStatus": "private",                            // 初期は private、本番運用で public
  "sourcePackId": "r03-pack-01",                         // 派生元の IG Reels パック ID
  "sourceYear": "r03",
  "sourceUrl": "https://doboku-note.com/docs/pe-comprehensive-management/r03",
  "durationSeconds": 42.3,                               // ffprobe 実測
  "derivedFrom": "instagram-reels"                       // v7 で必須（独立生成と区別）
}
```

### description の必須要素

```
{titleBase}（技術士総監）

この動画は IG Reels で公開した過去問パックから 1 問抜粋した YouTube Shorts 派生版です。

▼ 詳細解説（doboku-note）
https://doboku-note.com/docs/pe-comprehensive-management/r03?utm_source=youtube&utm_medium=description&utm_campaign=exam-pack-r03-pack-01

▼ 受験記・解答再現（note）
https://note.com/{author}?utm_source=youtube&utm_medium=description&utm_campaign=note

#技術士 #技術士総監 #総合技術監理 #過去問 #令和3年度
```

- **`utm_source=youtube` 必須**（IG 用 `utm_source=instagram` の混入は禁忌）
- `utm_campaign=exam-pack-<pack-id>` でパック単位の経路追跡

---

## 3. 4 軸ルーブリック（yt-shorts-publisher-qa が採点）

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. 尺適正** | durationSeconds が 30-60 秒範囲内 | 30-60 秒（推奨範囲） |
| **2. 概要欄 UTM 整合** | `utm_source=youtube` + パック固有 campaign | サイト/note 両 URL に UTM 正規 |
| **3. タイトル長・検索性** | 40 字以内・年度/パック/管理分野含む | 40 字以内・3 要素すべて含む |
| **4. 字幕焼き込み** | v7 MVP は字幕無しを許容、メタ整合のみチェック | 字幕無し or duration 一致 |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **重大減点**:
  - 軸 1: 尺 15 秒未満 or 90 秒超 → **-2 点**
  - 軸 2: IG 用 UTM（`utm_source=instagram`）混入 → **-2 点**

---

## 4. 担当境界

| 工程 | 担当 |
|---|---|
| IG Reels mp4 / slide-NN.mp4 の生成 | `ig-reel-create.mjs`（上流・別工程） |
| IG Reels script.json / caption.txt の執筆 | `ig-reels-writer`（上流） |
| YT Shorts 派生 mp4 + meta.json 生成 | `yt-shorts-create --from-reels`（機械処理） |
| 4 軸採点 | `yt-shorts-publisher-qa` |
| YouTube Data API 投稿 | `media-uploader.mjs`（別工程） |

## 改訂履歴

- v1（2026-05-28）: 初版。SNS 戦略 v7 化に伴い、YT Shorts 派生 mp4 の品質基準を新設。v7 MVP では字幕焼き込み未対応のため軸 4 は暫定運用。
