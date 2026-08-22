# 01_intro「まず読む」ハイライト 投稿手順

## 位置づけ

- 戦略 v7.1 §2 Highlight 1 種目「まず読む」
- 新規プロフィール訪問者の **3 秒判断通過**用エントリーポイント
- 5 枚構成: cover → author → scope → content → cta

## 着地点ルール

| スライド | 役割 | リンクスタンプ着地点 |
|---|---|---|
| 01-cover | 興味喚起 | （任意。なくても OK） |
| 02-author | 運営者プロフィール | `https://doboku-note.com/about`（運営者紹介ページ）or サイトトップ |
| 03-scope | 扱う資格 | `https://doboku-note.com/`（サイトトップ。資格別ハブへの導線） |
| 04-content | コンテンツ 5 本柱 | `https://doboku-note.com/`（サイトトップ） |
| 05-cta | サイト誘導 | `https://doboku-note.com/`（サイトトップ） |

すべてサイト着地（note や SNS への横展開はしない）。「ここでわかる」の **入り口** に徹する。

## 投稿フロー

```
1. 6 枚 PNG が img/ に生成済みであることを確認
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/01_intro
       ↓
2. IG アプリで Stories 5 枚を順番に連投（01 → 02 → 03 → 04 → 05）
   - 各ストーリーにリンクスタンプを貼る (上記表)
   - UTM 付与推奨: ?utm_source=instagram&utm_medium=highlight&utm_campaign=intro
       ↓ 24h 以内
3. ハイライト名「まず読む」に追加
   - カバー画像: 01-cover.png を使用 or 円形にトリミング
   - 並び順: プロフィール一行目の左端（最重要動線）
```

## 更新タイミング

- 四半期に 1 度（新資格対応・運営者経歴更新時）
- 「Phase 2: Web 月収 ¥15k 達成・iOS アプリ着手判断」のタイミングで scope を再構成
- 03-scope に新資格を追加する場合は slide-data.json の body を編集 → `build-highlight-materials.mjs --dir` で再生成

## SoT 参照

| 情報 | 参照先 |
|---|---|
| 運営者経歴・6 資格 | `src/config/author.ts` |
| 対応資格・コンテンツ統計 | `docs/strategy/01_プロダクト戦略.md` |
| サイト URL | `.claude/scripts/lib/sns-common/sns-config.mjs` の `domainUrl` |

## UTM 設計

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=intro
```

`docs/marketing/02_チャネル動線設計.md` §4 と整合。
