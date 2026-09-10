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

## 保管と復元

原稿、キャプション、生成証跡はGitで管理する。カルーセルPNGとReels表紙はDriveの `ig-rendered-image`、動画は `sns-archived-media` へ保管する。人が手元の投稿処理で使う素材なのでpublic R2へ追加しない。

```bash
npm run drive-vault-sync -- --group ig-rendered-image --path content/sns/instagram/video-packs/
npm run drive-vault-sync -- --group sns-archived-media --path content/sns/instagram/video-packs/
```

dry-runで対象を確認し、`--commit` で保存する。保存後は同じ対象へ `--verify --deep --cloud` を実行する。マウント上のコピー完了とクラウド到達は別に検査し、一致するまでローカル出力を保持する。別端末での復元は `drive-vault-sync --pull --path` を使う。

全件のクラウド照合と空の復元先への取り戻し結果は [バックアップ検証記録](../../state/assets/instagram-campaign-backup.json) に残す。各素材の保存先・SHA-256・サイズは既存の [Drive台帳](../../state/assets/drive-manifest.json) を参照する。

マウント経由の読み取りが遅い場合は、対象のSHA-256と保存先からSUMファイルを作り、`rclone checksum SHA256 <SUMファイル> <Driveの対象フォルダ> --download --one-way` でクラウドの全バイトを直接照合できる。一致一覧が対象全件と一致し、差異・欠落・読取エラーが0件であることを確認する。検証記録には実際に使った方法を残し、マウント照合と直接ダウンロード照合を区別する。
