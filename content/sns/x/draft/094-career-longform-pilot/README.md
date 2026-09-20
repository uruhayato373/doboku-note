# X Article 転職導線パイロット

X の長文を収益の入口にし、アフィリエイトリンクは直接貼らず、doboku-note のキャリア記事へ送る4週間の試行です。

導線は `Xの告知短文 → X Article → サイトのキャリア記事 → サイト内の転職CTA` とします。X Article は公式にネイティブ予約できないため、保存済み下書きを1回限りのCodexローカル自動化で公開し、公開URL確定後に翌朝の告知短文を既存の `publish-x` で予約します。

## 予約枠

| 回 | X Article（1回限り自動化） | 翌朝の告知（publish-x） | テーマ |
|---|---|---|---|
| 1 | 2026-09-22 20:20（初回 09-06 19:50 は逸失） | 2026-09-23 07:40 | 施工管理を辞めたい理由の切り分け |
| 2 | 公開済み 2026-09-20 08:54（手動復旧・09-13/09-16 の枠は逸失） | 枠未定（DN-0257） | 1級土木の市場価値 |
| 3 | 2026-09-20 19:35 | 2026-09-21 07:15 | 現場以外も含むキャリアパス |
| 4 | 2026-09-27 20:15 | 2026-09-28 07:50 | 2級・若手のキャリア設計 |

> [!warning] 夜枠は Mac が起きていないと出ない（2026-09-20）
> Codex のローカル自動化は Mac がスリープ中は発火せず、起床時（05:30 前後）にまとめて遅延実行される。09-06・09-13・09-16 の 3 回とも翌朝 04:50〜05:30 に走り、`x-article:publish` の公開窓（15 分前〜120 分後）を外れて exit 1 で停止した（`~/.codex/automations/x-article-*/memory.md`）。`automation.toml` の rrule を直接書き換えても Codex アプリは新時刻で発火しなかった（09-20 09:20 に実測・Mac 稼働中）ので、時刻を変えるときは **ChatGPT アプリの Automations 画面と `article-drafts.json` / `status.json` を同時に**直す。当面は各予定時刻の 15 分前〜2 時間後に Mac を起こしておく。

既存の9月計画から同じ8枠を差し替えているため、1日3件上限は増えません。

Codexのローカル自動化IDは `x-article-1`〜`x-article-4` です。すべて `ACTIVE`、各1回だけ実行し、`/Users/minamidaisuke/doboku-note` を対象にします。

## Article公開から告知予約まで

4本のX下書きIDと公開予定は `article-drafts.json` が管理します。公開前に台帳と原稿を検査します。

```bash
npm run x-article:publish -- --check
npm run x-article:publish -- --article 1 --dry-run
```

本番時刻には1回限りのローカル自動化が次を実行します。

1. `x-article:publish -- --article N --publish` でアカウント、タイトル、本文、時刻窓を再検証する。
2. Xの公開確認モーダルを経てArticleを公開し、公開URLを確認する。
3. 公開URLを `status.json` と月次計画へ記録し、対応する告知短文だけを `tweets.md` に解放する。
4. 文字数、URL、全予約の衝突を検査する。

```bash
node scripts/check-x-length.mjs --draft 094
node scripts/check-sns-urls.mjs
npm run x-schedule-guard
```

5. 告知短文だけを dry-run する。Article 1〜4に対応する Tweet 番号は 2、4、6、8。

```bash
npx tsx .claude/skills/social/publish-x/publish-x.ts 094 --tweet 2 2026-09-07T07:20 --dry-run
```

6. dry-run のログで予約モードを確認後、X実キューとの二重検査を通して本番予約する。

```bash
npm run x-schedule-guard -- --queue
npx tsx .claude/skills/social/publish-x/publish-x.ts 094 --tweet 2 2026-09-07T07:20
npm run x-sync-status
```

`x-sync-status` で告知が `queued` に昇格し、X実キューにも存在することを確認して完了です。

## 安全弁

- `tweets.md` は Article URL を登録するまで生成されない。URL未確定の告知を誤投稿できない。
- `manual_only: true` のArticle枠は日別上限には数えるが、`x-sync-status` はX予約キューと同期しない。
- 公開スクリプトは予定15分前〜120分後だけ動く。既に公開済みなら再投稿せず、公開URLからローカル状態を復旧する。
- ローカル自動化の実行時は、このMacが起動しCodexのローカル実行環境を利用できる必要がある。
- 公開日に間に合わなかった場合、勝手に翌日へずらさない。別の既存枠と差し替えてから `status.json` と月次計画を同時に直す。
- Articleからサイトへ送るリンクは1本だけ。XへA8のアフィリエイトリンクを直接貼らない。
- Xから直接報酬を得る条件と、サイト経由のアフィリエイト成果は別々に計測する。

## 事前検査

```bash
npm run x-article:prepare -- --check
```

Article 4本、告知4本、URLプレースホルダーの対応が壊れていないことを確認できます。

公開状態を書き換えずにURL登録処理まで試す場合は、`--dry-run` を追加します。

```bash
npm run x-article:prepare -- --article 1 --url https://x.com/doboku373/article/123 --dry-run
```
