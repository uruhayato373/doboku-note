# SNS バイナリ アーカイブ運用（R2 + GDrive ハイブリッド）

`content/sns/` 配下の SNS 制作物のうち「再生成可能だが手元に置くと容量を圧迫する」バイナリ（reels の wav・video.mp4 等）を、git に溜め込まず R2 へ退避するための運用方針。2026-06-18 制定。

## なぜ必要か

`content/sns/` は一時 1.22 GB / 6,646 ファイルまで肥大し、その大半が再生成可能なバイナリだった。`.gitignore`（135-149 行）は wav/mp4 を「再生成可能なビルド成果物」として既に除外宣言していたが、ルール追加前に commit された 844 件（732 MB）が追跡され続けていた（untrack 漏れ）。これを `git rm --cached` で外し（commit `16d779a0d`）、以後はこの方針で運用する。

## 1 パックの SoT と生成物の切り分け

| ファイル | 種別 | 置き場 |
|---|---|---|
| `slide-data.json` / `*caption.txt` / `reels/script.txt` / `status.json` | **SoT（消えたら困る）** | git 追跡 |
| `carousel/img/*.png` / `stories/img/*.png`（成果物スライド） | 投稿そのもの。1 枚は小さいが 1,990 件で 234.4 MiB | **git 非追跡 → R2 退避**（2026-08-21〜・DN-0111 Phase 4-E） |
| `reels/wav/*.wav` | TTS で再生成可能・重い | **git 非追跡 → R2 退避** |
| `reels/video.mp4` / `concat.txt` / `_empty.ass` 等 | wav+png から再生成可能 | **git 非追跡 → R2 退避** |

> [!important] 真実源は slide-data.json
> 1 パックの「消えたら困る本体」は約 20KB のテキスト（slide-data.json + script/caption + status.json）だけ。wav/mp4/png は全て再生成できる。退避で wav/mp4 を消しても、最悪 JIT 再生成で復元できる。
>
> **carousel/stories の PNG は 2026-08-21 に R2 退避へ移した**（DN-0111 Phase 4-E・1,990 件 234.4 MiB）。
> 投稿済み 7 件は公開バケット、それ以外は archive。退避・復元は共通基盤（[asset-storage-policy.md](asset-storage-policy.md)）で、
> `upload-sns-r2` が扱う wav/mp4 とは別経路。**reels/ 配下はこの共通基盤の対象外**——
> 両方の regime で同じファイルを見ると片方が「未退避」と誤検出するため、group の regex から除外してある。
>
> 旧運用（2026-06-09）は wav を「コミットする SoT」としていたが、2026-06-18 に wav も R2 退避へ統一した（git 肥大 596MB が大きく、gitignore と矛盾していたため）。経緯は `skills-registry.md` の 2026-06-18 エントリ。

> [!warning] wav は JIT 動画の入力でもある
> `reels/wav` は `publish-reel-jit.mjs` / `per-problem-shorts.mjs` の**入力素材**（解答/CTA ナレ）。R2 退避してローカル削除すると、その pack の動画 JIT 生成・流用は wav を **R2 から取得するか VOICEVOX で再生成**（script.txt から）してからになる。よって**まだ全リール（フル + reels-pp 各問）を投稿し切っていない pack は `--purge-local` しない**。`sns-archive-auditor` の「迷ったら KEEP/BLOCK」と `--posted-only` がこの早すぎる削除を防ぐ。

## 3 層モデル

1. **git に残す（極小）** — SoT テキスト（slide-data.json / script / caption / status）と図版 SVG。
2. **ローカル作業セット** — 制作中パックの wav/mp4 のみ手元生成・プレビュー。
3. **アーカイブ** — 投稿済み・旧パックの重いバイナリを R2 へ退避し、ローカル削除。

## バックエンドの役割分担（ハイブリッド）

| バックエンド | 役割 | 理由 |
|---|---|---|
| **Cloudflare R2**（主軸） | wav/mp4 の機械的退避・JIT 再取得元 | 既存配線（`storage.doboku-note.com`・wrangler・S3 API）。CI/headless で creds 供給可。`rclone mount` で容量を食わずにブラウズ可能 |
| **Google Drive**（補助） | 人間が見返す・共有する完成 mp4/カルーセルの置き場 | Drive UI の一覧性。ただし大容量 binary は Drive デスクトップアプリで同期し、MCP は read/search 用途に限る |

