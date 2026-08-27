# IG 公開状態の照合 ＋ 未公開の予約投稿（運用 SSOT）

Instagram カルーセルの「実際に公開されているか（現状確認）」と「未公開パックの予約投稿」を**反復運用**するための真実源。手動投稿後の SoT ドリフトを定期的に検出・是正し、未公開を安全に予約まで運ぶ。

- 実行スキル: **`/ig-reconcile`**（`.claude/skills/social/ig-reconcile/`）
- 照合エンジン: **`npm run verify-ig-status`**（`scripts/verify-ig-status.mjs`・read-only）
- 公開可否ゲート/異常検出: **`ig-publish-auditor`**（Evaluator・`.claude/agents/`）
- 投稿エンジン: **`publish-ig-bs`**（既存・予約投稿）
- アカウント SSOT: **`.claude/config/ig-account.json`**

## 1. アカウント SSOT（混乱の根本原因を断つ）

実 IG アカウントは **`@dobokunotecom`**。アカウントとプロフィール表示値の機械可読SSOTは `.claude/config/ig-account.json`。`content/sns/instagram/profile.md` は設計理由・変更履歴であり、実値と競合した場合はconfigを正とする。Xは別アカウント `@doboku373`（`.claude/config/x-account.json`）。スクリプトがハンドルを誤ると空振りするため、必ずconfig経由で参照する。

## 2. SoT スキーマ（3 種）

| ファイル | スキーマ | 意味 |
|---|---|---|
| `posted.json`（C・現行） | `{carousel:{at,url,note}, reels, stories}` | 公開済み記録。`url` の shortcode が実投稿。 |
| `status.json`（A・publish-ig-bs 出力） | `{carousel:{channel,status,scheduled_at,posted_at,image_count,updated_at}}` | 予約/投稿の機械記録。`status:"scheduled"` ＋ `scheduled_at`。 |
| `status.json`（B・旧 draft 形式） | `{keyword,label,management,carousel:"draft",posted:false,...}` | 旧メタ。`carousel:"draft"`/`posted:false` が放置されやすい（draft 誤記録の温床）。 |

`ig-status.mjs` が C を読み書きし B→C を normalize。`verify-ig-status` は A/B/C すべてを解釈してライブと突合する。

## 3. ドリフト 8 分類（verify-ig-status の出力）

| 分類 | 意味 | 是正 |
|---|---|---|
| `published_recorded` | 記録 URL が生存・かつ**型がカルーセル**（整合） | 不要 |
| `published_UNrecorded` ★ | ライブのカルーセルに一致するが posted.json が無い | posted.json を backfill |
| `draft_misrecorded` ★ | status.json が draft だが実投稿済み | status.json を是正 |
| `recorded_but_gone` ★ | 記録 URL が削除済み（存在チェックで確定） | 新 URL へ更新 or 孤児記録 |
| `type_mismatch` ★ | **posted.json の carousel が実はリールを指す＝カルーセル実質なし** | カルーセルを貼り直し＋posted.json 是正（reels へ移す） |
| `scheduled` | status.json で予約済み | 不要（go-live 後に posted へ） |
| `unpublished` | 素材はあるが未公開 | 予約候補（§5） |
| `anomaly` ★ | 同テーマが**複数のカルーセル**に一致、または**複数パックが同一投稿を主張**（下記 `ambiguous`） | **自動処理しない**・人判断 |
| `ambiguous`（フラグ） | カテゴリではなく `published_UNrecorded`/`draft_misrecorded` の各エントリに付く真偽値。**立っていたら backfill 不可** | 人判断（`ambiguousWith` に衝突相手の rel） |

★ がドリフト（exit 2）。`.claude/state/ig-reconcile/snapshot.json` に保存。

