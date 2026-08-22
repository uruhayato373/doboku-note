# 教材ハイライト（系統 C）投稿手順

## 位置づけ

- 戦略 v7.1 §2 Highlight 6 種目「教材」に対応
- ハイライト系統 C（`.claude/knowledge/reference/ig-stories-policy.md` §5）
- **note プロフィール → 無料記事 → 有料マガジンの二段ロケット動線**

## 着地点ルール（最重要）

| スライド | リンクスタンプ着地点 | 直接 note 有料？ |
|---|---|---|
| 01-cover | （任意） | ❌ |
| 02-author | note プロフィール | ❌ |
| 03-essay | note プロフィール | ❌（個別マガジン直リンクは置かない） |
| 04-readguide | note プロフィール | ❌（同上） |
| 05-sample | note プロフィール（無料記事タブ） | ❌ |
| 06-cta | note プロフィール | ❌ |

**全スライドが note プロフィールに着地する設計**。note 内部で「無料記事 → マガジン目次 → 有料記事」の自然遷移に委ねる。

理由:
- マガジン URL は変動する（公開停止・統合・新規発売）→ プロフィール統一で SoT 維持
- 売り込み感の回避（系統 A 6 種目の中立フレーミング遵守）
- 戦略 v7.1 §6「やらないこと」と一貫

## 投稿フロー

```
1. 6 枚 PNG 確認
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/06_materials
       ↓
2. IG アプリで Stories 6 枚を順番に連投（01 → 02 → ... → 06）
   - 各 Stories に caption.txt のテキストを重ねる
   - リンクスタンプを貼る（note プロフィール URL に統一）
       ↓ 24h 以内
3. ハイライト名「教材」に追加
   - 並び順: プロフィール一行目の右端（system A 6 種目）
   - カバー画像: 01-cover.png をそのまま使用 or 円形にトリミング
       ↓ 半年後を目安に
4. 更新タイミング: note マガジン追加・廃止時、または運営者が新教材を出したとき
```

## 更新タイミング

- **note マガジン追加・廃止時**: 03-essay の items / 04-readguide の body を編集 → 再生成
- **半年に 1 度**: コンテンツが古くないか見直し
- slide-data.json の文言を変更する場合は `build-highlight-materials.mjs --dir` で個別再生成

## SoT 参照

| 情報 | 参照先 |
|---|---|
| note プロフィール URL | `.claude/scripts/lib/sns-common/sns-config.mjs` の `noteUrl` |
| マガジン一覧・公開状況・URL | `src/lib/note-magazines.ts` |
| マガジン価格 | `src/lib/note-magazines.ts`（MDX 本文には書かない・SoT 一元化） |

## UTM 設計

全 6 スライドで note プロフィール URL を共有するが UTM は付与する：

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=materials
&utm_content={author|essay|readguide|sample|cta}
```

`utm_content` でスライド別の経路分析。直接 note 有料リンクは置かない（二段ロケット原則）。

## 系統 A / B / C の使い分け（再掲）

| 系統 | ハイライト名 | 整備タイミング | 着地点 |
|---|---|---|---|
| A 固定 6 種 | まず読む / カルーセル目次 / Reels まとめ / FAQ / お知らせ / 教材 | Phase 1 開始 2 週間後・四半期更新 | 各種 |
| B 過去問試食 | R03 過去問 / R04 過去問 ... R07 過去問 | パック投稿のたび追加 | フィード Carousel → サイト |
| C 教材（本ファイル） | 系統 A 6 種目「教材」と同一 | A と同時整備・半年更新 | **note プロフィール** |

系統 A の 6 種目「教材」と系統 C は同一のハイライトを指す。系統 A は枠組み定義、系統 C は中身の Stories 設計を扱う関係。

## 改訂履歴

- **v2（2026-05-28）**: PNG 生成手順を `build-highlight-materials.mjs --dir` に明示。UTM 設計セクション追加。他 5 ハイライトの note.md とテンプレ整合性を取る
- v1（2026-05-28）: 初版。SNS 戦略 v7.1 化に伴い、ハイライト 6 種目「教材」用の雛形として新設。
