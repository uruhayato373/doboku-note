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

全場面の差し替えレシピがあるShortsは、下記テンプレート生成を使わず「全場面差し替え版の完全復元」へ進む。`--force` / `--preview-only` でも旧本文・締め画像への逆戻りは許可しない。

Windows/MacのどちらでもVOICEVOXエンジンとffmpeg/ffprobeが必要。メモリの少ない端末ではエンジンを `--cpu_num_threads 1` で起動し、パックを順に生成する。VOICEVOXを起動して以下を実行する。動画生成用のGitHub Actionsは現在ない。

```bash
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --skip-tts
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --speaker 13
node scripts/render-video-pack-shorts.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items
```

出力先は `.tmp/video-render/{packId}/`。最初の1パックで表紙・読み上げ・字幕・切り替わりを確認してから一括生成する。採用画像は表紙・冒頭に使う。本文までPOP制作する指定がある場合は、[本文POPの制作契約](../../../.claude/knowledge/reference/video-content-policy.md) の `imageDesign` で全場面の生成画像を接続する。指定がない既存パックの説明画面は白と資格別のブランド色を軸にしたプレゼン形式を使う。大きな結論見出し、STEPラベル、淡い要点カードを使い、文字数・項目数に応じて文字サイズと配置を調整する。legacy総監カバーは動画パックの一括生成には混ぜない。

## 図解を使った場面画像の確認

通常動画の `visual.art` は、章扉・対応図・比較・手順・記入例・サイト図解を再構成した画像を指定する。総まとめは生成済みstoryboardを直接直さず、`compilation.json.visuals[sceneId]` を更新して `build-video-compilation` を実行する。語り・字幕・尺は変わらない。図解の `art.source` には参照元SVGの実在パスを記録する。

音声を後工程にする場合は `render-longform --skip-tts --resume --refresh-png` で画像を生成し、全場面のスクリーンショットを確認する。`media promote --pub <公開ID> --commit` は画像のみのrender-manifestから表紙と場面画像を取り込み、既存動画・字幕を保持する。その後 `media sync --work <資格>/<作品> --commit` と `media verify --work <資格>/<作品>` を通し、管理画面の作品詳細で採用画像を確認する。画像確認済みと完成動画の確認済みは分けて記録する。

## 完成動画と現行入力の一致

音声付きレンダーは台本・採用画像指定、各場面の画像・音声入力・WAV、字幕、完成MP4のSHAをrender-manifestに保存する。`media promote`は全場面を再照合し、旧台本・旧字幕や制作記録のないMP4を完成品として取り込まない。既存の旧レンダーは、現行レンダラーで音声付き再生成する。

```bash
npm run media -- verify-render --work civil-construction-2/matome-2kyu-chokuzen
```

合格は対象場面数が正で、現行台本から再構築した字幕、音声入力・WAV、PNG、MP4が全件一致すること。画像のみの設計版は従来どおり別工程であり、完成動画の一致確認にはならない。新経路で取り込んだ動画は台本hashも素材台帳へ残し、`check-content-registry`のR12が後日の台本更新による陳腐化を止める。公開・予約の追加承認は含まない。

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

従来の `pop-v2` 組版によるPOP表紙の一括制作は `npm run youtube-covers -- --all`、ローカル採用は `--commit`。旧A案の一括処理はPOP表紙へ重ねて実行しない。画像一覧は `.tmp/youtube-covers/pop-all/index.html`。`brand-video-pack` も `pop-v2` / `pop-poster-v3` の表紙は追加合成せず、採用PNGの画素を保持する。

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

`revisions` への保存や意匠承認だけでは採用されない。表紙の最終PNGを媒体確認後に `cover-design.json` の採用入力へ接続（pop-poster-v3 は採用PNG必須。欠落時は停止し、テンプレートへ戻さない）し、素材・公開台帳は既存 `media` / `registry` 経由で更新してから `check-youtube-cover-handoff --local` を実行する。private R2の `stage-youtube-covers` が転送するのも、この採用入力に接続済みの画像だけ。制作途中の比較画像を転送・公開済みとは扱わない。これらの採用検査・転送は表紙用。通常動画の本文・締めは `storyboard.imageDesign` と `pop-image.json.activeBodyRevision` で採用版を指定する（[本文POPの制作契約](../../../.claude/knowledge/reference/video-content-policy.md)）。

