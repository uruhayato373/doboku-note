# YouTube Shorts Publisher 品質ポリシー（v8）

旧Instagram/per-problem派生と、通常動画を核にする動画パック派生の双方における **YouTube Shorts配信物の品質基準**。`yt-shorts-publisher-qa` Evaluator がこの文書を真実源とする。

関連:
- SNS 戦略 v7 → [`docs/marketing/01_SNS集客戦略.md`](../../../docs/marketing/01_SNS集客戦略.md)
- 派生スキル → [`.claude/skills/social/yt-shorts-create/SKILL.md`](../../skills/social/yt-shorts-create/SKILL.md)
- IG Reels 側真実源 → [`.claude/knowledge/reference/ig-reels-policy.md`](./ig-reels-policy.md)

最終更新: 2026-09-05（承認済み112動画パック×2本の生成・段階予約経路を追加）

---

## 1. 入力前提

入力は次の2経路を区別する。

- legacy: `yt-shorts-create --from-reels <pack-id>` または `per-problem-shorts.mjs` が出力した `content/sns/youtube/<date>-<pack-id>/`
- 動画パック: `content/sns/video-packs/{exam}/{packId}/youtube.json.shorts[]` と `storyboard.json`。`render-video-pack-shorts.mjs` が `.tmp/video-render/{packId}/shorts/{key}/` へ出力

| ファイル | 役割 |
|---|---|
| `shorts.mp4` | 30-60 秒の縦動画（legacy派生、または動画パックの本文scene＋関連動画CTA） |
| `thumbnail.png` | 1080×1920 サムネ（`per-problem-shorts.mjs` は `renderExamCoverIg` で YT 専用生成、`yt-shorts-create` は IG cover を直コピー） |
| `meta.json` / `youtube.json.shorts[]` | YT Data API 投稿用メタ（タイトル・概要欄・タグ・公開日時・UTM付きURL） |

動画パック派生は字幕焼き込み必須。字幕なし許容は既存legacy素材だけに限定する。

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
  "derivedFrom": "instagram-reels",                      // v7 で必須（独立生成と区別）
  "relatedVideoId": "..."                               // 通常動画がある場合の主導線
}
```

### description と導線

YouTubeの現行仕様では、Shortsの説明欄・コメントに置いた外部URLはクリックできない。サイト・noteへの主導線は、Shortsの**関連動画**で通常動画へ送り、通常動画のクリック可能な概要欄から外部へ送る。説明欄URLとUTMは表示・データ整合のため維持するが、直接CTRの主KPIにはしない。

- [YouTube Help: Sharing links with your audiences](https://support.google.com/youtube/answer/13748639)
- [YouTube Help: Add a related video to your YouTube Shorts](https://support.google.com/youtube/answer/14075157)

説明欄の標準要素:

```
{titleBase}（技術士総監）

この動画は IG Reels で公開した過去問パックから 1 問抜粋した YouTube Shorts 派生版です。

▼ 詳細解説（doboku-note）
https://doboku-note.com/docs/pe-comprehensive-management/r03?utm_source=youtube&utm_medium=video&utm_campaign=exam-pack-r03-pack-01&utm_content=shorts

▼ 受験記・解答再現（note）
https://note.com/{author}?utm_source=youtube&utm_medium=video&utm_campaign=note&utm_content=shorts

