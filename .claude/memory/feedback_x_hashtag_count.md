---
name: feedback-x-hashtag-count
description: X ハッシュタグは 3-4 個推奨（ベース 2 個 #技術士 #技術士総監 + 種別 1-2 個）。真実源は docs/sns/x/README.md
metadata:
  node_type: memory
  type: feedback
  originSessionId: 2e96f3f9-105d-4d86-b0f0-2063317a9e34
---

X ツイートのハッシュタグは **3-4 個推奨**。IG/note の 20-30 個運用とは別物。

**Why:** X 公式のスパム判定にハッシュタグ数の直接ルールはないが、5 個以上は業者・自動投稿の印象でエンゲージメントが下がる傾向（Buffer/HubSpot 2015-2019 の研究と Musk 体制後の For You アルゴリズム挙動）。1 個だけだと検索面の取りこぼしが大きい。

**How to apply:**
- ベース 2 個（全 Tweet 共通・先頭固定）: `#技術士 #技術士総監`
- 種別ごとの追加 1-2 個:
  - D 過去問クイズ: `#過去問対策 #<該当管理>`
  - N note 予告: `#模範論文 #<テーマ>`
  - C カウントダウン: `#試験対策 #社会人の勉強垢`
  - M 合格者メタ: `#勉強法 #リスキリング` or `#論文対策`
  - S 応援: `#勉強垢 #受験勉強`
- `#総合技術監理部門`（17 weight）は重いため要点投稿（W-3/W-2/W-1 節目）限定

**真実源（必読）:** `docs/sns/x/README.md` の「ハッシュタグ運用ルール（2026-05-25 改訂）」節。`publish-x/SKILL.md` と `social-post/SKILL.md` からも参照される。

**90 個プール（IG/note 用、X には流用しない）:** [[project-x-30days-campaign]] 参照。`docs/note/R8予想問題/hashtags.txt` 等の hashtags.txt は IG/note 用 20-25 個ローテーションに使用。
