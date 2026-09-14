---
name: project_note_dir_reorg_by_exam
description: docs/note を試験別ディレクトリへ再編。さらに2026-06-12に1級土木・2級土木を1級・2級土木配下へ統合。記事/マガジンのパス規約が変わった
metadata: 
  node_type: memory
  type: reference
  originSessionId: 9cae566a-85b9-4506-8f2a-47a54d8143a7
---

**2026-06-12 統合**: `docs/note/{1級土木,2級土木}/` を **`docs/note/1級・2級土木/{1級土木,2級土木}/`** 配下へ git mv（212ファイル・履歴保持）。1級・2級が共通メンバーシップ（土木セコカン 1発合格ラボ）の商品なので物理統合。級サブdir名（1級土木/2級土木）は維持。追従修正: cover resolver（segments一致・級別を combined civil-1-2 より先に判定で1級青/2級緑維持、note-cover-tokens に `civil-1-2` dir=1級・2級土木 追加）/ keiken-charcount gradeOf を `/級土木/` スラッシュ区切りへ（"1級・2級土木"が"2級土木"を部分文字列に含むバグ回避）/ EXAM_DIRS walker(add-note-utm・build-note-published-index)を級サブパスへ / pdf-specs(4)・generate-magazine-covers・render-figure・note-magazines.tsコメント・相対リンク・brace形式パス(skills/agents5件)。**check-doc-refs はブレース `{1級土木,2級土木}` をプレースホルダ扱いでskipするため、brace形式の旧パスは別途grep要**。**docs/sns の `_exam-packs/{1級土木,2級土木}/` はnoteと別系統で統合対象外**（generate-civil-{1,2}-pack の EXAM_DIR はそのまま）。同セッションで戦略も「非重複二刀流（過去問=買い切り／予想・添削=会員）」へ確定。

---

2026-05-29、`docs/note` をフラット構造から**試験別ディレクトリ**へ再編（commit `f472afbb3`、develop）。以下は当時の構造（1級土木/2級土木は2026-06-12に1級・2級土木配下へ移動済み）。

**新構造**:
- `docs/note/技術士総監/{slug}/article.md` + `技術士総監/magazines/{magazine}/{記事}/article.md` + `技術士総監/noteコンテンツ計画.md`（総監SSOT）
- `docs/note/1級土木/{slug}/article.md`
- `docs/note/2級土木/magazines/{magazine}/{記事}/article.md` + `2級土木/2級土木施工経験記述プラン.md`（2級SSOT）
- `docs/note/共通/{slug}/article.md`（複数資格横断記事）
- `docs/note/README.md`（試験別インデックス）・`docs/note/プロフィール.md`（全試験共通）はルート据置

**重要**: サイトビルドは docs/note を消費しない（`.local/r2/posts` のみ）。docs/note 再編はサイトに無影響で、参照するのは補助ツールのみ。

**更新済み機能スクリプト**（再編に追従）: `build-note-published-index.mjs`（EXAM_DIRS で試験別走査 + notePublishedAt 不正値=TBD のクラッシュ防御修正）/ `add-note-utm.mjs`（resolveDirectory が {exam}/{slug} を返す）/ `note-essay-charcount.mjs`（デフォルト glob）/ `render-figure-*.mjs` ×29（出力先 `docs/note/技術士総監/`）/ PDF spec ×3（srcDir）。`generate-note-covers.mjs` は再帰走査式で変更不要。

**未対応（cosmetic・follow-up）**: 一部エージェント/スキル doc（note-link-injector / note-fact-checker / social-post 等）の path 規約表記が `docs/note/{slug}/` のまま。これらはフルパス入力式で機能影響はないが、将来 `docs/note/{exam}/{slug}/` に更新するとより正確。[[project_civil2_keiken_essay_line]]