#技術士 #技術士総監 #総合技術監理 #過去問 #令和3年度
```

- **`utm_source=youtube` 必須**（IG 用 `utm_source=instagram` の混入は禁忌）
- **`utm_medium=video` に統一**（GA4 標準の「Video」チャネル分類。旧 `description`/`youtube-shorts` は非標準値で GA4 が Unassigned に落とす）。配信形式は `utm_content=shorts` で持つ。真実源＝`.claude/scripts/lib/sns-common/sns-config.mjs` ＋ `docs/marketing/02_チャネル動線設計.md §4`
- `utm_campaign=exam-pack-<pack-id>` でパック単位の経路追跡
- 動画パック派生は `utm_campaign={packId}&utm_content=shorts` とし、`.claude/config/youtube-production-disclosure.json` の `authorityNotice`（総監取得者が企画・監修、AIは音声・映像制作補助）を1回だけ含める
- API状態は `productionDisclosure=author-led-ai-assisted`、`containsSyntheticMedia=false` とし、AIが内容判断を担ったように見せない

### タイトル規約（1 問 1 答・重複禁止）

1 Short = 1 問なので、タイトルは **その問題の論点**を反映する。

- legacy総監の型: `技術士総監 令和X年度 択一｜{その問題の論点} #Shorts`
- 動画パックの型: `{資格名}｜{固有論点} #Shorts`。`prepare-video-pack-shorts.mjs` が一意な36字以内で生成する
- **「一問一答」等の汎用語や、動画間で同一のテンプレタイトルは禁止**（スパム/シャドウバン判定の元 → §6）。問題ごとに論点を変える。
- 40字以内。年度はlegacy総監では必須、動画パックでは不要。
- **title は `yt-shorts-title-writer`（Generator）が論点ベースで自動生成**し、`yt-shorts-create` の既定タイトル（`技術士総監 …過去問（管理）`）を上書きする。`yt-shorts-publisher-qa`（Evaluator）が本規約への適合を採点する。

---

## 3. 4 軸ルーブリック（yt-shorts-publisher-qa が採点）

| 軸 | 観点 | 5 点満点の基準 |
|---|---|---|
| **1. 尺・画角適正** | 現行Shorts成立条件は縦/正方形かつ最長3分。doboku-noteの派生型は30-60秒を推奨 | ≤180秒かつ縦/正方形。30-60秒の既定型なら満点 |
| **2. 導線・UTM整合** | 関連通常動画 + 正規UTM + 著者主体/AI制作補助表記 | 関連動画設定が可能で、UTMと`authorityNotice`が正規 |
| **3. タイトル長・検索性** | legacyは年度＋論点、動画パックは資格名＋固有論点＋一意性 | 経路別の型に適合し40字以内 |
| **4. 字幕焼き込み** | 動画パックは必須、legacy既存素材のみ字幕無し許容 | 字幕と映像のdurationが一致 |

### 合否ライン

