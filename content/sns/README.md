# SNS 投稿管理 SSOT

このディレクトリが全 SNS 投稿の唯一の真実源（SSOT）です。

## チャネル別 SSOT

| チャネル | ディレクトリ | 形式 | 自動化 |
|---|---|---|---|
| Instagram | `content/sns/instagram/` | `slide-data.json` + `img/` | 半自動（スクリプト生成） |
| X（Twitter） | `content/sns/x/` | `tweets.md` + `status.json` | 手動 |
| YouTube Shorts | `content/sns/youtube/` | `meta.json` + `shorts.mp4` | 完全自動 |

## スケジュール管理

`content/sns/schedule.json` — 全チャネル統合スケジュール

## ディレクトリ命名規則

| チャネル | 規則 | 例 |
|---|---|---|
| Instagram | `YYYY-MM-DD-{slug}` | `2026-05-15-heinrich-law/` |
| YouTube | `YYYY-MM-DD-{slug}` | `2026-05-13-heinrich-law/` |
| X | `NNN-{カテゴリ}-{タイトル}` | `001-択一1問1答-20問/` |

## 廃止ディレクトリ

`docs/ig-posts/` は削除済み（2026-05-14）。Instagram 投稿は `content/sns/instagram/` に統一。

## バイナリ容量管理（R2 退避）

reels の wav/mp4 等の再生成可能バイナリは git に溜め込まず R2 へ退避する。判定は `sns-archive-auditor` エージェント、実行は `npm run upload-sns-r2`。詳細・3層モデル・安全不変条件は `.claude/knowledge/reference/sns-archive-policy.md`。

## 関連ポリシー

- Playwright ログインプロファイル運用（X/IG/note/ココナラの再ログイン防止）: `.claude/knowledge/reference/playwright-auth-profiles.md`
- 画像仕様: `.claude/knowledge/reference/sns-image-policy.md`
- バイナリ退避運用: `.claude/knowledge/reference/sns-archive-policy.md`
- SNS 集客戦略: `docs/marketing/01_SNS集客戦略.md`
- 5 チャネル動線設計: `docs/marketing/02_チャネル動線設計.md`
