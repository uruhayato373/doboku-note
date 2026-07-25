# 03_reels-roundup「Reels まとめ」ハイライト 投稿手順

## 位置づけ

- 戦略 v7.1 §2 Highlight 3 種目「Reels まとめ」
- 直近代表 Reels への入口（フィード Reels タブと並ぶ二次動線）
- 5 枚構成: cover → 3 シリーズ (過去問パック / 5 管理解説 / 頻出引っかけ) → cta

## 着地点ルール（実投稿後に URL 確定）

| スライド | シリーズ | リンクスタンプ着地点 |
|---|---|---|
| 01-cover | Reels 案内 | （任意） |
| 02-r1 | 過去問パック | 過去問パック Reels の代表投稿 URL（投稿後に追記） |
| 03-r2 | 5 管理解説 | 5 管理解説 Reels の代表投稿 URL |
| 04-r3 | 頻出引っかけ | 頻出引っかけ Reels の代表投稿 URL |
| 05-cta | Reels 全件 | `https://instagram.com/doboku_note/reels/`（自プロフィール Reels タブ） |

過去問パック Reels は `docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/video.mp4` から派生投稿される。実投稿後の URL は IG アプリから取得。

## 投稿フロー

```
1. 5 枚 PNG 確認
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir docs/sns/instagram/highlights/03_reels-roundup
       ↓
2. Stories 5 枚を順番に連投
   - 各シリーズスライドにリンクスタンプ（代表 Reels 投稿 URL）
       ↓ 24h 以内
3. ハイライト名「Reels まとめ」に追加
   - 並び順: プロフィール一行目の右側（フィード Reels タブと並ぶ二次動線）
```

## 更新タイミング

- **新シリーズの Reels を始めた時**にスライド追加・差し替え
- 四半期に 1 度、シリーズ別「代表」を見直し（再生回数・シェア数で選別）
- 現状 3 シリーズだが将来は 5 シリーズまで拡張可能（slide-data.json の slides を増やす）

## SoT 参照

| 情報 | 参照先 |
|---|---|
| Reels の真実源 | `docs/sns/instagram/{exam}/exam-packs/<year>/pack-NN/reels/`（過去問パック）/ 将来の単独 Reels ディレクトリ |
| Reels 台本ポリシー | `.claude/knowledge/reference/ig-reels-policy.md` |
| Reels と Carousel/YT の役割分担 | `docs/project/03_SNS/01_SNS集客戦略.md` v7.1 §2 役割棲み分け表 |

## UTM 設計

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=reels-roundup
&utm_content={exam-pack|5kanri|trap}
```

`utm_content` でシリーズ別の経路分析が可能。