- **合格**: 平均 4.0 以上 **かつ** 全軸 3 以上
- **重大減点 / 不合格ゲート**:
  - 軸 1: **180秒超または横長 → 軸1=0点・不合格**。60秒超はShort不成立ではないが、既定の30-60秒型から外れるため明示承認がなければ減点。1分超で著作権claimがあるShortは全世界ブロック対象になり得るため使用音源も確認する（[YouTube Help](https://support.google.com/youtube/answer/15424877)）
  - 軸 2: IG 用 UTM（`utm_source=instagram`）混入 → **-2 点**
  - 偽成功: 予約アップロード後に `videos.list` 実査をしていない完了報告 → §7 違反として差し戻し

---

## 4. 担当境界

| 工程 | 担当 |
|---|---|
| IG Reels mp4 / slide-NN.mp4 の生成 | `ig-reel-create.mjs`（上流・別工程） |
| IG Reels script.json / caption.txt の執筆 | `ig-reels-writer`（上流） |
| YT Shorts 派生 mp4 + meta.json 生成 | `yt-shorts-create --from-reels` または `per-problem-shorts.mjs`（機械処理） |
| 動画パックShortsの計画・生成・R2受け渡し | `npm run youtube-shorts:prepare` → `youtube-shorts:render` → `youtube-shorts:stage -- --commit` |
| サムネイル（thumbnail.png）の生成・R2 アップ | `upload-shorts-to-r2.mjs`（mp4 と同時アップ）、または `generate-thumbnails.mjs`（単独実行） |
| 4 軸採点 | `yt-shorts-publisher-qa` |
| YouTube Data API 投稿（台帳駆動 CI） | `post-from-schedule.cjs` + `post-youtube-scheduled.yml`（手動 `workflow_dispatch`、`youtube-schedule.json` 台帳管理） |
| 動画パックShortsの投稿 | `publish-video-pack.cjs`（private upload）→YouTube Studioで関連動画設定→`shorts-publish --related-confirmed`（API予約） |
| 台帳整合性バリデーション | `validate-schedule.mjs`（CI pre-check。publishAt 重複・perDay 超過・videoId 重複を検知） |
| 投稿済み動画へのサムネイル後付け | `set-thumbnail-uploaded.mjs`（一回限りの補完ツール） |

## 5. 投稿カーデンス・スケジューリング（2026-09-05 更新）

- legacy総監台帳の187本はretiredのまま凍結し、cronでは再開しない。
- 2026-09-05に承認された動画パック112件のShorts224本は、太平洋時間のAPI日次更新後に、日次cronで最大45 pack/90本をprivate uploadする（[公式Quota Calculator](https://developers.google.com/youtube/v3/determine_quota_cost)の`videos.insert`既定100本/日に対して10本の余裕を確保）。公開予約はStudioで関連通常動画を設定・確認した後に限る。
- 公開枠は通常動画も含めJST `07:30` / `12:30` / `20:00`の最大3投稿/日とし、試験日は投稿しない。
- **1 Short = 1 問または1論点**。同日に類似論点を連投しない。

## 6. シャドウバン・低リーチ回避（2026-06-05 確定）

1. **他社透かしの混入禁止**: IGアプリ書き出しの透かし入り動画は使わない。本パイプラインは `ig-reel-create` の自前レンダリング（slide-data → mp4）でロゴ無し。IG Reelsのフル動画を無編集で直投稿せず、`yt-shorts-create --from-reels` でShorts向けの尺・冒頭・CTA・メタへ再編集する。
2. **再利用コンテンツ対策**: トリム＋概要欄 UTM 差替で IG 版と別物化。かつ運営者オリジナル。
3. **タイトル/概要の使い回し禁止**: §2 タイトル規約に従い、動画ごとに論点を変える。
4. **投稿速度**: §5 の 3 本/日を守り、一気の大量投下をしない。
5. **ハッシュタグ**: 数個・関連のみ ＋ `#Shorts`（詰め込み禁止）。

## 7. 偽成功検証（予約アップロード）

- `post-from-schedule.cjs` のログ「公開設定: unlisted」は**表示バグ**（`publishAt` 指定時の実値は `privacyStatus: private` + `publishAt`）。
- **報告前に `videos.list(part=status)` で実査**: `privacyStatus === "private"` かつ `publishAt` 設定済み、さらに縦/正方形・`durationSeconds ≤ 180`を確認する。related videoはData APIで設定・取得できないため、Studioでの保存確認と公開後の運用照合を組み合わせる。
- これは X `publish-x` の偽成功検証と同じ思想（ログを信じず実体を確認）。
- サムネイル設定（`thumbnails.set`）の確認: `thumbnails.list(videoId)` で `default`/`medium` に画像が設定されているかを実査する。未設定のままだと YouTube が自動選択したフレームが表示され、クリック率が下がる。

## 改訂履歴

- v4（2026-09-05）: 動画パック112件からのShorts224本を追加。字幕必須、36字タイトル、著者主体/AI制作補助表記、日次private upload、Studio関連動画設定後のAPI予約を明文化。legacy187本はretiredのまま。

- v3（2026-08-21）: 現行YouTube仕様へ同期。縦/正方形Shortsは最長3分、外部URLは非クリック、関連動画はクリック可。30-60秒はプラットフォーム条件でなくプロジェクト推奨尺へ変更。cron廃止・手動dispatchも反映。

- v3（2026-06-08）: §1 thumbnail 説明を YT 専用生成（`renderExamCoverIg`）に更新。§4 担当境界を `post-from-schedule.cjs`（台帳駆動 CI）・`validate-schedule.mjs`・`generate-thumbnails.mjs` 等の実装に合わせて更新。§7 偽成功検証にサムネイル実査を追加。`upload.js`/`post.js` への言及を削除。
- v2（2026-06-05）: 尺ゲートを **≤60 秒**（Short 成立条件・60 秒超は通常動画扱い）に厳格化。投稿カーデンス（3 本/日・JST 07:30/12:30/20:00）・シャドウバン回避（§6）・偽成功検証（§7 videos.list）・1 問 1 答タイトル規約（§2）を確定。
- v1（2026-05-28）: 初版。SNS 戦略 v7 化に伴い、YT Shorts 派生 mp4 の品質基準を新設。v7 MVP では字幕焼き込み未対応のため軸 4 は暫定運用。
