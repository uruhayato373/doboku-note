---
name: project_author_authority_banner
description: 著者オーソリティ汎用バナー（土木note差別化）。SSOT=author-authority-banner.md・distribute script・195記事適用済
metadata: 
  node_type: memory
  type: project
  originSessionId: db267a41-72a9-4060-abe1-71927f9f20a0
---

競合差別化＝上位資格保有者による分析提供を訴求する汎用バナーを新設（2026-07-21）。運営者の実保有資格（`src/config/author.ts`）に基づく誇張なし。

**フレーミング（厳守）**: 総監（技術士）＝上位資格の分析力／元発注者（自治体土木）＝採点者の視点／1級2級施工管理技士＝合格した当事者。資格の混同禁止（「総監だから施工管理を教えられる」はNG）。R8総監択一の「公式正答40問一致」は別軸の"解答速報の精度"で施工管理バナーには混ぜない。

**アセット**: `docs/note/共通/著者オーソリティ/img/{base-keyart,figure-author-authority}.png`（ChatGPTキーアート1672×941＋日本語コピー合成）。再生成`scripts/render-note-author-authority.mjs`、配布`scripts/distribute-author-authority-banner.mjs`（冪等・記事別noteUrl解決・H1直後top/末尾は画像→橋渡し→既存カード・キャリア系除外・`--all`）。

**適用状況**: 土木note 195記事（入口free25＋内部170）にtop/bottom配置済（commit 92d9529cd/e565b1f31）。**残**=①カバー幅超過36本（check-note-cover-fitにSKIP無・カバー短縮後--all再実行）②note-magazines.ts civil description等のtextual差別化 ③195記事のライブ再パブリッシュ。

真実源=`docs/reference/author-authority-banner.md`。CTAハンドオフ2026-07-21-civil-note-cta-wiringのP0-3差別化を実装。配線=civil-keiken-essay-writer/coconala-operator/civil-keiken-tensaku-drafter。関連: [[project_coconala_tensaku_channel]] / [[feedback_no_price_in_mdx_body]] / [[feedback_note_link_card]]