本文POPの原本・修正版・採用PNGは `.tmp/media/{exam}/{pack}/work/{role}.{sha8}.png` に揃え、`content-media` として保存する。別端末では `node scripts/drive-vault-sync.mjs --pull --path .tmp/media/{exam}/{pack}/work/ --commit` で復元してから通常動画を再生成する。本文画像の自動pullは行わず、不足時は停止する。画像の再生成は同じ画素を保証しないため、再現には保存済みPNGを使う。

## 全場面差し替え版の完全復元

`pop-image.json` の `revisions.*.publications[].reproduction` は全場面の採用PNG、表示時刻、元動画、元ASS、確認済み完成MP4のSHAを持つレシピを指す。現在の `youtube.json` の動画SHAに一致するレシピだけを選び、次のコマンドで検査・復元する。例は2級土木の土工Shorts2本。

```bash
npm run youtube-shorts:restore -- --pack-dir content/sns/video-packs/civil-construction-2/gakka-2kyu-doko
npm run youtube-shorts:restore -- --pack-dir content/sns/video-packs/civil-construction-2/gakka-2kyu-doko --restore
```

`--key point-block1-2` 等で1本に限定できる。既定は読み取り検査、`--restore` は欠落ファイルだけをDriveから取り戻す。既存ファイルのSHA不一致は上書きせず停止する。合格条件は対象数が正で、全素材・レシピ・完成MP4のSHA、PNG 1080×1920、全場面の連続した尺が一致すること。動画・画像の採用先や外部投稿は変更しない。

この完全復元はTTS・画像生成・エンコードを実行せず、確認済みの動画・音声・字幕をバイト単位で戻す。新しい画像や尺で再編集するときは新レシピと新しいQAが必要。汎用のレシピ再エンコード機能は未実装であり、一時制作スクリプトを復元手順として使わない。同じ生成プロンプトや別端末のエンコーダーから同じ画素・MP4バイト列が出るとは保証しない。

構図の合否はSHA検査の対象外。全場面の原画像と字幕入り完成フレームを原寸・360pxで見て、背景が四辺まで続くこと、左上への縮小配置・巨大な無地余白・文字と字幕の重なりがないことを画像／動画SHAに結び付けて記録する。実際のShorts操作UIは別に確認し、未確認ならその状態を残す。

### 公開・予約済み動画の修正版

公開状態と、制作中の修正版を分ける。音声付き再生成と `npm run media -- verify-render --work <exam>/<work>` の成功後、`npm run media -- promote --pub <公開ID> --candidate --commit` で作品用素材 `work/candidate-*` として保存する。既存の公開行・予約日時・外部ID・承認・公開素材の参照は更新しない。管理画面の作品詳細では「改訂版（YouTube未反映）」に表示する。通常の promote は公開行の素材を置き換えるので、予約・公開済み修正には使わない。

上記の `verify-render` は通常動画用。Shorts候補は `pop-image.json.candidateShortsRevision` の改訂から、対象 `publicationId` に一致する記録1件を `promote --candidate` が選ぶ。`verifyImageReproduction` で全画像・完成MP4・再現レシピ・字幕のSHA、寸法、場面の連続性と尺を照合してから、`candidate-point-…-video` 等のvariant別素材として保存する。公開行は更新しない。改行を直した新ASSは任意の `recipe.subtitles` に保存し、`originalSubtitles` も保持する。完成動画の図解・字幕・音声の確認は別に記録する。

図解の指示には場面全体と前後で共通の事例を渡す。表の先頭行だけを抜き出して、要約に必要な「対応」「結果」等を落とさない。紙・車体・計器の不要な細字や数字は無地にする。字幕安全域は生成時の構図で確保し、原本全体を動画寸法へ正規化する。図解主体は `full-frame-v1` の原本SHA・実画素照合を通し、後付け縮小・余白を加えない。切り抜き・文字の消去で修正せず、図の対応、原寸と360px、字幕入り動画をそれぞれ確認する。

入力照合の原本は `.tmp/video-render/<work>/` のmanifest・WAV・PNG・ASSである。完成後は既存保管先へ `node scripts/drive-vault-sync.mjs --group video-render-artifact --path .tmp/video-render/<work>/ --commit` で保存し、同じ指定に `--verify --cloud` を付けて確認する。再検証で原本が無い場合は同じgroup/pathの `--pull --commit` で復元する。`media pull` は採用素材だけの復元なので区別する。
