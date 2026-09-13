# ローカルディスクの衛生（Claude Code / Codex 共通）

このリポジトリの作業は **Git にも R2 にも Drive にも乗らない場所**に容量を溜める。
gitignore 済み・ホーム配下・worktree の中に溜まるので、CI にも pre-commit にも映らない。
2026-09-10 に空きが 7.5GB（228GB 中 96%）まで落ちて初めて気づいた。ここはその再発防止の運用 SSOT。

真実源: 機械可読は [`.claude/config/disk-hygiene.json`](../../config/disk-hygiene.json)、
判定ロジックは `scripts/lib/disk-hygiene.mjs`、検査は `npm run check-disk-hygiene`、
掃除は `npm run disk-hygiene:fix`（日次 launchd）。

## 1. 何が溜まるか（2026-09-10 の実測）

| 生成元 | 実測 | 誰が作るか | 分類 |
|---|---|---|---|
| worktree（node_modules + `.next` + `out`） | 1 本 4〜5GB | Codex・Claude 両方 | 再生成可 |
| Claude Workflow の子エージェント記録 | OCR 1 セッションで 3.1GB | Claude Code | 再生成可 |
| `.next` + `out` | 3GB | 両方 | 再生成可 |
| 経路D の原寸画像複製 `.tmp/ocr/<本>/src` | 1〜2GB/冊 | 両方 | 再生成可 |
| Playwright の Chromium ディスクキャッシュ | 0.8〜4.5GB | 両方 | 再生成可 |
| npm キャッシュ（`_cacache` + `_npx`） | 9.4GB | 両方 | 再生成可 |
| Codex 自動更新の残骸（Sparkle） | 10 日で 4.6GB | ChatGPT アプリ | 再生成可 |
| Codex の会話履歴・生成画像 | 12GB | Codex | **履歴＝報告のみ** |

Workflow 記録が大きいのは、エージェントが読んだページ画像が transcript に丸ごと残るため。
Sparkle と stats47 の Turbo キャッシュは**生成元を止められない**ので、日次で有界に保つだけ。

## 2. 3 層の構え

| 層 | 何をするか | 実体 |
|---|---|---|
| 生成元を止める | worktree の置き場ルール・`register.sh` の後始末・会話ログの保持期間 | CLAUDE.md §10、`book_ocr_concat.py`、`~/.claude/settings.json` |
| 自動掃除 | 日次 04:17 に再生成可能なものだけ削除 | launchd `com.doboku-note.disk-hygiene` → `scripts/scheduled/disk-hygiene.sh` |
| surfacer | 残っている滞留物と**掃除が止まっていること**を出す | `npm run check-disk-hygiene`、両ツールの Stop フック、Claude の SessionStart |

**ツールに依存しない面が要る**のが設計の要。掃除を Claude の SessionStart に載せると、
Codex で作業した分は永久に掃除されない（実測で Codex の worktree が 8.6GB 溜まっていた）。

## 3. worktree の置き場と後始末

- 置き場は **`.claude/worktrees/`（Claude）と `~/.codex/worktrees/`（Codex）だけ**。
- **`.tmp/` に置かない**。`scripts/prune-tmp.mjs` が 3 日超のファイルを消すので、worktree の中身が削られる。
  （prune-tmp は `.git` を持つディレクトリを丸ごと飛ばすので実害は止めてあるが、置き場違反は検査が FAIL にする）
- マージしたら `git worktree remove <path>` を即実行する。ブランチは残るので履歴は失われない。
- worktree の中で `npm run build` しない。E2E に要るときだけビルドし、終わったら消す。
- 長期に残したい worktree は `git worktree lock <path>`。自動掃除の対象から外れる。

## 4. `--fix` が消すものとガード

削除は **5 重ガード**で、材料が取れなければ必ず残す（「迷ったら残す」）。