> **型不整合（type_mismatch）は rio 事故の再発防止**: 2026-06-25、rio（環境条約の流れ）の白カルーセルが無いのに**リール（DaAFq59EuIO）を白カルーセルと誤認**し、黒カルーセル（DZ8qhf0k3ah）を削除してカルーセルを消失させた。reconciler はカルーセル/リールを `/reel/` リダイレクト＋「オリジナル音源」「リール動画を宣伝」マーカーで判別し、carousel 記録がリールを指していたら赤フラグする。`anomaly` も同型（カルーセル同士）の重複のみ＝カルーセル＋リールの併存は正常運用として除外する。

> **`matched=1` は「一意対応」ではない（2026-08-27 の事故未遂）**: `matched` は**パック→ライブの片方向**しか見ないため、
> 1 本のライブ投稿に複数パックがマッチしても各パックは `matched=1` のまま `published_UNrecorded` に入る。これを
> 一意対応と読んで backfill しようとして事故りかけた——実測で civil の 10 パックがわずか 3 本を共有し
> （`Dbe0u3tDDnw` が 5 パック）、うち 4 件は `status.json` の `scheduled_at` が未来日＝**そもそも未投稿**だった。
> 年度違いの別内容（令和7-4 / 令和3-平成30 / 平成29-26）なのにテーマ名が同一でテキスト誤ヒットしていた。
> 未投稿のパックに「投稿済み」の記録が付くと、後で「投稿済みだから作らない」という判断ミスを誘発する。
> 機械ガードは `scripts/lib/ig-ambiguity.mjs`（`markAmbiguousClaims`）＝逆引きで同一 shortcode を 2 パック以上が
> 主張していたら `ambiguous` を立てて `anomaly` へ載せる。回帰テスト `tests/ig-ambiguity.test.mjs`。
> **既存 snapshot（08-25）での実測: 72 件中 48 件が `ambiguous`（civil-1 31 / civil-2 17）、backfill 安全は cem 24 件のみ。**

### リール軸（carousel カテゴリと直交）

カルーセルとリールは両方出す設計なので、**カルーセルは出たがリールが無い**パックを別軸で surface する（SoT ドリフトではなく**コンテンツ・バックログ**なので exit には影響しない）:

| 分類 | 意味 | 対応 |
|---|---|---|
| `reel_gap` ◆ | カルーセルは公開/予約済みだがリールが無い（`posted.json.reels`／`status.json.reel scheduled`／`reels/` 素材いずれも無し） | `figure-reel-create.mjs` でナレーション付きリール生成 → `publish-ig-bs --reel` で予約 |
| `reel_built_unposted` ◆ | `reels/` 素材（script.txt/video.mp4）はあるが未投稿・未予約 | `publish-ig-bs --reel` で予約するだけ |

判定: carousel が `published_recorded`/`published_UNrecorded`/`draft_misrecorded`/`scheduled` のいずれか（=carouselDone）のパックについてリール状態を見る。2026-06-25、最初の 9 テーマだけリール化し残り 9 パックがカルーセルのみだった取りこぼしの surface 用。

### 照合ロジックの要点（堅牢性）

- **記録側は直接存在チェック**（`/p/<shortcode>` が「ご利用いただけません」か）で判定する。プロフィールグリッドの走査は**遅延ロードで全件は載らない**ため、グリッド集合の membership で記録側を判定すると生存投稿を「削除済み」と誤検知する（2026-06-25 実測、cash-flow/mcgregor が 12 件しか載らないグリッドで誤判定→直接チェックへ修正）。
- **未記録の発見**はグリッド走査＋caption 先頭一致（best-effort・直近投稿中心）。`--max` で取得上限を制御。取得不能（network/throttle）は「生存扱い」で誤検知を避ける。

## 4. プランナー予約確認（実体検証の唯一動く方法）

「予約成功モーダル＋status.json」だけを信用せず、Business Suite プランナーで実体確認する。ただし UI に罠がある:

