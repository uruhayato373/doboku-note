# SNS バイナリ アーカイブ運用（Google Drive vault）

`content/sns/` 配下の SNS 制作物のうち「再生成可能だが手元に置くと容量を圧迫する」バイナリ（reels の wav・video.mp4・YouTube Shorts の mp4）を、git に溜め込まず **Google Drive vault** へ退避する運用。置き場の判断軸は「誰が使うか」（[asset-storage-policy.md](asset-storage-policy.md) §1・決定木 `/asset-route`）。SNS バイナリは人の手元の JIT 投稿しか読まないので **human tier＝Drive** に置く。

2026-11-01 に旧 Instagram パックのソースを撤去した。以下のパック構造・再生成の説明は今後新しく制作する作品向けで、旧 `cem/exam-packs` や旧 `video-packs` の投稿再開には使わない。Instagram の現行素材は固定投稿3件の `profile-pinned/` にある。
同日、Drive の旧 Instagram レンダー・音声動画・旧R2アーカイブ計4569ファイルも削除した。固定投稿の6画像は残し、Drive台帳の旧素材3726行を撤去した。

> 2026-09-05（DN-0170）まで reels の wav/mp4 は public R2 `sns/` へ `upload-sns-r2` で退避していた。サイトは配信せず CI も読まない（YouTube Shorts の台帳は 2026-08-18 に手動投入へ切替済み・pending 0・参照キー `sns/youtube-shorts/` は R2 に 0 件。投稿 workflow `post-youtube-scheduled.yml` は 2026-10-24 に廃止）ので、281 件を Drive へ移し R2 側を削除、スクリプトと npm script を廃止した。

## なぜ必要か

`content/sns/` は一時 1.22 GB / 6,646 ファイルまで肥大し、その大半が再生成可能なバイナリだった。`.gitignore` は wav/mp4 を除外しているが、gitignore は「追跡しない」だけでローカルの容量は減らない。退避先に実体を保全してからローカルを消す手順が要る。

## 1 パックの SoT と生成物の切り分け

| ファイル | 種別 | 置き場 |
|---|---|---|
| `slide-data.json` / `*caption.txt` / `reels/script.txt` | **制作内容の SoT（消えたら困る）** | git 追跡 |
| `status.json` / `posted.json` | 公開状態の移行中の写し（正本は `content/registry/`）。旧 IG パック分は撤去済み | 現行 IG 固定投稿3件と X に残る写しは DN-0629 で整理 |
| `carousel/img/*.png` / `stories/img/*.png`（成果物スライド） | 投稿そのもの | git 非追跡 → Drive `制作物/IGレンダー/`（`ig-rendered-image`） |
| `reels/wav/*.wav` | TTS で再生成可能・重い | git 非追跡 → Drive `制作物/SNS音声動画/`（`sns-archived-media`） |
| `reels/video.mp4` / `youtube/**/video.mp4` | wav+png から再生成可能 | git 非追跡 → Drive `制作物/SNS音声動画/`（`sns-archived-media`） |
| `reels/img/` / `slide-*.mp4` / `concat.txt` / `_empty.ass` 等 | 中間物 | どこにも置かない（毎回再生成） |

> [!important] 新規パックの制作入力を先に確定する
> 新しく作るパックでは slide-data.json + script/caption のテキストと公開状態の正本 `content/registry/` を保存する。旧 IG パックはソースを撤去したため、この再生成手順の対象外。

> [!warning] wav は JIT 動画の入力でもある
> `reels/wav` は `publish-reel-jit.mjs` / `per-problem-shorts.mjs` の**入力素材**（解答/CTA ナレ）。ローカルから消した pack で動画を JIT 生成するには、先に `drive-vault-sync --pull --path <pack> --commit` で取り戻すか script.txt から VOICEVOX で再合成する。

## 3 層モデル

1. **git に残す（極小）** — SoT テキストと図版 SVG。
2. **ローカル作業セット** — 制作中パックの wav/mp4 のみ手元生成・プレビュー。
3. **アーカイブ** — 投稿済み・旧パックの重いバイナリを Drive vault へ退避し、ローカル削除。

### ローリング作業セットと再発防止

旧 Instagram 224 本のローリング作業セットは 2026-11-01 に終了した。今後の Instagram 投稿は新規作品を個別に登録・制作する。YouTube の完成レンダーは従来のクラウド照合後に作業セットを縮小する。

