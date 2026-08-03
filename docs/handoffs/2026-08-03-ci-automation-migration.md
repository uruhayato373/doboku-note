# Codex 実施ログ：CI/CD 自動化移行

> [!important]
> **2026-08-03 実装完了**：認証不要・意味判断不要の note ライブ監査と競合データ取得を GitHub Actions へ移した。`npm run quality:audit:ci` は 30/30 PASS。

## 背景

ローカル手動・クラウドルーティン・GitHub Actions に分散していた自動化を棚卸しし、CI/CD だけで完結する処理を Actions に集約した。本人ログイン、CAPTCHA/2FA、公開承認、意味判断が必要な処理は移行対象外とした。

## 実施内容

- `note-live-audit.yml` を公開状態の週次横断監査へ拡張
  - 構造、タグ、URL見出し/空引用/画像、`noteStatus`、マガジン SoT、CTA ライブ反映 D5 を検査
  - 再公開 dirty flag は非ゲートの JSON artifact として保存
  - `verify-note-status --ci` と `audit-note-funnel --live --ci` に取得失敗率ゲートを追加
- `competitor-scan.yml` を新設
  - 1/4/7/10 月に note / Instagram / ココナラの認証不要データを取得
  - 成功チャネルだけを退避し、時系列 snapshot を `develop` へ commit
  - X はログイン済み個人セッション、Brain は検索の意味判断が必要なため対象外
- `weekly-review-guard.yml` に競合スキャン期限の backstop を追加
- 自動化マップ、note 運用、競合レビュー、annual TODO を新しい責務境界へ更新
- 完了済みの「note-live-audit 疎通確認」TODO を削除

主要ファイル:

- `.github/workflows/note-live-audit.yml`
- `.github/workflows/competitor-scan.yml`
- `docs/project/04_運営/04_自動化マップ.md`
- `scripts/verify-note-status.mjs`
- `scripts/audit-note-funnel.mjs`

## 検証

```bash
npm run quality:audit:ci
npm run check-scheduled-exec-branch
npm run check-doc-refs
npm run check-policy-anchors
node --check scripts/verify-note-status.mjs
node --check scripts/audit-note-funnel.mjs
node --check scripts/scout-coconala-competitors.mjs
node --check scripts/check-competitor-scan-due.mjs
node scripts/verify-note-status.mjs --ci --json
node scripts/audit-note-funnel.mjs --live --ci
node scripts/check-note-live-headings.mjs
npm run verify-note-magazines -- --vs-txt
```

- quality audit: pass 30 / fail 0 / timeout 0 / skip 0
- workflow YAML: `js-yaml` と Ruby `YAML.parse_file` で全 18 ファイル parse 成功
- `verify-note-status --ci`: 9/9 本を実照合、取得失敗 0、ドリフト 0、exit 0
- `audit-note-funnel --live --ci`: 93 本を実照合、取得失敗 0、既存 D5 4 件を検出して想定どおり exit 1
- scheduled workflow 棚卸し: 11 本 / 実行対象 66 ファイル
- ココナラ CI 経路: Playwright 管理 Chromium + 一時 profile で公開プロフィール HTTP 200 / 販売実績 DOM を確認
- GitHub 実稼働: 2026-08-03 時点で既存 `note-live-audit` の note API 疎通・定期実行成功を確認

## 後続メモ

> [!todo]
> - `develop` から `main` へ反映後、`note-live-audit.yml` と `competitor-scan.yml` を各 1 回 `workflow_dispatch` して Actions 環境で拡張部分を確認する。
> - 旧クラウドルーティン `doboku-note note-funnel monthly audit`（`trig_01F5nDWSTs757Ge5K1ou6Dbr`）は [Claude Code Routines](https://claude.ai/code/routines) から削除する。`doboku-note weekly PDCA` は意味判断の責務が残るため削除しない。
> - 新しいライブゲートは既存ドリフトを検出済み：CTA 未反映 4 件、`note掲載文.txt` 価格差 2 件、URL 見出し化 1 件。修復には note ログイン済みブラウザが必要。

- `post-youtube-scheduled.yml` は GitHub 側で手動無効のまま（2026-08-03 確認）。
- ユーザー crontab の `/Users/minamidaisuke/scripts/sync-obsidian-pdf-to-r2.sh` は実体が無いが、ローカル入力前提かつ repo 外のため今回変更していない。

### クラウドルーティン削除の試行

- 2026-08-03、ユーザー指示により不要ルーティンの削除を試行。
- `RemoteTrigger` の deferred tool を検索したが、この Codex セッションには一覧取得・更新ツールが接続されていなかった。
- `claude mcp list` にも RemoteTrigger 接続は無く、クラウド側の全件一覧を検証できなかった。
- プロジェクト規約上、routine の完全削除は API 非対応で Claude Code Routines 画面からの手動操作が必要。既知の削除対象と維持対象は上記のとおり。
