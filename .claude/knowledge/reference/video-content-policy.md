---
title: 動画コンテンツ運用ポリシー
---

# 動画コンテンツ運用ポリシー

動画パックを生成・検査・派生・照合するときに、エージェント、スキル、スクリプト、管理画面が共有する作業契約。事業判断と優先順位は [動画コンテンツ運用設計](../../../docs/marketing/06_動画コンテンツ運用設計.md) を参照する。

機械可読の契約（enum・状態遷移・UTM・尺・逐語 window）は `.claude/config/video-content.json` が SSOT。checker（`npm run check-video-content`）・fixture（`tests/fixtures/video-content/`）・将来の admin parser はこの config を読む。本書と config がずれたら config 側の `updated` を進めて両方を同一 commit で直す。

## 1. SSOT境界

| 領域 | 置き場 | 内容 |
|---|---|---|
| 制作意図・台本 | `content/sns/video-packs/{exam}/{slug}/` | manifest、script、storyboard、thumbnail spec |
| 派生制作物 | 既存の `content/sns/{instagram,x,youtube}/` | 各チャネルpolicyに従う入力 |
| 公開・照合状態 | `.claude/state/video-content-status.json` | URL、videoId、status、計測鮮度 |
| 再生成可能バイナリ | R2 | mp4、wav、字幕、frame、生成済み画像 |
| 戦略・判断 | `docs/marketing/06_動画コンテンツ運用設計.md` | 優先順位、KPI、段階実装 |

制作意図と可変状態を同じJSONに保存しない。既存 `.claude/state/youtube-schedule.json` はShorts投稿台帳として残し、reconcileで共通statusへjoinする。

企画バンクの一覧は `content/sns/video-packs/README.md`（**生成物**・`npm run build-video-pack-index` で再生成・手編集しない）。運営管理画面の汎用コンテンツブラウザ `/content/content~sns/video-packs` がこれを描画する（Phase 3 の専用ビュー `/content/video` までの暫定管理面）。鮮度は `check-video-content` の R 系検査（R01 欠落／R02 未掲載／R03 孤児行）が守る。manifest だけの「企画のみ」パックは正常な draft であり、script/storyboard の欠落は INFO 扱い（qa_passed 以降で欠けたら FAIL）。

## 2. `video-pack.json` 最小契約

```json
{
  "schemaVersion": 1,
  "packId": "civil-keiken-overview-seven-fields",
  "exam": "civil-construction-1",
  "title": "工事概要7項目で失点しない",
  "audience": "施工経験記述の準備を始めた受検者",
  "pain": "工事概要に何を書けばよいか分からない",
  "promise": "7項目を実工事へ置換する順序が分かる",
  "intent": "howto",
  "sourceRefs": [
    { "type": "site", "path": "content/site/.../article.mdx" }
  ],
  "primaryCta": {
    "kind": "note-magazine",
    "targetId": "...",
    "campaign": "civil-keiken-overview-seven-fields"
  },
  "outputs": {
    "longform": true,
    "shorts": 2,
    "instagramCarousel": true,
    "instagramReel": false,
    "xThread": true,
    "threadsBrief": false
  }
}
```

必須要件:

- `packId` はリポジトリ全体で一意かつ公開後変更しない。ディレクトリ名 `{slug}` と一致させる
- `intent` は `exam-point | howto | diagnosis | roadmap | career` の5値（`career` は 2026-09-01 追加＝キャリア・転職系。試験対策4値と分けて送客判定を濁さない）。`primaryCta.kind` は `note-magazine | coconala-service | brain-product | site-article | links-hub` の5値。いずれも機械可読SSOTは `.claude/config/video-content.json`
- `pain` と `promise` は1つずつ
- `sourceRefs` は実在し、公開可否を機械判定できる
  - `type: site|note|figure` は `path` 必須＋実在必須
  - `type: site` で `published:false` の記事参照は既定で漏洩扱い（意図的なら `allowUnpublished: true` を明示）
  - `type: note` は `access: free|paid` の明示必須（paid は逐語転用ゲートの重点対象）
  - `type: external` は `https` の `url` と `title` 必須（WebFetch で実在確認済みの URL だけ書く）
- `primaryCta` は1つ。生URLよりcatalog IDを優先。`campaign` は `packId` と一致（utm_campaign に使う）
  - catalog 系 kind（note-magazine / coconala-service / brain-product）は `targetId` がカタログ id に解決できること
  - `site-article` は `targetPath` 実在、`links-hub` は `/links` 固定
- `outputs` は希望する派生物であり、公開済み状態を持たない
- 実績、合格、売上、統計を扱うときは根拠referenceを追加する

## 3. 台本契約

`script.md` は少なくとも次を持つ。

1. 5〜15秒で悩みと得られる答えを提示
2. 視聴者が誤解しやすい前提
3. 3〜5個の説明ブロック
4. 具体例または図解
5. 動画内要約
6. 主CTA 1つ
7. 出典一覧