> [!warning] GDrive MCP に大容量 binary を通さない
> このリポジトリの Google Drive MCP は対話認証式で、headless/cron・会社 PC プロキシ環境では不在になりやすい（measurement-incidents.md 2026-06-05）。数百 MB の wav/mp4 を MCP の `create_file` で送るのは非現実的。バルク退避は必ず R2（下記スクリプト）で行い、GDrive は完成物の人手キュレーションに留める。

## 退避スクリプト `npm run upload-sns-r2`

`.claude/scripts/upload-sns-r2.mjs`。`upload-images-to-r2.mjs` を踏襲し、R2 の `sns/` prefix へアップロードする。

```bash
npm run upload-sns-r2 -- --dry-run                          # 対象プレビュー（creds 不要）
npm run upload-sns-r2 -- --skip-existing                    # R2 に同サイズ既存ならスキップ
npm run upload-sns-r2 -- --prefix instagram/cem/exam-packs/r07
npm run upload-sns-r2 -- --ext wav,mp4,m4a                  # 対象拡張子を上書き（既定 wav,mp4）
npm run upload-sns-r2 -- --posted-only                      # status.json が投稿済みの pack のみ
npm run upload-sns-r2 -- --posted-only --purge-local --skip-existing   # 投稿済みを退避（R2 検証後にローカル削除）
```

> [!important] 安全不変条件
> `--purge-local` は「R2 に同一バイト数で存在することを HeadObject で再確認できた後」にのみローカルを削除する。確認できなければ削除せず保持し、`failed` として非ゼロ終了する。データ消失は構造的に起きない。

> [!warning] --posted-only は status.json 更新が前提
> 投稿済み判定は各パックの `status.json` のチャネルに `posted_at`（truthy）または `status: "posted"` があるかで行う。投稿後に status.json を更新していないと 0 件になる（2026-06-18 時点では全パックが `scheduled`/`posted_at: null` のため `--posted-only` は 0 件）。投稿フローで status.json を更新するか、`--prefix` で年度・資格を指定して旧パックを退避する。

## 分業（sns-archive-auditor エージェント）

「どのパックを削除して安全か」という**機械では測れない判断**は `sns-archive-auditor`（Evaluator・audit-only）に委ね、実行は親＋スクリプトが担う。

- **親（実行）**: `npm run upload-sns-r2 -- --dry-run` で候補リストを取得し、各パックの `status.json`・git 追跡状態・更新日時をエージェントへ渡す。判定後、推奨された `upload-sns-r2` コマンドを実行する。
- **エージェント（判定）**: 渡されたパックの `slide-data.json`/`script.txt`/`caption.txt` を Read し、**SoT が無傷で再生成可能か**を検証。`OFFLOAD`（退避可）/`ARCHIVE_KEEP`（R2 バックアップのみ）/`KEEP_LOCAL`（制作中）/`BLOCK`（SoT 欠落＝purge 禁止）に分類して返す。「迷ったら KEEP/BLOCK」で不可逆な削除を構造的に防ぐ。

二重の安全網: スクリプトが「R2 にバイト一致で存在するまで削除しない」を守り、エージェントが「そもそも再生成できるか」を守る。

## R2 上のブラウズ（容量を食わずに確認）

`rclone mount` で R2 を Finder からブラウズできる仮想フォルダにできる。退避済みパックを開いた時だけストリーム取得するため、ローカルディスクを消費しない。設定は別途 `rclone config`（R2 を S3 互換で登録）。

## 関連

- `.gitignore` 135-149 行 — wav/mp4/中間ファイルの除外ルール（このポリシーの機械的裏付け）
- [content-authoring.md](content-authoring.md) — 画像配信（R2 `storage.doboku-note.com`）の本線
- [measurement-incidents.md](measurement-incidents.md) — 外部 API は CI 供給が正・会社 PC プロキシ遮断の恒久ルール
