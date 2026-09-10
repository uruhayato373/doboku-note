# ローカル容量・メモリ運用

設定の真実源は `.claude/config/local-resources.json`。保存先は [asset-storage-policy.md](asset-storage-policy.md) に従う。

## 実行と記録

| コマンド | 動作 |
|---|---|
| `npm run resources:check` | 起動前の空き容量・空きメモリ確認。全走査しない。警告は起動を止めない |
| `npm run resources:audit` | 指定領域の容量・ファイル数・LFS・前回比・プロセス集計。リンクは辿らない |
| `npm run resources:clean -- --category scratch` | 明示した `.tmp/scratch` の掃除候補。既定dry-run |
| `npm run resources:clean -- --category build` | `.next`・`out`・管理画面 `.next` の掃除候補 |
| `npm run resources:clean -- --category browser-cache` | 認証プロファイル内の指定キャッシュのみ。ブラウザー稼働中は保留 |
| `npm run resources:cloud` | R2・Driveの各最大3件をストリーミング読み戻し。1件50MiB上限、SHA-256/bytes照合 |
| `npm run resources:run -- -- node <script>` | 重い作業の排他と開始前の空き容量・メモリゲート |

`resources:audit` は `.local/resource-audit/latest.json` と最大12回の `history.json` を更新する。クラウド検査は `cloud-latest.json` の1件だけを保持。すべて端末固有・Git非追跡で、プロセスのコマンドライン・Cookie・署名URLは保存しない。ワーキングセットには共有ページが含まれるため専有メモリとは扱わない。

起動前チェックは Claude SessionStart と dev/admin 前処理。週次・月次はCodexのこの端末の定期実行から呼ぶ。PC停止中の定刻実行は保証しない。別端末にも同じCLIを使えるが、定期実行は端末ごとに登録する。

## 掃除条件

`--commit` で初めて削除する。scratchは7日、build/browser-cacheは14日経過が既定。`--include-recent` は日数だけを解除し、使用中・追跡中・アセット登録済み・リンク・欠測の保護は解除しない。削除直前に再走査して変更があれば停止。再帰削除せず確認済みファイルだけを除去し、空フォルダーは残してよい。

`.tmp`全域の経過日数削除は禁止。`scripts/prune-tmp.mjs` はscratch限定のdry-run互換入口。破棄可能な新規作業出力だけを `.tmp/scratch/` に作り、原本・採用画像・引き継ぎ成果物・確認記録を混ぜない。動画・転送ZIP・読み戻しコピーは保存/引き継ぎ検証を経て個別に整理する。

認証プロファイル本体、Cookies、Local Storage、IndexedDB、Service Workerは自動削除しない。MCP重複は起動中セッション数と親PIDを確認し、プロセス名だけで終了しない。このプロジェクトのCodex設定ではfilesystem/GitHub MCPを無効化し、既存のファイルツールと `gh` を使う（反映は次のセッション）。

## 重い処理

本番buildと通常動画（承認済み一括を含む）・Shorts・Instagram Reelsのレンダーは共通の排他を使う。Reels内部の既定並列数は1（明示指定時だけ増やす）。空きディスク20GiB・メモリ3GiB未満で開始しない。メモリだけは明示的な `--allow-low-memory` で解除可能。CIは端末用の空き容量閾値を適用しない。直接CLIを実行した処理や外部アプリ全体はこの排他では制御できない。キャッシュを毎回消すと再ビルド負荷が増えるため、週次は期限切れだけを対象にする。

## クラウドと復元

R2復元は `--path` / `--group` を必須とし、既定512MiB/回の上限と空き容量を確認。必要な範囲だけ戻す。SHA-256計算は固定長バッファ、ダウンロードはストリームで扱う。復元先を検証後に同一キャッシュを除去し、オフライン用に二重保管したい作業だけ `--keep-cache` を使う。上限変更は `--max-mib`。

Driveは既存vaultを使い、全体ミラーを新設しない。月次はrclone経路でファイルを保存せず読み戻す。接続/認証が無い、対象0件、ハッシュ不一致は検査不成立（exit 2）。マウントが無くてもコネクターを確認できるが、コネクターのメタデータ確認と全バイト復元検証は別に記録する。月次サンプル一致は、全アセットの削除許可にはならない。

Git LFSは `git lfs prune --dry-run` で候補を確認し、削除時は `git -c lfs.pruneverifyunreachablealways=true lfs prune --verify-remote --when-unverified=halt` で参照外も含めてリモート検証を必須とする。候補がリモートに無ければ削除しない。通常Git履歴の書換え・クラウド原本の削除はこの自動掃除に含めない。YouTube転送領域は現在CIが読むのでprivate R2を維持し、公開キュー・復元の読み手が無くなってからライフサイクルを見直す。

## 検査

`npm run test:resources` はリンク逸脱・使用中・欠測・破損ダウンロード拒否を検査し、quality:auditのCIゲートにも接続する。定期実行は変化なしなら通知せず、閾値超過・急増・検査失敗・掃除完了で通知する。ローカル欠測をCIのクリーン環境の正常値で代用しない。