サイト・noteをそのまま読み上げず、動画向けに順序・例・図解・問いかけを再編集する。有料商品の答え全文、模範答案全文、個人情報、未確認の体験談は含めない。

## 4. ストーリーボード契約

各sceneは `sceneId`、開始/終了、ナレーション、画面要素、sourceRef、captionを持つ。画面要素は既存図版を優先し、新規図版は既存画像ポリシーに従う。

- 16:9通常動画: 1920×1080
- 縦型派生: 1080×1920
- 字幕は音声と一致させ、1画面へ長文を詰めない
- 数式・表・細線図版はモバイルで読める簡略版を用意する
- 音声だけで理解不能な箇所と、画面だけで理解不能な箇所を残さない

Shortsのプラットフォーム上限と、doboku-noteが採用する推奨尺を混同しない。推奨尺はフォーマット別policyに置く。

16:9通常動画のレンダラーは `npm run render-longform`（`scripts/render-longform.mjs`・純粋ロジックは `scripts/lib/longform-render.mjs`）。scene の視覚要素は additive フィールド `visual: { kind: 'cover'|'points'|'figure', heading, items[], src? }` で持ち、試験色は exam-palette（note-cover-tokens.json）を解決する。`figure` はリポジトリ内の既存SVG/PNG/WebP/JPEGだけを`src`で参照し、本文の図解を1920×1080へ再利用する。出力は `.tmp/video-render/{packId}/`（PNG・ASS・render-manifest.json・mp4）で、パックディレクトリと Git にはバイナリを書かない。VOICEVOX/ffmpeg の無い環境は `--skip-tts` で PNG/ASS まで生成し、mp4 は Mac または GitHub Actions で同コマンドを完走させる。

## 5. 状態モデル

共通statusは次の順序を基本とする。

```text
draft → qa_blocked | qa_passed → approved → rendered → scheduled → published
                                                      ↘ failed
published → measured → refresh_due | stopped
```

- `approved` はユーザーまたは明示された承認者だけが設定できる
- 外部公開成功と台帳書戻し失敗を区別する
- `published` は公開URLまたはvideoIdの実体照合が必要
- snapshot未取得を0件として扱わない
- 派生物ごとに状態を持ち、pack全体を一括publishedにしない

## 6. エージェント責務

### `video-script-writer`（Generator）

- sourceRefsを読んで、悩み・promise・台本・storyboard・派生briefを生成
- `exam` パラメータで多資格対応し、資格別agentを作らない
- URL・数値・制度を推測しない
- 既存動画パックとの重複候補を報告する
- ファイル作成後に機械チェックを実行する
- 自分の成果物を合格判定しない

### `video-content-qa`（Evaluator）

- 6軸ルーブリックとBLOCK gateで評価
- sourceRefsと主張を突合し、出典なしの断定をBLOCK
- 動画としての順序・図版・字幕・CTAを意味評価
- 修正案は出すがファイルを編集しない
- 公開・投稿・status変更をしない

### 既存エージェント

- `yt-shorts-title-writer`: Short固有タイトルだけ
- `yt-shorts-publisher-qa`: Shortのmp4/meta/UTM/配信適合だけ
- `ig-reels-writer` / `ig-reels-qa`: 派生後のReels固有物だけ
- `x-post-writer` / `x-post-qa`: 派生後のX固有物だけ

## 7. オーケストレータ責務

`/video-content` は次だけを行う。

1. 入力と既存packを特定
2. Generatorを1回呼ぶ
3. 機械ゲートを通す
4. Evaluatorを独立に呼ぶ
5. BLOCK時はGeneratorへ指摘だけを返す
6. PASS後は承認待ちで停止

レンダリング、R2 upload、外部投稿、公開状態照合は既存CLI/workflowへ委ねる。承認を自動補完しない。

## 8. `check-video-content` 契約

実装は `scripts/check-video-content.mjs`（ライブラリ `scripts/lib/video-content-check.mjs`）。exit 契約:

- `0` 合格（packs root 不在＝Phase 1 未着手は「未着手」と明示して exit 0。緑と 0 件検査を混同しないよう、常に検査対象数と実検査数を出力する）
- `1` 違反あり
- `2` 検査不成立（root はあるのにパック 0 件、または `--strict` で root 不在）

manifest parse失敗、sourceRefs未解決、status parse失敗はFAIL（PASSにしない）。checker 自体の健全性は `tests/video-content-check.test.mjs` が fixture（`tests/fixtures/video-content/`）で担保し、`npm test`（quality-audit ci:true）で回る。quality-audit にも `video-content` として登録済み。

最低検査:

