# noteカバー Crop-safe V4 Claude Code作業計画

実装仕様は `.claude/knowledge/design-system/note-cover-crop-safe-v4.md` を全文参照する。

## Phase 0

- 現行記事・マガジン・公開状態をinventory化
- 切断が目立つ代表6件を選定
- 現行6cropスクリーンショットを保存

## Phase 1

- V4をopt-in実装
- tokens、renderer、frontmatter writer、fit検査、galleryを更新
- 既存G2のピクセル差分がないことを確認

## Phase 2

- Claudeがコピーとvisual manifestを作成
- ClaudeからCodex MCPへ文字なし素材生成を依頼
- 代表6件を生成
- 6crop目視評価

## Phase 3

- dry-runでnote記事／マガジン編集UIを確認
- 明示承認された場合だけライブ反映
- API、PC、mobileで実査

## Phase 4

- パイロット合格後に全件inventory
- 高流入・主力商品から20件チャンクで移行
- 各チャンク後に検証・handoff

## パイロット対象6件（2026-07-24 選定・実装記録）

| # | 区分 | 対象 | noteId / magazine key | pricing |
|---|---|---|---|---|
| 1 | 総監・無料記事 | `docs/note/技術士総監/総監択一式17年分分析/article.md` | n3bcb87efddad | free |
| 2 | 総監・有料記事 | `docs/note/技術士総監/magazines/総監模範論文-河川コンサル/R08-yosou-1/article.md` | nbc90a82503db | paid |
| 3 | 総監・マガジン | `generate-magazine-covers.mjs` id=setsumon3-policy-bank | m91516dfc27ac | paid |
| 4 | 1級土木・記事 | `docs/note/1級・2級土木/1級土木/magazines/1級土木-一次-出る順合格ノート/article.md` | nec34238ca6d6 | paid |
| 5 | 2級土木・記事 | `docs/note/1級・2級土木/2級土木/一次択一-過去問PDF/article.md` | n4963f45bd6f8 | paid |
| 6 | 土木・マガジン | `generate-magazine-covers.mjs` id=civil-1-marugoto | md29a34906314 | paid |

選定理由: いずれも banner 実効 16.9〜25.3 字（正方形630で両端切断が確実）・回遊/売上導線の要（一次PDF/出る順/まるごとパック/施策バンク）・無料/有料・記事/マガジンを横断。

## 停止条件

- アカウント不一致
- 有料境界または価格を確認できない
- 生成素材に文字・ロゴが混入
- 中央安全領域が高情報量
- 主要文字がいずれかのcropで切れる
- 既存G2に予期しない差分
- 1件でもライブ更新に失敗
