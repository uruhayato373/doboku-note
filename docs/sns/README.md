# SNS 投稿管理 SSOT

このディレクトリが全 SNS 投稿の唯一の真実源（SSOT）です。

## チャネル別 SSOT

| チャネル | ディレクトリ | 形式 | 自動化 |
|---|---|---|---|
| Instagram | `docs/sns/instagram/` | `slide-data.json` + `img/` | 半自動（スクリプト生成） |
| X（Twitter） | `docs/sns/x/` | `tweets.md` + `status.json` | 手動 |
| YouTube Shorts | `docs/sns/youtube/` | `meta.json` + `shorts.mp4` | 完全自動 |

## スケジュール管理

`docs/sns/schedule.json` — 全チャネル統合スケジュール

## ディレクトリ命名規則

| チャネル | 規則 | 例 |
|---|---|---|
| Instagram | `YYYY-MM-DD-{slug}` | `2026-05-15-heinrich-law/` |
| YouTube | `YYYY-MM-DD-{slug}` | `2026-05-13-heinrich-law/` |
| X | `NNN-{カテゴリ}-{タイトル}` | `001-択一1問1答-20問/` |

## 廃止ディレクトリ

`docs/ig-posts/` は削除済み（2026-05-14）。Instagram 投稿は `docs/sns/instagram/` に統一。

## 関連ポリシー

- 画像仕様: `docs/reference/sns-image-policy.md`
- SNS 集客戦略: `docs/project/sns/sns-strategy.md`
- 5 チャネル動線設計: `docs/project/sns/channel-funnel.md`
