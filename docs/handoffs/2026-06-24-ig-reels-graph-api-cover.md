# ハンドオフ: IG Reels Graph API 経路の新設（サムネイル/カバー制御）

- 作成: 2026-06-24
- 作業先: 別 PC（要 Meta 認証セットアップ・ffmpeg・公開 URL ホスティング）
- 種別: コード新規実装（投稿基盤）
- 関連 memory: [[project_ig_business_suite_publish]] / [[project_ig_reels_civil]]

## 一行サマリ

現行の IG Reels 投稿（Business Suite + Playwright）は**カバー（サムネイル）を指定する処理が一切ない**ため、Meta の自動抽出フレーム任せでサムネイルが意図通りにならない。これを解決するため **Instagram Graph API 経路を新設**し、`cover_url`（または `thumb_offset`）で `00-cover.png` を明示指定できるようにする。

## 背景: なぜ Graph API 経路が必要か（調査済み・2026-06-24）

現行の唯一の Reels 投稿経路は Playwright + Business Suite の 1 本のみ。**Graph API 経路はリポジトリに存在しない**（`graph.facebook.com` / `media_publish` / `cover_url` / `thumb_offset` を使うコードは 0 件）。

根本原因（file:line で裏取り済み）:

1. **カバー選択ステップを素通りしている** — [.claude/skills/social/publish-ig-bs/publish-ig-bs.ts:818](../../.claude/skills/social/publish-ig-bs/publish-ig-bs.ts) の `advanceToShareStep()` が「作成→編集→シェアする」を右下「次へ」連打で通過。カバーフレームを選ぶ「編集」ステップで何も選択していない。
2. **カバー画像の明示アップロードが未実装** — `00-cover.png`（動画 0 秒目フレーム素材）は生成済みなのに、Business Suite の「カバーを編集→ファイルからアップロード」UI を操作するコードがない。`uploadVideo()` 内でカバーに触れるのは [publish-ig-bs.ts:776](../../.claude/skills/social/publish-ig-bs/publish-ig-bs.ts) の `/自動生成サムネイル/` 可視性チェック（処理完了判定のみ・選択しない）だけ。
3. **データモデルにカバー指定欄がない** — `reels/script.json` スキーマ（[docs/reference/ig-reels-policy.md](../reference/ig-reels-policy.md) §1）にサムネイル/カバーのフィールドがなく、カバー＝「mp4 先頭フレーム」という暗黙前提。ffmpeg 合成も独立 poster を出力しない。

→ Playwright で「編集」ステップを操作する案もあるが UI 依存で壊れやすい。**Graph API なら `cover_url` で確実にカバー制御できる**ため本経路を選択。

## Graph API 実装の要点（Instagram Content Publishing API）

Reels は **2 段（コンテナ作成 → 公開）** + ステータスポーリング:

1. `POST /{ig-user-id}/media`
   - `media_type=REELS`
   - `video_url=<公開 HTTPS の mp4 URL>`
   - **`cover_url=<公開 HTTPS のカバー画像 URL>`** ← これが本丸（`00-cover.png` を渡す）
   - 代替: `thumb_offset=<動画先頭からの ms>`（cover_url が使えない場合のフォールバック）
   - `caption=<本文+ハッシュタグ>`
   - → `creation_id`（コンテナ ID）が返る
2. `GET /{creation_id}?fields=status_code` を `FINISHED` になるまでポーリング（数十秒〜）。`ERROR` なら中止。
3. `POST /{ig-user-id}/media_publish` with `creation_id` → 公開完了。

### 重要な制約（実装前に必読）

- **`video_url` / `cover_url` は公開 HTTPS URL 必須**。Meta がサーバー側でフェッチするため、ローカルファイルや署名なし非公開 URL は不可。
  - → **本プロジェクトは R2 `storage.doboku-note.com` を保有**。mp4 とカバー png を一時アップロード（`npm run upload-sns-r2` 系の仕組みを流用可）→ 公開 URL を API に渡す → 公開確認後に一時オブジェクト削除、という流れが綺麗。`upload-sns-r2` は [docs/reference/sns-archive-policy.md](../reference/sns-archive-policy.md) 参照。
- **予約投稿は Graph API 非対応**（Reels は即時公開のみ）。予約が必要なら次のどちらか:
  - (a) 予約は従来どおり Business Suite 経路に残し、**カバー精度が要る分だけ Graph API 即時公開**に振り分ける（役割分担）。
  - (b) 自前スケジューラ（cron/ルーティン）で目標時刻に Graph API を叩く。既存の JIT 設計 [scripts/publish-reel-jit.mjs](../../scripts/publish-reel-jit.mjs) は「直前生成→即投稿」思想なので相性が良い。**推奨は (b) を JIT に組み込む**。
