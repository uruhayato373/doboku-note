---
name: guide-covers-and-ogp-scrim
description: ガイドカードのAI生成カバー写真(資格別プール)機構。OGPは70%スクリムで写真がwashout→写真前向きOGPは新テンプレ要
metadata: 
  node_type: memory
  type: reference
  originSessionId: 2321d6c9-3700-412a-98b6-88b6ec7a0409
---

**ガイドカードのカバー写真**（PR #276）: ガイド記事（group:guide・全資格123本）のカードに資格テーマの AI 生成写真を表示。
- 生成: `npm run guide-covers`（`scripts/generate-guide-covers.mjs`・Imagen 4 fast・資格×5枚=35枚・~$0.70）→ `public/images/guide-covers/<category>/<n>.webp`（16:9・public 配信）。
- 機構: `src/config/guide-cover-photos.json`（資格別プール）＋ `src/lib/guide-cover.ts` `guideCoverFor(doc)`（slug 安定ハッシュで1枚選択）。`DocCard`（CategorySections）がガイドはカバー写真・他はブランドバンドに fallback。AI生成=出典/ライセンス表記不要（CC BY-SA 流用は uncaption カバーで帰属の壁があり不採用）。

**OGP に写真を載せる時の落とし穴（2026-06-26 検証）**: 現行 OGP テンプレ（`.claude/skills/conversion/ogp-create/scripts/lib/ogp-templates.mjs`）は背景の上に **70% オフホワイトのスクリム**（`rgba(253,252,248,0.7)`）を被せ、`generate-ogp-backgrounds.mjs` 側で背景を「淡く正規化」する設計（抽象テクスチャ＋可読タイトル前提）。→ **鮮やかな写真を OGP 背景に置くと ~30% しか見えない薄いゴースト**になる。`resolveBackgroundImage(category)` は per-exam 共有（`.claude/config/ogp/backgrounds/<exam-key>.{png,webp,jpg}`）。写真前向きの OGP（写真くっきり＋白タイトル）にするには**全面スクリムをやめ下部グラデ＋オーバーレイの photo-card 型テンプレを新設**する必要があり、単なる「同じ写真の使い回し」では済まない。OGP 一括再生成は全記事 ~2038 枚に及ぶ点も注意（[[reference_cover_ogp_regen_sweep]]）。関連: [[aidesigner-mcp]]（socialplus 参考のデザイン改善の流れ）。
