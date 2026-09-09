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
| 再生成可能バイナリ | Google Drive vault `制作物/動画レンダー/`（`video-render-artifact`。人しか使わない＝サイトも CI も読まない。真実源 [asset-storage-policy.md](asset-storage-policy.md) §1） | mp4、wav、字幕、frame、生成済み画像 |
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

16:9通常動画のレンダラーは `npm run render-longform`（`scripts/render-longform.mjs`・純粋ロジックは `scripts/lib/longform-render.mjs`）。scene の視覚要素は additive フィールド `visual: { kind: 'cover'|'points'|'figure', heading, items[], src?, flow? }` で持ち、試験色は exam-palette（note-cover-tokens.json）を解決する。`figure` はリポジトリ内の既存SVG/PNG/WebP/JPEGだけを`src`で参照し、本文の図解を1920×1080へ再利用する。出力は `.tmp/video-render/{packId}/`（PNG・WAV・ASS・render-manifest.json・mp4）で、パックディレクトリと Git にはバイナリを書かない。VOICEVOX/ffmpeg の無い環境は `--skip-tts` で PNG/ASS まで生成し、mp4 は VOICEVOX と ffmpeg/ffprobe を用意した Windows / Mac 等で同コマンドを完走させる。現在、動画生成用の GitHub Actions ワークフローは無い。

通常動画・パック派生Shortsの説明画面は `scripts/lib/video-explanation.mjs` を共用する。白背景に試験色の見出し・STEPラベル・淡い要点カードを配置し、文字量に応じて文字サイズと行高を配分する。4項目以上の横長画面は複数列にし、字幕領域を空ける。`figure` は元図に基づく短い `flow[]` を指定すると編集可能な縦フローで表示できる。

通常動画の音声は読み辞書を適用し、字幕は元の漢字表記を保持する。`--resume` は `tts-inputs.json` の入力・話者・音声ハッシュの一致を要求し、古い読みの音声を再利用しない。`--resume --refresh-png` は音声の一致判定を保ったまま本文PNGを再生成する。

通常動画と動画パック派生Shortsの合成では、静止画を各場面の音声実尺で切って連結し、字幕込みで1回のエンコードを行う。Shortsの字幕は下端から420px上へ配置し、採用カバーのロゴと重ねない。

完成したバイナリは `video-render-artifact` group として Google Drive vault `制作物/動画レンダー/` へ退避する。未公開動画をpublicバケットへ置かず、private R2も恒久保管先にしない。GitHub ActionsのYouTube API資格情報を使う予約投入時は `youtube-longform:stage` で対象mp4とサムネイルを、採用サムネ更新時は `node scripts/stage-youtube-covers.mjs --commit` で確認済みPNGをprivate R2へ一時配置できる。前者は予約状態・videoId・publishAtの実査後、後者は更新結果の照合と記録取得後に、それぞれのコマンドの `--delete --commit` で転送用キーを削除する。既定dry-runで対象を確認してから同期し、実体・台帳・Driveの一致を確認できたものだけを台帳へ記録する。復元は同じgroupを指定する。

```bash
npm run drive-vault-sync -- --group video-render-artifact
npm run drive-vault-sync -- --group video-render-artifact --commit
npm run drive-vault-sync -- --pull --group video-render-artifact
npm run youtube-renders:prune -- --cloud                         # dry-run
npm run youtube-renders:prune -- --cloud --commit                # Drive一致＋公開済み派生物だけ削除
```

YouTube の stage スクリプトはローカル実体が無くても、`video-render-artifact` 台帳の sha256 と一致する
動画・サムネイルを使用直前に Drive から自動復元する。`youtube-renders:prune` は通常動画が
`scheduled` / `published` のパックと再生成可能な派生物だけを削除し、QA 待ち・`rendered` の通常動画と
サムネイルは作業セットとして保持する。台帳外・クラウド未到達・ローカル hash 不一致は削除せず停止する。
安全ゲートは `tests/video-cache-prune.test.mjs` で機械検証する。

### 人物付き表紙（パック単位で採用）

`cover-design.json` の契約は [SNS画像ポリシー §0.1](./sns-image-policy.md)。通常動画レンダラーは `covers.longform` を先頭sceneへ使う。`--resume` でも先頭PNGは再生成し、`--skip-png` は設定のあるパックで拒否する。Shortsレンダラーは `covers[Shortのkey]` を冒頭へ使い、同じPNGから投稿サムネイルを作る。設定がある場合は旧動画のhash一致だけでは再生成を省略しない。設定のないパックは従来意匠を維持する。

