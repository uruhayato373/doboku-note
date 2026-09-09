# 採用カバーから動画を生成する

採用画像346枚はGoogle Driveに個別PNGとして保存し、全バイト読み戻しのSHA-256照合とDrive台帳への登録を完了した。確認済みPNGをそのまま使うため、Macに制作時のポップ体フォントは不要。

[採用画像フォルダー](https://drive.google.com/drive/folders/1wP21EWW4E4CPMZpLXk_j5nVMgbVW2YQ-)

## Macで素材を復元する

Gitの作業ブランチ `codex/character-framing` を最新にし、依存関係を `npm ci --legacy-peer-deps` で用意する。Google Driveアプリでdoboku-noteのvaultを同期してから、リポジトリ直下で実行する。

```bash
npm run drive-vault-sync -- --pull --group youtube-approved-cover
npm run check-youtube-cover-handoff -- --local
```

Drive上の場所は `制作物/動画レンダー/採用カバー/youtube-covers-20260909/`。復元先は `.tmp/video-render/youtube-covers-20260909/`。台帳が欠けた画像やハッシュが違う画像は正常扱いにしない。動画生成時にも欠けた採用PNGはDriveから自動pullを試し、取得できなければ停止する。

マウントがない端末ではDriveコネクターを確認する。個別ファイルIDは `.claude/state/assets/drive-manifest.json` の `driveFileId` にある。取得後は上記ローカル検査を通す。

## 音声付き動画を生成する

Windows/MacのどちらでもVOICEVOXエンジンとffmpeg/ffprobeが必要。VOICEVOXを起動して以下を実行する。動画生成用のGitHub Actionsは現在ない。

```bash
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --skip-tts
node scripts/render-longform.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items --speaker 13
node scripts/render-video-pack-shorts.mjs --pack-dir content/sns/video-packs/civil-construction-1/koji-gaiyo-7items
```

出力先は `.tmp/video-render/{packId}/`。最初の1パックで表紙・読み上げ・字幕・切り替わりを確認してから一括生成する。採用画像は表紙・冒頭用で、本文スライドの意匠変更は含まない。legacy総監カバーは動画パックの一括生成には混ぜない。

## 今回の検証範囲

Driveの個別PNG346枚を読み戻し、元画像とのSHA-256一致を確認。読み戻した実データを使って、空の独立した復元先に既存pull処理で346枚を復元し、再度全件SHA-256一致を確認した。保存先解決はWindows/Macの模擬テストを実施。Mac実機と音声付きmp4の生成は未実施。

## 補助ZIP

[親フォルダー](https://drive.google.com/drive/folders/10qx4MeGVlRASn1DQjqa_GR4IyLkibONJ)の3つのZIPは控えとして残す。ZIPで復元する場合も画像だけを展開し、過去の同梱手順でGitの最新版を上書きしない。

```bash
for part in 1 2 3; do
  unzip -o "$HOME/Downloads/youtube-video-ready-20260909-part-${part}.zip" ".tmp/video-render/*" -d .
done
npm run check-youtube-cover-handoff -- --local
```

YouTubeへの公開・再投稿は別工程。サムネ更新前に新しい実体一覧と計画を確認する。採用PNGは `node scripts/stage-youtube-covers.mjs` で検査し、`--commit` でprivate R2へ一時転送する。CIの `thumbnail-refresh` は採用SHA一致を検査して復元する。更新結果の照合・記録取得後は同スクリプトの `--delete --commit` で転送用キーを削除する。更新処理は初回サムネ設定で変わる `hasCustomThumbnail` だけを許容し、タイトル・公開設定・予約などを保持する。
