# tools/admin — 運営管理画面（ローカル専用）

SNS 投稿・記事画像・note カバーを目視確認し、投稿状態を一覧する**ローカル専用**ダッシュボード。
デプロイしない（運用コスト 0 円）。データ SoT は git 作業ツリー内ファイルを直読。

## 起動

```bash
npm run admin        # → http://127.0.0.1:3021
```

`127.0.0.1` バインドのみ（LAN 非公開）。依存追加ゼロ（node:http のみ）。

## タブ（Phase 0〜2 実装済み）

| タブ | 内容 | データソース |
|---|---|---|
| OGP | 全 ogp.png（資格×分類フィルタ） | `.local/r2/posts/**/ogp.png` |
| 記事図版 | SVG / PNG・WebP クロップ（監査 severity バッジ） | `.local/r2/posts/**/img/*`、`.claude/state/svg-audit.json` |
| note画像 | カバー / 図版（試験×種別フィルタ） | `docs/note/**/img/{cover*,figure-*}.png` |
| SNSパック | IG パック・X ドラフトの画像目視 + posted バッジ | `docs/sns/instagram/**`、`docs/sns/x/draft/**` |
| SNS状態板 | IG 進捗サマリ・X 予約状況・直近スケジュール（読み取り専用） | `docs/sns/schedule.json`、posted.json、x status.json |

件数は既存ギャラリースクリプト（`ogp-gallery` / `note-cover-gallery` / `svg-gallery`）と一致する。

## 設計方針

- **投稿系はローカル実行必須**: Playwright ログインプロファイル（`.local/playwright-*-profile`）がこの PC にあるため。クラウドにデプロイしても投稿・書き込み不可。
- **書き込みは既存 CLI 経由に一本化**（Phase 3 以降）: `scripts/ig-status.mjs mark`、`note-publish.mjs`、publish-x 系を child_process 実行。ガード（`--commit` ゲート・dobokunote assert）を UI から迂回させない。直接 fs 書き込みはしない。
- **走査ロジックは既存資産を再利用**: `ig-status.mjs` の export（`walkPacks`/`packInfo`/`normalizePosted`）を import、ギャラリー走査は既存 `.tmp` ギャラリーの移植。
- `tools/` は eslint / tsc / knip / next build のどのスコープにも入らない（CI 影響ゼロ）。

## 構成

```
tools/admin/
  server.mjs         node:http ルーター（/ + /media/* + /api/*）
  lib/media.mjs      /media/* パスマッピング + traversal ガード + MIME allowlist
  lib/scan.mjs       ギャラリー走査（ogp / figures / note / sns）
  lib/sot.mjs        SNS 状態板の SoT 統合
  public/            Vanilla JS SPA（no-build）
```

## 未実装（ロードマップ）

- P3 投稿/予約アクション（child_process + SSE ログ + 2 段階 UI + X 偽成功検証）
- P4 記事/note/マガジン一覧（doc-meta-index / note-magazines）
- P5 売上ダッシュボード（sales-log + 月次チャート）
