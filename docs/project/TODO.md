# TODO

> **生成物・直接編集禁止**。タスクの追加・更新は `.claude/state/task-queue.json`（または `.claude/scripts/lib/task-queue.mjs` の CLI）で行い、`npm run build-todo` で再生成する。スキーマと運用は [information-architecture.md](../../.claude/reference/information-architecture.md) 参照。

- 生成: 2026-05-29T23:31:52.547Z
- 未完了: 30 件 / 完了済み: 0 件

## content

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-015 | 未着手 | high | 総監キーワードページ 499 件リライト（A→C→B→C'） | docs/project/31_リライト方法論方針.md / .claude/state/improvements/pe-priority-2026-05-11.md |
| T-016 | 進行中 | high | note 商品ラインナップ整備（A-1〜D-1 + マガジン化） | docs/note/noteコンテンツ計画.md / docs/project/05_収益化戦略.md |
| T-019 | 未着手 | high | 令和7年版 国土交通白書を note 有料記事 + キーワード追記で活用 | docs/note/noteコンテンツ計画.md / docs/project/05_収益化戦略.md |
| T-017 | 進行中 | mid | 総監記述式 8 年分 三層構造分析プロジェクト | docs/project/08_記述式コンテンツ戦略.md / docs/project/essay-analysis/README.md |
| T-024 | 未着手 | mid | R8 対策 Phase 3: 試験前最終週の動線最終化 | .local/r2/posts/pe-comprehensive-management/mlit-whitepaper-2025/article.mdx / .local/r2/posts/pe-comprehensive-management/essay-exam-strategy/article.mdx / .local/r2/posts/pe-comprehensive-management/management-tradeoffs/article.mdx / .local/r2/posts/pe-comprehensive-management/r8-essay-keyword-forecast/article.mdx / docs/handoffs/2026-05-18-r8-pe-double-track.md |
| T-025 | 未着手 | mid | R8 対策 Phase 4: 試験後 R8 予測の的中振り返り | .local/r2/posts/pe-comprehensive-management/r8-essay-keyword-forecast/article.mdx / docs/note/noteコンテンツ計画.md / docs/handoffs/2026-05-18-r8-pe-double-track.md |
| T-026 | 未着手 | mid | 公務員河川担当ペルソナの新設（総監模範論文）（親: T-016） | docs/note/noteコンテンツ計画.md |

## infra

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-011 | 未着手 | mid | GA4 設定強化（Tier 1: Site Search / Outbound / AdSense linking / Internal filter）（親: T-002） | — |
| T-014 | 未着手 | mid | 計測データ 4 系統のスキル化（GSC/GA4/PSI/AdSense）（親: T-002） | docs/project/24_パフォーマンス監視アーキテクチャ.md |
| T-012 | 未着手 | low | Cloudflare Bot Fight Mode 設定確認・強化検討（親: T-002） | .claude/reference/measurement-incidents.md |

## meta

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-010 | 進行中 | high | AdSense 再申請プロセス完遂（親: T-002） | docs/project/04_運営/03_civil-adsense-resubmission.md / ~/.claude/plans/gentle-questing-sketch.md |
| T-002 | 進行中 | mid | 週次メトリクス PDCA（閾値違反の検出・追跡） | docs/project/24_パフォーマンス監視アーキテクチャ.md |

## quality

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-022 | 進行中 | low | SVG デザイン一貫性の継続改善 | .claude/state/svg-audit.json |
| T-023 | 未着手 | low | cem-qa 採点ルーブリックの 6 軸化の検討 | docs/project/30_採点ルーブリック方針.md |

## seo

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-013 | 進行中 | mid | Bing Webmaster Tools 運用開始・GA4 整合確認（親: T-002） | — |
| T-018 | 進行中 | mid | GSC Coverage 改善 Round 1 | — |
| T-021 | 未着手 | mid | URL Inspection ベースの indexing health 監視 | .claude/reference/measurement-incidents.md |
| T-027 | 未着手 | mid | EXP-003/004 を再measure（クリーンな28d窓） | — |
| T-020 | 未着手 | low | Cloudflare Bot 保護下で feed.xml/atom.xml が外部 Validator 到達不能 | — |

## sns

| ID | 状態 | 優先 | タイトル | 関連 |
|---|---|---|---|---|
| T-001 | 進行中 | high | SNS 自動投稿基盤（Instagram 一次制作 + YouTube 派生） | docs/project/03_SNS/01_SNS集客戦略.md / docs/project/03_SNS/02_チャネル動線設計.md |
| T-003 | 未着手 | high | Meta（Instagram）アカウント・API 認証準備（親: T-001） | docs/ig-posts/26_Instagram投稿自動化アーキテクチャ.md |
| T-005a | completed | high | Reels Generator/Evaluator 整備 + CTA モード分岐（v7 Phase B）（親: T-001） | docs/reference/ig-reels-policy.md / .claude/agents/ig-reels-writer.md / .claude/agents/ig-reels-qa.md |
| T-004 | 未着手 | mid | SNS スケジューラ統合（GitHub Actions cron）（親: T-001） | docs/ig-posts/26_Instagram投稿自動化アーキテクチャ.md |
| T-005b | completed | mid | Stories Generator/Evaluator 整備（v7 Phase C）（親: T-001） | docs/reference/ig-stories-policy.md / .claude/agents/ig-stories-writer.md / .claude/agents/ig-stories-qa.md |
| T-005c | completed | mid | YT 派生スクリプト + Evaluator（v7 Phase D）（親: T-001） | docs/reference/yt-shorts-publisher-policy.md / .claude/agents/yt-shorts-publisher-qa.md / .claude/skills/social/yt-shorts-create/SKILL.md |
| T-006 | 未着手 | mid | X reply 自動化（cycle 002〜、Mac 不要構成）（親: T-001） | — |
| T-008 | 進行中 | mid | IG フォロワー獲得 30 日チェックリスト（2026-05）（親: T-001） | docs/project/07_SNS集客戦略.md |
| T-005 | completed | low | SNS 型・チャネル拡充（v7 で T-005a/b/c に分割済み）（親: T-001） | docs/project/03_SNS/01_SNS集客戦略.md |
| T-007 | completed | low | IG ストーリー活用パターン集のガイド化（v7 で T-005b に統合）（親: T-001） | docs/reference/ig-stories-policy.md |
| T-009 | 未着手 | low | IG ハイライトカバー画像の自動生成（親: T-001） | .claude/reference/sns-image-policy.md |
