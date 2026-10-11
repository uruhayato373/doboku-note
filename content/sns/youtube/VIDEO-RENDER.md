# 採用カバーから動画を生成する

採用画像はGoogle Driveに個別PNGとして保存する。保存状態はDrive台帳、採用パスとSHA-256は各カバー原稿を参照する。確認済みPNGをそのまま使うため、Macに制作時のポップ体フォントは不要。

[採用画像フォルダー](https://drive.google.com/drive/folders/1wP21EWW4E4CPMZpLXk_j5nVMgbVW2YQ-)

## Macで素材を復元する

採用原稿を含むGitの作業ブランチを最新にし、依存関係を `npm ci --legacy-peer-deps` で用意する。Google Driveアプリでdoboku-noteのvaultを同期してから、リポジトリ直下で実行する。

```bash
npm run drive-vault-sync -- --pull --group content-media --commit
npm run check-youtube-cover-handoff -- --local
```

採用表紙と締め画像は、2026-10-09 に日付フォルダ・連番名から ID ごとの置き場へ移した（DN-0607・画素は同じ）。Driveの `制作物/コンテンツ/{資格}/{パック}/youtube.{longform|short.{鍵}}/{cover|cta}.{sha8}.png` に保存し、`.tmp/media/` の同じ相対パスへ復元する（[content-registry.md](../../../.claude/knowledge/reference/content-registry.md)「素材の置き場」）。各 `cover-design.json`・`cta-design.json` のパスも新しい置き場を指す。台帳が欠けた画像やハッシュが違う画像は正常扱いにしない。動画生成時にも欠けた採用PNGはDriveから自動pullを試し、取得できなければ停止する。

マウントがない端末ではDriveコネクターを確認する。個別ファイルIDは `.claude/state/assets/drive-manifest.json` の `driveFileId` にある。取得後は上記ローカル検査を通す。

## 音声付き動画を生成する

Windows/MacのどちらでもVOICEVOXエンジンとffmpeg/ffprobeが必要。VOICEVOXを起動して以下を実行する。動画生成用のGitHub Actionsは現在ない。

```bash
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --skip-tts
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --speaker 13
node scripts/render-video-pack-shorts.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items
```

出力先は `.tmp/video-render/{packId}/`。最初の1パックで表紙・読み上げ・字幕・切り替わりを確認してから一括生成する。採用画像は表紙・冒頭に使い、説明画面は白と資格別のブランド色を軸にしたプレゼン形式へ統一する。大きな結論見出し、STEPラベル、淡い要点カードを使い、文字数・項目数に応じて文字サイズと配置を調整する。legacy総監カバーは動画パックの一括生成には混ぜない。

## 旧A案の検証記録（2026-09-09）

Mac実機で採用PNG346枚を復元し、全件のSHA-256一致を確認した。VOICEVOX 0.25.2・話者13で代表パックの通常動画とShortsを生成し、映像・字幕・音声ストリーム・音量、音声認識による台本の冒頭から末尾までの収録を確認した。人による試聴済みとは扱わない。通常動画の場面を音声実尺へ揃える修正を適用し、実ffmpegの時刻同期テストを通した。ユーザーの試聴指摘を受け「概要の要は」を「概要のかなめは」に読み替え、VOICEVOXの音素を確認した。字幕は漢字のまま保持する。全体の生成・保存とYouTube更新の進捗は [更新状態](../../../.claude/state/youtube-thumbnail-rollout.json) を参照する。

## 補助ZIP

[親フォルダー](https://drive.google.com/drive/folders/10qx4MeGVlRASn1DQjqa_GR4IyLkibONJ)の3つのZIPは控えとして残す。ZIPで復元する場合も画像だけを展開し、過去の同梱手順でGitの最新版を上書きしない。

```bash
for part in 1 2 3; do
  unzip -o "$HOME/Downloads/youtube-video-ready-20260909-part-${part}.zip" ".tmp/video-render/*" -d .
done
npm run check-youtube-cover-handoff -- --local
```

YouTubeへの公開・再投稿は別工程。サムネ更新前に新しい実体一覧と計画を確認する。採用PNGは `node scripts/stage-youtube-covers.mjs` で検査し、`--commit` でprivate R2へ一時転送する。CIの `thumbnail-refresh` は採用SHA一致を検査して復元する。更新結果の照合・記録取得後は同スクリプトの `--delete --commit` で転送用キーを削除する。更新処理は初回サムネ設定で変わる `hasCustomThumbnail` だけを許容し、タイトル・公開設定・予約などを保持する。

説明画面だけを更新する再生成は `--resume --refresh-png` を使う。音声は `tts-inputs.json` の読み替え後の入力・話者・WAVハッシュが一致するときだけ再利用し、読み修正や話者変更、旧キャッシュの来歴不明時は再合成する。

旧A案の適用手順：2026-09-09採用の橋＋ノートのロゴは、通常動画の表紙右上とShorts表紙の下部へ展開した。`config/video-brand.json` が共通ロゴ・背景・Shorts CTAを指定する。`node scripts/apply-video-brand.mjs --preview` で代表画像を確認し、`--commit` でローカルの全表紙と各パックのCTA入力を更新する。このコマンドはYouTubeへ書き込まない。原版を残してロゴを合成し、各動画の締め見出しと教材名はstoryboardから描画する。表紙はAPI上限の2MB以内に収める。

従来の `pop-v2` 組版によるPOP表紙の一括制作は `npm run youtube-covers -- --all`、ローカル採用は `--commit`。旧A案の一括処理はPOP表紙へ重ねて実行しない。画像一覧は `.tmp/youtube-covers/pop-all/index.html`。`brand-video-pack` も `pop-v2` の表紙は追加合成せず、採用PNGの画素を保持する。

ブランド共通の素材（ロゴ・通常動画の背景・Shorts の締め画像）は `.tmp/media/_brand/bridge-notebook-a/`（`config/video-brand.json` が指す）、各動画用の締め画像は各パックの `youtube.longform/cta.{sha8}.png`。これらもDrive vault（group content-media）から復元する。各 `cta-design.json` が締め画像の入力とSHA-256を持つ。確認版の「工事概要7項目」は採用時のCTA画像を保持する。動画パックのShortsは同じブランド意匠で「関連動画へ」と案内し、専用の音声と字幕を使う。Shorts生成前に通常動画を `--speaker 13 --resume --refresh-png` で生成し、話者をrender-manifestへ記録する。画像の全展開と動画本体・YouTubeの移行完了は別で、適用状況は更新状態の `preparation.ctaDesign` と `migration` で確認する。

## 全面POP画像の制作と復元

通常動画・Shorts共通の意匠とポーズは [/create-pop-image](../../../.claude/skills/social/create-pop-image/SKILL.md) と [承認見本](../../../.claude/knowledge/reference/pop-image-policy.md) を使う。見本の `pop-poster-v3` は全面画像生成版で、上記 `pop-v2` 一括コマンドでは再制作できない。

コピー・参照SHA・全文プロンプト・実寸・確認結果は `pop-image.json` の `revisions`、PNGは `.tmp/media/` に保存する。各 `output.path` を対象として保存とクラウド照合を行う（下記PATHは対象JSONの実値へ置換）。

```bash
node scripts/drive-vault-sync.mjs --path PATH --commit
node scripts/drive-vault-sync.mjs --path PATH --verify --deep --cloud --commit
node scripts/drive-vault-sync.mjs --path PATH --pull --commit
```

完全再現は復元PNGと `output.sha256` の一致で判断する。フォントや画像生成モデルの再実行には依存しない。内容変更は別の派生版として記録する。生成時の実寸が媒体寸法と異なる場合は、採用前に最終サイズと安全域を整え、最終PNGのSHAを記録する。

`revisions` への保存や意匠承認だけでは採用されない。媒体確認後の最終PNGを `cover-design.json` の採用入力へ接続し、素材・公開台帳は既存 `media` / `registry` 経由で更新してから `check-youtube-cover-handoff --local` を実行する。private R2の `stage-youtube-covers` が転送するのも、この採用入力に接続済みの画像だけ。制作途中の比較画像を転送・公開済みとは扱わない。