全レンダラーでschemaVersion・見出し行数/文字数・正規の試験キーを検査し、動画レンダラーではパックの試験との一致も要求する。単一サムネ更新の結果はstateの対象派生物の `thumbnailUpdate` に記録する（送信画像SHA・保存確認・実画像の確認面・動画本体の変更有無）。一括更新の詳細結果・前後情報・旧画像は暗号化receiptsを正本とし、公開可能な確認結果を必要に応じ既存stateへ反映する。`.claude/state/youtube-thumbnail-designs.json` は画像チェック台帳であり、外部更新完了を示さない。`cdn-matched` は配信画像の画素一致、`accepted-cdn-pending` はAPI受理後の確認待ち。いずれも公開フィード確認とは別である。`youtube.json` の元レンダーのmedia/thumbnail hashとは分離し、Studio/CDN確認を公開フィード確認へ読み替えない。一括手順は [SNS画像ポリシー §0.1](./sns-image-policy.md)。

`npm run youtube-shorts:render -- --pack-dir PATH --key KEY --preview-only --render-root .tmp/preview` は表紙・本文・CTAのPNGだけを `work/` に生成する。投稿サムネ・mp4・youtube.jsonのhashは書き換えない。公開済みサムネだけの更新ではこちらか `youtube-covers` を使い、動画まで更新したとは記録しない。通常動画の `--skip-tts` も完成動画ではなくPNG/字幕設計の確認用。

採用した締め画像はパックの `cta-design.json`（schemaVersion 1）で指定する。`longform` / `shorts` はそれぞれ `{path, sha256}` を持ち、1920×1080 / 1080×1920 のPNGを全画面で使う。画像の復元・hash・寸法の検査は表紙と共通で、不一致時は停止する。通常動画ではsceneId `cta` を置換し、`--resume` でも反映、`--skip-png` は拒否する。Shorts側には画像に対応する `narration` も必須で、通常動画の `render-manifest.json` に記録した `speaker` と同じ話者で合成し、字幕もこの文面に揃える。音声キャッシュは入力・話者・WAV hashで照合する。`--preview-only` はCTA画像までを検査し、音声は生成しない。設定のない形式は従来のCTAを使う。

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

**Shorts 台帳（`.claude/state/youtube-schedule.json`）は動画パックと別系統**。IG 過去問パック由来のlegacy 200本（13 uploaded・187 retired）で、再開しない。DN-0110の承認済み112パックから派生する224本は各 `youtube.json.shorts[]` が計画、`video-content-status.json` の `derivatives.shorts[]` が実行状態を持つ。`prepare → render → private R2 stage → API private upload → Studioで関連動画設定 → API予約` の順で進め、画面でも2系統を混ぜない。

APIへ非公開アップロード済みで関連動画設定待ちのShortsは `uploaded_private` とする。各Shortのアップロード成功直後に状態を書き、同一パックの2本目が日次上限で失敗しても1本目の`videoId`を失わない。

### 既存動画の新版への移行

動画ファイルは同じYouTube URLのまま差し替えられない。再アップロードと旧版削除をユーザーが承認した場合も、新版の処理完了・再生・サムネ・公開範囲/予約日時・Shortsの関連動画を確認してから旧版を削除する。旧URLの視聴数やコメントは新版に移らない。

`scripts/prepare-youtube-migration.mjs` は完全なチャンネル一覧と検証済みレンダーから移行計画を作る。`--inventory` / `--progress` / `--verification` にローカルJSONを渡し、既定は計画生成のみ、`--commit` はSHA-256付きの動画・サムネ・計画をprivate R2へ一時転送する。公開リポジトリへ非公開動画IDや旧新対応表を追加しない。恒久的な生成物保管先は引き続きDrive。

生成物の容量が大きいため、転送時は動画を1本ずつ読み、全本のバイナリをメモリに保持しない。Driveとprivate R2の両方で実体をハッシュ照合した完成動画は、手元のキャッシュを整理できる。ローカルmp4がない場合、この計画処理は既知のハッシュに対応するprivate R2実体を読み、ハッシュとffprobeを再検査する（R2の認証情報が必要）。未転送・未検証の完成動画や採用原本を容量対策だけで消さない。再生成可能なWAV・場面PNGは完成mp4の保存検証後に整理できる。

手動workflow `sync-yt-descriptions.yml` の `migration-upload` は計画のハッシュ・チャンネル・旧動画のメタデータ・送信動画のハッシュを照合する。既定dry-run、`commit=true` で通知なしの非公開アップロードだけを行う。既存タイトルとの一致で旧版を再利用しない。private R2へアップロード意図を先に保存し、応答を失った場合は再投稿せず記録と専用タグを照合する。処理完了は動画の尺・縦横寸法・音声ストリームまで実査する。このoperationに公開設定変更・サムネ更新・旧版削除は含まれない。サムネの日次制限中も非公開アップロードの結果を保持し、制限解除後の残工程へ引き継ぐ。

