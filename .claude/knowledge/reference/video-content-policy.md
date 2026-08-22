---
title: 動画コンテンツ運用ポリシー
---

# 動画コンテンツ運用ポリシー

動画パックを生成・検査・派生・照合するときに、エージェント、スキル、スクリプト、管理画面が共有する作業契約。事業判断と優先順位は [動画コンテンツ運用設計](../../../docs/marketing/06_動画コンテンツ運用設計.md) を参照する。

## 1. SSOT境界

| 領域 | 置き場 | 内容 |
|---|---|---|
| 制作意図・台本 | `content/sns/video-packs/{exam}/{slug}/` | manifest、script、storyboard、thumbnail spec |
| 派生制作物 | 既存の `content/sns/{instagram,x,youtube}/` | 各チャネルpolicyに従う入力 |
| 公開・照合状態 | `.claude/state/video-content-status.json` | URL、videoId、status、計測鮮度 |
| 再生成可能バイナリ | R2 | mp4、wav、字幕、frame、生成済み画像 |
| 戦略・判断 | `docs/marketing/06_動画コンテンツ運用設計.md` | 優先順位、KPI、段階実装 |

制作意図と可変状態を同じJSONに保存しない。既存 `.claude/state/youtube-schedule.json` はShorts投稿台帳として残し、reconcileで共通statusへjoinする。

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
    "kind": "catalog",
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

- `packId` はリポジトリ全体で一意かつ公開後変更しない
- `pain` と `promise` は1つずつ
- `sourceRefs` は実在し、公開可否を機械判定できる
- `primaryCta` は1つ。生URLよりcatalog IDを優先
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

厳格モードは、検査対象0件、manifest parse失敗、sourceRefs未解決、status取得失敗をPASSにしない。

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