```bash
npm run youtube-renders:prune -- --cloud                         # dry-run
npm run youtube-renders:prune -- --cloud --commit                # 公開済み派生物だけ削除
```

`prune-instagram-video-pack-reels.mjs` は旧224本専用のため現行運用では実行しない。
`prune-video-renders.mjs` は QA 待ち・`rendered` の通常動画とサムネイルを保持する。安全ゲートの回帰は
`tests/video-cache-prune.test.mjs` で固定する。

次の一時物はアーカイブではなく **再生成キャッシュ**。関連プロセスが動いていないことを確認してから削除し、
Drive へ二重保存しない。

- `.tmp/sns/` — SNS デザイン・CTA の中間レンダー
- `.tmp/yt-gen/` — YouTube 問題ナレーション／カバー音声の生成キャッシュ
- `.tmp/voicevox/` — VOICEVOX のダウンロード／展開キャッシュ。別の Engine 実体が動くことを確認してから削除

サイト図から生成する番号付き `*-diagrams/img/tweet-NN-名前.png` は、元図・元記事のハッシュ確認と再生成コマンドを持つため `x-rendered-image` で Drive へ退避する（詳細は asset-storage-policy.md）。

それ以外の X のカード PNG、YouTube の未公開サムネイル、`content/sns/_assets/` のブランド素材、共通図版は
公開処理・検査・複数チャネルの入力なのでローカル／Gitに残す。容量が小さいものへ専用 Drive group を
増やす前に、復元処理と検査の台帳対応に見合う削減量かを確認する。

## 退避と取り戻し（共通基盤 `drive-vault-sync`）

group は `config/drive-vault.json` の `sns-archived-media`（`^content/sns/(instagram|youtube)/.+\.(wav|mp4|m4a)$`・vault `制作物/SNS音声動画/` に `content/sns/` 相対で置く）。台帳は `drive-manifest.json`。

```bash
npm run drive-vault-sync -- --group sns-archived-media                                  # dry-run（対象と容量）
npm run drive-vault-sync -- --group sns-archived-media --path <現行の制作パック> --commit # 対象を絞って退避
npm run drive-vault-sync -- --group sns-archived-media --commit                         # 全対象を退避（読み直し sha256 一致で台帳へ）
npm run drive-vault-sync -- --group sns-archived-media --verify --deep --cloud          # 台帳・vault・Drive API md5 の 3 者一致
npm run drive-vault-sync -- --pull --path <現行の制作パック> --commit  # 取り戻し
```

> [!important] ローカル削除は別操作
> `drive-vault-sync` は**ローカルを消さない**。消すのは `--verify --cloud` が通った後に人が行う（マウントへ書けた＝クラウドへ上がった、ではない。Drive クライアントの送信が終わる前に消すと実体を失う）。旧 `upload-sns-r2 --purge-local` に相当する自動削除は設けない。

`check-drive-vault` が「group に一致するローカル実体が台帳に無い」を FAIL で拾うので、制作中パックの wav/mp4 を手元に置いたままにすると赤くなる。退避するか、制作が終わるまで待つかを判断する（判断は次節のエージェント）。

## 分業（sns-archive-auditor エージェント）

「どのパックをローカルから消して安全か」という**機械では測れない判断**は `sns-archive-auditor`（Evaluator・audit-only）に委ね、実行は親＋スクリプトが担う。

- **親（実行）**: `drive-vault-sync --group sns-archived-media` の dry-run で候補一覧を取得し、各パックの台帳状態・git 追跡状態・更新日時をエージェントへ渡す。判定後に `--commit` → `--verify --cloud` → ローカル削除。
- **エージェント（判定）**: 渡されたパックの `slide-data.json`/`script.txt`/`caption.txt` を Read し、**SoT が無傷で再生成可能か**を検証。`OFFLOAD` / `ARCHIVE_KEEP` / `KEEP_LOCAL` / `BLOCK` を根拠つきで返す。

二重の安全網: スクリプトが「vault 側の読み直しで sha256 一致するまで台帳に載せない」を守り、エージェントが「そもそも再生成できるか」を守る。

## 関連

- `.gitignore` の `content/sns/**/reels/` 節 — wav/mp4/中間ファイルの除外ルール（このポリシーの機械的裏付け）
- [asset-storage-policy.md](asset-storage-policy.md) — 置き場ルールの SSOT（§1 3 行ルール・§1-1 Drive vault のレイアウト）
- [ig-reels-policy.md](ig-reels-policy.md) — reels の JIT 運用
