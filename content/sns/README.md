# SNS 投稿管理 SSOT

このディレクトリは SNS 投稿の中身（台本・文面・デザインの指定）の置き場です。公開の事実（ID・状態・予定・外部 ID・承認・素材の参照）は
コンテンツ台帳 `content/registry/` へ段階的に移します（2026-10-09 決定・[content-registry.md](../../.claude/knowledge/reference/content-registry.md)）。
切り替え前のチャネルは、下の表の置き場と各状態ファイルが今の正本です。

## チャネル別 SSOT

| チャネル | ディレクトリ | 形式 | 自動化 |
|---|---|---|---|
| Instagram | `content/sns/instagram/` | `slide-data.json` + `img/` | 半自動（スクリプト生成） |
| X（Twitter） | `content/sns/x/` | `tweets.md` + `status.json` | 手動 |
| 動画パック | `content/sns/video-packs/{exam}/{slug}/` | `video-pack.json` + `script.md` + `storyboard.json`（総まとめは `compilation.json` から storyboard を生成） | 通常動画を核に各チャネルへ派生（DN-0110・レンダラー=`npm run render-longform`・一覧=`README.md` を `build-video-pack-index` で生成） |
| YouTube Shorts | `content/sns/youtube/` | `meta.json`（mp4はR2） | 生成・投稿経路は資格ごとに異なる |

動画パックは企画・出典・台本・CTAのSSOTであり、Instagram・X・YouTubeの既存SSOTを置き換えない。YouTube の公開 URL・videoId・状態はコンテンツ台帳 `content/registry/`、計測鮮度などは `.claude/state/` に置き、制作意図と可変状態を混ぜない。詳細は `.claude/knowledge/reference/video-content-policy.md`。

## スケジュール管理

全チャネルの予定は管理画面の計画（`npm run schedule-view` と同じ集約）で見る。旧 `content/sns/schedule.json` は削除済み。

## ディレクトリ命名規則

| チャネル | 規則 | 例 |
|---|---|---|
| Instagram | `YYYY-MM-DD-{slug}` | `2026-05-15-heinrich-law/` |
| YouTube | `YYYY-MM-DD-{slug}` | `2026-05-13-heinrich-law/` |
| X | `NNN-{カテゴリ}-{タイトル}` | `001-択一1問1答-20問/` |

## 廃止ディレクトリ

`docs/ig-posts/` は削除済み（2026-05-14）。Instagram 投稿は `content/sns/instagram/` に統一。

## バイナリ容量管理（Google Drive vault へ退避）

reels の wav/mp4 等の再生成可能バイナリは git に溜め込まず Google Drive vault（`制作物/SNS音声動画/`）へ退避する。判定は `sns-archive-auditor` エージェント、実行は `npm run drive-vault-sync -- --group sns-archived-media --commit`（2026-09-05 DN-0170 で旧 `upload-sns-r2`＝R2 系統を廃止）。詳細・3層モデル・安全不変条件は `.claude/knowledge/reference/sns-archive-policy.md`。

通常動画、Shorts、Reelsも同じ原則を適用し、mp4・wav・字幕・レンダリングフレームを動画パックへコミットしない。

## 関連ポリシー

- Playwright ログインプロファイル運用（X/IG/note/ココナラの再ログイン防止）: `.claude/knowledge/reference/playwright-auth-profiles.md`
- 画像仕様: `.claude/knowledge/reference/sns-image-policy.md`
- バイナリ退避運用: `.claude/knowledge/reference/sns-archive-policy.md`
- SNS 集客戦略: `docs/marketing/01_SNS集客戦略.md`
- 5 チャネル動線設計: `docs/marketing/02_チャネル動線設計.md`
- 動画コンテンツ横断設計: `docs/marketing/06_動画コンテンツ運用設計.md`
- 動画パック作業契約: `.claude/knowledge/reference/video-content-policy.md`
