# Cloudflare MCP監査ワークフロー

> [!todo]
> **2026-08-18 実装済み・ライブ実行待ち**：GitHub ActionsからCloudflare API MCPへ接続する読み取り専用監査を追加した。ワークフローをリモートへ反映後、手動実行して実データを確認する。

## 背景

ローカルCodexのOAuth接続が失敗し、既存のCloudflare APIトークン値もGitHub Secretから取り出せないため、既存の`CLOUDFLARE_API_TOKEN`をGitHub Actions内だけで利用する方式へ切り替えた。Cloudflare側では、`doboku-note.com`限定でZone、Analytics、Zone Settings、Cache Rules、Response Compressionの読み取り権限を追加する更新内容まで確認済み。更新ボタン押下後の完了状態は未確認。

## 実装内容

- `.github/scripts/cloudflare-mcp-audit.mjs`
  - 公式Cloudflare API MCPの`search`、`execute`ツールを使用。
  - API操作はGETに限定し、ゾーン設定、Cache Rules、Compression Rules、Analyticsを取得する。
  - 公開トップページのキャッシュ・圧縮レスポンスヘッダーも確認する。
  - `report.md`と`report.json`を生成し、トークン値は出力しない。
- `.github/workflows/cloudflare-mcp-audit.yml`
  - `workflow_dispatch`のみ。自動スケジュールなし。
  - GitHub Secret `CLOUDFLARE_API_TOKEN`をBearerトークンとしてMCPへ渡す。
  - 結果をActionsのJob Summaryと14日保持のartifactへ出力する。
  - 権限は`contents: read`、タイムアウトは10分。

## 検証

以下を実行し、成功した。

```bash
node --check .github/scripts/cloudflare-mcp-audit.mjs
node --input-type=module -e "import fs from 'node:fs'; import yaml from 'js-yaml'; const doc=yaml.load(fs.readFileSync('.github/workflows/cloudflare-mcp-audit.yml','utf8')); if (!doc.jobs?.audit) throw new Error('audit job missing'); console.log('YAML OK')"
npx prettier --check .github/scripts/cloudflare-mcp-audit.mjs .github/workflows/cloudflare-mcp-audit.yml
```

トークン未設定時に失敗レポートが生成されることも確認した。ローカルから`https://mcp.cloudflare.com/mcp`へのライブ接続は社内Palo AltoプロキシでHTTP 503となったため、実トークンを使う検証はGitHubホストランナーで行う。

## 後続メモ

1. 2ファイルと本ログをコミット・pushする。
2. GitHubのActionsから「Audit Cloudflare via MCP」を手動実行する。
3. Job Summaryまたは`cloudflare-mcp-audit` artifactを確認する。
4. MCPのツール仕様やAPIパスに変更があって失敗した場合は、artifact内のエラーと`discovery`結果を基にスクリプトを調整する。

既存の未コミット変更には触れていない。Cloudflare設定の変更、デプロイ、キャッシュ削除は実施していない。