- schema version、必須フィールド、enum、packId重複
- script/storyboard/thumbnail参照
- sourceRef実在、非公開コンテンツの漏洩フラグ
- CTA target解決、UTM source/medium/campaign/content
- scene時間の連続性、総尺、caption長
- 逐語一致・定型水増し・同一scene反復
- mp4/wavのGit混入
- statusの孤児、videoId重複、公開URL不整合、鮮度
- ShortのrelatedVideoIdと通常動画公開状態

完成動画の機械検査はffprobe等で、解像度、尺、音声stream、無音、黒画面、末尾切れ、字幕範囲を確認する。

## 9. 公開ゲート

外部公開には次がすべて必要。

- 機械チェックPASS
- `video-content-qa` のBLOCK 0、平均2.0以上
- 資格固有の事実監査が必要な場合は専門Evaluator PASS
- primary CTAが1つで、リンクとUTMが解決
- Shortの場合はrelatedVideoIdを設定可能
- 公開対象、日時、アカウントを表示してユーザー承認
- 投稿後に実URL・videoId・関連動画・CTAを再照合

## 10. 管理画面契約

管理画面はmanifest、runtime state、CI snapshotをjoinして表示するだけとする。

実装状況（2026-08-28）: Phase 3 の画面は稼働。

| 画面 | 見るもの |
|---|---|
| `/content/video` | 企画ボード（資格・段階フィルタ・QA 点・台本/構成の有無・主 CTA） |
| `/content/lifecycle` | 全チャネル共通ステージ横断（企画→下書き→公開） |
| `/metrics/video` | 動画成果（派生物ごとの公開状態 × GA4 送客・`utm_campaign = packId` で join） |
| `/sns` の「動画パック 派生物」節 | SNS 投稿状況との join |

行の組み立ては `scripts/lib/video-content-check.mjs` の `loadPackSummaries`、状態の共通ステージ写像は `scripts/lib/content-lifecycle.mjs`（[content-lifecycle.md](./content-lifecycle.md)）が唯一の実装で、CLI・admin が同じものを使う。

**計測は CI 供給が正**（会社 PC からライブ API を叩かない）。`fetch-metrics.yml` の「Fetch GA4 (campaign, 28d…)」が `.claude/state/metrics/ga4/ga4-campaign-*.json` を週次で供給し、`/metrics/video` はそれを読むだけ。**スナップショット未取得は 0 件として扱わず「未取得」と表示する**（送客ゼロと区別）。配線（fetcher の dimension・workflow のステップ・出力名と読み取り prefix の一致）は `tests/video-outcomes-wiring.test.mjs` が固定する。

**Shorts 台帳（`.claude/state/youtube-schedule.json`）は動画パックと別系統**。IG 過去問パック由来のレガシー 200 本で、item に packId も relatedVideoId も持たない。DN-0110 以降の派生 Shorts は `video-content-status.json` の `derivatives.shorts[]` に入る。画面では 2 つを同じ表に混ぜない（混ぜると「動画パックの Shorts が 200 本ある」と誤読する）。

**公開実体の照合**は 2 本立て。実査 `verify-video-publication`（CI 週次＝`verify-yt-status.yml` に同居・creds 必須）が videos.list で削除/非公開・概要欄の `utm_campaign={packId}`/`utm_source=youtube` 欠落・公開済み Short の `relatedVideoId` 未設定を検出し `.claude/state/video-publication-verify.json` へ記録する。**creds 不足・API 失敗は 記録を書かずに exit 2（検査不成立）**——「creds が無い」を「異常なし」と記録すると以後ずっと緑が出て事故が埋もれるため。ゲート `check-video-publication`（オフライン・quality:audit ci:true）はその記録の有無・網羅・鮮度（既定 14 日）・孤児・報告済みドリフトを見る。**published なのに一度も照合していない**状態が最も危険なので V01 で赤にする。対象 0 件（公開前）は件数を明示して PASS（異常 0 件と混同しない）。是正は人が判断し、スクリプトは台帳を書き戻さない。

- ソース未取得と0件を区別
- 企画・派生・公開・計測を同じ行で追える
- sourceRefs、QA、CTA、公開URLへドリルダウンできる
- インライン編集、公開ボタン、shell、secret表示を持たない
- status判定ロジックをReactへ再実装せず、共通parser/checkerを再利用する

## 11. Threadsの扱い

ThreadsはX本文の機械的な複製先にしない。packから「質問」「反論」「補足」「回答」の会話briefを生成し、パイロットKPI確認後に手動投稿から始める。専用agentは作らず、既存テキストGeneratorのmode追加で十分かを先に検証する。

## 12. 変更時の同期先

- schema/状態/ゲート変更: 本書、fixture、checker、管理画面parser
- 新agent: `agents-registry.md` とcoupling gate
- 新skill: `skills-registry.md` とskills guide
- 新チャネル派生: `content/sns/README.md` と各channel policy
- 戦略・KPI変更: `docs/marketing/06_動画コンテンツ運用設計.md`
