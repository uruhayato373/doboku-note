---
name: feedback_essay_magazine_meta_yaml_retired
description: 総監模範論文 ペルソナ別マガジンの _meta.yaml は廃止(コード未参照)。コピペ用は note掲載文.txt、SoTは note-magazines.ts/pdf-specs/記事frontmatter
metadata: 
  node_type: memory
  type: feedback
  originSessionId: 2b549401-7f9e-4686-a8ee-d4e93b588727
---

総監模範論文 ペルソナ別マガジン（docs/note/技術士総監/magazines/総監模範論文-*）の `_meta.yaml` は **どのビルド/ジェネレータからも参照されていない**（2026-06-09 確認、grep で appealPoint/setPrice/singleTotal/articles[] を読むコードはゼロ、note-magazines.ts も yaml 不使用）。完全な二重管理だったため、自治体 河川/都市計画/下水道/上水道の4ペルソナで廃止し `note掲載文.txt` に一本化（commit 3fca4ccc2）。

**各情報の真実源（SoT）**:
- サイト表示（マガジンtitle/description/published/magazine noteUrl/imageUrl）= `src/lib/note-magazines.ts`
- PDF生成（記事構成・include範囲）= `scripts/pdf-specs/総監模範論文-*.json`
- カバー画像 = 各記事 `article.md` frontmatter の `cover:` ブロック（generate-note-covers.mjs が描画）
- 各記事の公開 noteUrl/noteId = 各記事 `article.md` frontmatter（`noteUrl:` `noteId:`）
- 単品価格（¥500）= 各記事 `article.md` frontmatter `price:`
- セット価格（¥2,480・7本29%OFF）= `note-magazines.ts` の `price?: string` フィールド（表示用文字列、例 `'¥2,480（7本セット、単品比29%OFF）'`）。旧 _meta.yaml の setPrice/singleTotal/discountPercent はここに集約（2026-06-09、4ペルソナ追記済 commit 後続）
- note 掲載文のコピペ元 = `note掲載文.txt`（マガジンタイトル≤30字・説明≤400字・アピールポイント≤250字、note制限に整形）

**How to apply**: 新規ペルソナ横展開で `_meta.yaml` を作らない。代わりに `note掲載文.txt` を作る（タイトル≤30/説明≤400/アピール≤250、U+FFFD0）。マガジン情報は note-magazines.ts に登録。残り13ペルソナ（ゼネコン/河川コンサル/アセット/技術基準/契約調達/建築営繕/公園緑地/港湾/砂防/道路/農業農村/都市計画コンサル/道路橋梁コンサル）には旧 _meta.yaml が残存＝公開品質化の際に同様に .txt 化する。関連 [[feedback_no_price_in_mdx_body]] [[project_essay_persona_water_municipality]]。