- **週送りボタン（< >）は Playwright クリックに反応しない**（trusted gesture 必須らしい）。
- **日セルのクリックは「投稿を作成」画面を開く**（誤って新規投稿を作りかける）。**禁止**。
- **唯一動く**: 「月」ビューに切替 → 日番号（`NN日`）の座標で列を作り → 時刻チップ（`HH:MM`）を最も近い日セルに割り当てる。`verify-ig-status` の `readPlanner()` が実装。`--no-planner` で省略可。

## 5. 未公開の予約投稿

1. `unpublished` 各パックを **`ig-publish-auditor`** に渡し公開可否ゲート（caption 実在/品質・画像 2〜10 枚・draft 痕跡なし・テーマ整合）。Bash 不可なので親スキルが reconcile JSON ＋ caption.txt ＋ 画像一覧 ＋ status をテキストで渡す。
2. `ready` のみを、既存キュー（07:30 / 12:00 / 17:00 / 21:00 等）と**衝突しない時間帯**へ予約。本運用で確立した空き帯は **19:00/日**。
   ```bash
   npx tsx .claude/skills/social/publish-ig-bs/publish-ig-bs.ts post "cem/keyword-packs/<slug>" --schedule YYYY-MM-DDT19:00
   ```
   初回・1 週間以上空いた後は `--dry-run` を先に。zsh では `set -- $var` が単語分割しないので 1 本ずつ明示実行する。
3. **プランナーで 19:00 スロットの実在を確認**（§4）。

## 6. 安全弁

- **報告＋提案が既定**。posted.json 編集・予約投稿は **operator 確認後のみ**。
- **公開済み投稿の削除は本仕組みの対象外**（不可逆。黒背景の貼り直し等は個別判断で手動）。
- **鉄則: リール≠カルーセル。同テーマのリールが存在することはカルーセル削除の根拠にならない。** 重複判定・削除判断の前に必ず投稿の型を確認する（`/p/`=カルーセル・`/reel/`=リール・投稿ページの「オリジナル音源」「リール動画を宣伝」表示）。カルーセルとリールは**両方出す設計**なので併存は正常。`verify-ig-status` の `type_mismatch`／型考慮 `anomaly` が機械側ガード（2026-06-25 rio 事故の再発防止）。
- 削除直後の存在チェックは**キャッシュ誤検知**あり（消えていても一時的に「存在」と出る）→ 数秒後に再確認。

## 7. 並行セッションとコミット

別 Claude セッションが同じ worktree でブランチを切替えながら作業するのが常態（CLAUDE.md §10「複数セッションは worktree で分離」）。SoT 編集をコミットするときは:

- **develop を別 worktree に分離**: `git worktree add <dir> develop` → 編集 → `git commit -- <pathspec>`（`-m` は `--` の前）→ `git push origin develop:develop` → `git worktree remove <dir>`。worktree には `node_modules`・`.local` を symlink するとフック/ブラウザが動く。
- 共有 worktree で直接コミットせざるを得ないときも **`git commit` は pathspec 必須**（pathspec 無しは他セッションの staged 変更を巻き込む）＋ commit 先 branch を確認（2026-06-25、pathspec 無し commit が並行セッションの affiliate 削除を巻き込んだ再発防止）。

## 8. 週次運用

`/weekly-review` が `npm run verify-ig-status` を回し、★ドリフトを週次レビューにサーフェスする（`verify-note-status` と同じ位置づけ＝network 依存ゆえ CI ゲートにはせず週次/手動）。ドリフトが出たら次セッションで `/ig-reconcile` を実行して是正・予約する。

## 関連

- `.claude/knowledge/reference/ig-carousel-skill.md` — IG カルーセル運用全体
- `.claude/skills/social/publish-ig-bs/SKILL.md` — 予約投稿エンジン（偽成功検証・セレクタ表）
- `.claude/knowledge/reference/note-api-verification.md` — 同系統の note 版 reconciler（設計の手本）
