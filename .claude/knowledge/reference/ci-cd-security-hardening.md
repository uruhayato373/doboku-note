# CI/CD Secrets・破壊操作の権限設計（DN-0137）

DN-0137（旧DN-0109 Phase 4）の設計成果物。**実行はユーザーがGitHub/Cloudflareの管理画面またはgh CLIで行う**（branch protection・Secrets削除・Environment設定はセキュリティ設定の変更にあたり、エージェントは実行しない方針）。

実査は2026-08-26に`gh api`（read-only）で実施。以下は実測結果とその根拠コマンド。

## 実査結果

| 項目 | 現状 | リスク |
|---|---|---|
| branch protection (`main`) | 無設定（`gh api repos/uruhayato373/doboku-note/branches/main/protection` → 404 "Branch not protected"） | `cloudflare-deploy.yml`が`push: branches:[main]`で即本番デプロイ。force-push・削除・直pushを止めるものが無い |
| branch protection (`develop`) | 同上・無設定 | 複数セッション常態下でforce-pushされると他セッションの未pushコミットが消える（CLAUDE.md §10で既知のリスク） |
| GitHub Environments | `Production`(id 2754677196)・`Preview`(id 2755100617)が存在するが、**どのworkflowからも`environment:`キーで参照されていない**（`grep -rln "environment:" .github/workflows/*.yml` → 0件）。`protection_rules:[]`・`can_admins_bypass:true` | 存在するが機能していない飾り設定 |
| Secrets（15個中4個が未参照） | `ACCESS_KEY_ID`(2024-05-24)・`AWS_CF_ID`(2024-05-24)・`AWS_S3_BUCKET`(2024-05-27)・`SECRET_ACCESS_KEY`(2024-05-24)。`grep -rl "secrets\.<name>" .github/workflows/*.yml`がいずれも0件。登録日から旧AWS S3/CloudFront構成（現CLOUDFLARE_R2_*移行前）の残骸と推定 | 使っていない認証情報が漏洩リスクだけを持ち続けている |
| R2削除 (`r2-delete.yml`) | 既に良い設計: `workflow_dispatch`限定・既定dry-run・`commit=true`明示が必要・`concurrency: {group: r2-delete, cancel-in-progress: false}` | 対応不要 |
| R2監査キー最小権限化 | `r2-audit.yml`は`CLOUDFLARE_R2_AUDIT_ACCESS_KEY_ID || CLOUDFLARE_R2_ACCESS_KEY_ID`のフォールバック式が既にある（設計済み）が、専用の読み取り専用キー自体が未作成のため常に書き込み可能な既存キーへフォールバックしている | 最小権限化が半分で止まっている |
| CODEOWNERS | 無し | 必須レビュー者を指定できない（ただし単独運用なら優先度低） |
| ワークフロー衛生（SHA-pin・permissions・timeout） | `scripts/check-workflow-hygiene.mjs`が既にpre-commit/quality:auditでゲート済み | 対応不要 |

## 実行チェックリスト（優先順）

### 優先1: ワークフロー変更なし・即実行可能

**1-a. main/developのforce-push・削除を禁止する**

GitHub UI: `Settings → Branches → Add branch protection rule`

| フィールド | main | develop |
|---|---|---|
| Branch name pattern | `main` | `develop` |
| Do not allow bypassing the above settings | 任意（管理者も縛るなら✓） | 同左 |
| Allow force pushes | **✗ オフ**（最重要） | **✗ オフ** |
| Allow deletions | **✗ オフ** | **✗ オフ** |

「Require a pull request before merging」「Require status checks」は**あえて外す**——現行の直push＋`/deploy`スキル運用（develop→mainの判断はユーザー）を壊さないため。レビュー必須化はワークフローそのものを変える意思決定なので、望むなら別途検討する（下記「検討事項」）。

gh CLI で同等の設定をする場合（`--input`にJSONを渡す方式。UIの方が事故りにくいので推奨はUI）:
```bash
gh api -X PUT repos/uruhayato373/doboku-note/branches/main/protection \
  -f required_status_checks=null -f enforce_admins=false \
  -f required_pull_request_reviews=null -f restrictions=null \
  -F allow_force_pushes=false -F allow_deletions=false
```

**1-b. 未使用Secretsを削除する**

`Settings → Secrets and variables → Actions` から以下4件を削除（どのworkflowも参照していないことは上表で確認済み）:
- `ACCESS_KEY_ID`
- `AWS_CF_ID`
- `AWS_S3_BUCKET`
- `SECRET_ACCESS_KEY`

または:
```bash
gh secret delete ACCESS_KEY_ID
gh secret delete AWS_CF_ID
gh secret delete AWS_S3_BUCKET
gh secret delete SECRET_ACCESS_KEY
```

**1-c. 未使用GitHub Environmentsの扱いを決める**

`Production`/`Preview`はどのworkflowからも参照されず、保護ルールも空。以下いずれかを選ぶ:
- **削除する**（推奨・単純）: `Settings → Environments` から削除。または `gh api -X DELETE repos/uruhayato373/doboku-note/environments/Production` / `.../Preview`
- **本番デプロイの承認ゲートとして使う**（ワークフロー変更を伴う）: `cloudflare-deploy.yml`のjobへ`environment: Production`を追加した上で、Environment側に`Required reviewers`を設定する。**この場合は毎回の本番デプロイに手動承認が挟まる**——現行の自動デプロイ運用を変える意思決定なので、望む場合のみ実施（ワークフローファイルの変更自体はコード変更なのでエージェントに依頼可・Environment側の承認者設定はユーザー実行）

### 優先2: 検討事項（ワークフローや運用を変える意思決定）

- **R2監査キーの最小権限化**: Cloudflareダッシュボードで「R2への読み取り専用」スコープのAPIトークンを新規発行し、GitHub Secretsへ`CLOUDFLARE_R2_AUDIT_ACCESS_KEY_ID`/`CLOUDFLARE_R2_AUDIT_SECRET_ACCESS_KEY`として登録する。登録するだけで`r2-audit.yml`のフォールバック式が自動的に優先利用する（ワークフロー変更不要）
- **mainへのPRレビュー必須化**: 単独運用のため必須ではないが、`/deploy`前にセルフレビューの型を強制したいなら「Require a pull request before merging」を有効化（承認数0でも「PRを経由する」制約は課せる）
- **automation-failure Issue #457のクローズ**: 対象workflowは回復済みだが18日openのまま。dedup仕様で以後の失敗コメントが埋没している。DN-0135のIssue #473と同種のため統合を検討（クローズはユーザー）

## 実行後の確認コマンド

```bash
gh api repos/uruhayato373/doboku-note/branches/main/protection | python3 -c "import json,sys; d=json.load(sys.stdin); print('force_push:', d['allow_force_pushes']['enabled'], '/ deletions:', d['allow_deletions']['enabled'])"
gh secret list   # 4件が消えていること
gh api repos/uruhayato373/doboku-note/environments   # 方針に応じて0件 or Production/Previewが残る
```

## 関連

- `scripts/check-workflow-hygiene.mjs` — SHA-pin/permissions/timeout-minutesの機械ゲート（既に対応済み・本ドキュメントの対象外）
- `.github/workflows/r2-delete.yml` — 既に良い設計の参考実装（workflow_dispatch限定・dry-run既定）
- CLAUDE.md §10「重要なステップごとにチェックポイントを置く」— 複数セッション常態下でのforce-pushの危険性
