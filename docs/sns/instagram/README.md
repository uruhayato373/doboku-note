# Instagram 投稿運用フロー

このディレクトリは Instagram 投稿素材の SSOT（Single Source of Truth）。
**投稿は Meta Business Suite（`publish-ig-bs` スキル）に一本化**している。Graph API 経路（`scripts/publish-ig.mjs` 即時投稿・`post-instagram-scheduled.yml` cron 予約）は 2026-06-17 に全廃した。

## 投稿（予約／即時とも publish-ig-bs）

Playwright × システム Chrome の永続プロファイルで Meta Business Suite を操作し、カルーセル／リールを投稿する。**真実源は `.claude/skills/social/publish-ig-bs/SKILL.md`**（実測セレクタ表・運用ルール）。

```bash
# 予約投稿（dry-run 必須 → 本番）
/publish-ig-bs post <pack-dir> --schedule 2026-06-20T07:00 --dry-run
/publish-ig-bs post <pack-dir> --schedule 2026-06-20T07:00

# 即時投稿
/publish-ig-bs post <pack-dir> --now

# リール（--reel）／リール JIT（生成→予約→mp4削除で在庫を持たない）
node scripts/publish-reel-jit.mjs --pack <r07-pack-01> --question 1 --schedule <YYYY-MM-DDTHH:MM>
```

- ローカル GUI 前提（システム Chrome + 手動 2FA でログイン、`.local/playwright-ig-bs-profile/`）。**CI 不可**。
- ToS グレー（API 外自動操作）ゆえ初回 `--dry-run` 必須・Planner 実体確認を運用ルール化。

## 投稿素材の構造

```
docs/sns/instagram/<slug>/
├── slide-data.json            # cover / board / cta 構成データ（ig-carousel-writer or 人手）
├── caption.txt                # generate-caption.cjs で生成（publish-ig-bs が読む）
├── carousel/img/*.png         # 4:5 投稿画像（2〜10 枚）
└── reels/                     # リール素材（mp4 は JIT 生成・gitignore、SoT は slide-data + reels/wav）
```

## 素材生成スクリプト（残置）

| スクリプト | 役割 |
|---|---|
| `.claude/scripts/instagram/generate-caption.cjs` | slide-data.json → caption.txt 生成 |
| `.claude/scripts/instagram/build-stories.mjs` | Stories 素材ビルド |
| `.claude/scripts/instagram/build-highlight-materials.mjs` | ハイライト素材ビルド |

## 投稿ペース戦略

- **推奨**: 1 日 1〜3 件を毎日継続。火・水・木 18-20 時が IG エンゲージメント高。
- **2026-04 v5 戦略**: Carousel 週 2 + Reels 週 3 = 週 5 タッチ。

## 関連リソース

- IG 投稿スキル（真実源）: `.claude/skills/social/publish-ig-bs/SKILL.md`
- カルーセル設計: [../../reference/ig-carousel-skill.md](../../reference/ig-carousel-skill.md)
- Reels 設計: [../../reference/ig-reels-policy.md](../../reference/ig-reels-policy.md)
- X 投稿フロー: [../x/README.md](../x/README.md)
- SNS 戦略 v5: [../../project/03_SNS/01_SNS集客戦略.md](../../project/03_SNS/01_SNS集客戦略.md)
- 5 チャネル動線設計: [../../project/03_SNS/02_チャネル動線設計.md](../../project/03_SNS/02_チャネル動線設計.md)
