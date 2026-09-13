# Instagram動画パックの制作・配信

制作対象と投稿順は [instagram-campaign.json](../../config/instagram-campaign.json)、制作物の照合結果は [instagram-campaign.json](../../state/instagram-campaign.json) が真実源。2026-09-10の承認範囲は112テーマをカルーセル112投稿・リール224本へ展開し、全件を制作・検査してから配信を始める。

## 制作

`content/sns/instagram/video-packs/{exam}/{sourcePackId}/slide-data.json` がカルーセル原稿、派生ディレクトリの `reels/script.json` がInstagram専用の台本。YouTubeの台本を直接読み上げない。校正で変えた論点は `coverHeadline` で表紙にも反映する。A案ロゴ・白/紺/青/黄・大きな見出し・既存の先生素材を共通レンダラーで使う。

```bash
npm run instagram-carousels:render -- --all
VOICEVOX_BASE_URL=http://127.0.0.1:50021 npm run instagram-reels:render -- --all --concurrency 1
npm run check-instagram-reels -- --media
npm run instagram-campaign -- --check --media
npm run instagram-campaign -- --gallery
npm run instagram-campaign -- --schedule
```

音声にはローカルのVOICEVOX（青山龍星）とffmpegを使う。「要＝かなめ」は読み辞書を通す。画像6〜10枚、動画30〜60秒、キャプションとプロフィール導線を検査する。動画は音声を含め全フレームをデコードした後に生成証跡を書く。原稿・テンプレート・出力SHAが変われば未完成へ戻る。途中停止時は同じコマンドで確認済み出力を再利用できる。字幕は数値・単位と日本語の語句をまとめ、CTAは文節ごとに表示する。説明画面は数値分断と1字だけの行も検査する。

原稿の意味監査と最終サンプルの目視記録は [編集・目視QA](../../state/instagram-editorial-qa.json) に残す。全件のファイル照合・動画デコードと、選定サンプルの目視は検査範囲が異なる。全224動画を目視・実音声聴取した記録として扱わず、各観察時のSHAとその後の改行調整、最終原稿のSHAを追跡する。

## 配信前の条件

- `publicationEnabled: false` は制作中の公開停止。全件チェックの成功を見てから、[ig-reconcile](../../skills/social/ig-reconcile/SKILL.md) で既存予約・公開済み投稿を実体照合する。ローカルの予約記録だけで重複を判断しない。
- 設定の相対日程は「リール1→カルーセル→リール2」。開始日は予約の実体と試験年度を確認して確定する。原稿の年度、直前・予想テーマは配信時に適用範囲を再確認し、対象年度を過ぎた記事を日付だけずらして公開しない。
- `--schedule` は336件・224日分のローカル配信表を作る。開始日が未確定なら日付は空のままで、外部予約はしない。公開フラグを変更しても開始日が未設定なら予約処理は停止し、旧 `reels/meta.json` の `publishAt` へフォールバックしない。年度・時期の再確認対象は設定の `timeSensitive` で識別する。
- 画像・音声の機械検査に加え、360px幅の画像と字幕合成後の動画を目視する。公開状態の検証が終わるまで、素材完成を外部更新完了と扱わない。
- `instagram-reels:verify-planner` は表示年月と予約時刻の存在を調べる。投稿IDや素材の一致は証明しない（`postIdentityVerified: false`）。前後月の同じ日番号や読み込み途中の画面を予約成功の証拠にしない。
- Instagramの公開済み投稿を削除する承認はこの制作計画に含まれない。新規投稿・予約編集・公開済み投稿の変更は [SNS画像ポリシー](./sns-image-policy.md) と [公開照合手順](./ig-publish-reconcile.md) に従う。

校正で発見した元記事・YouTube側の修正候補は [video-editorial-findings.json](../../state/video-editorial-findings.json) に記録する。条件不足と一次資料確認済みの誤りを区別し、元動画の再公開前に該当箇所を解消する。

## 予約と継続配信

2026-09-11の指示で旧シリーズを一旦停止した。[停止記録](../../state/ig-reconcile/series-pause-20260911.json) に対象・以前の日時・下書きへの移動操作・照合範囲を残す。旧シリーズの下書きを自動再開しない。新シリーズの開始日は設定の `cadence.startDate` を読む。

