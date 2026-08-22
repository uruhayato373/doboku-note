# 05_announcement「お知らせ」ハイライト 投稿手順（テンプレ）

## 位置づけ

- 戦略 v7.1 §2 Highlight 5 種目「お知らせ」
- **フロー型**: 新記事公開・キャンペーン・受験期スポット情報を都度告知
- 3 枚構成: cover → body → cta（テンプレで、本文は都度書き換え）

## テンプレ運用フロー

```
1. slide-data.json を編集
   - 02-body の title / subtitle / body を告知内容に書き換え
   - 03-cta の chipCta を着地点キーに変更（任意）
       ↓
2. PNG 再生成
   node .claude/scripts/instagram/build-highlight-materials.mjs --dir content/sns/instagram/highlights/05_announcement
       ↓
3. Stories 3 枚を順番に連投
   - 02-body にリンクスタンプ（告知先 URL）
   - 03-cta にもリンクスタンプ（同 URL or プロフィール）
       ↓ 24h 以内
4. ハイライト名「お知らせ」に追加（古い告知は削除 or アーカイブ）
   - 並び順: プロフィール一行目の中央〜右
```

## 着地点ルール（告知内容による）

| 告知種別 | 02-body / 03-cta のリンクスタンプ着地点 |
|---|---|
| **新キーワード解説公開** | `https://doboku-note.com/docs/<category>/<slug>` |
| **新過去問パック公開** | `https://doboku-note.com/docs/pe-comprehensive-management/<year>` |
| **note 新記事公開** | `https://note.com/dobokunote/n/<note-id>`（無料記事 or マガジン目次） |
| **受験期スポット情報** | 該当する受験対策ページ |
| **サイト機能リリース** | サイトトップ or 機能紹介ページ |
| **試験日リマインド** | サイトの試験日程ページ |

## slide-data.json テンプレ編集箇所

```jsonc
// 02-body スライド (書き換え対象)
{
  "index": 2,
  "filename": "02-body.png",
  "role": "body",
  "tagText": "お知らせ",
  "title": "{告知タイトル}",       // ← 書き換え (7 文字以内)
  "subtitle": "{告知サブタイトル}", // ← 書き換え (15 文字以内)
  "body": [                        // ← 書き換え (4-7 行、各 18 文字程度)
    "{告知内容 1 行目}",
    "{告知内容 2 行目}",
    "..."
  ]
}
```

## 更新タイミング

- **告知が発生したら都度**（新記事公開・キャンペーン・試験日リマインド）
- 古い告知は IG ハイライトから削除（または「過去のお知らせ」ハイライトを別途作成して移動）
- 月次レビューで「現在のお知らせ」が古くないか確認

## SoT 参照

| 情報 | 参照先 |
|---|---|
| サイト URL | `.claude/scripts/lib/sns-common/sns-config.mjs` の `domainUrl` |
| note プロフィール URL | 同 `noteUrl` |
| 受験スケジュール | `docs/marketing/02_チャネル動線設計.md` §6 季節 × チャネルマトリクス |
| 新マガジン情報 | `src/lib/note-magazines.ts` |

## UTM 設計

```
?utm_source=instagram
&utm_medium=highlight
&utm_campaign=announcement
&utm_content={告知識別子、例: new-mag-r8-essay}
```

`utm_content` は告知ごとに固有の識別子を付ける。月次レビュー時に経路追跡。

## 注意点

- お知らせは **フロー型**なので、ハイライトの「お知らせ」は **常に最新 1 件のみ**を保持
- 過去の告知は順次削除 or 別ハイライト「過去のお知らせ」へ移動
- 同時複数の告知がある場合は「お知らせ」ハイライト内に Stories を順番追加（最大 100 枚まで）