| id | 消すもの | ガード（全部満たすときだけ削除） |
|---|---|---|
| `worktrees` | マージ済み worktree | merged／作業ツリーが clean／未 lock／24 時間以上静止／その配下を cwd にしているプロセスが無い。`git worktree remove` は **`--force` を使わない**（untracked が残っていれば git が拒否する＝最後の砦） |
| `build-artifacts` | 7 日超の `.next` / `out` | そのパスを cwd にした `next build/dev/start`・`npm run serve` が動いていない |
| `tmp-scratch` | `.tmp/` の 3 日超 | `.git` を持つディレクトリは丸ごと除外 |
| `playwright-cache` | Chromium のディスクキャッシュ | そのプロファイルを使うブラウザが起動していない。**ログイン実体は `~/Library/Application Support/doboku-note/playwright-auth/` にあり触らない**（Cookies・Login Data・Local Storage は別ディレクトリ） |
| `sparkle-updates` | Codex 自動更新の残骸 | コマンドラインに現れているサブディレクトリは除外 |
| `npm-cache` | `_cacache`（3GB 超のとき） | `npm install` / `npm ci` が動いていない（常駐の `npm exec` は除外する。さもないと永久に掃除できない） |
| `npx-cache` | 30 日超の `_npx/<id>` | 稼働中プロセスが参照していない |
| `claude-workflow-transcripts` | 14 日超の Workflow 記録 | — |

**プロセス名だけで判定しない。** 2026-09-10 の実装時、`next dev`（別リポジトリ）・常駐の Sparkle ヘルパ・
常駐 MCP の `npm exec` が「稼働中」と読まれ、3 つのガードが恒久的に掃除を止めていた。
pid で ps のフルコマンドと lsof の cwd を突き合わせ、「そのパスで動いているか」を見る。

## 5. 消さないもの（報告のみ）

Codex の会話履歴・アーカイブ・生成画像、Claude の `.jsonl`、stats47 のキャッシュ。
`reportOnly` に並べてあり、容量だけを表に出す。棚卸しは人が判断する。
Drive vault と R2 は「台帳で管理する制作物・原本」の置き場なので、**会話履歴やキャッシュを入れない**
（`check-drive-vault` の整合が崩れる）。置き場の判断は [asset-storage-policy.md](asset-storage-policy.md) §1。

## 6. 導入・確認・解除

```bash
npm run disk-hygiene:install                # launchd へ登録（毎日 04:17）
npm run disk-hygiene:install -- --status    # 登録状況
npm run disk-hygiene:install -- --run-now   # 今すぐ 1 回
npm run disk-hygiene:install -- --uninstall # 解除
npm run check-disk-hygiene                  # いまの状態（表・exit 0/1/2）
node scripts/disk-hygiene.mjs --dry-run     # 何を消すかとガード理由（削除しない）
```

ログは `~/Library/Logs/doboku-note/disk-hygiene.log`。完走したときだけ
`disk-hygiene.last-ok` を更新し、検査はその鮮度で「掃除が止まっている」を検知する。
**止まったことを検知できないと、また静かに溜まる。**

会話ログの保持期間だけはリポジトリ外の設定なので手で入れる。検査は未設定・超過を FAIL にする。

```json
// ~/.claude/settings.json
{ "cleanupPeriodDays": 7 }
```

## 7. ⚠ が出たときの対処

| 出力 | 対処 |
|---|---|
| `空きが N しかない` | `npm run disk-hygiene:fix` → まだ足りなければ `npm run check-disk-hygiene` の履歴行（Codex 会話・生成画像）を棚卸し |
| `マージ済みで残っている worktree N 本` | `git worktree remove <path>`（日次掃除でも回収されるが、ビルド成果物が数 GB あるので早い方がよい） |
| `worktree の置き場違反` | `git worktree move <path> ~/.codex/worktrees/<name>`。作業中なら移動、済んでいれば remove |
| `日次掃除が N 日止まっている` | `npm run disk-hygiene:install -- --status` → 未登録なら再インストール、失敗ならログを見る |
| `cleanupPeriodDays が未設定` | 上の 6 節のとおり `~/.claude/settings.json` に入れる |

## 8. 非 macOS

launchd も `~/Library` も無いので、macOS 専用の項目は「未検査」と明示して **exit 2＝検査不成立**にする
（緑にしない）。会社 PC で `npm run check-disk-hygiene` が exit 2 を返すのは正常。
`quality:audit` の登録も `process.platform === 'darwin'` 以外は skip 理由付きで飛ばす。

関連: [asset-storage-policy.md](asset-storage-policy.md)（置き場のルーティング） /
[information-architecture.md](information-architecture.md)（情報の置き場） /
`scripts/prune-tmp.mjs`（`.tmp` の掃除本体）
