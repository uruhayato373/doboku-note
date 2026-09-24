---
name: feedback-read-auth-notes-before-ci-proposal
description: ログインが要る処理の CI 化を提案・起票する前に、playwright-auth-profiles.json の各サービスの notes と measurement-incidents.md の CI 実測を読む。google は hosted runner で復元すると Mac 側まで全面失効する（2026-09-21）
metadata:
  node_type: memory
  type: feedback
---

ログインが要る外部サービス（google / instagram / kdp / afb / x 等）の処理を「CI に載せる」提案やバックログ起票をする前に、
`.claude/config/playwright-auth-profiles.json` の当該サービスの `notes` と `ci`、`.claude/knowledge/reference/measurement-incidents.md`
の 2026-09-21 エントリ（hosted runner での復元実測）を読む。

**Why:** 2026-09-24、GSC 登録リクエストの CI 化を DN-0285 として「hosted runner で probe-only canary → 卒業」で起票した。だが google は
2026-09-21 に hosted runner（datacenter IP）で復元した直後、Google が Mac 側を含めてセッションを全面失効させた実測があり、registry の
notes に「hosted CI 不可・self-hosted runner かローカル儀式」と書かれていた。起票どおり進めると Mac のログインまで壊す手順だった。
同じセッション内で DN-0286 の実装中に notes を読んで気づき、self-hosted runner 限定の設計（gsc-request-indexing.yml・
requiresSelfHostedRunner）に直して DN-0285 を作り直した。さらにリポジトリが公開で self-hosted runner も危険と分かり、最終的に Mac の launchd（gsc-local）にした。

**How to apply:** 「CI に置きたい」と言われたら、まず registry の `ci.enabled` と `notes`、measurement-incidents の実測を確認し、
hosted 不可のサービスは Mac のローカル定期実行（launchd）として提示する。self-hosted runner はリポジトリが公開だと fork の PR に Mac 上でコードを実行されうるので、公開・非公開を確かめてから出す（2026-09-24 に見落として一度勧めた）。hosted の canary を勧めない。
関連: [[feedback_spec_from_measurement_not_catalog]]。