初回の新シリーズ9件は9月12〜17日に予約し、[予約照合記録](../../state/ig-reconcile/campaign-publication-20260911.json) に投稿ID・日時・素材SHA・照合結果を保存した。カルーセルは一括アップロードで画像順が入れ替わったため、同じ投稿IDの編集画面で1枚ずつ入れ直し、保存後の全画像順を再照合した。以降は投稿スキルの直列アップロードを使う。旧予約の取消34件と、外部の予約一覧に存在しない旧カルーセル8件のローカル保留は別集計にする。

予約はローカルのMeta Business Suiteログインを使い、完成済み素材から順次登録する。リールは29日先までなので、224日分の計画を一度に外部予約したとは扱わない。次の14日以内を上限に、1回最大9件を補充する。すでに予約した分はMeta側で時刻に公開される。未登録分の補充はMacとCodexが稼働する時に行う。

Codexの定期処理 `instagram`（Instagram新シリーズの予約補充）が毎日10:00 JSTにこの手順を実行する。変更なしでは通知せず、完了・失敗・人の操作が必要な場合に知らせる。

1. 全件の `instagram-campaign --check --media` を通し、`--schedule` で現在の設定から日程を作る。
2. 各候補の `status.json` とライブの予約・公開実体を照合する。 配信記録 `.claude/state/ig-reconcile/campaign-publication-*.json` の `pending` は未予約の引継ぎ候補として確認し、改めて実体と照合する。同じパック・形式の `scheduled` / `posted` は再送しない。不確かな送信結果は読み取りで確認する。
3. `timeSensitive` の候補は公開日時に対する年度・試験時期を一次情報で確認する。適用できないものは保留し、日付だけを変更して投稿しない。
4. `ig-publish-auditor` の公開可否ゲートを通し、`publish-ig-bs` の混在バッチへ `{packArg, kind, schedule}` を渡す。初回・UI変更後はリールとカルーセル両方のdry-runで表紙・投稿先・日時を確認する。
5. 保存後に投稿内容・形式・日時・アカウント・表紙を実画面で照合し、`status.json` と配信記録を更新してGitへ保存する。時刻だけのカレンダーチップを内容一致の証拠にしない。

週表示のカレンダーは2026-09-11に週送りと `status: 下書き` の読取を実測した。下書き移動後も古い予約行が「公開できませんでした」として残るため、予約一覧の行数を未停止件数として数えない。日セルをクリックすると新規コンポーザが開くため、既存投稿の詳細確認はコンテンツ一覧の対象行から行う。

一覧の読み込み中には空行が入り、見えている行だけでは全件を取得できないことがある。予約件数はアカウントと日時を持つ実データ行で数える。公開済みの重複確認は候補ごとの固有本文でも検索し、既存投稿が見つかる対照検索を前後に行う。公開済みReelsの行先頭には動画の尺が入るため、先頭行だけをキャプションとして比較しない。

## 保管と復元

原稿、キャプション、生成証跡はGitで管理する。カルーセルPNGとReels表紙はDriveの `ig-rendered-image`、動画は `sns-archived-media` へ保管する。人が手元の投稿処理で使う素材なのでpublic R2へ追加しない。

```bash
npm run drive-vault-sync -- --group ig-rendered-image --path content/sns/instagram/video-packs/
npm run drive-vault-sync -- --group sns-archived-media --path content/sns/instagram/video-packs/
```

dry-runで対象を確認し、`--commit` で保存する。保存後は同じ対象へ `--verify --deep --cloud` を実行する。マウント上のコピー完了とクラウド到達は別に検査し、一致するまでローカル出力を保持する。別端末での復元は `drive-vault-sync --pull --path` を使う。

全件のクラウド照合と空の復元先への取り戻し結果は [バックアップ検証記録](../../state/assets/instagram-campaign-backup.json) に残す。各素材の保存先・SHA-256・サイズは既存の [Drive台帳](../../state/assets/drive-manifest.json) を参照する。

マウント経由の読み取りが遅い場合は、対象のSHA-256と保存先からSUMファイルを作り、`rclone checksum SHA256 <SUMファイル> <Driveの対象フォルダ> --download --one-way` でクラウドの全バイトを直接照合できる。一致一覧が対象全件と一致し、差異・欠落・読取エラーが0件であることを確認する。検証記録には実際に使った方法を残し、マウント照合と直接ダウンロード照合を区別する。