- **認証セットアップが新規**（既存トークン基盤なし）:
  - IG プロアカウント（ビジネス/クリエイター）が FB ページに連携済みであること。
  - Meta 開発者アプリ + 長期アクセストークン。必要権限: `instagram_content_publish`, `instagram_basic`, `pages_show_list`, `business_management`（アプリ審査が要る場合あり）。
  - トークン/IG_USER_ID は `.env`（git 非追跡）で管理。**計測同様、会社 PC はプロキシで外部 API 遮断**の罠に注意（[docs/reference/measurement-incidents.md](../reference/measurement-incidents.md)）→ 別 PC で実行する理由の一つ。
- **レート制限**: API 経由は 24h あたり 50 投稿まで。

## やること（別 PC でのタスク）

1. Meta アプリ作成・長期トークン取得・`.env` に `IG_GRAPH_TOKEN` / `IG_USER_ID` を設定（git 追跡外）。
2. 新スクリプト `scripts/publish-reel-graph.mjs`（仮）を作成:
   - 入力: reel pack ディレクトリ（既存と同じ `docs/sns/instagram/.../reels-pp/q<N>/` 構造）。`video.mp4` と `00-cover.png`（or カバー素材）を解決。
   - R2 へ mp4 + cover を一時アップロード → 公開 URL 取得。
   - 上記 3 ステップ（コンテナ作成 with `cover_url` → ポーリング → `media_publish`）。
   - 公開成功後、R2 一時オブジェクト削除 + ローカル mp4 削除（JIT 在庫ゼロ思想を踏襲）。
3. `reels/script.json` スキーマにカバー指定フィールド（例 `cover` or `thumbOffsetMs`）を追加し、[docs/reference/ig-reels-policy.md](../reference/ig-reels-policy.md) §1 を更新。
4. ffmpeg 合成（[.claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs](../../.claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs) / `ffmpeg-compose.mjs`）で `00-cover.png` を独立ファイルとして確実に出力（既にスライド素材として存在するか確認。なければ先頭フレーム or 専用カバーを書き出す）。
5. JIT ラッパー [scripts/publish-reel-jit.mjs](../../scripts/publish-reel-jit.mjs) に `--via graph`（or 新ラッパー）を追加し、Business Suite 経路と選択可能にする。

### ドキュメント同期（コミット前）

- スキル/スクリプト追加につき `npm run check-doc-coupling` / `npm run check-doc-refs` を通す。`docs/reference/skills-guide.md` ほか台帳更新が必要なら同一 commit で。
- 「ドキュメント化された面」を変えるので `/doc-sync` を 1 回。
- 新スキル化する場合は [docs/reference/skills-design-guide.md](../reference/skills-design-guide.md) 準拠。

## 完了条件（何が通れば完了か）

- Graph API で IG Reels を 1 本公開し、**サムネイルが指定した `00-cover.png` と一致**することを実機で確認（公開後の投稿のカバーを目視）。
- `cover_url` 失敗時に `thumb_offset` フォールバックが効く。
- 予約が必要な運用は (a) or (b) のどちらで回すか決定し、ドキュメント化。
- 既存 Business Suite 経路は破壊しない（カバー精度不要な大量予約はそのまま使える）。

## 参考ファイル

| ファイル | 役割 |
|---|---|
| [.claude/skills/social/publish-ig-bs/publish-ig-bs.ts](../../.claude/skills/social/publish-ig-bs/publish-ig-bs.ts) | 現行 Business Suite 投稿エンジン（`publishReel()` / `advanceToShareStep()`） |
| [scripts/publish-reel-jit.mjs](../../scripts/publish-reel-jit.mjs) | JIT ラッパー（生成→予約→mp4削除）。Graph 経路の組込み先 |
| [.claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs](../../.claude/skills/social/ig-reel-create/scripts/ig-reel-create.mjs) | 動画生成（`00-cover.png` 連結 → mp4） |
| [docs/reference/ig-reels-policy.md](../reference/ig-reels-policy.md) | `reels/script.json` スキーマ・Reels ポリシー |
| [docs/reference/sns-archive-policy.md](../reference/sns-archive-policy.md) | `upload-sns-r2`（R2 一時ホスティング流用元） |
| [docs/reference/measurement-incidents.md](../reference/measurement-incidents.md) | 会社 PC プロキシで外部 API 遮断の罠 |