残工程も同じworkflowでphaseを指定する。`migration-audit` は旧版の字幕・再生リスト所属と新版の処理完了を取得し、`commit=true` の場合だけprivate台帳へ記録する（YouTubeへの書き込みなし）。`migration-thumbnail` は再試行可能日時を守り、設定後のCDN画像を比較する。受理済みで表示待ちの場合は再送しない。明示的な上限拒否は24時間の待機後に再試行できる状態として記録し、通信断などで結果不明の場合は再送せず照合する。

`migration-activate` はサムネ実表示・再生・再生リスト/手動字幕・Shorts自身の関連動画の状態が台帳にそろったものだけ、旧版の公開範囲と未来の予約日時へ切り替え、APIで読み直す。確認記録は自動で「確認済み」にせず実査後にprivate台帳へ残す。通常動画を公開した後、その動画を指すShortsや管理台帳の参照を新版へ更新する。`migration-delete` は依存リンクの更新完了と1時間以内の旧新IDに紐づく再確認を要求し、削除意図を先に記録してから旧版だけを削除し、APIで不存在を確認する。削除応答を失っても新たな対象を推測しない。移行中は旧IDを参照する日次投入を停止し、次節のprivate台帳キューへ切り替える。

### 定期予約・公開CI（2026-09-10）

`post-youtube-scheduled.yml` は毎日20:17 JSTに、固定した検証済みコードの `node scripts/youtube-delivery.mjs` を実行する。これはAPIへ予約を投入する時刻であり、視聴者への公開は既存カレンダーの `publishAt` にYouTube側が実行する。手動実行は `apply=false` が既定。`apply=true` は同じprivate台帳から続行する。旧 `publish-video-batch.cjs` のタイトル検索による日次投入には戻さず、置換対象IDを固定したキューへ切り替える。停止はActionsのDisable workflowで行う。コードや設定を更新するときは検査を通したコミットをpushし、workflowのcheckout refも更新する。

対象・日次上限は `.claude/config/youtube-delivery.json`。初期対象はA案への置換を承認した既存344本で、legacyのretired 187本や未承認の新規企画は追加しない。現行プラン外の新規動画は自動追加しない。今回の設定を将来の無制限な新規公開承認として流用しない。

処理は処理完了監査→サムネ→公開範囲/予約復元→旧版削除→未予約Shortsの予約→残りの非公開アップロード。Pacific日付ごとの上限をAPI呼出し前に保存するため、手動で同日に再実行しても枠をリセットしない。APIの日次上限は次のPacific午前0時、チャンネルのアップロード/サムネ日次制限は24時間待つ。制限は待機として扱い、認証・データ不一致・応答不明は停止する。1回の予算消化で未処理が残っても次回へ持ち越す。

実行状態はprivate R2の `youtube-migration/bridge-notebook-a-20260909/delivery-state.json` と `receipts/`、生エラーは同prefixの `delivery-error.json`。公開Git・Actionsログ・ジョブサマリーへは件数と固定の待機理由だけを出し、未公開動画IDを含めない。手動移行workflowと同じconcurrency groupで直列化する。

再生確認、Shorts関連動画、依存リンク更新、削除前1時間以内の実査は、証拠がない間は待機理由として残す。CIは確認済みフラグを自作しない。旧版削除済みの未予約Shortsは、関連先IDの確認記録と公開/限定公開の実体を確認し、各 `youtube.json` の未来の日時へ予約する。過ぎた枠を一斉公開に読み替えず `expired-publication-slot` として停止する。移行中の公開Git台帳には旧IDが残るため、private台帳との参照更新を済ませるまでは依存リンク確認を完了扱いにしない。

旧形式の10素材（YouTube実体は重複1本を含む11本）は `content/sns/youtube/legacy-refresh.json` と `scripts/refresh-legacy-youtube.mjs` で再生成する（`--only <key>` で部分再生成）。過去問8素材はハッシュ照合した原本の設問・解答・音声を保ち、表紙とCTAを差し替える。キーワード2素材は既存サイト記事に基づく編集可能なスライド原稿から再描画する。出力は `.tmp/video-render/legacy-brand-a/`、画像確認前の状態は `rendered` であり公開可能とは扱わない。確認後の移行計画は `legacy-metadata.json` の既存タイトル・現内容に即した概要欄・正規URL/UTMを取り込む。

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

### 確認済みPNGを使うカバー

`cover-design.json` の各specに `approvedImage: {path, sha256, specSha256}` がある場合、通常動画・Shortsの共通カバーレンダラーは採用済みPNGを使う。pathは `.tmp/video-render/` 配下、specSha256はapprovedImage以外の入力のhash。入力・画像hash・寸法の不一致は停止し、旧デザインへ戻さない。画像が無い場合はDrive台帳からの復元を試み、不成立なら引継ぎZIPの展開を案内する。画像を使う端末に制作時のポップ体フォントは不要。制作時のフォントファイルは移送しない。手順は [動画生成手順](../../../content/sns/youtube/VIDEO-RENDER.md)。
