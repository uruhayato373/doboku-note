# 採用カバーから動画を生成する

カバーの入力は各パックの `cover-design.json`。`approvedImage` がある場合、確認済みPNGをそのまま使う。
文字・ポーズとPNGのhashを照合するので、Mac側にポップ体フォントをインストールする必要はない。
PNGを失った場合、旧デザインへの自動フォールバックはしない。

## 端末の準備

Windows / Mac のどちらでも、Node依存関係・VOICEVOXエンジン・ffmpeg/ffprobeが必要。
`npm ci --legacy-peer-deps` を実行し、VOICEVOXを起動する。
現在、動画を生成するGitHub Actionsワークフローは無い。

採用画像ZIPをリポジトリ直下で展開し、`.tmp/video-render/youtube-covers-20260909/` を復元する。
Driveへ登録済みの場合は次でも復元できる。

```bash
node scripts/drive-vault-sync.mjs --pull --path .tmp/video-render/youtube-covers-20260909/
```

## 代表パックを先に確認する

```bash
# 表紙・本文・字幕の準備（音声環境なしでも実行可）
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --skip-tts

# 音声を含む通常動画。青山龍星（speaker 13）を明示する
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --speaker 13

# 通常動画の音声生成後にShortsを生成する
node scripts/render-video-pack-shorts.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items
```

出力先は `.tmp/video-render/{packId}/`。先頭カバーが採用PNGと同じか、音声と字幕、文字と人物の重なりを動画で確認する。
採用した画像は表紙・冒頭用。本文スライド全体を白＋青へ変更したことは意味しない。
legacy総監カバーはサムネ更新用として保全し、上記動画パックの一括生成には混ぜない。

## 公開への引き継ぎ

公開済み動画はサムネ変更と動画本体の再投稿を分ける。新しい画像承認は再投稿・予約変更の指示ではない。
更新前に新しい実体一覧・画像計画を作り、既存のサムネ更新保護処理を確認する。
PNGの生成・動画の生成・YouTubeへの反映はそれぞれ別の状態として扱う。
